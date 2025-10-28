-- ============================================================================
-- RBAC v2.0 双域架构表结构创建
-- Migration: 20251028_01_rbac_v2_dual_domain_tables
-- Description: 创建系统域(System Domain)和企业域(Enterprise Domain)的RBAC表
-- Author: AI Backend Team
-- Date: 2025-10-28
-- ============================================================================

-- ============================================================================
-- 第零部分: 备份现有旧表（如果存在）
-- 注意: 如果数据库中已有旧版本的enterprise_roles等表，需要先重命名备份
-- ============================================================================

DO $$
BEGIN
    -- 备份 enterprise_roles 表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_roles') THEN
        -- 删除已存在的old表（如果有）
        DROP TABLE IF EXISTS enterprise_roles_old CASCADE;
        -- 重命名当前表为old
        ALTER TABLE enterprise_roles RENAME TO enterprise_roles_old;
        RAISE NOTICE '✅ 已备份 enterprise_roles → enterprise_roles_old';
    END IF;

    -- 备份 enterprise_user_roles 表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_user_roles') THEN
        DROP TABLE IF EXISTS enterprise_user_roles_old CASCADE;
        ALTER TABLE enterprise_user_roles RENAME TO enterprise_user_roles_old;
        RAISE NOTICE '✅ 已备份 enterprise_user_roles → enterprise_user_roles_old';
    END IF;

    -- 备份 enterprise_permissions 表（如果存在）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_permissions') THEN
        DROP TABLE IF EXISTS enterprise_permissions_old CASCADE;
        ALTER TABLE enterprise_permissions RENAME TO enterprise_permissions_old;
        RAISE NOTICE '✅ 已备份 enterprise_permissions → enterprise_permissions_old';
    END IF;

    -- 备份 enterprise_role_permissions 表（如果存在）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_role_permissions') THEN
        DROP TABLE IF EXISTS enterprise_role_permissions_old CASCADE;
        ALTER TABLE enterprise_role_permissions RENAME TO enterprise_role_permissions_old;
        RAISE NOTICE '✅ 已备份 enterprise_role_permissions → enterprise_role_permissions_old';
    END IF;
END $$;

-- ============================================================================
-- 第一部分: 系统域(System Domain)表结构
-- 系统域用于管理系统级别的用户、角色和权限
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 系统角色表 (system_roles)
-- 存储系统级别的角色，如超级管理员、系统管理员等
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    privilege_level INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 索引
CREATE INDEX idx_system_roles_code ON system_roles(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_roles_active ON system_roles(is_active) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE system_roles IS '系统角色表 - 存储系统级别的角色定义';
COMMENT ON COLUMN system_roles.code IS '角色代码，如: super_admin, admin';
COMMENT ON COLUMN system_roles.name IS '角色名称';
COMMENT ON COLUMN system_roles.description IS '角色描述';
COMMENT ON COLUMN system_roles.privilege_level IS '权限等级，数字越大权限越高: super_admin=100, admin=80, enterprise_manager=60';
COMMENT ON COLUMN system_roles.is_active IS '是否激活';
COMMENT ON COLUMN system_roles.is_builtin IS '是否内置角色（不可删除）';
COMMENT ON COLUMN system_roles.deleted_at IS '软删除时间戳';

-- ----------------------------------------------------------------------------
-- 1.2 系统权限表 (system_permissions)
-- 存储系统级别的权限，如企业管理、系统用户管理等
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_dangerous BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 索引
CREATE INDEX idx_system_permissions_code ON system_permissions(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_permissions_resource ON system_permissions(resource) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_system_permissions_resource_action ON system_permissions(resource, action) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE system_permissions IS '系统权限表 - 存储系统级别的权限定义';
COMMENT ON COLUMN system_permissions.code IS '权限代码，格式: system.{resource}.{action}，如: system.enterprise.create, system.user.delete';
COMMENT ON COLUMN system_permissions.name IS '权限名称';
COMMENT ON COLUMN system_permissions.description IS '权限描述';
COMMENT ON COLUMN system_permissions.resource IS '资源类型，如: enterprise, user, system';
COMMENT ON COLUMN system_permissions.action IS '操作类型，如: create, read, update, delete';
COMMENT ON COLUMN system_permissions.is_dangerous IS '是否高危权限（如访问企业数据），需要额外审计，如system.enterprise.access_data';
COMMENT ON COLUMN system_permissions.is_active IS '是否激活';

-- ----------------------------------------------------------------------------
-- 1.3 系统角色权限关联表 (system_role_permissions)
-- 定义系统角色拥有哪些系统权限
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES system_roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    UNIQUE(role_id, permission_id)
);

-- 索引
CREATE INDEX idx_srp_role_id ON system_role_permissions(role_id);
CREATE INDEX idx_srp_permission_id ON system_role_permissions(permission_id);

-- 注释
COMMENT ON TABLE system_role_permissions IS '系统角色权限关联表';
COMMENT ON COLUMN system_role_permissions.created_by IS '创建人user_id';

-- ----------------------------------------------------------------------------
-- 1.4 用户系统域标识 (扩展现有users表)
-- 注意: 不创建新表，而是在现有users表中添加system_role_id列
-- ----------------------------------------------------------------------------
-- 检查列是否存在，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'system_role_id'
    ) THEN
        ALTER TABLE users ADD COLUMN system_role_id INT REFERENCES system_roles(id) ON DELETE SET NULL;
        CREATE INDEX idx_users_system_role ON users(system_role_id) WHERE deleted_at IS NULL;
        COMMENT ON COLUMN users.system_role_id IS '系统域角色ID，仅system类型用户使用';
    END IF;
