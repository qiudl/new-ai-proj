#!/bin/bash

LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/auth/dev/quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')
echo "Token: ${TOKEN:0:60}..."
echo ""

echo "Testing task creation..."
curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试任务","project_id":1,"parent_id":2498}' | jq '.'
