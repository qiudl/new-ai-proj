#!/bin/bash

###############################################################################
# macOS Launchd服务安装和管理脚本
# 用于在macOS上配置SSH隧道的自动启动
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 服务配置
SERVICE_NAME="com.aiproject.ssh-tunnel"
PLIST_SOURCE="${PROJECT_ROOT}/launchd/${SERVICE_NAME}.plist"
PLIST_TARGET="${HOME}/Library/LaunchAgents/${SERVICE_NAME}.plist"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查是否为macOS
check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "此脚本仅支持macOS系统"
        log_info "当前系统: $OSTYPE"
        log_info "对于Linux，请使用systemd配置"
        exit 1
    fi
}

# 安装服务
install_service() {
    log_info "安装SSH隧道Launchd服务..."

    if [ ! -f "$PLIST_SOURCE" ]; then
        log_error "plist文件不存在: $PLIST_SOURCE"
        return 1
    fi

    # 创建LaunchAgents目录（如果不存在）
    mkdir -p "${HOME}/Library/LaunchAgents"

    # 替换用户路径
    sed "s|/Users/johnqiu|$HOME|g" "$PLIST_SOURCE" > "$PLIST_TARGET"

    log_success "服务配置已安装: $PLIST_TARGET"

    # 加载服务
    launchctl load "$PLIST_TARGET" 2>/dev/null || launchctl bootstrap "gui/$(id -u)" "$PLIST_TARGET"

    log_success "服务已加载并启动"
}

# 卸载服务
uninstall_service() {
    log_info "卸载SSH隧道Launchd服务..."

    # 卸载服务
    launchctl unload "$PLIST_TARGET" 2>/dev/null || launchctl bootout "gui/$(id -u)/${SERVICE_NAME}" 2>/dev/null || true

    # 删除配置文件
    rm -f "$PLIST_TARGET"

    log_success "服务已卸载"
}

# 查看服务状态
show_status() {
    echo ""
    echo "=================================="
    echo "服务状态"
    echo "=================================="
    echo ""

    # 检查服务是否加载
    if launchctl list | grep -q "$SERVICE_NAME"; then
        log_success "服务已加载: $SERVICE_NAME"

        # 显示详细信息
        echo ""
        launchctl list "$SERVICE_NAME" 2>/dev/null || true
    else
        log_warning "服务未加载: $SERVICE_NAME"
    fi

    echo ""
    echo "=================================="
    echo "日志文件"
    echo "=================================="
    echo "标准输出: /tmp/ssh-tunnel-launchd.log"
    echo "错误输出: /tmp/ssh-tunnel-launchd-error.log"
    echo "管理日志: /tmp/ssh-tunnel-15433.log"
    echo ""
    echo "=================================="
    echo "常用命令"
    echo "=================================="
    echo "重启服务:"
    echo "  $0 restart"
    echo ""
    echo "查看日志:"
    echo "  $0 logs"
    echo ""
    echo "停止服务:"
    echo "  $0 stop"
    echo ""
    echo "启动服务:"
    echo "  $0 start"
    echo "=================================="
}

# 重启服务
restart_service() {
    log_info "重启服务..."

    # 停止服务
    launchctl unload "$PLIST_TARGET" 2>/dev/null || launchctl bootout "gui/$(id -u)/${SERVICE_NAME}" 2>/dev/null || true

    sleep 2

    # 启动服务
    launchctl load "$PLIST_TARGET" 2>/dev/null || launchctl bootstrap "gui/$(id -u)" "$PLIST_TARGET"

    log_success "服务已重启"

    sleep 2
    show_status
}

# 停止服务
stop_service() {
    log_info "停止服务..."

    launchctl unload "$PLIST_TARGET" 2>/dev/null || launchctl bootout "gui/$(id -u)/${SERVICE_NAME}" 2>/dev/null || true

    log_success "服务已停止"
}

# 启动服务
start_service() {
    log_info "启动服务..."

    launchctl load "$PLIST_TARGET" 2>/dev/null || launchctl bootstrap "gui/$(id -u)" "$PLIST_TARGET"

    log_success "服务已启动"

    sleep 2
    show_status
}

# 查看日志
show_logs() {
    echo "=================================="
    echo "SSH隧道日志（按Ctrl+C退出）"
    echo "=================================="
    echo ""

    # 同时显示多个日志文件
    tail -f /tmp/ssh-tunnel-15433.log \
           /tmp/ssh-tunnel-launchd.log \
           /tmp/ssh-tunnel-launchd-error.log 2>/dev/null
}

# 显示帮助
show_help() {
    cat << EOF
macOS Launchd服务安装和管理脚本

用法: $0 {install|uninstall|status|start|stop|restart|logs|help}

命令:
  install       安装SSH隧道Launchd服务
  uninstall     卸载服务
  status        查看服务状态
  start         启动服务
  stop          停止服务
  restart       重启服务
  logs          查看服务日志（实时）
  help          显示此帮助信息

示例:
  # 安装服务（开机自启动）
  $0 install

  # 查看状态
  $0 status

  # 重启服务
  $0 restart

  # 查看日志
  $0 logs

  # 卸载服务
  $0 uninstall

注意:
  - 仅支持macOS系统
  - 服务会在登录时自动启动
  - 配置文件位于: ~/Library/LaunchAgents/

EOF
}

# 主函数
main() {
    check_macos

    case "${1:-}" in
        install)
            install_service
            show_status
            ;;
        uninstall)
            uninstall_service
            ;;
        status)
            show_status
            ;;
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        logs)
            show_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: ${1:-}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
