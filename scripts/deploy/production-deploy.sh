#!/bin/bash

# 生产环境部署脚本
# 用于在腾讯云服务器 152.136.104.251 上部署AI项目

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
TENCENT_HOST="152.136.104.251"
APP_DIR="/opt/ai-project"
REGISTRY="ccr.ccs.tencentcloudapi.com"
NAMESPACE="ai-project"
IMAGE_NAME="ai-project-app"

# 检查必要的环境变量
check_env() {
    info "检查环境变量..."
    
    if [ -z "$TENCENT_REGISTRY_USERNAME" ]; then
        error "请设置环境变量 TENCENT_REGISTRY_USERNAME"
        exit 1
    fi
    
    if [ -z "$TENCENT_REGISTRY_PASSWORD" ]; then
        error "请设置环境变量 TENCENT_REGISTRY_PASSWORD"
        exit 1
    fi
    
    success "环境变量检查完成"
}

# 连接到腾讯云服务器并执行部署
deploy_to_server() {
    info "开始部署到腾讯云服务器 $TENCENT_HOST..."
    
    # 检查SSH连接
    if ! ssh -o ConnectTimeout=5 ubuntu@$TENCENT_HOST "echo '连接成功'" 2>/dev/null; then
        error "无法连接到服务器 $TENCENT_HOST"
        error "请确保："
        error "1. 服务器IP地址正确"
        error "2. SSH密钥已配置"
        error "3. 服务器防火墙允许SSH连接"
        exit 1
    fi
    
    # 在服务器上执行部署命令
    ssh ubuntu@$TENCENT_HOST << 'DEPLOY_SCRIPT'
        set -e
        
        # 颜色输出函数
        info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
        success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
        warning() { echo -e "\033[0;33m[WARNING]\033[0m $1"; }
        error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }
        
        # 切换到部署目录
        cd /opt/ai-project
        
        info "当前工作目录: $(pwd)"
        
        # 检查Docker服务状态
        if ! systemctl is-active --quiet docker; then
            error "Docker服务未运行，请先启动Docker"
            sudo systemctl start docker
        fi
        
        # 登录腾讯云容器镜像服务
        info "登录腾讯云容器镜像服务..."
        echo "$TENCENT_REGISTRY_PASSWORD" | docker login ccr.ccs.tencentcloudapi.com -u "$TENCENT_REGISTRY_USERNAME" --password-stdin
        
        # 拉取最新镜像
        info "拉取最新镜像..."
        docker pull ccr.ccs.tencentcloudapi.com/ai-project/ai-project-app-backend:latest
        docker pull ccr.ccs.tencentcloudapi.com/ai-project/ai-project-app-frontend:latest
        docker pull ccr.ccs.tencentcloudapi.com/ai-project/ai-project-app-mcp:latest
        
        # 停止当前运行的容器
        info "停止当前服务..."
        if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
            docker-compose -f docker-compose.prod.yml down
        fi
        
        # 备份当前配置（如果存在）
        if [ -f ".env.production" ]; then
            cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # 启动新的部署
        info "启动服务..."
        docker-compose -f docker-compose.prod.yml up -d
        
        # 等待服务启动
        info "等待服务启动..."
        sleep 30
        
        # 健康检查
        info "执行健康检查..."
        
        # 检查容器状态
        docker-compose -f docker-compose.prod.yml ps
        
        # 检查后端API
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            success "后端API健康检查通过"
        else
            warning "后端API健康检查失败"
        fi
        
        # 检查前端服务
        if curl -f http://localhost:80 >/dev/null 2>&1; then
            success "前端服务健康检查通过"
        else
            warning "前端服务健康检查失败"
        fi
        
        # 清理旧镜像
        info "清理旧镜像..."
        docker image prune -f
        
        # 显示最终状态
        info "部署完成！服务状态："
        docker-compose -f docker-compose.prod.yml ps
        
        success "🎉 生产环境部署成功！"
        info "应用访问地址："
        info "- 前端: http://152.136.104.251"
        info "- API: http://152.136.104.251/api/v1"
        info "- 健康检查: http://152.136.104.251/health"
DEPLOY_SCRIPT
}

# 部署后验证
verify_deployment() {
    info "验证部署结果..."
    
    # 检查前端
    if curl -f http://$TENCENT_HOST >/dev/null 2>&1; then
        success "✅ 前端服务正常"
    else
        warning "❌ 前端服务异常"
    fi
    
    # 检查API
    if curl -f http://$TENCENT_HOST/api/v1/health >/dev/null 2>&1; then
        success "✅ API服务正常"
    else
        # 尝试备用健康检查端点
        if curl -f http://$TENCENT_HOST/health >/dev/null 2>&1; then
            success "✅ 基础健康检查正常"
        else
            warning "❌ API服务异常"
        fi
    fi
}

# 显示部署信息
show_deployment_info() {
    info "部署信息："
    info "======================================"
    info "服务器IP: $TENCENT_HOST"
    info "部署目录: $APP_DIR"
    info "前端地址: http://$TENCENT_HOST"
    info "API地址: http://$TENCENT_HOST/api/v1"
    info "健康检查: http://$TENCENT_HOST/health"
    info "======================================"
    
    info "常用管理命令："
    info "查看服务状态: ssh ubuntu@$TENCENT_HOST 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps'"
    info "查看日志: ssh ubuntu@$TENCENT_HOST 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs -f'"
    info "重启服务: ssh ubuntu@$TENCENT_HOST 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml restart'"
    info "停止服务: ssh ubuntu@$TENCENT_HOST 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml down'"
}

# 主函数
main() {
    info "开始AI项目生产环境部署..."
    info "目标服务器: $TENCENT_HOST"
    
    check_env
    deploy_to_server
    verify_deployment
    show_deployment_info
    
    success "🎉 部署流程完成！"
}

# 帮助信息
show_help() {
    echo "AI项目生产环境部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  TENCENT_REGISTRY_USERNAME  腾讯云容器镜像服务用户名"
    echo "  TENCENT_REGISTRY_PASSWORD  腾讯云容器镜像服务密码"
    echo ""
    echo "示例:"
    echo "  export TENCENT_REGISTRY_USERNAME='your_username'"
    echo "  export TENCENT_REGISTRY_PASSWORD='your_password'"
    echo "  $0"
}

# 解析命令行参数
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac