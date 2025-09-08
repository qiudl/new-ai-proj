-- 创建企业岗位表
CREATE TABLE IF NOT EXISTS enterprise_positions (
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    position_code VARCHAR(50) NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    position_level INTEGER NOT NULL DEFAULT 1, -- 岗位级别 (1-10)
    department_id INTEGER REFERENCES enterprise_departments(id) ON DELETE SET NULL,
    parent_position_id INTEGER REFERENCES enterprise_positions(id) ON DELETE SET NULL,
    
    -- 岗位描述
    description TEXT,
    responsibilities TEXT, -- 岗位职责
    requirements TEXT, -- 任职要求
    
    -- 关联角色模板
    role_template_id INTEGER REFERENCES role_templates(id) ON DELETE SET NULL,
    
    -- 权限配置
    base_permissions JSONB DEFAULT '[]'::jsonb, -- 基础权限列表
    additional_permissions JSONB DEFAULT '[]'::jsonb, -- 额外权限列表
    restricted_permissions JSONB DEFAULT '[]'::jsonb, -- 限制权限列表
    
    -- 配置信息
    max_headcount INTEGER DEFAULT 1, -- 最大编制人数
    current_headcount INTEGER DEFAULT 0, -- 当前在岗人数
    is_key_position BOOLEAN DEFAULT FALSE, -- 是否为关键岗位
    approval_required BOOLEAN DEFAULT FALSE, -- 是否需要审批
    
    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen')),
    
    -- 审计字段
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- 唯一约束
    CONSTRAINT unique_position_code_per_enterprise UNIQUE (enterprise_id, position_code),
    
    -- 检查约束
    CONSTRAINT check_position_level CHECK (position_level >= 1 AND position_level <= 10),
    CONSTRAINT check_headcount CHECK (current_headcount >= 0 AND current_headcount <= max_headcount)
);

-- 创建索引
CREATE INDEX idx_enterprise_positions_enterprise_id ON enterprise_positions(enterprise_id);
CREATE INDEX idx_enterprise_positions_department_id ON enterprise_positions(department_id);
CREATE INDEX idx_enterprise_positions_role_template_id ON enterprise_positions(role_template_id);
CREATE INDEX idx_enterprise_positions_status ON enterprise_positions(status);
CREATE INDEX idx_enterprise_positions_level ON enterprise_positions(position_level);
CREATE INDEX idx_enterprise_positions_deleted_at ON enterprise_positions(deleted_at) WHERE deleted_at IS NULL;

-- 创建企业角色表 (企业自定义角色)
CREATE TABLE IF NOT EXISTS enterprise_roles (
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    
    -- 角色类型
    role_type VARCHAR(20) NOT NULL DEFAULT 'custom' CHECK (role_type IN ('system', 'template', 'custom')),
    
    -- 如果基于模板创建
    template_id INTEGER REFERENCES role_templates(id) ON DELETE SET NULL,
    
    -- 权限配置
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- 层级信息
    role_level INTEGER DEFAULT 1,
    parent_role_id INTEGER REFERENCES enterprise_roles(id) ON DELETE SET NULL,
    
    -- 配置
    is_default BOOLEAN DEFAULT FALSE, -- 是否为默认角色
    auto_assign BOOLEAN DEFAULT FALSE, -- 是否自动分配给新用户
    max_users INTEGER, -- 最大用户数限制
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 审计字段
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- 唯一约束
    CONSTRAINT unique_role_code_per_enterprise UNIQUE (enterprise_id, role_code)
);

-- 创建索引
CREATE INDEX idx_enterprise_roles_enterprise_id ON enterprise_roles(enterprise_id);
CREATE INDEX idx_enterprise_roles_template_id ON enterprise_roles(template_id);
CREATE INDEX idx_enterprise_roles_is_active ON enterprise_roles(is_active);
CREATE INDEX idx_enterprise_roles_role_type ON enterprise_roles(role_type);
CREATE INDEX idx_enterprise_roles_deleted_at ON enterprise_roles(deleted_at) WHERE deleted_at IS NULL;

-- 创建用户-岗位关联表
CREATE TABLE IF NOT EXISTS enterprise_user_positions (
    id SERIAL PRIMARY KEY,
    enterprise_user_id INTEGER NOT NULL REFERENCES enterprise_users(id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES enterprise_positions(id) ON DELETE CASCADE,
    
    -- 任职信息
    appointment_type VARCHAR(20) NOT NULL DEFAULT 'primary' CHECK (appointment_type IN ('primary', 'secondary', 'acting', 'temporary')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 审计字段
    appointed_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 唯一约束：防止重复分配相同岗位
    CONSTRAINT unique_user_position UNIQUE (enterprise_user_id, position_id)
);

-- 创建索引
CREATE INDEX idx_user_positions_user_id ON enterprise_user_positions(enterprise_user_id);
CREATE INDEX idx_user_positions_position_id ON enterprise_user_positions(position_id);
CREATE INDEX idx_user_positions_is_active ON enterprise_user_positions(is_active);

-- 创建用户-角色关联表
CREATE TABLE IF NOT EXISTS enterprise_user_roles (
    id SERIAL PRIMARY KEY,
    enterprise_user_id INTEGER NOT NULL REFERENCES enterprise_users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    
    -- 分配信息
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 审计字段
    assigned_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 唯一约束：防止重复分配
    CONSTRAINT unique_user_role UNIQUE (enterprise_user_id, role_id)
);

-- 创建索引
CREATE INDEX idx_user_roles_user_id ON enterprise_user_roles(enterprise_user_id);
CREATE INDEX idx_user_roles_role_id ON enterprise_user_roles(role_id);
CREATE INDEX idx_user_roles_is_active ON enterprise_user_roles(is_active);

-- 添加触发器更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_positions_updated_at
    BEFORE UPDATE ON enterprise_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enterprise_roles_updated_at
    BEFORE UPDATE ON enterprise_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enterprise_user_positions_updated_at
    BEFORE UPDATE ON enterprise_user_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enterprise_user_roles_updated_at
    BEFORE UPDATE ON enterprise_user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建岗位权限继承视图
CREATE OR REPLACE VIEW v_position_permissions AS
SELECT 
    p.id AS position_id,
    p.position_name,
    p.enterprise_id,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'source', perm_source,
                'permission_code', perm_code,
                'permission_name', perm_name,
                'permission_id', perm_id
            )
        ) FILTER (WHERE perm_code IS NOT NULL),
        '[]'::jsonb
    ) AS all_permissions
