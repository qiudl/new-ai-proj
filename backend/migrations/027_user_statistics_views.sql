-- Migration: Create User Statistics Database Views
-- Date: 2025-08-26
-- Description: Creates comprehensive user statistics views for dashboard and analytics

-- ===============================================
-- 1. Basic User Statistics View
-- ===============================================

CREATE OR REPLACE VIEW user_basic_stats_view AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_users,
    COUNT(CASE WHEN user_type = 'system' THEN 1 END) as system_users,
    COUNT(CASE WHEN user_type = 'company' THEN 1 END) as company_users,
    COUNT(CASE WHEN last_login_at IS NOT NULL AND last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_last_week,
    COUNT(CASE WHEN last_login_at IS NOT NULL AND last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_last_month,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_registrations_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_registrations_month
FROM users;

-- ===============================================
-- 2. User Role Distribution View
-- ===============================================

CREATE OR REPLACE VIEW user_role_stats_view AS
SELECT 
    role,
    user_type,
    COUNT(*) as user_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recently_active
FROM users
WHERE status != 'deleted'  -- Exclude soft deleted users if applicable
GROUP BY role, user_type
ORDER BY user_type, role;

-- ===============================================
-- 3. User Activity Statistics View
-- ===============================================

CREATE OR REPLACE VIEW user_activity_stats_view AS
SELECT
    u.id as user_id,
    u.username,
    u.email,
    u.user_type,
    u.role,
    u.status,
    u.last_login_at,
    u.created_at,
    -- Task assignment statistics
    COALESCE(task_stats.assigned_tasks, 0) as assigned_tasks,
    COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
    COALESCE(task_stats.in_progress_tasks, 0) as in_progress_tasks,
    -- Timer statistics
    COALESCE(timer_stats.total_time_minutes, 0) as total_time_minutes,
    COALESCE(timer_stats.active_sessions, 0) as active_timer_sessions,
    -- Login activity indicators
    CASE 
        WHEN u.last_login_at >= NOW() - INTERVAL '1 day' THEN 'today'
        WHEN u.last_login_at >= NOW() - INTERVAL '7 days' THEN 'this_week'
        WHEN u.last_login_at >= NOW() - INTERVAL '30 days' THEN 'this_month'
        WHEN u.last_login_at IS NOT NULL THEN 'older'
        ELSE 'never'
    END as login_activity
FROM users u
LEFT JOIN (
    SELECT 
        assignee_id,
        COUNT(*) as assigned_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks
    FROM tasks 
    WHERE assignee_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY assignee_id
) task_stats ON u.id = task_stats.assignee_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(EXTRACT(EPOCH FROM (ended_at - started_at))/60) as total_time_minutes,
        COUNT(CASE WHEN ended_at IS NULL THEN 1 END) as active_sessions
    FROM task_time_logs
    WHERE user_id IS NOT NULL
    GROUP BY user_id
) timer_stats ON u.id = timer_stats.user_id
WHERE u.status != 'deleted';  -- Exclude soft deleted users

-- ===============================================
-- 4. Company User Statistics View
-- ===============================================

CREATE OR REPLACE VIEW user_company_stats_view AS
SELECT
    c.id as company_id,
    c.company_name,
    c.company_code,
    COUNT(u.id) as total_company_users,
    COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_company_users,
    COUNT(CASE WHEN u.is_primary_contact = true THEN 1 END) as primary_contacts,
    COUNT(CASE WHEN u.last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recently_active_users,
    COUNT(CASE WHEN u.account_expires_at IS NOT NULL AND u.account_expires_at <= NOW() + INTERVAL '30 days' THEN 1 END) as expiring_accounts,
    MIN(u.created_at) as first_user_created,
    MAX(u.last_login_at) as last_company_activity
FROM companies c
LEFT JOIN users u ON c.id = u.company_id AND u.user_type = 'company'
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.company_name, c.company_code
HAVING COUNT(u.id) > 0  -- Only show companies with users
ORDER BY total_company_users DESC;

-- ===============================================
-- 5. User Registration Trends View (Weekly)
-- ===============================================

CREATE OR REPLACE VIEW user_registration_trends_view AS
SELECT 
    DATE_TRUNC('week', created_at) as week_start,
    COUNT(*) as registrations,
    COUNT(CASE WHEN user_type = 'system' THEN 1 END) as system_registrations,
    COUNT(CASE WHEN user_type = 'company' THEN 1 END) as company_registrations,
    -- Calculate cumulative totals
    SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('week', created_at)) as cumulative_total
FROM users 
WHERE created_at >= NOW() - INTERVAL '3 months'  -- Last 3 months
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;

-- ===============================================
-- 6. User Performance Summary View
-- ===============================================

CREATE OR REPLACE VIEW user_performance_view AS
SELECT
    u.id as user_id,
    u.username,
    u.role,
    u.user_type,
    -- Task completion metrics
    COALESCE(task_metrics.total_assigned, 0) as total_tasks_assigned,
    COALESCE(task_metrics.completed_tasks, 0) as completed_tasks,
    COALESCE(task_metrics.completion_rate, 0) as completion_percentage,
    -- Time tracking metrics
    COALESCE(time_metrics.total_hours, 0) as total_hours_logged,
    COALESCE(time_metrics.avg_session_hours, 0) as avg_session_hours,
    -- Activity metrics
    COALESCE(activity_metrics.days_since_login, 999) as days_since_last_login,
    COALESCE(activity_metrics.projects_involved, 0) as projects_involved
FROM users u
LEFT JOIN (
    SELECT 
        assignee_id,
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0), 2
        ) as completion_rate
    FROM tasks 
    WHERE assignee_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY assignee_id
) task_metrics ON u.id = task_metrics.assignee_id
LEFT JOIN (
    SELECT 
        user_id,
        ROUND(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))/3600), 2) as total_hours,
        ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/3600), 2) as avg_session_hours
    FROM task_time_logs
    WHERE ended_at IS NOT NULL AND user_id IS NOT NULL
    GROUP BY user_id
) time_metrics ON u.id = time_metrics.user_id
LEFT JOIN (
    SELECT 
        u.id as user_id,
        EXTRACT(DAYS FROM (NOW() - u.last_login_at)) as days_since_login,
        COUNT(DISTINCT t.project_id) as projects_involved
    FROM users u
    LEFT JOIN tasks t ON u.id = t.assignee_id AND t.deleted_at IS NULL
    GROUP BY u.id, u.last_login_at
) activity_metrics ON u.id = activity_metrics.user_id
WHERE u.status = 'active';

