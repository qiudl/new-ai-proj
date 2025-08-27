-- 企业默认角色自动创建机制测试迁移
-- 文件: 035_test_enterprise_default_roles.sql
-- 描述: 测试企业默认角色自动创建机制的数据库迁移
-- 作者: Claude AI (任务#626)
-- 创建时间: 2025-08-27
-- 任务: 任务#626 - 实现企业默认角色自动创建机制

BEGIN;

-- =============================================================================
-- 1. 验证当前权限系统状态
-- =============================================================================

-- 检查必要的表是否存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_roles') THEN
        RAISE EXCEPTION 'company_roles table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
        RAISE EXCEPTION 'permissions table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        RAISE EXCEPTION 'role_permissions table does not exist';
    END IF;
    
    RAISE NOTICE 'All required tables exist for enterprise role system';
END $$;

-- =============================================================================
-- 2. 确保必要的权限存在
-- =============================================================================

-- 插入企业角色系统所需的权限（如果不存在）
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, is_active, created_at)
VALUES 
    -- 公司管理权限
    ('company.read', '查看公司信息', '查看公司基本信息和详情', 'company', 'company', 'read', true, NOW()),
    ('company.update', '更新公司信息', '修改公司基本信息', 'company', 'company', 'update', true, NOW()),
    ('company.members.read', '查看公司成员', '查看公司成员列表', 'company', 'members', 'read', true, NOW()),
    ('company.members.create', '添加公司成员', '为公司添加新成员', 'company', 'members', 'create', true, NOW()),
    ('company.members.update', '更新公司成员', '修改公司成员信息', 'company', 'members', 'update', true, NOW()),
    ('company.members.delete', '删除公司成员', '从公司中移除成员', 'company', 'members', 'delete', true, NOW()),
    ('company.departments.manage', '管理部门', '管理公司部门设置', 'company', 'departments', 'manage', true, NOW()),
    
    -- 项目管理权限
    ('project.read', '查看项目', '查看项目列表和基本信息', 'project', 'project', 'read', true, NOW()),
    ('project.create', '创建项目', '创建新的项目', 'project', 'project', 'create', true, NOW()),
    ('project.update', '更新项目', '修改项目信息', 'project', 'project', 'update', true, NOW()),
    ('project.delete', '删除项目', '删除项目', 'project', 'project', 'delete', true, NOW()),
    ('project.detail.read', '查看项目详情', '查看项目的详细信息', 'project', 'detail', 'read', true, NOW()),
    ('project.members.read', '查看项目成员', '查看项目成员列表', 'project', 'members', 'read', true, NOW()),
    ('project.members.manage', '管理项目成员', '添加或移除项目成员', 'project', 'members', 'manage', true, NOW()),
    ('project.settings.read', '查看项目设置', '查看项目配置设置', 'project', 'settings', 'read', true, NOW()),
    ('project.settings.update', '更新项目设置', '修改项目配置设置', 'project', 'settings', 'update', true, NOW()),
    
    -- 任务管理权限
    ('task.read', '查看任务', '查看任务列表和信息', 'task', 'task', 'read', true, NOW()),
    ('task.create', '创建任务', '创建新的任务', 'task', 'task', 'create', true, NOW()),
    ('task.update', '更新任务', '修改任务信息', 'task', 'task', 'update', true, NOW()),
    ('task.delete', '删除任务', '删除任务', 'task', 'task', 'delete', true, NOW()),
    ('task.assign', '分配任务', '将任务分配给用户', 'task', 'task', 'assign', true, NOW()),
    ('task.status.update', '更新任务状态', '修改任务的执行状态', 'task', 'status', 'update', true, NOW()),
    ('task.comment.read', '查看任务评论', '查看任务的评论和讨论', 'task', 'comment', 'read', true, NOW()),
    ('task.comment.create', '添加任务评论', '为任务添加评论', 'task', 'comment', 'create', true, NOW()),
    ('task.attachment.upload', '上传任务附件', '为任务上传文件附件', 'task', 'attachment', 'upload', true, NOW()),
    ('task.attachment.download', '下载任务附件', '下载任务的文件附件', 'task', 'attachment', 'download', true, NOW()),
    ('task.time.log', '记录任务时间', '记录任务的工作时间', 'task', 'time', 'log', true, NOW()),
    ('task.time.read', '查看任务时间', '查看任务的时间记录', 'task', 'time', 'read', true, NOW()),
    ('task.bulk.update', '批量更新任务', '批量修改多个任务', 'task', 'bulk', 'update', true, NOW()),
    ('task.bulk.delete', '批量删除任务', '批量删除多个任务', 'task', 'bulk', 'delete', true, NOW())
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- 插入文档管理权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, is_active, created_at)
VALUES 
    ('document.read', '查看文档', '查看文档内容', 'document', 'document', 'read', true, NOW()),
    ('document.create', '创建文档', '创建新文档', 'document', 'document', 'create', true, NOW()),
    ('document.update', '更新文档', '修改文档内容', 'document', 'document', 'update', true, NOW()),
    ('document.delete', '删除文档', '删除文档', 'document', 'document', 'delete', true, NOW()),
    ('document.share', '分享文档', '分享文档给其他用户', 'document', 'document', 'share', true, NOW()),
    ('document.version.read', '查看文档版本', '查看文档的历史版本', 'document', 'version', 'read', true, NOW()),
    ('document.version.restore', '恢复文档版本', '恢复到文档的历史版本', 'document', 'version', 'restore', true, NOW()),
    ('document.folder.create', '创建文档文件夹', '创建文档存储文件夹', 'document', 'folder', 'create', true, NOW()),
    ('document.folder.manage', '管理文档文件夹', '管理文档文件夹结构', 'document', 'folder', 'manage', true, NOW())
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- 插入财务管理权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, is_active, created_at)
VALUES 
    ('finance.read', '查看财务信息', '查看基本财务数据', 'finance', 'finance', 'read', true, NOW()),
    ('finance.contracts.read', '查看合同', '查看合同信息', 'finance', 'contracts', 'read', true, NOW()),
    ('finance.contracts.manage', '管理合同', '创建和管理合同', 'finance', 'contracts', 'manage', true, NOW()),
    ('finance.reports.read', '查看财务报表', '查看财务报告', 'finance', 'reports', 'read', true, NOW()),
    ('finance.reports.export', '导出财务报表', '导出财务数据报告', 'finance', 'reports', 'export', true, NOW())
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- 插入个人权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, is_active, created_at)
VALUES 
    ('profile.read', '查看个人资料', '查看个人基本信息', 'profile', 'profile', 'read', true, NOW()),
    ('profile.update', '更新个人资料', '修改个人基本信息', 'profile', 'profile', 'update', true, NOW()),
    ('profile.password.change', '修改密码', '更改登录密码', 'profile', 'password', 'change', true, NOW()),
    ('profile.sessions.manage', '管理登录会话', '管理活跃的登录会话', 'profile', 'sessions', 'manage', true, NOW()),
    ('profile.notifications.read', '查看通知', '查看系统通知', 'profile', 'notifications', 'read', true, NOW()),
    ('profile.notifications.manage', '管理通知', '管理通知设置', 'profile', 'notifications', 'manage', true, NOW())
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- =============================================================================
-- 3. 测试企业角色自动创建机制
-- =============================================================================

