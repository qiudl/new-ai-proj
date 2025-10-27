#!/bin/bash

# 团队笔记权限控制综合测试
# 测试范围：
# 1. 数据库权限函数（is_enterprise_admin, can_manage_team_folder, can_create_team_note）
# 2. Team文件夹管理权限（创建、编辑、删除）
# 3. Team笔记创建和编辑权限
# 4. Private和Public权限验证

set -e

BASE_URL="http://localhost:8080"
DB_CONNECTION="postgresql://ai_prod_user:SecureAI2024!@#\$%^@127.0.0.1:5433/ai_project_prod"

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
  local expected="$2"
  local actual="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$expected" = "$actual" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    echo -e "   Expected: $expected, Got: $actual"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   团队笔记权限控制综合测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo "测试服务器: $BASE_URL"
echo "数据库: ai_project_prod"
echo ""

# ============================================================
# Phase 1: 数据库权限函数测试
# ============================================================
echo -e "${BLUE}=== Phase 1: 数据库权限函数测试 ===${NC}"
echo ""

# 准备测试数据：确保有企业和用户数据
echo "📝 准备测试数据..."

# 检查并创建测试企业（如果不存在）
ENTERPRISE_ID=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  INSERT INTO enterprises (name, code, status, industry, employee_count)
  VALUES ('测试企业-权限测试', 'TEST_PERM_ENT', 'active', 'technology', 100)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id;
" | tr -d '[:space:]')

echo "   测试企业ID: $ENTERPRISE_ID"

# 创建测试用户
# 1. 企业管理员用户（access_level = 4）
ADMIN_USER_ID=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  INSERT INTO users (username, email, password, user_type, status)
  VALUES ('test_admin_user', 'test_admin@test.com', 'hashed_password', 'system', 'active')
  ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
  RETURNING id;
" | tr -d '[:space:]')

# 添加到企业并设置为管理员
PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -c "
  INSERT INTO enterprise_users (enterprise_id, user_id, access_level, can_make_decisions, status, position)
  VALUES ($ENTERPRISE_ID, $ADMIN_USER_ID, 4, true, 'active', 'Manager')
  ON CONFLICT (enterprise_id, user_id) DO UPDATE
  SET access_level = 4, can_make_decisions = true;
" > /dev/null

echo "   企业管理员用户ID: $ADMIN_USER_ID"

# 2. 普通成员用户（access_level = 2）
MEMBER_USER_ID=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  INSERT INTO users (username, email, password, user_type, status)
  VALUES ('test_member_user', 'test_member@test.com', 'hashed_password', 'regular', 'active')
  ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
  RETURNING id;
" | tr -d '[:space:]')

PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -c "
  INSERT INTO enterprise_users (enterprise_id, user_id, access_level, can_make_decisions, status, position)
  VALUES ($ENTERPRISE_ID, $MEMBER_USER_ID, 2, false, 'active', 'Employee')
  ON CONFLICT (enterprise_id, user_id) DO UPDATE
  SET access_level = 2, can_make_decisions = false;
" > /dev/null

echo "   普通成员用户ID: $MEMBER_USER_ID"

# 3. 非企业用户
NON_MEMBER_USER_ID=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  INSERT INTO users (username, email, password, user_type, status)
  VALUES ('test_non_member', 'test_non@test.com', 'hashed_password', 'regular', 'active')
  ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
  RETURNING id;
" | tr -d '[:space:]')

echo "   非企业用户ID: $NON_MEMBER_USER_ID"
echo ""

# Test 1.1: is_enterprise_admin() - 企业管理员
echo "Test 1.1: is_enterprise_admin() - 测试企业管理员"
RESULT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  SELECT is_enterprise_admin($ADMIN_USER_ID);
" | tr -d '[:space:]')
test_result "企业管理员应返回true" "t" "$RESULT"
echo ""

# Test 1.2: is_enterprise_admin() - 普通成员
echo "Test 1.2: is_enterprise_admin() - 测试普通成员"
RESULT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  SELECT is_enterprise_admin($MEMBER_USER_ID);
" | tr -d '[:space:]')
test_result "普通成员应返回false" "f" "$RESULT"
echo ""

# Test 1.3: is_enterprise_admin() - 非企业用户
echo "Test 1.3: is_enterprise_admin() - 测试非企业用户"
RESULT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  SELECT is_enterprise_admin($NON_MEMBER_USER_ID);
" | tr -d '[:space:]')
test_result "非企业用户应返回false" "f" "$RESULT"
echo ""

# Test 1.4: can_manage_team_folder() - 企业管理员可以管理
echo "Test 1.4: can_manage_team_folder() - 企业管理员创建文件夹"
RESULT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  SELECT can_manage_team_folder($ADMIN_USER_ID, NULL, 'create');
" | tr -d '[:space:]')
test_result "企业管理员可以创建团队文件夹" "t" "$RESULT"
echo ""

# Test 1.5: can_manage_team_folder() - 普通成员不能管理
echo "Test 1.5: can_manage_team_folder() - 普通成员创建文件夹"
RESULT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  SELECT can_manage_team_folder($MEMBER_USER_ID, NULL, 'create');
" | tr -d '[:space:]')
test_result "普通成员不能创建团队文件夹" "f" "$RESULT"
echo ""

# Test 1.6: can_create_team_note() - 企业成员可以创建笔记
echo "Test 1.6: can_create_team_note() - 企业成员创建笔记"
RESULT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  SELECT can_create_team_note($MEMBER_USER_ID);
" | tr -d '[:space:]')
test_result "企业成员可以创建团队笔记" "t" "$RESULT"
echo ""

# Test 1.7: can_create_team_note() - 非企业用户不能创建笔记
echo "Test 1.7: can_create_team_note() - 非企业用户创建笔记"
RESULT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -c "
  SELECT can_create_team_note($NON_MEMBER_USER_ID);
