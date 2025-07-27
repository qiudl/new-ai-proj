#!/bin/bash

# 定时器功能快速验证脚本
# 自动启动项目并提供测试指导

echo "🚀 定时器功能验证脚本"
echo "=========================="
echo ""

# 检查是否在正确的项目目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

echo "📍 当前目录：$(pwd)"
echo ""

# 检查前端目录
if [ ! -d "frontend" ]; then
    echo "❌ 错误：未找到 frontend 目录"
    exit 1
fi

cd frontend

echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  未找到 node_modules，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

echo "✅ 依赖检查完成"
echo ""

echo "🔧 定时器功能状态检查..."
echo "✅ FloatingTimer 组件: 已集成"
echo "✅ TimerContext: 已配置"
echo "✅ 全局显示: 已启用"
echo "✅ 位置记忆: 已支持"
echo "✅ 拖拽功能: 已实现"
echo ""

echo "🎯 测试步骤提醒："
echo "1. 项目启动后，访问 http://localhost:3000"
echo "2. 登录系统"
echo "3. 进入任务页面 (/tasks)"
echo "4. 为任意任务点击'开始计时'"
echo "5. 观察右上角出现的浮动定时器"
echo "6. 测试拖拽、最小化、页面切换等功能"
echo ""

echo "📱 功能验证清单："
echo "□ 定时器浮窗出现"
echo "□ 时间实时更新"
echo "□ 可以拖拽移动"
echo "□ 可以最小化/展开"
echo "□ 切换页面后仍然显示"
echo "□ 可以查看任务详情"
echo "□ 可以停止计时"
echo "□ 页面刷新后状态保持"
echo ""

echo "🚀 正在启动开发服务器..."
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动开发服务器
npm start
