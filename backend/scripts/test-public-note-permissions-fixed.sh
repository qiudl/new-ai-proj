#!/bin/bash

# 测试公开笔记权限控制（修复版）
# 目标：验证只有系统管理员可以创建、编辑、删除公开笔记

set -e

BASE_URL="http://localhost:8080"
echo "=== 公开笔记权限测试（修复版） ==="
echo "测试服务器: $BASE_URL"
echo ""

# 1. 获取系统管理员token (admin用户 - user_type=system, role=admin)
echo "📝 步骤1: 获取系统管理员token..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}' | jq -r '.data.access_token // .data.token // .token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ 无法获取管理员token"
  exit 1
fi
echo "✅ 管理员token获取成功"
echo "   Token: ${ADMIN_TOKEN:0:30}..."
echo ""

# 2. 创建一个company类型的普通用户用于测试
echo "📝 步骤2: 创建普通测试用户..."
CREATE_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_regular_user",
    "email": "regular@test.com",
    "password": "test123456",
    "user_type": "company",
    "role": "user",
    "status": "active"
  }')

echo "   创建用户响应: $CREATE_USER_RESPONSE"

# 3. 使用普通用户登录获取token
echo "📝 步骤3: 使用普通用户登录..."
USER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_regular_user",
    "password": "test123456"
  }')

USER_TOKEN=$(echo "$USER_LOGIN_RESPONSE" | jq -r '.data.access_token // .data.token // .token // empty')

if [ -z "$USER_TOKEN" ]; then
  echo "⚠️  普通用户登录失败，响应："
  echo "$USER_LOGIN_RESPONSE"
  echo ""
  echo "尝试使用已存在的fuxing用户..."

  USER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "fuxing",
      "password": "fuxing123"
    }')

  USER_TOKEN=$(echo "$USER_LOGIN_RESPONSE" | jq -r '.data.access_token // .data.token // .token // empty')

  if [ -z "$USER_TOKEN" ]; then
    echo "❌ 无法获取普通用户token，跳过用户权限测试"
    USER_TOKEN="INVALID"
  else
    echo "✅ 使用fuxing用户成功登录"
  fi
else
  echo "✅ 普通用户token获取成功"
  echo "   Token: ${USER_TOKEN:0:30}..."
fi
echo ""

# 4. 验证admin是系统管理员
echo "📝 步骤4: 验证admin用户类型..."
ADMIN_USER_INFO=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/v1/users/me")
echo "   Admin用户信息: $(echo $ADMIN_USER_INFO | jq '{user_type: .data.user_type, role: .data.role}')"
echo ""

# 5. 验证test_regular_user是普通用户
if [ "$USER_TOKEN" != "INVALID" ]; then
  echo "📝 步骤5: 验证普通用户类型..."
  USER_INFO=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/api/v1/users/me")
  echo "   普通用户信息: $(echo $USER_INFO | jq '{user_type: .data.user_type, role: .data.role}')"
  echo ""
fi

# 6. 测试：系统管理员创建公开笔记（应该成功）
echo "📝 步骤6: 系统管理员创建公开笔记..."
ADMIN_CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "公开笔记权限测试 - 管理员创建",
    "content": "这是一条由系统管理员创建的公开笔记",
    "work_note_type": "general",
    "visibility": "public",
    "priority": "medium"
  }')

