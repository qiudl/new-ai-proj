-- =============================================================================
-- AI Project 系统角色初始化脚本
-- =============================================================================
-- 功能: 创建标准系统角色和权限映射
-- 版本: v1.0
-- 日期: 2025-11-02
-- 作者: Claude Code AI
-- =============================================================================

BEGIN;

-- =============================================================================
-- 步骤 1: 添加 enterprise_id 字段 (如果不存在)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'company_roles' AND column_name = 'enterprise_id'
    ) THEN
        ALTER TABLE company_roles
        ADD COLUMN enterprise_id INTEGER REFERENCES enterprises(id);

        CREATE INDEX IF NOT EXISTS idx_company_roles_enterprise_id
        ON company_roles(enterprise_id);

        RAISE NOTICE '已添加 enterprise_id 字段';
    ELSE
        RAISE NOTICE 'enterprise_id 字段已存在';
    END IF;
END $$;

-- =============================================================================
-- 步骤 2: 添加约束 - 系统角色不能有 enterprise_id
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_role'
    ) THEN
        ALTER TABLE company_roles
        ADD CONSTRAINT chk_enterprise_role
        CHECK (
            (is_system_role = true AND enterprise_id IS NULL) OR
            (is_system_role = false AND enterprise_id IS NOT NULL)
        );
        RAISE NOTICE '已添加企业角色约束';
    ELSE
        RAISE NOTICE '企业角色约束已存在';
    END IF;
END $$;

-- =============================================================================
-- 步骤 3: 清理现有系统角色 (软删除重复和旧角色)
-- =============================================================================

-- 标记旧的系统角色为非活跃状态 (保留用于数据迁移参考)
UPDATE company_roles
SET is_active = false,
    updated_at = NOW()
WHERE role_code IN (
    'super_admin', 'admin', 'superadmin', 'system_admin', 'system_operator',
    'system_auditor', 'system_support', 'system_guest',
    'company_admin', 'project_manager', 'developer', 'member', 'guest',
    'tech_lead', 'team_lead', 'designer', 'tester', 'business_analyst',
    'hr_manager', 'finance_manager', 'business_contact', 'client_user', 'mcp_service'
)
AND is_system_role = true;

-- =============================================================================
-- 步骤 4: 创建标准系统角色
-- =============================================================================

-- 4.1 SYSTEM_SUPER_ADMIN - 系统超级管理员
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, enterprise_id, created_at, updated_at)
VALUES (
    'SYSTEM_SUPER_ADMIN',
    '系统超级管理员',
    '拥有系统所有权限的最高级别管理员，无权限限制',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (role_code, COALESCE(enterprise_id, -1))
DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4.2 SYSTEM_ADMIN - 系统管理员
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, enterprise_id, created_at, updated_at)
VALUES (
    'SYSTEM_ADMIN',
    '系统管理员',
    '系统层面的管理员，负责系统配置和监控',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (role_code, COALESCE(enterprise_id, -1))
DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4.3 ENTERPRISE_ADMIN - 企业管理员模板
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, enterprise_id, created_at, updated_at)
VALUES (
    'ENTERPRISE_ADMIN',
    '企业管理员',
    '企业内最高权限，管理企业所有资源',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (role_code, COALESCE(enterprise_id, -1))
DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4.4 ENTERPRISE_PM - 项目经理模板
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, enterprise_id, created_at, updated_at)
VALUES (
    'ENTERPRISE_PM',
    '项目经理',
    '负责项目计划、执行和团队协调',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (role_code, COALESCE(enterprise_id, -1))
DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4.5 ENTERPRISE_DEVELOPER - 开发人员模板
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, enterprise_id, created_at, updated_at)
VALUES (
    'ENTERPRISE_DEVELOPER',
    '开发人员',
    '执行开发任务、编写代码和技术文档',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (role_code, COALESCE(enterprise_id, -1))
DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4.6 ENTERPRISE_USER - 普通用户模板
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, enterprise_id, created_at, updated_at)
VALUES (
    'ENTERPRISE_USER',
    '普通用户',
    '企业普通成员，执行基本任务和查看信息',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (role_code, COALESCE(enterprise_id, -1))
DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4.7 ENTERPRISE_GUEST - 访客模板
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, enterprise_id, created_at, updated_at)
VALUES (
    'ENTERPRISE_GUEST',
    '访客',
    '临时访客，仅可查看授权的信息',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (role_code, COALESCE(enterprise_id, -1))
DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    is_system_role = EXCLUDED.is_system_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================================================
-- 步骤 5: 分配权限 - SYSTEM_SUPER_ADMIN (所有权限)
-- =============================================================================

-- 删除旧的权限分配
DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles WHERE role_code = 'SYSTEM_SUPER_ADMIN'
);

