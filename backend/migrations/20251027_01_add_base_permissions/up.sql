-- ============================================================================
-- Migration: 20251027_01_add_base_permissions
-- Description: 添加基础权限 - 所有认证用户默认拥有的核心功能权限
-- Author: Claude Code AI
-- Created: 2025-10-27
-- Task: #2862 - 实现任何用户拥有的基本权限
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: 添加基础权限到 permissions 表
-- ============================================================================

-- 插入基础权限（如果不存在）
-- 这些权限将被所有认证用户自动拥有，无需显式分配

-- Dashboard 权限
INSERT INTO permissions (
    permission_code,
    permission_name,
    description,
    module_name,
    is_active,
    is_system_permission,
    created_at,
    updated_at
) VALUES
(
    'dashboard.read',
    '查看Dashboard',
    '查看Dashboard首页，包括任务概览、统计图表等核心功能访问',
    'dashboard',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (permission_code)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE,
    is_system_permission = TRUE,
    updated_at = NOW();

-- Profile 权限（个人中心）
INSERT INTO permissions (
    permission_code,
    permission_name,
    description,
    module_name,
    is_active,
    is_system_permission,
    created_at,
    updated_at
) VALUES
(
    'profile.read',
    '查看个人信息',
    '查看个人信息、头像、联系方式等个人资料',
    'profile',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'profile.update',
    '更新个人资料',
    '更新个人资料，包括姓名、头像、联系方式等',
    'profile',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'password.change',
    '修改密码',
    '修改登录密码',
    'profile',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (permission_code)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE,
    is_system_permission = TRUE,
    updated_at = NOW();

-- Work Note 权限（工作笔记）
INSERT INTO permissions (
    permission_code,
    permission_name,
    description,
    module_name,
    is_active,
    is_system_permission,
    created_at,
    updated_at
) VALUES
(
    'work_note.create',
    '创建工作笔记',
    '创建个人工作笔记',
    'work_note',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'work_note.read',
    '查看工作笔记',
    '查看自己创建的工作笔记',
    'work_note',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'work_note.update',
    '编辑工作笔记',
    '编辑自己的工作笔记内容',
    'work_note',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'work_note.delete',
    '删除工作笔记',
    '删除自己的工作笔记',
    'work_note',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (permission_code)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE,
    is_system_permission = TRUE,
    updated_at = NOW();

-- Timer 权限（计时器）
INSERT INTO permissions (
    permission_code,
    permission_name,
    description,
    module_name,
    is_active,
    is_system_permission,
    created_at,
    updated_at
) VALUES
(
    'timer.start',
    '启动计时器',
    '启动任务计时器',
    'timer',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'timer.stop',
    '停止计时器',
    '停止任务计时器',
    'timer',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'timer.view',
    '查看计时记录',
    '查看自己的计时记录',
    'timer',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (permission_code)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE,
    is_system_permission = TRUE,
    updated_at = NOW();

-- Statistics 权限（个人统计）
INSERT INTO permissions (
    permission_code,
    permission_name,
    description,
    module_name,
    is_active,
    is_system_permission,
    created_at,
    updated_at
) VALUES
(
    'stats.view.own',
    '查看个人统计',
    '查看个人工作统计信息，如任务完成数、工时统计等',
    'statistics',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (permission_code)
DO UPDATE SET
    description = EXCLUDED.description,
    is_active = TRUE,
    is_system_permission = TRUE,
    updated_at = NOW();

-- ============================================================================
-- Part 2: 创建基础权限分类表（可选，用于管理界面展示）
-- ============================================================================

-- 创建基础权限分类表（如果不存在）
CREATE TABLE IF NOT EXISTS base_permission_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE base_permission_categories IS '基础权限分类表 - 用于管理界面分组显示基础权限';
COMMENT ON COLUMN base_permission_categories.category_code IS '分类代码（如：dashboard, profile, work_note等）';
COMMENT ON COLUMN base_permission_categories.display_order IS '显示顺序（数字越小越靠前）';

-- 插入基础权限分类
INSERT INTO base_permission_categories (
    category_code,
    category_name,
    description,
    display_order,
    icon
) VALUES
('dashboard', 'Dashboard', 'Dashboard首页相关权限', 1, 'dashboard'),
('profile', '个人中心', '个人资料和账户管理相关权限', 2, 'user'),
('work_note', '工作笔记', '个人工作笔记管理相关权限', 3, 'file-text'),
('timer', '计时器', '任务计时器相关权限', 4, 'clock'),
('statistics', '个人统计', '个人数据统计相关权限', 5, 'bar-chart')
ON CONFLICT (category_code)
DO UPDATE SET
    category_name = EXCLUDED.category_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- ============================================================================
-- Part 3: 创建权限分类关联表
-- ============================================================================

-- 创建权限-分类关联表（如果不存在）
CREATE TABLE IF NOT EXISTS permission_category_mappings (
    id SERIAL PRIMARY KEY,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES base_permission_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (permission_id, category_id)
);

COMMENT ON TABLE permission_category_mappings IS '权限分类映射表 - 将基础权限关联到分类';

-- 插入权限-分类关联关系
INSERT INTO permission_category_mappings (permission_id, category_id)
SELECT p.id, c.id
FROM permissions p
CROSS JOIN base_permission_categories c
WHERE
    (c.category_code = 'dashboard' AND p.permission_code = 'dashboard.read')
    OR (c.category_code = 'profile' AND p.permission_code IN ('profile.read', 'profile.update', 'password.change'))
    OR (c.category_code = 'work_note' AND p.permission_code IN ('work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete'))
    OR (c.category_code = 'timer' AND p.permission_code IN ('timer.start', 'timer.stop', 'timer.view'))
    OR (c.category_code = 'statistics' AND p.permission_code = 'stats.view.own')
ON CONFLICT (permission_id, category_id) DO NOTHING;

-- ============================================================================
-- Part 4: 添加标识字段标记基础权限
-- ============================================================================

-- 在 permissions 表添加 is_base_permission 字段（如果不存在）
ALTER TABLE permissions
ADD COLUMN IF NOT EXISTS is_base_permission BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN permissions.is_base_permission IS '是否为基础权限（所有认证用户默认拥有）';

-- 标记基础权限
UPDATE permissions
SET is_base_permission = TRUE,
    updated_at = NOW()
WHERE permission_code IN (
    'dashboard.read',
    'profile.read',
    'profile.update',
    'password.change',
    'work_note.create',
    'work_note.read',
    'work_note.update',
    'work_note.delete',
    'timer.start',
    'timer.stop',
    'timer.view',
    'stats.view.own'
);

-- ============================================================================
-- Part 5: 创建索引优化查询性能
-- ============================================================================

-- 为基础权限查询创建索引
CREATE INDEX IF NOT EXISTS idx_permissions_is_base_permission
ON permissions(is_base_permission)
WHERE is_base_permission = TRUE;

CREATE INDEX IF NOT EXISTS idx_permissions_module_name
ON permissions(module_name);

CREATE INDEX IF NOT EXISTS idx_permission_category_mappings_category_id
ON permission_category_mappings(category_id);

-- ============================================================================
-- Part 6: 验证数据完整性
-- ============================================================================

-- 验证所有基础权限都已成功插入
DO $$
DECLARE
    expected_count INTEGER := 12;
    actual_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO actual_count
    FROM permissions
    WHERE is_base_permission = TRUE;

    IF actual_count != expected_count THEN
        RAISE EXCEPTION 'Base permission count mismatch: expected %, got %', expected_count, actual_count;
    END IF;

    RAISE NOTICE '✓ Successfully created % base permissions', actual_count;
END $$;

-- 验证所有权限分类都已创建
DO $$
DECLARE
    expected_categories INTEGER := 5;
    actual_categories INTEGER;
BEGIN
    SELECT COUNT(*) INTO actual_categories
    FROM base_permission_categories;

    IF actual_categories != expected_categories THEN
        RAISE EXCEPTION 'Base permission category count mismatch: expected %, got %', expected_categories, actual_categories;
    END IF;

    RAISE NOTICE '✓ Successfully created % base permission categories', actual_categories;
END $$;

-- ============================================================================
-- Part 7: 记录迁移日志
-- ============================================================================

-- 插入迁移记录（如果有migrations表）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations') THEN
        INSERT INTO migrations (version, description, applied_at)
        VALUES ('20251027_01', 'Add base permissions for all authenticated users', NOW())
        ON CONFLICT (version) DO NOTHING;

        RAISE NOTICE '✓ Migration record created';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Migration Summary
-- ============================================================================
-- 本次迁移内容：
-- 1. 添加12个基础权限到 permissions 表
-- 2. 创建 base_permission_categories 表存储权限分类
-- 3. 创建 permission_category_mappings 表关联权限和分类
-- 4. 添加 is_base_permission 字段标识基础权限
-- 5. 创建相关索引优化查询性能
-- 6. 验证数据完整性
--
-- 基础权限列表：
-- - dashboard.read: 查看Dashboard
-- - profile.read/update: 个人中心管理
-- - password.change: 修改密码
-- - work_note.create/read/update/delete: 工作笔记管理
-- - timer.start/stop/view: 计时器功能
-- - stats.view.own: 个人统计查看
--
-- 设计理念：
-- - 简化用户体验 - 新用户无需配置即可使用基本功能
-- - 数据隔离 - 虽然开放功能权限，但严格限制只能访问自己的数据
-- - 向后兼容 - 不影响现有的权限系统和角色配置
-- ============================================================================
