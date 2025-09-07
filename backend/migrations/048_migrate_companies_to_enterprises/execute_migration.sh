#!/bin/bash

# 048_migrate_companies_to_enterprises - 执行数据迁移脚本
# 将companies表数据迁移到enterprises表

set -e  # 遇到错误立即退出

# 默认数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

echo "🚀 开始执行companies到enterprises数据迁移..."
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
    (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL) as companies_count,
    (SELECT COUNT(*) FROM enterprises WHERE description LIKE 'Migrated from companies table%') as existing_migrated_enterprises
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
    (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL) as companies_count,
    (SELECT COUNT(*) FROM enterprises WHERE description LIKE 'Migrated from companies table%') as migrated_enterprises_count,
    (SELECT COUNT(*) FROM enterprises) as total_enterprises_count;

-- 显示迁移的具体记录
SELECT 
    '详细迁移记录' as info,
    e.id,
    e.name,
    e.code,
    e.industry_type,
    e.status,
    SUBSTRING(e.description FROM 'company (\\\d+)') as source_company_id
FROM enterprises e 
WHERE e.description LIKE 'Migrated from companies table%'
ORDER BY e.id;
"

echo "🎉 companies到enterprises数据迁移完成!"