END $$;

-- ============================================================================
-- 第二部分: 企业域(Enterprise Domain)表结构
-- 企业域用于管理企业内部的用户、角色和权限
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 企业角色表 (enterprise_roles)
-- 每个企业可以有自己的角色定义（包括预设角色和自定义角色）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_roles (
    id SERIAL PRIMARY KEY,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_preset BOOLEAN NOT NULL DEFAULT FALSE,
    is_custom BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    deleted_at TIMESTAMP NULL,
    UNIQUE(enterprise_id, code)
);

-- 索引
CREATE INDEX idx_enterprise_roles_enterprise ON enterprise_roles(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_enterprise_roles_code ON enterprise_roles(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_enterprise_roles_preset ON enterprise_roles(is_preset) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE enterprise_roles IS '企业角色表 - 每个企业可定义自己的角色';
COMMENT ON COLUMN enterprise_roles.code IS '角色代码，如: admin, member, viewer';
COMMENT ON COLUMN enterprise_roles.name IS '角色名称';
COMMENT ON COLUMN enterprise_roles.description IS '角色描述';
COMMENT ON COLUMN enterprise_roles.is_preset IS '是否预设角色（每个企业自动创建），如: enterprise_admin, project_manager, member';
COMMENT ON COLUMN enterprise_roles.is_custom IS '是否自定义角色，由企业管理员创建';
COMMENT ON COLUMN enterprise_roles.is_active IS '是否激活';
COMMENT ON COLUMN enterprise_roles.created_by IS '创建人user_id';

-- ----------------------------------------------------------------------------
-- 2.2 企业权限表 (enterprise_permissions)
-- 定义企业域内的所有权限（全局定义，所有企业共享权限定义）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 索引
CREATE INDEX idx_enterprise_permissions_code ON enterprise_permissions(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_enterprise_permissions_resource ON enterprise_permissions(resource) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_enterprise_permissions_resource_action ON enterprise_permissions(resource, action) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE enterprise_permissions IS '企业权限表 - 全局企业权限定义，所有企业共享';
COMMENT ON COLUMN enterprise_permissions.code IS '权限代码，格式: enterprise.{resource}.{action}，如: enterprise.project.create, enterprise.task.update';
COMMENT ON COLUMN enterprise_permissions.name IS '权限名称';
COMMENT ON COLUMN enterprise_permissions.description IS '权限描述';
COMMENT ON COLUMN enterprise_permissions.resource IS '资源类型，如: project, task, document';
COMMENT ON COLUMN enterprise_permissions.action IS '操作类型，如: create, read, update, delete';
COMMENT ON COLUMN enterprise_permissions.is_active IS '是否激活';

-- ----------------------------------------------------------------------------
-- 2.3 企业角色权限关联表 (enterprise_role_permissions)
-- 定义企业角色拥有哪些企业权限
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES enterprise_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    UNIQUE(role_id, permission_id)
);

-- 索引
CREATE INDEX idx_erp_role_id ON enterprise_role_permissions(role_id);
CREATE INDEX idx_erp_permission_id ON enterprise_role_permissions(permission_id);

-- 注释
COMMENT ON TABLE enterprise_role_permissions IS '企业角色权限关联表';
COMMENT ON COLUMN enterprise_role_permissions.created_by IS '创建人user_id';

-- ----------------------------------------------------------------------------
-- 2.4 企业用户角色表 (enterprise_user_roles)
-- 用户在企业中的角色分配 - 支持一个用户拥有多个角色
-- 替代原有的enterprise_users表中的role字段
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_user_roles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(user_id, enterprise_id, role_id)
);

-- 索引 - 这是权限检查的关键索引，必须优化
CREATE INDEX idx_eur_user_enterprise ON enterprise_user_roles(user_id, enterprise_id) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_eur_enterprise ON enterprise_user_roles(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_eur_role ON enterprise_user_roles(role_id) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE enterprise_user_roles IS '企业用户角色表 - 支持用户在企业中拥有多个角色';
COMMENT ON COLUMN enterprise_user_roles.is_active IS '是否激活';
COMMENT ON COLUMN enterprise_user_roles.assigned_at IS '分配时间';
COMMENT ON COLUMN enterprise_user_roles.assigned_by IS '分配人user_id';
COMMENT ON INDEX idx_eur_user_enterprise IS '权限检查核心索引 - 根据用户ID和企业ID快速查询角色';

-- ----------------------------------------------------------------------------
-- 2.5 企业用户自定义权限表 (enterprise_user_custom_permissions)
-- 为特定用户添加额外的权限或撤销某些权限
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_user_custom_permissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES enterprise_permissions(id) ON DELETE CASCADE,
    grant_type VARCHAR(10) NOT NULL CHECK (grant_type IN ('grant', 'revoke')),
    reason TEXT,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(user_id, enterprise_id, permission_id)
);

-- 索引
CREATE INDEX idx_eucp_user_enterprise ON enterprise_user_custom_permissions(user_id, enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_eucp_permission ON enterprise_user_custom_permissions(permission_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_eucp_expires ON enterprise_user_custom_permissions(expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

-- 注释
COMMENT ON TABLE enterprise_user_custom_permissions IS '企业用户自定义权限表 - 为用户单独授予或撤销权限';
COMMENT ON COLUMN enterprise_user_custom_permissions.grant_type IS 'grant=额外授予权限, revoke=撤销角色中的权限';
COMMENT ON COLUMN enterprise_user_custom_permissions.reason IS '授予或撤销原因';
COMMENT ON COLUMN enterprise_user_custom_permissions.granted_at IS '授予时间';
COMMENT ON COLUMN enterprise_user_custom_permissions.granted_by IS '授予人user_id';
COMMENT ON COLUMN enterprise_user_custom_permissions.expires_at IS '过期时间，NULL表示永久';

-- ============================================================================
-- 第三部分: 初始化数据
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 插入系统角色（4个内置角色）
-- ----------------------------------------------------------------------------
INSERT INTO system_roles (code, name, description, privilege_level, is_builtin, is_active)
VALUES
    ('super_admin', '超级管理员', '拥有所有系统权限，包括访问企业数据的高危权限', 100, TRUE, TRUE),
    ('admin', '系统管理员', '管理企业组织、系统用户，但不能访问企业业务数据', 80, TRUE, TRUE),
    ('enterprise_manager', '企业管理员', '管理企业基本信息和配置', 60, TRUE, TRUE),
    ('system_user', '系统用户', '基础系统访问权限', 40, TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3.2 插入系统权限（14个核心系统权限）
-- ----------------------------------------------------------------------------
INSERT INTO system_permissions (code, name, description, resource, action, is_dangerous, is_active)
VALUES
    -- 企业管理权限
    ('system.enterprise.create', '创建企业', '可以创建新的企业组织', 'enterprise', 'create', FALSE, TRUE),
    ('system.enterprise.read', '查看企业列表', '可以查看所有企业列表和基本信息', 'enterprise', 'read', FALSE, TRUE),
    ('system.enterprise.update', '更新企业信息', '可以修改企业基本信息和配置', 'enterprise', 'update', FALSE, TRUE),
    ('system.enterprise.delete', '删除企业', '可以删除企业（软删除）', 'enterprise', 'delete', FALSE, TRUE),
    ('system.enterprise.access_data', '访问企业数据', '高危权限 - 可以查看企业内部业务数据', 'enterprise', 'access_data', TRUE, TRUE),

    -- 系统用户管理权限
    ('system.user.create', '创建系统用户', '可以创建系统级别的用户', 'user', 'create', FALSE, TRUE),
    ('system.user.read', '查看系统用户', '可以查看系统用户列表和详情', 'user', 'read', FALSE, TRUE),
    ('system.user.update', '更新系统用户', '可以修改系统用户信息', 'user', 'update', FALSE, TRUE),
    ('system.user.delete', '删除系统用户', '可以删除系统用户', 'user', 'delete', FALSE, TRUE),
    ('system.user.assign_role', '分配系统角色', '可以为用户分配系统角色', 'user', 'assign_role', FALSE, TRUE),

    -- 系统配置权限
    ('system.config.read', '查看系统配置', '可以查看系统配置信息', 'config', 'read', FALSE, TRUE),
    ('system.config.update', '修改系统配置', '可以修改系统配置', 'config', 'update', TRUE, TRUE),

    -- 审计日志权限
    ('system.audit.read', '查看审计日志', '可以查看系统和企业的审计日志', 'audit', 'read', FALSE, TRUE),
    ('system.audit.export', '导出审计日志', '可以导出审计日志数据', 'audit', 'export', FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3.3 分配系统角色权限
-- ----------------------------------------------------------------------------

-- super_admin: 拥有所有系统权限
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT sr.id, sp.id
FROM system_roles sr
CROSS JOIN system_permissions sp
WHERE sr.code = 'super_admin' AND sp.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- admin: 除了访问企业数据外的大部分权限
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT sr.id, sp.id
FROM system_roles sr
CROSS JOIN system_permissions sp
WHERE sr.code = 'admin'
  AND sp.code NOT IN ('system.enterprise.access_data', 'system.config.update')
  AND sp.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- enterprise_manager: 只能管理企业基本信息
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT sr.id, sp.id
FROM system_roles sr
CROSS JOIN system_permissions sp
WHERE sr.code = 'enterprise_manager'
  AND sp.code IN ('system.enterprise.read', 'system.enterprise.update')
  AND sp.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- system_user: 只读权限
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT sr.id, sp.id
FROM system_roles sr
CROSS JOIN system_permissions sp
WHERE sr.code = 'system_user'
  AND sp.action = 'read'
  AND sp.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3.4 插入企业权限（18个核心企业权限）
-- ----------------------------------------------------------------------------
INSERT INTO enterprise_permissions (code, name, description, resource, action, is_active)
VALUES
    -- 项目管理权限
    ('enterprise.project.create', '创建项目', '可以在企业内创建新项目', 'project', 'create', TRUE),
    ('enterprise.project.read', '查看项目', '可以查看企业内的项目列表和详情', 'project', 'read', TRUE),
    ('enterprise.project.update', '更新项目', '可以修改项目信息和配置', 'project', 'update', TRUE),
    ('enterprise.project.delete', '删除项目', '可以删除项目', 'project', 'delete', TRUE),

    -- 任务管理权限
    ('enterprise.task.create', '创建任务', '可以创建新任务', 'task', 'create', TRUE),
    ('enterprise.task.read', '查看任务', '可以查看任务列表和详情', 'task', 'read', TRUE),
    ('enterprise.task.update', '更新任务', '可以修改任务信息', 'task', 'update', TRUE),
    ('enterprise.task.delete', '删除任务', '可以删除任务', 'task', 'delete', TRUE),
    ('enterprise.task.assign', '分配任务', '可以将任务分配给其他成员', 'task', 'assign', TRUE),

    -- 文档管理权限
    ('enterprise.document.create', '创建文档', '可以创建文档', 'document', 'create', TRUE),
    ('enterprise.document.read', '查看文档', '可以查看文档', 'document', 'read', TRUE),
    ('enterprise.document.update', '更新文档', '可以修改文档', 'document', 'update', TRUE),
    ('enterprise.document.delete', '删除文档', '可以删除文档', 'document', 'delete', TRUE),

    -- 成员管理权限
    ('enterprise.member.invite', '邀请成员', '可以邀请新成员加入企业', 'member', 'invite', TRUE),
    ('enterprise.member.read', '查看成员', '可以查看企业成员列表', 'member', 'read', TRUE),
    ('enterprise.member.update', '更新成员', '可以修改成员信息和角色', 'member', 'update', TRUE),
    ('enterprise.member.remove', '移除成员', '可以将成员从企业中移除', 'member', 'remove', TRUE),

    -- 企业配置权限
    ('enterprise.settings.update', '修改企业配置', '可以修改企业设置和配置', 'settings', 'update', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3.5 创建企业预设角色模板（将在迁移脚本中为每个企业创建）
-- 这里只是定义标准，实际数据在migration脚本中创建
-- ----------------------------------------------------------------------------

-- 说明: 每个企业将自动创建以下3个预设角色:
-- 1. enterprise_admin (企业管理员) - 拥有所有企业权限
-- 2. project_manager (项目经理) - 项目和任务管理权限
-- 3. member (普通成员) - 基础查看和操作权限

-- ============================================================================
-- 第四部分: 数据验证和完整性检查
-- ============================================================================

-- 验证表创建成功
DO $$
DECLARE
    table_count INT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'system_roles',
        'system_permissions',
        'system_role_permissions',
        'enterprise_roles',
        'enterprise_permissions',
        'enterprise_role_permissions',
        'enterprise_user_roles',
        'enterprise_user_custom_permissions'
    );

    IF table_count < 8 THEN
        RAISE EXCEPTION 'RBAC v2 表创建不完整，只创建了 % 个表', table_count;
    END IF;

    RAISE NOTICE '✅ RBAC v2 双域架构表创建成功: % 个表', table_count;
END $$;

-- 验证系统角色和权限
DO $$
DECLARE
    role_count INT;
    perm_count INT;
    mapping_count INT;
BEGIN
    SELECT COUNT(*) INTO role_count FROM system_roles WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO perm_count FROM system_permissions WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO mapping_count FROM system_role_permissions;

    RAISE NOTICE '✅ 系统角色数量: %, 系统权限数量: %, 角色权限映射: %', role_count, perm_count, mapping_count;

    IF role_count < 4 THEN
        RAISE EXCEPTION '系统角色初始化失败，预期4个，实际 %', role_count;
    END IF;

    IF perm_count < 14 THEN
        RAISE EXCEPTION '系统权限初始化失败，预期14个，实际 %', perm_count;
    END IF;
END $$;

-- 验证企业权限
DO $$
DECLARE
    ent_perm_count INT;
BEGIN
    SELECT COUNT(*) INTO ent_perm_count FROM enterprise_permissions WHERE deleted_at IS NULL;

    RAISE NOTICE '✅ 企业权限数量: %', ent_perm_count;

    IF ent_perm_count < 18 THEN
        RAISE EXCEPTION '企业权限初始化失败，预期18个，实际 %', ent_perm_count;
    END IF;
END $$;

-- ============================================================================
-- Migration 完成
-- ============================================================================
-- 下一步: 运行数据迁移脚本 (20251028_02_rbac_v2_data_migration)
-- ============================================================================
