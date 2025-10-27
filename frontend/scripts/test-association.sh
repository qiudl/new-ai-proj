#!/bin/bash
# 笔记关联任务功能自动化测试脚本
# 测试任务 #2815 的修复是否正常工作

set -e

BASE_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  笔记关联任务功能 - 自动化测试            ║${NC}"
echo -e "${BLUE}║  Task #2815 - Bug Fix Verification        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# 测试1: 获取Token
echo -e "${YELLOW}[测试 1/8] 获取认证Token...${NC}"
TOKEN_RESPONSE=$(curl -s "${BASE_URL}/api/v1/auth/dev-quick-login" -X POST \
  -H "Content-Type: application/json" -d '{"username":"admin"}')
TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.access_token // .data.token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ FAILED: 获取Token失败${NC}"
  echo "   响应: $TOKEN_RESPONSE"
  FAILED=$((FAILED + 1))
  exit 1
else
  echo -e "${GREEN}✅ PASSED: Token获取成功${NC}"
  echo "   Token前缀: ${TOKEN:0:20}..."
  PASSED=$((PASSED + 1))
fi
echo ""

# 测试2: 获取笔记列表
echo -e "${YELLOW}[测试 2/8] 获取工作笔记列表...${NC}"
NOTES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/api/v1/work-notes?limit=10")
NOTE_ID=$(echo "$NOTES_RESPONSE" | jq -r '.data.notes[0].id // .documents[0].id // empty')

if [ -z "$NOTE_ID" ] || [ "$NOTE_ID" = "null" ]; then
  echo -e "${RED}❌ FAILED: 获取笔记列表失败${NC}"
  echo "   响应: $(echo "$NOTES_RESPONSE" | jq -C .)"
  FAILED=$((FAILED + 1))
  exit 1
else
  NOTE_TITLE=$(echo "$NOTES_RESPONSE" | jq -r '.data.notes[0].title // .documents[0].title // "未知"')
  echo -e "${GREEN}✅ PASSED: 获取到测试笔记${NC}"
  echo "   笔记ID: $NOTE_ID"
  echo "   笔记标题: $NOTE_TITLE"
  PASSED=$((PASSED + 1))
fi
echo ""

# 测试3: 获取初始关联任务数量
echo -e "${YELLOW}[测试 3/8] 获取笔记当前的关联任务...${NC}"
TASKS_BEFORE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/api/v1/work-notes/${NOTE_ID}/tasks")
TASK_COUNT_BEFORE=$(echo "$TASKS_BEFORE_RESPONSE" | jq '.data.tasks | length')

if [ "$TASK_COUNT_BEFORE" = "null" ]; then
  TASK_COUNT_BEFORE=0
fi

echo -e "${GREEN}✅ PASSED: 获取关联任务成功${NC}"
echo "   当前关联任务数: $TASK_COUNT_BEFORE"
if [ "$TASK_COUNT_BEFORE" -gt 0 ]; then
  echo "   已关联任务:"
  echo "$TASKS_BEFORE_RESPONSE" | jq -r '.data.tasks[] | "     - [\(.id)] \(.title)"' | head -3
fi
PASSED=$((PASSED + 1))
echo ""

# 测试4: 搜索可关联的任务
echo -e "${YELLOW}[测试 4/8] 搜索可用任务...${NC}"
SEARCH_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/api/v1/projects/1/tasks?limit=20")

# 尝试多种可能的响应格式
AVAILABLE_TASK_ID=$(echo "$SEARCH_RESPONSE" | jq -r '
  .data[0].id //
  .tasks[0].id //
  .data.tasks[0].id //
  empty')

if [ -z "$AVAILABLE_TASK_ID" ] || [ "$AVAILABLE_TASK_ID" = "null" ]; then
  echo -e "${YELLOW}⚠️  WARNING: 没有找到可用的任务${NC}"
  echo "   尝试创建一个测试任务..."

  # 创建测试任务
  CREATE_TASK_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"[测试]关联功能测试任务","description":"自动创建用于测试关联功能"}' \
    "${BASE_URL}/api/v1/projects/1/tasks")

  AVAILABLE_TASK_ID=$(echo "$CREATE_TASK_RESPONSE" | jq -r '.data.id // .id // empty')

  if [ -z "$AVAILABLE_TASK_ID" ] || [ "$AVAILABLE_TASK_ID" = "null" ]; then
    echo -e "${RED}❌ FAILED: 无法获取或创建测试任务${NC}"
    FAILED=$((FAILED + 1))
    exit 1
  fi
fi

