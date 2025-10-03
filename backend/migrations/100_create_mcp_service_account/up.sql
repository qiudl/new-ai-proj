-- =============================================================================
-- 创建MCP服务账号和权限配置
-- 文件: 100_create_mcp_service_account/up.sql
-- 描述: 为MCP Bridge创建专用服务账号、角色和权限
-- 作者: Claude AI
-- 创建时间: 2025-10-03
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. 创建MCP服务角色
-- =============================================================================
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active)
VALUES (
    'mcp_service',
    'MCP服务角色',
    'MCP Bridge专用服务角色，用于任务管理和文档操作',
    TRUE,  -- 系统角色，不可删除
    TRUE
)
ON CONFLICT (role_code) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- 2. 定义MCP服务所需权限
-- =============================================================================
-- 插入权限定义
WITH mcp_permissions AS (
    SELECT * FROM (VALUES
        -- 任务相关权限
        ('task:read',           '读取任务',     'MCP读取任务信息',           'task', 'task', 'read'),
        ('task:write',          '修改任务',     'MCP修改任务状态和内容',     'task', 'task', 'write'),
        ('task:create',         '创建任务',     'MCP创建新任务',             'task', 'task', 'create'),
        ('task:status',         '更新任务状态', 'MCP更新任务状态',           'task', 'task', 'update_status'),

        -- 文档相关权限
        ('document:read',       '读取文档',     'MCP读取任务文档',           'document', 'document', 'read'),
        ('document:write',      '修改文档',     'MCP修改文档内容',           'document', 'document', 'write'),
        ('document:create',     '创建文档',     'MCP创建任务文档',           'document', 'document', 'create'),
        ('document:attach',     '关联文档',     'MCP关联文档到任务',         'document', 'document', 'attach'),

        -- 项目相关权限
        ('project:read',        '读取项目',     'MCP读取项目信息',           'project', 'project', 'read'),
        ('project:list',        '列出项目',     'MCP列出所有项目',           'project', 'project', 'list'),

        -- 时间跟踪权限
        ('timer:manage',        '管理计时器',   'MCP管理任务计时器',         'timer', 'timer', 'manage'),

        -- Daily Focus权限
        ('daily_focus:manage',  '管理今日任务', 'MCP管理今日主要任务',       'daily_focus', 'daily_focus', 'manage')
    ) AS t(code, name, description, module, resource, action)
)
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, is_active)
SELECT code, name, description, module, resource, action, TRUE
FROM mcp_permissions
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    is_active = TRUE;

-- =============================================================================
-- 3. 关联权限到MCP服务角色
-- =============================================================================
-- 获取MCP服务角色ID和权限IDs，建立关联
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    cr.id AS role_id,
    p.id AS permission_id,
    TRUE AS is_granted,
    CURRENT_TIMESTAMP AS created_at
FROM company_roles cr
CROSS JOIN permissions p
WHERE cr.role_code = 'mcp_service'
  AND p.permission_code IN (
      'task:read', 'task:write', 'task:create', 'task:status',
      'document:read', 'document:write', 'document:create', 'document:attach',
      'project:read', 'project:list',
      'timer:manage',
      'daily_focus:manage'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_granted = TRUE;

-- =============================================================================
-- 4. 创建MCP服务用户账号
-- =============================================================================
-- 创建系统级users表记录
-- Note: users.username is not unique, use INSERT with WHERE NOT EXISTS
INSERT INTO users (
    username,
    email,
    password_hash,  -- 服务账号不使用密码登录，使用API Key
    user_type,
    role,
    status,
    profile,
    created_at,
    updated_at
)
SELECT
    'mcp-service',
    'mcp-service@system.local',
    '',  -- 空密码哈希，不允许密码登录
    'system',  -- 系统用户类型
    'admin', -- 使用admin角色（check constraint限制）
    'active',
    jsonb_build_object(
        'display_name', 'MCP Bridge Service',
        'service_type', 'mcp-bridge',
        'description', 'MCP Bridge专用服务账号',
        'api_key_auth', true,
        'created_by', 'migration_100'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'mcp-service' AND user_type = 'system'
);

-- 创建company_users表记录（关联到MCP服务角色）
-- Note: company_users.email may not have unique constraint, using upsert carefully
INSERT INTO company_users (
    name,
    email,
    role_id,
    department,
    position,
    status,
    custom_permissions,
    created_at,
    updated_at
)
SELECT
    'MCP Bridge Service',
    'mcp-service@system.local',
    cr.id,
    'System Services',
    'API Service Account',
    'active',
    jsonb_build_object(
        'service_type', 'mcp-bridge',
        'auto_token_refresh', true,
        'max_token_lifetime_days', 90
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
CROSS JOIN company_roles cr
WHERE u.username = 'mcp-service'
  AND cr.role_code = 'mcp_service'
  AND NOT EXISTS (
    SELECT 1 FROM company_users WHERE email = 'mcp-service@system.local'
  );

-- =============================================================================
-- 5. 创建API Key管理表（用于服务账号认证）
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_hash VARCHAR(255) NOT NULL UNIQUE,  -- API Key的哈希值
    api_key_prefix VARCHAR(20) NOT NULL,        -- API Key前缀（用于识别）
    description TEXT,
    scopes JSONB DEFAULT '[]'::jsonb,           -- 权限范围
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,                     -- 可选的过期时间
    last_used_at TIMESTAMPTZ,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT chk_api_key_prefix_format CHECK (api_key_prefix ~ '^[a-zA-Z0-9]{8,20}$')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_service_api_keys_user ON service_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_service_api_keys_hash ON service_api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_service_api_keys_active ON service_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_service_api_keys_expires ON service_api_keys(expires_at);

-- 创建更新触发器
CREATE TRIGGER trg_update_service_api_keys_updated_at
    BEFORE UPDATE ON service_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. 记录迁移日志
-- =============================================================================
DO $$
DECLARE
    v_user_id INTEGER;
    v_role_id INTEGER;
BEGIN
    -- 获取创建的用户和角色ID
    SELECT id INTO v_user_id FROM users WHERE username = 'mcp-service';
    SELECT id INTO v_role_id FROM company_roles WHERE role_code = 'mcp_service';

    -- 记录审计日志（如果permission_audit_logs表存在）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
        INSERT INTO permission_audit_logs (
            company_user_id,
            target_user_id,
            action_type,
            reason,
            performed_by,
            performed_at
        )
        SELECT
            cu.id,
            cu.id,
            'user_created',
            'MCP服务账号初始化 - Migration 100',
            NULL,
            CURRENT_TIMESTAMP
        FROM company_users cu
        WHERE cu.email = 'mcp-service@system.local';
    END IF;

    RAISE NOTICE 'MCP服务账号创建成功: user_id=%, role_id=%', v_user_id, v_role_id;
END $$;

COMMIT;
