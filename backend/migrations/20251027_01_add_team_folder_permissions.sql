-- ==========================================
-- 团队笔记权限控制系统
-- Migration: 20251027_01_add_team_folder_permissions.sql
-- Description: 实现团队笔记的分层权限控制：文件夹管理权限（企业管理员）vs 笔记发布权限（全员）
-- Author: AI Development Team
-- Date: 2025-10-27
-- ==========================================

BEGIN;

-- ==========================================
-- 步骤0: 添加 enterprise_users.user_id 列（如果不存在）
-- ==========================================
DO $$
BEGIN
    -- 检查 user_id 列是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'enterprise_users'
        AND column_name = 'user_id'
    ) THEN
        -- 添加 user_id 列
        ALTER TABLE enterprise_users ADD COLUMN user_id INTEGER;

        -- 添加外键约束
        ALTER TABLE enterprise_users
        ADD CONSTRAINT fk_enterprise_users_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

        -- 创建索引
        CREATE INDEX idx_enterprise_users_user_id ON enterprise_users(user_id);

        RAISE NOTICE '✅ 添加 enterprise_users.user_id 列成功';
    ELSE
        RAISE NOTICE '⚠️  enterprise_users.user_id 列已存在，跳过';
    END IF;
END $$;

-- ==========================================
-- 步骤1: 添加新权限定义
-- ==========================================
DO $$
DECLARE
    v_work_note_folder_create_permission_id INTEGER;
    v_work_note_folder_update_permission_id INTEGER;
    v_work_note_folder_delete_permission_id INTEGER;
    v_team_work_note_create_permission_id INTEGER;
BEGIN
    -- 团队文件夹管理权限（仅企业管理员）
    INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action)
    VALUES
        ('team_work_note_folder_create', '创建团队笔记文件夹', '允许在团队树中创建文件夹（仅企业管理员）', 'work_notes', 'team_folder', 'create'),
        ('team_work_note_folder_update', '编辑团队笔记文件夹', '允许编辑团队树中的文件夹（仅企业管理员）', 'work_notes', 'team_folder', 'update'),
        ('team_work_note_folder_delete', '删除团队笔记文件夹', '允许删除团队树中的文件夹（仅企业管理员）', 'work_notes', 'team_folder', 'delete')
    ON CONFLICT (permission_code) DO NOTHING;

    -- 团队笔记发布权限（全体企业成员）
    INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action)
    VALUES
        ('team_work_note_create', '发布团队笔记', '允许在团队树中创建和发布笔记（全体企业成员）', 'work_notes', 'team_note', 'create'),
        ('team_work_note_update', '编辑团队笔记', '允许编辑自己的团队笔记', 'work_notes', 'team_note', 'update'),
        ('team_work_note_delete', '删除团队笔记', '允许删除自己的团队笔记', 'work_notes', 'team_note', 'delete')
    ON CONFLICT (permission_code) DO NOTHING;

    RAISE NOTICE '✅ 添加6个团队笔记权限定义成功';
END $$;

