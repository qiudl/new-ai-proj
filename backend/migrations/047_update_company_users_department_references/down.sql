-- 047_update_company_users_department_references/down.sql
-- 回滚：恢复company_users表的department_id外键引用到company_departments
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Rolling back company_users department_id foreign key references';
END $$;

-- 删除新的外键约束
ALTER TABLE company_users DROP CONSTRAINT IF EXISTS fk_company_users_enterprise_department;

-- 将department_id引用回滚到原来的company_departments
-- 注意：这个回滚脚本假设company_departments表仍然存在
-- 如果company_departments表已被删除，则无法完全回滚

-- 重新添加原来的外键约束
ALTER TABLE company_users 
ADD CONSTRAINT fk_company_users_department 
FOREIGN KEY (department_id) REFERENCES company_departments(id) ON DELETE SET NULL;

-- 注意：由于我们没有保存具体的映射关系到持久化表中，
-- 这个回滚脚本只能恢复约束结构，但不能自动恢复具体的department_id值
-- 如果需要完全回滚，需要从备份中恢复数据

DO $$
BEGIN
    RAISE NOTICE 'Rollback completed - restored foreign key constraint to company_departments';
    RAISE NOTICE 'WARNING: Department ID values may need manual restoration from backup';
END $$;

COMMIT;