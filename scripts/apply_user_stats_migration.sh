#!/bin/bash

# 用户统计数据库视图创建脚本
# 这个脚本将应用新的数据库迁移

set -e

echo "=== 开始应用用户统计数据库视图迁移 ==="

# 数据库连接配置
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="dev_user"
DB_PASSWORD="dev_password_2024"
DB_NAME="ai_project_db"

# 构建PostgreSQL连接URL
PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

# 检查数据库连接
echo "检查数据库连接..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "❌ 数据库连接失败。请确保PostgreSQL服务正在运行。"
    exit 1
fi

echo "✅ 数据库连接成功"

# 应用迁移文件
MIGRATION_FILE="/Users/johnqiu/coding/www/projects/new-ai-proj/backend/migrations/027_user_statistics_views.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ 迁移文件不存在: $MIGRATION_FILE"
    exit 1
fi

echo "正在应用迁移文件: $MIGRATION_FILE"

# 执行SQL迁移
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo "✅ 用户统计数据库视图创建成功"
else
    echo "❌ 迁移执行失败"
    exit 1
fi

# 验证视图是否创建成功
echo "验证数据库视图..."
VIEW_NAMES=(
    "user_basic_stats_view"
    "user_role_stats_view" 
    "user_activity_stats_view"
    "user_company_stats_view"
    "user_registration_trends_view"
    "user_performance_view"
)

for view in "${VIEW_NAMES[@]}"; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name = '$view';" | grep -q "1"; then
        echo "✅ 视图 $view 创建成功"
    else
        echo "❌ 视图 $view 创建失败"
    fi
done

echo "=== 用户统计数据库视图迁移完成 ==="
echo ""
echo "可用的视图："
for view in "${VIEW_NAMES[@]}"; do
    echo "  - $view"
done

echo ""
echo "现在可以通过以下API端点访问统计数据："
echo "  - GET /api/v1/users/stats/basic"
echo "  - GET /api/v1/users/stats/roles"
echo "  - GET /api/v1/users/stats/activity"
echo "  - GET /api/v1/users/stats/companies"
echo "  - GET /api/v1/users/stats/trends"
echo "  - GET /api/v1/users/stats/performance"
echo "  - GET /api/v1/users/stats/dashboard"
