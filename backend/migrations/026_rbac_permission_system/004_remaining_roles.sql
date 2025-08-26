-- RBAC权限系统 - 剩余角色权限分配
-- 文件: 004_remaining_roles.sql
-- 描述: 为剩余角色分配权限
-- 作者: Claude AI
-- 创建时间: 2025-08-26

-- 业务分析师权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'business_analyst'
  AND p.permission_code IN (
    -- 项目权限（查看和分析）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务权限（主要是分析和需求管理）
    'task.read', 'task.create', 'task.update', 'task.status.update',
    'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.read', -- 通常不需要记录工时，但需要查看
    -- 文档权限（需要较多文档权限进行需求分析）
    'document.read', 'document.create', 'document.update',
    'document.share', 'document.version.read', 'document.folder.create',
    -- 财务权限（需要了解项目财务情况）
    'finance.read', 'finance.contracts.read', 'finance.reports.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 财务经理权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'finance_manager'
  AND p.permission_code IN (
    -- 项目权限（财务相关的查看权限）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务权限（主要是查看工时和成本）
    'task.read', 'task.time.read', 'task.comment.read',
    -- 文档权限（财务文档管理）
    'document.read', 'document.create', 'document.update',
    'document.share', 'document.version.read', 'document.folder.create', 'document.folder.manage',
    -- 财务权限（完整财务管理权限）
    'finance.read', 'finance.contracts.read', 'finance.contracts.manage',
    'finance.reports.read', 'finance.reports.export',
    -- 公司信息查看权限
    'company.read', 'company.members.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HR经理权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'hr_manager'
  AND p.permission_code IN (
    -- 公司管理权限（人员相关）
    'company.read', 'company.update', 'company.members.read', 
    'company.members.create', 'company.members.update', 'company.members.delete',
    'company.departments.manage',
    -- 项目权限（查看项目人员配置）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务权限（主要是查看工时用于人员管理）
    'task.read', 'task.time.read', 'task.comment.read',
    -- 文档权限
    'document.read', 'document.create', 'document.update',
    'document.share', 'document.folder.create', 'document.folder.manage',
    -- 用户管理权限
    'system.users.read', 'system.users.create', 'system.users.update',
    'system.roles.read', 'system.audit.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 客户用户权限（外部用户，权限受限）
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'client_user'
  AND p.permission_code IN (
    -- 项目权限（只能查看分配给他们的项目）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务权限（主要是查看和反馈）
    'task.read', 'task.comment.read', 'task.comment.create',
    'task.attachment.download', -- 可以下载但不能上传
    -- 文档权限（只读）
    'document.read', 'document.version.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 访客权限（最低权限）
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'guest'
  AND p.permission_code IN (
    -- 只有基础的查看权限
    'project.read', 'task.read', 'document.read',
    -- 个人权限
    'profile.read', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================================================
-- 4. 创建默认的系统管理员用户（如果不存在）
-- =============================================================================

-- 检查是否需要创建默认管理员
DO $$
DECLARE
    v_admin_role_id INTEGER;
    v_user_count INTEGER;
BEGIN
    -- 获取超级管理员角色ID
    SELECT id INTO v_admin_role_id FROM company_roles WHERE role_code = 'super_admin';
    
    -- 检查是否已有用户
    SELECT COUNT(*) INTO v_user_count FROM company_users;
    
    -- 如果没有用户，创建默认管理员
    IF v_user_count = 0 AND v_admin_role_id IS NOT NULL THEN
        INSERT INTO company_users (
            name, email, role_id, department, position, status, created_by
        ) VALUES (
            'System Administrator', 
            'admin@system.local', 
            v_admin_role_id,
            'IT',
            'System Administrator',
            'active',
            NULL -- 系统创建
        );
        
        RAISE NOTICE '默认系统管理员用户已创建: admin@system.local';
    END IF;
END $$;

-- =============================================================================
-- 5. 创建权限查询视图（便于开发和调试）
-- =============================================================================

-- 用户权限汇总视图
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT 
    cu.id as user_id,
    cu.name as user_name,
    cu.email as user_email,
    cu.status as user_status,
    cr.role_code,
    cr.role_name,
    p.permission_code,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    rp.is_granted as role_granted,
    CASE 
        WHEN cu.custom_permissions ? p.permission_code 
        THEN (cu.custom_permissions ->> p.permission_code)::boolean
        ELSE NULL 
    END as custom_override,
    CASE 
        WHEN cu.custom_permissions ? p.permission_code 
        THEN (cu.custom_permissions ->> p.permission_code)::boolean
        ELSE rp.is_granted 
    END as effective_permission
FROM company_users cu
LEFT JOIN company_roles cr ON cu.role_id = cr.id
LEFT JOIN role_permissions rp ON cr.id = rp.role_id AND rp.is_granted = true
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE cu.status = 'active' AND cr.is_active = true AND p.is_active = true;

-- 角色权限汇总视图
CREATE OR REPLACE VIEW v_role_permissions AS
SELECT 
    cr.id as role_id,
    cr.role_code,
    cr.role_name,
    cr.role_description,
    cr.is_system_role,
    COUNT(rp.permission_id) as permission_count,
    ARRAY_AGG(p.permission_code ORDER BY p.sort_order) as permissions,
    ARRAY_AGG(p.module ORDER BY p.sort_order) as modules
FROM company_roles cr
LEFT JOIN role_permissions rp ON cr.id = rp.role_id AND rp.is_granted = true
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
WHERE cr.is_active = true
GROUP BY cr.id, cr.role_code, cr.role_name, cr.role_description, cr.is_system_role
ORDER BY cr.role_code;

-- 项目用户权限视图
CREATE OR REPLACE VIEW v_project_user_permissions AS
SELECT 
    cupp.id,
    cupp.company_user_id,
    cu.name as user_name,
    cu.email as user_email,
    cupp.project_id,
    cupp.can_view_project,
    cupp.can_edit_project,
    cupp.can_delete_project,
    cupp.can_manage_tasks,
    cupp.can_view_financials,
    cupp.can_manage_members,
    cupp.permission_start_date,
    cupp.permission_end_date,
    CASE 
        WHEN cupp.permission_end_date IS NULL OR cupp.permission_end_date > CURRENT_TIMESTAMP
        THEN true 
        ELSE false 
    END as is_active
FROM company_user_project_permissions cupp
JOIN company_users cu ON cupp.company_user_id = cu.id
WHERE cu.status = 'active';

COMMIT;