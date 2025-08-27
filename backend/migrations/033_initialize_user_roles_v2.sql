-- 角色权限关联表初始化 (修订版)
-- 文件: 033_initialize_user_roles_v2.sql
-- 描述: 为现有用户分配默认角色，完成角色权限关联表初始化
-- 作者: Claude AI
-- 创建时间: 2025-08-27

BEGIN;

-- =============================================================================
-- 1. 为现有用户分配默认角色
-- =============================================================================

-- 为所有没有角色的用户分配默认角色
-- 根据邮箱域名或其他特征进行智能分配

-- 1. 为阿里巴巴域名的用户分配开发人员角色
UPDATE company_users 
SET role_id = (SELECT id FROM company_roles WHERE role_code = 'developer' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE email LIKE '%@alibaba.com' 
  AND role_id IS NULL;

-- 2. 为腾讯域名的用户分配设计师角色  
UPDATE company_users 
SET role_id = (SELECT id FROM company_roles WHERE role_code = 'designer' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE email LIKE '%@tencent.com' 
  AND role_id IS NULL;

-- 3. 为百度域名的用户分配测试人员角色
UPDATE company_users 
SET role_id = (SELECT id FROM company_roles WHERE role_code = 'tester' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE email LIKE '%@baidu.com' 
  AND role_id IS NULL;

-- 4. 为华为域名的用户分配项目经理角色
UPDATE company_users 
SET role_id = (SELECT id FROM company_roles WHERE role_code = 'project_manager' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE email LIKE '%@huawei.com' 
  AND role_id IS NULL;

-- 5. 为测试用户分配普通成员角色
UPDATE company_users 
SET role_id = (SELECT id FROM company_roles WHERE role_code = 'member' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE email LIKE '%@example.com' 
  AND role_id IS NULL;

-- 6. 为其余所有用户分配默认的普通成员角色
UPDATE company_users 
SET role_id = (SELECT id FROM company_roles WHERE role_code = 'member' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE role_id IS NULL;

-- =============================================================================
-- 2. 创建用户权限视图和函数
-- =============================================================================

-- 创建用户权限视图，便于权限检查
DROP VIEW IF EXISTS user_effective_permissions;
CREATE VIEW user_effective_permissions AS
SELECT DISTINCT
    cu.id as user_id,
    cu.name as user_name,
    cu.email,
    p.permission_code,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    'role' as permission_source
FROM company_users cu
JOIN company_roles r ON cu.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
JOIN permissions p ON rp.permission_id = p.id
WHERE cu.status = 'active' 
  AND r.is_active = true 
  AND p.is_active = true;

-- 创建权限检查函数
CREATE OR REPLACE FUNCTION check_user_permission(
    user_id_param INTEGER,
    permission_code_param VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    -- 检查用户是否有指定权限
    SELECT EXISTS(
        SELECT 1 
        FROM user_effective_permissions uep
        WHERE uep.user_id = user_id_param 
          AND uep.permission_code = permission_code_param
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- 创建获取用户所有权限的函数
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param INTEGER)
RETURNS TABLE (
    permission_code VARCHAR,
    permission_name VARCHAR,
    module VARCHAR,
    resource VARCHAR,
    action VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uep.permission_code,
        uep.permission_name,
        uep.module,
        uep.resource,
        uep.action
    FROM user_effective_permissions uep
    WHERE uep.user_id = user_id_param
    ORDER BY uep.module, uep.resource, uep.action;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. 权限缓存初始化
-- =============================================================================

-- 清空现有权限缓存
TRUNCATE TABLE permission_cache;

-- 为所有活跃用户生成权限缓存（24小时有效期）
INSERT INTO permission_cache (
    cache_key, 
    company_user_id, 
    permission_code, 
    has_permission, 
    source, 
    expires_at
)
SELECT 
    CONCAT('user:', cu.id, ':perm:', p.permission_code) as cache_key,
    cu.id as company_user_id,
    p.permission_code,
    true as has_permission,
    'role' as source,
    CURRENT_TIMESTAMP + INTERVAL '24 hours' as expires_at
FROM company_users cu
JOIN company_roles r ON cu.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
JOIN permissions p ON rp.permission_id = p.id
WHERE cu.status = 'active' 
  AND r.is_active = true 
  AND p.is_active = true;

-- =============================================================================
-- 4. 审计日志初始化
-- =============================================================================

-- 记录角色分配的审计日志
INSERT INTO permission_audit_logs (
    company_user_id,
    target_user_id,
    action_type,
    new_value,
    reason,
    performed_at
)
SELECT 
    cu.id,
    cu.id,
    'role_assigned',
    jsonb_build_object(
        'role_code', r.role_code,
        'role_name', r.role_name,
        'role_id', r.id
    ),
    'System initialization - automatic role assignment based on email domain',
    CURRENT_TIMESTAMP
FROM company_users cu
JOIN company_roles r ON cu.role_id = r.id
WHERE cu.role_id IS NOT NULL;

-- =============================================================================
-- 5. 数据验证和报告
-- =============================================================================

-- 生成初始化报告
DO $$
DECLARE
    total_users INTEGER;
    assigned_users INTEGER;
    total_permissions INTEGER;
    cached_permissions INTEGER;
    audit_entries INTEGER;
BEGIN
    -- 统计用户数据
    SELECT COUNT(*) INTO total_users FROM company_users WHERE status = 'active';
    SELECT COUNT(*) INTO assigned_users FROM company_users WHERE role_id IS NOT NULL AND status = 'active';
    
    -- 统计权限数据
    SELECT COUNT(*) INTO total_permissions FROM permissions WHERE is_active = true;
    SELECT COUNT(*) INTO cached_permissions FROM permission_cache;
    
    -- 统计审计数据
    SELECT COUNT(*) INTO audit_entries FROM permission_audit_logs WHERE action_type = 'role_assigned';
    
    -- 输出报告
    RAISE NOTICE '=== 角色权限初始化完成 ===';
    RAISE NOTICE '活跃用户总数: %', total_users;
    RAISE NOTICE '已分配角色用户数: %', assigned_users;
    RAISE NOTICE '系统权限总数: %', total_permissions;
    RAISE NOTICE '生成权限缓存条目: %', cached_permissions;
    RAISE NOTICE '创建审计日志条目: %', audit_entries;
    
    IF assigned_users = total_users THEN
        RAISE NOTICE '✅ 所有活跃用户都已分配角色';
    ELSE
        RAISE NOTICE '⚠️  仍有 % 个用户未分配角色', (total_users - assigned_users);
    END IF;
END $$;

COMMIT;