" | tr -d '[:space:]')
test_result "非企业用户不能创建团队笔记" "f" "$RESULT"
echo ""

# ============================================================
# Phase 2: Team文件夹API权限测试
# ============================================================
echo -e "${BLUE}=== Phase 2: Team文件夹API权限测试 ===${NC}"
echo ""

# 获取测试用户的token
echo "📝 获取测试用户token..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/dev-quick-login" \
  -H "Content-Type: application/json" | jq -r '.data.access_token // .data.token // .token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ 无法获取系统管理员token${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 系统管理员token获取成功${NC}"
echo ""

# Test 2.1: 系统管理员创建Team文件夹（应成功）
echo "Test 2.1: 系统管理员创建Team文件夹"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-note-folders/trees/team/folders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "权限测试-Team文件夹",
    "description": "测试Team文件夹权限"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
TEAM_FOLDER_ID=$(echo "$BODY" | jq -r '.data.id // empty')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  test_result "系统管理员创建Team文件夹" "SUCCESS" "SUCCESS"
  echo "   文件夹ID: $TEAM_FOLDER_ID"
else
  test_result "系统管理员创建Team文件夹" "SUCCESS" "FAILED (HTTP $HTTP_CODE)"
  echo "   响应: $BODY"
fi
echo ""

# Test 2.2: 系统管理员更新Team文件夹（应成功）
if [ -n "$TEAM_FOLDER_ID" ]; then
  echo "Test 2.2: 系统管理员更新Team文件夹"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-note-folders/$TEAM_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "权限测试-Team文件夹(已更新)",
      "description": "更新描述"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" = "200" ]; then
    test_result "系统管理员更新Team文件夹" "SUCCESS" "SUCCESS"
  else
    test_result "系统管理员更新Team文件夹" "SUCCESS" "FAILED (HTTP $HTTP_CODE)"
  fi
  echo ""
fi

# ============================================================
# Phase 3: Team笔记API权限测试
# ============================================================
echo -e "${BLUE}=== Phase 3: Team笔记API权限测试 ===${NC}"
echo ""

# Test 3.1: 系统管理员创建Team笔记（应成功 - 因为system admin也是企业成员或超级用户）
echo "Test 3.1: 系统管理员创建Team笔记"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/work-notes" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "权限测试-Team笔记",
    "content": "这是一条团队笔记",
    "work_note_type": "general",
    "visibility": "team",
    "priority": "medium"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
TEAM_NOTE_ID=$(echo "$BODY" | jq -r '.data.id // empty')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  test_result "系统管理员创建Team笔记" "SUCCESS" "SUCCESS"
  echo "   笔记ID: $TEAM_NOTE_ID"
else
  test_result "系统管理员创建Team笔记" "SUCCESS" "FAILED (HTTP $HTTP_CODE)"
  echo "   响应: $BODY"
fi
echo ""

# Test 3.2: 笔记创建者编辑自己的Team笔记（应成功）
if [ -n "$TEAM_NOTE_ID" ]; then
  echo "Test 3.2: 笔记创建者编辑自己的Team笔记"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/work-notes/$TEAM_NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "权限测试-Team笔记(已更新)",
      "content": "更新内容"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" = "200" ]; then
    test_result "笔记创建者编辑自己的Team笔记" "SUCCESS" "SUCCESS"
  else
    test_result "笔记创建者编辑自己的Team笔记" "SUCCESS" "FAILED (HTTP $HTTP_CODE)"
  fi
  echo ""
fi

# ============================================================
# Phase 4: Private和Public权限验证
# ============================================================
echo -e "${BLUE}=== Phase 4: Private和Public权限验证 ===${NC}"
echo ""

# Test 4.1: 用户创建Private文件夹（应成功）
echo "Test 4.1: 用户创建Private文件夹"
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
  test_result "用户创建Private文件夹" "SUCCESS" "SUCCESS"
  echo "   文件夹ID: $PRIVATE_FOLDER_ID"
else
  test_result "用户创建Private文件夹" "SUCCESS" "FAILED (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4.2: 系统管理员创建Public文件夹（应成功）
echo "Test 4.2: 系统管理员创建Public文件夹"
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
  test_result "系统管理员创建Public文件夹" "SUCCESS" "SUCCESS"
  echo "   文件夹ID: $PUBLIC_FOLDER_ID"
else
  test_result "系统管理员创建Public文件夹" "SUCCESS" "FAILED (HTTP $HTTP_CODE)"
fi
echo ""

# ============================================================
# 清理测试数据
# ============================================================
echo -e "${BLUE}=== 清理测试数据 ===${NC}"
echo ""

# 删除测试文件夹
if [ -n "$TEAM_FOLDER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-note-folders/$TEAM_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "✅ Team文件夹已删除"
fi

if [ -n "$PRIVATE_FOLDER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-note-folders/$PRIVATE_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "✅ Private文件夹已删除"
fi

if [ -n "$PUBLIC_FOLDER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-note-folders/$PUBLIC_FOLDER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "✅ Public文件夹已删除"
fi

# 删除测试笔记
if [ -n "$TEAM_NOTE_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/v1/work-notes/$TEAM_NOTE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "✅ Team笔记已删除"
fi

# 删除测试用户
PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -c "
  DELETE FROM enterprise_users WHERE user_id IN ($ADMIN_USER_ID, $MEMBER_USER_ID);
  DELETE FROM users WHERE id IN ($ADMIN_USER_ID, $MEMBER_USER_ID, $NON_MEMBER_USER_ID);
" > /dev/null 2>&1

echo "✅ 测试用户已删除"
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

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}❌ 有测试失败！${NC}"
  exit 1
fi
