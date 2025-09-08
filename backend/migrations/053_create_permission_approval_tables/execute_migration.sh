#!/bin/bash

# Migration 053: Create Permission Approval System Tables
# Execute this script to create the complete permission approval system

set -e  # Exit on any error

# Default database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-dev_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password_2024}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Migration 053: Permission Approval System Tables${NC}"
echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "User: $DB_USER"
echo

# Function to execute SQL and handle errors
execute_sql() {
    local sql_file="$1"
    local description="$2"
    
    echo -e "${YELLOW}Executing: $description${NC}"
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"; then
        echo -e "${GREEN}✅ Success: $description${NC}"
    else
        echo -e "${RED}❌ Failed: $description${NC}"
        exit 1
    fi
    echo
}

# Check if migration file exists
MIGRATION_FILE="$(dirname "$0")/migration.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your database configuration and ensure PostgreSQL is running."
    exit 1
fi
echo

# Execute the migration
execute_sql "$MIGRATION_FILE" "Creating Permission Approval System Tables"

# Verify the migration was successful by checking if tables exist
echo -e "${YELLOW}Verifying migration...${NC}"

# Check if all expected tables exist
EXPECTED_TABLES=(
    "permission_approval_requests"
    "permission_approval_steps"
    "approval_workflows"
    "approval_delegations"
    "approval_escalations"
    "approval_notifications"
    "approval_audit_logs"
)

echo "Checking for created tables:"
for table in "${EXPECTED_TABLES[@]}"; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\\dt $table" | grep -q "$table"; then
        echo -e "${GREEN}✅ Table exists: $table${NC}"
    else
        echo -e "${RED}❌ Table missing: $table${NC}"
        exit 1
    fi
done

echo

# Check enum types
echo "Checking for created enum types:"
EXPECTED_ENUMS=(
    "approval_status"
    "approval_priority"
    "approval_workflow_type"
    "escalation_type"
    "notification_status"
)

for enum_type in "${EXPECTED_ENUMS[@]}"; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\\dT $enum_type" | grep -q "$enum_type"; then
        echo -e "${GREEN}✅ Enum type exists: $enum_type${NC}"
    else
        echo -e "${RED}❌ Enum type missing: $enum_type${NC}"
        exit 1
    fi
done

echo

# Show sample data
echo -e "${YELLOW}Checking sample workflow data...${NC}"
WORKFLOW_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM approval_workflows;")
echo "Sample approval workflows created: $WORKFLOW_COUNT"

if [ "$WORKFLOW_COUNT" -gt 0 ]; then
    echo -e "${GREEN}Sample workflows:${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            id,
            name,
            workflow_type,
            permission_code_pattern,
            priority_threshold,
            is_active
        FROM approval_workflows 
        ORDER BY id;
    "
fi

echo
echo -e "${GREEN}🎉 Migration 053 completed successfully!${NC}"
echo
echo -e "${YELLOW}Permission Approval System is now ready with the following components:${NC}"
echo "📋 Permission approval requests and workflow management"
echo "⚡ Multi-step approval processes (sequential, parallel, majority, conditional)"
echo "🔄 Delegation and escalation capabilities"
echo "🔔 Notification and reminder system"
echo "📊 Comprehensive audit logging"
echo "📈 Approval statistics and reporting"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure approval workflows for your organization"
echo "2. Set up user roles and approval hierarchies"
echo "3. Test the approval system with sample requests"
echo "4. Configure notification channels (email, etc.)"