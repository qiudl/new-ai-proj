#!/bin/bash

echo "🚀 启动时间段任务统计API测试环境"
echo "===================================================="

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 安装依赖（如果需要）
echo "📦 检查并安装依赖..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/express/package.json" ]; then
    echo "安装 express 和 cors..."
    npm install express cors --no-save
fi

echo ""
echo "🎯 即将启动统计API服务器..."
echo "📊 服务器将运行在: http://localhost:8080"
echo "📈 统计API: http://localhost:8080/api/statistics/today-stats"
echo ""
echo "💡 这是一个模拟服务器，用于测试前端统计组件"
echo "🔄 每次请求都会生成新的随机数据"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "===================================================="
echo ""

# 启动服务器
node mock-statistics-server.js
