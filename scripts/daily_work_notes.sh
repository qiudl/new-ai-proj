#!/usr/bin/env bash
# Daily Work Notes generator (to be run by Jenkins Docker Agent via cron or pipeline step)
# Safe defaults: no secrets inline; use API with bearer from env if needed.
# Usage: configure BASE_URL and AUTH_HEADER via environment variables in Jenkins.

set -euo pipefail

BASE_URL=${BASE_URL:-"http://localhost:8080/api/v1"}
USER_ID=${USER_ID:-"1"}
PROJECT_ID=${PROJECT_ID:-"1"}
TASK_ID=${TASK_ID:-""} # Optional: attach note to a specific task
DATE_STR=$(date +%F)
TITLE="工作笔记 - ${DATE_STR}"
CONTENT_TEMPLATE=$(cat <<'EOF'
# 工作笔记 - {DATE}

## 今日计划
- [ ] 

## 今日进展
- 完成：
- 产出链接：

## 问题与阻塞
- 问题：
- 外部依赖/协作请求：

## 明日安排
- [ ] 

## 时间记录
- {NOW} 开始 / 结束：
EOF
)
CONTENT=${CONTENT_TEMPLATE//\{DATE\}/$DATE_STR}
CONTENT=${CONTENT//\{NOW\}/$(date +"%F %T")}

# Requires authentication; if your API uses JWT, set AUTH_HEADER accordingly.
AUTH_HEADER=${AUTH_HEADER:-""}

if command -v jq >/dev/null 2>&1; then
  CONTENT_JSON=$(jq -Rn --arg c "$CONTENT" '$c')
else
  # Fallback: naive JSON escaping (limited)
  CONTENT_JSON="\"${CONTENT//\"/\\\"}\""
fi

if [[ -n "$TASK_ID" ]]; then
  # Create and attach to task atomically
  curl -sS -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/documents/create-and-attach" \
    -H "Content-Type: application/json" \
    ${AUTH_HEADER:+-H "Authorization: ${AUTH_HEADER}"} \
    -d @<(cat <<JSON
{
  "title": "${TITLE}",
  "content": ${CONTENT_JSON},
  "type": "markdown",
  "status": "draft",
  "visibility": "team",
  "tags": ["auto_generated", "work_note"],
  "is_template": false,
  "metadata": {"doc_kind":"work_note","generated_by":"daily_cron","generated_reason":"daily_9_30"},
  "relationship_type": "attachment"
}
JSON
) | jq -r '.message // .error // "created"' || true
else
  # Create standalone document
  curl -sS -X POST "${BASE_URL}/documents" \
    -H "Content-Type: application/json" \
    ${AUTH_HEADER:+-H "Authorization: ${AUTH_HEADER}"} \
    -d @<(cat <<JSON
{
  "project_id": ${PROJECT_ID},
  "title": "${TITLE}",
  "content": ${CONTENT_JSON},
  "type": "markdown",
  "status": "draft",
  "visibility": "team",
  "tags": ["auto_generated", "work_note"],
  "metadata": {"doc_kind":"work_note","generated_by":"daily_cron","generated_reason":"daily_9_30"}
}
JSON
) | jq -r '.message // .error // "created"' || true
fi

