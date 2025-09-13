#!/bin/bash

# 073_create_okr_advanced_analytics migration execution script
# Description: Execute OKR Phase 3 advanced analytics migration

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

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

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

check_tables_exist() {
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('okr_performance_metrics', 'okr_analytics_snapshots', 'okr_team_collaboration', 'okr_comments', 'okr_export_templates');
    " | tr -d ' ')
    
    echo "$table_count"
}

main() {
    local action="${1:-up}"
    
    print_status "🚀 Starting OKR advanced analytics migration (action: $action)"
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
                print_warning "Some OKR analytics tables already exist ($existing_tables/5). Continue? (y/N)"
                read -r response
                if [[ ! "$response" =~ ^[Yy]$ ]]; then
                    print_status "Migration cancelled."
                    exit 0
                fi
            fi
            
            execute_sql "$SCRIPT_DIR/up.sql" "Creating OKR advanced analytics tables"
            
            # Verify migration
            final_count=$(check_tables_exist)
            if [ "$final_count" -eq 5 ]; then
                print_status "✅ Migration completed successfully! All 5 tables created."
            else
                print_error "❌ Migration verification failed. Expected 5 tables, found $final_count"
                exit 1
            fi
            ;;
            
        "down")
            existing_tables=$(check_tables_exist)
            if [ "$existing_tables" -eq 0 ]; then
                print_warning "No OKR analytics tables found to drop."
                exit 0
            fi
            
            print_warning "This will DROP all OKR analytics tables and data. Continue? (y/N)"
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                print_status "Rollback cancelled."
                exit 0
            fi
            
            execute_sql "$SCRIPT_DIR/down.sql" "Dropping OKR advanced analytics tables"
            
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
    
    print_status "🎉 OKR advanced analytics migration $action completed!"
}

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [up|down]"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST     Database host (default: localhost)"
    echo "  DB_PORT     Database port (default: 5432)"  
    echo "  DB_NAME     Database name (default: ai_project_db)"
    echo "  DB_USER     Database user (default: dev_user)"
    echo "  DB_PASSWORD Database password (default: dev_password_2024)"
    exit 0
fi

main "$@"