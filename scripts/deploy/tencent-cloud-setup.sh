#!/bin/bash

# 腾讯云服务器部署初始化脚本
# 用于在新的腾讯云服务器上安装和配置生产环境

set -e  # 出错时立即退出

# 颜色输出函数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "此脚本需要root权限运行"
        exit 1
    fi
}

# 更新系统
update_system() {
    info "更新系统软件包..."
    apt update -y
    apt upgrade -y
    success "系统更新完成"
}

# 安装Docker
install_docker() {
    info "安装Docker..."
    
    # 卸载旧版本
    apt remove -y docker docker-engine docker.io containerd runc || true
    
    # 安装依赖
    apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # 添加Docker官方GPG密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 设置稳定版仓库
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    apt update -y
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 启动Docker服务
    systemctl start docker
    systemctl enable docker
    
    # 添加当前用户到docker组（如果不是root）
    if [ "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
    fi
    
    success "Docker安装完成"
}

# 安装Docker Compose（独立版本）
install_docker_compose() {
    info "安装Docker Compose..."
    
    # 获取最新版本号
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    
    # 下载并安装
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    success "Docker Compose安装完成"
}

# 配置防火墙
configure_firewall() {
    info "配置防火墙..."
    
    # 安装ufw
    apt install -y ufw
    
    # 默认策略
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许SSH
    ufw allow ssh
    
    # 允许HTTP和HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 允许应用端口（可选，通常通过nginx代理）
    # ufw allow 8080/tcp  # 后端API
    # ufw allow 3000/tcp  # 前端
    # ufw allow 3100/tcp  # MCP服务
    
    # 启用防火墙
    ufw --force enable
    
    success "防火墙配置完成"
}

# 创建应用目录结构
create_app_directories() {
    info "创建应用目录结构..."
    
    mkdir -p /opt/ai-project/{logs,uploads,ssl,backups}
    mkdir -p /opt/ai-project/docker/postgres
    mkdir -p /opt/ai-project/docker/redis
    mkdir -p /opt/ai-project/nginx
    
    # 设置权限
    chown -R 1000:1000 /opt/ai-project
    chmod -R 755 /opt/ai-project
    
    success "目录结构创建完成"
}

# 安装必要工具
install_tools() {
    info "安装必要工具..."
    
    apt install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        tree \
        jq \
        unzip \
        zip \
        certbot \
        python3-certbot-nginx
    
    success "工具安装完成"
}

# 配置Git（用于部署）
configure_git() {
    info "配置Git..."
    
    # 如果没有提供Git配置，跳过
    if [ -z "$GIT_USER_NAME" ] || [ -z "$GIT_USER_EMAIL" ]; then
        warning "未提供Git配置，跳过Git设置"
        return
    fi
    
    git config --global user.name "$GIT_USER_NAME"
    git config --global user.email "$GIT_USER_EMAIL"
    
    success "Git配置完成"
}

# 设置系统优化
optimize_system() {
    info "优化系统配置..."
    
    # 增加文件描述符限制
    echo "* soft nofile 65536" >> /etc/security/limits.conf
    echo "* hard nofile 65536" >> /etc/security/limits.conf
    
    # 优化内核参数
    cat >> /etc/sysctl.conf << EOF

# AI项目生产环境优化
net.core.somaxconn = 32768
net.core.netdev_max_backlog = 32768
net.ipv4.tcp_max_syn_backlog = 32768
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 3
vm.swappiness = 10
vm.max_map_count = 262144
EOF
    
    # 应用内核参数
    sysctl -p
    
    success "系统优化完成"
}

# 设置日志轮转
configure_logrotate() {
    info "配置日志轮转..."
    
    cat > /etc/logrotate.d/ai-project << EOF
/opt/ai-project/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 1000 1000
    postrotate
        docker kill -s USR1 \$(docker ps -q --filter name=ai_) 2>/dev/null || true
    endscript
}
EOF
    
    success "日志轮转配置完成"
}

# 设置定时任务
setup_cron_jobs() {
    info "设置定时任务..."
    
    # 创建cron任务文件
    cat > /opt/ai-project/cron-tasks << EOF
# AI项目生产环境定时任务

# 每天凌晨2点备份数据库
0 2 * * * /opt/ai-project/scripts/backup-database.sh

# 每周清理旧的Docker镜像
0 3 * * 0 docker image prune -f

# 每小时检查服务状态
0 * * * * /opt/ai-project/scripts/health-check.sh

# 每天清理旧日志
0 4 * * * find /opt/ai-project/logs -name "*.log" -mtime +7 -delete
EOF
    
    # 安装cron任务（可选，可以手动安装）
    # crontab /opt/ai-project/cron-tasks
    
    success "定时任务设置完成"
}

# 主函数
main() {
    info "开始腾讯云服务器生产环境部署初始化..."
    
    check_root
    update_system
    install_docker
    install_docker_compose
    configure_firewall
    create_app_directories
    install_tools
    configure_git
    optimize_system
    configure_logrotate
    setup_cron_jobs
    
    success "腾讯云服务器初始化完成！"
    info "请执行以下步骤完成部署："
    info "1. 上传项目配置文件到 /opt/ai-project/"
    info "2. 配置环境变量文件 .env.production"
    info "3. 运行 docker-compose -f docker-compose.prod.yml up -d"
    info "4. 配置SSL证书（如果需要HTTPS）"
    info "5. 设置监控和备份"
    
    warning "重启服务器以确保所有配置生效"
}

# 运行主函数
main "$@"