-- 分配所有权限
INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    r.id,
    p.id,
    true,
    NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'SYSTEM_SUPER_ADMIN'
ON CONFLICT (role_id, permission_id)
DO UPDATE SET is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 步骤 6: 分配权限 - SYSTEM_ADMIN
-- =============================================================================

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles WHERE role_code = 'SYSTEM_ADMIN'
);

INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    r.id,
    p.id,
    true,
    NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'SYSTEM_ADMIN'
  AND p.permission_code IN (
    -- 系统管理
    'system.admin', 'system.config', 'system.audit',
    'system.audit_logs.read', 'system.settings.read', 'system.settings.manage',
    -- API管理
    'api.admin', 'api.keys.create', 'api.keys.read', 'api.keys.update',
    'api.keys.delete', 'api.logs.read', 'api.quota.read',
    -- 企业查看
    'company.info.read', 'company.users.read',
    -- 用户管理
    'user.read', 'user.create', 'user.update', 'user.delete',
    -- 基础权限
    'dashboard.read', 'profile.read', 'profile.update', 'password.change',
    'work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete',
    'timer.start', 'timer.stop', 'timer.view', 'timer:manage',
    'stats.view.own'
  )
ON CONFLICT (role_id, permission_id)
DO UPDATE SET is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 步骤 7: 分配权限 - ENTERPRISE_ADMIN
-- =============================================================================

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles WHERE role_code = 'ENTERPRISE_ADMIN'
);

INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    r.id,
    p.id,
    true,
    NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ENTERPRISE_ADMIN'
  AND p.permission_code IN (
    -- 企业管理
    'company.info.read', 'company.info.update',
    'company.users.read', 'company.users.create', 'company.users.update', 'company.users.delete',
    'company.roles.manage',
    -- 项目管理
    'project.read', 'project.create', 'project.update', 'project.delete',
    'project.list.read', 'project.detail.read', 'project.members.manage',
    'project:read', 'project:list', 'enterprise.project.read',
    -- 任务管理
    'task.read', 'task.create', 'task.update', 'task.delete', 'task.assign',
    'task.list.read', 'task.detail.read',
    'task:read', 'task:create', 'task:write', 'task:status',
    'enterprise.task.read',
    -- 文档管理
    'document:read', 'document:create', 'document:write', 'document:attach',
    -- 财务管理
    'finance.contracts.read', 'finance.contracts.manage', 'finance.reports.read',
    -- 团队笔记
    'team_work_note_create', 'team_work_note_update', 'team_work_note_delete',
    'team_work_note_folder_create', 'team_work_note_folder_update', 'team_work_note_folder_delete',
    -- 基础权限
    'dashboard.read', 'profile.read', 'profile.update', 'password.change',
    'work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete',
    'timer.start', 'timer.stop', 'timer.view', 'timer:manage',
    'stats.view.own', 'daily_focus:manage'
  )
ON CONFLICT (role_id, permission_id)
DO UPDATE SET is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 步骤 8: 分配权限 - ENTERPRISE_PM
-- =============================================================================

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles WHERE role_code = 'ENTERPRISE_PM'
);

INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    r.id,
    p.id,
    true,
    NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ENTERPRISE_PM'
  AND p.permission_code IN (
    -- 项目管理
    'project.read', 'project.create', 'project.update',
    'project.list.read', 'project.detail.read', 'project.members.manage',
    'project:read', 'project:list', 'enterprise.project.read',
    -- 任务管理
    'task.read', 'task.create', 'task.update', 'task.assign',
    'task.list.read', 'task.detail.read',
    'task:read', 'task:create', 'task:write', 'task:status',
    'enterprise.task.read',
    -- 文档管理
    'document:read', 'document:create', 'document:write', 'document:attach',
    -- 财务查看
    'finance.contracts.read', 'finance.reports.read',
    -- 团队笔记
    'team_work_note_create', 'team_work_note_update',
    'team_work_note_folder_create',
    -- 基础权限
    'dashboard.read', 'profile.read', 'profile.update', 'password.change',
    'work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete',
    'timer.start', 'timer.stop', 'timer.view', 'timer:manage',
    'stats.view.own', 'daily_focus:manage'
  )
ON CONFLICT (role_id, permission_id)
DO UPDATE SET is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 步骤 9: 分配权限 - ENTERPRISE_DEVELOPER
-- =============================================================================

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles WHERE role_code = 'ENTERPRISE_DEVELOPER'
);

INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    r.id,
    p.id,
    true,
    NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ENTERPRISE_DEVELOPER'
  AND p.permission_code IN (
    -- 项目查看
    'project.read', 'project.detail.read', 'project:read', 'enterprise.project.read',
    -- 任务管理
    'task.read', 'task.create', 'task.update',
    'task.list.read', 'task.detail.read',
    'task:read', 'task:create', 'task:write', 'task:status',
    'enterprise.task.read',
    -- 文档管理
    'document:read', 'document:create', 'document:write', 'document:attach',
    -- 团队笔记
    'team_work_note_create',
    -- 基础权限
    'dashboard.read', 'profile.read', 'profile.update', 'password.change',
    'work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete',
    'timer.start', 'timer.stop', 'timer.view', 'timer:manage',
    'stats.view.own', 'daily_focus:manage'
  )
ON CONFLICT (role_id, permission_id)
DO UPDATE SET is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 步骤 10: 分配权限 - ENTERPRISE_USER
-- =============================================================================

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles WHERE role_code = 'ENTERPRISE_USER'
);

INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    r.id,
    p.id,
    true,
    NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ENTERPRISE_USER'
  AND p.permission_code IN (
    -- 项目查看
    'project.read', 'project.detail.read', 'project:read', 'enterprise.project.read',
    -- 任务查看和更新
    'task.read', 'task.update', 'task.detail.read',
    'task:read', 'task:status', 'enterprise.task.read',
    -- 文档查看
    'document:read',
    -- 基础权限
    'dashboard.read', 'profile.read', 'profile.update', 'password.change',
    'work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete',
    'timer.start', 'timer.stop', 'timer.view', 'timer:manage',
    'stats.view.own', 'daily_focus:manage'
  )
ON CONFLICT (role_id, permission_id)
DO UPDATE SET is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 步骤 11: 分配权限 - ENTERPRISE_GUEST
-- =============================================================================

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles WHERE role_code = 'ENTERPRISE_GUEST'
);

INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
SELECT
    r.id,
    p.id,
    true,
    NOW()
FROM company_roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ENTERPRISE_GUEST'
  AND p.permission_code IN (
    -- 只读访问
    'project.read', 'project:read',
    'task.read', 'task:read',
    'document:read',
    -- 基础权限
    'dashboard.read', 'profile.read', 'profile.update', 'password.change'
  )
ON CONFLICT (role_id, permission_id)
DO UPDATE SET is_granted = EXCLUDED.is_granted;

-- =============================================================================
-- 步骤 12: 创建验证视图
-- =============================================================================

CREATE OR REPLACE VIEW v_system_roles_summary AS
SELECT
    r.id,
    r.role_code,
    r.role_name,
    r.role_description,
    r.is_system_role,
    r.is_active,
    r.enterprise_id,
    COUNT(rp.permission_id) as permission_count,
    array_agg(p.permission_code ORDER BY p.permission_code) FILTER (WHERE rp.is_granted = true) as permissions
FROM company_roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_system_role = true
GROUP BY r.id, r.role_code, r.role_name, r.role_description, r.is_system_role, r.is_active, r.enterprise_id
ORDER BY
    CASE
        WHEN r.role_code = 'SYSTEM_SUPER_ADMIN' THEN 1
        WHEN r.role_code = 'SYSTEM_ADMIN' THEN 2
        WHEN r.role_code = 'ENTERPRISE_ADMIN' THEN 3
        WHEN r.role_code = 'ENTERPRISE_PM' THEN 4
        WHEN r.role_code = 'ENTERPRISE_DEVELOPER' THEN 5
        WHEN r.role_code = 'ENTERPRISE_USER' THEN 6
        WHEN r.role_code = 'ENTERPRISE_GUEST' THEN 7
        ELSE 99
    END;

COMMIT;

-- =============================================================================
-- 验证结果
-- =============================================================================

SELECT
    '========================================' as separator,
    '系统角色创建完成' as message,
    '========================================' as separator2;

SELECT
    role_code,
    role_name,
    permission_count,
    is_active
FROM v_system_roles_summary
WHERE role_code IN (
    'SYSTEM_SUPER_ADMIN', 'SYSTEM_ADMIN',
    'ENTERPRISE_ADMIN', 'ENTERPRISE_PM', 'ENTERPRISE_DEVELOPER',
    'ENTERPRISE_USER', 'ENTERPRISE_GUEST'
);

SELECT
    '========================================' as separator,
    '下一步: 运行 create-enterprise-roles.sql 为现有企业创建角色' as next_step,
    '========================================' as separator2;
