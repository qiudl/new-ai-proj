#!/usr/bin/env bash
# Periodically regenerate the AI execution plan JSON from the local tasks dump
# Usage: ./scripts/planning/refresh_ai_plan.sh [interval_seconds]
# Default interval: 5 seconds

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
INTERVAL="${1:-5}"

while true; do
  node "$ROOT_DIR/scripts/planning/export_ai_plan.js" >/dev/null || echo "export_ai_plan failed" >&2
  sleep "$INTERVAL"
done

