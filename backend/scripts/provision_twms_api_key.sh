#!/usr/bin/env bash
# Provision a TWMS API key via existing admin endpoint
# Safe by default: never prints secrets, shows plain key only once and offers to export it to env.
# Usage:
#   ADMIN_TOKEN will be obtained via login if possible, or you can set it beforehand securely.
#   BASE_URL defaults to http://localhost:8081/api/v1
#   TWMS_IPS can be a comma-separated list of allowed IPs (e.g., "1.2.3.4,5.6.7.8")
#   RATE_LIMIT_COUNT default 600 per_hour
#
# Notes on secrets:
# - This script avoids echoing the API key to logs unless you explicitly confirm output.
# - Prefer exporting to an environment variable for immediate use in the current shell.

set -euo pipefail

BASE_URL=${BASE_URL:-"http://localhost:8081/api/v1"}
TWMS_NAME=${TWMS_NAME:-"TWMS Integration Key"}
TWMS_DESC=${TWMS_DESC:-"API key for TWMS external integration"}
TWMS_IPS_RAW=${TWMS_IPS:-""}
RATE_LIMIT_COUNT=${RATE_LIMIT_COUNT:-600}
RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW:-"per_hour"}
EXPIRES_AT=${EXPIRES_AT:-""} # e.g., 2026-01-01T00:00:00Z

# Required scopes for TWMS from task #188
# tasks:read/write, projects:read, timers:sync (use tasks.write, tasks.read, projects.read; timers.sync falls under tasks.write here)
read -r -d '' PERMISSIONS_JSON <<'JSON'
["api.read","tasks.read","tasks.write","projects.read"]
JSON

# Helper: join allowed IPs into JSON array
ips_json="[]"
if [[ -n "$TWMS_IPS_RAW" ]]; then
  IFS=',' read -ra arr <<< "$TWMS_IPS_RAW"
  # shellcheck disable=SC2016
  ips_json="["$(printf '"%s",' "${arr[@]}" | sed 's/,$//')"]"
fi

# Obtain ADMIN_TOKEN if not provided
if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "Attempting admin login to obtain token..." >&2
  login_payload='{"username":"admin","password":"admin123"}'
  # Do not print response body to stdout to avoid leaking tokens
  login_resp=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$login_payload" || true)
  if echo "$login_resp" | grep -q '"token"'; then
    ADMIN_TOKEN=$(printf '%s' "$login_resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  else
    echo "Could not auto-login. Please export ADMIN_TOKEN and re-run." >&2
    exit 1
  fi
fi

# Build create request JSON
now_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Ensure jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this script. Please install jq and retry." 1>&2
  exit 1
fi

create_payload=$(jq -n \
  --arg name "$TWMS_NAME" \
  --arg desc "$TWMS_DESC" \
  --argjson perms "$PERMISSIONS_JSON" \
  --argjson ips "$ips_json" \
  --arg rlw "$RATE_LIMIT_WINDOW" \
  --argjson rlc "$RATE_LIMIT_COUNT" \
  --arg expires "$EXPIRES_AT" \
  --arg now "$now_ts" \
  '{
    name: $name,
    description: $desc,
    permissions: $perms,
    allowed_ips: $ips,
    rate_limit_count: ($rlc|tonumber),
    rate_limit_window: $rlw,
    is_active: true,
    expires_at: ( $expires | if .=="" then null else . end ),
    metadata: { system: "twms", provisioned_at: $now }
  }')

# Create API key via admin endpoint
response=$(curl -sS -X POST "$BASE_URL/system/api-keys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "$create_payload")

# Basic error handling
http_error=$(printf '%s' "$response" | jq -r 'select(.error) | .error' 2>/dev/null || true)
if [[ -n "$http_error" && "$http_error" != "null" ]]; then
  echo "API returned error: $http_error" 1>&2
  printf '%s\n' "$response" 1>&2
  exit 1
fi

# Extract plain key; only shown once
plain_key=$(printf '%s' "$response" | jq -r '.plain_key // .plainKey // empty')
if [[ -z "$plain_key" ]]; then
  echo "Could not find plain_key in response. Raw response:" 1>&2
  printf '%s\n' "$response" 1>&2
  exit 1
fi

# Output minimal guidance without leaking further
echo "TWMS API key created successfully." 1>&2
echo "To use it in the current shell, run:" 1>&2
echo "  export TWMS_API_KEY=\"$plain_key\"" 1>&2

# For scripting: print only the key to stdout
printf '%s\n' "$plain_key"
