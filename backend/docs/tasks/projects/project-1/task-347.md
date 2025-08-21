## 阶段1-子任务#356完成：数据模型梳理与索引优化

本次完成项
- 审阅迁移：database/migrations/010_documents_table.sql、020_task_documents_relation.sql；backend/migrations/015_*、20250821_01~03。
- 索引优化（新增迁移）：
  - backend/migrations/20250821_04_task_documents_indexes.sql
  - backend/migrations/20250821_05_documents_indexes.sql
  - 兼容不同结构：对 relationship_type / deleted_at / owner_id 缺失时采取降级策略。
- EXPLAIN 验证（Docker-Postgres: ai_postgres_master；DB=ai_project_db, USER=dev_user）：
  - has 查询（EXISTS+JOIN）：计划稳定，Execution ~0.05ms。
  - list 查询（JOIN+ORDER BY updated_at DESC LIMIT 20）：命中索引（示例命中 owner 活跃索引），Execution ~0.12ms。
- 结论：针对 task_documents 的 task_id/组合索引、documents 的活跃部分索引能有效降低扫描范围，随数据增长有更佳收益。

注意事项
- 目前代码库中存在两套 task_documents 定义（database 与 backend 目录），已通过迁移兼容，后续建议统一迁移来源，避免结构分歧。

下一步建议（对应子任务）
- #357：统一 has/get/list 读取路径彻底走 DB，消除分叉逻辑；
- #358：将迁移与 EXPLAIN 验证纳入部署前检查清单（含 Docker-Postgres 环境变量、健康端点校验）。