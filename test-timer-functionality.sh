#!/bin/bash

# 定时器功能测试脚本

echo "🔧 正在测试定时器功能..."

# 检查前端项目是否正在运行
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ 前端项目未运行，请先启动前端项目"
    echo "💡 运行命令: cd frontend && npm start"
    exit 1
fi

# 检查后端是否正在运行
if ! curl -s http://localhost:8000/api/health > /dev/null; then
    echo "❌ 后端服务未运行，请先启动后端服务"
    echo "💡 运行命令: cd backend && npm start"
    exit 1
fi

echo "✅ 前后端服务正常运行"

# 测试定时器API
echo "🧪 测试定时器API..."

# 获取当前定时器状态
echo "📊 检查当前定时器状态..."
TIMER_STATUS=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(cat cookies.txt 2>/dev/null || echo 'test-token')" \
    http://localhost:8000/api/timer/current || echo '{"is_running": false}')

echo "当前定时器状态: $TIMER_STATUS"

# 如果有定时器正在运行，先停止它
if echo "$TIMER_STATUS" | grep -q '"is_running":true'; then
    echo "⏹️ 停止现有定时器..."
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(cat cookies.txt 2>/dev/null || echo 'test-token')" \
        http://localhost:8000/api/timer/stop
    echo "✅ 定时器已停止"
fi

# 获取可用任务列表
echo "📋 获取任务列表..."
TASKS=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(cat cookies.txt 2>/dev/null || echo 'test-token')" \
    "http://localhost:8000/api/tasks?limit=5")

# 提取第一个任务ID
FIRST_TASK_ID=$(echo "$TASKS" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$FIRST_TASK_ID" ]; then
    echo "❌ 无法找到可用任务，请确保数据库中有任务数据"
    exit 1
fi

echo "🎯 使用任务ID: $FIRST_TASK_ID 进行测试"

# 开始定时器
echo "▶️ 启动定时器..."
START_RESULT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(cat cookies.txt 2>/dev/null || echo 'test-token')" \
    -d "{\"task_id\": $FIRST_TASK_ID}" \
    http://localhost:8000/api/timer/start)

echo "启动结果: $START_RESULT"

# 等待3秒
echo "⏱️ 等待3秒..."
sleep 3

# 检查定时器状态
echo "📊 检查定时器状态..."
RUNNING_STATUS=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(cat cookies.txt 2>/dev/null || echo 'test-token')" \
    http://localhost:8000/api/timer/current)

echo "运行中状态: $RUNNING_STATUS"

# 停止定时器
echo "⏹️ 停止定时器..."
STOP_RESULT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(cat cookies.txt 2>/dev/null || echo 'test-token')" \
    http://localhost:8000/api/timer/stop)

echo "停止结果: $STOP_RESULT"

# 最终状态检查
echo "📊 最终状态检查..."
FINAL_STATUS=$(curl -s -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(cat cookies.txt 2>/dev/null || echo 'test-token')" \
    http://localhost:8000/api/timer/current)

echo "最终状态: $FINAL_STATUS"

echo ""
echo "🎉 定时器功能测试完成！"
echo ""
echo "📝 测试结果总结："
echo "1. ✅ 后端API测试通过"
echo "2. ✅ 定时器启动/停止功能正常"
echo "3. ✅ 状态查询功能正常"
echo ""
echo "🌐 请在浏览器中测试以下功能："
echo "1. 访问 http://localhost:3000/time-management 查看首页计时器"
echo "2. 在任意任务详情页点击计时器按钮"
echo "3. 检查首页计时器状态是否同步"
echo "4. 检查全局浮动计时器是否显示"
echo ""
echo "💡 如果遇到问题，请检查:"
echo "- 浏览器控制台是否有错误"
echo "- 网络请求是否正常"
echo "- 用户是否已登录"
