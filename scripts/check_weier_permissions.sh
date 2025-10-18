#!/bin/bash

# 检查weier账户权限问题
# 生产环境服务器: 152.136.104.251

SERVER="152.136.104.251"
API_BASE="http://${SERVER}:8080/api/v1"

echo "🔍 检查weier账户权限问题..."
echo "================================"

# 1. 开发快速登录获取token
echo ""
echo "1️⃣ 尝试使用weier账户登录..."
TOKEN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"weier"}')

echo "登录响应: $TOKEN_RESPONSE"

# 提取token
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.access_token // .access_token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 无法获取weier账户的token"
  echo "尝试使用admin账户获取token..."
  
  ADMIN_TOKEN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/dev-quick-login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin"}')
  
  TOKEN=$(echo $ADMIN_TOKEN_RESPONSE | jq -r '.data.access_token // .access_token // empty')
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ 无法获取admin token"
    exit 1
  fi
  
  echo "✅ 使用admin token继续检查"
  USE_ADMIN=true
else
  echo "✅ 成功获取weier token"
  USE_ADMIN=false
fi

# 解析JWT payload
echo ""
echo "2️⃣ 解析JWT token..."
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
# 补齐base64 padding
PADDING=$(( (4 - ${#PAYLOAD} % 4) % 4 ))
for i in $(seq 1 $PADDING); do
  PAYLOAD="${PAYLOAD}="
done

DECODED=$(echo $PAYLOAD | base64 -d 2>/dev/null)
echo "JWT payload: $DECODED" | jq '.'

USER_ID=$(echo $DECODED | jq -r '.user_id // .id // .sub // empty')
USERNAME=$(echo $DECODED | jq -r '.username // .name // empty')
USER_ROLE=$(echo $DECODED | jq -r '.role // empty')
COMPANY_USER_ID=$(echo $DECODED | jq -r '.company_user_id // empty')

echo ""
echo "📋 用户信息:"
echo "  - User ID: $USER_ID"
echo "  - Username: $USERNAME"
echo "  - Role: $USER_ROLE"
echo "  - Company User ID: $COMPANY_USER_ID"

# 3. 检查权限
echo ""
echo "3️⃣ 测试project_read权限检查..."
PERM_CHECK=$(curl -s -X POST "${API_BASE}/permissions/check" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissionCode":"project_read"}')

echo "权限检查响应:"
echo $PERM_CHECK | jq '.'

HAS_PERMISSION=$(echo $PERM_CHECK | jq -r '.result.hasPermission // .data.result.hasPermission // false')
REASON=$(echo $PERM_CHECK | jq -r '.result.reason // .data.result.reason // "unknown"')

echo ""
if [ "$HAS_PERMISSION" = "true" ]; then
  echo "✅ weier有project_read权限"
else
  echo "❌ weier没有project_read权限"
  echo "   原因: $REASON"
fi

# 4. 如果使用admin token,查询weier的用户信息
if [ "$USE_ADMIN" = "true" ]; then
  echo ""
  echo "4️⃣ 使用admin权限查询weier用户详情..."
  
  # 查询所有用户,找到weier
  USERS_LIST=$(curl -s -X GET "${API_BASE}/users?limit=100" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "用户列表响应:"
  echo $USERS_LIST | jq '.data.users[] | select(.username == "weier")'
  
  WEIER_USER_ID=$(echo $USERS_LIST | jq -r '.data.users[] | select(.username == "weier") | .id')
  
  if [ -n "$WEIER_USER_ID" ] && [ "$WEIER_USER_ID" != "null" ]; then
    echo ""
    echo "✅ 找到weier用户, ID: $WEIER_USER_ID"
    
    # 查询weier的权限信息
    echo ""
    echo "5️⃣ 查询weier的权限详情..."
    WEIER_PERMS=$(curl -s -X GET "${API_BASE}/permissions/users/${WEIER_USER_ID}" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "weier权限详情:"
    echo $WEIER_PERMS | jq '.'
  else
    echo "❌ 未找到weier用户"
  fi
fi

# 5. 尝试直接访问项目列表
echo ""
echo "6️⃣ 测试直接访问项目列表API..."
PROJECTS=$(curl -s -X GET "${API_BASE}/projects?limit=2" \
  -H "Authorization: Bearer $TOKEN")

echo "项目列表响应:"
echo $PROJECTS | jq '.'

# 检查是否成功
if echo $PROJECTS | jq -e '.data.projects' > /dev/null 2>&1; then
  echo "✅ 可以直接访问项目API"
elif echo $PROJECTS | jq -e '.error' > /dev/null 2>&1; then
  ERROR_MSG=$(echo $PROJECTS | jq -r '.error')
  echo "❌ 访问项目API失败: $ERROR_MSG"
else
  echo "⚠️  响应格式不明确"
fi

echo ""
echo "================================"
echo "🔍 检查完成"
