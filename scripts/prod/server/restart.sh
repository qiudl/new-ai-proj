#!/bin/bash
# restart.sh - 服务重启脚本
# 用法: ./restart.sh [backend|nginx|all]

SERVICE="${1:-backend}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

restart_backend() {
    log "重启后端服务..."

    if sudo supervisorctl restart ai-backend; then
        sleep 3
        if curl -sf "http://localhost:8080/health" > /dev/null 2>&1; then
            log_success "后端重启成功"
        else
            log_error "后端重启后健康检查失败"
            return 1
        fi
    else
        log_error "后端重启失败"
        return 1
    fi
}

restart_nginx() {
    log "重启 Nginx..."

    if sudo nginx -t; then
        sudo systemctl reload nginx
        log_success "Nginx 重载成功"
    else
        log_error "Nginx 配置错误"
        return 1
    fi
}

restart_all() {
    log "重启所有服务..."
    restart_backend
    restart_nginx
}

echo ""
echo "=========================================="
echo "🔄 服务重启"
echo "=========================================="
echo ""

case "$SERVICE" in
    backend|back|b)
        restart_backend
        ;;
    nginx|n)
        restart_nginx
        ;;
    all|a)
        restart_all
        ;;
    -h|--help|help)
        echo "用法: $0 [服务]"
        echo ""
        echo "服务:"
        echo "  backend, back, b    重启后端"
        echo "  nginx, n            重载 Nginx"
        echo "  all, a              重启所有服务"
        exit 0
        ;;
    *)
        log_error "未知服务: $SERVICE"
        echo "使用 '$0 --help' 查看帮助"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
