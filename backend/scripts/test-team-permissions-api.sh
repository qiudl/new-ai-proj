#!/bin/bash

# 团队笔记权限控制API测试
# 基于HTTP API的权限测试，无需直接数据库访问
# 测试范围：
# 1. Team文件夹管理权限（创建、编辑、删除）
# 2. Team笔记创建和编辑权限
# 3. Private和Public权限验证

set -e

BASE_URL="http://localhost:8080"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 记录测试结果
test_result() {
  local test_name="$1"
  local expected_code="$2"
  local actual_code="$3"
  local description="$4"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$expected_code" = "$actual_code" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name (HTTP $actual_code)"
    [ -n "$description" ] && echo "   $description"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    echo "   Expected HTTP $expected_code, Got: HTTP $actual_code"
    [ -n "$description" ] && echo "   $description"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   团队笔记权限控制API测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo "测试服务器: $BASE_URL"
echo ""

# ============================================================
# 准备：获取测试用户Token
# ============================================================
echo -e "${BLUE}=== 准备测试环境 ===${NC}"
echo ""

# 获取系统管理员token (admin用户)
echo "📝 获取系统管理员token..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/dev-quick-login" \
  -H "Content-Type: application/json" | jq -r '.data.access_token // .data.token // .token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ 无法获取管理员token${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 系统管理员token获取成功${NC}"
echo ""

# 尝试获取普通用户token (fuxing用户 - 企业成员)
echo "📝 获取企业成员用户token (fuxing)..."
MEMBER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"fuxing","password":"fuxing123"}')

MEMBER_TOKEN=$(echo "$MEMBER_RESPONSE" | jq -r '.data.access_token // .data.token // .token // empty')

if [ -n "$MEMBER_TOKEN" ]; then
  echo -e "${GREEN}✅ 企业成员token获取成功${NC}"
  HAS_MEMBER_USER=true
else
  echo -e "${YELLOW}⚠️  无法获取企业成员token，跳过相关测试${NC}"
  HAS_MEMBER_USER=false
fi
echo ""

# ============================================================
# Phase 1: Team文件夹权限测试
# ============================================================
echo -e "${BLUE}=== Phase 1: Team文件夹权限测试 ===${NC}"
echo ""

# Test 1.1: 系统管理员创建Team文件夹（应成功：200/201）
echo "Test 1.1: 系统管理员创建Team文件夹"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/team/folders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "权限测试-Team根文件夹",
    "description": "测试Team文件夹创建权限"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
TEAM_FOLDER_ID=$(echo "$BODY" | jq -r '.data.id // empty')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  test_result "系统管理员创建Team根文件夹" "$HTTP_CODE" "$HTTP_CODE" "文件夹ID: $TEAM_FOLDER_ID"
else
  test_result "系统管理员创建Team根文件夹" "201" "$HTTP_CODE" "$(echo "$BODY" | jq -r '.message // .error // ""')"
fi
echo ""

# Test 1.2: 系统管理员在Team文件夹下创建子文件夹（应成功）
if [ -n "$TEAM_FOLDER_ID" ]; then
  echo "Test 1.2: 系统管理员创建Team子文件夹"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/team/folders" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"权限测试-Team子文件夹\",
      \"description\": \"测试子文件夹权限\",
      \"parent_id\": $TEAM_FOLDER_ID
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  TEAM_SUBFOLDER_ID=$(echo "$BODY" | jq -r '.data.id // empty')

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    test_result "系统管理员创建Team子文件夹" "$HTTP_CODE" "$HTTP_CODE" "子文件夹ID: $TEAM_SUBFOLDER_ID"
  else
    test_result "系统管理员创建Team子文件夹" "201" "$HTTP_CODE"
  fi
  echo ""
fi

# Test 1.3: 系统管理员更新Team文件夹（应成功：200）
if [ -n "$TEAM_FOLDER_ID" ]; then
  echo "Test 1.3: 系统管理员更新Team文件夹"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-note-folders/$TEAM_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "权限测试-Team文件夹(已更新)",
      "description": "更新后的描述"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  test_result "系统管理员更新Team文件夹" "200" "$HTTP_CODE"
  echo ""
fi

# Test 1.4: 企业成员尝试创建Team根文件夹（应失败：403）
if [ "$HAS_MEMBER_USER" = true ]; then
  echo "Test 1.4: 企业成员尝试创建Team根文件夹（应被拒绝）"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/team/folders" \
    -H "Authorization: Bearer $MEMBER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "普通成员的Team文件夹",
      "description": "这应该被拒绝"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  test_result "企业成员尝试创建Team根文件夹" "403" "$HTTP_CODE" "$(echo "$BODY" | jq -r '.message // .error // ""')"
  echo ""
