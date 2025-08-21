## 前端单文件测试执行（workNotesService.test.ts）

- 尝试命令：`npx jest src/services/__tests__/workNotesService.test.ts --runInBand --detectOpenHandles --forceExit`
- 结果：失败，报错 `Preset react-scripts not found`（直接用 npx jest 绕过 react-scripts 时需补充 jest 配置或使用 react-scripts test）。
- 说明：项目默认使用 `react-scripts test` 运行测试；由于全量测试目前有大量历史用例失败，短期建议在 CI 中针对该文件采用 `react-scripts test` 的文件筛选：
  - `react-scripts test src/services/__tests__/workNotesService.test.ts --watchAll=false`
- 已对用例改为 `jest.mock('axios')`，避免 axios ESM 解析问题并专注校验 URL 与方法。

## 下一步建议（待确认后执行）
- 在 CI 中新增 job：仅运行 `workNotesService.test.ts`，验证本次改动不回归。
- 分步修复全量 Jest：补充 jest 配置或升级 axios/jest/babel 以兼容 ESM，分模块逐步恢复失败用例。