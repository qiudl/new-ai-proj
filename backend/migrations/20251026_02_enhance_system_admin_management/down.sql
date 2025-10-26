-- ============================================================================
-- Migration Rollback: 20251026_02_enhance_system_admin_management
-- Description: 回滚系统管理员权限管理增强
-- Author: Claude Code AI
-- Created: 2025-10-26
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: 删除视图
-- ============================================================================

DROP VIEW IF EXISTS v_admin_audit_stats;
DROP VIEW IF EXISTS v_active_system_admins;

RAISE NOTICE 'Dropped 2 views';

-- ============================================================================
-- Part 2: 删除触发器和触发器函数
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_log_system_admin_changes ON system_users;
DROP FUNCTION IF EXISTS log_system_admin_changes();

RAISE NOTICE 'Dropped trigger and trigger function';

-- ============================================================================
-- Part 3: 记录回滚审计日志（在删除表之前）
-- ============================================================================

INSERT INTO system_admin_audit_logs (
    operator_user_id,
    operator_username,
    operator_role,
    action,
    action_type,
    change_summary,
    change_details,
    risk_level
) VALUES (
    1,
    'system',
    'migration_rollback',
    'migration_rollback',
    'delete',
    '回滚系统管理员权限管理增强 - Migration 20251026_02',
    jsonb_build_object(
        'migration_version', '20251026_02',
        'rollback_reason', 'Manual rollback or migration reversal',
        'note', 'All enhanced admin management features will be removed',
        'timestamp', NOW()
    ),
    'high'
);

RAISE NOTICE 'Logged rollback audit entry';

-- ============================================================================
-- Part 4: 备份现有数据（如果需要的话）
-- ============================================================================

-- 创建临时表备份system_users的admin相关数据（可选，根据需要）
CREATE TEMP TABLE IF NOT EXISTS temp_admin_data_backup AS
SELECT
    id,
    username,
    is_system_admin,
    admin_level,
    admin_scopes,
    admin_activated_at,
    admin_notes
FROM system_users
WHERE is_system_admin = TRUE;

RAISE NOTICE 'Backed up % admin users to temp table', (SELECT COUNT(*) FROM temp_admin_data_backup);

-- ============================================================================
-- Part 5: 删除索引
-- ============================================================================

DROP INDEX IF EXISTS idx_system_users_admin_scopes_gin;
DROP INDEX IF EXISTS idx_system_users_admin_activated;
DROP INDEX IF EXISTS idx_system_users_system_role;
DROP INDEX IF EXISTS idx_system_users_admin_level;
DROP INDEX IF EXISTS idx_system_users_is_system_admin;

DROP INDEX IF EXISTS idx_sys_admin_audit_approval;
DROP INDEX IF EXISTS idx_sys_admin_audit_result;
DROP INDEX IF EXISTS idx_sys_admin_audit_created;
DROP INDEX IF EXISTS idx_sys_admin_audit_action_type;
DROP INDEX IF EXISTS idx_sys_admin_audit_action;
DROP INDEX IF EXISTS idx_sys_admin_audit_target;
DROP INDEX IF EXISTS idx_sys_admin_audit_operator;

RAISE NOTICE 'Dropped 13 indexes';

-- ============================================================================
-- Part 6: 删除 system_admin_audit_logs 表
-- ============================================================================

DROP TABLE IF EXISTS system_admin_audit_logs CASCADE;

RAISE NOTICE 'Dropped system_admin_audit_logs table';

-- ============================================================================
-- Part 7: 删除 system_users 表的新增字段
-- ============================================================================

-- 删除字段注释
COMMENT ON COLUMN system_users.system_role_id IS NULL;
COMMENT ON COLUMN system_users.is_system_admin IS NULL;
COMMENT ON COLUMN system_users.admin_level IS NULL;
COMMENT ON COLUMN system_users.admin_scopes IS NULL;
COMMENT ON COLUMN system_users.admin_activated_at IS NULL;
COMMENT ON COLUMN system_users.admin_deactivated_at IS NULL;
COMMENT ON COLUMN system_users.admin_notes IS NULL;

-- 删除字段
ALTER TABLE system_users
DROP COLUMN IF EXISTS admin_notes,
DROP COLUMN IF EXISTS admin_deactivated_at,
DROP COLUMN IF EXISTS admin_activated_at,
DROP COLUMN IF EXISTS admin_scopes,
DROP COLUMN IF EXISTS admin_level,
DROP COLUMN IF EXISTS is_system_admin,
DROP COLUMN IF EXISTS system_role_id;

RAISE NOTICE 'Dropped 7 columns from system_users table';

-- ============================================================================
-- Part 8: 显示回滚信息
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration 20251026_02 rolled back successfully';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Changes reverted:';
    RAISE NOTICE '1. ✅ Dropped 2 views';
    RAISE NOTICE '2. ✅ Dropped trigger and trigger function';
    RAISE NOTICE '3. ✅ Dropped 13 indexes';
    RAISE NOTICE '4. ✅ Dropped system_admin_audit_logs table';
    RAISE NOTICE '5. ✅ Removed 7 columns from system_users table';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Note: Admin data backed up to temp_admin_data_backup';
    RAISE NOTICE 'To restore environment variable based admin management:';
    RAISE NOTICE '  FEATURE_SUPERADMIN_ENABLE=true';
    RAISE NOTICE '  SUPER_ADMIN_USERNAMES=admin,guoym,weier,fuxing';
    RAISE NOTICE '  SUPER_ADMIN_IDS=1,110,43,112';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

\echo '';
\echo '🔄 Rollback completed - System reverted to environment variable based admin management';
\echo '';
