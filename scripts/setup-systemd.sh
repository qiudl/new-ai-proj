#!/bin/bash

###############################################################################
# Systemd服务安装和管理脚本
# 用于在Linux系统上配置SSH隧道和后端服务的自动启动
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# 检查是否为Linux系统
check_linux() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "此脚本仅支持Linux系统（使用systemd）"
        log_info "当前系统: $OSTYPE"
        log_info "对于macOS，请使用launchd配置"
        exit 1
    fi
}

# 检查是否有sudo权限
check_sudo() {
    if ! sudo -n true 2>/dev/null; then
        log_error "需要sudo权限来安装systemd服务"
        log_info "请先运行: sudo -v"
        exit 1
    fi
}

# 检查systemd是否可用
check_systemd() {
    if ! command -v systemctl > /dev/null 2>&1; then
        log_error "systemctl命令不可用，请确认系统使用systemd"
        exit 1
    fi
}

# 安装SSH隧道服务
install_tunnel_service() {
    log_info "安装SSH隧道服务..."

    local service_file="${PROJECT_ROOT}/systemd/ssh-tunnel.service"
    local target_file="/etc/systemd/system/ssh-tunnel.service"

    if [ ! -f "$service_file" ]; then
        log_error "服务文件不存在: $service_file"
        return 1
    fi

    # 替换用户名和路径
    local temp_file=$(mktemp)
    sed "s|/Users/johnqiu|$HOME|g" "$service_file" | \
    sed "s|User=johnqiu|User=$USER|g" > "$temp_file"

    # 复制服务文件
    sudo cp "$temp_file" "$target_file"
    rm -f "$temp_file"

    # 重新加载systemd
    sudo systemctl daemon-reload

    log_success "SSH隧道服务已安装: $target_file"
}

# 安装后端服务
install_backend_service() {
    log_info "安装后端服务..."

    local service_file="${PROJECT_ROOT}/systemd/backend.service"
    local target_file="/etc/systemd/system/ai-backend.service"

    if [ ! -f "$service_file" ]; then
        log_error "服务文件不存在: $service_file"
        return 1
    fi

    # 替换用户名和路径
    local temp_file=$(mktemp)
    sed "s|/Users/johnqiu|$HOME|g" "$service_file" | \
    sed "s|User=johnqiu|User=$USER|g" > "$temp_file"

    # 复制服务文件
    sudo cp "$temp_file" "$target_file"
    rm -f "$temp_file"

    # 重新加载systemd
    sudo systemctl daemon-reload

    log_success "后端服务已安装: $target_file"
}

# 启用并启动服务
enable_services() {
    log_info "启用并启动服务..."

    # SSH隧道服务
    sudo systemctl enable ssh-tunnel.service
    sudo systemctl start ssh-tunnel.service

    log_success "SSH隧道服务已启用并启动"

    sleep 3

    # 后端服务
    sudo systemctl enable ai-backend.service
    sudo systemctl start ai-backend.service

    log_success "后端服务已启用并启动"
}

# 查看服务状态
show_status() {
    echo ""
    echo "=================================="
    echo "服务状态"
    echo "=================================="
    echo ""

    log_info "SSH隧道服务状态:"
    sudo systemctl status ssh-tunnel.service --no-pager -l || true

    echo ""
    log_info "后端服务状态:"
    sudo systemctl status ai-backend.service --no-pager -l || true

    echo ""
    echo "=================================="
    echo "常用命令"
    echo "=================================="
    echo "查看日志:"
    echo "  sudo journalctl -u ssh-tunnel.service -f"
    echo "  sudo journalctl -u ai-backend.service -f"
    echo ""
    echo "重启服务:"
    echo "  sudo systemctl restart ssh-tunnel.service"
    echo "  sudo systemctl restart ai-backend.service"
    echo ""
    echo "停止服务:"
    echo "  sudo systemctl stop ssh-tunnel.service"
    echo "  sudo systemctl stop ai-backend.service"
    echo ""
    echo "禁用自启动:"
    echo "  sudo systemctl disable ssh-tunnel.service"
    echo "  sudo systemctl disable ai-backend.service"
    echo "=================================="
}

# 卸载服务
uninstall_services() {
    log_info "卸载服务..."

    # 停止服务
    sudo systemctl stop ssh-tunnel.service 2>/dev/null || true
    sudo systemctl stop ai-backend.service 2>/dev/null || true

    # 禁用服务
    sudo systemctl disable ssh-tunnel.service 2>/dev/null || true
    sudo systemctl disable ai-backend.service 2>/dev/null || true

    # 删除服务文件
    sudo rm -f /etc/systemd/system/ssh-tunnel.service
    sudo rm -f /etc/systemd/system/ai-backend.service

    # 重新加载
    sudo systemctl daemon-reload

    log_success "服务已卸载"
}

# 显示帮助
show_help() {
    cat << EOF
Systemd服务安装和管理脚本

用法: $0 {install|uninstall|status|restart|logs|help}

命令:
  install       安装并启动SSH隧道和后端服务
  uninstall     卸载所有服务
  status        查看服务状态
  restart       重启所有服务
  logs          查看服务日志（实时）
  help          显示此帮助信息

示例:
  # 安装服务
  $0 install

  # 查看状态
  $0 status

  # 查看日志
  $0 logs

  # 卸载服务
  $0 uninstall

注意:
  - 仅支持Linux系统（使用systemd）
  - 需要sudo权限
  - macOS用户请使用launchd配置

EOF
}

# 重启服务
restart_services() {
    log_info "重启服务..."

    sudo systemctl restart ssh-tunnel.service
    log_success "SSH隧道服务已重启"

    sleep 2

    sudo systemctl restart ai-backend.service
    log_success "后端服务已重启"

    show_status
}

# 查看日志
show_logs() {
    echo "=================================="
    echo "服务日志（按Ctrl+C退出）"
    echo "=================================="
    echo ""

    # 同时显示两个服务的日志
    sudo journalctl -u ssh-tunnel.service -u ai-backend.service -f --since "1 hour ago"
}

# 主函数
main() {
    case "${1:-}" in
        install)
            check_linux
            check_sudo
            check_systemd
            install_tunnel_service
            install_backend_service
            enable_services
            show_status
            ;;
        uninstall)
            check_linux
            check_sudo
            check_systemd
            uninstall_services
            ;;
        status)
            check_linux
            check_systemd
            show_status
            ;;
        restart)
            check_linux
            check_sudo
            check_systemd
            restart_services
            ;;
        logs)
            check_linux
            check_systemd
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
