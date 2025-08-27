-- 权限系统增强和数据完整性优化
-- 文件: 001_permission_system_enhancements.sql
-- 描述: 增强现有权限系统，添加层级权限、时间限制权限、以及数据完整性约束
-- 任务: #625 - 开发数据库迁移脚本和种子数据
-- 创建时间: 2025-08-27

BEGIN;

-- =============================================================================
-- 1. 权限系统表结构增强
-- =============================================================================

-- 增强permissions表，添加更多元数据
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_group VARCHAR(100);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS parent_permission_id INTEGER REFERENCES permissions(id);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS level_order INTEGER DEFAULT 0;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS context_data JSONB DEFAULT '{}';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 添加权限分组索引
CREATE INDEX IF NOT EXISTS idx_permissions_group ON permissions(permission_group);
CREATE INDEX IF NOT EXISTS idx_permissions_parent ON permissions(parent_permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_level ON permissions(level_order);
CREATE INDEX IF NOT EXISTS idx_permissions_expires ON permissions(expires_at);

-- 增强role_permissions表，添加权限条件和时间限制
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}';
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS granted_by INTEGER REFERENCES company_users(id);
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS revoked_by INTEGER REFERENCES company_users(id);
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

-- 添加角色权限时间和条件索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_granted ON role_permissions(granted_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_expires ON role_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_active ON role_permissions(is_granted, expires_at, revoked_at);

-- =============================================================================
-- 2. 创建权限层级管理表
-- =============================================================================

-- 权限层级关系表（支持权限继承）
CREATE TABLE IF NOT EXISTS permission_hierarchy (
    id SERIAL PRIMARY KEY,
    parent_permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    child_permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    inheritance_type VARCHAR(50) DEFAULT 'FULL', -- FULL, PARTIAL, CONDITIONAL
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_permission_id, child_permission_id)
);

