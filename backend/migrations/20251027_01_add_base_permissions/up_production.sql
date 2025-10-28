-- ============================================================================
-- Migration: 20251027_01_add_base_permissions (Production Version)
-- Description: 添加基础权限 - 所有认证用户默认拥有的核心功能权限
-- Author: Claude Code AI
-- Created: 2025-10-27
-- Task: #2862 - 实现任何用户拥有的基本权限
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: 添加基础权限到 permissions 表
-- ============================================================================

-- Dashboard 权限
INSERT INTO permissions (
    permission_code,
    permission_name,
    permission_description,
    module,
    resource,
    action,
    is_active,
    created_at
) VALUES
(
    'dashboard.read',
    '查看Dashboard',
    '查看Dashboard首页，包括任务概览、统计图表等核心功能访问',
    'dashboard',
    'dashboard',
    'read',
    TRUE,
    NOW()
)
ON CONFLICT (permission_code) DO NOTHING;

-- Profile 权限（个人中心）
INSERT INTO permissions (
    permission_code,
    permission_name,
    permission_description,
    module,
    resource,
    action,
    is_active,
    created_at
) VALUES
(
    'profile.read',
    '查看个人资料',
    '查看自己的个人资料信息',
    'profile',
    'profile',
    'read',
    TRUE,
    NOW()
),
(
    'profile.update',
    '更新个人资料',
    '修改自己的个人资料信息（姓名、头像、联系方式等）',
    'profile',
    'profile',
    'update',
    TRUE,
    NOW()
),
(
    'password.change',
    '修改密码',
    '修改自己的登录密码',
    'profile',
    'password',
    'change',
    TRUE,
    NOW()
)
ON CONFLICT (permission_code) DO NOTHING;

-- Work Note 权限（工作笔记）
INSERT INTO permissions (
    permission_code,
    permission_name,
    permission_description,
    module,
    resource,
    action,
    is_active,
    created_at
) VALUES
(
    'work_note.create',
    '创建工作笔记',
    '创建新的工作笔记',
    'work_note',
    'work_note',
    'create',
    TRUE,
    NOW()
),
(
    'work_note.read',
    '查看工作笔记',
    '查看自己的工作笔记',
    'work_note',
    'work_note',
    'read',
    TRUE,
    NOW()
),
(
    'work_note.update',
    '更新工作笔记',
    '修改自己的工作笔记',
    'work_note',
    'work_note',
    'update',
    TRUE,
    NOW()
),
(
    'work_note.delete',
    '删除工作笔记',
    '删除自己的工作笔记',
    'work_note',
    'work_note',
    'delete',
    TRUE,
    NOW()
)
ON CONFLICT (permission_code) DO NOTHING;

-- Timer 权限（计时器）
INSERT INTO permissions (
    permission_code,
    permission_name,
    permission_description,
    module,
    resource,
    action,
    is_active,
    created_at
) VALUES
(
    'timer.start',
    '启动计时器',
    '启动任务计时器',
    'timer',
    'timer',
    'start',
    TRUE,
    NOW()
),
(
    'timer.stop',
    '停止计时器',
    '停止正在运行的计时器',
    'timer',
    'timer',
    'stop',
    TRUE,
    NOW()
),
(
    'timer.view',
    '查看计时记录',
    '查看自己的计时历史记录',
    'timer',
    'timer',
    'view',
    TRUE,
    NOW()
)
ON CONFLICT (permission_code) DO NOTHING;

-- Statistics 权限（统计）
INSERT INTO permissions (
    permission_code,
    permission_name,
    permission_description,
    module,
    resource,
    action,
    is_active,
    created_at
) VALUES
(
    'stats.view.own',
    '查看个人统计',
    '查看自己的工作统计数据',
    'statistics',
    'stats',
    'view_own',
    TRUE,
    NOW()
)
ON CONFLICT (permission_code) DO NOTHING;

-- ============================================================================
-- Part 2: 验证插入结果
-- ============================================================================

-- 验证基础权限是否成功插入
DO $$
DECLARE
    base_permission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO base_permission_count
    FROM permissions
    WHERE permission_code IN (
        'dashboard.read',
        'profile.read', 'profile.update', 'password.change',
        'work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete',
        'timer.start', 'timer.stop', 'timer.view',
        'stats.view.own'
    );

    IF base_permission_count <> 12 THEN
        RAISE EXCEPTION '基础权限插入失败: 预期12个, 实际%个', base_permission_count;
    END IF;

    RAISE NOTICE '✅ 成功插入12个基础权限';
END $$;

-- 显示插入的基础权限
SELECT
    permission_code,
    permission_name,
    module,
    is_active,
    created_at
FROM permissions
WHERE permission_code IN (
    'dashboard.read',
    'profile.read', 'profile.update', 'password.change',
    'work_note.create', 'work_note.read', 'work_note.update', 'work_note.delete',
    'timer.start', 'timer.stop', 'timer.view',
    'stats.view.own'
)
ORDER BY module, permission_code;

COMMIT;

-- ============================================================================
-- Migration完成提示
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '基础权限迁移完成！';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ 已添加12个基础权限';
    RAISE NOTICE '✅ 所有认证用户将自动拥有这些权限';
    RAISE NOTICE '';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '1. 重启后端服务以加载新权限配置';
    RAISE NOTICE '2. 测试基础权限是否生效';
    RAISE NOTICE '3. 验证数据隔离是否正常';
    RAISE NOTICE '============================================================================';
END $$;
