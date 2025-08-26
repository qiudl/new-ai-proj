-- RBAC权限系统数据库设计
-- 文件: 026_rbac_permission_system.sql
-- 描述: 创建完整的RBAC权限管理系统表结构
-- 作者: Claude AI
-- 创建时间: 2025-08-26

BEGIN;

-- =============================================================================
-- 1. 权限表 (permissions) 升级
-- =============================================================================
-- 检查是否需要升级现有的permissions表
DO $$
BEGIN
    -- 检查是否需要添加新字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'permission_code') THEN
        -- 如果没有permission_code字段，需要重构表
        ALTER TABLE permissions RENAME TO permissions_old;
        
        CREATE TABLE permissions (
            id SERIAL PRIMARY KEY,
            permission_code VARCHAR(100) NOT NULL UNIQUE,
            permission_name VARCHAR(100) NOT NULL,
            permission_description TEXT,
            module VARCHAR(50) NOT NULL,
            resource VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            parent_id INTEGER REFERENCES permissions(id) ON DELETE SET NULL,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            
            -- 索引
            INDEX idx_permissions_code (permission_code),
            INDEX idx_permissions_module (module),
            INDEX idx_permissions_parent (parent_id),
            INDEX idx_permissions_active (is_active)
        );
        
        -- 迁移旧数据
        INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action)
        SELECT 
            COALESCE(name, 'legacy_' || id::text) as permission_code,
            COALESCE(name, 'Legacy Permission') as permission_name,
            description,
            COALESCE(category, 'system') as module,
            CASE 
                WHEN name LIKE '%.%' THEN split_part(name, '.', 2)
                ELSE 'general'
            END as resource,
            CASE 
                WHEN name LIKE '%.%' THEN split_part(name, '.', 3)
                ELSE 'access'
            END as action
        FROM permissions_old;
        
        DROP TABLE permissions_old;
    END IF;
END $$;

-- =============================================================================
-- 2. 公司角色表 (company_roles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_roles (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT chk_role_code_format CHECK (role_code ~ '^[a-z_][a-z0-9_]*$'),
    CONSTRAINT chk_role_name_length CHECK (LENGTH(role_name) >= 1)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_company_roles_code ON company_roles(role_code);
CREATE INDEX IF NOT EXISTS idx_company_roles_active ON company_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_company_roles_system ON company_roles(is_system_role);

-- =============================================================================
-- 3. 角色权限关联表 (role_permissions) 升级
-- =============================================================================
DO $$
BEGIN
    -- 检查现有的role_permissions表结构
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        -- 备份现有数据并重建表
        CREATE TEMP TABLE role_permissions_backup AS SELECT * FROM role_permissions;
        DROP TABLE role_permissions;
    END IF;
END $$;

CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES company_roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT TRUE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER, -- 可以引用用户表
    
    -- 约束
    UNIQUE (role_id, permission_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_granted ON role_permissions(is_granted);

-- =============================================================================
-- 4. 公司用户表 (company_users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER, -- 关联现有users表
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role_id INTEGER REFERENCES company_roles(id),
    department VARCHAR(100),
    position VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    custom_permissions JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT chk_user_status CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT chk_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_company_users_email ON company_users(email);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role_id);
CREATE INDEX IF NOT EXISTS idx_company_users_status ON company_users(status);
CREATE INDEX IF NOT EXISTS idx_company_users_department ON company_users(department);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);

-- =============================================================================
-- 5. 用户项目权限表 (company_user_project_permissions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_user_project_permissions (
    id SERIAL PRIMARY KEY,
    company_user_id INTEGER NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL, -- 关联项目表
    can_view_project BOOLEAN DEFAULT FALSE,
    can_edit_project BOOLEAN DEFAULT FALSE,
    can_delete_project BOOLEAN DEFAULT FALSE,
    can_manage_tasks BOOLEAN DEFAULT FALSE,
    can_view_financials BOOLEAN DEFAULT FALSE,
    can_manage_members BOOLEAN DEFAULT FALSE,
    permission_start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    permission_end_date TIMESTAMPTZ,
    created_by INTEGER REFERENCES company_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE (company_user_id, project_id),
    CONSTRAINT chk_permission_dates CHECK (
        permission_end_date IS NULL OR permission_end_date > permission_start_date
    )
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_project_perms_user ON company_user_project_permissions(company_user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_perms_project ON company_user_project_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_perms_end_date ON company_user_project_permissions(permission_end_date);

-- =============================================================================
-- 6. 权限审计日志表 (permission_audit_logs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS permission_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    company_user_id INTEGER REFERENCES company_users(id),
    target_user_id INTEGER REFERENCES company_users(id),
    action_type VARCHAR(50) NOT NULL,
    permission_code VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    performed_by INTEGER REFERENCES company_users(id),
    performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    -- 约束
    CONSTRAINT chk_action_type CHECK (action_type IN (
        'role_assigned', 'role_removed', 'permission_granted', 'permission_revoked',
        'permission_override', 'project_permission_set', 'project_permission_removed',
        'custom_permission_set', 'custom_permission_removed', 'user_created', 'user_updated'
    ))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_logs(company_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_target ON permission_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_permission_audit_time ON permission_audit_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_permission ON permission_audit_logs(permission_code);

-- =============================================================================
-- 7. 权限缓存表 (permission_cache) - 可选的性能优化表
-- =============================================================================
CREATE TABLE IF NOT EXISTS permission_cache (
    id BIGSERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    company_user_id INTEGER NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL,
    resource_id INTEGER,
    has_permission BOOLEAN NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'role', 'custom', 'project'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_permission_cache_key ON permission_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_permission_cache_user ON permission_cache(company_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON permission_cache(expires_at);

-- =============================================================================
-- 8. 更新触发器 (自动更新updated_at字段)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有需要的表创建触发器
DO $$
DECLARE
    table_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'company_roles', 'company_users', 'company_user_project_permissions'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_update
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_%s_updated_at ON %s;
            CREATE TRIGGER trg_update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;