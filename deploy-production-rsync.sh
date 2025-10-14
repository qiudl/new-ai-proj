#!/bin/bash
set -e

SERVER="ubuntu@152.136.104.251"
PROJECT_DIR="/opt/ai-project"

echo "🚀 生产环境部署（rsync方式）"
echo "================================"

# 确保在main分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "⚠️  当前不在main分支"
    read -p "是否切换到main？(y/n): " switch_choice
    if [[ "$switch_choice" == "y" ]]; then
        git checkout main
        git pull origin main
    else
        exit 1
    fi
fi

echo ""
echo "📦 当前main版本："
git log -1 --oneline

echo ""
read -p "确认部署此版本到生产环境？(yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo "❌ 部署已取消"
    exit 0
fi

echo ""
echo "📤 同步代码到服务器..."
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.github' \
    --exclude='frontend/node_modules' \
    --exclude='frontend/build' \
    --exclude='backend/tmp' \
    --exclude='*.log' \
    --exclude='backup-*' \
    --exclude='logs/' \
    --exclude='android-app' \
    --exclude='.gradle' \
    --exclude='.vscode' \
    --exclude='deploy-*.sh' \
    --exclude='release-*.sh' \
    --exclude='rollback-*.sh' \
    --exclude='start-*.sh' \
    --exclude='test_*.sh' \
    --exclude='create_*.sh' \
    --exclude='*.txt' \
    ./ $SERVER:$PROJECT_DIR/

echo ""
echo "🔄 在服务器上重启服务..."
ssh $SERVER << 'REMOTE'
cd /opt/ai-project

echo "⏸️  停止旧服务..."
sudo docker-compose -f docker-compose.prod.yml down

echo "🔨 重新构建镜像..."
sudo docker-compose -f docker-compose.prod.yml build --no-cache

echo "▶️  启动新服务..."
sudo docker-compose -f docker-compose.prod.yml up -d

echo "⏳ 等待服务启动..."
sleep 20

echo "🏥 健康检查..."
if curl -f http://localhost:8080/health 2>/dev/null; then
    echo "✅ 后端服务健康"
else
    echo "❌ 后端服务异常"
fi

if curl -f http://localhost:3000 2>/dev/null; then
    echo "✅ 前端服务健康"
else
    echo "❌ 前端服务异常"
fi

echo ""
echo "📊 服务状态："
sudo docker-compose -f docker-compose.prod.yml ps
REMOTE

echo ""
echo "✅ 部署完成！"
echo "🌐 访问: https://proj.joylodging.com"
