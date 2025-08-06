#!/bin/bash

# AI上下文任务管理平台 - 开发环境启动脚本
# 位置：new-ai-proj/scripts/env-management/start-dev.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEV_PROJECT_ROOT="$PROJECT_ROOT/../new-ai-proj-dev"

echo "🚀 启动AI上下文任务管理平台 - 开发环境"
echo "项目根目录: $PROJECT_ROOT"
echo "开发环境目录: $DEV_PROJECT_ROOT"

# 检查开发环境目录是否存在
if [ ! -d "$DEV_PROJECT_ROOT" ]; then
    echo "❌ 开发环境目录不存在: $DEV_PROJECT_ROOT"
    echo "请先运行 ./setup-dev-env.sh 创建开发环境"
    exit 1
fi

cd "$DEV_PROJECT_ROOT"

# 创建日志目录
mkdir -p logs

# 停止可能存在的旧进程
echo "清理旧进程..."
pkill -f "node.*3001" 2>/dev/null
pkill -f "go run.*8090" 2>/dev/null
sleep 2

# 启动后端
echo "[1/2] 启动后端服务..."
cd backend
PORT=8090 go run main.go > ../logs/backend-dev.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../.backend.pid
echo "✅ 后端PID: $BACKEND_PID (端口: 8090)"

# 等待后端启动
sleep 3

# 启动前端
echo "[2/2] 启动前端服务..."
cd ../frontend
PORT=3001 REACT_APP_API_BASE_URL=http://localhost:8090 npm start > ../logs/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.frontend.pid
echo "✅ 前端PID: $FRONTEND_PID (端口: 3001)"

echo ""
echo "========================================="
echo "✅ AI上下文任务管理平台 - 开发环境已启动"
echo "========================================="
echo "📍 访问地址："
echo "   前端: http://localhost:3001"
echo "   后端: http://localhost:8090/api/v1"
echo ""
echo "📝 日志位置："
echo "   后端: $DEV_PROJECT_ROOT/logs/backend-dev.log"
echo "   前端: $DEV_PROJECT_ROOT/logs/frontend-dev.log"
echo ""
echo "🛑 停止命令: $PROJECT_ROOT/scripts/env-management/stop-dev.sh"
echo "========================================="
