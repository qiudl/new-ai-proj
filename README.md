# New AI Project

一个面向生产环境的 AI 项目后端/API 契约与示例集合。

## API 文档与测试

- OpenAPI 3.0 规范：docs/api/openapi.yaml
- Swagger UI（本地浏览）：docs/api/index.html
- REST Client 示例：docs/api/examples.http
- Smoke 测试脚本：scripts/smoke.sh

使用说明：
1) 准备环境变量（避免明文 Token 暴露）
   export BASE_URL=http://localhost:8080/api/v1
   export ACCESS_TOKEN={{YOUR_ACCESS_TOKEN}}
2) 运行最小化健康检查：
   chmod +x scripts/smoke.sh
   ./scripts/smoke.sh
3) 在浏览器中打开 docs/api/index.html 查看与评审接口定义。

安全与合规：
- 切勿在命令行/日志中打印 Token 等敏感信息；统一使用环境变量传递。
- 生产与预发环境必须使用 PostgreSQL（遵循项目规则）。
- 建议在开发/测试环境通过 Docker 启动 Postgres（与 Redis 可选）。

## 目录导航
- docs/api/openapi.yaml：接口契约（OpenAPI 3.0）
- docs/api/index.html：Swagger UI 静态页面
- docs/api/examples.http：VS Code / JetBrains REST Client 示例
- scripts/smoke.sh：基于 curl 的快速验证脚本

## 后续
- 如需生成 SDK、Mock Server 或测试桩，可直接根据 docs/api/openapi.yaml 使用 openapi-generator 生成。
- 若需在 CI（Jenkins，Docker Agent）中集成契约校验与 Smoke 测试，可在流水线步骤中引用以上文件并通过环境变量注入密钥。

