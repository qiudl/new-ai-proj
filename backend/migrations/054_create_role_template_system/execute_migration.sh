#!/bin/bash

# Migration 054: Create Role Template System - Execution Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Migration details
MIGRATION_NAME="054_create_role_template_system"
MIGRATION_DESCRIPTION="Create comprehensive role template management system"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Executing Migration: $MIGRATION_NAME${NC}"
echo -e "${BLUE}Description: $MIGRATION_DESCRIPTION${NC}"
echo -e "${BLUE}================================================${NC}"

# Database connection parameters with defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo -e "${YELLOW}Database Connection:${NC}"
echo -e "  Host: $DB_HOST"
echo -e "  Port: $DB_PORT"  
echo -e "  Database: $DB_NAME"
echo -e "  User: $DB_USER"
echo ""

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/migration.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Executing migration file: $MIGRATION_FILE${NC}"
echo ""

# Set PGPASSWORD environment variable to avoid password prompt
export PGPASSWORD="$DB_PASSWORD"

# Execute the migration
echo -e "${BLUE}Running migration...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Migration executed successfully!${NC}"
    
    # Verify tables were created
    echo -e "${YELLOW}Verifying created tables...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        tableowner
    FROM pg_tables 
    WHERE tablename LIKE 'role_template%'
    ORDER BY tablename;
    "
    
    # Verify enum types were created
    echo -e "${YELLOW}Verifying created enum types...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        typname as enum_name,
        array_agg(enumlabel ORDER BY enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname IN ('template_category', 'inheritance_type', 'template_usage_type', 'tag_category')
    GROUP BY typname
    ORDER BY typname;
    "
    
    # Show initial template data
    echo -e "${YELLOW}Verifying default templates...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        template_code,
        template_name,
        category,
        level,
        is_system_template
    FROM role_templates 
    ORDER BY level;
    "
    
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Migration $MIGRATION_NAME completed successfully!${NC}"
    echo -e "${GREEN}Role template system is now available.${NC}"
    echo -e "${GREEN}================================================${NC}"
    
else
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"
    echo -e "${RED}Please check the error messages above.${NC}"
    exit 1
fi

# Unset password variable
unset PGPASSWORD