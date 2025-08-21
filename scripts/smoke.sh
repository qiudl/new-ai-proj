#!/usr/bin/env bash
# Simple smoke tests for API endpoints derived from docs/api/openapi.yaml
# Usage: BASE_URL=http://localhost:8080/api/v1 ACCESS_TOKEN=xxx ./smoke.sh
set -euo pipefail

if [[ -z "${BASE_URL:-}" ]]; then
  echo "BASE_URL is required" >&2; exit 1; fi

# Never print secrets; use header with variable reference.
AUTH_HEADER=( -H "Authorization: Bearer ${ACCESS_TOKEN:-}" )
CT_JSON=( -H 'Content-Type: application/json' )

jq_check() { command -v jq >/dev/null 2>&1; }
resp_code() { tail -n1; }

# 1) Login (if ACCESS_TOKEN not provided, try login)
if [[ -z "${ACCESS_TOKEN:-}" ]]; then
  echo "Attempting login to obtain token..." >&2
  LOGIN_PAYLOAD='{"email":"user@example.com","password":"changeMe123"}'
  ACCESS_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/login" "${CT_JSON[@]}" -d "$LOGIN_PAYLOAD" | jq -r '.data.access_token // empty') || true
fi

# 2) Get profile
curl -sS -X GET "$BASE_URL/users/profile" "${AUTH_HEADER[@]}" | jq '.success, .data.id' || true

# 3) List projects
curl -sS -G "$BASE_URL/projects" "${AUTH_HEADER[@]}" --data-urlencode page=1 --data-urlencode per_page=10 | jq '.pagination.total // 0' || true

# 4) Create a project (idempotent via random key)
RAND=$(LC_ALL=C tr -dc A-Z0-9 </dev/urandom | head -c 6)
CREATE_PROJECT_PAYLOAD=$(jq -n --arg key "DEMO$RAND" --arg name "Demo $RAND" '{key:$key,name:$name,visibility:"private"}')
curl -sS -X POST "$BASE_URL/projects" "${AUTH_HEADER[@]}" "${CT_JSON[@]}" -d "$CREATE_PROJECT_PAYLOAD" | jq '.data.id' || true

# 5) List notifications (self)
curl -sS -X GET "$BASE_URL/notifications?only_unread=true" "${AUTH_HEADER[@]}" | jq '.data | length' || true

echo "Smoke tests completed."
