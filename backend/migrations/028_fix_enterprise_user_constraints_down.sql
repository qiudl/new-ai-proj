-- Migration Rollback: Fix Enterprise User Database Constraints
-- Date: 2025-08-26
-- Description: 回滚企业用户数据库约束的修复
-- Task: #524 - 调整企业用户的数据库约束 (回滚)

BEGIN;

-- 1. 回滚角色约束到原始状态
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (
    role::text = ANY (ARRAY[
        'admin'::character varying::text,
        'project_manager'::character varying::text, 
        'developer'::character varying::text,
        'client'::character varying::text
    ])
);

-- 2. 删除企业用户关联约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_association_check;

-- 3. 删除企业用户必需字段约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_required_fields_check;

-- 4. 删除主联系人唯一索引
DROP INDEX IF EXISTS idx_users_primary_contact_unique;

-- 5. 删除新增的性能索引
DROP INDEX IF EXISTS idx_users_contact_person;
DROP INDEX IF EXISTS idx_users_account_expires;
DROP INDEX IF EXISTS idx_users_last_project_access;
DROP INDEX IF EXISTS idx_users_company_status;

-- 6. 删除外键约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_company_id;

-- 7. 恢复表注释
COMMENT ON TABLE users IS '用户表';

COMMIT;
