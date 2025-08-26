-- Migration Fix: Update User Statistics Views with correct column names
-- Date: 2025-08-26
-- Description: Fixes column name references in user statistics views

-- Drop and recreate the views with correct column names

-- ===============================================
-- 3. User Activity Statistics View (Fixed)
-- ===============================================

DROP VIEW IF EXISTS user_activity_stats_view;
CREATE VIEW user_activity_stats_view AS
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
    -- Timer statistics (using correct column names)
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
        SUM(EXTRACT(EPOCH FROM (end_time - start_time))/60) as total_time_minutes,
        COUNT(CASE WHEN end_time IS NULL THEN 1 END) as active_sessions
    FROM task_time_logs
    WHERE user_id IS NOT NULL
    GROUP BY user_id
) timer_stats ON u.id = timer_stats.user_id
WHERE u.status != 'deleted';  -- Exclude soft deleted users

-- ===============================================
-- 6. User Performance Summary View (Fixed)
-- ===============================================

DROP VIEW IF EXISTS user_performance_view;
CREATE VIEW user_performance_view AS
SELECT
    u.id as user_id,
    u.username,
    u.role,
    u.user_type,
    -- Task completion metrics
    COALESCE(task_metrics.total_assigned, 0) as total_tasks_assigned,
    COALESCE(task_metrics.completed_tasks, 0) as completed_tasks,
    COALESCE(task_metrics.completion_rate, 0) as completion_percentage,
    -- Time tracking metrics (using correct column names)
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
        ROUND(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 2) as total_hours,
        ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 2) as avg_session_hours
    FROM task_time_logs
    WHERE end_time IS NOT NULL AND user_id IS NOT NULL
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
-- Update Comments
-- ===============================================

COMMENT ON VIEW user_activity_stats_view IS '用户活动统计视图：包含任务分配、完成情况和登录活跃度（已修复列名）';
COMMENT ON VIEW user_performance_view IS '用户绩效统计视图：任务完成率、工时统计等绩效指标（已修复列名）';

-- ===============================================
-- Fix the index with correct column name
-- ===============================================

-- Drop the incorrect index and create the correct one
DROP INDEX CONCURRENTLY IF EXISTS idx_task_time_logs_user_time;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_time_logs_user_start_time 
ON task_time_logs(user_id, start_time) WHERE user_id IS NOT NULL;
