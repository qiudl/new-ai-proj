#!/bin/bash
# 043_create_system_users_table/execute_migration.sh
# 执行system_users表创建迁移脚本
# 作者: Claude Code AI
# 创建时间: 2025-09-05

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 数据库连接配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_proj_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== System Users Table Migration ===${NC}"
echo "Migration: 043_create_system_users_table"
echo "Target Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# 检查PostgreSQL连接
echo -e "${YELLOW}Checking database connection...${NC}"
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to database${NC}"
    echo "Please check your database configuration"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"

# 检查system_users表是否已存在
echo -e "${YELLOW}Checking if system_users table already exists...${NC}"
TABLE_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_users');" | xargs)

if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "${YELLOW}⚠ system_users table already exists${NC}"
    read -p "Do you want to continue anyway? This might cause errors. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 0
    fi
fi

# 执行UP迁移
echo -e "${YELLOW}Executing UP migration...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/up.sql"; then
    echo -e "${GREEN}✓ UP migration completed successfully${NC}"
else
    echo -e "${RED}✗ UP migration failed${NC}"
    exit 1
fi

# 验证表创建
echo -e "${YELLOW}Verifying table creation...${NC}"
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM system_users;" | xargs)
echo "system_users table record count: $TABLE_COUNT"

# 验证索引创建
INDEX_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'system_users';" | xargs)
echo "system_users table index count: $INDEX_COUNT"

# 验证触发器创建
TRIGGER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'system_users'::regclass;" | xargs)
echo "system_users table trigger count: $TRIGGER_COUNT"

# 验证角色分布
echo -e "${YELLOW}Verifying system user roles...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    role as system_role,
    COUNT(*) as user_count,
    STRING_AGG(username, ', ') as usernames
FROM system_users 
WHERE deleted_at IS NULL
GROUP BY role
ORDER BY role;
"

# 验证权限系统
echo -e "${YELLOW}Verifying permission system...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    username,
    role,
    jsonb_array_length(permissions) as permission_count,
    is_active,
    mfa_enabled
FROM system_users 
WHERE deleted_at IS NULL
ORDER BY role, username;
"

echo ""
echo -e "${GREEN}=== Migration Summary ===${NC}"
echo "✓ system_users table created"
echo "✓ $INDEX_COUNT indexes created"
echo "✓ $TRIGGER_COUNT triggers created"
echo "✓ Security features implemented"
echo "✓ $TABLE_COUNT test system users inserted"
echo "✓ Permission system configured"
echo ""
echo -e "${GREEN}Migration 043_create_system_users_table completed successfully!${NC}"

# 选项：显示表结构
read -p "Do you want to see the table structure? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}system_users table structure:${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d system_users"
    
    echo ""
    echo -e "${YELLOW}Sample system users with permissions:${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        username,
        name,
        role,
        permissions,
        is_active,
        created_at::date
    FROM system_users 
    WHERE deleted_at IS NULL
    ORDER BY role, username;
    "
fi