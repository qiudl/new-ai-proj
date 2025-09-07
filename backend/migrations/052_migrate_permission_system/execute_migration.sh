#!/bin/bash

# 052_migrate_permission_system - 权限系统迁移脚本
# 迁移权限缓存和审计日志，保留已迁移用户的数据，清理未迁移用户的数据

set -e  # 遇到错误立即退出

# 默认数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

echo "🚀 开始权限系统数据迁移..."
echo "数据库: $DB_HOST:$DB_PORT/$DB_NAME"
echo "用户: $DB_USER"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/migration.sql"

# 检查SQL文件是否存在
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ 错误: 找不到迁移SQL文件: $MIGRATION_FILE"
    exit 1
fi

# 执行迁移前检查
echo "📊 执行迁移前检查..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    'Pre-migration Check' as status,
    (SELECT COUNT(*) FROM permission_cache) as total_cache_records,
    (SELECT COUNT(*) FROM permission_audit_logs) as total_audit_records,
    (SELECT COUNT(*) FROM enterprise_users WHERE username LIKE 'company_user_%') as migrated_enterprise_users
"

# 备份即将删除的记录信息
echo "📋 备份将被清理的记录信息..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
-- 备份将被删除的权限缓存记录
SELECT 
    'Records to be deleted from permission_cache' as info,
    pc.company_user_id,
    cu.name as user_name,
    COUNT(pc.id) as cache_entries_to_delete
FROM permission_cache pc
LEFT JOIN company_users cu ON pc.company_user_id = cu.id
WHERE pc.company_user_id NOT IN (
    SELECT cu2.id 
    FROM company_users cu2 
    JOIN enterprise_users eu ON eu.username = 'company_user_' || cu2.id::text
)
GROUP BY pc.company_user_id, cu.name
ORDER BY pc.company_user_id;

-- 备份将被删除的审计日志记录
SELECT 
    'Records to be deleted from permission_audit_logs' as info,
    pal.company_user_id,
    cu.name as user_name,
    COUNT(pal.id) as audit_entries_to_delete
FROM permission_audit_logs pal
LEFT JOIN company_users cu ON pal.company_user_id = cu.id
WHERE pal.company_user_id IS NOT NULL 
  AND pal.company_user_id NOT IN (
    SELECT cu2.id 
    FROM company_users cu2 
    JOIN enterprise_users eu ON eu.username = 'company_user_' || cu2.id::text
)
GROUP BY pal.company_user_id, cu.name
ORDER BY pal.company_user_id;
"

# 执行迁移SQL
echo "🔄 执行权限系统数据迁移..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$MIGRATION_FILE"; then
    echo "✅ 权限系统数据迁移执行成功!"
else
    echo "❌ 权限系统数据迁移执行失败!"
    exit 1
fi

# 执行迁移后验证
echo "🔍 执行迁移后验证..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
-- 最终验证统计
SELECT 
    'Post-migration Verification' as status,
    (SELECT COUNT(*) FROM permission_cache) as remaining_cache_records,
    (SELECT COUNT(*) FROM permission_audit_logs) as remaining_audit_records,
    (SELECT COUNT(DISTINCT pc.company_user_id) FROM permission_cache pc) as cache_users_count,
    (SELECT COUNT(DISTINCT pal.company_user_id) FROM permission_audit_logs pal WHERE pal.company_user_id IS NOT NULL) as audit_users_count;

-- 验证所有剩余记录都对应已迁移用户
SELECT 
    'Data Integrity Check' as check_type,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM permission_cache pc
            WHERE pc.company_user_id NOT IN (
                SELECT cu.id 
                FROM company_users cu 
                JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
            )
        ) = 0 AND (
            SELECT COUNT(*) FROM permission_audit_logs pal
            WHERE pal.company_user_id IS NOT NULL 
              AND pal.company_user_id NOT IN (
                SELECT cu.id 
                FROM company_users cu 
                JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
            )
        ) = 0
        THEN '✅ 所有剩余记录都对应已迁移用户'
        ELSE '❌ 仍有未迁移用户的记录'
    END as result;
"

echo "🎉 权限系统数据迁移完成!"