#!/bin/bash
# notify.sh - 部署通知脚本
# 用法: ./notify.sh "消息内容" [success|error|warning]
#
# 环境变量配置:
#   DINGTALK_WEBHOOK - 钉钉机器人 Webhook URL
#   WECHAT_WEBHOOK - 企业微信机器人 Webhook URL
#   SLACK_WEBHOOK - Slack Webhook URL

MESSAGE="${1:-部署通知}"
STATUS="${2:-info}"

# 颜色映射
case "$STATUS" in
    success) COLOR="green"; EMOJI="✅" ;;
    error)   COLOR="red"; EMOJI="❌" ;;
    warning) COLOR="yellow"; EMOJI="⚠️" ;;
    *)       COLOR="blue"; EMOJI="ℹ️" ;;
esac

# 服务器信息
HOSTNAME=$(hostname)
IP=$(hostname -I | awk '{print $1}')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 发送钉钉通知
send_dingtalk() {
    if [ -z "$DINGTALK_WEBHOOK" ]; then
        return
    fi

    curl -s -X POST "$DINGTALK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{
            \"msgtype\": \"markdown\",
            \"markdown\": {
                \"title\": \"AI Project 部署通知\",
                \"text\": \"## $EMOJI AI Project 部署通知\n\n**状态**: $STATUS\n\n**消息**: $MESSAGE\n\n**服务器**: $HOSTNAME ($IP)\n\n**时间**: $TIMESTAMP\"
            }
        }" > /dev/null

    echo "钉钉通知已发送"
}

# 发送企业微信通知
send_wechat() {
    if [ -z "$WECHAT_WEBHOOK" ]; then
        return
    fi

    curl -s -X POST "$WECHAT_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{
            \"msgtype\": \"markdown\",
            \"markdown\": {
                \"content\": \"## $EMOJI AI Project 部署通知\n> **状态**: $STATUS\n> **消息**: $MESSAGE\n> **服务器**: $HOSTNAME ($IP)\n> **时间**: $TIMESTAMP\"
            }
        }" > /dev/null

    echo "企业微信通知已发送"
}

# 发送 Slack 通知
send_slack() {
    if [ -z "$SLACK_WEBHOOK" ]; then
        return
    fi

    curl -s -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"$EMOJI *AI Project 部署通知*\",
            \"attachments\": [{
                \"color\": \"$COLOR\",
                \"fields\": [
                    {\"title\": \"状态\", \"value\": \"$STATUS\", \"short\": true},
                    {\"title\": \"服务器\", \"value\": \"$HOSTNAME ($IP)\", \"short\": true},
                    {\"title\": \"消息\", \"value\": \"$MESSAGE\", \"short\": false},
                    {\"title\": \"时间\", \"value\": \"$TIMESTAMP\", \"short\": true}
                ]
            }]
        }" > /dev/null

    echo "Slack 通知已发送"
}

# 发送所有配置的通知
echo "发送部署通知..."
echo "  状态: $STATUS"
echo "  消息: $MESSAGE"
echo ""

send_dingtalk
send_wechat
send_slack

# 如果没有配置任何通知渠道
if [ -z "$DINGTALK_WEBHOOK" ] && [ -z "$WECHAT_WEBHOOK" ] && [ -z "$SLACK_WEBHOOK" ]; then
    echo "提示: 未配置任何通知渠道"
    echo ""
    echo "配置方法 (添加到 .env.prod 或环境变量):"
    echo "  export DINGTALK_WEBHOOK='https://oapi.dingtalk.com/robot/send?access_token=xxx'"
    echo "  export WECHAT_WEBHOOK='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'"
    echo "  export SLACK_WEBHOOK='https://hooks.slack.com/services/xxx'"
fi
