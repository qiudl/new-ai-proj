-- PostgreSQL 主库初始化脚本
-- 创建复制用户和设置权限

-- 创建复制用户
CREATE USER repl_user WITH REPLICATION ENCRYPTED PASSWORD 'repl_password_2024';

-- 创建复制槽（供从库使用）
SELECT pg_create_physical_replication_slot('replica_slot');

-- 授权复制用户访问主数据库
GRANT CONNECT ON DATABASE ai_project_db TO repl_user;

-- 显示当前WAL位置（用于手动同步时参考）
SELECT pg_current_wal_lsn();

-- 创建监控视图权限
GRANT SELECT ON pg_stat_replication TO repl_user;

-- 输出配置确认信息
\echo '==========================================';
\echo 'PostgreSQL Master Database Initialized';
\echo '==========================================';
\echo 'Replication user: repl_user';
\echo 'Replication slot: replica_slot';
\echo 'Ready for replica connection';
\echo '==========================================';