#!/bin/bash

# Performance Test Script for Global Tasks Query
# This script creates test data and measures query performance

set -e

echo "🚀 Starting Global Tasks Performance Test..."

# Configuration
DB_CONTAINER="postgres_db"
DB_USER="user"
DB_NAME="main_db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to execute SQL and measure time
execute_sql_with_timing() {
    local sql="$1"
    local description="$2"
    
    echo -e "${BLUE}Testing: $description${NC}"
    
    # Execute SQL with timing
    result=$(docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "\timing on" -c "$sql" | grep "Time:")
    
    if [ -n "$result" ]; then
        echo -e "${GREEN}✅ $result${NC}"
    else
        echo -e "${RED}❌ No timing result${NC}"
    fi
    echo ""
}

# Function to get current data counts
get_data_counts() {
    echo -e "${YELLOW}📊 Current Data Counts:${NC}"
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    SELECT 
        'Projects' as table_name, 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count
    FROM projects
    UNION ALL
    SELECT 
        'Tasks' as table_name, 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count
    FROM tasks
    UNION ALL
    SELECT 
        'Users' as table_name, 
        COUNT(*) as total_count,
        COUNT(*) as active_count
    FROM users;
    "
    echo ""
}

# Function to create test data
create_test_data() {
    local num_projects=${1:-10}
    local num_users=${2:-50}
    local num_tasks_per_project=${3:-100}
    
    echo -e "${YELLOW}🏗️  Creating test data...${NC}"
    echo "Projects: $num_projects"
    echo "Users: $num_users"
    echo "Tasks per project: $num_tasks_per_project"
    echo ""
    
    # Create test users
    echo -e "${BLUE}Creating $num_users test users...${NC}"
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    INSERT INTO users (username, password_hash, role)
    SELECT 
        'test_user_' || generate_series,
        '\$2a\$10\$dummy.hash.for.testing.purposes.only',
        CASE WHEN generate_series % 10 = 0 THEN 'admin' ELSE 'user' END
    FROM generate_series(1, $num_users)
    ON CONFLICT (username) DO NOTHING;
    "
    
    # Create test projects
    echo -e "${BLUE}Creating $num_projects test projects...${NC}"
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    INSERT INTO projects (name, description, owner_id)
    SELECT 
        'Test Project ' || generate_series,
        'Generated test project for performance testing',
        (SELECT id FROM users ORDER BY RANDOM() LIMIT 1)
    FROM generate_series(1, $num_projects)
    ON CONFLICT DO NOTHING;
    "
    
    # Create test tasks with hierarchy
    echo -e "${BLUE}Creating tasks with hierarchy...${NC}"
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    DO \$\$
    DECLARE
        project_rec RECORD;
        i INTEGER;
        j INTEGER;
        parent_task_id INTEGER;
        task_count INTEGER := $num_tasks_per_project;
    BEGIN
        FOR project_rec IN (SELECT id FROM projects WHERE name LIKE 'Test Project %') LOOP
            -- Create root tasks (70% of total)
            FOR i IN 1..(task_count * 0.7)::INTEGER LOOP
                INSERT INTO tasks (
                    project_id, 
                    title, 
                    description, 
                    status,
                    assignee_id,
                    due_date,
                    custom_fields,
                    parent_id,
                    sort_order
                ) VALUES (
                    project_rec.id,
                    'Root Task ' || i || ' for Project ' || project_rec.id,
                    'Generated root task for performance testing',
                    (ARRAY['todo', 'in_progress', 'completed', 'cancelled'])[floor(random() * 4 + 1)],
                    (SELECT id FROM users ORDER BY RANDOM() LIMIT 1),
                    CURRENT_DATE + (random() * 365)::INTEGER,
                    jsonb_build_object(
                        'priority', (ARRAY['low', 'medium', 'high', 'urgent'])[floor(random() * 4 + 1)],
                        'estimated_hours', floor(random() * 40 + 1),
                        'progress', floor(random() * 101),
                        'tags', ARRAY['tag' || floor(random() * 10 + 1)]
                    ),
                    NULL,
                    i
                );
            END LOOP;
            
            -- Create subtasks (30% of total)
            FOR i IN 1..(task_count * 0.3)::INTEGER LOOP
                -- Get a random parent task from this project
                SELECT id INTO parent_task_id 
                FROM tasks 
                WHERE project_id = project_rec.id 
                  AND parent_id IS NULL 
                  AND deleted_at IS NULL
                ORDER BY RANDOM() 
                LIMIT 1;
                
                IF parent_task_id IS NOT NULL THEN
                    INSERT INTO tasks (
                        project_id, 
                        title, 
                        description, 
                        status,
                        assignee_id,
                        due_date,
                        custom_fields,
                        parent_id,
                        sort_order
                    ) VALUES (
                        project_rec.id,
                        'Subtask ' || i || ' for Task ' || parent_task_id,
                        'Generated subtask for performance testing',
                        (ARRAY['todo', 'in_progress', 'completed'])[floor(random() * 3 + 1)],
                        (SELECT id FROM users ORDER BY RANDOM() LIMIT 1),
                        CURRENT_DATE + (random() * 365)::INTEGER,
                        jsonb_build_object(
                            'priority', (ARRAY['low', 'medium', 'high'])[floor(random() * 3 + 1)],
                            'estimated_hours', floor(random() * 20 + 1),
                            'progress', floor(random() * 101)
                        ),
                        parent_task_id,
                        i
                    );
                END IF;
            END LOOP;
        END LOOP;
    END
    \$\$;
    "
    
    echo -e "${GREEN}✅ Test data created successfully!${NC}"
    echo ""
}

