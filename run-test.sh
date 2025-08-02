#!/bin/bash

# Playwright E2E 测试运行脚本
# 用于测试 create_task 功能验证

echo "🎬 开始 Playwright E2E 测试 - Create Task 功能验证"
echo "=================================="

# 检查项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查系统是否正在运行
echo "🔍 检查系统状态..."
if ! curl -f http://localhost > /dev/null 2>&1; then
    echo "❌ 错误: 任务管理系统未运行在 http://localhost"
    echo "请先启动系统: docker-compose up -d"
    exit 1
fi

echo "✅ 系统状态正常"

# 创建测试结果目录
mkdir -p test-results
mkdir -p test-results/videos
mkdir -p test-results/screenshots

# 安装依赖
echo "📦 安装 Playwright 依赖..."
npm install

# 安装浏览器
echo "🌐 安装 Playwright 浏览器..."
npx playwright install chromium

# 运行测试
echo "🚀 开始执行测试..."
echo "测试配置:"
echo "  - 录制视频: 是"
echo "  - 显示浏览器: 是"
echo "  - 操作延迟: 1秒"
echo "  - 页面切换延迟: 2秒"
echo ""

# 运行 create_task 测试
npx playwright test tests/create-task.spec.js --headed --project=chromium

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ 测试完成!"
    echo ""
    echo "📁 测试结果位置:"
    echo "  - 视频文件: test-results/videos/"
    echo "  - 截图文件: test-results/screenshots/"
    echo "  - HTML报告: test-results/html-report/"
    echo ""
    echo "🎥 查看测试视频:"
    echo "  ls -la test-results/"
    echo ""
    echo "📊 查看HTML报告:"
    echo "  npx playwright show-report"
else
    echo "❌ 测试失败!"
    echo "📝 查看详细日志和截图定位问题"
fi

echo ""
echo "测试完成时间: $(date)"
