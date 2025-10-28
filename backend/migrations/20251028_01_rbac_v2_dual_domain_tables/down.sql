-- ============================================================================
-- RBAC v2.0 双域架构表结构回滚
-- Migration: 20251028_01_rbac_v2_dual_domain_tables
-- Description: 回滚所有RBAC v2双域架构表
-- Author: AI Backend Team
-- Date: 2025-10-28
-- ============================================================================

-- 警告: 此回滚脚本将删除所有RBAC v2表和数据！
-- 执行前请确保已备份数据库！

BEGIN;

-- ============================================================================
-- 第一步: 删除users表中添加的列
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'system_role_id'
    ) THEN
        -- 删除索引
        DROP INDEX IF EXISTS idx_users_system_role;

        -- 删除列
        ALTER TABLE users DROP COLUMN IF EXISTS system_role_id;

        RAISE NOTICE '✅ 已删除 users.system_role_id 列';
    END IF;
END $$;

-- ============================================================================
-- 第二步: 删除企业域(Enterprise Domain)表
-- 注意: 需要按照外键依赖的逆序删除
-- ============================================================================

-- 2.5 删除企业用户自定义权限表
DROP TABLE IF EXISTS enterprise_user_custom_permissions CASCADE;
RAISE NOTICE '✅ 已删除表: enterprise_user_custom_permissions';

-- 2.4 删除企业用户角色表
DROP TABLE IF EXISTS enterprise_user_roles CASCADE;
RAISE NOTICE '✅ 已删除表: enterprise_user_roles';

-- 2.3 删除企业角色权限关联表
DROP TABLE IF EXISTS enterprise_role_permissions CASCADE;
RAISE NOTICE '✅ 已删除表: enterprise_role_permissions';

-- 2.2 删除企业权限表
DROP TABLE IF EXISTS enterprise_permissions CASCADE;
RAISE NOTICE '✅ 已删除表: enterprise_permissions';

-- 2.1 删除企业角色表
DROP TABLE IF EXISTS enterprise_roles CASCADE;
RAISE NOTICE '✅ 已删除表: enterprise_roles';

-- ============================================================================
-- 第三步: 删除系统域(System Domain)表
-- ============================================================================

-- 1.3 删除系统角色权限关联表
DROP TABLE IF EXISTS system_role_permissions CASCADE;
RAISE NOTICE '✅ 已删除表: system_role_permissions';

-- 1.2 删除系统权限表
DROP TABLE IF EXISTS system_permissions CASCADE;
RAISE NOTICE '✅ 已删除表: system_permissions';

-- 1.1 删除系统角色表
DROP TABLE IF EXISTS system_roles CASCADE;
RAISE NOTICE '✅ 已删除表: system_roles';

-- ============================================================================
-- 第四步: 验证回滚完成
-- ============================================================================

DO $$
DECLARE
    remaining_count INT;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'system_roles',
        'system_permissions',
        'system_role_permissions',
        'enterprise_roles',
        'enterprise_permissions',
        'enterprise_role_permissions',
        'enterprise_user_roles',
        'enterprise_user_custom_permissions'
    );

    IF remaining_count > 0 THEN
        RAISE WARNING '⚠️  仍有 % 个RBAC v2表未删除', remaining_count;
    ELSE
        RAISE NOTICE '✅ RBAC v2 双域架构表已完全回滚';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- 回滚完成
-- ============================================================================
-- 注意: 回滚后需要恢复使用旧的RBAC系统
-- 如果有数据迁移，请同时回滚数据迁移脚本
-- ============================================================================
