#!/bin/bash

# 设置token自动刷新的定时任务

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REFRESH_SCRIPT="$SCRIPT_DIR/auto-refresh-token.js"

# 检查脚本是否存在
if [ ! -f "$REFRESH_SCRIPT" ]; then
    echo "❌ Error: auto-refresh-token.js not found!"
    exit 1
fi

# 使脚本可执行
chmod +x "$REFRESH_SCRIPT"

# 创建cron任务（每天凌晨2点运行）
CRON_JOB="0 2 * * * /usr/bin/node $REFRESH_SCRIPT >> $HOME/.claude-code/token-refresh.log 2>&1"

# 检查cron任务是否已存在
if crontab -l 2>/dev/null | grep -q "auto-refresh-token.js"; then
    echo "⚠️  Token refresh cron job already exists"
else
    # 添加新的cron任务
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Token refresh cron job added successfully"
fi

# 创建日志文件
mkdir -p ~/.claude-code
touch ~/.claude-code/token-refresh.log

echo "📅 Cron job scheduled to run daily at 2:00 AM"
echo "📝 Logs will be saved to: ~/.claude-code/token-refresh.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the cron job: crontab -e (then delete the line)"
echo ""
echo "You can also run the refresh manually: node $REFRESH_SCRIPT"
