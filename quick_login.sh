#!/bin/bash

echo "Performing quick login..."
RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/auth/dev/quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
echo "Token obtained: ${TOKEN:0:50}..."

# Now create tasks
echo ""
echo "Creating task 1..."
curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"实现MCP文档更新接口（updateTaskDocument）","parent_id":2498,"priority":"high","estimated_minutes":120,"description":"实现updateTaskDocument接口，支持智能更新"}' | jq '{success, id:.data.id}'
