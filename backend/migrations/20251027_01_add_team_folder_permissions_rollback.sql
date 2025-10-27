-- ==========================================
-- 团队笔记权限控制系统回滚脚本
-- Migration Rollback: 20251027_01_add_team_folder_permissions_rollback.sql
-- Description: 回滚团队笔记权限控制相关的数据库变更
-- Author: AI Development Team
-- Date: 2025-10-27
-- ==========================================

BEGIN;

-- ==========================================
-- 步骤1: 删除权限概览视图
-- ==========================================
DROP VIEW IF EXISTS v_user_work_note_permissions CASCADE;

-- ==========================================
-- 步骤2: 删除权限检查函数
-- ==========================================
DROP FUNCTION IF EXISTS is_enterprise_admin(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS can_manage_team_folder(INTEGER, INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS can_create_team_note(INTEGER) CASCADE;

-- ==========================================
-- 步骤3: 删除性能优化索引
-- ==========================================
DROP INDEX IF EXISTS idx_enterprise_users_admin_check;
DROP INDEX IF EXISTS idx_enterprise_users_active_members;

-- ==========================================
-- 步骤4: 删除权限定义
-- ==========================================
DELETE FROM permissions WHERE permission_code IN (
    'team_work_note_folder_create',
    'team_work_note_folder_update',
    'team_work_note_folder_delete',
    'team_work_note_create',
    'team_work_note_update',
    'team_work_note_delete'
);

-- ==========================================
-- 步骤5: 删除 enterprise_users.user_id 列（可选）
-- ==========================================
-- 注意：如果其他功能已经依赖 user_id 列，请不要执行此步骤
-- 如需回滚，请取消下面的注释：

-- DROP INDEX IF EXISTS idx_enterprise_users_user_id;
-- ALTER TABLE enterprise_users DROP CONSTRAINT IF EXISTS fk_enterprise_users_user_id;
-- ALTER TABLE enterprise_users DROP COLUMN IF EXISTS user_id;

COMMIT;

-- ==========================================
-- 回滚完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '🎉 团队笔记权限控制系统回滚完成！';
    RAISE NOTICE '';
    RAISE NOTICE '已回滚的操作：';
    RAISE NOTICE '  ✅ 删除权限概览视图';
    RAISE NOTICE '  ✅ 删除3个权限检查函数';
    RAISE NOTICE '  ✅ 删除2个性能优化索引';
    RAISE NOTICE '  ✅ 删除6个权限定义';
    RAISE NOTICE '  ⚠️  保留 enterprise_users.user_id 列（需手动删除）';
    RAISE NOTICE '';
END $$;
