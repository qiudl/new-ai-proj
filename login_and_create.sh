#!/bin/bash

echo "Step 1: Performing dev quick login..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/auth/dev/quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}')

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get token, trying with ai-pm user..."
  LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/auth/dev/quick-login" \
    -H "Content-Type: application/json" \
    -d '{"username":"ai-pm"}')

  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
fi

echo "Token: ${TOKEN:0:50}..."
echo ""

echo "Step 2: Creating task with new token..."
curl -s -X POST "http://localhost:8080/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试任务创建-1",
    "project_id": 1,
    "parent_id": 2498
  }' | jq '.'
