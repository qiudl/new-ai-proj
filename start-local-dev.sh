#!/bin/bash

# AI项目管理系统 - 本地开发环境启动脚本
# 使用本地 Node.js v22.15.0 和 Go 1.24.4

set -e

echo "🚀 AI项目管理系统 - 本地开发环境启动"
echo "========================================"

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 Go 版本  
GO_VERSION=$(go version | cut -d' ' -f3)
echo "✅ Go 版本: $GO_VERSION"

# 检查 PostgreSQL 状态
if brew services list | grep -q "postgresql@16.*started"; then
    echo "✅ PostgreSQL 16 正在运行"
else
    echo "❌ PostgreSQL 16 未运行，请先启动: brew services start postgresql@16"
    exit 1
fi

# 检查端口占用
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ 后端服务正在运行 (端口 8080)"
else
    echo "🔄 启动后端服务..."
    cd backend
    DB_PORT=5432 DB_HOST=localhost nohup go run main.go > backend.log 2>&1 &
    echo $! > ../backend.pid
    cd ..
    sleep 5
    echo "✅ 后端服务已启动"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ 前端服务正在运行 (端口 3000)"
else
    echo "🔄 启动前端服务..."
    cd frontend
    REACT_APP_API_URL=http://localhost:8080/api/v1 REACT_APP_API_BASE_URL=http://localhost:8080/api/v1 PORT=3000 nohup npm start > frontend.log 2>&1 &
    echo $! > ../frontend.pid
    cd ..
    sleep 10
    echo "✅ 前端服务已启动"
fi

echo ""
echo "🎉 开发环境启动完成！"
echo "========================================"
echo "📱 前端应用: http://localhost:3000"
echo "🔧 后端 API: http://localhost:8080/api/v1"
echo "❤️  健康检查: http://localhost:8080/health"
echo "📚 API 文档: http://localhost:8080/docs"
echo ""
echo "💡 使用 ./stop-local-dev.sh 停止服务"
echo "💡 使用 ./status-local-dev.sh 查看服务状态"