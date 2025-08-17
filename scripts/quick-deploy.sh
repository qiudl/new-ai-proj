#!/bin/bash

# 快速部署脚本 - 假设Docker环境已准备好
# 在服务器上的 /opt/ai-project 目录中运行

set -e

PROJECT_DIR="/opt/ai-project"
REPO_URL="https://github.com/qiudl/new-ai-proj.git"

echo "🚀 AI项目快速部署脚本"
echo "=========================="

# 确保在正确目录
cd $PROJECT_DIR

# 备份现有部署
if [ -d "current" ]; then
    echo "📦 备份当前版本..."
    mv current backup-$(date +%Y%m%d_%H%M%S) || true
fi

# 下载最新代码
echo "📥 下载最新代码..."
if wget -q --timeout=30 -O main.zip "https://github.com/qiudl/new-ai-proj/archive/refs/heads/main.zip"; then
    unzip -q main.zip
    mv *-main current
    rm main.zip
    echo "✅ 代码下载成功"
elif git clone --depth 1 $REPO_URL current; then
    echo "✅ Git克隆成功"
else
    echo "❌ 代码下载失败"
    exit 1
fi

cd current

# 检查必要文件
if [ ! -f "docker-compose.simple.yml" ]; then
    echo "❌ 找不到docker-compose.simple.yml"
    exit 1
fi

# 创建环境配置文件
if [ ! -f ".env" ]; then
    echo "⚙️ 创建环境配置..."
    cat > .env << EOF
DB_USER=ai_user
DB_PASSWORD=ai_password_2024
DB_NAME=ai_project_db
JWT_SECRET=dev_jwt_secret_2024
EOF
    echo "✅ 环境配置创建完成"
fi

# 确定Docker Compose命令
COMPOSE_CMD="docker-compose"
if ! command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
fi

echo "🐳 使用命令: $COMPOSE_CMD"

# 停止现有服务
echo "🛑 停止现有服务..."
$COMPOSE_CMD -f docker-compose.simple.yml down || true

# 清理旧资源
echo "🧹 清理旧资源..."
docker container prune -f || true
docker image prune -f || true

# 启动服务
echo "🚀 构建并启动服务..."
if $COMPOSE_CMD -f docker-compose.simple.yml up --build -d; then
    echo "✅ 服务启动成功"
else
    echo "❌ 服务启动失败"
    echo "查看错误日志："
    $COMPOSE_CMD -f docker-compose.simple.yml logs --tail=30
    exit 1
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 45

# 检查服务状态
echo "📊 检查服务状态..."
$COMPOSE_CMD -f docker-compose.simple.yml ps

# 健康检查
echo "🏥 执行健康检查..."
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo ""
    echo "🎉 部署成功！"
    echo "🌐 访问地址: http://$(curl -s ifconfig.me)"
    echo "📊 API地址: http://$(curl -s ifconfig.me)/api/v1"
    echo "🏥 健康检查: http://$(curl -s ifconfig.me)/health"
else
    echo ""
    echo "⚠️ 健康检查失败，但服务可能正在启动中"
    echo "🌐 请稍后访问: http://$(curl -s ifconfig.me)"
    echo ""
    echo "如果问题持续，查看日志："
    echo "$COMPOSE_CMD -f docker-compose.simple.yml logs"
fi

echo ""
echo "📋 管理命令："
echo "  查看状态: $COMPOSE_CMD -f docker-compose.simple.yml ps"
echo "  查看日志: $COMPOSE_CMD -f docker-compose.simple.yml logs -f"
echo "  重启服务: $COMPOSE_CMD -f docker-compose.simple.yml restart"
echo "  停止服务: $COMPOSE_CMD -f docker-compose.simple.yml down"