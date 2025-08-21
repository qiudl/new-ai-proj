# 子任务 #336：盘点现状：定位 "工作笔记" 模块代码与依赖

- 前端关键文件：
  - components: WorkNotesManager.tsx, ModernWorkNoteEditor.tsx, ModernWorkNoteViewer.tsx
  - page: DocumentManagerPage.tsx（无 projectId/taskId 时渲染工作笔记管理）
  - service: services/workNotesService.ts（/api/v1/work-notes）
- 后端关键路由：backend/routes/document_routes.go（registerWorkNotesRoutes 已有 CRUD 与 search）
- 环境：docker-compose.dev.yml（Postgres, Backend, Frontend, Redis），前端 API 指向 http://localhost:8081/api/v1
- 结论：/work-notes 核心接口齐备，缺少 copy/toggle-template 子路由。