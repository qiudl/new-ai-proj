#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTk5ODk1ODIsIm5iZiI6MTc1OTM4NDc4MiwiaWF0IjoxNzU5Mzg0NzgyLCJqdGkiOiI1NzE5ZWQ1MGU0YmEzYTEyNWYyZjdiMmY4MzU0NGQ0ZCJ9.HV1y8vttyNVfu_KX2xp8v9dxN6nPzNP_TPPbh-hkmnU"

echo "Creating subtask 1..."
TASK1_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"实现MCP文档更新接口（updateTaskDocument）","project_id":1,"parent_id":2498,"priority":"high","estimated_minutes":120,"description":"实现updateTaskDocument接口，支持智能更新（存在则更新，不存在则创建），并自动创建版本记录"}')
TASK1_ID=$(echo "$TASK1_RESPONSE" | jq -r '.data.id')
echo "Task 1 ID: $TASK1_ID"

echo "Creating subtask 2..."
TASK2_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"实现MCP版本历史查询接口（getTaskDocumentVersions）","project_id":1,"parent_id":2498,"priority":"high","estimated_minutes":90,"description":"实现getTaskDocumentVersions接口，支持查询任务文档的完整版本历史"}')
TASK2_ID=$(echo "$TASK2_RESPONSE" | jq -r '.data.id')
echo "Task 2 ID: $TASK2_ID"

echo "Creating subtask 3..."
TASK3_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"实现MCP版本比较接口（compareTaskDocumentVersions）","project_id":1,"parent_id":2498,"priority":"medium","estimated_minutes":120,"description":"实现版本比较接口，支持对比两个版本的差异"}')
TASK3_ID=$(echo "$TASK3_RESPONSE" | jq -r '.data.id')
echo "Task 3 ID: $TASK3_ID"

echo "Creating subtask 4..."
TASK4_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"实现MCP版本恢复接口（restoreTaskDocumentVersion）","project_id":1,"parent_id":2498,"priority":"medium","estimated_minutes":90,"description":"实现版本恢复功能，允许将文档回滚到指定版本"}')
TASK4_ID=$(echo "$TASK4_RESPONSE" | jq -r '.data.id')
echo "Task 4 ID: $TASK4_ID"

echo "Creating subtask 5..."
TASK5_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"实现MCP版本删除接口（deleteTaskDocumentVersion）","project_id":1,"parent_id":2498,"priority":"low","estimated_minutes":60,"description":"实现版本删除功能，允许删除非当前版本的历史版本"}')
TASK5_ID=$(echo "$TASK5_RESPONSE" | jq -r '.data.id')
echo "Task 5 ID: $TASK5_ID"

echo ""
echo "===== Summary ====="
echo "Task 1: $TASK1_ID - 实现MCP文档更新接口（updateTaskDocument）"
echo "Task 2: $TASK2_ID - 实现MCP版本历史查询接口（getTaskDocumentVersions）"
echo "Task 3: $TASK3_ID - 实现MCP版本比较接口（compareTaskDocumentVersions）"
echo "Task 4: $TASK4_ID - 实现MCP版本恢复接口（restoreTaskDocumentVersion）"
echo "Task 5: $TASK5_ID - 实现MCP版本删除接口（deleteTaskDocumentVersion）"
