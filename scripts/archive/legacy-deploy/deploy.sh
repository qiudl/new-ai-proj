#!/bin/bash
# AI项目管理系统 - 生产环境部署脚本
# 腾讯云服务器 152.136.104.251

set -e

# 配置变量
PROJECT_NAME="ai-project"
PROJECT_DIR="/opt/ai-project"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/deploy.log"
GIT_REPO="https://github.com/your-repo/ai-project.git"  # 替换为实际仓库地址
DOMAIN="152.136.104.251"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "请不要使用root用户运行此脚本"
        exit 1
    fi
}

# 检查系统要求
check_requirements() {
    log "检查系统要求..."
    
    # 检查操作系统
    if [[ ! -f /etc/os-release ]]; then
        error "不支持的操作系统"
        exit 1
    fi
    
    # 检查内存
    MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [[ $MEMORY -lt 2048 ]]; then
        warning "内存不足2GB，可能影响性能"
    fi
    
    # 检查磁盘空间
    DISK=$(df / | awk 'NR==2{printf "%.0f", $4/1024/1024}')
    if [[ $DISK -lt 10 ]]; then
        error "磁盘可用空间不足10GB"
        exit 1
    fi
    
    # 检查必要命令
    for cmd in docker docker-compose git curl; do
        if ! command -v $cmd &> /dev/null; then
            error "缺少必要命令: $cmd"
            exit 1
        fi
    done
    
    log "系统要求检查通过"
}

# 备份现有部署
backup_existing() {
    if [[ -d $PROJECT_DIR ]]; then
        log "备份现有部署..."
        
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
        
        mkdir -p $BACKUP_DIR
        
        # 停止服务
        cd $PROJECT_DIR
        docker-compose down || true
        
        # 备份数据库
        if docker ps -a | grep -q ai_postgres_prod; then
            log "备份数据库..."
            docker exec ai_postgres_prod pg_dump -U ai_prod_user ai_project_prod > $BACKUP_PATH.sql
            gzip $BACKUP_PATH.sql
        fi
        
        # 备份项目文件
        tar -czf $BACKUP_PATH.tar.gz -C $(dirname $PROJECT_DIR) $(basename $PROJECT_DIR) \
            --exclude='node_modules' \
            --exclude='.git' \
            --exclude='logs/*.log'
        
        log "备份完成: $BACKUP_PATH.tar.gz"
    fi
}

# 部署代码
deploy_code() {
    log "部署代码..."
    
    # 创建项目目录
    sudo mkdir -p $PROJECT_DIR
    sudo chown $(whoami):$(whoami) $PROJECT_DIR
    
    cd $PROJECT_DIR
    
    # 克隆或更新代码
    if [[ -d ".git" ]]; then
        log "更新代码..."
        git fetch origin
        git reset --hard origin/main
        git clean -fd
    else
        log "克隆代码..."
        git clone $GIT_REPO .
    fi
    
    # 检查分支
    CURRENT_BRANCH=$(git branch --show-current)
    log "当前分支: $CURRENT_BRANCH"
}

# 配置环境
setup_environment() {
    log "配置环境..."
    
    cd $PROJECT_DIR
    
    # 复制生产配置
    if [[ -f ".env.prod" ]]; then
        cp .env.prod .env
        log "使用生产环境配置"
    else
        error "生产环境配置文件 .env.prod 不存在"
        exit 1
    fi
    
    # 生成随机密码（如果需要）
    if grep -q "SecureAI2024" .env; then
        warning "检测到默认密码，正在生成随机密码..."
        
        DB_PASSWORD=$(openssl rand -base64 32)
        JWT_SECRET=$(openssl rand -base64 64)
        
        sed -i "s/SecureAI2024!@#\$%\^/$(echo $DB_PASSWORD | sed 's/[[\.*^$()+?{|]/\\&/g')/g" .env
        sed -i "s/ProductionJWTSecret2024!@#\$%\^&\*()ABCDEF/$(echo $JWT_SECRET | sed 's/[[\.*^$()+?{|]/\\&/g')/g" .env
        
        log "随机密码已生成"
    fi
    
    # 创建必要目录
    mkdir -p logs backups uploads config static
    
    # 设置权限
    chmod 600 .env
    chmod 755 logs backups uploads
}

# 设置SSL证书
setup_ssl() {
    log "设置SSL证书..."
    
    cd $PROJECT_DIR
    
    if [[ ! -f "ssl/cert.pem" ]]; then
        log "SSL证书不存在，运行SSL设置脚本..."
        chmod +x scripts/setup-ssl.sh
        ./scripts/setup-ssl.sh $DOMAIN
    else
        log "SSL证书已存在，跳过设置"
    fi
}

# 构建和启动服务
build_and_start() {
    log "构建和启动服务..."
    
    cd $PROJECT_DIR
    
    # 使用生产配置
    cp docker-compose.prod.yml docker-compose.yml
    
    # 构建镜像
    log "构建Docker镜像..."
    docker-compose build --no-cache --parallel
    
    # 启动服务
    log "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    check_services
}

