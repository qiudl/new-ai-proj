#!/bin/bash
#########################################
# 磁盘空间监控脚本
# 功能: 监控磁盘使用率,超过阈值时发送告警
# 作者: Claude Code
# 日期: 2025-11-15
#########################################

set -euo pipefail

# 配置
THRESHOLD=80  # 告警阈值(百分比)
DISK_PATH="/"  # 监控的磁盘路径
LOG_FILE="/opt/ai-project/logs/disk-monitor.log"
ALERT_FILE="/tmp/disk-alert-sent"  # 防止重复告警
ALERT_EMAIL="qiudl@zhiyuncai.com"  # 告警邮件接收地址
SERVER_NAME="proj.joylodging.com"  # 服务器名称

# 颜色输出
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 发送邮件告警
send_email_alert() {
    local usage=$1
    local available=$2
    local total=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # 构建邮件内容
    local email_subject="[告警] ${SERVER_NAME} 磁盘空间不足 (${usage}%)"
    local email_body=$(cat <<EOF
服务器磁盘空间告警

服务器: ${SERVER_NAME}
告警时间: ${timestamp}
告警级别: 警告

磁盘使用情况:
- 使用率: ${usage}%
- 可用空间: ${available}
- 总空间: ${total}
- 告警阈值: ${THRESHOLD}%

建议操作:
1. 登录服务器检查磁盘使用情况: df -h
2. 清理Docker无用镜像: docker system prune -af
3. 清理旧的releases目录
4. 检查日志文件大小

自动清理任务将在每周日凌晨2点执行。

---
此邮件由磁盘监控系统自动发送
监控脚本: /opt/ai-project/current/scripts/monitor-disk-space.sh
日志文件: /opt/ai-project/logs/disk-monitor.log
EOF
)

    # 使用自定义邮件发送脚本
    SEND_EMAIL_SCRIPT="/opt/ai-project/current/scripts/send-email.sh"

    if [ -f "$SEND_EMAIL_SCRIPT" ] && [ -x "$SEND_EMAIL_SCRIPT" ]; then
        # 加载SMTP配置
        if [ -f "/opt/ai-project/.env.smtp" ]; then
            source /opt/ai-project/.env.smtp
        fi

        # 发送邮件
        if "$SEND_EMAIL_SCRIPT" "$email_subject" "$email_body" "$ALERT_EMAIL" 2>&1 | tee -a "$LOG_FILE"; then
            log "✉️  邮件告警已发送到: $ALERT_EMAIL"
        else
            log "${YELLOW}⚠️  邮件发送失败,请检查SMTP配置${NC}"
        fi
    elif command -v mail &> /dev/null; then
        # 降级使用系统mail命令
        echo "$email_body" | mail -s "$email_subject" "$ALERT_EMAIL"
        log "✉️  邮件告警已发送到: $ALERT_EMAIL"
    elif command -v sendmail &> /dev/null; then
        # 使用sendmail作为备选
        {
            echo "To: $ALERT_EMAIL"
            echo "Subject: $email_subject"
            echo "Content-Type: text/plain; charset=UTF-8"
            echo ""
            echo "$email_body"
        } | sendmail -t
        log "✉️  邮件告警已发送到: $ALERT_EMAIL (via sendmail)"
    else
        log "${YELLOW}⚠️  警告: 未找到邮件发送工具,邮件告警未发送${NC}"
        log "${YELLOW}⚠️  请安装mailutils或配置SMTP设置${NC}"
    fi
}

# 发送告警通知
send_alert() {
    local usage=$1
    local available=$2
    local total=$3

    log "${RED}⚠️  磁盘空间告警: 使用率已达 ${usage}%${NC}"
    log "   可用空间: ${available}"
    log "   总空间: ${total}"

    # 记录告警已发送
    date '+%Y-%m-%d %H:%M:%S' > "$ALERT_FILE"

    # 发送邮件告警
    send_email_alert "$usage" "$available" "$total"

    # 记录到系统日志
    logger -t disk-monitor "ALERT: Disk usage at ${usage}% (threshold: ${THRESHOLD}%)"
}

# 清理告警状态(当使用率降低后)
clear_alert() {
    if [ -f "$ALERT_FILE" ]; then
        rm "$ALERT_FILE"
        log "${GREEN}✓ 磁盘使用率已恢复正常${NC}"
    fi
}

# 获取磁盘使用率
get_disk_usage() {
    df -h "$DISK_PATH" | awk 'NR==2 {print $5}' | sed 's/%//'
}

# 获取磁盘信息
get_disk_info() {
    df -h "$DISK_PATH" | awk 'NR==2 {print $4 " available of " $2 " total"}'
}

# 主监控逻辑
main() {
    # 获取当前使用率
    USAGE=$(get_disk_usage)
    DISK_INFO=$(get_disk_info)
    AVAILABLE=$(df -h "$DISK_PATH" | awk 'NR==2 {print $4}')
    TOTAL=$(df -h "$DISK_PATH" | awk 'NR==2 {print $2}')

    # 检查是否超过阈值
    if [ "$USAGE" -ge "$THRESHOLD" ]; then
        # 检查是否已经发送过告警(避免重复告警)
        if [ ! -f "$ALERT_FILE" ]; then
            send_alert "$USAGE" "$AVAILABLE" "$TOTAL"
        else
            # 每小时重复告警一次
            LAST_ALERT=$(date -r "$ALERT_FILE" +%s 2>/dev/null || echo 0)
            CURRENT_TIME=$(date +%s)
            TIME_DIFF=$((CURRENT_TIME - LAST_ALERT))

            if [ "$TIME_DIFF" -ge 3600 ]; then  # 3600秒 = 1小时
                send_alert "$USAGE" "$AVAILABLE" "$TOTAL"
            fi
        fi
    else
        # 使用率正常,清理告警状态
        clear_alert

        # 正常记录
        if [ "$((USAGE % 10))" -eq 0 ] || [ ! -f "$LOG_FILE" ]; then
            log "${GREEN}✓ 磁盘使用正常: ${USAGE}% (${DISK_INFO})${NC}"
        fi
    fi

    # 输出当前状态(用于cron job执行时的输出)
    echo "Disk usage: ${USAGE}% | ${DISK_INFO}"
}

# 执行主函数
main

# 退出状态:
# 0 - 正常
# 1 - 超过阈值
if [ "$(get_disk_usage)" -ge "$THRESHOLD" ]; then
    exit 1
else
    exit 0
fi
