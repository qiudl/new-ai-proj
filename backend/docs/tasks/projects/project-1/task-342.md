## 变更总结

已在 frontend/.github/workflows/ci.yml 新增 GitHub Actions 工作流：
- 名称：Frontend CI - Single Test
- 触发：push 与 pull_request
- Job：workNotesService-single-test
  - 运行目录：frontend
  - Node 版本：20
  - 安装：npm ci（使用 frontend/package-lock.json 缓存）
  - 执行：npm test -- --watchAll=false src/services/__tests__/workNotesService.test.ts（使用 react-scripts test，仅运行目标用例）

这样可绕过全量测试的大量历史失败用例，仅验证 workNotesService.test.ts，符合任务文档建议。

## 后续建议
- 若需要改为 Jenkins 方案，可在 Jenkinsfile 中添加 Docker agent 并通过 npm test -- --watchAll=false ... 仅跑单文件（遵循你偏好使用 Docker-based Jenkins agent 的规则）。
- 后续逐步修复全量测试时，可新增/扩展工作流矩阵，或单独创建 full-tests workflow，逐模块恢复。