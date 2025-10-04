#!/bin/bash

###############################################################################
# SSH隧道自动管理脚本
# 功能：
# 1. 自动启动SSH隧道
# 2. 健康检查（检测隧道是否存活）
# 3. 自动重连机制
# 4. 日志记录
###############################################################################

# 配置
REMOTE_HOST="${REMOTE_HOST:-ubuntu@152.136.104.251}"
LOCAL_PORT="${LOCAL_PORT:-15433}"
REMOTE_PORT="${REMOTE_PORT:-5432}"
PID_FILE="/tmp/ssh-tunnel-${LOCAL_PORT}.pid"
LOG_FILE="/tmp/ssh-tunnel-${LOCAL_PORT}.log"
MAX_RETRY="${MAX_RETRY:-3}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} [$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} [$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} [$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查隧道是否运行
is_tunnel_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            # 检查进程是否真的是SSH隧道（检查命令和端口）
            if ps -p "$pid" -o command= | grep -q "ssh.*-L.*${LOCAL_PORT}"; then
                return 0
            fi
        fi
        # PID文件存在但进程不存在，清理PID文件
        rm -f "$PID_FILE"
    fi

    # 备用检查：通过端口查找
    if is_port_listening; then
        local pid=$(lsof -ti ":${LOCAL_PORT}" -sTCP:LISTEN | head -1)
        if [ -n "$pid" ]; then
            echo "$pid" > "$PID_FILE"
            return 0
        fi
    fi

    return 1
}

# 检查端口是否被占用
is_port_listening() {
    lsof -i ":${LOCAL_PORT}" -sTCP:LISTEN > /dev/null 2>&1
    return $?
}

# 测试隧道连通性
test_tunnel_connectivity() {
    # 尝试连接到本地端口
    timeout 5 bash -c "echo > /dev/tcp/localhost/${LOCAL_PORT}" > /dev/null 2>&1
    return $?
}

# 启动SSH隧道
start_tunnel() {
    log "正在启动SSH隧道: localhost:${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT}"

    # 清理旧的PID文件
    rm -f "$PID_FILE"

    # 启动SSH隧道（-f 后台运行，-N 不执行远程命令，-o 选项优化）
    ssh -f -N \
        -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        -o StrictHostKeyChecking=no \
        "${REMOTE_HOST}" > /dev/null 2>&1

    local ssh_exit_code=$?

    if [ $ssh_exit_code -ne 0 ]; then
        log_error "SSH隧道启动失败，退出码: ${ssh_exit_code}"
        return 1
    fi

    # 等待端口监听
    sleep 2

    # 获取SSH进程PID（通过端口更准确）
    local pid=$(lsof -ti ":${LOCAL_PORT}" -sTCP:LISTEN | head -1)

    if [ -z "$pid" ]; then
        # 备用方案：通过进程名查找
        pid=$(pgrep -f "ssh.*-L.*${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" | head -1)
    fi

    if [ -z "$pid" ]; then
        log_error "无法找到SSH隧道进程"
        return 1
    fi

    echo "$pid" > "$PID_FILE"

    # 验证端口是否在监听
    if is_port_listening; then
        log_success "SSH隧道启动成功 (PID: ${pid})"
        return 0
    else
        log_error "SSH隧道启动失败，端口未监听"
        return 1
    fi
}

