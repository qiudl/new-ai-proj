#!/bin/bash

# 用户权限列表获取API测试脚本
# 测试API: GET /api/v1/auth/user-permissions

API_BASE="http://localhost:3001/api/v1"
echo "========================================"
echo "用户权限列表获取API测试"
echo "========================================"

# 1. 首先通过开发环境快速登录获取token
echo "1. 开发环境快速登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}')

echo "登录响应: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ 无法获取token，退出测试"
  exit 1
fi

echo "✅ 获取到token: ${TOKEN:0:20}..."

# 2. 测试用户权限列表获取API
echo ""
echo "2. 测试用户权限列表获取API..."
PERMISSIONS_RESPONSE=$(curl -s -X GET "${API_BASE}/auth/user-permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "权限响应:"
echo "$PERMISSIONS_RESPONSE" | jq '.' 2>/dev/null || echo "$PERMISSIONS_RESPONSE"

# 3. 验证响应结构
echo ""
echo "3. 验证响应结构..."

# 检查是否成功
SUCCESS=$(echo "$PERMISSIONS_RESPONSE" | grep -o '"success":\s*true' | head -1)
if [ -n "$SUCCESS" ]; then
  echo "✅ API调用成功"
else
  echo "❌ API调用失败"
fi

# 检查是否有用户ID
USER_ID=$(echo "$PERMISSIONS_RESPONSE" | grep -o '"user_id":\s*[0-9]*' | head -1)
if [ -n "$USER_ID" ]; then
  echo "✅ 包含用户ID: $USER_ID"
else
  echo "❌ 缺少用户ID"
fi

# 检查是否有权限列表
PERMISSIONS_COUNT=$(echo "$PERMISSIONS_RESPONSE" | grep -o '"permissions":\s*\[' | wc -l)
if [ "$PERMISSIONS_COUNT" -gt 0 ]; then
  echo "✅ 包含权限列表"
  # 计算权限数量
  PERM_COUNT=$(echo "$PERMISSIONS_RESPONSE" | grep -o '"task\.' | wc -l)
  echo "   - 任务相关权限: $PERM_COUNT 个"
  
  DOC_COUNT=$(echo "$PERMISSIONS_RESPONSE" | grep -o '"document\.' | wc -l)
  echo "   - 文档相关权限: $DOC_COUNT 个"
  
  NOTE_COUNT=$(echo "$PERMISSIONS_RESPONSE" | grep -o '"worknote\.' | wc -l)
  echo "   - 工作笔记权限: $NOTE_COUNT 个"
else
  echo "❌ 缺少权限列表"
fi

# 4. 测试无效token的情况
echo ""
echo "4. 测试无效token处理..."
INVALID_RESPONSE=$(curl -s -X GET "${API_BASE}/auth/user-permissions" \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json")

UNAUTHORIZED=$(echo "$INVALID_RESPONSE" | grep -o '"UNAUTHORIZED"' | head -1)
if [ -n "$UNAUTHORIZED" ]; then
  echo "✅ 无效token正确返回UNAUTHORIZED错误"
else
  echo "❌ 无效token处理异常"
  echo "响应: $INVALID_RESPONSE"
fi

# 5. 测试无认证头的情况
echo ""
echo "5. 测试缺少认证头处理..."
NO_AUTH_RESPONSE=$(curl -s -X GET "${API_BASE}/auth/user-permissions" \
  -H "Content-Type: application/json")

NO_AUTH_ERROR=$(echo "$NO_AUTH_RESPONSE" | grep -o '"error"' | head -1)
if [ -n "$NO_AUTH_ERROR" ]; then
  echo "✅ 缺少认证头正确返回错误"
else
  echo "❌ 缺少认证头处理异常" 
  echo "响应: $NO_AUTH_RESPONSE"
fi

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"

# 6. 输出API使用示例
echo ""
echo "API使用示例:"
echo "curl -X GET '${API_BASE}/auth/user-permissions' \\"
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "  -H 'Content-Type: application/json'"
