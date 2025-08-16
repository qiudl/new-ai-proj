-- Migration: 009 - Remove Client Role
-- Description: Remove the 'client' role (甲方客户) from the system
-- Created: 2025-07-22

BEGIN;

-- ===========================================
-- 阶段1: 数据迁移 - 将现有client用户转换为company_user
-- ===========================================

-- 首先备份现有数据
CREATE TABLE IF NOT EXISTS users_backup_009 AS 
SELECT * FROM users WHERE role = 'client';

-- 将所有client角色用户转换为company_user角色
UPDATE users 
SET role = 'company_user', updated_at = NOW()
WHERE role = 'client';

-- 记录转换信息
DO $$
DECLARE
    v_converted_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_converted_users FROM users_backup_009;
    RAISE NOTICE '已将 % 个client用户转换为company_user用户', v_converted_users;
END $$;

-- ===========================================
-- 阶段2: 更新角色约束
-- ===========================================

-- 删除旧的角色约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_type_check;

-- 添加新的角色约束（移除client）
ALTER TABLE users ADD CONSTRAINT users_role_type_check 
CHECK (
    (user_type = 'system' AND role IN ('admin', 'project_manager', 'developer')) OR
    (user_type = 'company' AND role IN ('company_admin', 'company_user'))
);

-- ===========================================
-- 阶段3: 清理权限模板表中的client记录
-- ===========================================

-- 删除client角色的权限模板
DELETE FROM company_user_permission_templates 
WHERE role_code = 'client';

-- ===========================================
-- 阶段4: 更新用户统计视图
-- ===========================================

-- 重新创建用户统计视图（移除client统计）
DROP VIEW IF EXISTS user_stats_enhanced;
CREATE VIEW user_stats_enhanced AS
SELECT 
    COUNT(*) as total_users,
    -- 按用户类型统计
    COUNT(*) FILTER (WHERE user_type = 'system') as system_users,
    COUNT(*) FILTER (WHERE user_type = 'company') as company_users,
    -- 按状态统计
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
    -- 按系统用户角色统计
    COUNT(*) FILTER (WHERE user_type = 'system' AND role = 'admin') as admin_count,
    COUNT(*) FILTER (WHERE user_type = 'system' AND role = 'project_manager') as project_manager_count,
    COUNT(*) FILTER (WHERE user_type = 'system' AND role = 'developer') as developer_count,
    -- 按企业用户角色统计（移除client_count）
    COUNT(*) FILTER (WHERE user_type = 'company' AND role = 'company_admin') as company_admin_count,
    COUNT(*) FILTER (WHERE user_type = 'company' AND role = 'company_user') as company_user_count,
    -- 其他统计
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_registrations,
    COUNT(DISTINCT company_id) FILTER (WHERE user_type = 'company') as companies_with_users
FROM users;

-- ===========================================
-- 阶段5: 验证迁移结果
-- ===========================================

DO $$
DECLARE
    v_remaining_clients INTEGER;
    v_converted_users INTEGER;
BEGIN
    -- 检查是否还有client用户残留
    SELECT COUNT(*) INTO v_remaining_clients FROM users WHERE role = 'client';
    
    IF v_remaining_clients > 0 THEN
        RAISE EXCEPTION '迁移失败: 仍有 % 个client用户存在', v_remaining_clients;
    ELSE
        RAISE NOTICE '✓ 迁移成功: 所有client用户已转换';
    END IF;
    
    -- 统计转换后的用户数量
    SELECT COUNT(*) INTO v_converted_users FROM users WHERE role = 'company_user';
    RAISE NOTICE '✓ 当前company_user用户数量: %', v_converted_users;
END $$;

COMMIT;

-- ===========================================
-- 显示迁移结果
-- ===========================================

SELECT 
    '=== 迁移后用户角色统计 ===' as info,
    user_type,
    role,
    COUNT(*) as count
FROM users 
GROUP BY user_type, role
ORDER BY user_type, role;

SELECT 
    '=== 企业用户统计 ===' as info,
    role,
    COUNT(*) as count
FROM users 
WHERE user_type = 'company'
GROUP BY role
ORDER BY role;
