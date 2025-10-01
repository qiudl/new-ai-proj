#!/bin/bash

# Daily Focus Tasks Carry-over功能测试脚本
# 此脚本演示如何使用carry-over API

echo "🔄 Daily Focus Tasks Carry-over功能测试"
echo "======================================="

# 配置参数
BASE_URL="http://localhost:8080/api/v1"
FROM_DATE="2025-09-13"
TO_DATE="2025-09-14"

# 获取认证token
echo "1️⃣ 获取认证token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/dev/quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ 获取token失败"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Token获取成功"

# 查看源日期的daily focus tasks
echo ""
echo "2️⃣ 查看源日期($FROM_DATE)的今日主要任务..."
SOURCE_TASKS=$(curl -s -X GET "$BASE_URL/daily-focus-tasks?date=$FROM_DATE" \
  -H "Authorization: Bearer $TOKEN")

echo "源日期任务数量: $(echo $SOURCE_TASKS | jq -r '.data.total_count')"
echo "活跃任务数量: $(echo $SOURCE_TASKS | jq -r '.data.active_count')"

# 查看目标日期的daily focus tasks（延续前）
echo ""
echo "3️⃣ 查看目标日期($TO_DATE)的今日主要任务（延续前）..."
TARGET_TASKS_BEFORE=$(curl -s -X GET "$BASE_URL/daily-focus-tasks?date=$TO_DATE" \
  -H "Authorization: Bearer $TOKEN")

echo "目标日期任务数量（延续前）: $(echo $TARGET_TASKS_BEFORE | jq -r '.data.total_count')"

# 执行carry-over操作
echo ""
echo "4️⃣ 执行carry-over操作..."
CARRY_OVER_RESPONSE=$(curl -s -X POST "$BASE_URL/daily-focus-tasks/carry-over" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"from_date\": \"$FROM_DATE\",
    \"to_date\": \"$TO_DATE\"
  }")

echo "Carry-over响应:"
echo $CARRY_OVER_RESPONSE | jq .

# 检查carry-over结果
PROCESSED_COUNT=$(echo $CARRY_OVER_RESPONSE | jq -r '.data.processed_count // 0')
FAILED_COUNT=$(echo $CARRY_OVER_RESPONSE | jq -r '.data.failed_count // 0')

echo ""
echo "📊 Carry-over结果:"
echo "   ✅ 成功延续: $PROCESSED_COUNT 个任务"
echo "   ❌ 延续失败: $FAILED_COUNT 个任务"

# 查看目标日期的daily focus tasks（延续后）
echo ""
echo "5️⃣ 查看目标日期($TO_DATE)的今日主要任务（延续后）..."
TARGET_TASKS_AFTER=$(curl -s -X GET "$BASE_URL/daily-focus-tasks?date=$TO_DATE" \
  -H "Authorization: Bearer $TOKEN")

echo "目标日期任务数量（延续后）: $(echo $TARGET_TASKS_AFTER | jq -r '.data.total_count')"
echo "活跃任务数量: $(echo $TARGET_TASKS_AFTER | jq -r '.data.active_count')"

# 显示延续的任务详情
echo ""
echo "📋 延续的任务详情:"
echo $TARGET_TASKS_AFTER | jq '.data.tasks[]? | {
  task_title: .task_title,
  priority_level: .priority_level,
  carried_from_date: .carried_from_date,
  status: .status
}'

echo ""
echo "🎉 Carry-over功能测试完成！"