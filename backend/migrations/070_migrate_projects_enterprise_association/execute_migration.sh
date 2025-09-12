#!/bin/bash

# 项目与企业关联关系迁移脚本
# 使用环境变量或默认值进行数据库连接

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

echo "🔄 开始执行项目企业关联迁移..."
echo "📊 数据库连接信息："
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT" 
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# 执行迁移SQL
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$(dirname "$0")/migration.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 项目企业关联迁移成功完成！"
else
    echo ""
    echo "❌ 项目企业关联迁移执行失败！"
    exit 1
fi