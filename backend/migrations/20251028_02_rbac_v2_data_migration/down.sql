-- ============================================================================
-- RBAC v2.0 数据迁移回滚脚本
-- Migration: 20251028_02_rbac_v2_data_migration
-- Description: 回滚数据迁移，清空新RBAC表中的迁移数据
-- Author: AI Backend Team
-- Date: 2025-10-28
-- ============================================================================

BEGIN;

-- ⚠️  警告: 此脚本将清空所有迁移的数据！
RAISE NOTICE '⚠️  开始回滚RBAC v2数据迁移...';

-- ============================================================================
-- 第一步: 清空企业用户角色分配
-- ============================================================================
DELETE FROM enterprise_user_roles;
RAISE NOTICE '✅ 已清空 enterprise_user_roles 表';

-- ============================================================================
-- 第二步: 清空企业角色权限映射
-- ============================================================================
DELETE FROM enterprise_role_permissions;
RAISE NOTICE '✅ 已清空 enterprise_role_permissions 表';

-- ============================================================================
-- 第三步: 删除企业预设角色
-- ============================================================================
DELETE FROM enterprise_roles WHERE is_preset = TRUE;
RAISE NOTICE '✅ 已删除所有企业预设角色';

-- ============================================================================
-- 第四步: 清除用户的系统角色分配
-- ============================================================================
UPDATE users SET system_role_id = NULL WHERE system_role_id IS NOT NULL;
RAISE NOTICE '✅ 已清除所有用户的系统角色分配';

-- ============================================================================
-- 验证回滚结果
-- ============================================================================
DO $$
DECLARE
    eur_count INT;
    erp_count INT;
    er_count INT;
    system_role_count INT;
BEGIN
    SELECT COUNT(*) INTO eur_count FROM enterprise_user_roles;
    SELECT COUNT(*) INTO erp_count FROM enterprise_role_permissions;
    SELECT COUNT(*) INTO er_count FROM enterprise_roles WHERE is_preset = TRUE;
    SELECT COUNT(*) INTO system_role_count FROM users WHERE system_role_id IS NOT NULL;

    RAISE NOTICE '验证结果:';
    RAISE NOTICE '  enterprise_user_roles: %', eur_count;
    RAISE NOTICE '  enterprise_role_permissions: %', erp_count;
    RAISE NOTICE '  enterprise预设角色: %', er_count;
    RAISE NOTICE '  用户系统角色分配: %', system_role_count;

    IF eur_count > 0 OR erp_count > 0 OR er_count > 0 OR system_role_count > 0 THEN
        RAISE WARNING '⚠️  回滚可能不完整';
    ELSE
        RAISE NOTICE '✅ 数据迁移已完全回滚';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- 回滚完成
-- ============================================================================
