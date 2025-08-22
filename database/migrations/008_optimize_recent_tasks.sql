-- Optimize recent-tasks query performance by adding supporting index
-- This index helps the CTE "recent_logs" that filters by user_id and end_time
-- Safe to run multiple times due to IF NOT EXISTS

CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_end_time 
ON task_time_logs(user_id, end_time DESC)
WHERE end_time IS NOT NULL;

