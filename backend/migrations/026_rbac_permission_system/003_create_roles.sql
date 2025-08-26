-- RBAC权限系统角色数据
-- 文件: 003_create_roles.sql
-- 描述: 创建系统默认角色并分配权限
-- 作者: Claude AI
-- 创建时间: 2025-08-26

-- =============================================================================
-- 2. 创建系统角色
-- =============================================================================

-- 插入基础角色
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active) VALUES
    ('super_admin', '超级管理员', '拥有系统所有权限的超级管理员角色', true, true),
    ('admin', '系统管理员', '系统管理员，拥有大部分管理权限', true, true),
    ('company_admin', '公司管理员', '公司级别的管理员，可以管理公司内部事务', true, true),
    ('project_manager', '项目经理', '项目管理角色，负责项目的整体管理', true, true),
    ('team_lead', '团队负责人', '团队负责人，可以管理团队成员和任务', true, true),
    ('developer', '开发人员', '开发人员角色，主要处理任务开发工作', true, true),
    ('designer', '设计师', '设计师角色，负责设计相关工作', true, true),
    ('tester', '测试人员', '测试人员角色，负责质量保证工作', true, true),
    ('business_analyst', '业务分析师', '业务分析师角色，负责需求分析', true, true),
    ('finance_manager', '财务经理', '财务管理角色，管理财务相关事务', true, true),
    ('hr_manager', 'HR经理', '人力资源管理角色', true, true),
    ('client_user', '客户用户', '外部客户用户，有限的访问权限', true, true),
    ('guest', '访客', '访客角色，只有基础查看权限', true, true)
ON CONFLICT (role_code) DO NOTHING;

-- =============================================================================
-- 3. 为角色分配权限
-- =============================================================================

-- 超级管理员：拥有所有权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 系统管理员：除了超级管理权限外的其他权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'admin' 
  AND p.permission_code != 'system.admin' -- 排除超级管理员专属权限
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 公司管理员权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'company_admin'
  AND p.permission_code IN (
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
    -- 用户管理权限（部分）
    'system.users.read', 'system.users.create', 'system.users.update',
    'system.roles.read', 'system.audit.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 项目经理权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'project_manager'
  AND p.permission_code IN (
    -- 项目管理权限
    'project.read', 'project.create', 'project.update',
    'project.detail.read', 'project.members.read', 'project.members.manage',
    'project.settings.read', 'project.settings.update',
    -- 任务管理权限
    'task.read', 'task.create', 'task.update', 'task.delete', 'task.assign',
    'task.status.update', 'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.log', 'task.time.read', 'task.bulk.update', 'task.bulk.delete',
    -- 文档管理权限
    'document.read', 'document.create', 'document.update', 'document.delete',
    'document.share', 'document.version.read', 'document.folder.create', 'document.folder.manage',
    -- 财务权限（查看）
    'finance.read', 'finance.contracts.read', 'finance.reports.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 团队负责人权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'team_lead'
  AND p.permission_code IN (
    -- 项目权限（查看和部分管理）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务管理权限
    'task.read', 'task.create', 'task.update', 'task.delete', 'task.assign',
    'task.status.update', 'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.log', 'task.time.read', 'task.bulk.update',
    -- 文档管理权限
    'document.read', 'document.create', 'document.update',
    'document.share', 'document.version.read', 'document.folder.create',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 开发人员权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'developer'
  AND p.permission_code IN (
    -- 项目权限（查看）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务权限（主要是执行任务）
    'task.read', 'task.create', 'task.update', 'task.status.update',
    'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.log', 'task.time.read',
    -- 文档权限
    'document.read', 'document.create', 'document.update',
    'document.version.read', 'document.folder.create',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 设计师权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'designer'
  AND p.permission_code IN (
    -- 项目权限（查看）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务权限
    'task.read', 'task.create', 'task.update', 'task.status.update',
    'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.log', 'task.time.read',
    -- 文档权限（设计师通常需要较多文档权限）
    'document.read', 'document.create', 'document.update',
    'document.share', 'document.version.read', 'document.folder.create',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 测试人员权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'tester'
  AND p.permission_code IN (
    -- 项目权限（查看）
    'project.read', 'project.detail.read', 'project.members.read',
    -- 任务权限（测试相关）
    'task.read', 'task.create', 'task.update', 'task.status.update',
    'task.comment.read', 'task.comment.create',
    'task.attachment.upload', 'task.attachment.download',
    'task.time.log', 'task.time.read',
    -- 文档权限
    'document.read', 'document.create', 'document.update',
    'document.version.read',
    -- 个人权限
    'profile.read', 'profile.update', 'profile.password.change', 
    'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;