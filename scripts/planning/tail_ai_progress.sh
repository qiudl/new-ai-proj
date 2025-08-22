#!/usr/bin/env bash
# Simple live log tailer for AI execution plan updates and local tasks dump
# Usage: ./scripts/planning/tail_ai_progress.sh
# Press Ctrl+C to stop

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLAN_FILE="$ROOT_DIR/planning/ai_execution_plan.v2.json"
DUMP_FILE="$ROOT_DIR/data/planning/tasks_dump.json"

if [ ! -f "$PLAN_FILE" ]; then
  echo "Plan file not found: $PLAN_FILE" >&2
fi
if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file not found: $DUMP_FILE" >&2
fi

echo "Tailing plan and tasks (Ctrl+C to stop)"
( while true; do date '+%F %T' && cat "$PLAN_FILE" | head -n 50; sleep 2; done ) &
P1=$!
( while true; do date '+%F %T' && cat "$DUMP_FILE" | head -n 50; sleep 2; done ) &
P2=$!

trap 'kill $P1 $P2 2>/dev/null || true' INT TERM
wait

