#!/bin/bash

# MCP功能测试自动化脚本
# 用于启动和执行Playwright测试，生成视频记录

echo "🚀 MCP功能测试自动化开始"
echo "=================================="

# 检查项目目录
PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
TEST_DIR="$PROJECT_DIR/mcp-test-automation"

if [ ! -d "$TEST_DIR" ]; then
    echo "❌ 测试目录不存在: $TEST_DIR"
    exit 1
fi

cd "$TEST_DIR"

echo "📂 当前目录: $(pwd)"

# 检查前端服务是否运行
echo "🔍 检查前端服务状态..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️ 前端服务未启动，请先启动前端服务:"
    echo "   cd $PROJECT_DIR/frontend && npm start"
    echo ""
    echo "📋 如果前端已启动但端口不是3000，请修改 playwright.config.ts 中的 baseURL"
    exit 1
fi

# 检查后端API是否运行
echo "🔍 检查后端API状态..."
if ! curl -s http://localhost:8080/api/tasks > /dev/null; then
    echo "⚠️ 后端API未启动，请先启动后端服务:"
    echo "   cd $PROJECT_DIR && docker-compose up -d"
    exit 1
fi

echo "✅ 前后端服务运行正常"

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

# 安装Playwright浏览器
echo "🌐 安装Playwright浏览器..."
npx playwright install chromium

# 创建测试结果目录
mkdir -p test-results

# 执行测试
echo ""
echo "🧪 开始执行MCP功能测试..."
echo "⏰ 预计耗时: 5-8分钟"
echo "📹 视频录制: 启用"
echo "📸 截图保存: 启用"
echo ""

# 运行测试并记录输出
npx playwright test --project=chromium --headed --video=on 2>&1 | tee test-execution.log

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 测试执行完成！"
    echo "=================================="
    echo "📁 测试结果位置:"
    echo "   - 截图: $TEST_DIR/test-results/"
    echo "   - 视频: $TEST_DIR/test-results/"
    echo "   - 报告: $TEST_DIR/playwright-report/"
    echo ""
    echo "📊 生成HTML报告..."
    npx playwright show-report --host=127.0.0.1 --port=9323 &
    echo "🌐 报告地址: http://127.0.0.1:9323"
    echo ""
    echo "💡 提示: 按 Ctrl+C 退出报告查看"
else
    echo ""
    echo "❌ 测试执行失败！"
    echo "📋 请检查测试日志: $TEST_DIR/test-execution.log"
fi

echo ""
echo "🏁 MCP测试自动化完成"
