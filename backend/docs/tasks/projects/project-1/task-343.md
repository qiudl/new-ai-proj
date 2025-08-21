## 契约与样例链接

- OpenAPI 3.0 规范：`docs/api/openapi.yaml`
- Swagger UI（本地浏览）：`docs/api/index.html`（本次新增）
- Smoke 测试脚本：`scripts/smoke.sh`（使用 BASE_URL 与 ACCESS_TOKEN 环境变量）
- REST Client 示例：`docs/api/examples.http`

使用建议：
- 开发/测试环境优先通过 Docker 启动 Postgres，并在 `.env` 中配置数据库连接（生产和预发必须是 Postgres）。
- 运行 smoke 前，请先确保服务可用，或通过登录接口获取 ACCESS_TOKEN 并写入环境变量。