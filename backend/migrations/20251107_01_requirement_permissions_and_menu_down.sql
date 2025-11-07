-- 20251107_01_requirement_permissions_and_menu_down.sql
-- 回滚需求管理系统的权限和导航菜单项
-- 作者: Claude Code
-- 日期: 2025-11-07

BEGIN;

-- ====================
-- 1. 删除需求管理导航菜单
-- ====================
DELETE FROM system_menu_items
WHERE path LIKE '/requirement%';

RAISE NOTICE '✅ 需求管理菜单已删除';

-- ====================
-- 2. 删除角色权限关联
-- ====================
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE permission_code LIKE 'requirement%'
);

RAISE NOTICE '✅ 需求管理角色权限关联已删除';

-- ====================
-- 3. 删除需求管理权限
-- ====================
DELETE FROM permissions
WHERE permission_code LIKE 'requirement%';

RAISE NOTICE '✅ 需求管理权限已删除';

COMMIT;

-- 验证查询
SELECT '剩余需求管理权限:' as message, COUNT(*) as count
FROM permissions
WHERE permission_code LIKE 'requirement%';

SELECT '剩余需求管理菜单:' as message, COUNT(*) as count
FROM system_menu_items
WHERE path LIKE '/requirement%';
