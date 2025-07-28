#!/bin/bash

# 定时器功能验证脚本
echo "🔍 定时器功能验证开始..."

# 1. 检查服务状态
echo "📋 1. 检查Docker服务状态"
docker-compose ps

# 2. 检查数据库定时器表
echo -e "\n📋 2. 检查定时器数据库表"
echo "检查task_time_logs表..."
docker-compose exec -T db psql -U user -d main_db -c "SELECT COUNT(*) as log_count FROM task_time_logs;"

echo "检查users表定时器字段..."
docker-compose exec -T db psql -U user -d main_db -c "SELECT id, username, timing_status, current_timing_task_id FROM users LIMIT 5;"

# 3. 检查定时器API端点
echo -e "\n📋 3. 测试定时器API端点"
echo "测试 /api/v1/timer/current..."
curl -s -H "Content-Type: application/json" http://localhost/api/v1/timer/current | head -3

# 4. 检查有多少任务可用于计时
echo -e "\n📋 4. 检查可用任务数量"
docker-compose exec -T db psql -U user -d main_db -c "SELECT COUNT(*) as available_tasks FROM tasks WHERE status IN ('todo', 'in_progress');"

# 5. 检查前端服务
echo -e "\n📋 5. 检查前端响应"
curl --noproxy "*" -I http://localhost/ 2>/dev/null | head -3

echo -e "\n✅ 验证完成!"
echo -e "\n🎯 下一步操作:"
echo "1. 访问 http://localhost/dashboard"
echo "2. 查看'我的任务'是否有数据"
echo "3. 尝试点击任务右侧的播放按钮开始计时"
echo "4. 检查'任务计时'卡片是否显示计时器"
echo "5. 查看是否出现浮动定时器窗口"