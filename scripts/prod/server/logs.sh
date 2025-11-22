#!/bin/bash
# logs.sh - 日志查看工具
# 用法: ./logs.sh [backend|nginx|all] [--follow|-f]

DEPLOY_DIR="/opt/ai-project"
LOG_TYPE="${1:-backend}"
FOLLOW=false

# 检查 -f 或 --follow 参数
for arg in "$@"; do
    if [ "$arg" = "-f" ] || [ "$arg" = "--follow" ]; then
        FOLLOW=true
    fi
done

case "$LOG_TYPE" in
    backend|back|b)
        LOG_FILE="$DEPLOY_DIR/logs/backend.log"
        ;;
    error|err|e)
        LOG_FILE="$DEPLOY_DIR/logs/backend.err"
        ;;
    nginx|n)
        LOG_FILE="/var/log/nginx/access.log"
        ;;
    nginx-error|ne)
        LOG_FILE="/var/log/nginx/error.log"
        ;;
    monitor|m)
        LOG_FILE="$DEPLOY_DIR/logs/monitor.log"
        ;;
    all|a)
        echo "=========================================="
        echo "📋 后端日志 (最后 20 行)"
        echo "=========================================="
        tail -20 "$DEPLOY_DIR/logs/backend.log" 2>/dev/null || echo "日志文件不存在"
        echo ""
        echo "=========================================="
        echo "📋 错误日志 (最后 10 行)"
        echo "=========================================="
        tail -10 "$DEPLOY_DIR/logs/backend.err" 2>/dev/null || echo "日志文件不存在"
        echo ""
        echo "=========================================="
        echo "📋 Nginx 错误日志 (最后 10 行)"
        echo "=========================================="
        sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "日志文件不存在"
        exit 0
        ;;
    -h|--help|help)
        echo "用法: $0 [类型] [选项]"
        echo ""
        echo "类型:"
        echo "  backend, back, b    后端日志"
        echo "  error, err, e       后端错误日志"
        echo "  nginx, n            Nginx 访问日志"
        echo "  nginx-error, ne     Nginx 错误日志"
        echo "  monitor, m          监控日志"
        echo "  all, a              显示所有日志摘要"
        echo ""
        echo "选项:"
        echo "  -f, --follow        实时跟踪日志"
        echo ""
        echo "示例:"
        echo "  $0 backend -f       实时查看后端日志"
        echo "  $0 error            查看错误日志"
        echo "  $0 all              查看所有日志摘要"
        exit 0
        ;;
    *)
        echo "未知日志类型: $LOG_TYPE"
        echo "使用 '$0 --help' 查看帮助"
        exit 1
        ;;
esac

# 检查日志文件
if [ ! -f "$LOG_FILE" ]; then
    echo "日志文件不存在: $LOG_FILE"
    exit 1
fi

# 显示日志
if [ "$FOLLOW" = true ]; then
    echo "实时跟踪: $LOG_FILE (Ctrl+C 退出)"
    echo "=========================================="
    tail -f "$LOG_FILE"
else
    echo "=========================================="
    echo "📋 $LOG_FILE (最后 50 行)"
    echo "=========================================="
    tail -50 "$LOG_FILE"
fi
