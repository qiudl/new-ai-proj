-- Migration Rollback: 移除 enterprise_id 字段
-- Version: v1.5
-- Purpose: 回滚 enterprise_id 字段添加
-- Author: AI Developer
-- Date: 2025-11-10

BEGIN;

-- 1. 移除外键约束
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS fk_users_enterprise;

-- 2. 移除索引
DROP INDEX IF EXISTS idx_users_enterprise_id;

-- 3. 移除 enterprise_id 字段
ALTER TABLE users
    DROP COLUMN IF EXISTS enterprise_id;

-- 4. 恢复 company_id 的注释
COMMENT ON COLUMN users.company_id IS '用户所属企业ID (关联 enterprises 表)';

COMMIT;
