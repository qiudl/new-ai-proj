-- Migration: Add enterprise user management fields to users table
-- Date: 2025-07-28
-- Description: Adds fields for managing enterprise users according to the design document

-- Add enterprise user specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
    contact_person_name VARCHAR(100),        -- 联系人真实姓名
    contact_phone VARCHAR(50),               -- 联系电话
    department_title VARCHAR(100),           -- 职务/部门
    is_primary_contact BOOLEAN DEFAULT FALSE, -- 是否企业主要联系人
    account_expires_at TIMESTAMPTZ,          -- 账号过期时间
    last_project_access TIMESTAMPTZ,         -- 最后访问项目时间
    notes TEXT;                              -- 备注信息

-- Update constraint to match design document requirements
-- Remove old constraint if exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_association_check;

-- Add new constraint based on design document
ALTER TABLE users ADD CONSTRAINT users_company_check 
CHECK (
    (user_type = 'system' AND company_id IS NULL) OR
    (user_type = 'company' AND company_id IS NOT NULL AND role = 'company_admin')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_contact_person ON users(contact_person_name) WHERE user_type = 'company';
CREATE INDEX IF NOT EXISTS idx_users_primary_contact ON users(company_id, is_primary_contact) WHERE user_type = 'company' AND is_primary_contact = true;
CREATE INDEX IF NOT EXISTS idx_users_account_expires ON users(account_expires_at) WHERE user_type = 'company';
CREATE INDEX IF NOT EXISTS idx_users_last_project_access ON users(last_project_access) WHERE user_type = 'company';

-- Add comment to document the purpose
COMMENT ON COLUMN users.contact_person_name IS '企业用户联系人真实姓名';
COMMENT ON COLUMN users.contact_phone IS '企业用户联系电话';
COMMENT ON COLUMN users.department_title IS '企业用户职务/部门';
COMMENT ON COLUMN users.is_primary_contact IS '是否企业主要联系人';
COMMENT ON COLUMN users.account_expires_at IS '企业用户账号过期时间';
COMMENT ON COLUMN users.last_project_access IS '最后访问项目时间';
COMMENT ON COLUMN users.notes IS '企业用户备注信息';