-- 创建测试公司数据（如果customers表存在的话）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        -- 插入测试企业数据
        INSERT INTO customers (id, name, company, industry, email, phone, status, priority, created_by, created_at, updated_at)
        VALUES (9999, '测试企业角色自动创建', '测试科技有限公司', '软件开发', 'test@enterprise-roles.com', '13800000000', 'active', 'medium', 1, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            company = EXCLUDED.company,
            updated_at = NOW();
        
        RAISE NOTICE '已创建测试企业数据 (ID: 9999)';
    ELSE
        RAISE NOTICE 'customers表不存在，跳过测试企业数据创建';
    END IF;
END $$;

-- 验证权限系统完整性
SELECT 'Permissions System Check:' as info;
SELECT 
    module,
    COUNT(*) as permission_count
FROM permissions 
WHERE is_active = true
GROUP BY module
ORDER BY module;

COMMIT;

-- =============================================================================
-- 4. 验证查询
-- =============================================================================

-- 查看所有可用权限
SELECT '--- Available Permissions for Enterprise Roles ---' as separator;
SELECT 
    permission_code,
    permission_name,
    module,
    resource,
    action
FROM permissions 
WHERE is_active = true 
  AND permission_code IN (
    'company.read', 'company.update', 'company.members.read', 'company.members.create', 'company.members.update', 'company.members.delete',
    'project.read', 'project.create', 'project.update', 'project.detail.read', 'project.members.read',
    'task.read', 'task.create', 'task.update', 'task.status.update', 'task.comment.read', 'task.comment.create',
    'document.read', 'document.create', 'document.update', 'document.version.read',
    'finance.read', 'finance.contracts.read', 'finance.reports.read',
    'profile.read', 'profile.update', 'profile.password.change', 'profile.sessions.manage', 'profile.notifications.read', 'profile.notifications.manage'
  )
ORDER BY module, permission_code;

-- 查看系统角色状态
SELECT '--- System Roles Status ---' as separator;
SELECT 
    role_code,
    role_name,
    is_system_role,
    is_active
FROM company_roles 
WHERE is_system_role = true
ORDER BY role_code;