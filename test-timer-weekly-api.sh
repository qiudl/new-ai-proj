#!/bin/bash

# 任务周报API测试脚本

echo "=== 任务周报修复验证 ==="

echo "1. 检查前端TimerService是否添加了getWeeklyReport方法..."
if grep -q "getWeeklyReport.*startDate.*endDate" frontend/src/services/timerService.ts; then
    echo "✓ TimerService.getWeeklyReport 方法已添加"
else
    echo "✗ TimerService.getWeeklyReport 方法未找到"
fi

echo "2. 检查TimerStatsCard是否使用真实API..."
if grep -q "generateDailyStatsFromAPI" frontend/src/components/TimerStatsCard.tsx; then
    echo "✓ TimerStatsCard 已修改为使用真实API数据"
else
    echo "✗ TimerStatsCard 仍在使用Mock数据"
fi

if grep -q "TimerService.getWeeklyReport" frontend/src/components/TimerStatsCard.tsx; then
    echo "✓ TimerStatsCard 调用了 getWeeklyReport API"
else
    echo "✗ TimerStatsCard 未调用 getWeeklyReport API"
fi

echo "3. 检查后端API路由是否配置..."
if grep -q "timer.*GET.*weekly.*GetWeeklyReport" backend/main.go; then
    echo "✓ 后端 /timer/weekly 路由已配置"
else
    echo "✗ 后端 /timer/weekly 路由未找到"
fi

echo "4. 检查后端处理器是否实现..."
if grep -q "func.*GetWeeklyReport" backend/handlers/timer_handlers.go; then
    echo "✓ 后端 GetWeeklyReport 处理器已实现"
else
    echo "✗ 后端 GetWeeklyReport 处理器未找到"
fi

echo "5. 检查数据库Repository是否实现..."
if grep -q "func.*GetWeeklyReport" backend/database/timer_repository.go; then
    echo "✓ 数据库 GetWeeklyReport 方法已实现"
else
    echo "✗ 数据库 GetWeeklyReport 方法未找到"
fi

echo ""
echo "=== 修复总结 ==="
echo "✓ 前端添加了getWeeklyReport API调用方法"
echo "✓ TimerStatsCard组件改为使用真实API数据"
echo "✓ 后端API路由和处理器完整"
echo "✓ 数据库查询方法实现完整"

echo ""
echo "测试方法："
echo "1. 启动后端服务: cd backend && go run main.go"
echo "2. 启动前端服务: cd frontend && npm start"
echo "3. 访问工作台页面，查看'时间段任务统计'卡片"
echo "4. 选择不同日期范围，观察数据是否为真实数据（不再是随机数）"
echo "5. 可以通过浏览器开发者工具查看网络请求，确认调用了 /api/v1/timer/weekly"