-- ============================================================================
-- Migration: 20251129_02_add_missing_enterprise_permissions
-- Description: 添加缺失的企业权限（用户管理和部门管理）
-- Author: Claude Code AI
-- Created: 2025-11-29
-- ============================================================================

BEGIN;

-- ============================================================================
-- 添加用户管理相关权限
-- ============================================================================

INSERT INTO enterprise_permissions (code, name, description, resource, action, is_active)
VALUES
    -- 用户管理权限
    ('enterprise.user.list', '查看用户列表', '可以查看企业内的用户列表', 'user', 'list', TRUE),
    ('enterprise.user.read', '查看用户详情', '可以查看企业内用户的详细信息', 'user', 'read', TRUE),
    ('enterprise.user.create', '创建用户', '可以在企业内创建新用户', 'user', 'create', TRUE),
    ('enterprise.user.update', '更新用户', '可以修改企业内用户的信息', 'user', 'update', TRUE),
    ('enterprise.user.delete', '删除用户', '可以从企业中删除用户', 'user', 'delete', TRUE),
    ('enterprise.user.manage_roles', '管理用户角色', '可以为用户分配或取消角色', 'user', 'manage_roles', TRUE),

    -- 部门管理权限
    ('enterprise.department.list', '查看部门列表', '可以查看企业内的部门列表', 'department', 'list', TRUE),
    ('enterprise.department.read', '查看部门详情', '可以查看企业内部门的详细信息', 'department', 'read', TRUE),
    ('enterprise.department.create', '创建部门', '可以在企业内创建新部门', 'department', 'create', TRUE),
    ('enterprise.department.update', '更新部门', '可以修改企业内部门的信息', 'department', 'update', TRUE),
    ('enterprise.department.delete', '删除部门', '可以删除企业内的部门', 'department', 'delete', TRUE),

    -- 企业信息权限
    ('enterprise.info.read', '查看企业信息', '可以查看企业的基本信息', 'info', 'read', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 为现有的企业管理员角色分配新权限
-- ============================================================================

-- 获取所有新添加的权限ID，并为每个企业的管理员角色分配这些权限
INSERT INTO enterprise_role_permissions (role_id, permission_id, created_at)
SELECT DISTINCT er.id, ep.id, NOW()
FROM enterprise_roles er
CROSS JOIN enterprise_permissions ep
WHERE er.code = 'enterprise_admin'
  AND ep.code IN (
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
  AND NOT EXISTS (
      SELECT 1 FROM enterprise_role_permissions erp
      WHERE erp.role_id = er.id AND erp.permission_id = ep.id
  );

-- ============================================================================
-- 验证
-- ============================================================================

DO $$
DECLARE
    perm_count INT;
BEGIN
    SELECT COUNT(*) INTO perm_count
    FROM enterprise_permissions
    WHERE code LIKE 'enterprise.user.%' OR code LIKE 'enterprise.department.%' OR code = 'enterprise.info.read';

    RAISE NOTICE 'Added/verified % user/department/info permissions', perm_count;
END $$;

COMMIT;
