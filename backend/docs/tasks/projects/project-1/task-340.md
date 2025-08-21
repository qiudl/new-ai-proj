# 子任务 #340：验证与验收：本地、Docker环境与CI（Jenkins Docker Agent）

- 本地/Docker：compose.dev 启动通过，/health ok，/work-notes 路由存在。
- Jenkins（Docker agent）建议：仅摘录关键步骤：
  1) docker compose -f docker-compose.dev.yml build backend
  2) docker compose -f docker-compose.dev.yml run --rm backend sh -lc 'go build ./...'
  3) docker compose -f docker-compose.dev.yml up -d postgres-master && sleep 5
  4) docker compose -f docker-compose.dev.yml up -d backend && sleep 10
  5) curl -sS http://backend:8080/health
  6) curl -sS -o /dev/null -w '%{http_code}
' -H 'Authorization: Bearer $JWT' http://backend:8080/api/v1/work-notes
- JWT 由凭据注入。