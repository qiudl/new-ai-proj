-- Migration: Fix Enterprise User Database Constraints  
-- Date: 2025-08-26
-- Description: 调整企业用户的数据库约束以确保数据完整性和一致性
-- Task: #524 - 调整企业用户的数据库约束

BEGIN;

-- 1. 修复角色约束，添加企业用户角色
-- 删除旧的角色约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 添加新的角色约束，包含企业用户角色
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (
    role::text = ANY (ARRAY[
        'admin'::character varying::text,
        'project_manager'::character varying::text, 
        'developer'::character varying::text,
        'client'::character varying::text,
        'company_admin'::character varying::text,
        'company_user'::character varying::text
    ])
);

-- 2. 添加企业用户与公司关联的约束
-- 删除旧的公司关联约束（如果存在）
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_association_check;

-- 添加新的企业用户约束
ALTER TABLE users ADD CONSTRAINT users_company_association_check 
CHECK (
    -- 系统用户不应该有company_id
    (user_type = 'system' AND company_id IS NULL) OR
    -- 企业用户必须有company_id，并且角色必须是company_admin或company_user
    (user_type = 'company' AND company_id IS NOT NULL AND role IN ('company_admin', 'company_user'))
);

-- 3. 添加企业用户必需字段约束
-- 企业用户的关键联系信息必须填写
ALTER TABLE users ADD CONSTRAINT users_company_required_fields_check
CHECK (
    -- 非企业用户跳过检查
    user_type != 'company' OR
    -- 企业用户必须有联系人姓名、电话和部门信息
    (contact_person_name IS NOT NULL AND 
     contact_person_name != '' AND
     contact_phone IS NOT NULL AND 
     contact_phone != '' AND
     department_title IS NOT NULL AND
     department_title != '')
);

-- 4. 添加主联系人约束（每个公司只能有一个主联系人）
-- 这个约束通过unique partial index实现
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_primary_contact_unique 
ON users(company_id) 
WHERE user_type = 'company' AND is_primary_contact = true;

-- 5. 为企业用户字段添加性能索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_users_contact_person ON users(contact_person_name) 
WHERE user_type = 'company';

CREATE INDEX IF NOT EXISTS idx_users_account_expires ON users(account_expires_at) 
WHERE user_type = 'company' AND account_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_project_access ON users(last_project_access) 
WHERE user_type = 'company' AND last_project_access IS NOT NULL;

-- 6. 添加企业用户状态相关索引
CREATE INDEX IF NOT EXISTS idx_users_company_status ON users(company_id, status) 
WHERE user_type = 'company';

-- 7. 为company_id添加外键约束（如果companies表存在）
-- 检查companies表是否存在，如果存在则添加外键约束
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        -- 删除旧的外键约束（如果存在）
        ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_company_id;
        
        -- 添加新的外键约束
        ALTER TABLE users ADD CONSTRAINT fk_users_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 8. 更新表注释
COMMENT ON TABLE users IS '用户表 - 支持系统用户和企业用户两种类型';
COMMENT ON CONSTRAINT users_company_association_check ON users IS '确保企业用户与公司正确关联';
COMMENT ON CONSTRAINT users_company_required_fields_check ON users IS '确保企业用户必填字段完整';

COMMIT;
