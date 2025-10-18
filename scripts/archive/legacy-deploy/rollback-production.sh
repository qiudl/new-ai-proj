#!/bin/bash
set -e

SERVER="ubuntu@152.136.104.251"
PROJECT_DIR="/opt/ai-project"

echo "⏮️  生产环境回滚"
echo "================"

# 显示最近的版本
echo "📊 最近的提交："
ssh $SERVER "cd $PROJECT_DIR && git log --oneline -5"

echo ""
read -p "确认回滚到上一个版本？(yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo "❌ 回滚已取消"
    exit 0
fi

echo ""
echo "⏮️  执行回滚..."

ssh $SERVER << 'REMOTE'
cd /opt/ai-project

# 回滚到上一个版本
git checkout main
git reset --hard HEAD~1

# 重新部署
bash update-from-main.sh
REMOTE

echo ""
echo "✅ 回滚完成"
