-- Migration: 添加 enterprise_id 字段到 users 表
-- Version: v1.5
-- Purpose: 引入语义清晰的 enterprise_id 字段,保留 company_id 向后兼容
-- Author: AI Developer
-- Date: 2025-11-10

BEGIN;

-- 1. 添加新的 enterprise_id 字段
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS enterprise_id INTEGER;

-- 2. 从 company_id 复制数据到 enterprise_id
UPDATE users
SET enterprise_id = company_id
WHERE company_id IS NOT NULL;

-- 3. 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_enterprise_id
    ON users(enterprise_id)
    WHERE enterprise_id IS NOT NULL;

-- 4. 添加外键约束确保数据完整性
ALTER TABLE users
    ADD CONSTRAINT fk_users_enterprise
    FOREIGN KEY (enterprise_id)
    REFERENCES enterprises(id)
    ON DELETE SET NULL;

-- 5. 添加注释标记字段用途和废弃计划
COMMENT ON COLUMN users.enterprise_id IS '用户所属企业ID (新字段,推荐使用)';
COMMENT ON COLUMN users.company_id IS 'DEPRECATED: 已废弃,请使用 enterprise_id. 将在 v2.0 移除';

-- 6. 验证数据迁移
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    -- 检查是否有不一致的数据
    SELECT COUNT(*) INTO mismatch_count
    FROM users
    WHERE (company_id IS NULL AND enterprise_id IS NOT NULL)
       OR (company_id IS NOT NULL AND enterprise_id IS NULL)
       OR (company_id IS NOT NULL AND enterprise_id IS NOT NULL AND company_id != enterprise_id);

    IF mismatch_count > 0 THEN
        RAISE EXCEPTION '数据迁移验证失败: 发现 % 条不一致记录', mismatch_count;
    END IF;

    RAISE NOTICE '✅ 数据迁移验证通过: company_id 和 enterprise_id 数据一致';
END $$;

COMMIT;
