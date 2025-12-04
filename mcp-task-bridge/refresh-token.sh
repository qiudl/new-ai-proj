#!/bin/bash
# MCP Token 自动刷新脚本
# 功能：自动登录获取新JWT Token，更新配置并重启MCP服务
# 建议：通过cron每12小时运行一次

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
LOG_FILE="${SCRIPT_DIR}/logs/token-refresh.log"
API_BASE="https://localhost"
USERNAME="admin"
PASSWORD="admin123"

# 确保日志目录存在
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# 检查必要文件
if [ ! -f "$ENV_FILE" ]; then
    log_error "ENV文件不存在: $ENV_FILE"
    exit 1
fi

log "========== 开始Token刷新 =========="

# 1. 登录获取新Token
log "正在登录获取新Token..."
LOGIN_RESPONSE=$(curl -sk -X POST "${API_BASE}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" \
    2>/dev/null)

# 检查登录是否成功
if ! echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    log_error "登录失败: $LOGIN_RESPONSE"
    exit 1
fi

# 提取access_token
NEW_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NEW_TOKEN" ]; then
    log_error "无法提取Token"
    exit 1
fi

log "成功获取新Token (前20字符): ${NEW_TOKEN:0:20}..."

# 2. 备份当前.env文件
BACKUP_FILE="${ENV_FILE}.backup.$(date '+%Y%m%d_%H%M%S')"
cp "$ENV_FILE" "$BACKUP_FILE"
log "已备份配置文件: $BACKUP_FILE"

# 3. 更新.env文件中的Token
if grep -q "^TASK_API_TOKEN=" "$ENV_FILE"; then
    # 更新现有Token
    sed -i "s|^TASK_API_TOKEN=.*|TASK_API_TOKEN=${NEW_TOKEN}|" "$ENV_FILE"
    log "已更新TASK_API_TOKEN"
else
    # 添加新Token
    echo "TASK_API_TOKEN=${NEW_TOKEN}" >> "$ENV_FILE"
    log "已添加TASK_API_TOKEN"
fi

# 4. 查找并重启MCP服务进程
log "正在重启MCP服务..."
MCP_PID=$(pgrep -f "index-sse.js" 2>/dev/null || true)

if [ -n "$MCP_PID" ]; then
    log "找到MCP进程: PID=$MCP_PID，正在停止..."
    kill "$MCP_PID" 2>/dev/null || true
    sleep 2

    # 确认进程已停止
    if pgrep -f "index-sse.js" > /dev/null 2>&1; then
        log "进程未停止，强制终止..."
        pkill -9 -f "index-sse.js" 2>/dev/null || true
        sleep 1
    fi
fi

# 启动新的MCP服务
cd "$SCRIPT_DIR"
nohup node dist/index-sse.js > /tmp/mcp-sse.log 2>&1 &
NEW_PID=$!
log "已启动新MCP服务: PID=$NEW_PID"

# 5. 等待服务启动并验证（最多等待30秒）
log "等待服务启动..."
for i in {1..10}; do
    sleep 3
    if curl -s http://localhost:3100/health | grep -q '"status":"ok"'; then
        log "MCP服务健康检查通过 (第${i}次尝试)"
        break
    fi
    if [ $i -eq 10 ]; then
        log_error "MCP服务健康检查失败（超时）"
        exit 1
    fi
    log "等待服务启动... (${i}/10)"
done

# 6. 清理旧备份文件（保留最近7个）
log "清理旧备份文件..."
ls -t "${ENV_FILE}.backup."* 2>/dev/null | tail -n +8 | xargs -r rm -f

# 7. 清理旧日志（保留最近1000行）
if [ -f "$LOG_FILE" ] && [ $(wc -l < "$LOG_FILE") -gt 1000 ]; then
    tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
    mv "${LOG_FILE}.tmp" "$LOG_FILE"
    log "已清理旧日志"
fi

log "========== Token刷新完成 =========="
log ""
