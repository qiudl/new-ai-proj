#!/bin/bash
# PostgreSQL主从复制 - AutoSSH隧道自动重连脚本
# 功能: 自动维护SSH隧道,断线自动重连

set -e

# 配置参数
REMOTE_HOST="152.136.104.251"
REMOTE_USER="ubuntu"
LOCAL_PORT=15433
REMOTE_PORT=5432
MONITOR_PORT=0  # 0表示使用autossh内置监控
LOG_FILE="/Users/johnqiu/coding/www/projects/new-ai-proj/logs/autossh-tunnel.log"
PID_FILE="/tmp/autossh-pg-tunnel.pid"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1" | tee -a "$LOG_FILE"
}

# 检查是否已运行
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# 停止autossh
stop_autossh() {
    log "正在停止AutoSSH隧道..."

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID" 2>/dev/null || true
            sleep 2
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID" 2>/dev/null || true
            fi
            log "AutoSSH隧道已停止 (PID: $PID)"
        fi
        rm -f "$PID_FILE"
    fi

    # 清理可能残留的ssh进程
    pkill -f "ssh.*${LOCAL_PORT}.*${REMOTE_HOST}" 2>/dev/null || true
}

# 启动autossh
start_autossh() {
    log "🚀 启动AutoSSH隧道..."

    # AutoSSH环境变量
    export AUTOSSH_GATETIME=0  # 首次连接失败时不退出
    export AUTOSSH_POLL=60     # 每60秒检查连接
    export AUTOSSH_LOGFILE="$LOG_FILE"
    export AUTOSSH_DEBUG=1
    export AUTOSSH_PIDFILE="$PID_FILE"

    # 启动autossh
    autossh -M $MONITOR_PORT \
        -f \
        -N \
        -o "ServerAliveInterval=30" \
        -o "ServerAliveCountMax=3" \
        -o "ExitOnForwardFailure=yes" \
        -o "StrictHostKeyChecking=no" \
        -L ${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT} \
        ${REMOTE_USER}@${REMOTE_HOST}

    # 等待启动
    sleep 2

    # 验证
    if check_running; then
        PID=$(cat "$PID_FILE")
        log "✅ AutoSSH隧道启动成功!"
        log "   PID: $PID"
        log "   本地端口: $LOCAL_PORT"
        log "   远端地址: ${REMOTE_HOST}:${REMOTE_PORT}"
        log "   监控间隔: 60秒"
        log "   心跳检测: 30秒"

        # 测试连接
        if nc -z 127.0.0.1 $LOCAL_PORT 2>/dev/null; then
            log "✅ 隧道连接测试成功"
        else
            warn "⚠️  隧道连接测试失败,但AutoSSH正在运行"
        fi
    else
        error "❌ AutoSSH启动失败"
        exit 1
    fi
}

# 重启autossh
restart_autossh() {
    log "重启AutoSSH隧道..."
    stop_autossh
    sleep 1
    start_autossh
}

# 状态检查
status_autossh() {
    if check_running; then
        PID=$(cat "$PID_FILE")
        log "✅ AutoSSH隧道运行中"
        log "   PID: $PID"
        ps aux | grep "$PID" | grep -v grep

        # 测试连接
        if nc -z 127.0.0.1 $LOCAL_PORT 2>/dev/null; then
            log "✅ 隧道连接正常 (127.0.0.1:$LOCAL_PORT)"
        else
            error "❌ 隧道连接失败 (127.0.0.1:$LOCAL_PORT)"
            return 1
        fi
    else
        error "❌ AutoSSH未运行"
        return 1
    fi
}

# 查看日志
view_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -50 "$LOG_FILE"
    else
        error "日志文件不存在: $LOG_FILE"
    fi
}

# 主程序
case "${1:-start}" in
    start)
        if check_running; then
            warn "AutoSSH隧道已在运行"
            status_autossh
        else
            start_autossh
        fi
        ;;
    stop)
        stop_autossh
        ;;
    restart)
        restart_autossh
        ;;
    status)
        status_autossh
        ;;
    logs)
        view_logs
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "命令说明:"
        echo "  start   - 启动AutoSSH隧道"
        echo "  stop    - 停止AutoSSH隧道"
        echo "  restart - 重启AutoSSH隧道"
        echo "  status  - 查看运行状态"
        echo "  logs    - 查看最近日志"
        exit 1
        ;;
esac

exit 0
