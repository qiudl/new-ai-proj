-- ==========================================
-- 三棵文件夹树升级 - 完整版本
-- Migration: 20251026_03_work_note_three_trees_complete.sql
-- Description: 完整实现三棵树系统，包含所有必要的字段、索引、函数和触发器
-- Author: AI Development Team
-- Date: 2025-10-26
-- ==========================================

BEGIN;

-- ==========================================
-- 步骤1: 添加tree_root字段
-- ==========================================
DO $$
BEGIN
    -- 检查列是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'work_note_folders'
        AND column_name = 'tree_root'
    ) THEN
        ALTER TABLE work_note_folders
        ADD COLUMN tree_root VARCHAR(20);

        RAISE NOTICE '✅ 添加tree_root字段成功';
    ELSE
        RAISE NOTICE '⚠️  tree_root字段已存在，跳过添加';
    END IF;
END $$;

-- ==========================================
-- 步骤2: 填充tree_root字段（基于visibility）
-- ==========================================
DO $$
BEGIN
    UPDATE work_note_folders
    SET tree_root = visibility
    WHERE deleted_at IS NULL
      AND tree_root IS NULL;

    RAISE NOTICE '✅ 填充tree_root字段完成';
END $$;

-- ==========================================
-- 步骤3: 数据一致性验证和修复
-- ==========================================
DO $$
DECLARE
    inconsistent_count INTEGER;
    fixed_count INTEGER := 0;
BEGIN
    -- 检查是否有子文件夹的visibility与父文件夹不一致
    SELECT COUNT(*) INTO inconsistent_count
    FROM work_note_folders child
    JOIN work_note_folders parent ON child.parent_id = parent.id
    WHERE child.deleted_at IS NULL
      AND parent.deleted_at IS NULL
      AND child.visibility != parent.visibility;

    IF inconsistent_count > 0 THEN
        RAISE NOTICE '⚠️  发现 % 个文件夹的visibility与父文件夹不一致', inconsistent_count;

        -- 修复不一致的数据：子文件夹继承父文件夹的visibility
        WITH RECURSIVE folder_hierarchy AS (
            -- 根节点（没有父节点的文件夹）
            SELECT
                id,
                visibility,
                parent_id,
                visibility AS correct_visibility
            FROM work_note_folders
            WHERE deleted_at IS NULL AND parent_id IS NULL

            UNION ALL

            -- 递归查找子节点
            SELECT
                child.id,
                child.visibility,
                child.parent_id,
                parent.correct_visibility
            FROM work_note_folders child
            JOIN folder_hierarchy parent ON child.parent_id = parent.id
            WHERE child.deleted_at IS NULL
        )
        UPDATE work_note_folders
        SET
            visibility = fh.correct_visibility,
            tree_root = fh.correct_visibility,
            updated_at = NOW()
        FROM folder_hierarchy fh
        WHERE work_note_folders.id = fh.id
          AND work_note_folders.visibility != fh.correct_visibility;

        GET DIAGNOSTICS fixed_count = ROW_COUNT;
        RAISE NOTICE '✅ 修复了 % 个不一致的文件夹', fixed_count;
    ELSE
        RAISE NOTICE '✅ 数据一致性检查通过，无需修复';
    END IF;
END $$;

-- ==========================================
-- 步骤4: 创建索引（优化查询性能）
-- ==========================================

-- tree_root索引（用于快速查询指定树）
CREATE INDEX IF NOT EXISTS idx_work_note_folders_tree_root
ON work_note_folders(tree_root)
WHERE deleted_at IS NULL;

-- visibility + parent_id 组合索引（用于查询指定树的根节点）
CREATE INDEX IF NOT EXISTS idx_work_note_folders_visibility_parent
ON work_note_folders(visibility, parent_id)
WHERE deleted_at IS NULL;

-- Private树专用索引（最常用）
CREATE INDEX IF NOT EXISTS idx_work_note_folders_private_tree
ON work_note_folders(owner_id, parent_id, sort_order)
WHERE visibility = 'private' AND deleted_at IS NULL;

-- Team树专用索引
CREATE INDEX IF NOT EXISTS idx_work_note_folders_team_tree
ON work_note_folders(project_id, parent_id, sort_order)
WHERE visibility = 'team' AND deleted_at IS NULL;

