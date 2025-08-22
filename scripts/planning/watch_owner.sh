#!/usr/bin/env bash
# Watch a single owner's queue in the AI execution plan.
# Usage: ./scripts/planning/watch_owner.sh ai:infra [interval_seconds]

set -euo pipefail
OWNER="${1:-ai:infra}"
INTERVAL="${2:-3}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLAN_FILE="$ROOT_DIR/planning/ai_execution_plan.v2.json"

if [ ! -f "$PLAN_FILE" ]; then
  echo "Plan file not found: $PLAN_FILE" >&2
  exit 1
fi

has_jq=1
if ! command -v jq >/dev/null 2>&1; then
  has_jq=0
  echo "[info] jq not found; printing raw JSON excerpt. Install jq for better view." >&2
fi

while true; do
  echo "==== $(date '+%F %T') owner=$OWNER ===="
  if [ "$has_jq" -eq 1 ]; then
    jq --arg owner "$OWNER" '.owners[$owner]' "$PLAN_FILE" || true
  else
    # Fallback: print first 200 lines
    cat "$PLAN_FILE" | head -n 200
  fi
  sleep "$INTERVAL"
done

