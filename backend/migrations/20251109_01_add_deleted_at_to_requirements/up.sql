-- 20251109_01_add_deleted_at_to_requirements/up.sql
-- 为 requirements 表添加软删除字段
-- 作者: Claude AI
-- 日期: 2025-11-09
-- 预计执行时间: <1秒

BEGIN;

-- ====================
-- 1. 添加软删除字段
-- ====================

-- 添加 deleted_at 字段（软删除时间戳）
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- 添加 deleted_by 字段（删除操作者）
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL;

-- 添加外键约束
ALTER TABLE requirements
ADD CONSTRAINT fk_requirements_deleted_by
FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ====================
-- 2. 添加索引优化
-- ====================

-- 为软删除字段创建索引
CREATE INDEX IF NOT EXISTS idx_requirements_deleted_at
ON requirements(deleted_at)
WHERE deleted_at IS NOT NULL;

-- 为未删除记录优化查询
CREATE INDEX IF NOT EXISTS idx_requirements_active
ON requirements(id)
WHERE deleted_at IS NULL;

-- 为企业+状态+未删除的组合查询优化
DROP INDEX IF EXISTS idx_requirements_enterprise_status;
CREATE INDEX idx_requirements_enterprise_status_active
ON requirements(enterprise_id, status)
WHERE deleted_at IS NULL;

-- ====================
-- 3. 添加字段注释
-- ====================

COMMENT ON COLUMN requirements.deleted_at IS '软删除时间戳（NULL表示未删除）';
COMMENT ON COLUMN requirements.deleted_by IS '删除操作者用户ID';

COMMIT;

-- ====================
-- 输出执行信息
-- ====================
\echo '==========================================';
\echo 'Migration 20251109_01 completed';
\echo '';
\echo 'Changes applied:';
\echo '  - Added requirements.deleted_at (TIMESTAMP)';
\echo '  - Added requirements.deleted_by (INTEGER)';
\echo '  - Created foreign key constraint';
\echo '  - Created 2 new indexes for soft delete';
\echo '  - Updated 1 existing index';
\echo '';
\echo 'Impact: Enables soft delete for requirements';
\echo '==========================================';
