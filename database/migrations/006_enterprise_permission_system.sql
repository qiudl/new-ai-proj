-- Migration: 006 - Enterprise User Permission System
-- Description: Implement comprehensive permission system for enterprise users

BEGIN;

-- 1. 创建企业角色定义表
CREATE TABLE company_roles (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- 系统预定义角色不可删除
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建权限定义表
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    permission_name VARCHAR(100) NOT NULL,
    permission_description TEXT,
    module VARCHAR(50) NOT NULL, -- company, project, task, finance, system
    resource VARCHAR(50) NOT NULL, -- 资源类型
    action VARCHAR(50) NOT NULL, -- create, read, update, delete, manage
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建角色权限关联表
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES company_roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(role_id, permission_id)
);

-- 4. 扩展企业用户表，添加权限相关字段
ALTER TABLE company_users 
ADD COLUMN role_id INTEGER REFERENCES company_roles(id),
ADD COLUMN custom_permissions JSONB DEFAULT '{}', -- 自定义权限覆盖
ADD COLUMN permission_expires_at TIMESTAMP, -- 权限过期时间
ADD COLUMN is_permission_locked BOOLEAN DEFAULT FALSE; -- 权限锁定状态

-- 5. 创建企业用户项目权限表
CREATE TABLE company_user_project_permissions (
    id SERIAL PRIMARY KEY,
    company_user_id INTEGER REFERENCES company_users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 项目级权限
    can_view_project BOOLEAN DEFAULT TRUE,
    can_edit_project BOOLEAN DEFAULT FALSE,
    can_delete_project BOOLEAN DEFAULT FALSE,
    can_manage_tasks BOOLEAN DEFAULT FALSE,
    can_view_financials BOOLEAN DEFAULT FALSE,
    can_manage_members BOOLEAN DEFAULT FALSE,
    
    -- 权限生效时间
    permission_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    permission_end_date TIMESTAMP,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_user_id, project_id)
);

-- 6. 创建权限审计日志表
CREATE TABLE permission_audit_logs (
    id SERIAL PRIMARY KEY,
    company_user_id INTEGER REFERENCES company_users(id),
    target_user_id INTEGER REFERENCES company_users(id), -- 被操作的用户
    action_type VARCHAR(50) NOT NULL, -- grant, revoke, modify
    permission_code VARCHAR(100),
    resource_type VARCHAR(50), -- company, project, task
    resource_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    
    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- 7. 插入系统预定义角色
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role) VALUES
('company_admin', '企业管理员', '拥有企业内所有权限，可管理企业信息和所有用户', true),
('project_manager', '项目经理', '可管理分配的项目，包括项目信息、任务和团队成员', true),
('finance_manager', '财务负责人', '可查看和管理财务相关信息，包括合同金额和费用', true),
('tech_lead', '技术负责人', '可管理技术相关项目和任务，参与技术决策', true),
('business_contact', '商务联系人', '企业对外商务联系人，可查看项目进展和商务信息', true),
('member', '普通成员', '基础成员权限，可查看分配的项目和任务', true);

-- 8. 插入权限定义
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action) VALUES
-- 企业管理权限
('company.info.read', '查看企业信息', '可以查看企业基本信息', 'company', 'company_info', 'read'),
('company.info.update', '编辑企业信息', '可以修改企业基本信息', 'company', 'company_info', 'update'),
('company.users.read', '查看企业用户', '可以查看企业内所有用户信息', 'company', 'company_users', 'read'),
('company.users.create', '添加企业用户', '可以添加新的企业用户', 'company', 'company_users', 'create'),
('company.users.update', '编辑企业用户', '可以修改企业用户信息和权限', 'company', 'company_users', 'update'),
('company.users.delete', '删除企业用户', '可以删除企业用户', 'company', 'company_users', 'delete'),
('company.roles.manage', '管理企业角色', '可以创建、编辑、删除企业自定义角色', 'company', 'company_roles', 'manage'),

