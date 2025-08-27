#!/bin/bash

# 快速重启前后端服务脚本
# 使用 docker-compose.dev.yml 重启前后端服务

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
cd "$PROJECT_ROOT"

echo "🔄 重启前后端服务..."
echo "使用配置文件: docker-compose.dev.yml"
echo "========================"

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose -f docker-compose.dev.yml down

# 清理悬空镜像（可选）
echo "🧹 清理悬空镜像..."
docker image prune -f

# 重新构建和启动服务
echo "🚀 重新构建并启动服务..."
docker-compose -f docker-compose.dev.yml up --build -d

# 显示服务状态
echo "📊 服务状态检查..."
docker-compose -f docker-compose.dev.yml ps

# 显示日志（最近50行）
echo "📝 最近日志："
echo "========================"
docker-compose -f docker-compose.dev.yml logs --tail=50

echo ""
echo "✅ 前后端服务重启完成！"
echo "🌐 前端: http://localhost:3001"
echo "🔧 后端: http://localhost:8081"
echo "💾 数据库: localhost:5433"
echo "🔴 Redis: localhost:6379"
echo "🔧 MCP: localhost:3100"

echo ""
echo "💡 常用命令："
echo "查看日志: docker-compose -f docker-compose.dev.yml logs -f [service_name]"
echo "进入容器: docker-compose -f docker-compose.dev.yml exec [service_name] sh"
echo "重新构建: docker-compose -f docker-compose.dev.yml up --build -d"
