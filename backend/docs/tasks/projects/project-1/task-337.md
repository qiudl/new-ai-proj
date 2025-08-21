# 子任务 #337 文档

## 标题
复现问题：运行/构建并记录错误与行为

## 执行过程
1. 启动 Docker 开发栈（遵循“优先 Docker Postgres”的偏好）：
   - 命令：`docker compose -f docker-compose.dev.yml up -d --build`
   - 结果：postgres-master(healthy)、backend(running, health starting→ok)、frontend(running)、redis(healthy)。
2. 健康检查：
   - `curl http://localhost:8081/health` → `{ status: ok, database: healthy, version: dev }`。
3. API 探测：
   - `curl -H 'Authorization: Bearer test' http://localhost:8081/api/v1/work-notes` → 401（Invalid token），说明路由存在且鉴权生效。

## 发现
- /work-notes CRUD 与 /work-notes/search 正常注册。
- 复制、模板切换操作在前端走 /work-notes/:id/(copy|toggle-template)，后端在 /work-notes 下未曾注册，导致前端侧可能 404/405。

## 结论
- 环境就绪，路由与鉴权工作正常；问题点收敛到“/work-notes 下缺少 copy/toggle-template”。