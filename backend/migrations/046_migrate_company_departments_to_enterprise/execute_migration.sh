#!/bin/bash

# 046_migrate_company_departments_to_enterprise/execute_migration.sh
# 执行公司部门迁移到企业部门表
# 作者: Claude Code AI
# 创建时间: 2025-09-06

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_NAME="046_migrate_company_departments_to_enterprise"

# 默认数据库配置
DEFAULT_DB_HOST="localhost"
DEFAULT_DB_PORT="5432"
DEFAULT_DB_NAME="ai_project_db"
DEFAULT_DB_USER="dev_user"

# 从环境变量获取数据库配置，如果没有则使用默认值
DB_HOST=${DB_HOST:-$DEFAULT_DB_HOST}
DB_PORT=${DB_PORT:-$DEFAULT_DB_PORT}
DB_NAME=${DB_NAME:-$DEFAULT_DB_NAME}
DB_USER=${DB_USER:-$DEFAULT_DB_USER}
DB_PASSWORD=${DB_PASSWORD}

echo -e "${GREEN}=== Company Departments Migration to Enterprise System ===${NC}"
echo "Migration: $MIGRATION_NAME"
echo "Target Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo

# 检查必要的环境变量
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Error: DB_PASSWORD environment variable is required${NC}"
    echo "Usage: DB_PASSWORD=your_password $0"
    exit 1
fi

# 检查数据库连接
echo -e "${YELLOW}Checking database connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"

# 检查prerequisite表是否存在
echo -e "${YELLOW}Checking prerequisite tables...${NC}"
REQUIRED_TABLES=("companies" "company_departments" "enterprises" "enterprise_departments")
for table in "${REQUIRED_TABLES[@]}"; do
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt $table" > /dev/null 2>&1; then
        echo -e "${RED}❌ Required table '$table' not found${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All prerequisite tables exist${NC}"

# 检查源数据
echo -e "${YELLOW}Checking source department data...${NC}"
SOURCE_DATA=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        'Departments to migrate: ' || COUNT(cd.id) ||
        ', Companies with departments: ' || COUNT(DISTINCT cd.company_id) ||
        ', Current enterprise departments: ' || (SELECT COUNT(*) FROM enterprise_departments) ||
        ', Available enterprises: ' || (SELECT COUNT(*) FROM enterprises WHERE deleted_at IS NULL)
    FROM company_departments cd
    WHERE cd.deleted_at IS NULL;
")
echo "Source data summary:${SOURCE_DATA}"

# 检查是否有已存在的迁移数据
EXISTING_MIGRATED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM enterprise_departments 
    WHERE description LIKE '%Migrated from company_departments%';
")

if [ "$EXISTING_MIGRATED" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $EXISTING_MIGRATED existing migrated department records${NC}"
    read -p "Do you want to continue and potentially create duplicates? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Migration cancelled by user${NC}"
        exit 0
    fi
fi

# 执行迁移
echo -e "${YELLOW}Executing migration...${NC}"
echo -e "${BLUE}Running up.sql...${NC}"

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/up.sql"; then
    echo -e "${GREEN}✓ Migration executed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

# 验证迁移结果
echo -e "${YELLOW}Verifying migration results...${NC}"
VERIFICATION_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        'Migrated departments: ' || COUNT(*) ||
        ', Max level: ' || COALESCE(MAX(level), 0) ||
        ', Enterprises with departments: ' || COUNT(DISTINCT enterprise_id)
    FROM enterprise_departments 
    WHERE description LIKE '%Migrated from company_departments%';
")
echo "Migration results:${VERIFICATION_RESULT}"

# 显示每个企业的部门数量
echo -e "${BLUE}Department distribution by enterprise:${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        e.name as enterprise_name,
        COUNT(ed.id) as department_count,
        MAX(ed.level) as max_level
    FROM enterprises e
    LEFT JOIN enterprise_departments ed ON e.id = ed.enterprise_id 
        AND ed.description LIKE '%Migrated from company_departments%'
        AND ed.deleted_at IS NULL
    GROUP BY e.id, e.name
    HAVING COUNT(ed.id) > 0
    ORDER BY department_count DESC;
"

echo -e "${GREEN}=== Migration completed successfully ===${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify the migrated department structure"
echo "2. Update any foreign key references to company_departments"
echo "3. Test application functionality with enterprise_departments"
echo "4. After verification, consider dropping company_departments table"
echo

unset PGPASSWORD