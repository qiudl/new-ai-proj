-- 040_create_enterprises_table/down.sql
-- 回滚enterprises表的创建
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_enterprises_updated_at ON enterprises;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_enterprises_updated_at();

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_enterprises_code;
DROP INDEX IF EXISTS idx_enterprises_name;
DROP INDEX IF EXISTS idx_enterprises_status;
DROP INDEX IF EXISTS idx_enterprises_industry_type;
DROP INDEX IF EXISTS idx_enterprises_business_type;
DROP INDEX IF EXISTS idx_enterprises_created_at;
DROP INDEX IF EXISTS idx_enterprises_deleted_at;

-- 删除enterprises表
DROP TABLE IF EXISTS enterprises;

COMMIT;

-- 输出回滚信息
\echo '==========================================';
\echo 'Enterprises table migration rollback completed';
\echo 'Table dropped: enterprises';
\echo 'Indexes dropped: 7 indexes';
\echo 'Trigger dropped: update_enterprises_updated_at';
\echo '==========================================';