-- ==========================================
-- 步骤2: 创建企业管理员判断函数
-- ==========================================
CREATE OR REPLACE FUNCTION is_enterprise_admin(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Super admin (user_id = 1) 始终是管理员
    IF p_user_id = 1 THEN
        RETURN TRUE;
    END IF;

    -- 检查用户是否是企业管理员 (access_level >= 4 OR can_make_decisions = true)
    SELECT COALESCE(
        (eu.access_level >= 4 OR eu.can_make_decisions = TRUE),
        FALSE
    ) INTO v_is_admin
    FROM enterprise_users eu
    WHERE eu.user_id = p_user_id
      AND eu.status = 'active'
      AND eu.deleted_at IS NULL
    LIMIT 1;

    RETURN v_is_admin;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_enterprise_admin(INTEGER) IS
'判断用户是否是企业管理员（access_level >= 4 或 can_make_decisions = true）';

-- ==========================================
-- 步骤3: 创建团队文件夹管理权限检查函数
-- ==========================================
CREATE OR REPLACE FUNCTION can_manage_team_folder(
    p_user_id INTEGER,
    p_folder_id INTEGER DEFAULT NULL,
    p_operation VARCHAR(20) DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_folder_visibility VARCHAR(20);
    v_folder_owner_id INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    -- 对于非团队树的文件夹，使用原有逻辑
    IF p_folder_id IS NOT NULL THEN
        SELECT visibility, owner_id INTO v_folder_visibility, v_folder_owner_id
        FROM work_note_folders
        WHERE id = p_folder_id AND deleted_at IS NULL;

        -- 如果是private树，只有owner可以操作
        IF v_folder_visibility = 'private' THEN
            RETURN v_folder_owner_id = p_user_id;
        END IF;

        -- 如果是public树，只有super admin可以操作
        IF v_folder_visibility = 'public' THEN
            RETURN p_user_id = 1;
        END IF;
    END IF;

    -- 对于团队树的写操作（create/update/delete），需要管理员权限
    IF p_operation IN ('create', 'update', 'delete') THEN
        RETURN is_enterprise_admin(p_user_id);
    END IF;

    -- 对于团队树的读操作，所有企业成员都可以
    IF p_operation = 'read' THEN
        -- 检查是否是活跃的企业成员
        RETURN EXISTS (
            SELECT 1 FROM enterprise_users
            WHERE user_id = p_user_id
              AND status = 'active'
              AND deleted_at IS NULL
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_manage_team_folder(INTEGER, INTEGER, VARCHAR) IS
'检查用户是否有权限管理团队文件夹：
- private树：仅owner
- team树：管理员可CRUD，全员可读
- public树：仅super admin';

-- ==========================================
-- 步骤4: 创建团队笔记发布权限检查函数
-- ==========================================
CREATE OR REPLACE FUNCTION can_create_team_note(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admin 始终可以
    IF p_user_id = 1 THEN
        RETURN TRUE;
    END IF;

    -- 检查是否是活跃的企业成员
    RETURN EXISTS (
        SELECT 1 FROM enterprise_users
        WHERE user_id = p_user_id
          AND status = 'active'
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_create_team_note(INTEGER) IS
'检查用户是否可以发布团队笔记（所有活跃企业成员）';

-- ==========================================
-- 步骤5: 创建综合权限检查视图
-- ==========================================
CREATE OR REPLACE VIEW v_user_work_note_permissions AS
SELECT
    u.id AS user_id,
    u.username,
    eu.enterprise_id,
    eu.access_level,
    eu.can_make_decisions,
    is_enterprise_admin(u.id) AS is_admin,
    can_create_team_note(u.id) AS can_publish_team_notes,
    CASE
        WHEN is_enterprise_admin(u.id) THEN 'admin'
        WHEN can_create_team_note(u.id) THEN 'member'
        ELSE 'guest'
    END AS team_note_role
FROM users u
LEFT JOIN enterprise_users eu ON u.id = eu.user_id AND eu.deleted_at IS NULL
WHERE u.deleted_at IS NULL;

COMMENT ON VIEW v_user_work_note_permissions IS
'用户工作笔记权限概览视图，显示每个用户的团队笔记权限级别';

-- ==========================================
-- 步骤6: 更新文件夹查询索引（优化权限检查性能）
-- ==========================================

-- Enterprise users 索引（加速管理员检查）
CREATE INDEX IF NOT EXISTS idx_enterprise_users_admin_check
ON enterprise_users(user_id, access_level, can_make_decisions)
WHERE status = 'active' AND deleted_at IS NULL;

-- Enterprise users 活跃成员索引（加速成员检查）
CREATE INDEX IF NOT EXISTS idx_enterprise_users_active_members
ON enterprise_users(user_id, enterprise_id)
WHERE status = 'active' AND deleted_at IS NULL;

DO $$
BEGIN
    RAISE NOTICE '✅ 创建权限检查性能优化索引完成';
END $$;

-- ==========================================
-- 步骤7: 数据验证和统计
-- ==========================================
DO $$
DECLARE
    v_total_users INTEGER;
    v_admin_count INTEGER;
    v_member_count INTEGER;
    v_team_folders_count INTEGER;
    v_permissions_count INTEGER;
BEGIN
    -- 统计用户数
    SELECT COUNT(DISTINCT user_id) INTO v_total_users
    FROM enterprise_users WHERE deleted_at IS NULL;

    -- 统计管理员数
    SELECT COUNT(DISTINCT user_id) INTO v_admin_count
    FROM enterprise_users
    WHERE (access_level >= 4 OR can_make_decisions = TRUE)
      AND status = 'active'
      AND deleted_at IS NULL;

    -- 统计普通成员数
    SELECT COUNT(DISTINCT user_id) INTO v_member_count
    FROM enterprise_users
    WHERE status = 'active'
      AND deleted_at IS NULL;

    -- 统计团队文件夹数
    SELECT COUNT(*) INTO v_team_folders_count
    FROM work_note_folders
    WHERE visibility = 'team'
      AND deleted_at IS NULL;

    -- 统计新增的权限数
    SELECT COUNT(*) INTO v_permissions_count
    FROM permissions
    WHERE permission_code LIKE 'team_work_note%';

    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 团队笔记权限系统统计：';
    RAISE NOTICE '  👥 企业用户总数: %', v_total_users;
    RAISE NOTICE '  🔑 企业管理员数: % (可管理团队文件夹)', v_admin_count;
    RAISE NOTICE '  ✍️  活跃成员数: % (可发布团队笔记)', v_member_count;
    RAISE NOTICE '  📁 团队文件夹数: %', v_team_folders_count;
    RAISE NOTICE '  🔐 新增权限定义: %', v_permissions_count;
    RAISE NOTICE '========================================';
END $$;

-- ==========================================
-- 步骤8: 测试权限函数
-- ==========================================
DO $$
DECLARE
    v_test_user_id INTEGER := 1; -- Super admin
    v_test_result BOOLEAN;
BEGIN
    -- 测试 is_enterprise_admin
    SELECT is_enterprise_admin(v_test_user_id) INTO v_test_result;
    RAISE NOTICE '测试 is_enterprise_admin(1): % (预期: true)', v_test_result;

    -- 测试 can_create_team_note
    SELECT can_create_team_note(v_test_user_id) INTO v_test_result;
    RAISE NOTICE '测试 can_create_team_note(1): % (预期: true)', v_test_result;

    -- 测试 can_manage_team_folder
    SELECT can_manage_team_folder(v_test_user_id, NULL, 'create') INTO v_test_result;
    RAISE NOTICE '测试 can_manage_team_folder(1, NULL, ''create''): % (预期: true)', v_test_result;

    RAISE NOTICE '✅ 权限函数测试完成';
END $$;

COMMIT;

-- ==========================================
-- 迁移完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 团队笔记权限控制系统迁移完成！';
    RAISE NOTICE '';
    RAISE NOTICE '已完成的操作：';
    RAISE NOTICE '  ✅ 添加6个权限定义（文件夹CRUD + 笔记发布）';
    RAISE NOTICE '  ✅ 创建 is_enterprise_admin() 函数';
    RAISE NOTICE '  ✅ 创建 can_manage_team_folder() 函数';
    RAISE NOTICE '  ✅ 创建 can_create_team_note() 函数';
    RAISE NOTICE '  ✅ 创建权限概览视图';
    RAISE NOTICE '  ✅ 创建性能优化索引 (2个)';
    RAISE NOTICE '  ✅ 数据验证和测试';
    RAISE NOTICE '';
    RAISE NOTICE '权限规则：';
    RAISE NOTICE '  📁 Private树: 仅owner可操作';
    RAISE NOTICE '  📁 Team树 - 文件夹: 仅企业管理员可CRUD';
    RAISE NOTICE '  📝 Team树 - 笔记: 全体企业成员可发布';
    RAISE NOTICE '  📁 Public树: 仅super admin可操作';
    RAISE NOTICE '';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '  1. 修改后端Handler使用新的权限检查函数';
    RAISE NOTICE '  2. 更新前端UI显示权限相关按钮';
    RAISE NOTICE '  3. 编写单元测试和集成测试';
    RAISE NOTICE '  4. 更新API文档';
END $$;
