# Jenkins local trigger (方案B)

本脚本用于在本机触发 Jenkins 任务构建，不依赖 GitHub Webhook。

1) 生成 API Token（只需一次）
- Jenkins 右上角头像 > Configure > API Token > Generate new token
- 记下用户名与 Token

2) 配置凭据（任选其一）
- 临时导出到当前终端会话：
  ```bash
  export JENK_USER=你的用户名
  export JENK_TOKEN=你的Token
  export JENK_URL=http://localhost:8181         # 可选，默认此地址
  export JENK_JOB=ai-executor                    # 可选，默认此任务名
  ```
- 或在项目创建私密文件 scripts/.jenkins.env（不会提交到Git）：
  ```bash
  JENK_USER=你的用户名
  JENK_TOKEN=你的Token
  JENK_URL=http://localhost:8181
  JENK_JOB=ai-executor
  ```

3) 运行脚本
- 基本触发：
  ```bash
  ./scripts/trigger_jenkins_build.sh
  ```
- 携带参数（例如更改关键路径Top N展示）：
  ```bash
  CP_TOP_N=15 ./scripts/trigger_jenkins_build.sh
  ```

4) 常见问题
- 401/403：检查用户名、Token 是否正确；若开启CSRF，脚本会自动获取Crumb
- 404：检查 JENK_URL/JENK_JOB 是否正确（任务名称区分大小写）
- 未安装 jq：脚本自动回退到 sed 解析方式（推荐安装 jq 提升稳定性）

5) 安全提示
- 不要把 Token 写入代码或提交到Git；scripts/.jenkins.env 已在 .gitignore 中忽略
- 使用完终端会话可执行 `unset JENK_USER JENK_TOKEN` 清理环境变量

