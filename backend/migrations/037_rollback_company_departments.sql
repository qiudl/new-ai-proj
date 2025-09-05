-- 回滚脚本：删除company_departments表和相关更改
-- Rollback: 037_rollback_company_departments.sql

-- 警告：此脚本将删除所有company_departments数据，请谨慎使用！

-- 1. 删除company_users表的department_id外键约束和字段
ALTER TABLE company_users 
    DROP CONSTRAINT IF EXISTS fk_company_users_department,
    DROP COLUMN IF EXISTS department_id;

-- 2. 删除company_departments表的触发器
DROP TRIGGER IF EXISTS trigger_company_departments_updated_at ON company_departments;
DROP FUNCTION IF EXISTS update_company_departments_updated_at();

-- 3. 删除company_departments表（会自动删除相关索引和约束）
DROP TABLE IF EXISTS company_departments CASCADE;

-- 4. 验证回滚完成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_departments') THEN
        RAISE NOTICE '✅ company_departments表已成功删除';
    ELSE
        RAISE EXCEPTION '❌ company_departments表删除失败';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_users' AND column_name = 'department_id') THEN
        RAISE NOTICE '✅ company_users.department_id字段已成功删除';
    ELSE
        RAISE EXCEPTION '❌ company_users.department_id字段删除失败';
    END IF;
    
    RAISE NOTICE '🔄 回滚完成，已恢复到迁移前状态';
END $$;