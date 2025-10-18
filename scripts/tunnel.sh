#!/bin/bash

###############################################################################
# AI项目数据库隧道管理脚本
# 统一的开发环境数据库隧道管理工具
# 用法: ./scripts/tunnel.sh {start|stop|restart|status|check}
###############################################################################

set -e

# ============================================================================
# 配置
# ============================================================================

REMOTE_HOST="ubuntu@152.136.104.251"
LOCAL_PORT="5433"
REMOTE_PORT="5432"
PID_FILE="/tmp/ai-proj-tunnel.pid"
LOG_FILE="/tmp/ai-proj-tunnel.log"

# 数据库连接配置
DB_USER="${DB_USER:-ai_prod_user}"
DB_PASSWORD="${DB_PASSWORD:-}"  # 从环境变量读取，不再硬编码
DB_NAME="${DB_NAME:-ai_project_prod}"

# 如果需要默认密码（仅开发环境），可以从.env文件加载
if [ -z "$DB_PASSWORD" ] && [ -f "$HOME/.ai-proj-tunnel.env" ]; then
    source "$HOME/.ai-proj-tunnel.env"
fi

# ============================================================================
# 颜色输出
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# 日志函数
# ============================================================================

log() {
    echo -e "${BLUE}ℹ${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}✗${NC} $1" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

# ============================================================================
# 检查函数
# ============================================================================

# 检查隧道进程是否运行
is_tunnel_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            # 验证是否是正确的SSH进程
            if ps -p "$pid" -o command= | grep -q "ssh.*-L.*${LOCAL_PORT}"; then
                return 0
            fi
        fi
        # PID文件过期，删除
        rm -f "$PID_FILE"
    fi

    # 备用检查：通过端口查找
    if lsof -i ":${LOCAL_PORT}" -sTCP:LISTEN > /dev/null 2>&1; then
        local pid=$(lsof -ti ":${LOCAL_PORT}" -sTCP:LISTEN | head -1)
        if [ -n "$pid" ]; then
            echo "$pid" > "$PID_FILE"
            return 0
        fi
    fi

    return 1
}

# 测试隧道连通性
test_connectivity() {
    timeout 3 bash -c "echo > /dev/tcp/localhost/${LOCAL_PORT}" 2>/dev/null
    return $?
}

# 测试数据库连接
test_database() {
    if command -v psql > /dev/null 2>&1; then
        PGPASSWORD="$DB_PASSWORD" psql \
            -h localhost \
            -p "$LOCAL_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "SELECT 1" > /dev/null 2>&1
        return $?
    else
        # 如果没有psql，只测试端口
        test_connectivity
        return $?
    fi
}

# ============================================================================
# 隧道管理函数
# ============================================================================

# 启动隧道
start_tunnel() {
    log "正在启动SSH隧道..."

    # 检查是否已运行
    if is_tunnel_running; then
        log_warning "隧道已在运行 (PID: $(cat $PID_FILE))"
        show_status
        return 0
    fi

    # 清理旧进程
    cleanup_old_processes

    log "建立连接: localhost:${LOCAL_PORT} → ${REMOTE_HOST}:${REMOTE_PORT}"

    # 启动SSH隧道（后台运行）
    ssh -f -N \
        -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        "${REMOTE_HOST}" >> "$LOG_FILE" 2>&1

    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        log_error "SSH隧道启动失败 (退出码: ${exit_code})"
        log_error "查看日志: tail -f $LOG_FILE"
        return 1
    fi

    # 等待连接建立
    sleep 2

    # 获取PID
    local pid=$(lsof -ti ":${LOCAL_PORT}" -sTCP:LISTEN | head -1)

    if [ -z "$pid" ]; then
        log_error "无法找到SSH隧道进程"
        return 1
    fi

    echo "$pid" > "$PID_FILE"

    # 验证连接
    if test_connectivity; then
        log_success "隧道启动成功 (PID: $pid)"

        # 测试数据库
        if test_database; then
            log_success "数据库连接测试通过"
        else
            log_warning "隧道已建立但数据库连接失败"
        fi

        echo ""
        show_connection_info
        return 0
    else
        log_error "隧道启动失败，无法连接"
        cleanup_old_processes
        return 1
    fi
}

