# 子任务 #338 文档

## 标题
编写修复计划：问题归因、影响面、备份与回滚方案

## 归因
- 前端 workNotesService 使用：
  - POST /api/v1/work-notes/:id/copy
  - POST /api/v1/work-notes/:id/toggle-template
- 后端此前仅在 /api/v1/documents/:id/(copy|toggle-template) 暴露兼容路由；/work-notes 下未注册对应端点。

## 影响面
- 前端的“复制工作笔记”“设为/取消模板”按钮触发 404/405 或不一致行为。

## 方案
- 在 registerWorkNotesRoutes 中新增两个路由：
  - POST /work-notes/:id/copy → HybridDocumentHandler.CopyDocument
  - POST /work-notes/:id/toggle-template → HybridDocumentHandler.ToggleTemplate
- 验证：重建后端容器，探测新端点（未授权时返回 401 而非 404，确认路由存在）。

## 回滚
- 如遇异常，撤销对 routes/document_routes.go 的增量改动并重建镜像。