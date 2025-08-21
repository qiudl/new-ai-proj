# 子任务 #339 文档

## 标题
实现修复：代码修改与单元测试/集成测试

## 代码改动
- 文件：backend/routes/document_routes.go
  - 在 registerWorkNotesRoutes 内新增：
    - POST /work-notes/:id/copy → app.GetHybridDocumentHandler().CopyDocument
    - POST /work-notes/:id/toggle-template → app.GetHybridDocumentHandler().ToggleTemplate

## 构建与验证
- 重建后端：`docker compose -f docker-compose.dev.yml up -d --build backend`
- 探测：`curl -X POST http://localhost:8081/api/v1/work-notes/1/copy -H 'Authorization: Bearer test' -w 'HTTP %{http_code}
'` → 401（期望，路由存在）

## 单测支撑（见 #341）
- 新增 routes 层单元测试，确保路由映射长期一致性（已通过）。

## 结论
- 后端 /work-notes 路由组已与前端一致，复制/模板切换接口可用（需有效 JWT）。