# Function to run performance tests
run_performance_tests() {
    echo -e "${YELLOW}🧪 Running Performance Tests...${NC}"
    
    # Test 1: Basic global tasks query (current implementation)
    execute_sql_with_timing "
    SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date, 
           t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.created_at, t.updated_at,
           p.name as project_name, u.username as assignee_name,
           COALESCE(c.children_count, 0) as children_count
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN (
        SELECT parent_id, COUNT(*) as children_count 
        FROM tasks 
        WHERE deleted_at IS NULL AND parent_id IS NOT NULL 
        GROUP BY parent_id
    ) c ON t.id = c.parent_id
    WHERE t.deleted_at IS NULL
    ORDER BY t.created_at DESC
    LIMIT 20;" \
    "Global tasks query (first 20 records)"
    
    # Test 2: Global tasks query with larger limit
    execute_sql_with_timing "
    SELECT t.id, t.project_id, t.title, t.status, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.deleted_at IS NULL
    ORDER BY t.created_at DESC
    LIMIT 100;" \
    "Simplified global tasks query (first 100 records)"
    
    # Test 3: Using optimized view
    execute_sql_with_timing "
    SELECT id, project_id, title, status, project_name, assignee_name, children_count
    FROM global_tasks_optimized
    ORDER BY created_at DESC
    LIMIT 20;" \
    "Optimized view query (first 20 records)"
    
    # Test 4: Count query performance
    execute_sql_with_timing "
    SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL;" \
    "Count total active tasks"
    
    # Test 5: Hierarchical query performance
    execute_sql_with_timing "
    WITH RECURSIVE task_hierarchy AS (
        SELECT id, title, parent_id, task_level, ARRAY[id] as path
        FROM tasks 
        WHERE parent_id IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT t.id, t.title, t.parent_id, t.task_level, th.path || t.id
        FROM tasks t
        JOIN task_hierarchy th ON t.parent_id = th.id
        WHERE t.deleted_at IS NULL AND array_length(th.path, 1) < 10
    )
    SELECT COUNT(*) FROM task_hierarchy;" \
    "Recursive hierarchy query count"
    
    # Test 6: Project-specific query
    execute_sql_with_timing "
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.project_id = (SELECT id FROM projects LIMIT 1)
      AND t.deleted_at IS NULL
    ORDER BY t.created_at DESC;" \
    "Project-specific tasks query"
    
    # Test 7: Status filter performance
    execute_sql_with_timing "
    SELECT COUNT(*) 
    FROM tasks 
    WHERE status = 'in_progress' AND deleted_at IS NULL;" \
    "Status filter query"
    
    # Test 8: Assignee filter performance
    execute_sql_with_timing "
    SELECT t.*, u.username
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.assignee_id = (SELECT id FROM users LIMIT 1)
      AND t.deleted_at IS NULL;" \
    "Assignee filter query"
}

