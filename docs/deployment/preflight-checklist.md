# 部署前检查清单（Docker-Postgres、健康检查、数据备份）

本清单用于在上线前快速做只读验证，确保数据库、索引、健康端点与备份状态符合预期。

准备环境变量（建议以 .env 或 CI 变量形式注入）
- DB_CONTAINER=ai_postgres_master
- DB_USER=dev_user
- DB_NAME=ai_project_db
- APP_BASE_URL=http://localhost:8080

一、数据库只读检查（Docker-Postgres）
- 验证容器存在且 Postgres 版本正确
  - docker ps | grep -i postgres
  - docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c 'SELECT version();'
- 验证关键表存在（documents、task_documents、tasks）
  - \dt+ public.documents; \dt+ public.task_documents; \dt+ public.tasks;
- 验证索引存在（示例）
  - task_documents: idx_task_documents_task_id、idx_task_documents_document_id、(可选) idx_task_documents_task_rel
  - documents: idx_documents_project_updated_active 或回退 idx_documents_project_updated；idx_documents_owner_updated_active 或回退 idx_documents_owner_updated
  - 查询：
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('task_documents','documents') ORDER BY tablename, indexname;
- 采样 EXPLAIN（只读）
  - SELECT EXISTS( SELECT 1 FROM task_documents td JOIN documents d ON d.id=td.document_id WHERE td.task_id=$TASK_ID AND d.deleted_at IS NULL );
  - SELECT d.id,d.title,d.updated_at FROM documents d JOIN task_documents td ON td.document_id=d.id WHERE td.task_id=$TASK_ID AND d.deleted_at IS NULL ORDER BY d.updated_at DESC LIMIT 20;

二、应用健康检查
- /documents/health（综合）应该 200 且 success=true
- /documents/health/docs（DB一致性）应该 200；orphan_documents 与 orphan_links 长期应接近 0
- 若 behind 代理或不同基址，请以 APP_BASE_URL 配置修正

三、备份与回滚
- 备份：
  - pg_dump -U $DB_USER -d $DB_NAME -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump （建议在容器内执行）
- 回滚流程（建议在维护窗口执行，先验证恢复到新建测试库再覆盖）：
  1) 暂停写入流量（维护页/只读模式）
  2) 备份当前库（再次）
  3) 创建临时库并试恢复：createdb tmp_restore; pg_restore -U $DB_USER -d tmp_restore backup_xxx.dump
  4) 验证关键查询/健康端点对 tmp_restore 通过（在临时环境指向 tmp_restore）
  5) 确认无误后对主库执行 pg_restore（必要时 drop/recreate）或使用表级回滚脚本
  6) 恢复写入流量

四、配置与权限
- 环境变量：
  - 数据库：POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_DB
  - 应用：APP_BASE_URL、API_KEY（如需要）、AUTH 配置
- 卷与权限：
  - 容器卷必须可写（如仍启用文件镜像）
  - 如果仅 DB 模式，确保镜像相关开关关闭

五、CI/CD（Jenkins Docker Agent）建议
- 在 Jenkins 的 Docker Agent 中执行预检脚本（见 scripts/preflight-check.sh）
- 失败即阻断部署；成功才继续

六、常见问题
- SSH 到 GitHub 22 端口受限：使用 443 端口（GIT_SSH_COMMAND='ssh -p 443 -o Hostname=ssh.github.com'）
- 部分索引不存在：检查迁移是否在当前库执行；优先执行 backend/migrations/20250821_04_* 与 20250821_05_*

附：一键预检脚本
- 参考 scripts/preflight-check.sh

