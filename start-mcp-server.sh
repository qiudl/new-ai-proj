#!/bin/bash
# AI-Proj MCP 服务器启动脚本

echo "🚀 启动 AI-Proj MCP 服务器..."

# 设置环境变量
export NO_PROXY="localhost,127.0.0.1"
export NODE_ENV="production"

# 切换到MCP服务器目录
cd "/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务器
echo "✅ MCP服务器启动中..."
node index.js