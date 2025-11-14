#!/bin/bash

# MCP工具全面测试脚本
# 使用curl直接调用API，验证所有修复的工具

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3OTQ2MzEwOTQsIm5iZiI6MTc2MzA5NTA5NCwiaWF0IjoxNzYzMDk1MDk0LCJqdGkiOiI0NjQyY2FmMjgwZWUzZTdlOWIyYTBhYjhlOTI2NmIwYiJ9.dyFIWdWZEYoQ2_DKPlBc65-R9NYvJ1-U8J0jhGieWaM"
BASE_URL="http://localhost:8080/api/v1"

echo "=========================================="
echo "🧪 MCP工具全面测试"
echo "=========================================="
echo ""

# 1. 创建测试任务
echo "1️⃣  测试 create_task"
TASK_RESPONSE=$(curl -s -X POST "${BASE_URL}/tasks" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MCP工具测试任务",
    "description": "用于测试所有MCP工具功能",
    "project_id": 1
  }')

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data.id')
echo "   ✅ 创建任务成功: ID = $TASK_ID"
echo ""

# 2. 测试 start_task
echo "2️⃣  测试 start_task"
PROJECT_ID=$(curl -s "${BASE_URL}/tasks/${TASK_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.project_id')

START_RESPONSE=$(curl -s -X PUT "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}')

STATUS=$(echo $START_RESPONSE | jq -r '.data.status')
if [ "$STATUS" == "in_progress" ]; then
  echo "   ✅ 启动任务成功: status = $STATUS"
else
  echo "   ❌ 启动任务失败"
  echo $START_RESPONSE | jq .
fi
echo ""

# 3. 测试 start_timer
echo "3️⃣  测试 start_timer"
TIMER_START_RESPONSE=$(curl -s -X POST "${BASE_URL}/user/timer/start" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_id\": ${TASK_ID},
    \"title\": \"测试计时器\",
    \"context\": \"quick_start\"
  }")

TIMER_ID=$(echo $TIMER_START_RESPONSE | jq -r '.data.id')
if [ "$TIMER_ID" != "null" ] && [ -n "$TIMER_ID" ]; then
  echo "   ✅ 启动计时器成功: ID = $TIMER_ID"
else
  echo "   ❌ 启动计时器失败"
  echo $TIMER_START_RESPONSE | jq .
fi
echo ""

# 等待几秒让计时器运行
echo "   ⏳ 等待5秒..."
sleep 5
echo ""

# 4. 测试 stop_timer
echo "4️⃣  测试 stop_timer"
TIMER_STOP_RESPONSE=$(curl -s -X POST "${BASE_URL}/user/timer/stop" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')

WORK_DURATION=$(echo $TIMER_STOP_RESPONSE | jq -r '.data.actual_work_duration')
if [ "$WORK_DURATION" != "null" ] && [ -n "$WORK_DURATION" ]; then
  echo "   ✅ 停止计时器成功: 工作时长 = ${WORK_DURATION}秒"
else
  echo "   ❌ 停止计时器失败"
  echo $TIMER_STOP_RESPONSE | jq .
fi
echo ""

# 5. 测试 pause_task
echo "5️⃣  测试 pause_task"
PAUSE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"on_hold"}')

STATUS=$(echo $PAUSE_RESPONSE | jq -r '.data.status')
if [ "$STATUS" == "on_hold" ]; then
  echo "   ✅ 暂停任务成功: status = $STATUS"
else
  echo "   ❌ 暂停任务失败"
  echo $PAUSE_RESPONSE | jq .
fi
echo ""

# 6. 测试 complete_task
echo "6️⃣  测试 complete_task"
COMPLETE_RESPONSE=$(curl -s -X POST "${BASE_URL}/tasks/${TASK_ID}/complete" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')

STATUS=$(echo $COMPLETE_RESPONSE | jq -r '.data.status')
if [ "$STATUS" == "completed" ]; then
  echo "   ✅ 完成任务成功: status = $STATUS"
else
  echo "   ❌ 完成任务失败"
  echo $COMPLETE_RESPONSE | jq .
fi
echo ""

# 7. 测试 create_subtask
echo "7️⃣  测试 create_subtask"
SUBTASK_RESPONSE=$(curl -s -X POST "${BASE_URL}/mcp/create-subtask" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"parentId\": ${TASK_ID},
    \"title\": \"测试子任务\"
  }")

SUBTASK_ID=$(echo $SUBTASK_RESPONSE | jq -r '.data.id')
if [ "$SUBTASK_ID" != "null" ] && [ -n "$SUBTASK_ID" ]; then
  echo "   ✅ 创建子任务成功: ID = $SUBTASK_ID"
else
  echo "   ❌ 创建子任务失败"
  echo $SUBTASK_RESPONSE | jq .
fi
echo ""

# 8. 测试 create_requirement
echo "8️⃣  测试 create_requirement"
REQ_RESPONSE=$(curl -s -X POST "${BASE_URL}/mcp/requirements/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试需求",
    "description": "这是一个测试需求",
    "enterprise_id": 1
  }')

REQ_ID=$(echo $REQ_RESPONSE | jq -r '.data.id')
REQ_CODE=$(echo $REQ_RESPONSE | jq -r '.data.requirement_code')
if [ "$REQ_ID" != "null" ] && [ -n "$REQ_ID" ]; then
  echo "   ✅ 创建需求成功: ID = $REQ_ID, Code = $REQ_CODE"
else
  echo "   ❌ 创建需求失败"
  echo $REQ_RESPONSE | jq .
fi
echo ""

# 9. 测试 list_tasks
echo "9️⃣  测试 list_tasks"
LIST_RESPONSE=$(curl -s "${BASE_URL}/tasks?page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}")

TOTAL=$(echo $LIST_RESPONSE | jq -r '.data.total')
if [ "$TOTAL" != "null" ] && [ -n "$TOTAL" ]; then
  echo "   ✅ 列出任务成功: 总数 = $TOTAL"
else
  echo "   ❌ 列出任务失败"
  echo $LIST_RESPONSE | jq .
fi
echo ""

echo "=========================================="
echo "✅ 测试完成！"
echo "=========================================="
echo ""
echo "测试的任务ID: $TASK_ID"
echo "测试的子任务ID: $SUBTASK_ID"
echo "测试的需求ID: $REQ_ID ($REQ_CODE)"
echo ""
