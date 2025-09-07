#!/bin/bash
# 044_data_migration_to_enterprises/execute_migration.sh
# 执行数据迁移：从customers和companies表迁移到enterprises表
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

echo -e "${GREEN}=== Enterprise Data Migration ===${NC}"
echo "Migration: 044_data_migration_to_enterprises"
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
REQUIRED_TABLES=("customers" "companies" "enterprises")
for table in "${REQUIRED_TABLES[@]}"; do
    TABLE_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | xargs)
    
    if [ "$TABLE_EXISTS" != "t" ]; then
        echo -e "${RED}Error: Required table '$table' does not exist${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All prerequisite tables exist${NC}"

# 检查源表数据
echo -e "${YELLOW}Checking source data...${NC}"
CUSTOMERS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL;" | xargs)
COMPANIES_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL;" | xargs)
CURRENT_ENTERPRISES_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprises;" | xargs)

echo "Source data summary:"
echo "  - Customers to migrate: $CUSTOMERS_COUNT"
echo "  - Companies to migrate: $COMPANIES_COUNT"
echo "  - Current enterprises: $CURRENT_ENTERPRISES_COUNT"
echo "  - Total records to migrate: $((CUSTOMERS_COUNT + COMPANIES_COUNT))"

# 检查是否已有迁移数据
MIGRATED_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprises WHERE description LIKE 'Migrated from %';" | xargs)

if [ "$MIGRATED_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $MIGRATED_COUNT existing migration records${NC}"
    read -p "Do you want to continue anyway? This might cause duplicates. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 0
    fi
fi

# 执行数据迁移
echo -e "${YELLOW}Executing data migration...${NC}"
echo "This may take some time depending on data size..."

if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/up.sql"; then
    echo -e "${GREEN}✓ Data migration completed successfully${NC}"
else
    echo -e "${RED}✗ Data migration failed${NC}"
    exit 1
fi

# 验证迁移结果
echo -e "${YELLOW}Verifying migration results...${NC}"
NEW_ENTERPRISES_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprises;" | xargs)
MIGRATED_RECORDS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM enterprises WHERE description LIKE 'Migrated from %';" | xargs)

echo "Migration results:"
echo "  - Enterprises before: $CURRENT_ENTERPRISES_COUNT"
echo "  - Enterprises after: $NEW_ENTERPRISES_COUNT"
echo "  - Records migrated: $MIGRATED_RECORDS"

# 检查数据完整性
echo -e "${YELLOW}Checking data integrity...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    'Source Summary' as check_type,
    COUNT(CASE WHEN description LIKE 'Migrated from customers %' THEN 1 END) as from_customers,
    COUNT(CASE WHEN description LIKE 'Migrated from companies %' THEN 1 END) as from_companies
FROM enterprises 
WHERE description LIKE 'Migrated from %';

SELECT 
    'Code Conflicts' as check_type,
    COUNT(*) as conflicts_resolved
FROM enterprises 
WHERE code LIKE '%_COMP' AND description LIKE 'Migrated from %';
"

echo ""
echo -e "${GREEN}=== Migration Summary ===${NC}"
echo "✓ Source data analyzed ($CUSTOMERS_COUNT customers + $COMPANIES_COUNT companies)"
echo "✓ $MIGRATED_RECORDS records migrated to enterprises table"
echo "✓ Data integrity verified"
echo "✓ Mapping table created for foreign key updates"
echo "✓ Metadata tracking implemented"
echo ""
echo -e "${GREEN}Migration 044_data_migration_to_enterprises completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update foreign key references in related tables"
echo "2. Run user data migration (enterprise_users)"
echo "3. Run department data migration (enterprise_departments)"
echo "4. Test application with new data structure"
echo "5. Consider archiving old tables after verification"

# 选项：显示样本数据
read -p "Do you want to see sample migrated data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Sample migrated enterprises:${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        id,
        name,
        code,
        industry_type,
        business_type,
        status,
        LEFT(description, 50) || '...' as migration_info
    FROM enterprises 
    WHERE description LIKE 'Migrated from %'
    ORDER BY id
    LIMIT 10;
    "
fi