-- ============================================================================
-- Migration Rollback: 20251129_02_add_missing_enterprise_permissions
-- Description: 回滚添加的企业权限
-- ============================================================================

BEGIN;

-- 删除角色权限关联
DELETE FROM enterprise_role_permissions
WHERE permission_id IN (
    SELECT id FROM enterprise_permissions
    WHERE code IN (
        'enterprise.user.list',
        'enterprise.user.read',
        'enterprise.user.create',
        'enterprise.user.update',
        'enterprise.user.delete',
        'enterprise.user.manage_roles',
        'enterprise.department.list',
        'enterprise.department.read',
        'enterprise.department.create',
        'enterprise.department.update',
        'enterprise.department.delete',
        'enterprise.info.read'
    )
);

-- 删除权限
DELETE FROM enterprise_permissions
WHERE code IN (
    'enterprise.user.list',
    'enterprise.user.read',
    'enterprise.user.create',
    'enterprise.user.update',
    'enterprise.user.delete',
    'enterprise.user.manage_roles',
    'enterprise.department.list',
    'enterprise.department.read',
    'enterprise.department.create',
    'enterprise.department.update',
    'enterprise.department.delete',
    'enterprise.info.read'
);

COMMIT;
