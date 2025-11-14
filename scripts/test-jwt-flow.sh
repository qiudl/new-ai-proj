#!/usr/bin/env bash

echo "=== JWT认证流程测试 ==="
echo ""

echo "1. 读取token文件..."
TOKEN=$(cat ~/.ai-proj-jwt-token | tr -d '\n' | tr -d ' ')
echo "Token长度: ${#TOKEN}"
echo "Token前50字符: ${TOKEN:0:50}..."
echo ""

echo "2. 测试API调用..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/tasks?page=1&limit=2" \
  | python3 -m json.tool | head -30
echo ""

echo "3. 检查MCP .env配置..."
grep "^TASK_API_TOKEN=" /Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge/.env | cut -c 1-80
echo ""

echo "=== 测试完成 ==="
