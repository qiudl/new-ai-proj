#!/bin/bash

# 049_migrate_company_users_to_enterprise_users - 执行数据迁移脚本
# 将company_users表数据迁移到enterprise_users表

set -e  # 遇到错误立即退出

# 默认数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

echo "🚀 开始执行company_users到enterprise_users数据迁移..."
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
    (SELECT COUNT(*) FROM company_users) as company_users_count,
    (SELECT COUNT(*) FROM enterprise_users WHERE username LIKE 'company_user_%') as existing_migrated_users,
    (SELECT COUNT(*) FROM enterprises WHERE description LIKE 'Migrated from companies table%') as available_enterprises
"

# 执行迁移SQL
echo "🔄 执行数据迁移..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$MIGRATION_FILE"; then
    echo "✅ 数据迁移执行成功!"
else
    echo "❌ 数据迁移执行失败!"
    exit 1
fi

# 执行迁移后验证
echo "🔍 执行迁移后验证..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
-- 验证迁移结果
SELECT 
    'Post-migration Verification' as status,
    (SELECT COUNT(*) FROM company_users) as original_company_users_count,
    (SELECT COUNT(*) FROM enterprise_users WHERE username LIKE 'company_user_%') as migrated_users_count,
    (SELECT COUNT(*) FROM enterprise_users) as total_enterprise_users_count;

-- 显示迁移的用户按企业分组
SELECT 
    '按企业分组统计' as info,
    e.name as enterprise_name,
    COUNT(eu.id) as migrated_users_count,
    string_agg(eu.name, ', ' ORDER BY eu.name) as user_names
FROM enterprises e
LEFT JOIN enterprise_users eu ON e.id = eu.enterprise_id AND eu.username LIKE 'company_user_%'
WHERE e.description LIKE 'Migrated from companies table%'
GROUP BY e.id, e.name
ORDER BY e.id;

-- 验证主要联系人
SELECT 
    '主要联系人验证' as info,
    e.name as enterprise_name,
    eu.name as primary_contact_name,
    eu.username,
    eu.email
FROM enterprises e
JOIN enterprise_users eu ON e.id = eu.enterprise_id 
WHERE eu.is_primary_contact = TRUE 
  AND eu.username LIKE 'company_user_%'
  AND e.description LIKE 'Migrated from companies table%'
ORDER BY e.id;
"

echo "🎉 company_users到enterprise_users数据迁移完成!"