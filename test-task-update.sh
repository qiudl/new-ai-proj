#!/bin/bash

# 测试任务更新功能 - 验证 priority 字段是否被正确保存

echo "=== 测试任务编辑时 priority 字段是否正确保存 ==="
echo ""

# 等待服务完全启动
sleep 5

# 第一步：获取任务241的当前信息
echo "1. 获取任务 #241 的当前信息..."
TASK_INFO=$(curl -s http://localhost:8081/api/v1/projects/1/tasks/241)
echo "$TASK_INFO" | jq '.'

# 第二步：更新任务，将 priority 从 low 改为 high
echo ""
echo "2. 更新任务 #241，将 priority 从 low 改为 high..."
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:8081/api/v1/projects/1/tasks/241 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "修复任务编辑时priority字段未保存的bug",
    "description": "修复数据库Update方法中缺少priority字段的问题",
    "status": "in_progress",
    "priority": "high",
    "assignee_id": null,
    "parent_id": null,
    "due_date": null,
    "custom_fields": {},
    "estimated_time": null,
    "actual_time": null
  }')

echo "$UPDATE_RESPONSE" | jq '.'

# 第三步：重新获取任务信息，验证 priority 是否已更新
echo ""
echo "3. 重新获取任务 #241，验证 priority 是否已更新为 high..."
UPDATED_TASK=$(curl -s http://localhost:8081/api/v1/projects/1/tasks/241)
echo "$UPDATED_TASK" | jq '.data | {id, title, status, priority}'

# 第四步：判断测试结果
PRIORITY=$(echo "$UPDATED_TASK" | jq -r '.data.priority')
if [ "$PRIORITY" = "high" ]; then
    echo ""
    echo "✅ 测试成功！priority 字段已正确更新为 high"
else
    echo ""
    echo "❌ 测试失败！priority 字段未更新，当前值为: $PRIORITY"
fi
