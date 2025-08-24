#!/usr/bin/env bash
# One-click opener for the Parallel Monitor with parentId
# Usage:
#   scripts/open-parallel-monitor.sh [PARENT_ID]
# Environment overrides:
#   CONFIG=plan-537-parallel.summary.json
#   HTTP_PORT=4311  WS_PORT=4312  MCP_PORT=4313
#   AUTO_START=1 COMPACT=1
#   NO_START=1   (skip auto-starting servers if ports are closed)
#   RESTART=1    (force restart servers even if running)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT_DIR"

PARENT_ID="${1:-537}"
CONFIG_REL="${CONFIG:-plan-537-parallel.summary.json}"
HTTP_PORT="${HTTP_PORT:-4311}"
WS_PORT="${WS_PORT:-4312}"
MCP_PORT="${MCP_PORT:-4313}"
AUTO_START="${AUTO_START:-1}"
COMPACT="${COMPACT:-1}"
NO_START="${NO_START:-0}"
RESTART="${RESTART:-0}"

CONFIG_PATH="$ROOT_DIR/$CONFIG_REL"
if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Config file not found: $CONFIG_PATH" >&2
  exit 1
fi

is_listening() {
  local port="$1"
  lsof -i -P | grep LISTEN | grep -E ":${port}\b" >/dev/null 2>&1
}

kill_if_running() {
  local pidfile="$1"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && ps -p "$pid" >/dev/null 2>&1; then
      kill "$pid" || true
      sleep 0.3
    fi
    rm -f "$pidfile" || true
  fi
}

start_http_server() {
  local log="/tmp/parallel_monitor_${HTTP_PORT}.log"
  local pidfile="$ROOT_DIR/.server-${HTTP_PORT}.pid"
  if [[ "$RESTART" == "1" ]]; then kill_if_running "$pidfile"; fi
  if ! is_listening "$HTTP_PORT"; then
    nohup python3 -m http.server "$HTTP_PORT" --directory "$ROOT_DIR" >"$log" 2>&1 & echo $! > "$pidfile"
    echo "Started static server on :$HTTP_PORT (pid $(cat "$pidfile"))"
  else
    echo "Static server already listening on :$HTTP_PORT"
  fi
}

start_ws_server() {
  local log="/tmp/ws-progress-server.log"
  local pidfile="$ROOT_DIR/.ws-progress.pid"
  if [[ "$RESTART" == "1" ]]; then kill_if_running "$pidfile"; fi
  if ! is_listening "$WS_PORT"; then
    nohup node "$ROOT_DIR/ws-progress-server.js" >"$log" 2>&1 & echo $! > "$pidfile"
    echo "Started WS progress server on :$WS_PORT (pid $(cat "$pidfile"))"
  else
    echo "WS progress server already listening on :$WS_PORT"
  fi
}

start_mcp_bridge() {
  local log="/tmp/web-mcp-bridge.log"
  local pidfile="$ROOT_DIR/.web-mcp-bridge.pid"
  if [[ "$RESTART" == "1" ]]; then kill_if_running "$pidfile"; fi
  if ! is_listening "$MCP_PORT"; then
    nohup node "$ROOT_DIR/web-mcp-bridge.js" >"$log" 2>&1 & echo $! > "$pidfile"
    echo "Started MCP bridge on :$MCP_PORT (pid $(cat "$pidfile"))"
  else
    echo "MCP bridge already listening on :$MCP_PORT"
  fi
}

if [[ "$NO_START" != "1" ]]; then
  start_http_server
  start_ws_server
  start_mcp_bridge
else
  echo "NO_START=1 set, skipping server start checks"
fi

# URL build (keep config relative path, http server serves repo root)
BASE_URL="http://localhost:${HTTP_PORT}/reusable-parallel-monitor.html"
QUERY="config=$(python3 - <<'PY'
import urllib.parse,os
print(urllib.parse.quote(os.environ.get('CONFIG_REL','plan-537-parallel.summary.json')))
PY
)&autoStart=${AUTO_START}&compact=${COMPACT}&wsUrl=$(python3 - <<'PY'
import urllib.parse
print(urllib.parse.quote('ws://localhost:'+str(int(__import__('os').environ.get('WS_PORT','4312')))+'/'+'ws', safe=':/'))
PY
)&mcpEndpoint=$(python3 - <<'PY'
import urllib.parse
print(urllib.parse.quote('http://localhost:'+str(int(__import__('os').environ.get('MCP_PORT','4313'))), safe=':/'))
PY
)&parentId=${PARENT_ID}"

URL="${BASE_URL}?${QUERY}"

# macOS open
open "$URL"

echo "Opened: $URL"