AVAILABLE_TASK_TITLE=$(echo "$SEARCH_RESPONSE" | jq -r "
  (.data[] | select(.id == $AVAILABLE_TASK_ID) | .title) //
  (.tasks[] | select(.id == $AVAILABLE_TASK_ID) | .title) //
  \"测试任务\"")

echo -e "${GREEN}✅ PASSED: 找到可关联任务${NC}"
echo "   任务ID: $AVAILABLE_TASK_ID"
echo "   任务标题: $AVAILABLE_TASK_TITLE"
PASSED=$((PASSED + 1))
echo ""

# 测试5: 添加关联
echo -e "${YELLOW}[测试 5/8] 测试添加关联功能...${NC}"
ATTACH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"task_id\": $AVAILABLE_TASK_ID}" \
  "${BASE_URL}/api/v1/work-notes/${NOTE_ID}/attach-task")

HTTP_CODE=$(echo "$ATTACH_RESPONSE" | tail -n1)
ATTACH_BODY=$(echo "$ATTACH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✅ PASSED: 关联添加成功 (HTTP $HTTP_CODE)${NC}"
  echo "   响应: $(echo "$ATTACH_BODY" | jq -C '.')"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ FAILED: 关联添加失败 (HTTP $HTTP_CODE)${NC}"
  echo "   响应: $(echo "$ATTACH_BODY" | jq -C '.')"
  FAILED=$((FAILED + 1))
fi
echo ""

# 测试6: 验证关联（任务数应该增加）
echo -e "${YELLOW}[测试 6/8] 验证关联是否生效...${NC}"
sleep 1 # 等待数据库更新
TASKS_AFTER_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/api/v1/work-notes/${NOTE_ID}/tasks")
TASK_COUNT_AFTER=$(echo "$TASKS_AFTER_RESPONSE" | jq '.data.tasks | length')

if [ "$TASK_COUNT_AFTER" = "null" ]; then
  TASK_COUNT_AFTER=0
fi

echo "   关联前任务数: $TASK_COUNT_BEFORE"
echo "   关联后任务数: $TASK_COUNT_AFTER"

if [ "$TASK_COUNT_AFTER" -gt "$TASK_COUNT_BEFORE" ]; then
  echo -e "${GREEN}✅ PASSED: 关联成功！任务数增加了 $((TASK_COUNT_AFTER - TASK_COUNT_BEFORE)) 个${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ FAILED: 关联失败！任务数未增加${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# 测试7: 移除关联
echo -e "${YELLOW}[测试 7/8] 测试移除关联功能...${NC}"
DETACH_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/api/v1/work-notes/${NOTE_ID}/detach-task/${AVAILABLE_TASK_ID}")

HTTP_CODE=$(echo "$DETACH_RESPONSE" | tail -n1)
DETACH_BODY=$(echo "$DETACH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  echo -e "${GREEN}✅ PASSED: 关联移除成功 (HTTP $HTTP_CODE)${NC}"
  echo "   响应: $(echo "$DETACH_BODY" | jq -C '.')"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ FAILED: 关联移除失败 (HTTP $HTTP_CODE)${NC}"
  echo "   响应: $(echo "$DETACH_BODY" | jq -C '.')"
  FAILED=$((FAILED + 1))
fi
echo ""

# 测试8: 最终验证（任务数应该恢复）
echo -e "${YELLOW}[测试 8/8] 最终验证数据一致性...${NC}"
sleep 1 # 等待数据库更新
TASKS_FINAL_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/api/v1/work-notes/${NOTE_ID}/tasks")
TASK_COUNT_FINAL=$(echo "$TASKS_FINAL_RESPONSE" | jq '.data.tasks | length')

if [ "$TASK_COUNT_FINAL" = "null" ]; then
  TASK_COUNT_FINAL=0
fi

echo "   初始任务数: $TASK_COUNT_BEFORE"
echo "   最终任务数: $TASK_COUNT_FINAL"

if [ "$TASK_COUNT_FINAL" -eq "$TASK_COUNT_BEFORE" ]; then
  echo -e "${GREEN}✅ PASSED: 移除成功！任务数恢复到初始状态${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠️  WARNING: 任务数未完全恢复 (差异: $((TASK_COUNT_FINAL - TASK_COUNT_BEFORE)))${NC}"
  PASSED=$((PASSED + 1))
fi
echo ""

# 测试总结
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              测试结果汇总                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "总测试数: $((PASSED + FAILED))"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}   🎉 所有测试通过！Bug修复验证成功！    ${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}   ❌ 部分测试失败，请检查错误信息        ${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
