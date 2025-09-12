-- 删除触发器
DROP TRIGGER IF EXISTS trigger_impersonation_sessions_updated_at ON impersonation_sessions;

-- 删除函数
DROP FUNCTION IF EXISTS update_impersonation_sessions_updated_at();
DROP FUNCTION IF EXISTS update_expired_impersonation_sessions();
DROP FUNCTION IF EXISTS cleanup_old_impersonation_audit_logs(INTEGER);

-- 删除索引（会随表一起删除，但显式删除确保清理）
DROP INDEX IF EXISTS idx_impersonation_sessions_user_id;
DROP INDEX IF EXISTS idx_impersonation_sessions_enterprise_id;
DROP INDEX IF EXISTS idx_impersonation_sessions_session_id;
DROP INDEX IF EXISTS idx_impersonation_sessions_status;
DROP INDEX IF EXISTS idx_impersonation_sessions_started_at;
DROP INDEX IF EXISTS idx_impersonation_sessions_active;

DROP INDEX IF EXISTS idx_impersonation_audit_session_id;
DROP INDEX IF EXISTS idx_impersonation_audit_user_id;
DROP INDEX IF EXISTS idx_impersonation_audit_enterprise_id;
DROP INDEX IF EXISTS idx_impersonation_audit_action;
DROP INDEX IF EXISTS idx_impersonation_audit_created_at;
DROP INDEX IF EXISTS idx_impersonation_audit_compound;
DROP INDEX IF EXISTS idx_impersonation_audit_details_gin;

-- 删除表
DROP TABLE IF EXISTS impersonation_audit_logs;
DROP TABLE IF EXISTS impersonation_sessions;