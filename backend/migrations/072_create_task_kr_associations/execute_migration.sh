#!/bin/bash

# Migration script for task-key result associations
MIGRATION_NAME="072_create_task_kr_associations"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default database connection parameters
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

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed or not in PATH"
        exit 1
    fi
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\q" 2>/dev/null; then
        log_info "Database connection successful"
        return 0
    else
        log_error "Failed to connect to database"
        log_error "Connection details: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
        return 1
    fi
}

# Execute SQL file
execute_sql() {
    local sql_file="$1"
    local description="$2"
    
    if [[ ! -f "$sql_file" ]]; then
        log_error "SQL file not found: $sql_file"
        return 1
    fi
    
    log_info "$description"
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"; then
        log_info "$description completed successfully"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Run migration up
migrate_up() {
    log_info "Running migration: $MIGRATION_NAME (UP)"
    execute_sql "$SCRIPT_DIR/up.sql" "Creating task-key result associations table"
}

# Run migration down
migrate_down() {
    log_info "Running migration: $MIGRATION_NAME (DOWN)"
    execute_sql "$SCRIPT_DIR/down.sql" "Dropping task-key result associations table"
}

# Check migration status
check_status() {
    log_info "Checking migration status..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            CASE 
                WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_key_result_associations')
                THEN 'task_key_result_associations table: ✓ EXISTS'
                ELSE 'task_key_result_associations table: ✗ NOT EXISTS'
            END as status;
            
        SELECT 
            count(*) as association_count,
            'Total task-KR associations' as description
        FROM task_key_result_associations 
        WHERE deleted_at IS NULL;"
}

# Main script logic
main() {
    check_dependencies
    
    if ! test_connection; then
        exit 1
    fi
    
    case "${1:-up}" in
        "up")
            migrate_up
            ;;
        "down")
            migrate_down
            ;;
        "status")
            check_status
            ;;
        *)
            echo "Usage: $0 {up|down|status}"
            echo "  up     - Create task-key result associations table"
            echo "  down   - Drop task-key result associations table"
            echo "  status - Check migration status"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"