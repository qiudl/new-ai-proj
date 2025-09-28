-- Rollback migration: Drop timer audit logs table

-- Drop function first
DROP FUNCTION IF EXISTS cleanup_old_timer_audit_logs();

-- Drop table
DROP TABLE IF EXISTS timer_audit_logs;