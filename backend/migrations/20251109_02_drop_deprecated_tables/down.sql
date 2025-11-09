-- 20251109_02_drop_deprecated_tables/down.sql
-- 恢复已删除的deprecated表（不建议使用）
-- 作者: Claude AI
-- 日期: 2025-11-09

-- ⚠️  警告：此回滚脚本仅重新创建表结构，不恢复数据
-- ⚠️  如需恢复数据，请从备份中恢复

BEGIN;

\echo '==========================================';
\echo '⚠️  WARNING: Cannot restore deleted data';
\echo '⚠️  This rollback only recreates table structures';
\echo '⚠️  Please restore from backup if data is needed';
\echo '==========================================';

-- 注意：由于这些表已经被标记为deprecated且数据已迁移，
-- 不建议回滚此迁移。如果确实需要，应该：
-- 1. 从数据库备份中恢复这些表
-- 2. 或者参考原始的表创建迁移文件重新创建

ROLLBACK;

\echo 'Rollback cancelled - use database backup to restore if needed';
