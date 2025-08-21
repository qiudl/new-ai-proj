#!/usr/bin/env bash
set -euo pipefail

# Preflight check for Docker-Postgres and app health (read-only)
# Required env:
#   DB_CONTAINER (e.g. ai_postgres_master)
#   DB_USER (e.g. dev_user)
#   DB_NAME (e.g. ai_project_db)
#   APP_BASE_URL (e.g. http://localhost:8080)

: "${DB_CONTAINER:?DB_CONTAINER is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${APP_BASE_URL:?APP_BASE_URL is required}"

say() { printf "\033[1;34m[preflight]\033[0m %s\n" "$*"; }

say "Checking docker container and Postgres version..."
docker ps --format '{{.Names}} {{.Image}}' | grep -i "$DB_CONTAINER" >/dev/null

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c 'SELECT version();' >/dev/null

say "Checking essential tables..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "\\dt+ public.documents" >/dev/null
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "\\dt+ public.task_documents" >/dev/null

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "SELECT indexname FROM pg_indexes WHERE tablename IN ('task_documents','documents') ORDER BY tablename, indexname;" >/dev/null

say "Checking app health endpoints..."
curl -fsS "$APP_BASE_URL/documents/health" >/dev/null
curl -fsS "$APP_BASE_URL/documents/health/docs" >/dev/null

say "All preflight checks passed."

