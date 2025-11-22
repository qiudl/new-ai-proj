#!/bin/bash
# monitor.sh - 简单监控脚本，可作为 cron 任务运行
# 用法:
#   手动运行: ./monitor.sh
#   Cron: */5 * * * * /opt/ai-project/scripts/monitor.sh >> /opt/ai-project/logs/monitor.log 2>&1

DEPLOY_DIR="/opt/ai-project"
HEALTH_URL="http://localhost:8080/health"
LOG_FILE="$DEPLOY_DIR/logs/monitor.log"
MAX_RESTART_ATTEMPTS=3
RESTART_COOLDOWN=300  # 5分钟内不重复重启

# 状态文件
STATE_FILE="/tmp/ai-backend-monitor-state"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 获取上次重启时间
get_last_restart_time() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "0"
    fi
}

# 记录重启时间
set_last_restart_time() {
    date +%s > "$STATE_FILE"
}

# 检查是否在冷却期内
is_in_cooldown() {
    local last_restart=$(get_last_restart_time)
    local current_time=$(date +%s)
    local diff=$((current_time - last_restart))

    if [ $diff -lt $RESTART_COOLDOWN ]; then
        return 0  # 在冷却期内
    fi
    return 1  # 不在冷却期内
}

# 检查后端健康状态
check_backend() {
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# 重启后端
restart_backend() {
    log "🔄 Attempting to restart backend..."

    if sudo supervisorctl restart ai-backend > /dev/null 2>&1; then
        log "✅ Backend restarted via supervisor"
    else
        log "⚠️ Supervisor restart failed, trying manual restart..."
        pkill -f ai-backend || true
        sleep 2
        cd "$DEPLOY_DIR/backend"
        nohup ./ai-backend >> "$DEPLOY_DIR/logs/backend.log" 2>&1 &
        log "✅ Backend started manually"
    fi

    set_last_restart_time
}

# 发送告警（可扩展为邮件、钉钉、企业微信等）
send_alert() {
    local message="$1"
    log "🚨 ALERT: $message"

    # 示例：发送到钉钉
    # curl -s -X POST "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN" \
    #     -H 'Content-Type: application/json' \
    #     -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"AI Project Alert: $message\"}}"

    # 示例：发送邮件
    # echo "$message" | mail -s "AI Project Alert" admin@example.com
}

# 主监控逻辑
main() {
    if check_backend; then
        # 后端正常，清理状态
        rm -f "$STATE_FILE" 2>/dev/null
        exit 0
    fi

    log "❌ Backend health check failed"

    # 检查是否在冷却期
    if is_in_cooldown; then
        log "⏳ In cooldown period, skipping restart"
        exit 0
    fi

    # 尝试重启
    restart_backend

    # 等待并再次检查
    sleep 10

    if check_backend; then
        log "✅ Backend recovered after restart"
    else
        log "❌ Backend still unhealthy after restart"
        send_alert "Backend failed to recover after restart"
    fi
}

main