# 停止隧道
stop_tunnel() {
    log "正在停止SSH隧道..."

    if ! is_tunnel_running; then
        log_warning "隧道未运行"
        cleanup_old_processes
        return 0
    fi

    local pid=$(cat "$PID_FILE")

    # 温柔地终止
    kill "$pid" 2>/dev/null || true
    sleep 1

    # 检查是否还在运行
    if ps -p "$pid" > /dev/null 2>&1; then
        log_warning "进程未响应，强制终止..."
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$PID_FILE"

    log_success "隧道已停止"
}

# 重启隧道
restart_tunnel() {
    log "正在重启SSH隧道..."
    stop_tunnel
    sleep 2
    start_tunnel
}

# 清理旧进程
cleanup_old_processes() {
    # 清理占用端口的进程
    local pids=$(lsof -ti ":${LOCAL_PORT}" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
        log "已清理旧进程"
    fi

    rm -f "$PID_FILE"
}

# ============================================================================
# 显示信息函数
# ============================================================================

# 显示连接信息
show_connection_info() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📡 数据库连接信息${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Host:     localhost"
    echo "  Port:     ${LOCAL_PORT}"
    echo "  Database: ${DB_NAME}"
    echo "  User:     ${DB_USER}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 显示状态
show_status() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🔍 SSH隧道状态${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if is_tunnel_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "  状态:     ${GREEN}运行中${NC}"
        echo "  PID:      $pid"
        echo "  本地端口: ${LOCAL_PORT}"
        echo "  远程:     ${REMOTE_HOST}:${REMOTE_PORT}"

        # 连通性测试
        echo ""
        if test_connectivity; then
            echo -e "  连通性:   ${GREEN}正常${NC}"
        else
            echo -e "  连通性:   ${RED}异常${NC}"
        fi

        # 数据库测试
        if test_database; then
            echo -e "  数据库:   ${GREEN}连接成功${NC}"
        else
            echo -e "  数据库:   ${YELLOW}连接失败${NC}"
        fi

        # 运行时长
        echo ""
        echo "  进程信息:"
        ps -p "$pid" -o pid,etime,rss,command | tail -n 1 | awk '{printf "    PID: %s  运行时长: %s  内存: %d KB\n", $1, $2, $3}'

    else
        echo -e "  状态:     ${RED}未运行${NC}"
    fi

    echo ""
    echo "  日志文件: $LOG_FILE"
    echo "  PID文件:  $PID_FILE"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 快速检查
quick_check() {
    if is_tunnel_running && test_database; then
        log_success "隧道运行正常"
        return 0
    else
        log_error "隧道异常"
        return 1
    fi
}

# ============================================================================
# 显示帮助
# ============================================================================

show_help() {
    cat << EOF

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${CYAN}🚀 AI项目数据库隧道管理工具${NC}
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${YELLOW}用法:${NC}
  $0 {start|stop|restart|status|check|help}

${YELLOW}命令:${NC}
  ${GREEN}start${NC}     启动SSH隧道
  ${GREEN}stop${NC}      停止SSH隧道
  ${GREEN}restart${NC}   重启SSH隧道
  ${GREEN}status${NC}    查看详细状态
  ${GREEN}check${NC}     快速健康检查
  ${GREEN}help${NC}      显示此帮助信息

${YELLOW}示例:${NC}
  # 启动隧道
  $0 start

  # 查看状态
  $0 status

  # 快速检查
  $0 check

${YELLOW}配置:${NC}
  本地端口:   ${LOCAL_PORT}
  远程主机:   ${REMOTE_HOST}
  远程端口:   ${REMOTE_PORT}
  数据库:     ${DB_NAME}

${YELLOW}环境变量配置:${NC}
  1. 复制配置模板:
     cp scripts/.ai-proj-tunnel.env.example ~/.ai-proj-tunnel.env

  2. 编辑配置文件，设置数据库密码:
     vim ~/.ai-proj-tunnel.env

  或直接使用环境变量:
     export DB_PASSWORD="your_password"

${YELLOW}日志:${NC}
  查看日志:   tail -f $LOG_FILE
  PID文件:    $PID_FILE

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

EOF
}

# ============================================================================
# 主函数
# ============================================================================

main() {
    case "${1:-help}" in
        start)
            start_tunnel
            ;;
        stop)
            stop_tunnel
            ;;
        restart)
            restart_tunnel
            ;;
        status)
            show_status
            ;;
        check)
            quick_check
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