FROM enterprise_positions p
LEFT JOIN LATERAL (
    -- 基础权限
    SELECT 
        'position_base' AS perm_source, 
        jsonb_array_elements_text(p.base_permissions) AS perm_code,
        perm.permission_name AS perm_name,
        perm.id AS perm_id
    FROM permissions perm
    WHERE perm.permission_code = ANY(SELECT jsonb_array_elements_text(p.base_permissions))
    
    UNION ALL
    
    -- 额外权限
    SELECT 
        'position_additional' AS perm_source,
        jsonb_array_elements_text(p.additional_permissions) AS perm_code,
        perm.permission_name AS perm_name,
        perm.id AS perm_id
    FROM permissions perm
    WHERE perm.permission_code = ANY(SELECT jsonb_array_elements_text(p.additional_permissions))
    
    UNION ALL
    
    -- 角色模板权限
    SELECT 
        'role_template' AS perm_source,
        perm.permission_code AS perm_code,
        perm.permission_name AS perm_name,
        perm.id AS perm_id
    FROM role_template_permissions rtp
    JOIN permissions perm ON rtp.permission_id = perm.id
    WHERE rtp.template_id = p.role_template_id
    AND perm.is_active = TRUE
) perms ON TRUE
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.position_name, p.enterprise_id;

-- 创建用户有效权限视图
CREATE OR REPLACE VIEW v_user_effective_permissions AS
SELECT 
    eu.id AS user_id,
    eu.username,
    eu.enterprise_id,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'source', perm_source,
                'permission_code', permission_code,
                'permission_name', permission_name,
                'granted_through', granted_through,
                'permission_id', permission_id
            )
        ) FILTER (WHERE permission_code IS NOT NULL),
        '[]'::jsonb
    ) AS effective_permissions
FROM enterprise_users eu
LEFT JOIN LATERAL (
    -- 通过岗位获得的权限
    SELECT 
        vpp.perm_source AS perm_source,
        vpp.perm_code AS permission_code,
        vpp.perm_name AS permission_name,
        ep.position_name AS granted_through,
        vpp.perm_id AS permission_id
    FROM enterprise_user_positions eup
    JOIN enterprise_positions ep ON eup.position_id = ep.id
    JOIN v_position_permissions vpp ON vpp.position_id = ep.id
    CROSS JOIN LATERAL (
        SELECT 
            (perm->>'source')::text AS perm_source,
            (perm->>'permission_code')::text AS perm_code,
            (perm->>'permission_name')::text AS perm_name,
            (perm->>'permission_id')::integer AS perm_id
        FROM jsonb_array_elements(vpp.all_permissions) AS perm
    ) expanded_perms
    WHERE eup.enterprise_user_id = eu.id 
    AND eup.is_active = TRUE
    
    UNION ALL
    
    -- 通过角色获得的权限
    SELECT 
        'enterprise_role' AS perm_source,
        perm.permission_code AS permission_code,
        perm.permission_name AS permission_name,
        er.role_name AS granted_through,
        perm.id AS permission_id
    FROM enterprise_user_roles eur
    JOIN enterprise_roles er ON eur.role_id = er.id
    CROSS JOIN jsonb_array_elements_text(er.permissions) AS role_perm_code
    JOIN permissions perm ON perm.permission_code = role_perm_code
    WHERE eur.enterprise_user_id = eu.id 
    AND eur.is_active = TRUE
    AND er.is_active = TRUE
    AND perm.is_active = TRUE
) user_perms ON TRUE
WHERE eu.deleted_at IS NULL
GROUP BY eu.id, eu.username, eu.enterprise_id;

-- 添加注释
COMMENT ON TABLE enterprise_positions IS '企业岗位表';
COMMENT ON TABLE enterprise_roles IS '企业角色表';
COMMENT ON TABLE enterprise_user_positions IS '用户岗位关联表';
COMMENT ON TABLE enterprise_user_roles IS '用户角色关联表';
COMMENT ON VIEW v_position_permissions IS '岗位权限继承视图';
COMMENT ON VIEW v_user_effective_permissions IS '用户有效权限视图';