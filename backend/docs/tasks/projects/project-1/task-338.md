# 子任务 #338：编写修复计划：问题归因、影响面、备份与回滚方案

- 归因：前端使用 /work-notes/:id/(copy|toggle-template)，后端仅在 /documents 下保留兼容端点。
- 影响：前端复制/模板切换按钮可能 404/405。
- 方案：在 registerWorkNotesRoutes 中新增两端点（复制、模板切换），指向 HybridDocumentHandler。
- 验证：重建后端，未授权请求返回 401 验证路由存在。
- 回滚：撤销对 document_routes.go 的增量改动并重建镜像。