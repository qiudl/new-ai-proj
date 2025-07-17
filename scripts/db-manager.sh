#!/bin/bash

# Database Management Script
# Provides utilities for managing the PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-main_db}
DB_USER=${DB_USER:-user}
DB_PASSWORD=${DB_PASSWORD:-password}

# Docker container name
CONTAINER_NAME=${CONTAINER_NAME:-postgres_db}

echo -e "${GREEN}📊 Database Management Tool${NC}"
echo "=================================="

# Function to check if database is running
check_db_connection() {
    echo -e "${YELLOW}🔍 Checking database connection...${NC}"
    
    if command -v docker &> /dev/null && docker ps | grep -q $CONTAINER_NAME; then
        echo -e "${GREEN}✅ Database container is running${NC}"
        
        # Test connection
        if docker exec -it $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection successful${NC}"
            return 0
        else
            echo -e "${RED}❌ Database connection failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Database container not found or not running${NC}"
        return 1
    fi
}

# Function to initialize database
init_database() {
    echo -e "${YELLOW}🚀 Initializing database...${NC}"
    
    if check_db_connection; then
        echo -e "${YELLOW}📝 Running init.sql script...${NC}"
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < init.sql
        echo -e "${GREEN}✅ Database initialized successfully${NC}"
    else
        echo -e "${RED}❌ Cannot initialize database - connection failed${NC}"
        exit 1
    fi
}

# Function to validate database
validate_database() {
    echo -e "${YELLOW}🔍 Validating database structure and data...${NC}"
    
    if check_db_connection; then
        echo -e "${YELLOW}📝 Running validation script...${NC}"
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < scripts/validate-database.sql
        echo -e "${GREEN}✅ Database validation completed${NC}"
    else
        echo -e "${RED}❌ Cannot validate database - connection failed${NC}"
        exit 1
    fi
}

# Function to reset database
reset_database() {
    echo -e "${YELLOW}⚠️  Resetting database (this will delete all data)...${NC}"
    read -p "Are you sure you want to reset the database? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if check_db_connection; then
            echo -e "${YELLOW}🗑️  Dropping all tables...${NC}"
            docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "
                DROP SCHEMA public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO $DB_USER;
                GRANT ALL ON SCHEMA public TO public;
            "
            echo -e "${GREEN}✅ Database reset completed${NC}"
            
            # Reinitialize
            init_database
        else
            echo -e "${RED}❌ Cannot reset database - connection failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⏸️  Database reset cancelled${NC}"
    fi
}

# Function to backup database
backup_database() {
    echo -e "${YELLOW}💾 Creating database backup...${NC}"
    
    if check_db_connection; then
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker exec -i $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_FILE
        echo -e "${GREEN}✅ Database backup created: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ Cannot backup database - connection failed${NC}"
        exit 1
    fi
}

# Function to restore database
restore_database() {
    echo -e "${YELLOW}📥 Restoring database from backup...${NC}"
    
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Please provide backup file path${NC}"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        echo -e "${RED}❌ Backup file not found: $1${NC}"
        exit 1
    fi
    
    if check_db_connection; then
        echo -e "${YELLOW}📝 Restoring from $1...${NC}"
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$1"
        echo -e "${GREEN}✅ Database restored successfully${NC}"
    else
        echo -e "${RED}❌ Cannot restore database - connection failed${NC}"
        exit 1
    fi
}

# Function to connect to database
connect_database() {
    echo -e "${YELLOW}🔗 Connecting to database...${NC}"
    
    if check_db_connection; then
        echo -e "${GREEN}Opening psql interactive session...${NC}"
        docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
    else
        echo -e "${RED}❌ Cannot connect to database${NC}"
        exit 1
    fi
}

# Function to show database stats
show_stats() {
    echo -e "${YELLOW}📊 Database Statistics${NC}"
    
    if check_db_connection; then
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "
            SELECT 
                'Users' as table_name, 
                COUNT(*) as record_count 
            FROM users
            UNION ALL
            SELECT 
                'Projects' as table_name, 
                COUNT(*) as record_count 
            FROM projects
            UNION ALL
            SELECT 
                'Tasks' as table_name, 
                COUNT(*) as record_count 
            FROM tasks;
        "
        
        echo -e "${GREEN}Project Task Statistics:${NC}"
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "
            SELECT * FROM project_task_stats ORDER BY project_id;
        "
    else
        echo -e "${RED}❌ Cannot show stats - connection failed${NC}"
        exit 1
    fi
}

# Function to run custom query
run_query() {
    echo -e "${YELLOW}🔍 Running custom query...${NC}"
    
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Please provide SQL query${NC}"
        echo "Usage: $0 query \"SELECT * FROM users;\""
        exit 1
    fi
    
    if check_db_connection; then
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "$1"
    else
        echo -e "${RED}❌ Cannot run query - connection failed${NC}"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    echo -e "${YELLOW}📋 Database Logs${NC}"
    docker logs $CONTAINER_NAME --tail 50 -f
}

# Main script
case "$1" in
    "init")
        init_database
        ;;
    "validate")
        validate_database
        ;;
    "reset")
        reset_database
        ;;
    "backup")
        backup_database
        ;;
    "restore")
        restore_database "$2"
        ;;
    "connect")
        connect_database
        ;;
    "stats")
        show_stats
        ;;
    "query")
        run_query "$2"
        ;;
    "logs")
        show_logs
        ;;
    "status")
        check_db_connection
        ;;
    *)
        echo "Usage: $0 {init|validate|reset|backup|restore|connect|stats|query|logs|status}"
        echo ""
        echo "Commands:"
        echo "  init      - Initialize database with schema and sample data"
        echo "  validate  - Validate database structure and data integrity"
        echo "  reset     - Reset database (WARNING: deletes all data)"
        echo "  backup    - Create database backup"
        echo "  restore   - Restore database from backup file"
        echo "  connect   - Connect to database via psql"
        echo "  stats     - Show database statistics"
        echo "  query     - Run custom SQL query"
        echo "  logs      - Show database logs"
        echo "  status    - Check database connection status"
        echo ""
        echo "Examples:"
        echo "  $0 init"
        echo "  $0 backup"
        echo "  $0 restore backup_20250717_143022.sql"
        echo "  $0 query \"SELECT * FROM users;\""
        echo "  $0 stats"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Operation completed successfully!${NC}"