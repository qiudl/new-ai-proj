#!/bin/bash

# 使用MCP接口创建工作笔记
# API Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06

API_KEY="mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06"
MCP_BASE="https://proj.joylodging.com/mcp"

# 读取分析报告内容
CONTENT=$(cat docs/work-notes-crud-analysis.md)

# 构造MCP消息请求
REQUEST_ID=$(date +%s)

# MCP消息格式
MESSAGE=$(jq -n \
  --arg id "$REQUEST_ID" \
  --arg method "tools/call" \
  --arg tool "create_work_note" \
  --arg title "工作笔记模块CRUD功能检查报告" \
  --arg content "$CONTENT" \
  --arg desc "全面检查工作笔记模块的CRUD功能实现，发现17个问题并制定4阶段改进方案" \
  '{
    jsonrpc: "2.0",
    id: $id,
    method: $method,
    params: {
      name: $tool,
      arguments: {
        title: $title,
        content: $content,
        work_note_type: "log",
        priority: "high",
        description: $desc,
        tags: ["CRUD检查", "工作笔记", "技术分析", "改进方案"],
        visibility: "team",
        is_pinned: true,
        is_bookmarked: true
      }
    }
  }')

echo "发送MCP请求..."

# 发送到MCP消息端点
curl -X POST "${MCP_BASE}/message" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$MESSAGE" | jq '.'
