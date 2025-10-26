-- ==========================================
-- 三棵文件夹树升级 - 回滚脚本
-- Rollback: 20251026_01_work_note_three_trees_rollback.sql
-- Description: 回滚三棵文件夹树升级，恢复到升级前的状态
-- Author: AI Development Team
-- Date: 2025-10-26
-- ==========================================

BEGIN;

RAISE NOTICE '🔙 开始回滚三棵文件夹树迁移...';

-- ==========================================
-- 步骤1: 删除视图
-- ==========================================
DROP VIEW IF EXISTS v_work_note_folders_private CASCADE;
DROP VIEW IF EXISTS v_work_note_folders_team CASCADE;
DROP VIEW IF EXISTS v_work_note_folders_public CASCADE;

RAISE NOTICE '✅ 删除视图完成';

-- ==========================================
-- 步骤2: 删除辅助函数
-- ==========================================
DROP FUNCTION IF EXISTS get_folder_tree_type(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS can_move_folder(INTEGER, INTEGER) CASCADE;

RAISE NOTICE '✅ 删除辅助函数完成';

-- ==========================================
-- 步骤3: 删除约束
-- ==========================================
ALTER TABLE work_note_folders
DROP CONSTRAINT IF EXISTS visibility_inheritance_check;

RAISE NOTICE '✅ 删除约束完成';

-- ==========================================
-- 步骤4: 删除索引
-- ==========================================
DROP INDEX IF EXISTS idx_work_note_folders_tree_root;
DROP INDEX IF EXISTS idx_work_note_folders_visibility_parent;
DROP INDEX IF EXISTS idx_work_note_folders_private_tree;
DROP INDEX IF EXISTS idx_work_note_folders_team_tree;
DROP INDEX IF EXISTS idx_work_note_folders_public_tree;

RAISE NOTICE '✅ 删除索引完成';

-- ==========================================
-- 步骤5: 删除tree_root字段
-- ==========================================
ALTER TABLE work_note_folders
DROP COLUMN IF EXISTS tree_root;

RAISE NOTICE '✅ 删除tree_root字段完成';

-- ==========================================
-- 步骤6: 可选 - 从备份恢复数据
-- ==========================================
-- 如果在迁移时创建了备份表，可以从备份恢复
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'work_note_folders_backup'
    ) THEN
        RAISE NOTICE '⚠️  发现备份表 work_note_folders_backup';
        RAISE NOTICE '如需从备份恢复，请手动执行：';
        RAISE NOTICE '  TRUNCATE work_note_folders CASCADE;';
        RAISE NOTICE '  INSERT INTO work_note_folders SELECT * FROM work_note_folders_backup;';
        RAISE NOTICE '  DROP TABLE work_note_folders_backup;';
    ELSE
        RAISE NOTICE 'ℹ️  未找到备份表';
    END IF;
END $$;

-- ==========================================
-- 步骤7: 验证回滚结果
-- ==========================================
DO $$
DECLARE
    tree_root_exists BOOLEAN;
    constraint_exists BOOLEAN;
BEGIN
    -- 检查tree_root字段是否已删除
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'work_note_folders'
        AND column_name = 'tree_root'
    ) INTO tree_root_exists;

    -- 检查约束是否已删除
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'visibility_inheritance_check'
    ) INTO constraint_exists;

    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 回滚验证：';

    IF NOT tree_root_exists THEN
        RAISE NOTICE '  ✅ tree_root字段已删除';
    ELSE
        RAISE WARNING '  ❌ tree_root字段仍然存在！';
    END IF;

    IF NOT constraint_exists THEN
        RAISE NOTICE '  ✅ visibility约束已删除';
    ELSE
        RAISE WARNING '  ❌ visibility约束仍然存在！';
    END IF;

    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ==========================================
-- 回滚完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '🎉 三棵文件夹树回滚完成！';
    RAISE NOTICE '';
    RAISE NOTICE '已回滚的操作：';
    RAISE NOTICE '  ✅ 删除tree_root字段';
    RAISE NOTICE '  ✅ 删除visibility继承约束';
    RAISE NOTICE '  ✅ 删除性能优化索引';
    RAISE NOTICE '  ✅ 删除辅助函数';
    RAISE NOTICE '  ✅ 删除三棵树的视图';
    RAISE NOTICE '';
    RAISE NOTICE '数据库已恢复到迁移前的状态';
    RAISE NOTICE '';
    RAISE NOTICE '注意事项：';
    RAISE NOTICE '  - 用户创建的文件夹和笔记数据未受影响';
    RAISE NOTICE '  - 如需完全恢复，请检查是否需要从备份恢复数据';
    RAISE NOTICE '  - 请同步回滚后端代码和前端UI的三棵树功能';
END $$;
