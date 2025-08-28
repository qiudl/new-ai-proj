#!/bin/bash

# 测试JWT中间件
echo "=== 测试JWT中间件 ==="

# 1. 获取token
echo "1. 获取认证token..."
TOKEN=$(curl -s -X POST http://localhost:8081/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}' | jq -r '.data.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 无法获取token"
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:50}..."

# 2. 测试用户资料API
echo "2. 测试用户资料API..."
PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/v1/users/profile)
echo "Response: $PROFILE_RESPONSE"

# 3. 检查响应
if echo "$PROFILE_RESPONSE" | grep -q "User not authenticated"; then
  echo "❌ JWT中间件未生效 - 仍然返回未认证错误"
else
  echo "✅ JWT中间件生效"
fi

# 4. 检查后端日志中的AUTH调试信息
echo "3. 检查后端日志..."
docker-compose -f docker-compose.dev.yml logs --tail=10 backend | grep "\[AUTH\]" || echo "❌ 未发现AUTH调试日志"
