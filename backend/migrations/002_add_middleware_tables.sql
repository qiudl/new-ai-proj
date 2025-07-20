-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id INTEGER,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(100),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    resource_name VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    description TEXT,
    before_data JSONB,
    after_data JSONB,
    changes JSONB,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    project_id INTEGER,
    parent_event_id VARCHAR(255),
    correlation_id VARCHAR(255),
    metadata JSONB,
    tags TEXT[]
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- 登录尝试表
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    username VARCHAR(255),
    success BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    error_reason VARCHAR(255)
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 用户权限表
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    project_id INTEGER,
    granted BOOLEAN NOT NULL DEFAULT true,
    granted_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    added_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_timestamp ON login_attempts(ip_address, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- 插入默认权限
INSERT INTO permissions (name, description, category) VALUES
    ('system.admin', 'Full system administration', 'system'),
    ('system.users', 'Manage users and roles', 'system'),
    ('system.audit', 'View audit logs', 'system'),
    ('system.config', 'Manage system configuration', 'system'),
    ('project.view', 'View projects', 'project'),
    ('project.create', 'Create new projects', 'project'),
    ('project.update', 'Update project details', 'project'),
    ('project.delete', 'Delete projects', 'project'),
    ('project.manage', 'Full project management', 'project'),
    ('task.view', 'View tasks', 'task'),
    ('task.create', 'Create new tasks', 'task'),
    ('task.update', 'Update task details', 'task'),
    ('task.delete', 'Delete tasks', 'task'),
    ('task.assign', 'Assign tasks to users', 'task'),
    ('task.bulk_update', 'Bulk update tasks', 'task'),
    ('task.bulk_delete', 'Bulk delete tasks', 'task'),
    ('user.profile', 'Update own profile', 'user'),
    ('user.password', 'Change own password', 'user'),
    ('user.sessions', 'Manage own sessions', 'user')
ON CONFLICT (name) DO NOTHING;

-- 插入默认角色
INSERT INTO roles (name, description, is_system) VALUES
    ('admin', 'System administrator with full access', true),
    ('manager', 'Project manager with project and task management access', true),
    ('user', 'Regular user with basic task access', true),
    ('viewer', 'Read-only access to projects and tasks', true)
ON CONFLICT (name) DO NOTHING;

-- 为管理员角色分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为管理者角色分配项目和任务管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.name IN (
    'project.view', 'project.create', 'project.update', 'project.manage',
    'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
    'task.bulk_update', 'task.bulk_delete',
    'user.profile', 'user.password', 'user.sessions'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为普通用户分配基础权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
    'project.view',
    'task.view', 'task.create', 'task.update',
    'user.profile', 'user.password', 'user.sessions'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为查看者分配只读权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name IN (
    'project.view',
    'task.view',
    'user.profile', 'user.sessions'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
