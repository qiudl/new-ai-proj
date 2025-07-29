#!/bin/bash

# proj-joylodging 服务器初始化脚本
# 用于设置新服务器的基础环境

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
DEPLOY_USER="deploy"
DEPLOY_HOME="/home/$DEPLOY_USER"
PROJECT_DIR="$DEPLOY_HOME/new-ai-proj"
BACKUP_DIR="$DEPLOY_HOME/backups"

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "此脚本需要 root 权限运行"
        exit 1
    fi
}

# 更新系统
update_system() {
    log "更新系统包..."
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
        git \
        vim \
        htop \
        ufw \
        fail2ban
    success "系统更新完成"
}

# 安装 Docker
install_docker() {
    log "安装 Docker..."
    
    # 检查是否已安装
    if command -v docker &> /dev/null; then
        log "Docker 已安装，跳过..."
        return
    fi
    
    # 添加 Docker 官方 GPG 密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 设置稳定版仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装 Docker Engine
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 启动 Docker 服务
    systemctl enable docker
    systemctl start docker
    
    success "Docker 安装完成"
}

# 创建部署用户
create_deploy_user() {
    log "创建部署用户..."
    
    if id "$DEPLOY_USER" &>/dev/null; then
        log "用户 $DEPLOY_USER 已存在，跳过..."
    else
        useradd -m -s /bin/bash "$DEPLOY_USER"
        usermod -aG docker "$DEPLOY_USER"
        success "部署用户创建完成"
    fi
    
    # 设置 SSH 目录
    mkdir -p "$DEPLOY_HOME/.ssh"
    chmod 700 "$DEPLOY_HOME/.ssh"
    touch "$DEPLOY_HOME/.ssh/authorized_keys"
    chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
}

# 配置防火墙
configure_firewall() {
    log "配置防火墙..."
    
    # 启用 UFW
    ufw --force enable
    
    # 默认规则
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许 SSH
    ufw allow 22/tcp
    
    # 允许 HTTP 和 HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 允许 Docker 相关端口
    ufw allow 8080/tcp  # 后端 API
    ufw allow 3000/tcp  # 前端开发服务器（如需要）
    ufw allow 5432/tcp  # PostgreSQL（仅内部访问建议）
    
    # 重新加载防火墙规则
    ufw reload
    
    success "防火墙配置完成"
}

# 配置 fail2ban
configure_fail2ban() {
    log "配置 fail2ban..."
    
    # 创建自定义配置
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/access.log
maxretry = 2
EOF
    
    # 重启 fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    success "fail2ban 配置完成"
}

# 创建项目目录结构
create_project_structure() {
    log "创建项目目录结构..."
    
    mkdir -p "$PROJECT_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/ssl"
    
    # 设置权限
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME"
    
    success "项目目录创建完成"
}

# 配置系统限制
configure_system_limits() {
    log "配置系统限制..."
    
    # 增加文件描述符限制
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
    
    # 配置 sysctl
    cat > /etc/sysctl.d/99-custom.conf << EOF
# 网络优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.ip_local_port_range = 1024 65535

# 文件系统
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF
    
    # 应用 sysctl 设置
    sysctl -p /etc/sysctl.d/99-custom.conf
    
    success "系统限制配置完成"
}

# 安装监控工具
install_monitoring() {
    log "安装监控工具..."
    
    # 安装 Node Exporter
    wget -q https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
    tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
    cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
    rm -rf node_exporter-1.7.0.linux-amd64*
    
    # 创建 systemd 服务
    cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
User=nobody
Group=nogroup
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter
    
    success "监控工具安装完成"
}

# 配置日志轮转
configure_logrotate() {
    log "配置日志轮转..."
    
    cat > /etc/logrotate.d/new-ai-proj << EOF
$PROJECT_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 $DEPLOY_USER $DEPLOY_USER
    sharedscripts
    postrotate
        docker compose -f $PROJECT_DIR/docker-compose.yml kill -s USR1 nginx
    endscript
}
EOF
    
    success "日志轮转配置完成"
}

# 生成部署密钥
generate_deploy_keys() {
    log "生成部署密钥..."
    
    # 生成 SSH 密钥对
    sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -f "$DEPLOY_HOME/.ssh/id_ed25519" -N "" -C "deploy@proj-joylodging"
    
    log "请将以下公钥添加到 GitHub 仓库的 Deploy Keys："
    cat "$DEPLOY_HOME/.ssh/id_ed25519.pub"
    
    success "部署密钥生成完成"
}

# 主函数
main() {
    log "开始初始化 proj-joylodging 服务器..."
    
    check_root
    update_system
    install_docker
    create_deploy_user
    configure_firewall
    configure_fail2ban
    create_project_structure
    configure_system_limits
    install_monitoring
    configure_logrotate
    generate_deploy_keys
    
    success "服务器初始化完成！"
    
    echo ""
    echo "=========================================="
    echo "接下来的步骤："
    echo "1. 将部署公钥添加到 GitHub 仓库"
    echo "2. 配置 GitHub Actions Secrets"
    echo "3. 克隆项目代码到 $PROJECT_DIR"
    echo "4. 创建 .env.production 文件"
    echo "5. 运行首次部署"
    echo "=========================================="
}

# 运行主函数
main "$@"
