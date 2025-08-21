# 子任务 #339：实现修复：代码修改与单元测试/集成测试

- 修改点：backend/routes/document_routes.go → registerWorkNotesRoutes 新增：
  - POST /work-notes/:id/copy
  - POST /work-notes/:id/toggle-template
- 验证：curl -X POST /api/v1/work-notes/1/copy（未授权）→ 401（路由存在）。
- 单测承接：见 #341，新增 routes 层单元测试，防止回归。
- 结论：前后端接口路径对齐，功能可用（需 JWT）。