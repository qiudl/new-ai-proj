#!/bin/bash

# Migration 060: Deprecate Legacy Company Tables
# Description: 标记legacy company和customers表为deprecated状态

set -e

# 数据库连接参数
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-dev_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password_2024}"

# 检查参数
if [[ -z "$DB_PASSWORD" ]]; then
    echo "Error: DB_PASSWORD environment variable is required"
    exit 1
fi

echo "======================================================"
echo "Migration 060: Deprecate Legacy Company Tables"
echo "======================================================"
echo "Target Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "User: $DB_USER"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# 检查数据库连接
export PGPASSWORD="$DB_PASSWORD"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Error: Cannot connect to database"
    echo "Please check your database connection parameters"
    exit 1
fi

# 执行操作
if [[ "$1" == "up" ]] || [[ -z "$1" ]]; then
    echo "Applying migration..."
    
    # 检查表是否存在
    echo "Checking legacy tables..."
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'customers', 'company_users', 'company_departments');
    ")
    
    if [[ "$TABLE_COUNT" -lt 4 ]]; then
        echo "Warning: Some legacy tables are missing. Found $TABLE_COUNT/4 tables."
        echo "This might indicate the tables have already been removed or never existed."
    fi
    
    # 执行迁移
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/migration.sql"
    
    # 验证迁移
    echo "Verifying migration..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            table_name,
            obj_description(c.oid, 'pg_class') as table_comment
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public' 
        AND t.table_name IN ('companies', 'customers', 'company_users', 'company_departments')
        ORDER BY t.table_name;
    "
    
    echo "✅ Migration 060 applied successfully!"
    
elif [[ "$1" == "down" ]]; then
    echo "Rolling back migration..."
    
    # 移除表注释
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        COMMENT ON TABLE companies IS NULL;
        COMMENT ON TABLE customers IS NULL;
        COMMENT ON TABLE company_users IS NULL;
        COMMENT ON TABLE company_departments IS NULL;
        COMMENT ON TABLE customer_contacts IS NULL;
        COMMENT ON TABLE customer_users IS NULL;
        
        DROP VIEW IF EXISTS v_legacy_companies;
        DROP VIEW IF EXISTS v_legacy_customers;
        
        DELETE FROM schema_migrations WHERE version = 60;
    "
    
    echo "✅ Migration 060 rolled back successfully!"
    
else
    echo "Usage: $0 [up|down]"
    echo "  up   - Apply the migration (default)"
    echo "  down - Rollback the migration"
    exit 1
fi

echo "======================================================"
echo "Migration 060 completed at $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"