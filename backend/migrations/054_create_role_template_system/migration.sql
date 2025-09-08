-- Migration 054: Create Role Template System
-- This migration creates the complete role template management system

BEGIN;

-- Create enum types for role template system
DO $$ 
BEGIN
    -- Template category enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_category') THEN
        CREATE TYPE template_category AS ENUM (
            'system',
            'business',
            'custom'
        );
    END IF;

    -- Inheritance type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inheritance_type') THEN
        CREATE TYPE inheritance_type AS ENUM (
            'full',
            'partial',
            'override'
        );
    END IF;

    -- Template usage type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_usage_type') THEN
        CREATE TYPE template_usage_type AS ENUM (
            'created',
            'updated',
            'applied'
        );
    END IF;

    -- Tag category enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tag_category') THEN
        CREATE TYPE tag_category AS ENUM (
            'industry',
            'department',
            'function',
            'custom'
        );
    END IF;
END $$;

-- 1. Role Templates table - Main template definitions
CREATE TABLE IF NOT EXISTS role_templates (
    id SERIAL PRIMARY KEY,
    template_code VARCHAR(50) UNIQUE NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_description TEXT,
    category template_category NOT NULL DEFAULT 'custom',
    industry VARCHAR(50),
    department VARCHAR(50),
    level INTEGER NOT NULL DEFAULT 1,
    parent_template_id INTEGER,
    is_system_template BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB,
    metadata JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_role_templates_parent 
        FOREIGN KEY (parent_template_id) REFERENCES role_templates(id) ON DELETE SET NULL,
    CONSTRAINT fk_role_templates_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_role_templates_level 
        CHECK (level > 0),
    CONSTRAINT chk_role_templates_version 
        CHECK (version > 0)
);

-- 2. Role Template Permissions table - Template-permission associations
CREATE TABLE IF NOT EXISTS role_template_permissions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_default BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_role_template_permissions_template 
        FOREIGN KEY (template_id) REFERENCES role_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_template_permissions_permission 
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT uq_role_template_permissions_template_permission 
        UNIQUE (template_id, permission_id)
);

-- 3. Role Template Inheritance table - Parent-child relationships
CREATE TABLE IF NOT EXISTS role_template_inheritance (
    id SERIAL PRIMARY KEY,
    parent_template_id INTEGER NOT NULL,
    child_template_id INTEGER NOT NULL,
    inheritance_type inheritance_type NOT NULL DEFAULT 'full',
    inherited_fields JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_role_template_inheritance_parent 
        FOREIGN KEY (parent_template_id) REFERENCES role_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_template_inheritance_child 
        FOREIGN KEY (child_template_id) REFERENCES role_templates(id) ON DELETE CASCADE,
    CONSTRAINT uq_role_template_inheritance_parent_child 
        UNIQUE (parent_template_id, child_template_id),
    CONSTRAINT chk_role_template_inheritance_no_self_reference 
        CHECK (parent_template_id != child_template_id)
);

