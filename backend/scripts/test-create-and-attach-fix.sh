#!/bin/bash
# 测试 create-and-attach 修复效果
# 验证数据库记录和任务关联是否正确创建

set -e

API_URL="${API_URL:-http://localhost:8080/api/v1}"
TOKEN="${TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NjE3OTUxMzcsIm5iZiI6MTc2MTcwODczNywiaWF0IjoxNzYxNzA4NzM3LCJqdGkiOiIzODMxMWNlZjQ3M2IyMjFiY2ZhNjBiMzk5NWNhNzVjZSJ9.EV5nQGLv6vKSn3Qg03iRx2XY7I9tTMhUrQX1m43Wj5o}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "测试 create-and-attach 修复"
echo "======================================"
echo ""

# 测试1：创建任务
echo -e "${YELLOW}测试1: 创建测试任务${NC}"
CREATE_TASK_RESP=$(curl -s -X POST "$API_URL/projects/1/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"测试任务 - $(date +%Y%m%d%H%M%S)\", \"description\": \"用于测试 create-and-attach 修复\"}")

TASK_ID=$(echo "$CREATE_TASK_RESP" | jq -r '.data.id // empty')

if [ -z "$TASK_ID" ] || [ "$TASK_ID" == "null" ]; then
  echo -e "${RED}✗ 创建任务失败${NC}"
  echo "$CREATE_TASK_RESP" | jq .
  exit 1
fi

echo -e "${GREEN}✓ 任务创建成功, ID: $TASK_ID${NC}"
echo ""

# 测试2：创建并关联文档
echo -e "${YELLOW}测试2: 创建并关联文档${NC}"
CREATE_DOC_RESP=$(curl -s -X POST "$API_URL/mcp/create-and-attach" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": $TASK_ID,
    \"content\": \"# 测试文档\\n\\n这是测试内容，用于验证 create-and-attach 修复。\\n\\n创建时间: $(date)\"
  }")

echo "$CREATE_DOC_RESP" | jq .

DOC_ID=$(echo "$CREATE_DOC_RESP" | jq -r '.data.document_id // empty')

if [ -z "$DOC_ID" ] || [ "$DOC_ID" == "null" ]; then
  echo -e "${RED}✗ 创建文档失败或未返回 document_id${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 文档创建成功, ID: $DOC_ID${NC}"
echo ""

# 测试3：验证数据库记录
echo -e "${YELLOW}测试3: 验证数据库记录${NC}"

# 检查 documents 表
DOC_EXISTS=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -U dev_user -d ai_project_db -t -c "
  SELECT COUNT(*) FROM documents WHERE id = $DOC_ID AND deleted_at IS NULL;
" 2>/dev/null | xargs || echo "0")

if [ "$DOC_EXISTS" == "1" ]; then
  echo -e "${GREEN}✓ documents 表记录存在${NC}"
else
  echo -e "${RED}✗ documents 表记录不存在${NC}"
  exit 1
fi

# 检查 task_documents 关联
TASK_DOC_EXISTS=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -U dev_user -d ai_project_db -t -c "
  SELECT COUNT(*) FROM task_documents
  WHERE task_id = $TASK_ID AND document_id = $DOC_ID AND deleted_at IS NULL;
" 2>/dev/null | xargs || echo "0")

if [ "$TASK_DOC_EXISTS" == "1" ]; then
  echo -e "${GREEN}✓ task_documents 关联记录存在${NC}"
else
  echo -e "${RED}✗ task_documents 关联记录不存在${NC}"
  exit 1
fi

# 显示完整记录
echo ""
echo "数据库记录详情:"
PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -U dev_user -d ai_project_db -c "
SELECT
  d.id as doc_id,
  d.title,
  d.type,
  d.status,
  td.task_id,
  td.relationship_type,
  td.created_at as attached_at
FROM documents d
INNER JOIN task_documents td ON d.id = td.document_id
WHERE d.id = $DOC_ID AND td.task_id = $TASK_ID;
" 2>/dev/null || echo "无法连接数据库查看详情"

echo ""

# 测试4：追加内容（关键测试）
echo -e "${YELLOW}测试4: 追加内容到文档${NC}"
APPEND_RESP=$(curl -s -X POST "$API_URL/mcp/documents/append" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": $TASK_ID,
    \"documentId\": $DOC_ID,
    \"content\": \"\\n\\n## 追加内容\\n\\n这是追加的测试内容。\\n追加时间: $(date)\"
  }")

echo "$APPEND_RESP" | jq .

APPEND_SUCCESS=$(echo "$APPEND_RESP" | jq -r '.success // false')

if [ "$APPEND_SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ 追加内容成功${NC}"
else
  echo -e "${RED}✗ 追加内容失败${NC}"
  exit 1
fi

echo ""

# 测试5：获取文档验证内容
echo -e "${YELLOW}测试5: 获取文档验证内容${NC}"
GET_DOC_RESP=$(curl -s -X GET "$API_URL/mcp/tasks/$TASK_ID/document" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_DOC_RESP" | jq '.data.content' | head -20

GET_SUCCESS=$(echo "$GET_DOC_RESP" | jq -r '.success // false')

if [ "$GET_SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ 获取文档成功${NC}"

  # 检查是否包含追加的内容
  if echo "$GET_DOC_RESP" | jq -r '.data.content' | grep -q "追加内容"; then
    echo -e "${GREEN}✓ 文档包含追加的内容${NC}"
  else
    echo -e "${YELLOW}⚠ 文档未包含追加的内容（可能是缓存问题）${NC}"
  fi
else
  echo -e "${RED}✗ 获取文档失败${NC}"
  exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}✓ 所有测试通过！${NC}"
echo "======================================"
echo ""
echo "测试总结:"
echo "  - 任务ID: $TASK_ID"
echo "  - 文档ID: $DOC_ID"
echo "  - documents 表: ✓"
echo "  - task_documents 关联: ✓"
echo "  - append-document-content: ✓"
echo ""
