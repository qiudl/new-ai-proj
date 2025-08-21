# 子任务 #337：复现问题：运行/构建并记录错误与行为

- 启动：docker compose -f docker-compose.dev.yml up -d --build（Postgres healthy, Backend running, Frontend running, Redis healthy）
- 健康：curl http://localhost:8081/health → ok 
- 探测：curl -H 'Authorization: Bearer test' http://localhost:8081/api/v1/work-notes → 401（鉴权生效，路由存在）
- 发现：/work-notes 缺少 copy/toggle-template；前端走 /work-notes/:id/(copy|toggle-template)。
- 结论：问题定位明确，准备修复。