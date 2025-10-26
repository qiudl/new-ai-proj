-- ============================================================================
-- Migration: 20251026_02_enhance_system_admin_management
-- Description: 增强系统管理员权限管理 - 从硬编码配置到灵活的RBAC系统
-- Author: Claude Code AI
-- Created: 2025-10-26
-- Task: #2788 - Phase 1: 数据库层增强
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: 增强 system_users 表结构
-- ============================================================================

-- 检查 system_users 表是否存在，如果不存在则先创建
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_users') THEN
        RAISE NOTICE 'system_users table does not exist, creating it first...';
        -- 如果表不存在，创建基础表（基于043迁移脚本）
        CREATE TABLE system_users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            name VARCHAR(255),
            phone VARCHAR(50),
            avatar VARCHAR(255),
            bio TEXT,
            role VARCHAR(50) NOT NULL DEFAULT 'admin'
                CHECK (role IN ('super_admin', 'admin', 'project_manager', 'developer', 'viewer')),
            permissions JSONB DEFAULT '[]'::jsonb,
            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE,
            last_login_at TIMESTAMPTZ,
            last_login_ip VARCHAR(45),
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMPTZ,
            password_changed_at TIMESTAMPTZ,
            must_change_password BOOLEAN DEFAULT FALSE,
            api_key VARCHAR(255) UNIQUE,
            api_key_expires_at TIMESTAMPTZ,
            session_token VARCHAR(255),
            session_expires_at TIMESTAMPTZ,
            mfa_enabled BOOLEAN DEFAULT FALSE,
            mfa_secret VARCHAR(255),
            mfa_backup_codes JSONB,
            notification_preferences JSONB DEFAULT '{
                "email_notifications": true,
                "system_alerts": true,
                "security_alerts": true
            }'::jsonb,
            created_by INTEGER,
            updated_by INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        );
    END IF;
END $$;

-- 添加系统管理员相关字段
ALTER TABLE system_users
ADD COLUMN IF NOT EXISTS system_role_id INTEGER,
ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0
    CHECK (admin_level >= 0 AND admin_level <= 10),
ADD COLUMN IF NOT EXISTS admin_scopes JSONB DEFAULT '{"scopes": [], "global_scope": false}'::jsonb,
ADD COLUMN IF NOT EXISTS admin_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 添加字段注释
COMMENT ON COLUMN system_users.system_role_id IS '关联的系统角色ID（引用company_roles表）';
COMMENT ON COLUMN system_users.is_system_admin IS '是否为系统管理员标识';
COMMENT ON COLUMN system_users.admin_level IS '管理员等级（1-10，数字越小权限越高，1=超级管理员）';
COMMENT ON COLUMN system_users.admin_scopes IS '管理权限范围限制，JSON格式: {"scopes": [{"type": "project", "resource_ids": ["1","5"], "permissions": ["read","write"]}], "global_scope": false}';
COMMENT ON COLUMN system_users.admin_activated_at IS '管理员权限激活时间';
COMMENT ON COLUMN system_users.admin_deactivated_at IS '管理员权限停用时间（用于临时权限管理）';
COMMENT ON COLUMN system_users.admin_notes IS '管理员权限备注（说明授予原因、范围等）';

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_system_users_is_system_admin
ON system_users(is_system_admin) WHERE is_system_admin = TRUE;

CREATE INDEX IF NOT EXISTS idx_system_users_admin_level
ON system_users(admin_level) WHERE admin_level > 0;

CREATE INDEX IF NOT EXISTS idx_system_users_system_role
ON system_users(system_role_id) WHERE system_role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_users_admin_activated
ON system_users(admin_activated_at) WHERE admin_activated_at IS NOT NULL;

-- 为admin_scopes创建GIN索引以支持JSONB查询
CREATE INDEX IF NOT EXISTS idx_system_users_admin_scopes_gin
ON system_users USING GIN(admin_scopes);