# Function to analyze query plans
analyze_query_plans() {
    echo -e "${YELLOW}📋 Analyzing Query Plans...${NC}"
    
    echo -e "${BLUE}Query Plan for Global Tasks Query:${NC}"
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT t.id, t.project_id, t.title, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.deleted_at IS NULL
    ORDER BY t.created_at DESC
    LIMIT 20;
    "
    echo ""
    
    echo -e "${BLUE}Query Plan for Optimized View:${NC}"
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, project_id, title, project_name
    FROM global_tasks_optimized
    ORDER BY created_at DESC
    LIMIT 20;
    "
    echo ""
}

# Function to check index usage
check_index_usage() {
    echo -e "${YELLOW}📊 Index Usage Statistics:${NC}"
    
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
    FROM pg_stat_user_indexes 
    WHERE tablename IN ('tasks', 'projects', 'users')
      AND idx_scan > 0
    ORDER BY idx_scan DESC;
    "
    echo ""
}

# Function to cleanup test data
cleanup_test_data() {
    echo -e "${YELLOW}🧹 Cleaning up test data...${NC}"
    
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "
    DELETE FROM tasks WHERE title LIKE '%for performance testing%';
    DELETE FROM projects WHERE name LIKE 'Test Project %';
    DELETE FROM users WHERE username LIKE 'test_user_%';
    "
    
    # Vacuum to reclaim space
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;"
    
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${GREEN}🎯 Global Tasks Performance Test Suite${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    
    # Check if we should create test data
    if [[ "$1" == "--create-data" ]]; then
        create_test_data ${2:-10} ${3:-50} ${4:-100}
    fi
    
    # Show current data counts
    get_data_counts
    
    # Run performance tests
    run_performance_tests
    
    # Analyze query plans
    if [[ "$1" == "--analyze" || "$2" == "--analyze" ]]; then
        analyze_query_plans
    fi
    
    # Check index usage
    check_index_usage
    
    # Cleanup if requested
    if [[ "$1" == "--cleanup" || "$2" == "--cleanup" || "$3" == "--cleanup" ]]; then
        cleanup_test_data
    fi
    
    echo -e "${GREEN}✅ Performance testing completed!${NC}"
    
    # Recommendations
    echo -e "${YELLOW}💡 Recommendations:${NC}"
    echo "1. If any query takes > 100ms, consider additional optimizations"
    echo "2. Monitor index usage - unused indexes should be dropped"
    echo "3. Consider query result caching for frequently accessed data"
    echo "4. Use LIMIT and OFFSET for pagination in production"
    echo ""
}

# Help function
show_help() {
    echo "Global Tasks Performance Test Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --create-data [projects] [users] [tasks_per_project]"
    echo "                    Create test data (default: 10 projects, 50 users, 100 tasks/project)"
    echo "  --analyze         Include query plan analysis"
    echo "  --cleanup         Remove test data after testing"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run tests with existing data"
    echo "  $0 --create-data                      # Create default test data and run tests"
    echo "  $0 --create-data 20 100 200          # Create larger test dataset"
    echo "  $0 --create-data --analyze --cleanup  # Full test cycle with cleanup"
    echo ""
}

# Parse arguments
if [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"