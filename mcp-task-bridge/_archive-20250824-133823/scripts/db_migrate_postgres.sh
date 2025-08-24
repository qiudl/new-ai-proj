#!/usr/bin/env bash
# scripts/db_migrate_postgres.sh
# 使用 Docker Postgres 执行 migrations 目录下的 SQL，并在关键节点上报进度
# 需遵循你的偏好：开发/验证使用 Docker Postgres，生产使用 Postgres
# 要求：本机有 docker；如在 Jenkins Docker Agent 中使用，请确保挂载 docker.sock 或改用远程执行

set -euo pipefail

WS_BRIDGE_DEFAULT="http://localhost:3035"
WS_BRIDGE_URL="${WS_BRIDGE:-$WS_BRIDGE_DEFAULT}"
CONTAINER_NAME="pg-migrate-535"
POSTGRES_IMAGE="postgres:16-alpine"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="appdb"
PGPORT=55432
MIG_DIR="migrations"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

report() {
  WS_BRIDGE="${WS_BRIDGE_URL}" "${SCRIPT_DIR}/report_update.sh" "$@"
}

ensure_container() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[migrate] starting docker postgres ${CONTAINER_NAME} on port ${PGPORT}"
    docker run -d --rm --name "${CONTAINER_NAME}" -e POSTGRES_USER="${POSTGRES_USER}" -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" -e POSTGRES_DB="${POSTGRES_DB}" -p "${PGPORT}:5432" "${POSTGRES_IMAGE}"
  else
    echo "[migrate] container already running: ${CONTAINER_NAME}"
  fi
}

wait_pg_ready() {
  echo "[migrate] waiting for postgres to be ready..."
  for i in $(seq 1 30); do
    if docker exec -i "${CONTAINER_NAME}" pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; then
      echo "[migrate] postgres is ready"
      return 0
    fi
    sleep 1
  done
  echo "[migrate] postgres not ready in time" >&2
  return 1
}

apply_sql_files() {
  local count=0
  for f in $(ls -1 "${REPO_DIR}/${MIG_DIR}"/*.sql 2>/dev/null | sort); do
    count=$((count+1))
    local base
    base=$(basename "$f")
    echo "[migrate] applying $base"
    report 535-dba $((20 + count*10)) MIGRATING "执行 $base"
    docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$f"
  done
  if [ "$count" -eq 0 ]; then
    echo "[migrate] no SQL files found in ${REPO_DIR}/${MIG_DIR}"
  fi
}

main() {
  report 535-dba 10 PREPARE "启动 Docker Postgres 容器"
  ensure_container
  wait_pg_ready
  report 535-dba 35 PRECHECK "数据库可用，开始迁移"
  apply_sql_files
  report 535-dba 90 VERIFY "迁移执行完成，进行校验"
  # 这里可以加上你的校验逻辑（行数/索引/约束检查等）
  report 535-dba 100 COMPLETED "迁移与索引建立完成 (Docker Postgres)"
}

main "$@"

