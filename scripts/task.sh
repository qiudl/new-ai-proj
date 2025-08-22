#!/usr/bin/env bash
# Minimal task helpers for Warp-integrated workflow
# Usage:
#   source scripts/task.sh
#   set-task <task_id>
#   current-task

set-task() {
  local id="$1"
  if [ -z "$id" ]; then
    echo "Usage: set-task <task_id>" >&2
    return 1
  fi
  # export for current shell session
  export WARP_TASK_ID="$id"
  # persist for other sessions/tools
  mkdir -p .warp
  # write minimal JSON (avoid requiring jq)
  printf '{
  "current_task_id": %s
}
' "$id" > .warp/state.json
  echo "Current task set to $id"
}

current-task() {
  # priority: env -> .warp/state.json
  if [ -n "$WARP_TASK_ID" ]; then
    echo "$WARP_TASK_ID"
    return 0
  fi
  if [ -f .warp/state.json ]; then
    # naive parse: extract digits; robust enough for our minimal schema
    awk -F ':' '/current_task_id/ { gsub(/[^0-9]/, "", $2); print $2 }' .warp/state.json | sed -e '1q'
    return 0
  fi
  echo ""  # no task
}

