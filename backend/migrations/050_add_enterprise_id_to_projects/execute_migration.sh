#!/bin/bash

# 050_add_enterprise_id_to_projects - 执行项目关联更新脚本
# 为projects表添加enterprise_id字段

set -e  # 遇到错误立即退出

# 默认数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

echo "🚀 开始为projects表添加enterprise_id字段..."
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
    (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL) as total_projects,
    (SELECT COUNT(*) FROM projects WHERE company_id IS NOT NULL AND deleted_at IS NULL) as projects_with_company,
    (SELECT COUNT(*) FROM enterprises) as total_enterprises
"

# 执行迁移SQL
echo "🔄 执行结构更新..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$MIGRATION_FILE"; then
    echo "✅ 结构更新执行成功!"
else
    echo "❌ 结构更新执行失败!"
    exit 1
fi

# 执行迁移后验证
echo "🔍 执行迁移后验证..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
-- 验证字段添加结果
SELECT 
    'Post-migration Verification' as status,
    column_name,
    data_type,
    is_nullable,
    CASE WHEN column_default IS NULL THEN 'NULL' ELSE column_default END as default_value
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name IN ('company_id', 'enterprise_id')
ORDER BY column_name;

-- 验证外键约束
SELECT 
    'Foreign Key Constraints' as info,
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage
WHERE table_name = 'projects' 
  AND constraint_name LIKE 'fk_projects_enterprise%';
"

echo "🎉 projects表enterprise_id字段添加完成!"