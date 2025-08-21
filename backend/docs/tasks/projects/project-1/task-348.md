# 阶段1实施计划（后端API事务化改造与一致性读取）

## 目标
- create/update 文档与 task 链接的原子化（单事务）
- 统一 has/get/list 读取路径（Postgres 联表）
- 提供文档一致性健康检查（无 CI，仅后端接口）

## 具体改动（本阶段交付）
1) 数据层（DDL）
- 新建 task_documents（task_id, document_id, is_primary, created_at）
- 新建 document_revisions（id, document_id, version, content, checksum, created_at, created_by, diff）
- 新建 document_index（document_id, title_tsvector, content_tsvector, tags, updated_at）
- 添加必要索引与外键约束（FK: task_documents.document_id -> documents.id）

2) 接口与实现（后端）
- 事务化写入：create/update + 建立/更新关联（Repository/Handler）
- 一致性读取：has_task_document 改为联表检查（后端内部方法）
- 健康检查：/documents/health/docs 返回 orphan_count、mirror_writable（先仅返回数据库侧状态）

3) 初始验收
- 通过健康检查查看 orphan_count
- 通过 list 接口可读取 task 的文档（已有 GET /projects/:id/tasks/:taskId/documents）

## 风险与回滚
- 如 migration 失败，可回滚该迁移文件；实现代码保持向后兼容。

## 下一步（后续阶段）
- 阶段2：文件镜像写入可选化与启动时检查
- 阶段3：孤儿文档扫描修复与索引重建脚本
