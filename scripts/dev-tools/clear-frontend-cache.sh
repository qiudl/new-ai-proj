#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"
PORT=3000
API_BASE="http://localhost:8081/api/v1"

mkdir -p "$LOG_DIR"

echo "[clean] Stopping frontend dev server on port $PORT if running..."
PID=$(lsof -t -nP -iTCP:${PORT} -sTCP:LISTEN || true)
if [[ -n "${PID}" ]]; then
  kill "${PID}" || true
  sleep 1
fi

echo "[clean] Removing CRA caches and temp files..."
rm -rf "$FRONTEND_DIR/node_modules/.cache" || true
rm -f  "$FRONTEND_DIR/.eslintcache" || true
rm -rf "$FRONTEND_DIR/build" || true

# 若使用 Vite/其他工具，可在此追加更多缓存目录
# rm -rf "$FRONTEND_DIR/.vite" || true

# 可选：清理 npm/yarn 缓存（注释掉默认不执行）
# npm cache clean --force || true
# yarn cache clean || true

echo "[clean] Re-launching frontend dev server in background..."
(
  export BROWSER=none
  cd "$FRONTEND_DIR"
  PORT=${PORT} REACT_APP_API_BASE_URL=${API_BASE} npm start \
    >> "$LOG_DIR/frontend.dev.log" 2>&1 &
) || true

# 等待端口监听
sleep 3
if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null; then
  echo "[ok] Frontend restarted on http://localhost:${PORT}"
else
  echo "[warn] Frontend did not start listening on ${PORT}. Check $LOG_DIR/frontend.dev.log"
fi
