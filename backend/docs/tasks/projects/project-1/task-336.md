# 子任务 #336 文档

## 标题
盘点现状：定位 "工作笔记" 模块代码与依赖

## 背景
为修复工作笔记模块，需要先全面定位当前代码实现与依赖拓扑，以便明确后续修复范围与风险。

## 代码定位结果
- 前端
  - 组件：
    - frontend/src/components/WorkNotesManager.tsx（列表/搜索/CRUD 触发）
    - frontend/src/components/ModernWorkNoteEditor.tsx（抽屉式编辑/创建）
    - frontend/src/components/ModernWorkNoteViewer.tsx（抽屉式查看）
    - 页面：frontend/src/pages/DocumentManagerPage.tsx（未传 projectId/taskId 时挂载工作笔记管理）
  - 服务：frontend/src/services/workNotesService.ts（/api/v1/work-notes REST 调用）
- 后端（Go + Gin）
  - 路由聚合：backend/routes/document_routes.go
    - registerWorkNotesRoutes(authorized, app) 已存在：
      - GET/POST /work-notes，GET /work-notes/search，GET/PUT/DELETE /work-notes/:id
    - 兼容路由（在 /documents 下）：POST /documents/:id/copy 与 POST /documents/:id/toggle-template
  - 入口：backend/main.go，router 组装位于 backend/application/routes.go 与 backend/routes/setup.go
  - Go module：backend/go.mod（module ai-project-backend）
- 本地开发环境（Docker）
  - docker-compose.dev.yml：
    - Postgres 容器（5433 映射）、Go 后端（8081->8080）、React 前端（3001->3000）、Redis
    - 前端 REACT_APP_API_URL 指向 http://localhost:8081/api/v1
  - 后端 .env.docker：提供容器内 Postgres 连接参数

## 结论
- 前后端主要模块齐备；/work-notes 核心 CRUD 与搜索存在。
- 初步怀疑点：前端对复制/模板切换使用了 /work-notes/:id/copy、/work-notes/:id/toggle-template，而后端此前只在 /documents 下提供兼容端点，/work-notes 下未暴露对应路由，可能导致前端 404。

## 产出
- 整理了前后端关键文件位置与接口列表，为后续复现、修复提供依据。