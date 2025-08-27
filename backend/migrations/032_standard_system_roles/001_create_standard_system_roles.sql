-- 标准系统角色数据初始化
-- 文件: 001_create_standard_system_roles.sql
-- 描述: 创建6个标准系统角色以及对应权限分配
-- 作者: Claude AI (任务#622)
-- 创建时间: 2025-08-27
-- 任务: 任务#622 - 创建默认系统角色数据初始化

-- =============================================================================
-- 1. 创建标准系统角色
-- =============================================================================

BEGIN;

-- 删除可能存在的冲突角色（非系统角色或非标准的）
-- DELETE FROM company_roles WHERE role_code IN ('super_admin', 'admin') AND is_system_role = false;

-- 插入标准系统角色（6个）
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at) VALUES
    ('superadmin', '超级管理员', '拥有系统所有权限的最高级别管理员，无权限限制', true, true, NOW(), NOW()),
    ('system_admin', '系统管理员', '系统管理员，负责系统配置和用户管理', true, true, NOW(), NOW()),
    ('system_operator', '系统操作员', '系统操作员，负责日常操作和监控', true, true, NOW(), NOW()),
    ('system_auditor', '系统审计员', '系统审计员，负责安全审计和合规检查', true, true, NOW(), NOW()),
    ('system_support', '系统支持员', '系统支持员，负责技术支持和故障排除', true, true, NOW(), NOW()),
    ('system_guest', '系统访客', '系统访客，只有基础的查看权限', true, true, NOW(), NOW())
ON CONFLICT (role_code) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================================================
-- 2. 为标准角色分配权限
-- =============================================================================

-- SuperAdmin: 拥有所有权限
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT r.id, p.id, true, NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'superadmin'
ON CONFLICT (role_id, permission_id) DO UPDATE SET 
    is_granted = EXCLUDED.is_granted;

-- SystemAdmin: 除了某些超级权限外的大部分管理权限
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT r.id, p.id, true, NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'system_admin'
  AND p.permission_code IN (
    -- 系统管理权限（除了超级管理员专属权限）
    'system.users.read', 'system.users.create', 'system.users.update', 'system.users.delete',
    'system.roles.read', 'system.roles.create', 'system.roles.update', 'system.roles.delete',
    'system.audit.read', 'system.config.read', 'system.config.update',
    -- 公司管理权限
    'company.read', 'company.update', 'company.members.read', 
    'company.members.create', 'company.members.update', 'company.members.delete',
    'company.departments.manage',
    -- 项目管理权限
    'project.read', 'project.create', 'project.update', 'project.delete',
    'project.detail.read', 'project.members.read', 'project.members.manage',
    'project.settings.read', 'project.settings.update',
    -- 任务管理权限
    'task.read', 'task.create', 'task.update', 'task.delete', 'task.assign',
    'task.status.update', 'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.log', 'task.time.read', 'task.bulk.update', 'task.bulk.delete',
    -- 文档管理权限
    'document.read', 'document.create', 'document.update', 'document.delete',
    'document.share', 'document.version.read', 'document.version.restore',
    'document.folder.create', 'document.folder.manage',
    -- 财务管理权限
    'finance.read', 'finance.contracts.read', 'finance.contracts.manage',
    'finance.reports.read', 'finance.reports.export',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET 
    is_granted = EXCLUDED.is_granted;

-- SystemOperator: 操作和监控权限
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT r.id, p.id, true, NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'system_operator'
  AND p.permission_code IN (
    -- 系统监控和基础操作权限
    'system.users.read', 'system.audit.read', 'system.config.read',
    -- 公司信息查看
    'company.read', 'company.members.read',
    -- 项目操作权限
    'project.read', 'project.detail.read', 'project.members.read',
    'project.update', 'project.settings.read',
    -- 任务操作权限
    'task.read', 'task.create', 'task.update', 'task.status.update',
    'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.log', 'task.time.read', 'task.bulk.update',
    -- 文档操作权限
    'document.read', 'document.create', 'document.update',
    'document.share', 'document.version.read', 'document.folder.create',
    -- 基础财务查看权限
    'finance.read', 'finance.contracts.read', 'finance.reports.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET 
    is_granted = EXCLUDED.is_granted;

-- SystemAuditor: 审计和监控权限
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT r.id, p.id, true, NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'system_auditor'
  AND p.permission_code IN (
    -- 审计相关权限（主要是查看权限）
    'system.users.read', 'system.roles.read', 'system.audit.read', 'system.config.read',
    -- 公司信息查看
    'company.read', 'company.members.read',
    -- 项目审计权限
    'project.read', 'project.detail.read', 'project.members.read', 'project.settings.read',
    -- 任务审计权限
    'task.read', 'task.comment.read', 'task.attachment.download',
    'task.time.read',
    -- 文档审计权限
    'document.read', 'document.version.read',
    -- 财务审计权限
    'finance.read', 'finance.contracts.read', 'finance.reports.read', 'finance.reports.export',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET 
    is_granted = EXCLUDED.is_granted;

-- SystemSupport: 技术支持权限
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT r.id, p.id, true, NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'system_support'
  AND p.permission_code IN (
    -- 支持相关权限
    'system.users.read', 'system.users.update', 'system.audit.read', 'system.config.read',
    -- 公司支持权限
    'company.read', 'company.members.read', 'company.members.update',
    -- 项目支持权限
    'project.read', 'project.detail.read', 'project.members.read', 'project.update',
    -- 任务支持权限
    'task.read', 'task.update', 'task.status.update',
    'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.read',
    -- 文档支持权限
    'document.read', 'document.update', 'document.version.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET 
    is_granted = EXCLUDED.is_granted;

-- SystemGuest: 基础查看权限
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT r.id, p.id, true, NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'system_guest'
  AND p.permission_code IN (
    -- 基础查看权限
    'company.read', 'company.members.read',
    'project.read', 'project.detail.read', 'project.members.read',
    'task.read', 'task.comment.read', 'task.attachment.download',
    'document.read', 'document.version.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET 
    is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 3. 创建角色验证视图（用于验证角色权限设置）
-- =============================================================================

CREATE OR REPLACE VIEW v_system_role_permissions AS
SELECT 
    r.id as role_id,
    r.role_code,
    r.role_name,
    r.role_description,
    COUNT(rp.permission_id) as permission_count,
    r.is_system_role,
    r.is_active,
    r.created_at,
    r.updated_at
FROM company_roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
WHERE r.is_system_role = true
GROUP BY r.id, r.role_code, r.role_name, r.role_description, r.is_system_role, r.is_active, r.created_at, r.updated_at
ORDER BY r.role_code;

-- =============================================================================
-- 4. 记录迁移日志
-- =============================================================================

-- 插入迁移记录（如果有迁移日志表的话）
-- INSERT INTO migration_logs (migration_name, description, executed_at) 
-- VALUES ('032_standard_system_roles', '创建6个标准系统角色和权限分配', NOW());

COMMIT;

-- =============================================================================
-- 5. 验证创建结果
-- =============================================================================

-- 查看创建的标准系统角色
SELECT 'Created Standard System Roles:' as info;
SELECT role_code, role_name, permission_count, is_active 
FROM v_system_role_permissions 
WHERE role_code IN ('superadmin', 'system_admin', 'system_operator', 'system_auditor', 'system_support', 'system_guest');
