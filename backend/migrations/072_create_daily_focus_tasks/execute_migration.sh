#!/bin/bash

# 072_create_daily_focus_tasks migration execution script
# Description: Execute daily focus tasks table creation migration

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Database configuration with defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-dev_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password_2024}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to execute SQL file
execute_sql() {
    local sql_file="$1"
    local description="$2"
    
    print_status "$description"
    
    if [ ! -f "$sql_file" ]; then
        print_error "SQL file not found: $sql_file"
        exit 1
    fi
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"; then
        print_status "✅ $description completed successfully"
    else
        print_error "❌ $description failed"
        exit 1
    fi
}

# Function to check if tables exist
check_tables_exist() {
    print_status "Checking if daily focus tables exist..."
    
    local table_check=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('daily_focus_tasks', 'daily_task_templates', 'template_tasks', 'daily_task_stats');
    " | tr -d ' ')
    
    echo "$table_check"
}

# Main execution
main() {
    local action="${1:-up}"
    
    print_status "🚀 Starting daily focus tasks migration (action: $action)"
    print_status "Database: $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"
    
    # Test database connection
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        print_error "Cannot connect to database. Please check your database configuration."
        exit 1
    fi
    
    case "$action" in
        "up")
            existing_tables=$(check_tables_exist)
            if [ "$existing_tables" -gt 0 ]; then
                print_warning "Some daily focus tables already exist ($existing_tables/4). Continue? (y/N)"
                read -r response
                if [[ ! "$response" =~ ^[Yy]$ ]]; then
                    print_status "Migration cancelled."
                    exit 0
                fi
            fi
            
            execute_sql "$SCRIPT_DIR/up.sql" "Creating daily focus tasks tables"
            
            # Verify migration
            final_count=$(check_tables_exist)
            if [ "$final_count" -eq 4 ]; then
                print_status "✅ Migration completed successfully! All 4 tables created."
            else
                print_error "❌ Migration verification failed. Expected 4 tables, found $final_count"
                exit 1
            fi
            ;;
            
        "down")
            existing_tables=$(check_tables_exist)
            if [ "$existing_tables" -eq 0 ]; then
                print_warning "No daily focus tables found to drop."
                exit 0
            fi
            
            print_warning "This will DROP all daily focus tasks tables and data. Continue? (y/N)"
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                print_status "Rollback cancelled."
                exit 0
            fi
            
            execute_sql "$SCRIPT_DIR/down.sql" "Dropping daily focus tasks tables"
            
            # Verify rollback
            final_count=$(check_tables_exist)
            if [ "$final_count" -eq 0 ]; then
                print_status "✅ Rollback completed successfully! All tables dropped."
            else
                print_error "❌ Rollback verification failed. $final_count tables still exist"
                exit 1
            fi
            ;;
            
        *)
            print_error "Invalid action: $action. Use 'up' or 'down'"
            exit 1
            ;;
    esac
    
    print_status "🎉 Daily focus tasks migration $action completed!"
}

# Show usage if --help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [up|down]"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST     Database host (default: localhost)"
    echo "  DB_PORT     Database port (default: 5432)"
    echo "  DB_NAME     Database name (default: ai_project_db)"
    echo "  DB_USER     Database user (default: dev_user)"
    echo "  DB_PASSWORD Database password (default: dev_password_2024)"
    echo ""
    echo "Examples:"
    echo "  $0 up                    # Apply migration"
    echo "  $0 down                  # Rollback migration"
    exit 0
fi

main "$@"