-- ===============================================
-- Add Comments and Documentation
-- ===============================================

COMMENT ON VIEW user_basic_stats_view IS '基础用户统计视图：总数、状态分布、活跃度统计';
COMMENT ON VIEW user_role_stats_view IS '用户角色分布统计视图：按角色和类型分组的用户数量';
COMMENT ON VIEW user_activity_stats_view IS '用户活动统计视图：包含任务分配、完成情况和登录活跃度';
COMMENT ON VIEW user_company_stats_view IS '企业用户统计视图：按公司分组的用户统计信息';
COMMENT ON VIEW user_registration_trends_view IS '用户注册趋势视图：按周统计的注册数量趋势';
COMMENT ON VIEW user_performance_view IS '用户绩效统计视图：任务完成率、工时统计等绩效指标';

-- ===============================================
-- Create indexes for better performance
-- ===============================================

-- Indexes for user activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login_activity 
ON users(last_login_at DESC) WHERE last_login_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_creation_trend 
ON users(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_type 
ON users(status, user_type) WHERE status != 'deleted';

-- Task assignment performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_status 
ON tasks(assignee_id, status) WHERE assignee_id IS NOT NULL AND deleted_at IS NULL;

-- Time logs performance indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_time_logs_user_time 
ON task_time_logs(user_id, started_at) WHERE user_id IS NOT NULL;
