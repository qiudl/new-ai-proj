#!/bin/bash

# 轻量服务器简化部署脚本
# 直接在服务器上构建，无需外部镜像仓库

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置变量
SERVER_HOST="${SERVER_HOST:-152.136.104.251}"
PROJECT_DIR="/opt/ai-project"
REPO_URL="https://github.com/yourusername/new-ai-proj.git"  # 替换为您的仓库地址

# 函数：检查Docker安装
check_docker() {
    info "检查Docker安装状态..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker未安装，正在安装..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        success "Docker安装完成"
    else
        success "Docker已安装"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose未安装，正在安装..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        success "Docker Compose安装完成"
    else
        success "Docker Compose已安装"
    fi
}

# 函数：准备项目目录
prepare_project() {
    info "准备项目目录..."
    
    sudo mkdir -p $PROJECT_DIR
    sudo chown -R $USER:$USER $PROJECT_DIR
    cd $PROJECT_DIR
    
    # 备份现有部署
    if [ -d "current" ]; then
        warning "发现现有部署，正在备份..."
        mv current backup-$(date +%Y%m%d_%H%M%S)
    fi
    
    success "项目目录准备完成"
}

# 函数：下载最新代码
download_code() {
    info "下载最新代码..."
    
    cd $PROJECT_DIR
    git clone $REPO_URL current
    cd current
    
    # 复制环境配置文件
    if [ ! -f ".env" ]; then
        cp .env.simple .env
        warning "请编辑 .env 文件配置数据库密码等敏感信息"
    fi
    
    success "代码下载完成"
}

# 函数：停止现有服务
stop_services() {
    info "停止现有服务..."
    
    cd $PROJECT_DIR/current
    docker-compose -f docker-compose.simple.yml down 2>/dev/null || true
    
    # 清理旧镜像
    docker image prune -f || true
    
    success "服务停止完成"
}

# 函数：构建和启动服务
build_and_start() {
    info "构建和启动服务..."
    
    cd $PROJECT_DIR/current
    
    # 构建镜像并启动服务
    docker-compose -f docker-compose.simple.yml up --build -d
    
    success "服务启动完成"
}

# 函数：健康检查
health_check() {
    info "执行健康检查..."
    
    # 等待服务启动
    sleep 30
    
    # 检查服务状态
    cd $PROJECT_DIR/current
    docker-compose -f docker-compose.simple.yml ps
    
    # 检查应用响应
    if curl -f http://localhost/health >/dev/null 2>&1; then
        success "✅ 应用健康检查通过"
        return 0
    else
        error "❌ 应用健康检查失败"
        warning "查看服务日志："
        docker-compose -f docker-compose.simple.yml logs --tail=20
        return 1
    fi
}

# 函数：显示部署信息
show_info() {
    info "部署完成信息:"
    info "======================================"
    info "服务器地址: $SERVER_HOST"
    info "项目目录: $PROJECT_DIR/current"
    info "前端地址: http://$SERVER_HOST"
    info "API地址: http://$SERVER_HOST/api/v1"
    info "健康检查: http://$SERVER_HOST/health"
    info "======================================"
    
    info "常用管理命令:"
    info "cd $PROJECT_DIR/current"
    info "docker-compose -f docker-compose.simple.yml ps     # 查看状态"
    info "docker-compose -f docker-compose.simple.yml logs   # 查看日志"
    info "docker-compose -f docker-compose.simple.yml restart # 重启服务"
    info "docker-compose -f docker-compose.simple.yml down   # 停止服务"
}

# 主函数
main() {
    info "开始轻量服务器部署..."
    
    check_docker
    prepare_project
    download_code
    stop_services
    build_and_start
    
    if health_check; then
        success "🎉 部署成功！"
        show_info
    else
        error "❌ 部署失败，请检查日志"
        exit 1
    fi
}

# 显示帮助
show_help() {
    echo "轻量服务器部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  --status       查看服务状态"
    echo "  --logs         查看服务日志"
    echo "  --restart      重启服务"
    echo "  --stop         停止服务"
    echo ""
    echo "环境变量:"
    echo "  SERVER_HOST    服务器地址（默认：152.136.104.251）"
}

# 服务管理函数
manage_service() {
    local action=$1
    cd $PROJECT_DIR/current 2>/dev/null || {
        error "项目未部署，请先运行部署"
        exit 1
    }
    
    case $action in
        status)
            docker-compose -f docker-compose.simple.yml ps
            ;;
        logs)
            docker-compose -f docker-compose.simple.yml logs -f
            ;;
        restart)
            docker-compose -f docker-compose.simple.yml restart
            ;;
        stop)
            docker-compose -f docker-compose.simple.yml down
            ;;
    esac
}

# 解析命令行参数
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --status)
        manage_service status
        exit 0
        ;;
    --logs)
        manage_service logs
        exit 0
        ;;
    --restart)
        manage_service restart
        exit 0
        ;;
    --stop)
        manage_service stop
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac