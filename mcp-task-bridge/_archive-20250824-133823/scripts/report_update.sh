#!/usr/bin/env bash
# scripts/report_update.sh
# 统一的上报脚本，被 Jenkins 和迁移脚本复用。
# 用法：report_update.sh <task_id> <progress> <status> <output>
# 依赖环境变量：WS_BRIDGE（默认 http://localhost:3035），可选 WS_UPDATE_TOKEN（Bearer Token）

set -euo pipefail

WS_BRIDGE_DEFAULT="http://localhost:3035"
WS_BRIDGE_URL="${WS_BRIDGE:-$WS_BRIDGE_DEFAULT}"

if [ $# -lt 4 ]; then
  echo "Usage: $0 <task_id> <progress> <status> <output>" >&2
  exit 1
fi

TASK_ID="$1"; shift
PROGRESS="$1"; shift
STATUS="$1"; shift
OUTPUT="$*"

HDR_AUTH=()
if [ -n "${WS_UPDATE_TOKEN:-}" ]; then
  HDR_AUTH=("-H" "Authorization: Bearer ${WS_UPDATE_TOKEN}")
fi

curl -s -X POST "${WS_BRIDGE_URL}/update" \
  -H 'Content-Type: application/json' \
  "${HDR_AUTH[@]}" \
  -d "{\"id\":\"${TASK_ID}\",\"progress\":${PROGRESS},\"status\":\"${STATUS}\",\"output\":\"${OUTPUT}\"}" \
  >/dev/null || true

echo "[report_update] sent -> ${WS_BRIDGE_URL}/update id=${TASK_ID} progress=${PROGRESS} status=${STATUS}"