-- Public树专用索引
CREATE INDEX IF NOT EXISTS idx_work_note_folders_public_tree
ON work_note_folders(parent_id, sort_order)
WHERE visibility = 'public' AND deleted_at IS NULL;

DO $$
BEGIN
    RAISE NOTICE '✅ 创建性能优化索引完成';
END $$;

-- ==========================================
-- 步骤5: 创建触发器函数检查visibility继承
-- ==========================================
CREATE OR REPLACE FUNCTION check_visibility_inheritance()
RETURNS TRIGGER AS $$
DECLARE
    parent_visibility VARCHAR(20);
BEGIN
    -- 如果是根节点（没有父节点），允许
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- 获取父节点的visibility
    SELECT visibility INTO parent_visibility
    FROM work_note_folders
    WHERE id = NEW.parent_id
      AND deleted_at IS NULL;

    -- 如果父节点不存在，拒绝操作
    IF parent_visibility IS NULL THEN
        RAISE EXCEPTION 'Parent folder (ID: %) does not exist or is deleted', NEW.parent_id;
    END IF;

    -- 如果子节点的visibility与父节点不同，拒绝操作
    IF NEW.visibility != parent_visibility THEN
        RAISE EXCEPTION 'Child folder visibility (%) must match parent folder visibility (%)',
            NEW.visibility, parent_visibility;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_visibility_inheritance() IS '触发器函数：检查文件夹visibility继承约束';

-- ==========================================
-- 步骤6: 创建触发器
-- ==========================================
DO $$
BEGIN
    -- 删除旧触发器（如果存在）
    DROP TRIGGER IF EXISTS trg_check_visibility_inheritance ON work_note_folders;

    -- 创建新触发器
    CREATE TRIGGER trg_check_visibility_inheritance
    BEFORE INSERT OR UPDATE OF parent_id, visibility
    ON work_note_folders
    FOR EACH ROW
    EXECUTE FUNCTION check_visibility_inheritance();

    RAISE NOTICE '✅ 创建visibility继承检查触发器成功';
END $$;

-- ==========================================
-- 步骤7: 创建辅助函数
-- ==========================================

