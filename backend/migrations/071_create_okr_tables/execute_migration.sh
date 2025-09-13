#!/bin/bash

# Execute OKR tables migration
# Usage: ./execute_migration.sh [up|down]

set -e

# Default database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Migration direction (default: up)
DIRECTION=${1:-up}

if [ "$DIRECTION" != "up" ] && [ "$DIRECTION" != "down" ]; then
    echo "Error: Direction must be 'up' or 'down'"
    echo "Usage: $0 [up|down]"
    exit 1
fi

echo "🚀 Executing OKR tables migration: $DIRECTION"
echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"

# Execute migration
if [ "$DIRECTION" = "up" ]; then
    echo "📊 Creating OKR tables and sample data..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/up.sql"
    echo "✅ OKR tables created successfully"
else
    echo "🗑️  Dropping OKR tables..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/down.sql"
    echo "✅ OKR tables dropped successfully"
fi

echo "Migration completed: $DIRECTION"