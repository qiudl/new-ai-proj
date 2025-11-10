#!/bin/bash

# 获取token
TOKEN=$(curl -s -X POST "http://localhost:8080/api/v1/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}' | jq -r '.data.access_token')

echo "Token: ${TOKEN:0:50}..."

# 测试：手动指定enterprise_id创建需求
echo -e "\n=== 测试: 手动指定enterprise_id=3创建需求 ==="
curl -s -X POST "http://localhost:8080/api/v1/mcp/requirements/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MCP测试需求 - 手动指定企业",
    "description": "通过MCP接口创建，手动指定enterpriseId",
    "priority": "high",
    "category": "feature",
    "projectId": 39,
    "enterpriseId": 3
  }' | jq '.'

# 验证创建结果
echo -e "\n=== 获取最新创建的需求列表 (验证) ==="
curl -s "http://localhost:8080/api/v1/mcp/requirements?page=1&page_size=1&sort_order=desc" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .message, .data.items[0].title'
