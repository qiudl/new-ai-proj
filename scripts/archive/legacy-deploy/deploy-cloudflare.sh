#!/bin/bash

# Cloudflare Pages 部署脚本
# 使用方法: ./scripts/deploy-cloudflare.sh [production|preview]

set -e

# 配置
PROJECT_NAME="ai-project-frontend"
BUILD_DIR="frontend/build"
FRONTEND_DIR="frontend"

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

# 检查参数
ENVIRONMENT=${1:-production}
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "preview" ]]; then
    log_error "环境参数必须是 'production' 或 'preview'"
    exit 1
fi

log_info "开始部署到 Cloudflare Pages ($ENVIRONMENT 环境)"

# 检查必要工具
check_dependencies() {
    log_info "检查依赖工具..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装" 
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 清理旧构建
clean_build() {
    log_info "清理旧构建文件..."
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi
    log_success "清理完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装前端依赖..."
    cd "$FRONTEND_DIR"
    
    # 安装 wrangler 如果不存在
    if ! npm list wrangler &> /dev/null; then
        log_info "安装 Wrangler CLI..."
        npm install --save-dev wrangler@latest
    fi
    
    npm ci --production=false
    cd ..
    log_success "依赖安装完成"
}

# 构建应用
build_app() {
    log_info "构建前端应用..."
    cd "$FRONTEND_DIR"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        npm run build:cloudflare
    else
        GENERATE_SOURCEMAP=true npm run build
        npm run copy:cf-files
    fi
    
    cd ..
    log_success "构建完成"
}

# 优化构建产物
optimize_build() {
    log_info "优化构建产物..."
    
    # 检查构建目录
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "构建目录不存在: $BUILD_DIR"
        exit 1
    fi
    
    # 显示构建大小
    BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
    log_info "构建产物大小: $BUILD_SIZE"
    
    # 检查必要文件
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        log_error "找不到 index.html 文件"
        exit 1
    fi
    
    if [ ! -f "$BUILD_DIR/_redirects" ]; then
        log_warning "找不到 _redirects 文件，将使用默认配置"
    fi
    
    log_success "优化完成"
}

# 部署到 Cloudflare Pages
deploy_to_cloudflare() {
    log_info "部署到 Cloudflare Pages..."
    cd "$FRONTEND_DIR"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        npx wrangler pages deploy build --project-name="$PROJECT_NAME" --compatibility-date=2024-01-15
    else
        npx wrangler pages deploy build --project-name="$PROJECT_NAME" --env=preview --compatibility-date=2024-01-15
    fi
    
    cd ..
    log_success "部署完成"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息:"
    echo "  项目名称: $PROJECT_NAME"
    echo "  环境: $ENVIRONMENT"
    echo "  构建目录: $BUILD_DIR"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  访问地址: https://$PROJECT_NAME.pages.dev"
    else
        echo "  预览地址: https://preview-$PROJECT_NAME.pages.dev"
    fi
    
    echo ""
    log_success "部署成功完成! 🚀"
    log_info "请在 Cloudflare Pages 控制台查看部署状态"
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"' ERR

# 主流程
main() {
    log_info "=== Cloudflare Pages 部署脚本 ==="
    
    check_dependencies
    clean_build
    install_dependencies
    build_app
    optimize_build
    deploy_to_cloudflare
    show_deployment_info
}

# 执行主流程
main "$@"