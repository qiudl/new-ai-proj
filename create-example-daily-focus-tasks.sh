#!/bin/bash

# Create example daily focus tasks for demonstration
# This script creates sample data to show the Daily Focus Tasks feature in action

echo "🚀 Creating example daily focus tasks..."

# Step 1: Get authentication token
echo "📋 Step 1: Getting authentication token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:8082/api/v1/auth/dev/quick-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}')

if [[ $? -ne 0 ]]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.data.access_token')
if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
  echo "❌ No valid token in response"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful"
echo "Token: ${TOKEN:0:20}..."

# Step 2: Create test tasks first (needed for focus task creation)
echo ""
echo "📋 Step 2: Creating test tasks..."

TASKS=(
  '{"title": "完成用户界面设计", "description": "设计新的用户登录界面，包括响应式布局", "status": "in_progress", "assignee_id": 1, "project_id": 1}'
  '{"title": "修复数据库性能问题", "description": "优化查询性能，减少响应时间", "status": "todo", "assignee_id": 1, "project_id": 1}'
  '{"title": "编写API文档", "description": "为新的REST API编写详细文档", "status": "todo", "assignee_id": 1, "project_id": 1}'
  '{"title": "代码review", "description": "审查团队成员提交的代码", "status": "todo", "assignee_id": 1, "project_id": 1}'
  '{"title": "更新部署脚本", "description": "更新CI/CD流水线部署脚本", "status": "todo", "assignee_id": 1, "project_id": 1}'
)

TASK_IDS=()

for i in "${!TASKS[@]}"; do
  echo "Creating task $((i+1))..."
  CREATE_TASK_RESPONSE=$(curl -s -X POST http://localhost:8082/api/v1/tasks \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "${TASKS[$i]}")
  
  TASK_ID=$(echo $CREATE_TASK_RESPONSE | jq -r '.data.id // .id // empty')
  if [[ -n "$TASK_ID" && "$TASK_ID" != "null" ]]; then
    TASK_IDS+=($TASK_ID)
    echo "✅ Created task with ID: $TASK_ID"
  else
    echo "⚠️ Could not create task $((i+1)), using fallback ID $((i+1))"
    TASK_IDS+=($((i+1)))
  fi
done

# Step 3: Create daily focus tasks using the created task IDs
echo ""
echo "📋 Step 3: Creating daily focus tasks..."

FOCUS_TASKS=(
  '{"task_id": '${TASK_IDS[0]}', "priority": "high", "notes": "优先完成，今天必须交付给客户"}'
  '{"task_id": '${TASK_IDS[1]}', "priority": "high", "notes": "生产环境有性能问题，需要紧急修复"}'
  '{"task_id": '${TASK_IDS[2]}', "priority": "medium", "notes": "文档更新，为下次发布做准备"}'
)

FOCUS_TASK_IDS=()

for i in "${!FOCUS_TASKS[@]}"; do
  echo "Creating daily focus task $((i+1))..."
  ADD_FOCUS_RESPONSE=$(curl -s -X POST http://localhost:8082/api/v1/daily-focus-tasks \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "${FOCUS_TASKS[$i]}")
  
  echo "Response: $ADD_FOCUS_RESPONSE"
  
  FOCUS_TASK_ID=$(echo $ADD_FOCUS_RESPONSE | jq -r '.data.id // .id // empty')
  if [[ -n "$FOCUS_TASK_ID" && "$FOCUS_TASK_ID" != "null" ]]; then
    FOCUS_TASK_IDS+=($FOCUS_TASK_ID)
    echo "✅ Created daily focus task with ID: $FOCUS_TASK_ID"
  else
    echo "⚠️ Could not create daily focus task $((i+1))"
  fi
done

# Step 4: Get created daily focus tasks
echo ""
echo "📋 Step 4: Retrieving created daily focus tasks..."
TASKS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8082/api/v1/daily-focus-tasks)

echo "Daily focus tasks: $TASKS_RESPONSE"

# Step 5: Get statistics
echo ""
echo "📋 Step 5: Getting daily focus task statistics..."
STATS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8082/api/v1/daily-focus-tasks/stats)

echo "Statistics: $STATS_RESPONSE"

# Step 6: Get recommendations
echo ""
echo "📋 Step 6: Getting task recommendations..."
RECOMMENDATIONS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8082/api/v1/daily-focus-tasks/recommendations)

echo "Recommendations: $RECOMMENDATIONS_RESPONSE"

echo ""
echo "🎉 Example daily focus tasks created successfully!"
echo ""
echo "Summary:"
echo "- ✅ Created ${#TASK_IDS[@]} base tasks"
echo "- ✅ Created ${#FOCUS_TASK_IDS[@]} daily focus tasks"
echo ""
echo "You can now view these tasks in the dashboard at http://localhost:3001"
echo "The Daily Focus Tasks component should display these example tasks."