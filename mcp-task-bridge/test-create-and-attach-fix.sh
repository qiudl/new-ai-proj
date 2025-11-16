#!/bin/bash

echo "=== 测试 create-and-attach 接口修复 ==="
echo ""

# 获取JWT token
source ~/.ai-proj-jwt.env

# 测试任务ID（使用任务3779）
TASK_ID=3779

echo "1. 创建测试任务文档..."
curl -s -X POST "http://localhost:8080/api/v1/mcp/create-and-attach" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": $TASK_ID,
    \"content\": \"# 测试文档\\n\\n这是通过修复后的 create-and-attach 接口创建的测试文档。\\n\\n## 测试内容\\n\\n- 测试1: 认证修复验证\\n- 测试2: 接口功能正常\\n\\n修复时间: $(date)\",
    \"title\": \"create-and-attach 接口修复测试文档\"
  }" | jq '.'

echo ""
echo "2. 验证文档是否创建成功..."
curl -s -X GET "http://localhost:8080/api/v1/mcp/task-document/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {id, title, content_length: (.content | length), created_at}'

echo ""
echo "=== 测试完成 ==="
