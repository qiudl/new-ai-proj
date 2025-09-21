#!/bin/bash

# Migration 075: Add archive metadata fields
# Description: Add archived_by and archive_reason fields to tasks table

set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
    set -o allexport
    source .env
    set +o allexport
fi

# Database connection parameters with defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to execute SQL file
execute_sql() {
    local sql_file="$1"
    echo "Executing: $sql_file"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 \
        -f "$sql_file"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [up|down]"
    echo "  up   - Apply migration (default)"
    echo "  down - Rollback migration"
    exit 1
}

# Parse command line arguments
ACTION="${1:-up}"

case "$ACTION" in
    "up")
        echo "🚀 Applying Migration 075: Add archive metadata fields"
        execute_sql "$SCRIPT_DIR/migration.sql"
        echo "✅ Migration 075 applied successfully"
        
        # Verify the migration
        echo "🔍 Verifying migration..."
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'tasks' AND column_name IN ('archived_by', 'archive_reason') ORDER BY column_name;"
        
        # Check indexes
        echo "🔍 Checking indexes..."
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' AND indexname LIKE '%archive%' ORDER BY indexname;"
        ;;
    "down")
        echo "⬇️  Rolling back Migration 075: Remove archive metadata fields"
        execute_sql "$SCRIPT_DIR/rollback.sql"
        echo "✅ Migration 075 rolled back successfully"
        ;;
    *)
        show_usage
        ;;
esac

echo "🎉 Migration 075 operation completed successfully!"