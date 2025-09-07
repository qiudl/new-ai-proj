#!/bin/bash

# 047_update_company_users_department_references/execute_migration.sh
# 更新company_users表的department_id外键引用
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
MIGRATION_NAME="047_update_company_users_department_references"

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

echo -e "${GREEN}=== Company Users Department Reference Update ===${NC}"
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
REQUIRED_TABLES=("company_users" "company_departments" "enterprise_departments")
for table in "${REQUIRED_TABLES[@]}"; do
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt $table" > /dev/null 2>&1; then
        echo -e "${RED}❌ Required table '$table' not found${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All prerequisite tables exist${NC}"

# 检查需要更新的数据
echo -e "${YELLOW}Checking data to be updated...${NC}"
UPDATE_SUMMARY=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        'Users with department references: ' || COUNT(cu.department_id) ||
        ', Departments to map: ' || COUNT(DISTINCT cu.department_id) ||
        ', Migrated enterprise departments: ' || (
            SELECT COUNT(*) FROM enterprise_departments 
            WHERE description LIKE '%company_departments%'
        )
    FROM company_users cu
    WHERE cu.department_id IS NOT NULL;
")
echo "Update summary:${UPDATE_SUMMARY}"

# 显示具体要更新的用户
echo -e "${BLUE}Users with department references:${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        cu.id,
        cu.name,
        cu.department_id,
        cd.name as department_name,
        c.company_name
    FROM company_users cu
    JOIN company_departments cd ON cu.department_id = cd.id
    JOIN companies c ON cd.company_id = c.id
    WHERE cu.department_id IS NOT NULL
    ORDER BY cu.id;
"

# 确认执行
read -p "Do you want to proceed with updating department_id foreign key references? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled by user${NC}"
    exit 0
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

# 验证结果
echo -e "${YELLOW}Verifying migration results...${NC}"
VERIFICATION_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        'Updated users: ' || COUNT(cu.id) ||
        ', Valid enterprise_department references: ' || COUNT(ed.id)
    FROM company_users cu
    JOIN enterprise_departments ed ON cu.department_id = ed.id
    WHERE cu.department_id IS NOT NULL;
")
echo "Verification results:${VERIFICATION_RESULT}"

# 显示更新后的用户部门关联
echo -e "${BLUE}Updated user-department associations:${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        cu.id,
        cu.name as user_name,
        ed.name as department_name,
        e.name as enterprise_name
    FROM company_users cu
    JOIN enterprise_departments ed ON cu.department_id = ed.id
    JOIN enterprises e ON ed.enterprise_id = e.id
    WHERE cu.department_id IS NOT NULL
    ORDER BY cu.id;
"

echo -e "${GREEN}=== Migration completed successfully ===${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test application functionality with updated department references"
echo "2. Verify user authentication and authorization work correctly"
echo "3. Consider dropping company_departments table after full verification"
echo

unset PGPASSWORD