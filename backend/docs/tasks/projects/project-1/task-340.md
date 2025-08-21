# 子任务 #340 文档

## 标题
验证与验收：本地、Docker环境与CI（Jenkins Docker Agent）

## 本地与Docker验收
- docker-compose.dev.yml 启动服务：Postgres、Backend、Frontend、Redis 正常。
- /health 健康检查 ok；/work-notes 路由组可见。

## Jenkins（Docker Agent）建议
- 使用 Docker agent，缓存 Go modules 与 Node 缓存。
- 示例步骤：
  1) docker compose -f docker-compose.dev.yml build backend
  2) docker compose -f docker-compose.dev.yml run --rm backend sh -lc 'go build ./...'
  3) docker compose -f docker-compose.dev.yml up -d postgres-master && sleep 5
  4) docker compose -f docker-compose.dev.yml up -d backend && sleep 10
  5) curl -sS http://backend:8080/health
  6) curl -sS -o /dev/null -w '%{http_code}
' -H 'Authorization: Bearer $JWT' http://backend:8080/api/v1/work-notes
- 注意：JWT 通过凭据注入，切勿明文。

## 结论
- 本地与容器环境验收通过；CI 建议已提供，可纳入 pipeline。