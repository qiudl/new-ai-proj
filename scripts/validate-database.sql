-- Database Validation Script
-- This script validates the database structure and data integrity
-- Run this after init.sql to ensure everything is set up correctly

-- Display database information
SELECT 
    'Database validation started at: ' || NOW() as status;

-- ---
-- Table Structure Validation
-- ---

-- Check if all required tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'projects', 'tasks');
    
    IF table_count = 3 THEN
        RAISE NOTICE 'All required tables exist';
    ELSE
        RAISE EXCEPTION 'Missing required tables. Expected 3, found %', table_count;
    END IF;
END $$;

-- Check column existence and types
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'projects', 'tasks')
ORDER BY table_name, ordinal_position;

-- ---
-- Index Validation
-- ---

-- Check if all required indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('users', 'projects', 'tasks')
ORDER BY tablename, indexname;

-- ---
-- Constraint Validation
-- ---

-- Check constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('users', 'projects', 'tasks')
ORDER BY tc.table_name, tc.constraint_type;

-- ---
-- Data Validation
-- ---

-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'projects' as table_name, COUNT(*) as record_count FROM projects
UNION ALL
SELECT 'tasks' as table_name, COUNT(*) as record_count FROM tasks;

-- Validate user data
SELECT 
    id,
    username,
    role,
    LENGTH(password_hash) as password_hash_length,
    created_at,
    updated_at
FROM users
ORDER BY id;

-- Validate project data
SELECT 
    id,
    name,
    owner_id,
    (SELECT username FROM users WHERE id = p.owner_id) as owner_username,
    created_at,
    updated_at
FROM projects p
ORDER BY id;

-- Validate task data and relationships
SELECT 
    t.id,
    t.title,
    t.status,
    t.project_id,
    p.name as project_name,
    t.assignee_id,
    u.username as assignee_username,
    t.due_date,
    t.created_at,
    t.updated_at,
    CASE 
        WHEN t.custom_fields IS NULL THEN 'No custom fields'
        ELSE jsonb_typeof(t.custom_fields)
    END as custom_fields_type
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assignee_id = u.id
ORDER BY t.id;

-- ---
-- View Validation
-- ---

-- Test project task stats view
SELECT 
    'project_task_stats' as view_name,
    COUNT(*) as record_count
FROM project_task_stats;

SELECT * FROM project_task_stats ORDER BY project_id;

-- Test user task assignments view
SELECT 
    'user_task_assignments' as view_name,
    COUNT(*) as record_count
FROM user_task_assignments;

SELECT * FROM user_task_assignments ORDER BY user_id;

-- Test overdue tasks view
SELECT 
    'overdue_tasks' as view_name,
    COUNT(*) as record_count
FROM overdue_tasks;

-- ---
-- Function Validation
-- ---

-- Test get_project_progress function
SELECT 
    'get_project_progress' as function_name,
    project_id,
    total_tasks,
    completed_tasks,
    progress_percentage
FROM (
    SELECT 1 as project_id
    UNION ALL SELECT 2
    UNION ALL SELECT 3
) p
CROSS JOIN LATERAL get_project_progress(p.project_id);

-- Test get_user_task_summary function
SELECT 
    'get_user_task_summary' as function_name,
    user_id,
    total_assigned,
    completed,
    in_progress,
    todo,
    overdue
FROM (
    SELECT 1 as user_id
    UNION ALL SELECT 2
    UNION ALL SELECT 3
) u
CROSS JOIN LATERAL get_user_task_summary(u.user_id);

-- ---
-- Custom Fields Validation
-- ---

-- Test JSONB custom fields functionality
SELECT 
    'JSONB custom fields test' as test_name,
    t.id,
    t.title,
    t.custom_fields,
    t.custom_fields->>'priority' as priority,
    t.custom_fields->>'estimated_hours' as estimated_hours,
    t.custom_fields->>'category' as category,
    t.custom_fields->'tags' as tags
FROM tasks t
WHERE t.custom_fields IS NOT NULL
ORDER BY t.id
LIMIT 5;

-- Test JSONB queries
SELECT 
    'JSONB query test' as test_name,
    COUNT(*) as high_priority_tasks
FROM tasks 
WHERE custom_fields->>'priority' = 'high';

SELECT 
    'JSONB array query test' as test_name,
    COUNT(*) as tasks_with_docker_tag
FROM tasks 
WHERE custom_fields->'tags' ? 'docker';

-- ---
-- Performance Test
-- ---

-- Test index usage with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tasks WHERE project_id = 1 AND status = 'todo';

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tasks WHERE custom_fields->>'priority' = 'high';

-- ---
-- Final Validation Summary
-- ---

DO $$
DECLARE
    user_count INTEGER;
    project_count INTEGER;
    task_count INTEGER;
    index_count INTEGER;
    constraint_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO task_count FROM tasks;
    
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'projects', 'tasks');
    
    SELECT COUNT(*) INTO constraint_count 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'projects', 'tasks');
    
    SELECT COUNT(*) INTO view_count 
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO function_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION';
    
    RAISE NOTICE '=== DATABASE VALIDATION SUMMARY ===';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Projects: %', project_count;
    RAISE NOTICE 'Tasks: %', task_count;
    RAISE NOTICE 'Indexes: %', index_count;
    RAISE NOTICE 'Constraints: %', constraint_count;
    RAISE NOTICE 'Views: %', view_count;
    RAISE NOTICE 'Functions: %', function_count;
    
    IF user_count >= 3 AND project_count >= 3 AND task_count >= 10 THEN
        RAISE NOTICE 'Database validation PASSED! All checks completed successfully.';
    ELSE
        RAISE EXCEPTION 'Database validation FAILED! Insufficient data found.';
    END IF;
END $$;

SELECT 'Database validation completed at: ' || NOW() as status;