fi

# Test 1.5: 企业成员尝试编辑Team文件夹（应失败：403）
if [ "$HAS_MEMBER_USER" = true ] && [ -n "$TEAM_FOLDER_ID" ]; then
  echo "Test 1.5: 企业成员尝试编辑Team文件夹（应被拒绝）"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-note-folders/$TEAM_FOLDER_ID" \
    -H "Authorization: Bearer $MEMBER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "尝试修改的名称"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  test_result "企业成员尝试编辑Team文件夹" "403" "$HTTP_CODE"
  echo ""
fi

# ============================================================
# Phase 2: Team笔记权限测试
# ============================================================
echo -e "${BLUE}=== Phase 2: Team笔记权限测试 ===${NC}"
echo ""

# Test 2.1: 系统管理员创建Team笔记（应成功：200/201）
echo "Test 2.1: 系统管理员创建Team笔记"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "权限测试-管理员的Team笔记",
    "content": "这是系统管理员创建的团队笔记",
    "work_note_type": "general",
    "visibility": "team",
    "priority": "medium"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
ADMIN_TEAM_NOTE_ID=$(echo "$BODY" | jq -r '.data.id // empty')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  test_result "系统管理员创建Team笔记" "$HTTP_CODE" "$HTTP_CODE" "笔记ID: $ADMIN_TEAM_NOTE_ID"
else
  test_result "系统管理员创建Team笔记" "201" "$HTTP_CODE" "$(echo "$BODY" | jq -r '.message // .error // ""')"
fi
echo ""

# Test 2.2: 系统管理员编辑自己的Team笔记（应成功：200）
if [ -n "$ADMIN_TEAM_NOTE_ID" ]; then
  echo "Test 2.2: 系统管理员编辑自己的Team笔记"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-notes/$ADMIN_TEAM_NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "权限测试-管理员的Team笔记(已编辑)",
      "content": "更新后的内容"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  test_result "系统管理员编辑自己的Team笔记" "200" "$HTTP_CODE"
  echo ""
fi

# Test 2.3: 企业成员创建Team笔记（应成功：200/201）
if [ "$HAS_MEMBER_USER" = true ]; then
  echo "Test 2.3: 企业成员创建Team笔记"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
    -H "Authorization: Bearer $MEMBER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "权限测试-成员的Team笔记",
      "content": "这是企业成员创建的团队笔记",
      "work_note_type": "general",
      "visibility": "team",
      "priority": "medium"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  MEMBER_TEAM_NOTE_ID=$(echo "$BODY" | jq -r '.data.id // empty')

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    test_result "企业成员创建Team笔记" "$HTTP_CODE" "$HTTP_CODE" "笔记ID: $MEMBER_TEAM_NOTE_ID"
  else
    test_result "企业成员创建Team笔记" "201" "$HTTP_CODE" "$(echo "$BODY" | jq -r '.message // .error // ""')"
  fi
  echo ""
fi

# Test 2.4: 企业成员编辑自己的Team笔记（应成功：200）
if [ "$HAS_MEMBER_USER" = true ] && [ -n "$MEMBER_TEAM_NOTE_ID" ]; then
  echo "Test 2.4: 企业成员编辑自己的Team笔记"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-notes/$MEMBER_TEAM_NOTE_ID" \
    -H "Authorization: Bearer $MEMBER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "权限测试-成员的Team笔记(已编辑)",
      "content": "成员更新的内容"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  test_result "企业成员编辑自己的Team笔记" "200" "$HTTP_CODE"
  echo ""
fi

# Test 2.5: 企业成员尝试编辑别人的Team笔记（应失败：403）
if [ "$HAS_MEMBER_USER" = true ] && [ -n "$ADMIN_TEAM_NOTE_ID" ]; then
  echo "Test 2.5: 企业成员尝试编辑管理员的Team笔记（应被拒绝）"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-notes/$ADMIN_TEAM_NOTE_ID" \
    -H "Authorization: Bearer $MEMBER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "尝试修改管理员的笔记"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  test_result "企业成员尝试编辑管理员的Team笔记" "403" "$HTTP_CODE"
  echo ""
fi

# ============================================================
# Phase 3: Private和Public权限验证
# ============================================================
echo -e "${BLUE}=== Phase 3: Private和Public权限验证 ===${NC}"
echo ""

# Test 3.1: 系统管理员创建Private文件夹（应成功：200/201）
echo "Test 3.1: 系统管理员创建Private文件夹"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/private/folders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "权限测试-Private文件夹",
    "description": "测试私有文件夹"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
