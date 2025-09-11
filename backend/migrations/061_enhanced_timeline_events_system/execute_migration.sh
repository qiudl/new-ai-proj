#!/bin/bash

# Enhanced Timeline Events System Migration
# Migration 061: Create comprehensive timeline events table with enhanced metadata support

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SQL="$SCRIPT_DIR/migration.sql"

# Default database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if psql is available
if ! command_exists psql; then
    print_error "psql is not installed or not in PATH"
    exit 1
fi

# Function to execute SQL with error handling
execute_sql() {
    local sql="$1"
    local description="$2"
    
    print_status "Executing: $description"
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql" >/dev/null 2>&1; then
        print_success "$description completed successfully"
        return 0
    else
        print_error "$description failed"
        return 1
    fi
}

# Function to execute SQL file
execute_sql_file() {
    local file="$1"
    local description="$2"
    
    print_status "Executing file: $file"
    print_status "Description: $description"
    
    if [ ! -f "$file" ]; then
        print_error "SQL file not found: $file"
        return 1
    fi
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"; then
        print_success "$description completed successfully"
        return 0
    else
        print_error "$description failed"
        return 1
    fi
}

# Function to check database connectivity
check_database_connection() {
    print_status "Checking database connection..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Failed to connect to database"
        print_error "Connection details: Host=$DB_HOST, Port=$DB_PORT, DB=$DB_NAME, User=$DB_USER"
        return 1
    fi
}

# Function to check if migration is needed
check_migration_needed() {
    print_status "Checking if migration is needed..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    # Check if the new table already exists
    local table_exists
    table_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_timeline_events');" 2>/dev/null | tr -d ' ')
    
    if [ "$table_exists" = "t" ]; then
        print_warning "task_timeline_events table already exists"
        
        # Check if table has the new enhanced columns
        local has_enhanced_columns
        has_enhanced_columns=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'task_timeline_events' AND column_name = 'correlation_id');" 2>/dev/null | tr -d ' ')
        
        if [ "$has_enhanced_columns" = "t" ]; then
            print_warning "Enhanced timeline events system already appears to be installed"
            return 1
        else
            print_status "Table exists but needs enhancement. Proceeding with migration..."
            return 0
        fi
    else
        print_status "task_timeline_events table does not exist. Migration needed."
        return 0
    fi
}

# Function to backup existing data
backup_existing_data() {
    print_status "Backing up existing timeline data..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    # Check if old timeline table exists
    local old_table_exists
    old_table_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_status_history');" 2>/dev/null | tr -d ' ')
    
    if [ "$old_table_exists" = "t" ]; then
        local backup_file="timeline_backup_$(date +%Y%m%d_%H%M%S).sql"
        print_status "Creating backup: $backup_file"
        
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t task_status_history > "$backup_file"; then
            print_success "Backup created: $backup_file"
        else
            print_warning "Backup creation failed, but continuing with migration"
        fi
    fi
}

# Function to create database schema
create_schema() {
    print_status "Creating enhanced timeline events schema..."
    
    if execute_sql_file "$MIGRATION_SQL" "Enhanced timeline events system migration"; then
        return 0
    else
        return 1
    fi
}

# Function to verify migration
verify_migration() {
    print_status "Verifying migration..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    # Check if table was created successfully
    local table_exists
    table_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_timeline_events');" 2>/dev/null | tr -d ' ')
    
    if [ "$table_exists" = "t" ]; then
        print_success "task_timeline_events table created successfully"
        
        # Check column count
        local column_count
        column_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'task_timeline_events';" 2>/dev/null | tr -d ' ')
        
        print_status "task_timeline_events table has $column_count columns"
        
        # Check if views were created
        local view_exists
        view_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT EXISTS (SELECT FROM information_schema.views WHERE table_name = 'v_enhanced_timeline_events');" 2>/dev/null | tr -d ' ')
        
        if [ "$view_exists" = "t" ]; then
            print_success "Enhanced timeline views created successfully"
        else
            print_warning "Enhanced timeline views may not have been created properly"
        fi
        
        # Check if functions were created
        local function_exists
        function_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_enhanced_task_timeline');" 2>/dev/null | tr -d ' ')
        
        if [ "$function_exists" = "t" ]; then
            print_success "Enhanced timeline functions created successfully"
        else
            print_warning "Enhanced timeline functions may not have been created properly"
        fi
        
        return 0
    else
        print_error "task_timeline_events table was not created"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "Enhanced Timeline Events System Migration Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help                    Show this help message"
    echo "  --dry-run                 Show what would be done without executing"
    echo "  --force                   Force migration even if table exists"
    echo "  --verify-only             Only verify if migration was successful"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST                   Database host (default: localhost)"
    echo "  DB_PORT                   Database port (default: 5432)"
    echo "  DB_NAME                   Database name (default: ai_project_db)"
    echo "  DB_USER                   Database user (default: postgres)"
    echo "  DB_PASSWORD               Database password"
    echo ""
    echo "Example:"
    echo "  DB_HOST=localhost DB_PORT=5433 DB_NAME=ai_project_db \\"
    echo "  DB_USER=dev_user DB_PASSWORD=dev_password_2024 $0"
}

# Main execution function
main() {
    local dry_run=false
    local force=false
    local verify_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                show_help
                exit 0
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --verify-only)
                verify_only=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    print_status "Starting Enhanced Timeline Events System Migration"
    print_status "Database: $DB_HOST:$DB_PORT/$DB_NAME (User: $DB_USER)"
    
    if [ "$dry_run" = true ]; then
        print_status "DRY RUN MODE - No changes will be made"
        print_status "Would execute migration: $MIGRATION_SQL"
        exit 0
    fi
    
    if [ "$verify_only" = true ]; then
        if verify_migration; then
            print_success "Migration verification passed"
            exit 0
        else
            print_error "Migration verification failed"
            exit 1
        fi
    fi
    
    # Check database connection
    if ! check_database_connection; then
        exit 1
    fi
    
    # Check if migration is needed (unless forced)
    if [ "$force" = false ] && ! check_migration_needed; then
        print_success "Migration not needed or already completed"
        exit 0
    fi
    
    # Backup existing data
    backup_existing_data
    
    # Execute migration
    if create_schema; then
        print_success "Schema creation completed"
    else
        print_error "Schema creation failed"
        exit 1
    fi
    
    # Verify migration
    if verify_migration; then
        print_success "Enhanced Timeline Events System Migration completed successfully!"
        print_status ""
        print_status "Next steps:"
        print_status "1. Update your application to use the new timeline events API"
        print_status "2. Consider migrating existing timeline data if applicable"
        print_status "3. Test the new timeline functionality"
    else
        print_error "Migration verification failed"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"