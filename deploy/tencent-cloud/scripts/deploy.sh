#!/bin/bash

# 腾讯云AI项目部署脚本
# 服务器: 152.136.104.251
# 系统: Ubuntu

set -e

# 配置变量
SERVER_IP="152.136.104.251"
PROJECT_DIR="/opt/ai-project"
DEPLOY_USER="aiproject"
DOMAIN_NAME="${DOMAIN_NAME:-$SERVER_IP}"
GIT_REPO="${GIT_REPO:-https://github.com/your-username/ai-project.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查环境
check_environment() {
    log_info "检查部署环境..."
    
    # 检查是否为部署用户
    if [[ $(whoami) != "$DEPLOY_USER" ]]; then
        log_warning "当前用户不是部署用户，切换到 $DEPLOY_USER"
        if ! id "$DEPLOY_USER" &>/dev/null; then
            log_error "部署用户 $DEPLOY_USER 不存在，请先运行初始化脚本"
            exit 1
        fi
        exec sudo -u "$DEPLOY_USER" "$0" "$@"
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先运行初始化脚本"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先运行初始化脚本"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 拉取最新代码
pull_latest_code() {
    log_info "拉取最新代码..."
    
    cd "$PROJECT_DIR"
    
    if [[ ! -d ".git" ]]; then
        log_info "克隆项目仓库..."
        git clone -b "$GIT_BRANCH" "$GIT_REPO" .
    else
        log_info "更新项目代码..."
        git fetch origin
        git reset --hard "origin/$GIT_BRANCH"
    fi
    
    log_success "代码更新完成"
}

# 检查和生成配置文件
setup_configuration() {
    log_info "配置应用环境..."
    
    # 复制部署配置
    if [[ -f "deploy/tencent-cloud/.env.prod" ]]; then
        cp deploy/tencent-cloud/.env.prod .env
    else
        log_error "找不到生产环境配置文件"
        exit 1
    fi
    
    if [[ -f "deploy/tencent-cloud/docker-compose.prod.yml" ]]; then
        cp deploy/tencent-cloud/docker-compose.prod.yml docker-compose.yml
    else
        log_error "找不到Docker Compose配置文件"
        exit 1
    fi
    
    # 更新配置中的域名
    sed -i "s/yourdomain.com/$DOMAIN_NAME/g" .env
    sed -i "s/yourdomain.com/$DOMAIN_NAME/g" deploy/tencent-cloud/nginx/conf.d/ai-project.conf
    
    # 生成随机密码（如果未设置）
    if grep -q "change-this" .env; then
        log_info "生成安全密码..."
        
        # 生成随机密码
        APP_SECRET=$(openssl rand -hex 32)
        POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        
        # 替换密码
        sed -i "s/your-super-secret-app-key-change-this-in-production/$APP_SECRET/g" .env
        sed -i "s/your-super-strong-postgres-password-change-this/$POSTGRES_PASSWORD/g" .env
        sed -i "s/your-super-strong-redis-password-change-this/$REDIS_PASSWORD/g" .env
        sed -i "s/your-super-secret-jwt-key-at-least-32-characters-long/$JWT_SECRET/g" .env
    fi
    
    # 设置文件权限
    chmod 600 .env
    
    log_success "配置文件设置完成"
}

# 复制Nginx配置
setup_nginx_config() {
    log_info "设置Nginx配置..."
    
    # 创建nginx配置目录
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # 复制配置文件
    sudo cp -r deploy/tencent-cloud/nginx/* ./nginx/
    
    log_success "Nginx配置完成"
}

# 设置SSL证书
setup_ssl_certificate() {
    log_info "设置SSL证书..."
    
    if [[ "$DOMAIN_NAME" == "$SERVER_IP" ]]; then
        log_warning "使用IP地址访问，创建自签名证书..."
        
        # 创建SSL目录
        mkdir -p ssl
        
        # 生成自签名证书
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/privkey.pem \
            -out ssl/fullchain.pem \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=AI Project/CN=$SERVER_IP"
        
        # 创建证书链
        cp ssl/fullchain.pem ssl/chain.pem
        
        # 更新nginx配置使用正确的证书路径
        sed -i "s|/etc/ssl/certs/yourdomain.com|/opt/ai-project/ssl|g" nginx/conf.d/ai-project.conf
        
        log_success "自签名证书创建完成"
    else
        log_info "使用Let's Encrypt申请SSL证书..."
        
        # 停止nginx（如果运行中）
        sudo systemctl stop nginx 2>/dev/null || true
        
        # 申请证书
        sudo certbot certonly --standalone \
            --agree-tos \
            --no-eff-email \
            --email "${SSL_EMAIL:-admin@$DOMAIN_NAME}" \
            -d "$DOMAIN_NAME" \
            --non-interactive
        
        # 复制证书到项目目录
        sudo cp -L "/etc/letsencrypt/live/$DOMAIN_NAME/"* ssl/ || true
        sudo chown "$DEPLOY_USER:$DEPLOY_USER" ssl/*
        
        log_success "Let's Encrypt证书申请完成"
    fi
}

# 构建Docker镜像
build_images() {
    log_info "构建Docker镜像..."
    
    # 停止现有容器
    docker-compose down 2>/dev/null || true
    
    # 清理旧镜像
    docker system prune -f
    
    # 构建镜像
    docker-compose build --no-cache
    
    log_success "Docker镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动服务
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    docker-compose ps
    
    log_success "服务启动完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查容器状态
    log_info "检查容器状态..."
    UNHEALTHY_CONTAINERS=$(docker-compose ps --services --filter "status=unhealthy")
    if [[ -n "$UNHEALTHY_CONTAINERS" ]]; then
        log_error "发现不健康的容器: $UNHEALTHY_CONTAINERS"
        docker-compose logs
        exit 1
    fi
    
    # 检查端口
    log_info "检查服务端口..."
    
    # 检查nginx
    if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost" | grep -q "200\|301\|302"; then
        log_warning "Nginx服务可能未正常启动"
    else
        log_success "Nginx服务正常"
    fi
    
    # 检查后端API
    sleep 10  # 等待后端启动
    if ! curl -s "http://localhost:8080/api/v1/health" | grep -q "healthy\|ok"; then
        log_warning "后端API可能未正常启动"
        docker-compose logs backend-prod
    else
        log_success "后端API服务正常"
    fi
    
    # 检查数据库
    if ! docker exec ai_postgres_prod pg_isready -U ai_prod_user -d ai_project_prod; then
        log_error "数据库连接失败"
        exit 1
    else
        log_success "数据库连接正常"
    fi
    
    # 检查Redis
    if ! docker exec ai_redis_prod redis-cli -a "$(grep REDIS_PASSWORD .env | cut -d'=' -f2)" ping | grep -q "PONG"; then
        log_error "Redis连接失败"
        exit 1
    else
        log_success "Redis连接正常"
    fi
    
    log_success "部署验证通过"
}

# 显示部署信息
show_deployment_info() {
    log_info "=== 部署完成 ==="
    echo ""
    echo "服务器信息:"
    echo "  IP地址: $SERVER_IP"
    echo "  域名: $DOMAIN_NAME"
    echo "  项目目录: $PROJECT_DIR"
    echo ""
    echo "访问地址:"
    if [[ "$DOMAIN_NAME" == "$SERVER_IP" ]]; then
        echo "  HTTP: http://$SERVER_IP"
        echo "  HTTPS: https://$SERVER_IP (自签名证书)"
    else
        echo "  HTTP: http://$DOMAIN_NAME (自动重定向到HTTPS)"
        echo "  HTTPS: https://$DOMAIN_NAME"
    fi
    echo "  API文档: https://$DOMAIN_NAME/docs"
    echo "  健康检查: https://$DOMAIN_NAME/health"
    echo ""
    echo "管理命令:"
    echo "  查看日志: docker-compose logs -f"
    echo "  重启服务: docker-compose restart"
    echo "  停止服务: docker-compose down"
    echo "  更新代码: $PROJECT_DIR/scripts/update.sh"
    echo "  备份数据: $PROJECT_DIR/scripts/backup.sh"
    echo ""
    log_success "AI项目管理系统部署成功！🚀"
}

# 错误处理
handle_error() {
    log_error "部署过程中发生错误！"
    log_info "查看错误日志:"
    docker-compose logs --tail=50
    exit 1
}

# 设置错误处理
trap handle_error ERR

# 主函数
main() {
    log_info "=== 腾讯云AI项目部署脚本 ==="
    log_info "服务器: $SERVER_IP"
    log_info "域名: $DOMAIN_NAME"
    
    check_environment
    pull_latest_code
    setup_configuration
    setup_nginx_config
    setup_ssl_certificate
    build_images
    start_services
    verify_deployment
    show_deployment_info
}

# 运行主函数
main "$@"