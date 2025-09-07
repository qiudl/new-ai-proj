-- 044_data_migration_to_enterprises/down.sql
-- 回滚数据迁移：删除从customers和companies表迁移到enterprises表的数据
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

-- 输出回滚开始信息
\echo '=========================================='
\echo 'Starting rollback of enterprises data migration'
\echo '=========================================='

-- 删除通过此次迁移添加的数据
\echo 'Removing migrated data from enterprises table...'

-- 首先统计要删除的记录数
SELECT 
    'Records to be removed' as info,
    COUNT(*) as count
FROM enterprises 
WHERE description LIKE 'Migrated from %';

-- 删除迁移的数据
DELETE FROM enterprises 
WHERE description LIKE 'Migrated from %';

-- 验证删除结果
SELECT 
    'Rollback Summary' as info,
    COUNT(*) as remaining_enterprises_count
FROM enterprises;

-- 检查是否还有迁移相关的数据
SELECT 
    'Migration Data Check' as info,
    COUNT(*) as migration_data_remaining
FROM enterprises 
WHERE description LIKE 'Migrated from %';

COMMIT;

-- 输出完成信息
\echo '=========================================='
\echo 'Enterprises data migration rollback completed'
\echo 'Original customers and companies tables remain unchanged'
\echo '=========================================='