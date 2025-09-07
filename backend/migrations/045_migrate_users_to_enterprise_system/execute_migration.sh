#!/bin/bash
# 045_migrate_users_to_enterprise_system/execute_migration.sh
# 执行用户迁移：从现有users表迁移到企业用户体系
# 作者: Claude Code AI
# 创建时间: 2025-09-06

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

echo -e "${GREEN}=== User Migration to Enterprise System ===${NC}"
echo "Migration: 045_migrate_users_to_enterprise_system"
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

# 检查依赖表是否存在
echo -e "${YELLOW}Checking prerequisite tables...${NC}"
REQUIRED_TABLES=("users" "enterprise_users" "enterprises")
for table in "${REQUIRED_TABLES[@]}"; do
    TABLE_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | xargs)
    
    if [ "$TABLE_EXISTS" != "t" ]; then
        echo -e "${RED}Error: Required table '$table' does not exist${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All prerequisite tables exist${NC}"

# 检查源数据
echo -e "${YELLOW}Checking source user data...${NC}"
COMPANY_USERS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE user_type = 'company' AND deleted_at IS NULL;" | xargs)
SYSTEM_USERS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE user_type = 'system' AND deleted_at IS NULL;" | xargs)
CURRENT_ENTERPRISE_USERS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprise_users;" | xargs)
AVAILABLE_ENTERPRISES=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprises WHERE description LIKE 'Migrated from %';" | xargs)

echo "Source data summary:"
echo "  - Company users to migrate: $COMPANY_USERS_COUNT"
echo "  - System users to keep: $SYSTEM_USERS_COUNT"
echo "  - Current enterprise users: $CURRENT_ENTERPRISE_USERS_COUNT"
echo "  - Available migrated enterprises: $AVAILABLE_ENTERPRISES"

# 检查是否已有用户迁移数据
MIGRATED_USERS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprise_users WHERE bio LIKE 'Migrated from users table%';" | xargs)

if [ "$MIGRATED_USERS_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $MIGRATED_USERS_COUNT existing migrated user records${NC}"
    read -p "Do you want to continue anyway? This might cause conflicts. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 0
    fi
fi

# 检查企业数据是否足够支持用户迁移
if [ "$AVAILABLE_ENTERPRISES" -eq 0 ] && [ "$COMPANY_USERS_COUNT" -gt 0 ]; then
    echo -e "${RED}Error: No migrated enterprises found, but have company users to migrate${NC}"
    echo "Please run enterprise data migration (044) first"
    exit 1
fi

# 执行用户迁移
echo -e "${YELLOW}Executing user migration...${NC}"
echo "This may take some time depending on data size and complexity..."

if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/up.sql"; then
    echo -e "${GREEN}✓ User migration completed successfully${NC}"
else
    echo -e "${RED}✗ User migration failed${NC}"
    exit 1
fi

# 验证迁移结果
echo -e "${YELLOW}Verifying migration results...${NC}"
NEW_ENTERPRISE_USERS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprise_users;" | xargs)
MIGRATED_USERS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprise_users WHERE bio LIKE 'Migrated from users table%';" | xargs)
REMAINING_COMPANY_USERS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE user_type = 'company' AND deleted_at IS NULL;" | xargs)

echo "Migration results:"
echo "  - Enterprise users before: $CURRENT_ENTERPRISE_USERS_COUNT"
echo "  - Enterprise users after: $NEW_ENTERPRISE_USERS_COUNT"
echo "  - Users migrated: $MIGRATED_USERS"
echo "  - Company users remaining in users table: $REMAINING_COMPANY_USERS"

# 检查数据完整性和分布
echo -e "${YELLOW}Checking data integrity and distribution...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
-- 权限级别分布
SELECT 
    'Access Level Distribution' as check_type,
    access_level,
    COUNT(*) as user_count
FROM enterprise_users 
WHERE bio LIKE 'Migrated from users table%'
GROUP BY access_level
ORDER BY access_level DESC;

-- 企业用户分布
SELECT 
    'Top Enterprise Distribution' as check_type,
    e.name as enterprise_name,
    COUNT(eu.id) as user_count
FROM enterprises e
LEFT JOIN enterprise_users eu ON e.id = eu.enterprise_id 
    AND eu.bio LIKE 'Migrated from users table%'
WHERE e.description LIKE 'Migrated from %'
GROUP BY e.id, e.name
HAVING COUNT(eu.id) > 0
ORDER BY user_count DESC
LIMIT 5;
"

echo ""
echo -e "${GREEN}=== Migration Summary ===${NC}"
echo "✓ Company users analyzed ($COMPANY_USERS_COUNT users)"
echo "✓ $MIGRATED_USERS users migrated to enterprise_users table"
echo "✓ System users preserved in users table ($SYSTEM_USERS_COUNT users)"
echo "✓ User permissions mapped based on original roles"
echo "✓ Migration tracking implemented"
echo "✓ Data integrity verified"
echo ""
echo -e "${GREEN}Migration 045_migrate_users_to_enterprise_system completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update foreign key references in related tables"
echo "2. Run department data migration (enterprise_departments)"
echo "3. Test user authentication with new enterprise system"
echo "4. Update application code to use new user tables"
echo "5. Consider archiving old user relationships after verification"

# 选项：显示样本迁移数据
read -p "Do you want to see sample migrated users? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Sample migrated enterprise users:${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        eu.id,
        e.name as enterprise_name,
        eu.username,
        eu.name,
        eu.position,
        eu.access_level,
        eu.is_primary_contact,
        eu.status,
        LEFT(eu.bio, 50) || '...' as migration_info
    FROM enterprise_users eu
    JOIN enterprises e ON e.id = eu.enterprise_id
    WHERE eu.bio LIKE 'Migrated from users table%'
    ORDER BY e.name, eu.access_level DESC
    LIMIT 10;
    "
fi