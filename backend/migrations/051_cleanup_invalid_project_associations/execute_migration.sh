#!/bin/bash

# 051_cleanup_invalid_project_associations - 清理无效项目关联
# 清理projects表中指向不存在公司的company_id

set -e  # 遇到错误立即退出

# 默认数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

echo "🚀 开始清理projects表中的无效company_id关联..."
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

# 执行清理前备份无效关联信息
echo "📊 备份将要清理的无效关联信息..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    'Pre-cleanup Backup' as info,
    p.id as project_id,
    p.name as project_name,
    p.company_id as invalid_company_id,
    p.created_at,
    'Will be set to NULL' as action
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.company_id IS NOT NULL 
  AND c.id IS NULL 
  AND p.deleted_at IS NULL
ORDER BY p.id;
"

# 执行清理SQL
echo "🔄 执行无效关联清理..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$MIGRATION_FILE"; then
    echo "✅ 无效关联清理执行成功!"
else
    echo "❌ 无效关联清理执行失败!"
    exit 1
fi

# 最终验证
echo "🔍 最终验证结果..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
-- 验证清理结果统计
SELECT 
    'Final Statistics' as status,
    COUNT(*) as total_active_projects,
    COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as projects_with_company_id,
    COUNT(CASE WHEN enterprise_id IS NOT NULL THEN 1 END) as projects_with_enterprise_id,
    COUNT(CASE WHEN company_id IS NULL AND enterprise_id IS NULL THEN 1 END) as projects_without_any_association
FROM projects 
WHERE deleted_at IS NULL;

-- 验证没有无效关联残留
SELECT 
    'Invalid Association Check' as check_type,
    COUNT(*) as invalid_associations_count,
    CASE WHEN COUNT(*) = 0 THEN '✅ 无无效关联' ELSE '❌ 仍有无效关联' END as result
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.company_id IS NOT NULL 
  AND c.id IS NULL 
  AND p.deleted_at IS NULL;
"

echo "🎉 projects表无效company_id关联清理完成!"