#!/bin/bash

# 服务器管理脚本
# 使用方法: ./server-manage.sh [命令]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SERVER_HOST="proj-joyloding"
PROJECT_DIR="/home/ubuntu/projects/new-ai-proj"

# 函数：打印带颜色的消息
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "服务器管理脚本"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "可用命令:"
    echo "  status     - 查看服务状态"
    echo "  logs       - 查看服务日志"
    echo "  restart    - 重启服务"
    echo "  stop       - 停止服务"
    echo "  start      - 启动服务"
    echo "  deploy     - 部署最新代码"
    echo "  backup     - 备份数据"
    echo "  monitor    - 监控服务"
    echo "  cleanup    - 清理旧数据"
    echo "  shell      - 连接到服务器"
    echo "  help       - 显示帮助信息"
    echo ""
}

# 执行远程命令
execute_remote() {
    local cmd="$1"
    ssh $SERVER_HOST "cd $PROJECT_DIR && $cmd"
}

# 查看服务状态
check_status() {
    print_step "检查服务状态..."
    execute_remote "docker-compose ps"
    echo ""
    execute_remote "docker-compose top"
}

# 查看日志
view_logs() {
    print_step "查看服务日志..."
    if [ -n "$2" ]; then
        execute_remote "docker-compose logs -f --tail=100 $2"
    else
        execute_remote "docker-compose logs -f --tail=50"
    fi
}

# 重启服务
restart_services() {
    print_step "重启服务..."
    if [ -n "$2" ]; then
        execute_remote "docker-compose restart $2"
    else
        execute_remote "docker-compose restart"
    fi
    print_status "服务重启完成"
}

# 停止服务
stop_services() {
    print_step "停止服务..."
    execute_remote "docker-compose down"
    print_status "服务已停止"
}

# 启动服务
start_services() {
    print_step "启动服务..."
    execute_remote "docker-compose up -d"
    print_status "服务已启动"
}

# 部署最新代码
deploy_latest() {
    print_step "部署最新代码..."
    execute_remote "git pull origin main && docker-compose up -d --build"
    print_status "部署完成"
}

# 备份数据
backup_data() {
    print_step "备份数据..."
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    execute_remote "
        mkdir -p backups/$BACKUP_NAME
        docker-compose exec -T postgres pg_dump -U user main_db > backups/$BACKUP_NAME/database.sql
        tar -czf backups/$BACKUP_NAME/logs.tar.gz logs/
        echo '备份完成: backups/$BACKUP_NAME'
    "
}

# 监控服务
monitor_services() {
    print_step "监控服务..."
    while true; do
        clear
        echo "=== AI项目管理平台 - 服务监控 ==="
        echo "时间: $(date)"
        echo ""
        
        # 服务状态
        echo "=== 服务状态 ==="
        execute_remote "docker-compose ps"
        echo ""
        
        # 系统资源
        echo "=== 系统资源 ==="
        execute_remote "docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'"
        echo ""
        
        # 磁盘使用
        echo "=== 磁盘使用 ==="
        execute_remote "df -h"
        echo ""
        
        echo "按 Ctrl+C 退出监控"
        sleep 5
    done
}

# 清理旧数据
cleanup_old_data() {
    print_step "清理旧数据..."
    execute_remote "
        # 清理Docker镜像
        docker image prune -f
        
        # 清理旧日志
        find logs/ -name '*.log' -mtime +30 -delete
        
        # 清理旧备份
        find backups/ -name 'backup_*' -mtime +7 -delete
        
        echo '清理完成'
    "
}

# 连接到服务器
connect_shell() {
    print_step "连接到服务器..."
    ssh $SERVER_HOST
}

# 主函数
main() {
    case "$1" in
        status)
            check_status
            ;;
        logs)
            view_logs "$@"
            ;;
        restart)
            restart_services "$@"
            ;;
        stop)
            stop_services
            ;;
        start)
            start_services
            ;;
        deploy)
            deploy_latest
            ;;
        backup)
            backup_data
            ;;
        monitor)
            monitor_services
            ;;
        cleanup)
            cleanup_old_data
            ;;
        shell)
            connect_shell
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"