-- 权限层级索引
CREATE INDEX IF NOT EXISTS idx_permission_hierarchy_parent ON permission_hierarchy(parent_permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_hierarchy_child ON permission_hierarchy(child_permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_hierarchy_active ON permission_hierarchy(is_active);

-- =============================================================================
-- 3. 创建动态权限规则表
-- =============================================================================

-- 动态权限规则表（基于条件的权限分配）
CREATE TABLE IF NOT EXISTS dynamic_permission_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(200) NOT NULL,
    rule_description TEXT,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES company_roles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES company_users(id) ON DELETE CASCADE,
    rule_conditions JSONB NOT NULL DEFAULT '{}', -- 规则条件（JSON格式）
    rule_expression TEXT NOT NULL, -- SQL表达式或逻辑表达式
    priority_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES company_users(id),
    CONSTRAINT check_rule_target CHECK (role_id IS NOT NULL OR user_id IS NOT NULL)
);

-- 动态权限规则索引
CREATE INDEX IF NOT EXISTS idx_dynamic_rules_permission ON dynamic_permission_rules(permission_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_rules_role ON dynamic_permission_rules(role_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_rules_user ON dynamic_permission_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_rules_active ON dynamic_permission_rules(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_dynamic_rules_priority ON dynamic_permission_rules(priority_order);

-- =============================================================================
-- 4. 创建权限上下文表
-- =============================================================================

-- 权限上下文表（支持细粒度权限控制）
CREATE TABLE IF NOT EXISTS permission_contexts (
    id SERIAL PRIMARY KEY,
    context_name VARCHAR(200) NOT NULL UNIQUE,
    context_type VARCHAR(100) NOT NULL, -- PROJECT, TASK, ENTERPRISE, DEPARTMENT等
    context_description TEXT,
    resource_id INTEGER, -- 关联的资源ID（如项目ID、任务ID等）
    context_data JSONB DEFAULT '{}',
    parent_context_id INTEGER REFERENCES permission_contexts(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 权限上下文索引
CREATE INDEX IF NOT EXISTS idx_permission_contexts_type ON permission_contexts(context_type);
CREATE INDEX IF NOT EXISTS idx_permission_contexts_resource ON permission_contexts(resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_contexts_parent ON permission_contexts(parent_context_id);
CREATE INDEX IF NOT EXISTS idx_permission_contexts_active ON permission_contexts(is_active);

-- 用户上下文权限关联表
CREATE TABLE IF NOT EXISTS user_context_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    context_id INTEGER NOT NULL REFERENCES permission_contexts(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT TRUE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    granted_by INTEGER REFERENCES company_users(id),
    conditions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, permission_id, context_id)
);

-- 用户上下文权限索引
CREATE INDEX IF NOT EXISTS idx_user_context_permissions_user ON user_context_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_context_permissions_permission ON user_context_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_context_permissions_context ON user_context_permissions(context_id);
CREATE INDEX IF NOT EXISTS idx_user_context_permissions_active ON user_context_permissions(is_granted, expires_at);

-- =============================================================================
-- 5. 增强现有视图和函数
-- =============================================================================

-- 更新用户有效权限视图，包含层级和上下文权限
DROP VIEW IF EXISTS user_effective_permissions CASCADE;
CREATE OR REPLACE VIEW user_effective_permissions AS
WITH role_based_permissions AS (
    -- 基于角色的权限
    SELECT DISTINCT
        cu.id as user_id,
        cu.name as user_name,
        cu.email,
        p.id as permission_id,
        p.permission_code,
        p.permission_name,
        p.module,
        p.resource,
        p.action,
        p.permission_group,
        'role' as permission_source,
        rp.granted_at,
        rp.expires_at,
        rp.conditions,
        NULL::integer as context_id
    FROM company_users cu
    JOIN company_roles r ON cu.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id 
    JOIN permissions p ON rp.permission_id = p.id
    WHERE cu.status = 'active' 
      AND r.is_active = true 
      AND p.is_active = true
      AND rp.is_granted = true
      AND rp.revoked_at IS NULL
      AND (rp.expires_at IS NULL OR rp.expires_at > CURRENT_TIMESTAMP)
), 
context_based_permissions AS (
    -- 基于上下文的权限
    SELECT DISTINCT
        cu.id as user_id,
        cu.name as user_name,
        cu.email,
        p.id as permission_id,
        p.permission_code,
        p.permission_name,
        p.module,
        p.resource,
        p.action,
        p.permission_group,
        'context' as permission_source,
        ucp.granted_at,
        ucp.expires_at,
        ucp.conditions,
        ucp.context_id
    FROM company_users cu
    JOIN user_context_permissions ucp ON cu.id = ucp.user_id
    JOIN permissions p ON ucp.permission_id = p.id
    JOIN permission_contexts pc ON ucp.context_id = pc.id
    WHERE cu.status = 'active' 
      AND p.is_active = true
      AND pc.is_active = true
      AND ucp.is_granted = true
      AND (ucp.expires_at IS NULL OR ucp.expires_at > CURRENT_TIMESTAMP)
),
inherited_permissions AS (
    -- 权限继承
    SELECT DISTINCT
        rbp.user_id,
        rbp.user_name,
        rbp.email,
        p_child.id as permission_id,
        p_child.permission_code,
        p_child.permission_name,
        p_child.module,
        p_child.resource,
        p_child.action,
        p_child.permission_group,
        'inherited' as permission_source,
        rbp.granted_at,
        rbp.expires_at,
        rbp.conditions,
        rbp.context_id
    FROM role_based_permissions rbp
    JOIN permissions p_parent ON rbp.permission_id = p_parent.id
    JOIN permission_hierarchy ph ON p_parent.id = ph.parent_permission_id
    JOIN permissions p_child ON ph.child_permission_id = p_child.id
    WHERE ph.is_active = true
      AND ph.inheritance_type IN ('FULL', 'PARTIAL')
      AND p_child.is_active = true
)
-- 合并所有权限来源
SELECT * FROM role_based_permissions
UNION ALL
SELECT * FROM context_based_permissions  
UNION ALL
SELECT * FROM inherited_permissions
ORDER BY user_id, permission_code;

-- =============================================================================
-- 6. 创建权限验证增强函数
-- =============================================================================

-- 增强的权限检查函数（支持上下文和条件）
CREATE OR REPLACE FUNCTION check_user_permission_enhanced(
    user_id_param INTEGER,
    permission_code_param VARCHAR,
    context_id_param INTEGER DEFAULT NULL,
    context_data_param JSONB DEFAULT '{}'
) RETURNS TABLE (
    has_permission BOOLEAN,
    permission_source VARCHAR,
    granted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    conditions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        true as has_permission,
        uep.permission_source,
        uep.granted_at,
        uep.expires_at,
        uep.conditions
    FROM user_effective_permissions uep
    WHERE uep.user_id = user_id_param 
      AND uep.permission_code = permission_code_param
      AND (context_id_param IS NULL OR uep.context_id = context_id_param OR uep.context_id IS NULL)
    ORDER BY 
        CASE uep.permission_source 
            WHEN 'context' THEN 1
            WHEN 'role' THEN 2
            WHEN 'inherited' THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    -- 如果没有找到权限，返回false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::VARCHAR, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. 创建权限分析和报告函数
-- =============================================================================

-- 权限分析函数
CREATE OR REPLACE FUNCTION analyze_permission_coverage()
RETURNS TABLE (
    permission_code VARCHAR,
    permission_name VARCHAR,
    assigned_roles_count INTEGER,
    assigned_users_count INTEGER,
    coverage_percentage DECIMAL(5,2),
    risk_level VARCHAR,
    is_critical BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.permission_code,
        p.permission_name,
        COUNT(DISTINCT rp.role_id) as assigned_roles_count,
        COUNT(DISTINCT cu.id) as assigned_users_count,
        ROUND(
            (COUNT(DISTINCT cu.id)::DECIMAL / NULLIF((SELECT COUNT(*) FROM company_users WHERE status = 'active'), 0)) * 100, 
            2
        ) as coverage_percentage,
        COALESCE(p.metadata->>'risk_level', 'UNKNOWN') as risk_level,
        COALESCE((p.metadata->>'is_critical')::BOOLEAN, false) as is_critical
    FROM permissions p
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.is_granted = true AND rp.revoked_at IS NULL
    LEFT JOIN company_roles r ON rp.role_id = r.id AND r.is_active = true
    LEFT JOIN company_users cu ON r.id = cu.role_id AND cu.status = 'active'
    WHERE p.is_active = true
    GROUP BY p.id, p.permission_code, p.permission_name, p.metadata
    ORDER BY coverage_percentage DESC, p.permission_code;
END;
$$ LANGUAGE plpgsql;

COMMIT;