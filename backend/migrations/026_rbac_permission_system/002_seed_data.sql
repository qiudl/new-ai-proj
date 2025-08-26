-- RBAC权限系统初始数据
-- 文件: 002_seed_data.sql
-- 描述: 插入系统默认的角色和权限数据
-- 作者: Claude AI
-- 创建时间: 2025-08-26

BEGIN;

-- =============================================================================
-- 1. 插入系统基础权限
-- =============================================================================

-- 系统管理权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    ('system.admin', '系统管理', '完整的系统管理权限', 'system', 'admin', 'manage', 100),
    ('system.users.read', '查看用户', '查看用户列表和详情', 'system', 'users', 'read', 101),
    ('system.users.create', '创建用户', '创建新用户账号', 'system', 'users', 'create', 102),
    ('system.users.update', '更新用户', '编辑用户信息', 'system', 'users', 'update', 103),
    ('system.users.delete', '删除用户', '删除用户账号', 'system', 'users', 'delete', 104),
    ('system.roles.read', '查看角色', '查看角色列表和权限', 'system', 'roles', 'read', 105),
    ('system.roles.create', '创建角色', '创建新角色', 'system', 'roles', 'create', 106),
    ('system.roles.update', '更新角色', '编辑角色和权限', 'system', 'roles', 'update', 107),
    ('system.roles.delete', '删除角色', '删除角色', 'system', 'roles', 'delete', 108),
    ('system.audit.read', '查看审计日志', '查看系统审计日志', 'system', 'audit', 'read', 109),
    ('system.config.read', '查看配置', '查看系统配置', 'system', 'config', 'read', 110),
    ('system.config.update', '更新配置', '修改系统配置', 'system', 'config', 'update', 111)
ON CONFLICT (permission_code) DO NOTHING;

-- 公司管理权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    ('company.read', '查看公司信息', '查看公司基本信息', 'company', 'info', 'read', 200),
    ('company.update', '更新公司信息', '编辑公司基本信息', 'company', 'info', 'update', 201),
    ('company.members.read', '查看成员', '查看公司成员列表', 'company', 'members', 'read', 202),
    ('company.members.create', '添加成员', '邀请新成员加入', 'company', 'members', 'create', 203),
    ('company.members.update', '更新成员', '编辑成员信息和权限', 'company', 'members', 'update', 204),
    ('company.members.delete', '删除成员', '移除公司成员', 'company', 'members', 'delete', 205),
    ('company.departments.manage', '管理部门', '管理部门结构', 'company', 'departments', 'manage', 206)
ON CONFLICT (permission_code) DO NOTHING;

-- 项目管理权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    ('project.read', '查看项目', '查看项目列表和基本信息', 'project', 'basic', 'read', 300),
    ('project.create', '创建项目', '创建新项目', 'project', 'basic', 'create', 301),
    ('project.update', '更新项目', '编辑项目信息', 'project', 'basic', 'update', 302),
    ('project.delete', '删除项目', '删除项目', 'project', 'basic', 'delete', 303),
    ('project.detail.read', '查看项目详情', '查看项目详细信息', 'project', 'detail', 'read', 304),
    ('project.members.read', '查看项目成员', '查看项目成员列表', 'project', 'members', 'read', 305),
    ('project.members.manage', '管理项目成员', '添加/移除项目成员', 'project', 'members', 'manage', 306),
    ('project.settings.read', '查看项目设置', '查看项目配置设置', 'project', 'settings', 'read', 307),
    ('project.settings.update', '更新项目设置', '修改项目配置', 'project', 'settings', 'update', 308)
ON CONFLICT (permission_code) DO NOTHING;

-- 任务管理权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    ('task.read', '查看任务', '查看任务列表和详情', 'task', 'basic', 'read', 400),
    ('task.create', '创建任务', '创建新任务', 'task', 'basic', 'create', 401),
    ('task.update', '更新任务', '编辑任务信息', 'task', 'basic', 'update', 402),
    ('task.delete', '删除任务', '删除任务', 'task', 'basic', 'delete', 403),
    ('task.assign', '分配任务', '分配任务给其他用户', 'task', 'assignment', 'manage', 404),
    ('task.status.update', '更新任务状态', '修改任务状态', 'task', 'status', 'update', 405),
    ('task.comment.create', '添加任务评论', '对任务进行评论', 'task', 'comments', 'create', 406),
    ('task.comment.read', '查看任务评论', '查看任务评论', 'task', 'comments', 'read', 407),
    ('task.attachment.upload', '上传附件', '向任务添加附件', 'task', 'attachments', 'create', 408),
    ('task.attachment.download', '下载附件', '下载任务附件', 'task', 'attachments', 'read', 409),
    ('task.time.log', '记录工时', '记录任务工时', 'task', 'time', 'create', 410),
    ('task.time.read', '查看工时', '查看任务工时记录', 'task', 'time', 'read', 411),
    ('task.bulk.update', '批量更新任务', '批量修改任务', 'task', 'bulk', 'update', 412),
    ('task.bulk.delete', '批量删除任务', '批量删除任务', 'task', 'bulk', 'delete', 413)
ON CONFLICT (permission_code) DO NOTHING;

-- 文档管理权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    ('document.read', '查看文档', '查看文档内容', 'document', 'content', 'read', 500),
    ('document.create', '创建文档', '创建新文档', 'document', 'content', 'create', 501),
    ('document.update', '更新文档', '编辑文档内容', 'document', 'content', 'update', 502),
    ('document.delete', '删除文档', '删除文档', 'document', 'content', 'delete', 503),
    ('document.share', '分享文档', '分享文档给其他用户', 'document', 'sharing', 'manage', 504),
    ('document.version.read', '查看文档版本', '查看文档历史版本', 'document', 'version', 'read', 505),
    ('document.version.restore', '恢复文档版本', '恢复到历史版本', 'document', 'version', 'manage', 506),
    ('document.folder.create', '创建文件夹', '创建文档文件夹', 'document', 'folder', 'create', 507),
    ('document.folder.manage', '管理文件夹', '管理文档文件夹结构', 'document', 'folder', 'manage', 508)
ON CONFLICT (permission_code) DO NOTHING;

-- 财务权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    ('finance.read', '查看财务信息', '查看基础财务数据', 'finance', 'basic', 'read', 600),
    ('finance.contracts.read', '查看合同', '查看项目合同信息', 'finance', 'contracts', 'read', 601),
    ('finance.contracts.manage', '管理合同', '创建和管理合同', 'finance', 'contracts', 'manage', 602),
    ('finance.reports.read', '查看财务报表', '查看财务分析报表', 'finance', 'reports', 'read', 603),
    ('finance.reports.export', '导出财务报表', '导出财务数据', 'finance', 'reports', 'export', 604)
ON CONFLICT (permission_code) DO NOTHING;

-- 用户个人权限
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    ('profile.read', '查看个人资料', '查看自己的个人资料', 'profile', 'basic', 'read', 700),
    ('profile.update', '更新个人资料', '编辑个人基本信息', 'profile', 'basic', 'update', 701),
    ('profile.password.change', '修改密码', '修改登录密码', 'profile', 'security', 'update', 702),
    ('profile.sessions.manage', '管理会话', '管理登录会话', 'profile', 'sessions', 'manage', 703),
    ('profile.notifications.read', '查看通知', '查看系统通知', 'profile', 'notifications', 'read', 704),
    ('profile.notifications.manage', '管理通知设置', '配置通知偏好', 'profile', 'notifications', 'manage', 705)
ON CONFLICT (permission_code) DO NOTHING;