-- 获取文件夹所属的树类型
CREATE OR REPLACE FUNCTION get_folder_tree_type(folder_id INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_visibility VARCHAR(20);
BEGIN
    SELECT visibility INTO v_visibility
    FROM work_note_folders
    WHERE id = folder_id AND deleted_at IS NULL;

    RETURN v_visibility;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_folder_tree_type(INTEGER) IS '获取文件夹所属的树类型（private/team/public）';

-- 检查文件夹是否可以移动到目标父文件夹
CREATE OR REPLACE FUNCTION can_move_folder(source_folder_id INTEGER, target_parent_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    source_visibility VARCHAR(20);
    target_visibility VARCHAR(20);
BEGIN
    -- 如果目标父文件夹为NULL（移动到根节点），允许
    IF target_parent_id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- 获取源文件夹和目标父文件夹的visibility
    SELECT visibility INTO source_visibility
    FROM work_note_folders
    WHERE id = source_folder_id AND deleted_at IS NULL;

    SELECT visibility INTO target_visibility
    FROM work_note_folders
    WHERE id = target_parent_id AND deleted_at IS NULL;

    -- 只有当两者的visibility相同时才允许移动
    RETURN source_visibility = target_visibility;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_move_folder(INTEGER, INTEGER) IS '检查文件夹是否可以移动到目标位置（不允许跨树移动）';

-- ==========================================
-- 步骤8: 创建视图（方便查询）
-- ==========================================

-- Private树视图
CREATE OR REPLACE VIEW v_work_note_folders_private AS
SELECT
    id, name, description, parent_id, owner_id, project_id,
    visibility, color, icon, sort_order, created_by,
    created_at, updated_at, tree_root
FROM work_note_folders
WHERE visibility = 'private' AND deleted_at IS NULL;

COMMENT ON VIEW v_work_note_folders_private IS '私人笔记文件夹视图';

-- Team树视图
CREATE OR REPLACE VIEW v_work_note_folders_team AS
SELECT
    id, name, description, parent_id, owner_id, project_id,
    visibility, color, icon, sort_order, created_by,
    created_at, updated_at, tree_root
FROM work_note_folders
WHERE visibility = 'team' AND deleted_at IS NULL;

COMMENT ON VIEW v_work_note_folders_team IS '团队笔记文件夹视图';

-- Public树视图
CREATE OR REPLACE VIEW v_work_note_folders_public AS
SELECT
    id, name, description, parent_id, owner_id, project_id,
    visibility, color, icon, sort_order, created_by,
    created_at, updated_at, tree_root
FROM work_note_folders
WHERE visibility = 'public' AND deleted_at IS NULL;

COMMENT ON VIEW v_work_note_folders_public IS '公开笔记文件夹视图';

DO $$
BEGIN
    RAISE NOTICE '✅ 创建视图完成';
END $$;

-- ==========================================
-- 步骤9: 更新表注释
-- ==========================================
COMMENT ON COLUMN work_note_folders.tree_root IS '文件夹所属的树根类型（private/team/public），用于快速查询';
COMMENT ON COLUMN work_note_folders.visibility IS '可见性和树类型：private(私人树), team(团队树), public(公开树)';

-- ==========================================
-- 步骤10: 数据验证
-- ==========================================
DO $$
DECLARE
    total_folders INTEGER;
    private_count INTEGER;
    team_count INTEGER;
    public_count INTEGER;
    orphan_count INTEGER;
    tree_root_null_count INTEGER;
BEGIN
    -- 统计各树的文件夹数量
    SELECT COUNT(*) INTO total_folders FROM work_note_folders WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO private_count FROM work_note_folders WHERE deleted_at IS NULL AND visibility = 'private';
    SELECT COUNT(*) INTO team_count FROM work_note_folders WHERE deleted_at IS NULL AND visibility = 'team';
    SELECT COUNT(*) INTO public_count FROM work_note_folders WHERE deleted_at IS NULL AND visibility = 'public';

    -- 检查tree_root为NULL的记录
    SELECT COUNT(*) INTO tree_root_null_count FROM work_note_folders WHERE deleted_at IS NULL AND tree_root IS NULL;

    -- 检查孤儿节点（parent_id指向不存在或已删除的父节点）
    SELECT COUNT(*) INTO orphan_count
    FROM work_note_folders child
    WHERE child.deleted_at IS NULL
      AND child.parent_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM work_note_folders parent
          WHERE parent.id = child.parent_id
          AND parent.deleted_at IS NULL
      );

    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 迁移数据统计：';
    RAISE NOTICE '  总文件夹数: %', total_folders;
    RAISE NOTICE '  🔒 Private树: %', private_count;
    RAISE NOTICE '  👥 Team树: %', team_count;
    RAISE NOTICE '  🌐 Public树: %', public_count;

    IF tree_root_null_count > 0 THEN
        RAISE WARNING '  ⚠️  tree_root未填充: %', tree_root_null_count;
    ELSE
        RAISE NOTICE '  ✅ tree_root全部已填充';
    END IF;

    IF orphan_count > 0 THEN
        RAISE WARNING '  ⚠️  发现 % 个孤儿节点（父节点不存在）', orphan_count;
    ELSE
        RAISE NOTICE '  ✅ 无孤儿节点';
    END IF;

    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ==========================================
-- 迁移完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '🎉 三棵文件夹树迁移完成！';
    RAISE NOTICE '';
    RAISE NOTICE '已完成的操作：';
    RAISE NOTICE '  ✅ 添加tree_root字段';
    RAISE NOTICE '  ✅ 数据一致性验证和修复';
    RAISE NOTICE '  ✅ 创建性能优化索引 (5个)';
    RAISE NOTICE '  ✅ 创建visibility继承检查触发器';
    RAISE NOTICE '  ✅ 创建辅助函数 (2个)';
    RAISE NOTICE '  ✅ 创建三棵树的视图 (3个)';
    RAISE NOTICE '';
    RAISE NOTICE '触发器功能：';
    RAISE NOTICE '  - 自动检查子文件夹是否继承父文件夹的visibility';
    RAISE NOTICE '  - 禁止跨树移动文件夹';
    RAISE NOTICE '  - 禁止将文件夹移动到已删除的父文件夹';
    RAISE NOTICE '';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '  1. 验证API端点功能';
    RAISE NOTICE '  2. 部署后端服务';
    RAISE NOTICE '  3. 更新前端代码';
END $$;
