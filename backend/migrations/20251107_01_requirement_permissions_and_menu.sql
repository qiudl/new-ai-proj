-- 20251107_01_requirement_permissions_and_menu.sql
-- 添加需求管理系统的权限和导航菜单项
-- 作者: Claude Code
-- 日期: 2025-11-07
-- 预计执行时间: <1秒

BEGIN;

-- ====================
-- 1. 插入需求管理权限到system_permissions表 (系统域)
-- ====================
INSERT INTO system_permissions (code, name, description, resource, action, is_active, created_at)
VALUES
    -- 需求列表权限
    ('requirement.list.read', '查看需求列表', '查看需求列表权限', 'list', 'read', true, CURRENT_TIMESTAMP),

    -- 需求详情权限
    ('requirement.detail.read', '查看需求详情', '查看需求详情权限', 'detail', 'read', true, CURRENT_TIMESTAMP),

    -- 需求CRUD权限
    ('requirement.create', '创建需求', '创建新需求权限', 'requirement', 'create', true, CURRENT_TIMESTAMP),
    ('requirement.update', '编辑需求', '编辑需求信息权限', 'requirement', 'update', true, CURRENT_TIMESTAMP),
    ('requirement.delete', '删除需求', '删除需求权限', 'requirement', 'delete', true, CURRENT_TIMESTAMP),

    -- 需求状态管理权限
    ('requirement.status.update', '更新需求状态', '更新需求状态权限', 'status', 'update', true, CURRENT_TIMESTAMP),
    ('requirement.submit', '提交需求', '提交需求进行审批权限', 'requirement', 'submit', true, CURRENT_TIMESTAMP),
    ('requirement.approve', '审批需求', '审批需求权限', 'requirement', 'approve', true, CURRENT_TIMESTAMP),
    ('requirement.reject', '拒绝需求', '拒绝需求权限', 'requirement', 'reject', true, CURRENT_TIMESTAMP),

    -- 需求评论权限
    ('requirement.comment', '评论需求', '对需求进行评论权限', 'comment', 'create', true, CURRENT_TIMESTAMP),

    -- 需求转换权限
    ('requirement.convert_task', '转换为任务', '将需求转换为任务权限', 'requirement', 'convert', true, CURRENT_TIMESTAMP),

    -- 通用权限 (冒号格式)
    ('requirement:read', '读取需求', '读取需求通用权限', 'requirement', 'read', true, CURRENT_TIMESTAMP),
    ('requirement:write', '修改需求', '修改需求通用权限', 'requirement', 'write', true, CURRENT_TIMESTAMP),
    ('requirement:manage', '管理需求', '管理需求通用权限', 'requirement', 'manage', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- ====================
-- 1b. 插入需求管理权限到enterprise_permissions表 (企业域)
-- ====================
INSERT INTO enterprise_permissions (code, name, description, resource, action, is_active, created_at)
VALUES
    -- 需求列表权限
    ('requirement.list.read', '查看需求列表', '查看需求列表权限', 'list', 'read', true, CURRENT_TIMESTAMP),

    -- 需求详情权限
    ('requirement.detail.read', '查看需求详情', '查看需求详情权限', 'detail', 'read', true, CURRENT_TIMESTAMP),

    -- 需求CRUD权限
    ('requirement.create', '创建需求', '创建新需求权限', 'requirement', 'create', true, CURRENT_TIMESTAMP),
    ('requirement.update', '编辑需求', '编辑需求信息权限', 'requirement', 'update', true, CURRENT_TIMESTAMP),
    ('requirement.delete', '删除需求', '删除需求权限', 'requirement', 'delete', true, CURRENT_TIMESTAMP),

    -- 需求状态管理权限
    ('requirement.status.update', '更新需求状态', '更新需求状态权限', 'status', 'update', true, CURRENT_TIMESTAMP),
    ('requirement.submit', '提交需求', '提交需求进行审批权限', 'requirement', 'submit', true, CURRENT_TIMESTAMP),
    ('requirement.approve', '审批需求', '审批需求权限', 'requirement', 'approve', true, CURRENT_TIMESTAMP),
    ('requirement.reject', '拒绝需求', '拒绝需求权限', 'requirement', 'reject', true, CURRENT_TIMESTAMP),

    -- 需求评论权限
    ('requirement.comment', '评论需求', '对需求进行评论权限', 'comment', 'create', true, CURRENT_TIMESTAMP),

    -- 需求转换权限
    ('requirement.convert_task', '转换为任务', '将需求转换为任务权限', 'requirement', 'convert', true, CURRENT_TIMESTAMP),

    -- 通用权限 (冒号格式)
    ('requirement:read', '读取需求', '读取需求通用权限', 'requirement', 'read', true, CURRENT_TIMESTAMP),
    ('requirement:write', '修改需求', '修改需求通用权限', 'requirement', 'write', true, CURRENT_TIMESTAMP),
    ('requirement:manage', '管理需求', '管理需求通用权限', 'requirement', 'manage', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- ====================
-- 2. 插入需求管理导航菜单 (可选，如果system_menu_items表存在)
-- ====================

-- 获取下一个菜单排序号
DO $$
DECLARE
    next_sort_order INT;
    requirement_menu_id INT;
BEGIN
    -- 检查system_menu_items表是否存在
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_menu_items') THEN
        -- 获取当前最大排序号
        SELECT COALESCE(MAX(sort_order), 0) + 1 INTO next_sort_order
        FROM system_menu_items
        WHERE parent_id IS NULL;

        -- 插入需求管理菜单组
        INSERT INTO system_menu_items (
            title,
            path,
            icon,
            parent_id,
            sort_order,
            is_visible,
            description,
            created_at,
            updated_at
        ) VALUES (
            '需求管理',
            '/requirement-management',
            'FileTextOutlined',
            NULL,
            next_sort_order,
            true,
            '需求管理菜单组',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO requirement_menu_id;

        -- 插入需求列表子菜单
        INSERT INTO system_menu_items (
            title,
            path,
            icon,
            parent_id,
            sort_order,
            is_visible,
            description,
            created_at,
            updated_at
        ) VALUES
        (
            '需求列表',
            '/requirements',
            'UnorderedListOutlined',
            requirement_menu_id,
            1,
            true,
            '查看所有需求',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ),
        (
            '创建需求',
            '/requirements/new',
            'PlusOutlined',
            requirement_menu_id,
            2,
            true,
            '创建新需求',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );

        -- 记录操作
        RAISE NOTICE '✅ 需求管理菜单已创建 (ID: %)', requirement_menu_id;
    ELSE
        RAISE NOTICE 'ℹ️ system_menu_items表不存在，跳过菜单创建';
    END IF;
END $$;

-- ====================
-- 3. 为现有角色分配需求管理权限 (支持RBAC v2双域架构)
-- ====================

-- 为系统角色分配权限 (system_roles + system_role_permissions)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_roles') THEN
        -- 为系统管理员分配所有需求管理权限
        INSERT INTO system_role_permissions (role_id, permission_id, created_at)
        SELECT
            r.id as role_id,
            p.id as permission_id,
            CURRENT_TIMESTAMP
        FROM system_roles r
        CROSS JOIN system_permissions p
        WHERE r.code IN ('super_admin', 'admin')
          AND p.code LIKE 'requirement%'
        ON CONFLICT (role_id, permission_id) DO NOTHING;

        RAISE NOTICE '✅ 已为系统角色分配需求管理权限';
    END IF;
END $$;

-- 为企业角色分配权限 (enterprise_roles + enterprise_role_permissions)
DO $$
BEGIN
    -- 检查是否存在企业角色表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_roles') THEN
        -- 为企业管理员分配所有需求管理权限
        INSERT INTO enterprise_role_permissions (role_id, permission_id, created_at)
        SELECT
            r.id as role_id,
            p.id as permission_id,
            CURRENT_TIMESTAMP
        FROM enterprise_roles r
        CROSS JOIN enterprise_permissions p
        WHERE r.code = 'enterprise_admin'
          AND p.code LIKE 'requirement%'
        ON CONFLICT (role_id, permission_id) DO NOTHING;

        -- 为项目经理分配基本需求管理权限
        INSERT INTO enterprise_role_permissions (role_id, permission_id, created_at)
        SELECT
            r.id as role_id,
            p.id as permission_id,
            CURRENT_TIMESTAMP
        FROM enterprise_roles r
        CROSS JOIN enterprise_permissions p
        WHERE r.code = 'project_manager'
          AND p.code IN (
            'requirement.list.read',
            'requirement.detail.read',
            'requirement.create',
            'requirement.update',
            'requirement.comment',
            'requirement:read',
            'requirement:write'
          )
        ON CONFLICT (role_id, permission_id) DO NOTHING;

        -- 为普通成员分配查看权限
        INSERT INTO enterprise_role_permissions (role_id, permission_id, created_at)
        SELECT
            r.id as role_id,
            p.id as permission_id,
            CURRENT_TIMESTAMP
        FROM enterprise_roles r
        CROSS JOIN enterprise_permissions p
        WHERE r.code = 'member'
          AND p.code IN (
            'requirement.list.read',
            'requirement.detail.read',
            'requirement.comment',
            'requirement:read'
          )
        ON CONFLICT (role_id, permission_id) DO NOTHING;

        RAISE NOTICE '✅ 已为企业角色分配需求管理权限';
    END IF;
END $$;

COMMIT;

-- 验证查询
SELECT '✅ 系统域需求管理权限已创建:' as message, COUNT(*) as count
FROM system_permissions
WHERE code LIKE 'requirement%';

SELECT '✅ 企业域需求管理权限已创建:' as message, COUNT(*) as count
FROM enterprise_permissions
WHERE code LIKE 'requirement%';

-- 可选验证:菜单项 (如果表存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_menu_items') THEN
        PERFORM pg_notify('migration_info', '✅ 需求管理菜单已创建: ' || COUNT(*)::text)
        FROM system_menu_items
        WHERE path LIKE '/requirement%';
    ELSE
        RAISE NOTICE 'ℹ️ system_menu_items表不存在，跳过菜单验证';
    END IF;
END $$;