HTTP_CODE=$(echo "$ADMIN_CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ADMIN_CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  NOTE_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.id // empty')
  echo "✅ 成功！系统管理员可以创建公开笔记 (HTTP $HTTP_CODE)"
  echo "   创建的笔记ID: $NOTE_ID"
else
  echo "❌ 失败！系统管理员创建公开笔记失败 (HTTP $HTTP_CODE)"
  echo "   响应: $RESPONSE_BODY"
fi
echo ""

# 7. 测试：普通用户创建公开笔记（应该失败，返回403）
if [ "$USER_TOKEN" != "INVALID" ]; then
  echo "📝 步骤7: 普通用户尝试创建公开笔记（应该被拒绝）..."
  USER_CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "公开笔记权限测试 - 普通用户创建",
      "content": "这是一条普通用户尝试创建的公开笔记",
      "work_note_type": "general",
      "visibility": "public",
      "priority": "medium"
    }')

  HTTP_CODE=$(echo "$USER_CREATE_RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$USER_CREATE_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ 正确！普通用户被拒绝创建公开笔记 (HTTP $HTTP_CODE)"
    echo "   错误信息: $(echo "$RESPONSE_BODY" | jq -r '.error.message // .message // "无错误信息"')"
  elif [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "❌ 错误！普通用户不应该能创建公开笔记 (HTTP $HTTP_CODE)"
    echo "   响应: $RESPONSE_BODY"
  else
    echo "⚠️  意外的响应码: HTTP $HTTP_CODE"
    echo "   响应: $RESPONSE_BODY"
  fi
  echo ""
fi

# 8. 测试：普通用户创建私有笔记（应该成功）
if [ "$USER_TOKEN" != "INVALID" ]; then
  echo "📝 步骤8: 普通用户创建私有笔记（应该成功）..."
  PRIVATE_CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "私有笔记测试",
      "content": "这是一条私有笔记",
      "work_note_type": "general",
      "visibility": "private",
      "priority": "medium"
    }')

  HTTP_CODE=$(echo "$PRIVATE_CREATE_RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$PRIVATE_CREATE_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    PRIVATE_NOTE_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.id // empty')
    echo "✅ 成功！普通用户可以创建私有笔记 (HTTP $HTTP_CODE)"
    echo "   创建的笔记ID: $PRIVATE_NOTE_ID"
  else
    echo "❌ 失败！普通用户创建私有笔记失败 (HTTP $HTTP_CODE)"
    echo "   响应: $RESPONSE_BODY"
  fi
  echo ""
fi

# 9. 测试：普通用户尝试编辑公开笔记（应该失败）
if [ -n "$NOTE_ID" ] && [ "$USER_TOKEN" != "INVALID" ]; then
  echo "📝 步骤9: 普通用户尝试编辑公开笔记（应该被拒绝）..."
  USER_UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-notes/$NOTE_ID" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "尝试修改的标题"
    }')

  HTTP_CODE=$(echo "$USER_UPDATE_RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$USER_UPDATE_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ 正确！普通用户被拒绝编辑公开笔记 (HTTP $HTTP_CODE)"
  elif [ "$HTTP_CODE" = "200" ]; then
    echo "❌ 错误！普通用户不应该能编辑公开笔记 (HTTP $HTTP_CODE)"
  else
    echo "⚠️  意外的响应码: HTTP $HTTP_CODE"
    echo "   响应: $RESPONSE_BODY"
  fi
  echo ""
fi

# 10. 测试：系统管理员编辑公开笔记（应该成功）
if [ -n "$NOTE_ID" ]; then
  echo "📝 步骤10: 系统管理员编辑公开笔记（应该成功）..."
  ADMIN_UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-notes/$NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "公开笔记 - 已被管理员修改"
    }')

  HTTP_CODE=$(echo "$ADMIN_UPDATE_RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 成功！系统管理员可以编辑公开笔记 (HTTP $HTTP_CODE)"
  else
    echo "❌ 失败！系统管理员编辑公开笔记失败 (HTTP $HTTP_CODE)"
  fi
  echo ""
fi

# 11. 清理：删除测试数据
if [ -n "$NOTE_ID" ]; then
  echo "📝 步骤11: 清理测试数据..."
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "✅ 测试笔记已删除 (ID: $NOTE_ID)"
fi

if [ -n "$PRIVATE_NOTE_ID" ] && [ "$USER_TOKEN" != "INVALID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$PRIVATE_NOTE_ID" \
    -H "Authorization: Bearer $USER_TOKEN" > /dev/null
  echo "✅ 私有测试笔记已删除 (ID: $PRIVATE_NOTE_ID)"
fi

echo ""
echo "=== 测试完成 ==="
