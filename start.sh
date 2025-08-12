#!/bin/bash

# AI Context 项目启动脚本
# 确保所有容器都在正确的组内运行

echo "🚀 启动 AI Context 项目..."

# 切换到项目目录
cd "$(dirname "$0")"

# 停止可能存在的旧容器
echo "🔄 清理旧容器..."
docker-compose down

# 启动所有服务
echo "✨ 启动所有服务..."
docker-compose up -d

# 等待服务就绪
echo "⏳ 等待服务就绪..."
sleep 5

# 显示状态
echo "📊 服务状态："
docker-compose ps

echo ""
echo "✅ 项目已启动！"
echo "🌐 前端访问: http://localhost:3001"
echo "🌐 通过 Nginx: http://localhost"
echo "🔧 后端 API: http://localhost:8081/api/v1"
echo ""
echo "💡 提示：使用 'docker-compose logs -f' 查看日志"