# 检查服务状态
check_services() {
    log "检查服务状态..."
    
    cd $PROJECT_DIR
    
    # 检查容器状态
    FAILED_SERVICES=$(docker-compose ps --services --filter "status=exited")
    if [[ -n "$FAILED_SERVICES" ]]; then
        error "以下服务启动失败: $FAILED_SERVICES"
        docker-compose logs $FAILED_SERVICES
        exit 1
    fi
    
    # 健康检查
    log "执行健康检查..."
    
    # 检查后端
    if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
        error "后端服务健康检查失败"
        docker-compose logs backend-prod
        exit 1
    fi
    
    # 检查前端（通过Nginx）
    if [[ -f "ssl/cert.pem" ]]; then
        if ! curl -f -k https://localhost > /dev/null 2>&1; then
            warning "前端HTTPS检查失败，检查HTTP..."
            if ! curl -f http://localhost > /dev/null 2>&1; then
                error "前端服务检查失败"
                docker-compose logs frontend-prod nginx
                exit 1
            fi
        fi
    else
        if ! curl -f http://localhost > /dev/null 2>&1; then
            error "前端服务检查失败"
            docker-compose logs frontend-prod nginx
            exit 1
        fi
    fi
    
    log "所有服务健康检查通过"
}

# 数据库初始化
init_database() {
    log "初始化数据库..."
    
    cd $PROJECT_DIR
    
    # 等待数据库启动
    until docker exec ai_postgres_prod pg_isready -U ai_prod_user -d ai_project_prod; do
        log "等待数据库启动..."
        sleep 5
    done
    
    # 运行数据库迁移（如果有）
    if docker exec ai_backend_prod test -f /app/migrate; then
        log "执行数据库迁移..."
        docker exec ai_backend_prod /app/migrate up || warning "数据库迁移失败或已执行"
    fi
    
    # 创建默认管理员账户（如果有）
    if docker exec ai_backend_prod test -f /app/create-admin; then
        log "创建管理员账户..."
        docker exec ai_backend_prod /app/create-admin || warning "管理员账户创建失败或已存在"
    fi
    
    log "数据库初始化完成"
}

# 设置监控
setup_monitoring() {
    log "设置监控..."
    
    cd $PROJECT_DIR
    
    # 设置日志轮转
    cat > /tmp/ai-project-logrotate << EOF
$PROJECT_DIR/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $(whoami) $(whoami)
}
EOF
    
    sudo mv /tmp/ai-project-logrotate /etc/logrotate.d/ai-project
    
    # 设置备份定时任务
    (crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/scripts/backup.sh >> $LOG_FILE 2>&1") | crontab -
    
    log "监控设置完成"
}

# 清理资源
cleanup() {
    log "清理资源..."
    
    # 清理未使用的Docker资源
    docker system prune -f
    docker volume prune -f
    
    # 清理旧日志
    find $PROJECT_DIR/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log "资源清理完成"
}

# 显示部署信息
show_deploy_info() {
    log "部署完成！"
    echo ""
    echo "🎉 AI项目管理系统部署成功！"
    echo ""
    echo "📋 部署信息:"
    echo "- 项目目录: $PROJECT_DIR"
    echo "- 访问地址: https://$DOMAIN"
    echo "- API地址: https://$DOMAIN/api/v1"
    echo "- 健康检查: https://$DOMAIN/health"
    echo ""
    echo "🐳 Docker服务状态:"
    cd $PROJECT_DIR && docker-compose ps
    echo ""
    echo "📊 系统资源:"
    echo "- 内存使用: $(free -h | awk 'NR==2{printf "%.1f/%.1f GB (%.1f%%)", $3/1024, $2/1024, $3*100/$2}')"
    echo "- 磁盘使用: $(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3, $2, $5}')"
    echo ""
    echo "📝 重要文件:"
    echo "- 配置文件: $PROJECT_DIR/.env"
    echo "- SSL证书: $PROJECT_DIR/ssl/"
    echo "- 日志目录: $PROJECT_DIR/logs/"
    echo "- 备份目录: $BACKUP_DIR/"
    echo ""
    echo "🔧 管理命令:"
    echo "- 查看日志: docker-compose logs -f"
    echo "- 重启服务: docker-compose restart"
    echo "- 停止服务: docker-compose down"
    echo "- 更新部署: ./scripts/deploy.sh"
    echo ""
    echo "🔐 安全提醒:"
    echo "- 请及时修改默认管理员密码"
    echo "- 请定期检查SSL证书有效期"
    echo "- 请定期更新系统和应用"
}

# 主函数
main() {
    echo "🚀 开始部署AI项目管理系统到腾讯云服务器..."
    echo ""
    
    # 检查参数
    if [[ $# -gt 0 ]] && [[ "$1" == "--help" ]]; then
        echo "使用方法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --help          显示帮助信息"
        echo "  --skip-backup   跳过备份步骤"
        echo "  --only-update   仅更新代码，不重新构建"
        echo ""
        exit 0
    fi
    
    # 执行部署步骤
    check_root
    check_requirements
    
    if [[ "$*" != *"--skip-backup"* ]]; then
        backup_existing
    fi
    
    deploy_code
    setup_environment
    setup_ssl
    
    if [[ "$*" == *"--only-update"* ]]; then
        log "仅更新模式，重启服务..."
        cd $PROJECT_DIR
        docker-compose restart
    else
        build_and_start
        init_database
    fi
    
    setup_monitoring
    cleanup
    show_deploy_info
    
    log "部署完成！"
}

# 错误处理
trap 'error "部署过程中发生错误，请检查日志: $LOG_FILE"; exit 1' ERR

# 执行主函数
main "$@"