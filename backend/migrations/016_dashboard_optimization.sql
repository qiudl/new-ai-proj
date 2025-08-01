-- Dashboard optimization migration
-- Purpose: Add indexes and views to optimize dashboard queries

-- 1. Add composite indexes for dashboard queries
-- Index for tasks filtering by date range and project
CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_date_range 
ON tasks(project_id, created_at, due_date, status) 
WHERE deleted_at IS NULL;

-- Index for tasks filtering by time range with status
CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_time_status 
ON tasks(created_at, due_date, status, updated_at) 
WHERE deleted_at IS NULL;

-- Index for project filtering with deletion check
CREATE INDEX IF NOT EXISTS idx_projects_dashboard_active 
ON projects(id, name) 
WHERE deleted_at IS NULL;

-- Index for task updates tracking
CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_updates 
ON tasks(updated_at, status, project_id) 
WHERE deleted_at IS NULL;

-- Index for priority sorting in tasks
CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_priority 
ON tasks(project_id, ((custom_fields->>'priority')), updated_at) 
WHERE deleted_at IS NULL;

-- Index for overdue tasks calculation
CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_overdue 
ON tasks(due_date, status, project_id) 
WHERE deleted_at IS NULL AND due_date IS NOT NULL;

-- 2. Create materialized view for dashboard statistics (optional - for high-traffic scenarios)
-- This can be refreshed periodically to improve performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_daily_stats AS
SELECT 
    DATE(t.created_at) as date,
    t.project_id,
    p.name as project_name,
    COUNT(*) as tasks_created,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as tasks_in_progress,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as tasks_todo,
    COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN 1 END) as tasks_overdue
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.deleted_at IS NULL 
AND p.deleted_at IS NULL
AND t.created_at >= CURRENT_DATE - INTERVAL '90 days' -- Keep last 90 days
GROUP BY DATE(t.created_at), t.project_id, p.name;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_daily_stats_unique 
ON mv_dashboard_daily_stats(date, project_id);

-- 3. Create function to refresh dashboard stats (can be called by cron job)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_daily_stats;
END;
$$ LANGUAGE plpgsql;

-- 4. Create view for weekly dashboard summary
CREATE OR REPLACE VIEW v_dashboard_weekly_summary AS
WITH date_range AS (
    SELECT 
        DATE_TRUNC('week', CURRENT_DATE) as week_start,
        DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days' as week_end
),
task_stats AS (
    SELECT 
        t.project_id,
        p.name as project_name,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN 1 END) as overdue_tasks
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    CROSS JOIN date_range dr
    WHERE t.deleted_at IS NULL 
    AND p.deleted_at IS NULL
    AND (
        (t.due_date >= dr.week_start AND t.due_date <= dr.week_end) OR
        (t.created_at >= dr.week_start AND t.created_at <= dr.week_end)
    )
    GROUP BY t.project_id, p.name
)
SELECT 
    ts.*,
    CASE 
        WHEN ts.total_tasks > 0 THEN 
            ROUND(ts.completed_tasks::numeric / ts.total_tasks::numeric * 100, 2)
        ELSE 0 
    END as completion_rate
FROM task_stats ts
ORDER BY ts.total_tasks DESC;

-- 5. Create view for daily activity trends
CREATE OR REPLACE VIEW v_dashboard_daily_trends AS
WITH daily_activity AS (
    SELECT 
        DATE(t.created_at) as activity_date,
        COUNT(*) as tasks_created,
        COUNT(CASE WHEN t.status = 'completed' AND DATE(t.updated_at) = DATE(t.created_at) THEN 1 END) as tasks_completed_same_day
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.deleted_at IS NULL 
    AND p.deleted_at IS NULL
    AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(t.created_at)
),
completion_activity AS (
    SELECT 
        DATE(t.updated_at) as activity_date,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.deleted_at IS NULL 
    AND p.deleted_at IS NULL
    AND t.updated_at >= CURRENT_DATE - INTERVAL '30 days'
    AND t.status = 'completed'
    GROUP BY DATE(t.updated_at)
)
SELECT 
    COALESCE(da.activity_date, ca.activity_date) as date,
    COALESCE(da.tasks_created, 0) as tasks_created,
    COALESCE(ca.tasks_completed, 0) as tasks_completed,
    COALESCE(da.tasks_completed_same_day, 0) as tasks_completed_same_day
FROM daily_activity da
FULL OUTER JOIN completion_activity ca ON da.activity_date = ca.activity_date
ORDER BY COALESCE(da.activity_date, ca.activity_date) DESC;

-- 6. Add helpful comments to explain indexes
COMMENT ON INDEX idx_tasks_dashboard_date_range IS 'Optimizes dashboard queries filtering by project and date range';
COMMENT ON INDEX idx_tasks_dashboard_time_status IS 'Optimizes dashboard queries for task status and time-based filtering';
COMMENT ON INDEX idx_projects_dashboard_active IS 'Optimizes project lookups for dashboard, excluding deleted projects';
COMMENT ON INDEX idx_tasks_dashboard_updates IS 'Optimizes tracking of task updates for dashboard trends';
COMMENT ON INDEX idx_tasks_dashboard_priority IS 'Optimizes priority-based task sorting in dashboard views';
COMMENT ON INDEX idx_tasks_dashboard_overdue IS 'Optimizes overdue task calculations';

COMMENT ON MATERIALIZED VIEW mv_dashboard_daily_stats IS 'Pre-computed daily statistics for dashboard performance';
COMMENT ON VIEW v_dashboard_weekly_summary IS 'Weekly summary view for dashboard current week data';
COMMENT ON VIEW v_dashboard_daily_trends IS 'Daily activity trends for dashboard charts';

-- 7. Create indexes on JSONB fields if they are frequently queried
-- Index for priority field in custom_fields (using btree for text values)
CREATE INDEX IF NOT EXISTS idx_tasks_custom_fields_priority 
ON tasks ((custom_fields->>'priority')) 
WHERE deleted_at IS NULL AND custom_fields ? 'priority';

-- Index for tags in custom_fields using GIN (for JSONB arrays)
CREATE INDEX IF NOT EXISTS idx_tasks_custom_fields_tags 
ON tasks USING GIN ((custom_fields->'tags')) 
WHERE deleted_at IS NULL AND custom_fields ? 'tags';

-- 8. Analyze tables to update statistics
ANALYZE tasks;
ANALYZE projects;

-- Grant permissions to application user if needed
-- GRANT SELECT ON mv_dashboard_daily_stats TO your_app_user;
-- GRANT SELECT ON v_dashboard_weekly_summary TO your_app_user;
-- GRANT SELECT ON v_dashboard_daily_trends TO your_app_user;