-- 4. Role Template Usage table - Tracks template applications
CREATE TABLE IF NOT EXISTS role_template_usage (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    usage_type template_usage_type NOT NULL DEFAULT 'applied',
    customizations JSONB,
    applied_by INTEGER,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_current_template BOOLEAN NOT NULL DEFAULT true,
    
    -- Constraints
    CONSTRAINT fk_role_template_usage_template 
        FOREIGN KEY (template_id) REFERENCES role_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_template_usage_role 
        FOREIGN KEY (role_id) REFERENCES company_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_template_usage_applied_by 
        FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Role Template Tags table - Template categorization
CREATE TABLE IF NOT EXISTS role_template_tags (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    tag_category tag_category NOT NULL DEFAULT 'custom',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_role_template_tags_template 
        FOREIGN KEY (template_id) REFERENCES role_templates(id) ON DELETE CASCADE,
    CONSTRAINT uq_role_template_tags_template_tag 
        UNIQUE (template_id, tag_name)
);

-- 6. Role Template Versions table - Version history
CREATE TABLE IF NOT EXISTS role_template_versions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_description TEXT,
    configuration JSONB,
    permission_snapshot JSONB,
    change_log TEXT,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_role_template_versions_template 
        FOREIGN KEY (template_id) REFERENCES role_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_template_versions_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_role_template_versions_template_version 
        UNIQUE (template_id, version),
    CONSTRAINT chk_role_template_versions_version 
        CHECK (version > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_templates_category ON role_templates(category);
CREATE INDEX IF NOT EXISTS idx_role_templates_industry ON role_templates(industry);
CREATE INDEX IF NOT EXISTS idx_role_templates_department ON role_templates(department);
CREATE INDEX IF NOT EXISTS idx_role_templates_level ON role_templates(level);
CREATE INDEX IF NOT EXISTS idx_role_templates_parent ON role_templates(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_role_templates_active ON role_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_role_templates_system ON role_templates(is_system_template);
CREATE INDEX IF NOT EXISTS idx_role_templates_created_by ON role_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_role_templates_created_at ON role_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_role_templates_code ON role_templates(template_code);

CREATE INDEX IF NOT EXISTS idx_role_template_permissions_template ON role_template_permissions(template_id);
CREATE INDEX IF NOT EXISTS idx_role_template_permissions_permission ON role_template_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_template_permissions_required ON role_template_permissions(is_required);
CREATE INDEX IF NOT EXISTS idx_role_template_permissions_default ON role_template_permissions(is_default);
CREATE INDEX IF NOT EXISTS idx_role_template_permissions_priority ON role_template_permissions(priority);

CREATE INDEX IF NOT EXISTS idx_role_template_inheritance_parent ON role_template_inheritance(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_role_template_inheritance_child ON role_template_inheritance(child_template_id);
CREATE INDEX IF NOT EXISTS idx_role_template_inheritance_type ON role_template_inheritance(inheritance_type);

CREATE INDEX IF NOT EXISTS idx_role_template_usage_template ON role_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_role_template_usage_role ON role_template_usage(role_id);
CREATE INDEX IF NOT EXISTS idx_role_template_usage_type ON role_template_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_role_template_usage_applied_by ON role_template_usage(applied_by);
CREATE INDEX IF NOT EXISTS idx_role_template_usage_applied_at ON role_template_usage(applied_at);
CREATE INDEX IF NOT EXISTS idx_role_template_usage_current ON role_template_usage(is_current_template);

CREATE INDEX IF NOT EXISTS idx_role_template_tags_template ON role_template_tags(template_id);
CREATE INDEX IF NOT EXISTS idx_role_template_tags_name ON role_template_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_role_template_tags_category ON role_template_tags(tag_category);

CREATE INDEX IF NOT EXISTS idx_role_template_versions_template ON role_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_role_template_versions_version ON role_template_versions(version);
CREATE INDEX IF NOT EXISTS idx_role_template_versions_created_by ON role_template_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_role_template_versions_created_at ON role_template_versions(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_role_template_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_role_templates_updated_at 
    BEFORE UPDATE ON role_templates 
    FOR EACH ROW EXECUTE FUNCTION update_role_template_updated_at_column();

-- Insert default system role templates
INSERT INTO role_templates (
    template_code, 
    template_name, 
    template_description, 
    category, 
    level, 
    is_system_template, 
    created_by
) VALUES 
(
    'admin_template',
    '管理员模板',
    '系统管理员角色模板，拥有完整的系统管理权限',
    'system',
    1,
    true,
    1
),
(
    'manager_template',
    '经理模板',
    '部门经理角色模板，负责团队和项目管理',
    'business',
    2,
    true,
    1
),
(
    'employee_template',
    '员工模板',
    '普通员工角色模板，基础工作权限',
    'business',
    3,
    true,
    1
),
(
    'readonly_template',
    '只读模板',
    '只读访问模板，仅查看权限',
    'custom',
    4,
    true,
    1
);

-- Insert tags for default templates
INSERT INTO role_template_tags (template_id, tag_name, tag_category) VALUES
((SELECT id FROM role_templates WHERE template_code = 'admin_template'), 'admin', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'admin_template'), 'system', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'admin_template'), 'management', 'function'),

((SELECT id FROM role_templates WHERE template_code = 'manager_template'), 'manager', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'manager_template'), 'team-lead', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'manager_template'), 'business', 'function'),

((SELECT id FROM role_templates WHERE template_code = 'employee_template'), 'employee', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'employee_template'), 'basic', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'employee_template'), 'user', 'function'),

((SELECT id FROM role_templates WHERE template_code = 'readonly_template'), 'readonly', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'readonly_template'), 'guest', 'function'),
((SELECT id FROM role_templates WHERE template_code = 'readonly_template'), 'limited', 'function');

-- Insert basic permissions for admin template (if permissions exist)
INSERT INTO role_template_permissions (template_id, permission_id, is_required, is_default, priority)
SELECT 
    (SELECT id FROM role_templates WHERE template_code = 'admin_template'),
    p.id,
    true,
    true,
    1
FROM permissions p 
WHERE p.permission_code LIKE 'system.%' 
   OR p.permission_code LIKE 'company.%'
   OR p.permission_code LIKE 'project.%'
   OR p.permission_code LIKE 'task.%'
   OR p.permission_code LIKE 'document.%';

-- Insert permissions for manager template
INSERT INTO role_template_permissions (template_id, permission_id, is_required, is_default, priority)
SELECT 
    (SELECT id FROM role_templates WHERE template_code = 'manager_template'),
    p.id,
    false,
    true,
    2
FROM permissions p 
WHERE p.permission_code LIKE 'project.%'
   OR p.permission_code LIKE 'task.%'
   OR p.permission_code LIKE 'document.%'
   OR p.permission_code LIKE 'team.%'
   OR p.permission_code LIKE 'report.%';

-- Insert permissions for employee template  
INSERT INTO role_template_permissions (template_id, permission_id, is_required, is_default, priority)
SELECT 
    (SELECT id FROM role_templates WHERE template_code = 'employee_template'),
    p.id,
    false,
    true,
    3
FROM permissions p 
WHERE p.permission_code LIKE 'task.read'
   OR p.permission_code LIKE 'task.update'
   OR p.permission_code LIKE 'document.read'
   OR p.permission_code LIKE 'document.create'
   OR p.permission_code LIKE 'profile.%';

-- Insert permissions for readonly template
INSERT INTO role_template_permissions (template_id, permission_id, is_required, is_default, priority)
SELECT 
    (SELECT id FROM role_templates WHERE template_code = 'readonly_template'),
    p.id,
    false,
    true,
    4
FROM permissions p 
WHERE p.permission_code LIKE '%.read'
   AND NOT p.permission_code LIKE 'system.%';

-- Create initial versions for all templates
INSERT INTO role_template_versions (
    template_id,
    version,
    template_name,
    template_description,
    change_log,
    created_by
)
SELECT 
    id,
    version,
    template_name,
    template_description,
    'Initial system template version',
    created_by
FROM role_templates
WHERE is_system_template = true;

COMMIT;