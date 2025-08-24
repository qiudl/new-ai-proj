# 正式诊断报告：create-and-attach 404 修复与验证

- 任务: #546
- 生成时间: 2025-08-23T16:05:33Z
- 当前状态: 修复代码已提交（统一 API 基址、移除硬编码 JWT、添加回退端点），等待在正确 API 与 TOKEN 下复测

## 问题现象
- 接口 create-and-attach 返回 404；批量文档创建端点返回 500；任务仍显示暂无文档。

## 诊断结论
- 404 主要由 API 基础地址/路由前缀不一致导致（存在 8080/8081 两个基址混用）；
- 部分后端只支持 POST /projects/:pid/tasks/:tid/documents，而不是 /documents/create-and-attach；
- 无鉴权时易返回 401，但与 404 原因不同。

## 已实施修复（本仓库）
1. 统一 API 基址读取顺序：TASK_API_BASE > API_BASE_URL > http://localhost:8080/api/v1；
2. 移除硬编码 JWT，改为从 TASK_API_TOKEN / API_TOKEN 读取；
3. 为 create-and-attach 增加回退：遇到 404/405 自动改用 POST /documents；
4. 测试与 CLI 支持从环境变量注入 TASK_API_BASE/TASK_API_TOKEN，并在无令牌时尝试 dev-quick-login。

## 验收步骤
- export TASK_API_BASE=http://localhost:8081/api/v1（示例）
- export TASK_API_TOKEN={{TASK_API_TOKEN}}
- npm run build && npm run test:create-attach
- 或：node attach-task-doc.js 546 ./diagnosis-546.md "正式诊断报告 - create-and-attach 404 修复与验证"

## 预期结果
- 文档成功创建并关联到任务 #546；后续 has/get 文档接口返回正确信息。

