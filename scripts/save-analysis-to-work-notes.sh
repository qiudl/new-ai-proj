#!/bin/bash

# 保存工作笔记CRUD分析报告到工作笔记系统
# 使用说明：确保后端服务运行在 localhost:8080

API_BASE_URL="${API_BASE_URL:-http://localhost:8080/api/v1}"
ANALYSIS_FILE="docs/work-notes-crud-analysis.md"

echo "📝 开始保存工作笔记CRUD分析报告..."

# 1. 获取认证token
echo "🔐 正在获取认证token..."
TOKEN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}')

if [ $? -ne 0 ]; then
  echo "❌ 无法连接到后端服务 (${API_BASE_URL})"
  echo "请确保后端服务已启动"
  exit 1
fi

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 获取token失败"
  echo "响应: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ 成功获取token: ${TOKEN:0:20}..."

# 2. 读取markdown文件内容
if [ ! -f "$ANALYSIS_FILE" ]; then
  echo "❌ 找不到文件: $ANALYSIS_FILE"
  exit 1
fi

CONTENT=$(cat "$ANALYSIS_FILE")

# 3. 创建工作笔记
echo "📤 正在创建工作笔记..."

# 使用jq构造JSON（正确处理特殊字符和换行）
PAYLOAD=$(jq -n \
  --arg title "工作笔记模块CRUD功能检查报告" \
  --arg content "$CONTENT" \
  --arg desc "全面检查工作笔记模块的CRUD功能实现，发现17个问题并制定4阶段改进方案" \
  '{
    title: $title,
    content: $content,
    work_note_type: "log",
    priority: "high",
    description: $desc,
    tags: ["CRUD检查", "工作笔记", "技术分析", "改进方案"],
    visibility: "team",
    is_pinned: true,
    is_bookmarked: true
  }')

RESPONSE=$(curl -s -X POST "${API_BASE_URL}/work-notes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# 4. 检查结果
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  NOTE_ID=$(echo "$RESPONSE" | jq -r '.data.id')
  NOTE_TITLE=$(echo "$RESPONSE" | jq -r '.data.title')

  echo "✅ 工作笔记创建成功！"
  echo ""
  echo "📋 笔记信息:"
  echo "  ID: $NOTE_ID"
  echo "  标题: $NOTE_TITLE"
  echo "  类型: 工作日志 (log)"
  echo "  优先级: 高 (high)"
  echo "  状态: 已置顶 + 已收藏"
  echo ""
  echo "🔗 访问链接: http://localhost:3000/work-notes/${NOTE_ID}"

  # 保存笔记ID到文件
  echo "$NOTE_ID" > .last-created-note-id
  echo ""
  echo "💡 提示: 笔记ID已保存到 .last-created-note-id"

  exit 0
else
  echo "❌ 创建工作笔记失败"
  echo ""
  echo "错误信息:"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
