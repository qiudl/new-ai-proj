# 任务文档（MD → 数据库存储）迁移指南

本指南说明如何将历史的本地 Markdown 任务文档迁移到系统内置的“任务文档”（数据库）中，并彻底停止使用“创建本地 .md 文件”的旧方式。

## 背景
- 旧流程在 backend/docs/tasks/projects/project-<id>/task-<taskId>.md 下创建文档，难以统一管理与检索。
- 新流程通过数据库文档系统进行存储与关联，前端通过 /projects/:id/tasks/:taskId/documents 接口读写。
- 路由层已禁用旧的文件保存端点（PUT /projects/:id/tasks/:taskId/document 返回 410 Gone）。

## 一键迁移脚本
脚本路径：scripts/migrate_task_docs.js（Node.js >= 18）

环境变量与参数：
- API_BASE_URL：后端 API 基地址（默认 http://localhost:3000/api/v1）
- API_TOKEN：后端鉴权 Token（Bearer Token）。迁移需要有创建文档与关联任务文档的权限。
- --dry-run：试运行，仅打印将要迁移的文件与目标任务，不做实际写入。

示例：
- 试运行
  API_BASE_URL=http://localhost:3000/api/v1 node scripts/migrate_task_docs.js --dry-run
- 实际迁移
  API_BASE_URL=http://localhost:3000/api/v1 API_TOKEN=<你的Token> node scripts/migrate_task_docs.js

脚本逻辑：
- 扫描 backend/docs/tasks/projects/project-*/task-*.md
- 解析 frontmatter（若存在），提取 title，正文保留原文
- 调用 POST /documents 创建文档（type=markdown, visibility=team，tags包含 migration）
- 调用 POST /projects/:id/tasks/:taskId/documents/:documentId/attach 关联到任务
- 默认跳过已存在任务文档的任务（减少重复）

注意：
- 如需覆盖/重复迁移，可根据需要修改脚本的 skipExisting 逻辑。
- 若存在不符合路径模式的历史文档（例如 docs/tasks 下的其它命名），需单独处理或扩展脚本解析规则。

## 变更影响
- 旧端点 PUT /projects/:id/tasks/:taskId/document 已返回 410，防止写入本地 .md。
- 前端 taskDocumentFileService.createTaskDocument 会抛出错误，提示使用数据库文档 API。
- 推荐全面迁移到 taskDocumentService（数据库文档 API）的读写与管理流程。

## 回滚策略
- 本迁移不删除原始 .md 文件，仅做复制与关联。若需回滚，可保留旧文件；也可视情况在确认成功后手动归档/删除旧文件。

## 常见问题
- 401/403：检查 API_TOKEN 是否正确、权限是否足够。
- 404：检查目标任务是否存在、projectId/taskId 提取是否正确。
- 标题缺失：脚本会尝试使用文档首个 # 标题，或退回为 task-<id>。

