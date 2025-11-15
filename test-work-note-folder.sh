#!/bin/bash

# 测试工作笔记文件夹关联

# 1. 获取JWT token
echo "=== 1. 获取JWT Token ==="
source ~/.ai-proj-jwt.env
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. 获取文件夹列表
echo "=== 2. 获取文件夹列表 ==="
FOLDERS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/work-note-folders/tree" | jq -r '.data[0].id // empty')

if [ -z "$FOLDERS" ]; then
  echo "❌ 没有找到文件夹"
  exit 1
fi

FOLDER_ID=$FOLDERS
echo "✓ 找到文件夹ID: $FOLDER_ID"
echo ""

# 3. 创建工作笔记并关联文件夹
echo "=== 3. 创建工作笔记 (folder_id=$FOLDER_ID) ==="
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/v1/work-notes" \
  -d "{
    \"title\": \"测试文件夹关联 $(date +%H:%M:%S)\",
    \"content\": \"这是一个测试笔记，用于验证folder_id关联\",
    \"folder_id\": $FOLDER_ID,
    \"work_note_type\": \"general\",
    \"visibility\": \"private\"
  }")

echo "$RESPONSE" | jq '.'

# 4. 提取创建的笔记ID和folder_id
NOTE_ID=$(echo "$RESPONSE" | jq -r '.data.id // empty')
RETURNED_FOLDER_ID=$(echo "$RESPONSE" | jq -r '.data.folder_id // empty')

echo ""
echo "=== 4. 验证结果 ==="
if [ -z "$NOTE_ID" ]; then
  echo "❌ 创建失败"
  exit 1
fi

echo "✓ 创建的笔记ID: $NOTE_ID"
echo "  发送的folder_id: $FOLDER_ID"
echo "  返回的folder_id: $RETURNED_FOLDER_ID"

if [ "$RETURNED_FOLDER_ID" = "null" ] || [ -z "$RETURNED_FOLDER_ID" ]; then
  echo "❌ folder_id 为空，关联失败！"
else
  echo "✓ folder_id 关联成功！"
fi

# 5. 从数据库直接查询验证
echo ""
echo "=== 5. 数据库验证 ==="
PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_user -d ai_project_db -c \
  "SELECT id, title, folder_id FROM documents WHERE id = $NOTE_ID;"
