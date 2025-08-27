#!/bin/bash

echo "=== API路由修复验证测试 ==="
echo

# 获取JWT Token
echo "1. 获取认证Token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.data.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 无法获取认证Token"
  echo $AUTH_RESPONSE | jq
  exit 1
fi

echo "✅ 成功获取Token: ${TOKEN:0:20}..."
echo

# 测试用户资料API
echo "2. 测试用户资料API..."
PROFILE_RESPONSE=$(curl -s -X GET http://localhost:3001/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN")

PROFILE_SUCCESS=$(echo $PROFILE_RESPONSE | jq -r '.success')
if [ "$PROFILE_SUCCESS" = "true" ]; then
  echo "✅ 用户资料API正常工作"
  echo "   用户名: $(echo $PROFILE_RESPONSE | jq -r '.data.username')"
  echo "   邮箱: $(echo $PROFILE_RESPONSE | jq -r '.data.email')"
else
  echo "❌ 用户资料API失败"
  echo $PROFILE_RESPONSE | jq
fi
echo

# 测试计时器历史API
echo "3. 测试计时器历史API..."
HISTORY_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/user/timer/history?limit=5&offset=0" \
  -H "Authorization: Bearer $TOKEN")

SESSIONS_COUNT=$(echo $HISTORY_RESPONSE | jq '.sessions | length')
if [ "$SESSIONS_COUNT" != "null" ] && [ "$SESSIONS_COUNT" != "0" ]; then
  echo "✅ 计时器历史API正常工作"
  echo "   返回记录数: $SESSIONS_COUNT"
  echo "   最新记录: $(echo $HISTORY_RESPONSE | jq -r '.sessions[0].target_title')"
else
  echo "⚠️ 计时器历史API可以访问但无数据"
  echo "   限制: $(echo $HISTORY_RESPONSE | jq -r '.limit')"
  echo "   偏移: $(echo $HISTORY_RESPONSE | jq -r '.offset')"
fi
echo

echo "=== 测试完成 ==="
