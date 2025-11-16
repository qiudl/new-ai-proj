#!/bin/bash
###############################################################################
# 邮件发送脚本
# 功能: 通过SMTP发送邮件告警
# 作者: Claude Code
# 日期: 2025-11-15
#
# 使用方法:
#   ./send-email.sh "邮件主题" "邮件正文" "收件人邮箱"
#
# 依赖: curl
###############################################################################

set -eo pipefail

# 加载SMTP配置文件(如果存在)
if [ -f "/opt/ai-project/.env.smtp" ]; then
    source /opt/ai-project/.env.smtp
fi

# SMTP配置 - 需要根据实际情况修改
SMTP_SERVER="${SMTP_SERVER:-smtp.exmail.qq.com}"  # 腾讯企业邮箱SMTP服务器
SMTP_PORT="${SMTP_PORT:-465}"  # SMTP端口 (465: SSL, 587: TLS)
SMTP_USER="${SMTP_USER:-ops@zhiyuncai.com}"  # 发件人邮箱
SMTP_PASSWORD="${SMTP_PASSWORD:-}"  # 邮箱密码或授权码(从环境变量读取)
FROM_NAME="${FROM_NAME:-AI项目监控系统}"

# 参数检查
if [ $# -lt 3 ]; then
    echo "用法: $0 <主题> <正文> <收件人>"
    echo "示例: $0 '告警' '磁盘空间不足' 'user@example.com'"
    exit 1
fi

SUBJECT="$1"
BODY="$2"
TO_EMAIL="$3"

# 检查curl是否可用
if ! command -v curl &> /dev/null; then
    echo "错误: 未找到curl命令,无法发送邮件"
    exit 1
fi

# 检查SMTP密码是否设置
if [ -z "${SMTP_PASSWORD:-}" ]; then
    echo "错误: 未设置SMTP_PASSWORD环境变量"
    echo "请在/opt/ai-project/.env.smtp中设置,或者导出环境变量"
    exit 1
fi

# 当前时间
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')

# 构建邮件内容
EMAIL_CONTENT=$(cat <<EOF
From: ${FROM_NAME} <${SMTP_USER}>
To: ${TO_EMAIL}
Subject: ${SUBJECT}
Date: ${TIMESTAMP}
Content-Type: text/plain; charset=UTF-8

${BODY}
EOF
)

# 发送邮件
echo "正在发送邮件..."
echo "  发件人: ${SMTP_USER}"
echo "  收件人: ${TO_EMAIL}"
echo "  主题: ${SUBJECT}"

# 使用curl发送邮件
if curl --url "smtps://${SMTP_SERVER}:${SMTP_PORT}" \
    --ssl-reqd \
    --mail-from "${SMTP_USER}" \
    --mail-rcpt "${TO_EMAIL}" \
    --user "${SMTP_USER}:${SMTP_PASSWORD}" \
    --upload-file - \
    --silent --show-error \
    <<< "${EMAIL_CONTENT}"; then
    echo "✅ 邮件发送成功"
    exit 0
else
    echo "❌ 邮件发送失败"
    exit 1
fi