-- 项目权限
('project.list.read', '查看项目列表', '可以查看企业项目列表', 'project', 'projects', 'read'),
('project.detail.read', '查看项目详情', '可以查看项目详细信息', 'project', 'project_detail', 'read'),
('project.create', '创建项目', '可以创建新项目', 'project', 'projects', 'create'),
('project.update', '编辑项目', '可以修改项目信息', 'project', 'projects', 'update'),
('project.delete', '删除项目', '可以删除项目', 'project', 'projects', 'delete'),
('project.members.manage', '管理项目成员', '可以添加、移除项目成员并设置权限', 'project', 'project_members', 'manage'),

-- 任务权限
('task.list.read', '查看任务列表', '可以查看项目任务列表', 'task', 'tasks', 'read'),
('task.detail.read', '查看任务详情', '可以查看任务详细信息', 'task', 'task_detail', 'read'),
('task.create', '创建任务', '可以创建新任务', 'task', 'tasks', 'create'),
('task.update', '编辑任务', '可以修改任务信息和状态', 'task', 'tasks', 'update'),
('task.delete', '删除任务', '可以删除任务', 'task', 'tasks', 'delete'),
('task.assign', '分配任务', '可以将任务分配给其他用户', 'task', 'tasks', 'assign'),

-- 财务权限
('finance.contracts.read', '查看合同信息', '可以查看合同和财务信息', 'finance', 'contracts', 'read'),
('finance.contracts.manage', '管理合同', '可以创建、编辑合同信息', 'finance', 'contracts', 'manage'),
('finance.reports.read', '查看财务报表', '可以查看财务统计和报表', 'finance', 'reports', 'read'),

-- 系统权限
('system.audit_logs.read', '查看审计日志', '可以查看系统审计日志', 'system', 'audit_logs', 'read'),
('system.settings.read', '查看系统设置', '可以查看系统设置信息', 'system', 'settings', 'read'),
('system.settings.manage', '管理系统设置', '可以修改系统设置', 'system', 'settings', 'manage');

-- 9. 配置系统角色的默认权限
-- 企业管理员：拥有所有权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'company_admin';

-- 项目经理：项目和任务相关权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'project_manager' 
AND p.permission_code IN (
    'company.info.read', 'company.users.read',
    'project.list.read', 'project.detail.read', 'project.create', 'project.update', 'project.members.manage',
    'task.list.read', 'task.detail.read', 'task.create', 'task.update', 'task.delete', 'task.assign'
);

-- 财务负责人：财务和基础权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'finance_manager' 
AND p.permission_code IN (
    'company.info.read', 'company.users.read',
    'project.list.read', 'project.detail.read',
    'task.list.read', 'task.detail.read',
    'finance.contracts.read', 'finance.contracts.manage', 'finance.reports.read'
);

-- 技术负责人：技术相关权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'tech_lead' 
AND p.permission_code IN (
    'company.info.read', 'company.users.read',
    'project.list.read', 'project.detail.read', 'project.update',
    'task.list.read', 'task.detail.read', 'task.create', 'task.update', 'task.assign'
);

-- 商务联系人：查看权限为主
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'business_contact' 
AND p.permission_code IN (
    'company.info.read', 'company.users.read',
    'project.list.read', 'project.detail.read',
    'task.list.read', 'task.detail.read',
    'finance.contracts.read'
);

-- 普通成员：基础权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'member' 
AND p.permission_code IN (
    'company.info.read',
    'project.list.read', 'project.detail.read',
    'task.list.read', 'task.detail.read', 'task.update'
);

-- 10. 创建索引优化查询性能
CREATE INDEX idx_company_users_role_id ON company_users(role_id);
CREATE INDEX idx_company_users_customer_id_active ON company_users(customer_id, status) WHERE status = 'active';
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_company_user_project_permissions_user_id ON company_user_project_permissions(company_user_id);
CREATE INDEX idx_company_user_project_permissions_project_id ON company_user_project_permissions(project_id);
CREATE INDEX idx_permission_audit_logs_user_id ON permission_audit_logs(company_user_id);
CREATE INDEX idx_permission_audit_logs_performed_at ON permission_audit_logs(performed_at);

-- 11. 添加触发器维护updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_roles_updated_at BEFORE UPDATE ON company_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON company_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_user_project_permissions_updated_at BEFORE UPDATE ON company_user_project_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;