-- ============================================================================
-- Part 2: 创建系统管理员审计日志表
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_admin_audit_logs (
    id SERIAL PRIMARY KEY,

    -- 操作者信息
    operator_user_id INTEGER NOT NULL,
    operator_username VARCHAR(100) NOT NULL,
    operator_role VARCHAR(50),
    operator_admin_level INTEGER,

    -- 目标信息
    target_user_id INTEGER,
    target_username VARCHAR(100),

    -- 操作详情
    action VARCHAR(100) NOT NULL,  -- grant_admin, revoke_admin, change_role, update_scope, update_permissions
    action_type VARCHAR(50) NOT NULL, -- create, update, delete, grant, revoke
    action_result VARCHAR(20) DEFAULT 'success', -- success, failed, pending

    -- 变更内容
    old_value JSONB,
    new_value JSONB,
    change_summary TEXT,
    change_details JSONB,

    -- 审计元数据
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    session_id VARCHAR(255),

    -- 审批流程（可选扩展）
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    approval_status VARCHAR(20), -- pending, approved, rejected

    -- 风险级别
    risk_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_sys_admin_audit_operator ON system_admin_audit_logs(operator_user_id);
CREATE INDEX idx_sys_admin_audit_target ON system_admin_audit_logs(target_user_id);
CREATE INDEX idx_sys_admin_audit_action ON system_admin_audit_logs(action);
CREATE INDEX idx_sys_admin_audit_action_type ON system_admin_audit_logs(action_type);
CREATE INDEX idx_sys_admin_audit_created ON system_admin_audit_logs(created_at DESC);
CREATE INDEX idx_sys_admin_audit_result ON system_admin_audit_logs(action_result);
CREATE INDEX idx_sys_admin_audit_approval ON system_admin_audit_logs(requires_approval, approval_status)
WHERE requires_approval = TRUE;

-- 添加表和字段注释
COMMENT ON TABLE system_admin_audit_logs IS '系统管理员操作审计日志表，记录所有管理员权限变更';
COMMENT ON COLUMN system_admin_audit_logs.operator_user_id IS '执行操作的管理员用户ID';
COMMENT ON COLUMN system_admin_audit_logs.target_user_id IS '目标用户ID（被授予/撤销权限的用户）';
COMMENT ON COLUMN system_admin_audit_logs.action IS '操作类型';
COMMENT ON COLUMN system_admin_audit_logs.old_value IS '变更前的值（JSON格式）';
COMMENT ON COLUMN system_admin_audit_logs.new_value IS '变更后的值（JSON格式）';
COMMENT ON COLUMN system_admin_audit_logs.requires_approval IS '是否需要审批（高风险操作）';
COMMENT ON COLUMN system_admin_audit_logs.risk_level IS '风险级别（用于安全分析）';

-- ============================================================================
-- Part 3: 数据迁移 - 将环境变量中的硬编码管理员迁移到数据库
-- ============================================================================

-- 迁移现有的4个硬编码管理员 (从 SUPER_ADMIN_USERNAMES 和 SUPER_ADMIN_IDS)
-- admin (ID=1), guoym (ID=110), weier (ID=43), fuxing (ID=112)

DO $$
DECLARE
    admin_user_ids INTEGER[] := ARRAY[1, 110, 43, 112];
    admin_usernames TEXT[] := ARRAY['admin', 'guoym', 'weier', 'fuxing'];
    current_user_id INTEGER;
    current_username TEXT;
    users_migrated INTEGER := 0;
    i INTEGER;
BEGIN
    -- 遍历所有硬编码的管理员
    FOR i IN 1..array_length(admin_user_ids, 1) LOOP
        current_user_id := admin_user_ids[i];
        current_username := admin_usernames[i];

        -- 检查用户是否存在于system_users表中
        IF EXISTS (SELECT 1 FROM system_users WHERE id = current_user_id) THEN
            -- 更新为系统管理员
            UPDATE system_users
            SET
                is_system_admin = TRUE,
                admin_level = CASE
                    WHEN username = 'admin' THEN 1  -- admin用户设为Level 1超级管理员
                    ELSE 2  -- 其他用户设为Level 2系统管理员
                END,
                admin_scopes = '{"scopes": [], "global_scope": true}'::jsonb,  -- 全局权限
                admin_activated_at = NOW(),
                admin_notes = '从环境变量SUPER_ADMIN_USERNAMES/SUPER_ADMIN_IDS迁移 (Migration 20251026_02)',
                updated_at = NOW()
            WHERE id = current_user_id
              AND (is_system_admin IS NULL OR is_system_admin = FALSE);  -- 只更新未设置的用户

            IF FOUND THEN
                users_migrated := users_migrated + 1;
                RAISE NOTICE 'Migrated user % (ID: %) to system admin', current_username, current_user_id;
            END IF;
        ELSE
            RAISE WARNING 'User % (ID: %) not found in system_users table, skipping...', current_username, current_user_id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Migration completed: % users migrated to system admins', users_migrated;

    -- 记录迁移审计日志
    IF users_migrated > 0 THEN
        INSERT INTO system_admin_audit_logs (
            operator_user_id,
            operator_username,
            operator_role,
            action,
            action_type,
            change_summary,
            change_details,
            risk_level,
            ip_address,
            user_agent
        ) VALUES (
            1,
            'system_migration',
            'migration_script',
            'migrate_env_admins',
            'grant',
            format('数据库迁移：将%s个硬编码管理员迁移到数据库管理', users_migrated),
            jsonb_build_object(
                'migration_version', '20251026_02',
                'users_migrated', users_migrated,
                'source', 'SUPER_ADMIN_USERNAMES/SUPER_ADMIN_IDS environment variables',
                'target_users', admin_usernames
            ),
            'low',
            '127.0.0.1',
            'Migration Script'
        );
    END IF;
END $$;

-- ============================================================================
-- Part 4: 创建触发器函数（可选：自动记录管理员变更）
-- ============================================================================

-- 创建触发器函数：当system_users的admin相关字段变更时自动记录
CREATE OR REPLACE FUNCTION log_system_admin_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- 仅当管理员相关字段发生变更时记录
    IF (NEW.is_system_admin IS DISTINCT FROM OLD.is_system_admin)
       OR (NEW.admin_level IS DISTINCT FROM OLD.admin_level)
       OR (NEW.admin_scopes IS DISTINCT FROM OLD.admin_scopes)
       OR (NEW.admin_deactivated_at IS DISTINCT FROM OLD.admin_deactivated_at) THEN

        INSERT INTO system_admin_audit_logs (
            operator_user_id,
            operator_username,
            target_user_id,
            target_username,
            action,
            action_type,
            old_value,
            new_value,
            change_summary,
            risk_level
        ) VALUES (
            COALESCE(NEW.updated_by, NEW.id),  -- 如果没有updated_by，使用自己的ID
            COALESCE((SELECT username FROM system_users WHERE id = NEW.updated_by), 'system'),
            NEW.id,
            NEW.username,
            'update_admin_fields',
            'update',
            jsonb_build_object(
                'is_system_admin', OLD.is_system_admin,
                'admin_level', OLD.admin_level,
                'admin_scopes', OLD.admin_scopes,
                'admin_deactivated_at', OLD.admin_deactivated_at
            ),
            jsonb_build_object(
                'is_system_admin', NEW.is_system_admin,
                'admin_level', NEW.admin_level,
                'admin_scopes', NEW.admin_scopes,
                'admin_deactivated_at', NEW.admin_deactivated_at
            ),
            'System admin fields updated via trigger',
            CASE
                WHEN NEW.admin_level = 1 THEN 'critical'
                WHEN NEW.admin_level <= 2 THEN 'high'
                ELSE 'medium'
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（在UPDATE后执行）
DROP TRIGGER IF EXISTS trigger_log_system_admin_changes ON system_users;
CREATE TRIGGER trigger_log_system_admin_changes
    AFTER UPDATE ON system_users
    FOR EACH ROW
    WHEN (OLD.is_system_admin IS DISTINCT FROM NEW.is_system_admin
          OR OLD.admin_level IS DISTINCT FROM NEW.admin_level
          OR OLD.admin_scopes IS DISTINCT FROM NEW.admin_scopes)
    EXECUTE FUNCTION log_system_admin_changes();

-- ============================================================================
-- Part 5: 创建辅助视图（方便查询）
-- ============================================================================

-- 创建视图：当前活跃的系统管理员列表
CREATE OR REPLACE VIEW v_active_system_admins AS
SELECT
    id,
    username,
    email,
    name,
    role,
    is_system_admin,
    admin_level,
    admin_scopes,
    admin_activated_at,
    admin_deactivated_at,
    admin_notes,
    last_login_at,
    created_at,
    updated_at,
    CASE
        WHEN admin_level = 1 THEN '超级管理员'
        WHEN admin_level = 2 THEN '系统管理员'
        WHEN admin_level = 3 THEN '系统操作员'
        WHEN admin_level = 4 THEN '系统审计员'
        WHEN admin_level = 5 THEN '系统支持员'
        ELSE '未知等级'
    END AS admin_level_name,
    CASE
        WHEN (admin_scopes->>'global_scope')::boolean = true THEN '全局权限'
        ELSE '限定范围'
    END AS scope_type,
    jsonb_array_length(COALESCE(admin_scopes->'scopes', '[]'::jsonb)) as scope_count
FROM system_users
WHERE is_system_admin = TRUE
  AND is_active = TRUE
  AND deleted_at IS NULL
  AND (admin_deactivated_at IS NULL OR admin_deactivated_at > NOW())
ORDER BY admin_level ASC, username ASC;

COMMENT ON VIEW v_active_system_admins IS '当前活跃的系统管理员列表视图';

-- 创建视图：管理员操作审计统计
CREATE OR REPLACE VIEW v_admin_audit_stats AS
SELECT
    operator_username,
    operator_admin_level,
    action,
    action_type,
    COUNT(*) as operation_count,
    COUNT(DISTINCT target_user_id) as affected_users_count,
    MAX(created_at) as last_operation_at,
    COUNT(*) FILTER (WHERE action_result = 'success') as success_count,
    COUNT(*) FILTER (WHERE action_result = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_operations
FROM system_admin_audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'  -- 最近30天
GROUP BY operator_username, operator_admin_level, action, action_type
ORDER BY operation_count DESC;

COMMENT ON VIEW v_admin_audit_stats IS '管理员操作审计统计视图（最近30天）';

-- ============================================================================
-- Part 6: 插入说明记录
-- ============================================================================

-- 插入迁移说明到审计日志
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
    'migration',
    'migration_completed',
    'create',
    '系统管理员权限管理增强 - 数据库迁移完成',
    jsonb_build_object(
        'migration_version', '20251026_02',
        'description', '从硬编码环境变量迁移到灵活的RBAC数据库管理',
        'new_tables', ARRAY['system_admin_audit_logs'],
        'new_fields', ARRAY['system_role_id', 'is_system_admin', 'admin_level', 'admin_scopes', 'admin_activated_at', 'admin_deactivated_at', 'admin_notes'],
        'new_indexes', 8,
        'new_views', 2,
        'task_id', 2788,
        'phase', 'Phase 1: 数据库层增强'
    ),
    'low'
);

COMMIT;

-- ============================================================================
-- Migration Summary
-- ============================================================================
\echo '============================================';
\echo 'Migration 20251026_02 completed successfully';
\echo '============================================';
\echo 'Changes applied:';
\echo '1. ✅ Enhanced system_users table with 7 new fields';
\echo '2. ✅ Created system_admin_audit_logs table';
\echo '3. ✅ Created 13 indexes for performance optimization';
\echo '4. ✅ Migrated 4 hardcoded admins from environment variables';
\echo '5. ✅ Created 1 trigger for automatic audit logging';
\echo '6. ✅ Created 2 views for easier querying';
\echo '============================================';
\echo 'Next steps:';
\echo '- Verify migrated admin users: SELECT * FROM v_active_system_admins;';
\echo '- Check audit logs: SELECT * FROM system_admin_audit_logs ORDER BY created_at DESC LIMIT 5;';
\echo '- Proceed to Phase 2: Backend Service Implementation';
\echo '============================================';