# 停止SSH隧道
stop_tunnel() {
    log "正在停止SSH隧道..."

    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid" 2>/dev/null
            sleep 1

            # 强制杀死
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid" 2>/dev/null
            fi

            log_success "SSH隧道已停止 (PID: ${pid})"
        else
            log_warning "SSH隧道进程不存在 (PID: ${pid})"
        fi
        rm -f "$PID_FILE"
    else
        # 尝试通过端口查找并杀死进程
        local pids=$(lsof -ti ":${LOCAL_PORT}" 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null
            log_success "已清理占用端口 ${LOCAL_PORT} 的进程"
        else
            log_warning "未找到运行中的SSH隧道"
        fi
    fi
}

# 重启SSH隧道
restart_tunnel() {
    log "正在重启SSH隧道..."
    stop_tunnel
    sleep 2
    start_tunnel
}

# 状态检查
status_tunnel() {
    echo "=================================="
    echo "SSH隧道状态"
    echo "=================================="
    echo "本地端口: ${LOCAL_PORT}"
    echo "远程主机: ${REMOTE_HOST}"
    echo "远程端口: ${REMOTE_PORT}"
    echo ""

    if is_tunnel_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "状态: ${GREEN}运行中${NC}"
        echo "PID: ${pid}"

        # 显示连接信息
        if is_port_listening; then
            echo -e "端口监听: ${GREEN}正常${NC}"

            # 测试连通性
            if test_tunnel_connectivity; then
                echo -e "连通性测试: ${GREEN}通过${NC}"
            else
                echo -e "连通性测试: ${YELLOW}警告 - 可能无法连接${NC}"
            fi
        else
            echo -e "端口监听: ${RED}异常${NC}"
        fi

        # 显示进程信息
        echo ""
        echo "进程详情:"
        ps -p "$pid" -o pid,ppid,user,start,time,command 2>/dev/null || echo "无法获取进程信息"
    else
        echo -e "状态: ${RED}未运行${NC}"
    fi

    echo ""
    echo "=================================="
}

# 健康检查并自动重连
health_check() {
    log "开始健康检查循环 (间隔: ${HEALTH_CHECK_INTERVAL}秒)"

    local retry_count=0

    while true; do
        if is_tunnel_running && test_tunnel_connectivity; then
            log "健康检查: 正常"
            retry_count=0
        else
            log_warning "健康检查: 隧道异常，尝试重连 (${retry_count}/${MAX_RETRY})"

            stop_tunnel
            sleep 2

            if start_tunnel; then
                log_success "重连成功"
                retry_count=0
            else
                retry_count=$((retry_count + 1))
                log_error "重连失败 (${retry_count}/${MAX_RETRY})"

                if [ $retry_count -ge $MAX_RETRY ]; then
                    log_error "达到最大重试次数，退出健康检查"
                    exit 1
                fi
            fi
        fi

        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# 显示帮助
show_help() {
    cat << EOF
SSH隧道自动管理脚本

用法: $0 {start|stop|restart|status|health|check|help}

命令:
  start     启动SSH隧道
  stop      停止SSH隧道
  restart   重启SSH隧道
  status    查看隧道状态
  health    启动健康检查并自动重连（前台运行）
  check     单次健康检查
  help      显示此帮助信息

环境变量:
  REMOTE_HOST              远程主机 (默认: ubuntu@152.136.104.251)
  LOCAL_PORT               本地端口 (默认: 15433)
  REMOTE_PORT              远程端口 (默认: 5432)
  MAX_RETRY                最大重试次数 (默认: 3)
  HEALTH_CHECK_INTERVAL    健康检查间隔(秒) (默认: 30)

示例:
  # 启动隧道
  $0 start

  # 查看状态
  $0 status

  # 后台运行健康检查
  nohup $0 health > /dev/null 2>&1 &

  # 自定义配置启动
  REMOTE_HOST=user@host LOCAL_PORT=5433 $0 start

日志文件: $LOG_FILE
PID文件: $PID_FILE

EOF
}

# 主函数
main() {
    case "${1:-}" in
        start)
            if is_tunnel_running; then
                log_warning "SSH隧道已在运行中"
                status_tunnel
                exit 0
            fi
            start_tunnel
            ;;
        stop)
            stop_tunnel
            ;;
        restart)
            restart_tunnel
            ;;
        status)
            status_tunnel
            ;;
        health)
            # 确保隧道启动
            if ! is_tunnel_running; then
                start_tunnel || exit 1
            fi
            health_check
            ;;
        check)
            if is_tunnel_running && test_tunnel_connectivity; then
                log_success "隧道运行正常"
                exit 0
            else
                log_error "隧道异常"
                exit 1
            fi
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "错误: 未知命令 '${1:-}'"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
