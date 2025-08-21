### API契约示例与测试说明

此目录包含与 docs/api/openapi.yaml 对应的可执行示例与测试：

- scripts/smoke.sh
  - 使用 curl 对关键接口做健康检查与最小验证。
  - 环境变量：
    - BASE_URL：如 http://localhost:8080/api/v1
    - ACCESS_TOKEN：登录后获取的 JWT，若未提供脚本会尝试用默认账户登录（仅开发环境）。
  - 安全：不打印或回显 Token 值。

- examples.http
  - 可在 VSCode REST Client 或 JetBrains HTTP Client 中直接运行。
  - 使用变量注入，避免明文泄露密钥。

运行前置：
- 推荐使用 Docker 启动 Postgres 与（可选）Redis；生产与预发需使用 Postgres（遵循你的规则）。
- API 服务本地监听 http://localhost:8080（可按需修改）

快速开始：
1) 生成或导入 ACCESS_TOKEN：
   export BASE_URL=http://localhost:8080/api/v1
   export ACCESS_TOKEN=$(jq -r '.data.access_token' <(curl -s -X POST "$BASE_URL/auth/login" -H 'Content-Type: application/json' -d '{"email":"user@example.com","password":"changeMe123"}'))
2) 运行 smoke：
   ./scripts/smoke.sh

注意：请勿在命令行或日志中输出明文 Token；使用变量传递。

