-- 20251109_01_add_requirements_soft_delete
-- 为requirements表添加软删除支持

BEGIN;

-- 添加deleted_at字段
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- 添加deleted_by字段(记录谁删除的)
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 创建软删除索引(提高查询性能)
CREATE INDEX IF NOT EXISTS idx_requirements_deleted_at
ON requirements(deleted_at)
WHERE deleted_at IS NOT NULL;

-- 添加字段注释
COMMENT ON COLUMN requirements.deleted_at IS '软删除时间戳';
COMMENT ON COLUMN requirements.deleted_by IS '删除操作者ID';

COMMIT;
