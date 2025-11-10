#!/bin/bash

# 测试MCP需求管理接口

# 获取token
echo "=== 登录获取Token ==="
RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/auth/dev-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
echo "Token: ${TOKEN:0:50}..."

# 测试1: 创建需求
echo -e "\n=== 测试1: 创建需求 ==="
curl -s -X POST "http://localhost:8080/api/v1/mcp/requirements/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试MCP创建需求",
    "description": "通过MCP接口创建的测试需求",
    "priority": "high",
    "category": "feature",
    "project_id": 39
  }' | jq '.'

# 测试2: 获取需求列表
echo -e "\n=== 测试2: 获取需求列表 ==="
curl -s "http://localhost:8080/api/v1/mcp/requirements?page=1&page_size=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .message, (.data.items | length)'

# 测试3: 获取单个需求
echo -e "\n=== 测试3: 获取需求详情 (ID=8) ==="
curl -s "http://localhost:8080/api/v1/mcp/requirements/8" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .message, .data.id, .data.title'

echo -e "\n=== 测试完成 ==="
