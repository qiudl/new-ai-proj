-- Rollback Migration: Drop User Statistics Database Views
-- Date: 2025-08-26
-- Description: Drops all user statistics views created in 027_user_statistics_views.sql

-- Drop all user statistics views
DROP VIEW IF EXISTS user_performance_view;
DROP VIEW IF EXISTS user_registration_trends_view;
DROP VIEW IF EXISTS user_company_stats_view;
DROP VIEW IF EXISTS user_activity_stats_view;
DROP VIEW IF EXISTS user_role_stats_view;
DROP VIEW IF EXISTS user_basic_stats_view;

-- Drop performance indexes (only the ones we created for stats)
DROP INDEX CONCURRENTLY IF EXISTS idx_users_last_login_activity;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_creation_trend;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_status_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_tasks_assignee_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_task_time_logs_user_time;
