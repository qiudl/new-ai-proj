-- 046_migrate_company_departments_to_enterprise/down.sql
-- 回滚：删除迁移的企业部门数据
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

-- 删除所有标记为从company_departments迁移的部门
DELETE FROM enterprise_departments
WHERE description LIKE '%Migrated from company_departments%';

-- 输出回滚结果
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Rollback completed. Deleted % migrated department records', v_deleted_count;
END $$;

COMMIT;