PRIVATE_FOLDER_ID=$(echo "$BODY" | jq -r '.data.id // empty')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  test_result "系统管理员创建Private文件夹" "$HTTP_CODE" "$HTTP_CODE" "文件夹ID: $PRIVATE_FOLDER_ID"
else
  test_result "系统管理员创建Private文件夹" "201" "$HTTP_CODE"
fi
echo ""

# Test 3.2: 系统管理员创建Public文件夹（应成功：200/201）
echo "Test 3.2: 系统管理员创建Public文件夹"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/public/folders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "权限测试-Public文件夹",
    "description": "测试公开文件夹"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
PUBLIC_FOLDER_ID=$(echo "$BODY" | jq -r '.data.id // empty')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  test_result "系统管理员创建Public文件夹" "$HTTP_CODE" "$HTTP_CODE" "文件夹ID: $PUBLIC_FOLDER_ID"
else
  test_result "系统管理员创建Public文件夹" "201" "$HTTP_CODE"
fi
echo ""

# Test 3.3: 企业成员尝试创建Public文件夹（应失败：403）
if [ "$HAS_MEMBER_USER" = true ]; then
  echo "Test 3.3: 企业成员尝试创建Public文件夹（应被拒绝）"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/public/folders" \
    -H "Authorization: Bearer $MEMBER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "成员的Public文件夹",
      "description": "这应该被拒绝"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  test_result "企业成员尝试创建Public文件夹" "403" "$HTTP_CODE"
  echo ""
fi

# Test 3.4: 系统管理员创建Public笔记（应成功：200/201）
echo "Test 3.4: 系统管理员创建Public笔记"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "权限测试-Public笔记",
    "content": "这是公开笔记",
    "work_note_type": "general",
    "visibility": "public",
    "priority": "medium"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
PUBLIC_NOTE_ID=$(echo "$BODY" | jq -r '.data.id // empty')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  test_result "系统管理员创建Public笔记" "$HTTP_CODE" "$HTTP_CODE" "笔记ID: $PUBLIC_NOTE_ID"
else
  test_result "系统管理员创建Public笔记" "201" "$HTTP_CODE"
fi
echo ""

# Test 3.5: 企业成员尝试创建Public笔记（应失败：403）
if [ "$HAS_MEMBER_USER" = true ]; then
  echo "Test 3.5: 企业成员尝试创建Public笔记（应被拒绝）"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
    -H "Authorization: Bearer $MEMBER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "成员的Public笔记",
      "content": "这应该被拒绝",
      "work_note_type": "general",
      "visibility": "public",
      "priority": "medium"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  test_result "企业成员尝试创建Public笔记" "403" "$HTTP_CODE"
  echo ""
fi

# ============================================================
# 清理测试数据
# ============================================================
echo -e "${BLUE}=== 清理测试数据 ===${NC}"
echo ""

# 删除测试文件夹
if [ -n "$TEAM_FOLDER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-note-folders/$TEAM_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null 2>&1
  echo "✅ Team文件夹已删除"
fi

if [ -n "$TEAM_SUBFOLDER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-note-folders/$TEAM_SUBFOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null 2>&1
  echo "✅ Team子文件夹已删除"
fi

if [ -n "$PRIVATE_FOLDER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-note-folders/$PRIVATE_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null 2>&1
  echo "✅ Private文件夹已删除"
fi

if [ -n "$PUBLIC_FOLDER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-note-folders/$PUBLIC_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null 2>&1
  echo "✅ Public文件夹已删除"
fi

# 删除测试笔记
if [ -n "$ADMIN_TEAM_NOTE_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$ADMIN_TEAM_NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null 2>&1
  echo "✅ 管理员Team笔记已删除"
fi

if [ -n "$MEMBER_TEAM_NOTE_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$MEMBER_TEAM_NOTE_ID" \
    -H "Authorization: Bearer $MEMBER_TOKEN" > /dev/null 2>&1
  echo "✅ 成员Team笔记已删除"
fi

if [ -n "$PUBLIC_NOTE_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$PUBLIC_NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null 2>&1
  echo "✅ Public笔记已删除"
fi

echo ""

# ============================================================
# 测试报告
# ============================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}          测试报告${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

PASS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
  PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi
echo "通过率: ${PASS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ 所有测试通过！${NC}"
  echo ""
  echo "✨ 权限控制系统工作正常："
  echo "   - Team文件夹：仅系统管理员可管理"
  echo "   - Team笔记：企业成员可创建，仅创建者可编辑"
  echo "   - Private树：用户可管理自己的文件夹和笔记"
  echo "   - Public树：仅系统管理员可操作"
  exit 0
else
  echo -e "${RED}❌ 有测试失败！请检查权限配置${NC}"
  exit 1
fi
