#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080}
TOKEN=${TOKEN:-}

say() { echo "[smoke] $*"; }

say "Health: /documents/health"
curl -sS "${BASE_URL}/documents/health" | jq '.' || true

say "Health: /health/docs"
curl -sS "${BASE_URL}/health/docs" | jq '.' || true

say "Metrics: /metrics (first 20 lines)"
curl -sS "${BASE_URL}/metrics" | head -n 20 || true

cat <<'EOF'
# To archive a document (requires auth):
# export TOKEN=... # your JWT
# curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
#   "${BASE_URL}/api/v1/documents/1/archive" -d '{"reason":"cleanup"}' | jq '.'
# To unarchive:
# curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
#   "${BASE_URL}/api/v1/documents/1/unarchive" -d '{}' | jq '.'
EOF
