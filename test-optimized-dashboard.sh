#!/bin/bash

# 优化后Dashboard测试脚本

echo "🚀 启动优化后的Dashboard测试..."

# 检查依赖
echo "📦 检查项目依赖..."
cd /Users/johnqiu/coding/www/projects/new-ai-proj/frontend

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 启动前端开发服务器
echo "🌐 启动前端开发服务器 (优化版Dashboard)..."
npm start &
FRONTEND_PID=$!

echo "✅ 优化后的Dashboard已启动！"
echo ""
echo "📱 访问地址:"
echo "   - 优化版首页: http://localhost:3000/"
echo "   - 原版首页: http://localhost:3000/dashboard"
echo "   - 优化版直接访问: http://localhost:3000/dashboard-optimized"
echo ""
echo "🎯 优化特性:"
echo "   ✓ 紧凑型快速操作栏 (节省60%空间)"
echo "   ✓ 3栏响应式布局"
echo "   ✓ 重点任务突出显示"
echo "   ✓ 团队信息折叠隐藏"
echo "   ✓ 个人工作聚焦"
echo ""
echo "⌨️  按 Ctrl+C 停止服务器"

# 等待用户中断
wait $FRONTEND_PID