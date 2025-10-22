#!/bin/bash

# 保存工作笔记CRUD分析报告到远程服务器
# 远程URL: https://proj.joylodging.com

set -e

API_BASE_URL="https://proj.joylodging.com/api/v1"
ANALYSIS_FILE="docs/work-notes-crud-analysis.md"

# 使用提供的JWT token（请确保token未过期）
TOKEN="${JWT_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NjExODAxMDQsIm5iZiI6MTc2MTA5MzcwNCwiaWF0IjoxNzYxMDkzNzA0LCJqdGkiOiIyNmYyNzk0NWM0MjRmZWU1OWE0Zjc0NDgyNTE1MDJjYSJ9.ySRTLu_8BbXnpjIeSJdNa3ldpde9Sbyk-nFEMXf-ZCk}"

echo "📝 保存工作笔记CRUD分析报告到远程服务器..."
echo "🌐 服务器: ${API_BASE_URL}"
echo ""

# 检查文件是否存在
if [ ! -f "$ANALYSIS_FILE" ]; then
  echo "❌ 找不到文件: $ANALYSIS_FILE"
  exit 1
fi

# 检查token过期时间
echo "🔍 检查token有效期..."
EXP_TIME=$(echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.exp')
EXP_DATE=$(date -d @$EXP_TIME 2>/dev/null || echo "无法解析")
echo "   Token过期时间: $EXP_DATE"
echo ""

# 读取文件内容
echo "📖 读取分析报告..."
CONTENT=$(cat "$ANALYSIS_FILE")
CONTENT_LENGTH=$(echo "$CONTENT" | wc -c)
echo "   文件大小: ${CONTENT_LENGTH} 字节"
echo ""

# 构造JSON请求
echo "🔧 构造请求数据..."
PAYLOAD=$(jq -n \
  --arg title "工作笔记模块CRUD功能检查报告" \
  --arg content "$CONTENT" \
  --arg desc "全面检查工作笔记模块的CRUD功能实现，发现17个问题并制定4阶段改进方案。包括后端API、服务层、前端服务的完整分析，以及详细的改进计划和时间表。" \
  '{
    title: $title,
    content: $content,
    work_note_type: "log",
    priority: "high",
    description: $desc,
    tags: ["CRUD检查", "工作笔记", "技术分析", "改进方案", "系统报告"],
    visibility: "team",
    is_pinned: true,
    is_bookmarked: true
  }')

echo "   请求数据大小: $(echo "$PAYLOAD" | wc -c) 字节"
echo ""

# 发送创建请求
echo "📤 发送创建请求..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${API_BASE_URL}/work-notes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# 提取HTTP状态码和响应体
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "   HTTP状态码: $HTTP_CODE"
echo ""

# 检查结果
if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  # 解析响应
  SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null || echo "false")

  if [ "$SUCCESS" == "true" ]; then
    NOTE_ID=$(echo "$BODY" | jq -r '.data.id')
    NOTE_TITLE=$(echo "$BODY" | jq -r '.data.title')
    NOTE_TYPE=$(echo "$BODY" | jq -r '.data.work_note_type')
    NOTE_PRIORITY=$(echo "$BODY" | jq -r '.data.priority')
    CREATED_AT=$(echo "$BODY" | jq -r '.data.created_at')

    echo "✅ 工作笔记创建成功！"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 笔记信息"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ID:        $NOTE_ID"
    echo "  标题:      $NOTE_TITLE"
    echo "  类型:      $NOTE_TYPE"
    echo "  优先级:    $NOTE_PRIORITY"
    echo "  创建时间:  $CREATED_AT"
    echo "  状态:      ✨ 已置顶 + 已收藏"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔗 访问链接:"
    echo "   https://proj.joylodging.com/work-notes/${NOTE_ID}"
    echo ""

    # 保存笔记ID
    echo "$NOTE_ID" > .last-created-note-id
    echo "💾 笔记ID已保存到 .last-created-note-id"

    exit 0
  else
    echo "❌ 创建失败 - 服务器返回success=false"
    echo ""
    echo "响应详情:"
    echo "$BODY" | jq '.'
    exit 1
  fi
elif [ "$HTTP_CODE" == "403" ]; then
  echo "❌ 访问被拒绝 (403)"
  echo ""
  echo "可能的原因:"
  echo "  1. Token已过期或无效"
  echo "  2. IP地址不在白名单中"
  echo "  3. 需要额外的认证权限"
  echo ""
  echo "建议:"
  echo "  - 在本地开发环境或受信任的服务器上运行此脚本"
  echo "  - 检查token是否过期（当前过期时间: $EXP_DATE）"
  echo "  - 或使用 dev-quick-login 获取新token"
  exit 1
elif [ "$HTTP_CODE" == "401" ]; then
  echo "❌ 未授权 (401) - Token无效或已过期"
  echo ""
  echo "请获取新的token后重试:"
  echo "  export JWT_TOKEN='your-new-token'"
  echo "  ./scripts/save-analysis-remote.sh"
  exit 1
else
  echo "❌ 创建失败 - HTTP $HTTP_CODE"
  echo ""
  echo "完整响应:"
  echo "$BODY"
  exit 1
fi
