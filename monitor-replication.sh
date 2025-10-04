#!/bin/bash
# PostgreSQL主从复制监控脚本
# 功能: 监控复制延迟、连接状态、数据差异并告警

set -e

# 配置参数
MASTER_HOST="152.136.104.251"
MASTER_USER="ubuntu"
SLAVE_CONTAINER="ai_postgres_slave"
DB_NAME="new_ai_proj_prod"
DB_USER="app_user"

# 告警阈值
LAG_THRESHOLD_BYTES=$((10 * 1024 * 1024))  # 10MB延迟告警
LAG_THRESHOLD_SECONDS=30  # 30秒延迟告警
CHECK_INTERVAL=10  # 检查间隔(秒)

# 日志文件
LOG_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj/logs"
LOG_FILE="$LOG_DIR/replication-monitor.log"
ALERT_FILE="$LOG_DIR/replication-alerts.log"

mkdir -p "$LOG_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

alert() {
    local level=$1
    shift
    local msg="$@"
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [$level]${NC} $msg" | tee -a "$LOG_FILE" "$ALERT_FILE"

    # 发送系统通知(macOS)
    osascript -e "display notification \"$msg\" with title \"PostgreSQL复制告警\" subtitle \"$level\"" 2>/dev/null || true
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# 检查SSH隧道
check_ssh_tunnel() {
    if ! nc -z 127.0.0.1 15433 2>/dev/null; then
        alert "CRITICAL" "SSH隧道断开,无法连接到主库"
        return 1
    fi
    return 0
}

# 检查从库状态
check_slave_status() {
    local result=$(docker exec $SLAVE_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c \
        "SELECT pg_is_in_recovery();" 2>/dev/null)

    if [ "$result" != "t" ]; then
        alert "CRITICAL" "从库未处于恢复模式,可能已晋升为主库或出现故障"
        return 1
    fi
    return 0
}

# 获取复制延迟(字节)
get_replication_lag_bytes() {
    local receive_lsn=$(docker exec $SLAVE_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c \
        "SELECT pg_last_wal_receive_lsn();" 2>/dev/null)
    local replay_lsn=$(docker exec $SLAVE_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c \
        "SELECT pg_last_wal_replay_lsn();" 2>/dev/null)

    if [ -z "$receive_lsn" ] || [ -z "$replay_lsn" ]; then
        echo "0"
        return
    fi

    # 计算LSN差异(字节)
    local lag=$(docker exec $SLAVE_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c \
        "SELECT pg_wal_lsn_diff('$receive_lsn', '$replay_lsn');" 2>/dev/null)

    echo "${lag:-0}"
}

# 获取复制延迟(时间)
get_replication_lag_time() {
    local lag=$(ssh $MASTER_USER@$MASTER_HOST "docker exec \$(docker ps -q --filter 'name=postgres') psql -U $DB_USER -d $DB_NAME -t -A -c \"SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int FROM pg_stat_replication LIMIT 1;\"" 2>/dev/null)

    echo "${lag:-0}"
}

# 检查主库复制连接
check_master_replication() {
    local result=$(ssh $MASTER_USER@$MASTER_HOST "docker exec \$(docker ps -q --filter 'name=postgres') psql -U $DB_USER -d $DB_NAME -t -A -c \"SELECT count(*) FROM pg_stat_replication WHERE state='streaming';\"" 2>/dev/null)

    if [ "${result:-0}" -eq "0" ]; then
        alert "CRITICAL" "主库没有活跃的复制连接"
        return 1
    fi
    return 0
}

# 格式化字节大小
format_bytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        echo "$(($bytes / 1024))KB"
    else
        echo "$(($bytes / 1048576))MB"
    fi
}

# 单次检查
check_once() {
    echo ""
    log "========== 复制状态检查 =========="

    # 1. 检查SSH隧道
    if check_ssh_tunnel; then
        info "✅ SSH隧道连接正常"
    else
        return 1
    fi

    # 2. 检查从库状态
    if check_slave_status; then
        info "✅ 从库运行正常(恢复模式)"
    else
        return 1
    fi

    # 3. 检查主库连接
    if check_master_replication; then
        info "✅ 主库复制连接活跃"
    else
        return 1
    fi

    # 4. 检查复制延迟(字节)
    local lag_bytes=$(get_replication_lag_bytes)
    local lag_bytes_formatted=$(format_bytes $lag_bytes)

    if [ $lag_bytes -gt $LAG_THRESHOLD_BYTES ]; then
        alert "WARNING" "复制延迟过高: $lag_bytes_formatted (阈值: $(format_bytes $LAG_THRESHOLD_BYTES))"
    else
        info "✅ 复制延迟: $lag_bytes_formatted"
    fi

    # 5. 检查复制延迟(时间)
    local lag_time=$(get_replication_lag_time)
    if [ "$lag_time" != "0" ] && [ $lag_time -gt $LAG_THRESHOLD_SECONDS ]; then
        alert "WARNING" "复制时间延迟: ${lag_time}秒 (阈值: ${LAG_THRESHOLD_SECONDS}秒)"
    elif [ "$lag_time" != "0" ]; then
        info "✅ 复制时间延迟: ${lag_time}秒"
    fi

    # 6. 显示详细状态
    info "📊 主库复制状态:"
    ssh $MASTER_USER@$MASTER_HOST "docker exec \$(docker ps -q --filter 'name=postgres') psql -U $DB_USER -d $DB_NAME -c \"SELECT client_addr, state, sync_state, replay_lsn, write_lag, flush_lag, replay_lag FROM pg_stat_replication;\"" 2>/dev/null | tee -a "$LOG_FILE"

    info "📊 从库接收状态:"
    docker exec $SLAVE_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT pg_last_wal_receive_lsn() as receive_lsn, pg_last_wal_replay_lsn() as replay_lsn, pg_last_xact_replay_timestamp() as last_replay;" 2>/dev/null | tee -a "$LOG_FILE"

    log "========== 检查完成 =========="
}

# 持续监控
monitor_continuous() {
    log "🔍 开始持续监控复制状态 (间隔: ${CHECK_INTERVAL}秒)"
    log "   告警阈值: 延迟 > $(format_bytes $LAG_THRESHOLD_BYTES) 或 > ${LAG_THRESHOLD_SECONDS}秒"

    while true; do
        check_once
        sleep $CHECK_INTERVAL
    done
}

# 查看告警日志
view_alerts() {
    if [ -f "$ALERT_FILE" ]; then
        echo "最近20条告警:"
        tail -20 "$ALERT_FILE"
    else
        echo "暂无告警记录"
    fi
}

# 主程序
case "${1:-check}" in
    check)
        check_once
        ;;
    monitor)
        monitor_continuous
        ;;
    alerts)
        view_alerts
        ;;
    *)
        echo "用法: $0 {check|monitor|alerts}"
        echo ""
        echo "命令说明:"
        echo "  check   - 执行一次检查"
        echo "  monitor - 持续监控(每${CHECK_INTERVAL}秒检查一次)"
        echo "  alerts  - 查看告警日志"
        exit 1
        ;;
esac

exit 0
