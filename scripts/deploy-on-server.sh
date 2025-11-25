#!/bin/bash
set -e

# 在生产服务器上直接构建和部署的脚本
# 解决从GHCR拉取镜像太慢的问题

echo "=========================================="
echo "🚀 开始生产部署(服务器本地构建)"
echo "=========================================="

# 设置变量
DEPLOY_DIR="/opt/ai-project-cicd"
GIT_REPO="https://github.com/qiudl/new-ai-proj.git"
BRANCH="main"

# 进入部署目录
cd "$DEPLOY_DIR" || exit 1

# 拉取最新代码
echo "📥 拉取最新代码..."
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/$BRANCH
else
    git clone -b $BRANCH $GIT_REPO .
fi

# 加载环境变量
if [ -f ".env.prod" ]; then
    source .env.prod
fi

# 构建后端镜像
echo "🔨 构建后端Docker镜像..."
docker build \
    -t ai-backend:local \
    -f backend/Dockerfile \
    --target production \
    backend/

# 停止并删除旧容器
echo "🔄 停止旧后端容器..."
docker stop ai_backend_prod || true
docker rm ai_backend_prod || true

# 启动新后端容器
echo "🚀 启动新后端容器..."
docker run -d \
    --name ai_backend_prod \
    --network ai_prod_network \
    -p 127.0.0.1:8080:8080 \
    -e ENV=production \
    -e DB_HOST=ai_postgres_prod \
    -e DB_PORT=5432 \
    -e DB_USER=${DB_USER} \
    -e DB_PASSWORD=${DB_PASSWORD} \
    -e DB_NAME=${DB_NAME} \
    -e JWT_SECRET=${JWT_SECRET} \
    -e GIN_MODE=release \
    -e LOG_LEVEL=info \
    -v "$DEPLOY_DIR/logs:/app/logs" \
    --restart=always \
    ai-backend:local

# 等待容器启动
echo "⏳ 等待后端服务启动..."
sleep 10

# 健康检查
echo "🔍 执行健康检查..."
if curl -f http://localhost:8080/health; then
    echo "✅ 后端健康检查通过!"
else
    echo "❌ 后端健康检查失败!"
    docker logs ai_backend_prod --tail 50
    exit 1
fi

# 显示容器状态
echo ""
echo "=========================================="
echo "📊 容器状态"
echo "=========================================="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ""
echo "=========================================="
echo "✅ 部署完成!"
echo "=========================================="
