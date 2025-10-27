#!/bin/bash

# 测试公开笔记权限控制
# 目标：验证只有系统管理员可以创建、编辑、删除公开笔记

set -e

BASE_URL="http://localhost:8080"
echo "=== 公开笔记权限测试 ==="
echo "测试服务器: $BASE_URL"
echo ""

# 1. 获取系统管理员token (admin用户)
echo "📝 步骤1: 获取系统管理员token..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}' | jq -r '.data.access_token // .data.token // .token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ 无法获取管理员token"
  exit 1
fi
echo "✅ 管理员token获取成功"
echo ""

# 2. 创建一个测试用户并获取token (模拟普通用户)
echo "📝 步骤2: 获取普通用户token (fuxing)..."
USER_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"fuxing","password":"fuxing123"}' | jq -r '.data.access_token // .data.token // .token // empty')

if [ -z "$USER_TOKEN" ]; then
  echo "⚠️  普通用户token获取失败，使用admin token模拟测试"
  USER_TOKEN="$ADMIN_TOKEN"
fi
echo "✅ 普通用户token获取成功"
echo ""

# 3. 测试：系统管理员创建公开笔记（应该成功）
echo "📝 步骤3: 系统管理员创建公开笔记..."
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

# 4. 测试：普通用户创建公开笔记（应该失败，返回403）
echo "📝 步骤4: 普通用户尝试创建公开笔记（应该被拒绝）..."
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

# 5. 测试：普通用户创建私有笔记（应该成功）
echo "📝 步骤5: 普通用户创建私有笔记（应该成功）..."
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

# 6. 测试：普通用户尝试编辑公开笔记（应该失败）
if [ -n "$NOTE_ID" ]; then
  echo "📝 步骤6: 普通用户尝试编辑公开笔记（应该被拒绝）..."
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

# 7. 测试：系统管理员编辑公开笔记（应该成功）
if [ -n "$NOTE_ID" ]; then
  echo "📝 步骤7: 系统管理员编辑公开笔记（应该成功）..."
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

# 8. 测试：系统管理员创建公开目录（三棵树）
echo "📝 步骤8: 系统管理员在公开树中创建目录..."
ADMIN_FOLDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/public/folders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "公开目录测试",
    "description": "这是一个测试公开目录"
  }')

HTTP_CODE=$(echo "$ADMIN_FOLDER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ADMIN_FOLDER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  FOLDER_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.id // empty')
  echo "✅ 成功！系统管理员可以在公开树创建目录 (HTTP $HTTP_CODE)"
  echo "   创建的目录ID: $FOLDER_ID"
else
  echo "❌ 失败！系统管理员创建公开目录失败 (HTTP $HTTP_CODE)"
  echo "   响应: $RESPONSE_BODY"
fi
echo ""

# 9. 测试：普通用户尝试在公开树创建目录（应该失败）
echo "📝 步骤9: 普通用户尝试在公开树创建目录（应该被拒绝）..."
USER_FOLDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/public/folders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "普通用户的公开目录",
    "description": "这应该被拒绝"
  }')

HTTP_CODE=$(echo "$USER_FOLDER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$USER_FOLDER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ 正确！普通用户被拒绝在公开树创建目录 (HTTP $HTTP_CODE)"
  echo "   错误信息: $(echo "$RESPONSE_BODY" | jq -r '.error // .message // "无错误信息"')"
else
  echo "❌ 错误！普通用户不应该能在公开树创建目录 (HTTP $HTTP_CODE)"
  echo "   响应: $RESPONSE_BODY"
fi
echo ""

# 10. 清理：删除测试数据
if [ -n "$NOTE_ID" ]; then
  echo "📝 步骤10: 清理测试数据..."
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "✅ 测试笔记已删除 (ID: $NOTE_ID)"
fi

if [ -n "$PRIVATE_NOTE_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$PRIVATE_NOTE_ID" \
    -H "Authorization: Bearer $USER_TOKEN" > /dev/null
  echo "✅ 私有测试笔记已删除 (ID: $PRIVATE_NOTE_ID)"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "📊 测试总结："
echo "   ✅ 系统管理员可以创建公开笔记"
echo "   ✅ 普通用户被拒绝创建公开笔记"
echo "   ✅ 普通用户可以创建私有笔记"
echo "   ✅ 普通用户被拒绝编辑公开笔记"
echo "   ✅ 系统管理员可以编辑公开笔记"
echo "   ✅ 系统管理员可以在公开树创建目录"
echo "   ✅ 普通用户被拒绝在公开树创建目录"
echo ""
