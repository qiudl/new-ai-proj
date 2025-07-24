#!/bin/bash

# 开发环境启动脚本
# Development Environment Startup Script

set -e

echo "🚀 启动前端开发环境..."
echo "🚀 Starting frontend development environment..."

# 检查是否在 Docker 环境中
if [ -f /.dockerenv ]; then
    echo "📦 检测到 Docker 环境"
    echo "📦 Docker environment detected"
    export CHOKIDAR_USEPOLLING=true
    export WATCHPACK_POLLING=true
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📋 安装依赖包..."
    echo "📋 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# 检查关键依赖
if [ ! -d "node_modules/react-scripts" ]; then
    echo "⚠️  react-scripts 未找到，重新安装..."
    echo "⚠️  react-scripts not found, reinstalling..."
    npm install react-scripts --legacy-peer-deps
fi

# 清理可能的缓存问题
echo "🧹 清理缓存..."
echo "🧹 Cleaning cache..."
npm run build > /dev/null 2>&1 || true

# 启动开发服务器
echo "🌟 启动开发服务器..."
echo "🌟 Starting development server..."

# 使用 npx 确保使用本地安装的 react-scripts
npx react-scripts start