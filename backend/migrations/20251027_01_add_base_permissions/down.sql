-- ============================================================================
-- Migration Rollback: 20251027_01_add_base_permissions
-- Description: 回滚基础权限 - 删除所有基础权限相关的数据和表结构
-- Author: Claude Code AI
-- Created: 2025-10-27
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: 删除迁移记录
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations') THEN
        DELETE FROM migrations WHERE version = '20251027_01';
        RAISE NOTICE '✓ Migration record deleted';
    END IF;
END $$;

-- ============================================================================
-- Part 2: 删除权限分类关联
-- ============================================================================

-- 删除基础权限的分类映射
DELETE FROM permission_category_mappings
WHERE category_id IN (
    SELECT id FROM base_permission_categories
    WHERE category_code IN ('dashboard', 'profile', 'work_note', 'timer', 'statistics')
);

RAISE NOTICE '✓ Permission category mappings deleted';

-- ============================================================================
-- Part 3: 删除基础权限分类
-- ============================================================================

-- 删除基础权限分类
DELETE FROM base_permission_categories
WHERE category_code IN ('dashboard', 'profile', 'work_note', 'timer', 'statistics');

RAISE NOTICE '✓ Base permission categories deleted';

-- 删除分类关联表（如果为空）
DO $$
DECLARE
    mapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapping_count FROM permission_category_mappings;
    IF mapping_count = 0 THEN
        DROP TABLE IF EXISTS permission_category_mappings;
        RAISE NOTICE '✓ permission_category_mappings table dropped (was empty)';
    ELSE
        RAISE NOTICE 'ℹ permission_category_mappings table retained (contains % other mappings)', mapping_count;
    END IF;
END $$;

-- 删除分类表（如果为空）
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM base_permission_categories;
    IF category_count = 0 THEN
        DROP TABLE IF EXISTS base_permission_categories;
        RAISE NOTICE '✓ base_permission_categories table dropped (was empty)';
    ELSE
        RAISE NOTICE 'ℹ base_permission_categories table retained (contains % other categories)', category_count;
    END IF;
END $$;

-- ============================================================================
-- Part 4: 移除基础权限标识
-- ============================================================================

-- 移除基础权限标记
UPDATE permissions
SET is_base_permission = FALSE,
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

RAISE NOTICE '✓ Base permission flags removed';

-- ============================================================================
-- Part 5: 删除基础权限（可选）
-- ============================================================================

-- 注意：这里不删除权限记录本身，因为它们可能已经被角色使用
-- 如果确实需要删除，请手动执行以下语句（取消注释）：

/*
-- 删除角色-权限关联
DELETE FROM company_role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
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
    )
);

-- 删除权限记录
DELETE FROM permissions
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

RAISE NOTICE '✓ Base permissions deleted';
*/

RAISE WARNING 'Base permission records retained - they may be in use by roles';
RAISE WARNING 'To fully remove them, uncomment the delete statements in down.sql';

-- ============================================================================
-- Part 6: 删除索引（如果不再需要）
-- ============================================================================

-- 删除基础权限索引
DROP INDEX IF EXISTS idx_permissions_is_base_permission;
RAISE NOTICE '✓ Index idx_permissions_is_base_permission dropped';

-- 注意：不删除 idx_permissions_module_name，因为它可能被其他查询使用

-- ============================================================================
-- Part 7: 删除字段（可选）
-- ============================================================================

-- 注意：这里不删除 is_base_permission 字段，因为它可能对理解权限系统有帮助
-- 如果确实需要删除，请手动执行以下语句（取消注释）：

/*
ALTER TABLE permissions
DROP COLUMN IF EXISTS is_base_permission;

RAISE NOTICE '✓ Column is_base_permission dropped';
*/

RAISE WARNING 'Column is_base_permission retained for reference';
RAISE WARNING 'To remove it, uncomment the ALTER TABLE statement in down.sql';

COMMIT;

-- ============================================================================
-- Rollback Summary
-- ============================================================================
-- 本次回滚内容：
-- 1. 删除迁移记录
-- 2. 删除权限分类映射
-- 3. 删除基础权限分类表（如果为空）
-- 4. 移除基础权限标识
-- 5. 删除相关索引
--
-- 保留内容（需要手动删除）：
-- - permissions 表中的基础权限记录（可能被角色使用）
-- - is_base_permission 字段（用于向后兼容）
--
-- 完全清理步骤：
-- 1. 执行本 down.sql 脚本
-- 2. 检查 permissions 表，确认基础权限未被使用
-- 3. 取消注释相关 DELETE 和 ALTER 语句
-- 4. 重新执行本脚本
-- ============================================================================
