#!/bin/bash

# 腾讯云服务器初始化脚本
# 用于配置Ubuntu服务器环境，安装必要的工具和依赖

set -e

# 配置变量
DEPLOY_USER="aiproject"
PROJECT_DIR="/opt/ai-project"
DOCKER_COMPOSE_VERSION="2.23.3"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        log_info "请使用: sudo $0"
        exit 1
    fi
}

# 系统更新
update_system() {
    log_info "更新系统包..."
    apt-get update
    apt-get upgrade -y
    apt-get autoremove -y
    log_success "系统更新完成"
}

# 安装基础工具
install_basic_tools() {
    log_info "安装基础工具..."
    apt-get install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        unzip \
        zip \
        tree \
        jq \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        logrotate \
        cron \
        rsync \
        build-essential \
        ca-certificates \
        gnupg \
        lsb-release
    log_success "基础工具安装完成"
}

# 配置防火墙
setup_firewall() {
    log_info "配置UFW防火墙..."
    
    # 重置防火墙规则
    ufw --force reset
    
    # 设置默认策略
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许SSH（确保不会被锁定）
    ufw allow 22/tcp
    
    # 允许HTTP和HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 启用防火墙
    ufw --force enable
    
    log_success "防火墙配置完成"
    ufw status verbose
}

# 配置fail2ban
setup_fail2ban() {
    log_info "配置fail2ban..."
    
    # 创建本地配置文件
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    log_success "fail2ban配置完成"
}

# 安装Docker
install_docker() {
    log_info "安装Docker..."
    
    # 删除旧版本
    apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # 添加Docker官方GPG密钥
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 添加Docker仓库
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 更新包索引
    apt-get update
    
    # 安装Docker
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动Docker服务
    systemctl enable docker
    systemctl start docker
    
    log_success "Docker安装完成"
    docker --version
}

# 安装Docker Compose (独立版本)
install_docker_compose() {
    log_info "安装Docker Compose..."
    
    # 下载Docker Compose
    curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose安装完成"
    docker-compose --version
}

# 安装Node.js
install_nodejs() {
    log_info "安装Node.js..."
    
    # 安装Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    log_success "Node.js安装完成"
    node --version
    npm --version
}

# 安装Go
install_golang() {
    log_info "安装Go..."
    
    # 下载Go
    GO_VERSION="1.21.5"
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
    
    # 删除旧版本
    rm -rf /usr/local/go
    
    # 解压安装
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    
    # 配置环境变量
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    echo 'export GOPATH=/opt/go' >> /etc/profile
    echo 'export GOPROXY=https://goproxy.cn,direct' >> /etc/profile
    
    # 创建Go工作目录
    mkdir -p /opt/go/{bin,src,pkg}
    
    log_success "Go安装完成"
    /usr/local/go/bin/go version
}

# 创建部署用户
create_deploy_user() {
    log_info "创建部署用户..."
    
    # 创建用户
    if ! id "$DEPLOY_USER" &>/dev/null; then
        useradd -m -s /bin/bash "$DEPLOY_USER"
        usermod -aG docker "$DEPLOY_USER"
        usermod -aG sudo "$DEPLOY_USER"
        
        # 设置无密码sudo
        echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$DEPLOY_USER"
        
        log_success "用户 $DEPLOY_USER 创建完成"
    else
        log_warning "用户 $DEPLOY_USER 已存在"
        usermod -aG docker "$DEPLOY_USER"
    fi
}

# 创建项目目录
create_project_dirs() {
    log_info "创建项目目录..."
    
    # 创建主目录
    mkdir -p "$PROJECT_DIR"
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/ssl"
    mkdir -p "$PROJECT_DIR/uploads"
    mkdir -p "/var/www/static"
    mkdir -p "/var/www/certbot"
    
    # 设置权限
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_DIR"
    chown -R "$DEPLOY_USER:www-data" "/var/www"
    chmod -R 755 "$PROJECT_DIR"
    chmod -R 755 "/var/www"
    
    log_success "项目目录创建完成"
}

# 配置SSH密钥（可选）
setup_ssh_keys() {
    if [[ -n "${SSH_PUBLIC_KEY:-}" ]]; then
        log_info "配置SSH密钥..."
        
        # 为root用户配置
        mkdir -p /root/.ssh
        echo "$SSH_PUBLIC_KEY" >> /root/.ssh/authorized_keys
        chmod 600 /root/.ssh/authorized_keys
        chmod 700 /root/.ssh
        
        # 为部署用户配置
        sudo -u "$DEPLOY_USER" mkdir -p "/home/$DEPLOY_USER/.ssh"
        echo "$SSH_PUBLIC_KEY" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
        chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
        chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
        chmod 700 "/home/$DEPLOY_USER/.ssh"
        
        log_success "SSH密钥配置完成"
    else
        log_warning "未提供SSH公钥，跳过密钥配置"
    fi
}

# 配置系统优化
optimize_system() {
    log_info "优化系统配置..."
    
    # 增加文件描述符限制
    cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
    
    # 配置内核参数
    cat >> /etc/sysctl.conf << 'EOF'
# 网络优化
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 5000

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# 文件系统优化
fs.file-max = 6553560
fs.inotify.max_user_watches = 524288
EOF
    
    # 应用内核参数
    sysctl -p
    
    log_success "系统优化完成"
}

# 设置定时任务
setup_cron_jobs() {
    log_info "设置定时任务..."
    
    # 创建定时任务
    cat > /etc/cron.d/ai-project << 'EOF'
# AI项目定时任务
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# 每天凌晨2点备份
0 2 * * * aiproject /opt/ai-project/scripts/backup.sh >> /var/log/ai-project-backup.log 2>&1

# 每周日凌晨3点清理日志
0 3 * * 0 root /usr/sbin/logrotate -f /etc/logrotate.conf

# 每月1号更新SSL证书
0 0 1 * * root /usr/bin/certbot renew --quiet --nginx
EOF
    
    log_success "定时任务设置完成"
}

# 显示安装信息
show_install_info() {
    log_info "=== 安装完成 ==="
    echo ""
    echo "系统信息:"
    echo "  OS: $(lsb_release -d | cut -f2)"
    echo "  内核: $(uname -r)"
    echo "  用户: $DEPLOY_USER"
    echo "  项目目录: $PROJECT_DIR"
    echo ""
    echo "已安装组件:"
    echo "  Docker: $(docker --version 2>/dev/null || echo '未安装')"
    echo "  Docker Compose: $(docker-compose --version 2>/dev/null || echo '未安装')"
    echo "  Node.js: $(node --version 2>/dev/null || echo '未安装')"
    echo "  Go: $(/usr/local/go/bin/go version 2>/dev/null || echo '未安装')"
    echo ""
    echo "下一步操作:"
    echo "1. 切换到部署用户: sudo su - $DEPLOY_USER"
    echo "2. 克隆项目代码到: $PROJECT_DIR"
    echo "3. 配置环境变量: $PROJECT_DIR/.env.prod"
    echo "4. 运行部署脚本: $PROJECT_DIR/scripts/deploy.sh"
    echo ""
    log_success "服务器初始化完成！"
}

# 主函数
main() {
    log_info "开始初始化腾讯云服务器..."
    
    check_root
    update_system
    install_basic_tools
    setup_firewall
    setup_fail2ban
    install_docker
    install_docker_compose
    install_nodejs
    install_golang
    create_deploy_user
    create_project_dirs
    setup_ssh_keys
    optimize_system
    setup_cron_jobs
    show_install_info
}

# 运行主函数
main "$@"