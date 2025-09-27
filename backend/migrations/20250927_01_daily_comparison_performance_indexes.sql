-- Performance indexes for daily comparison efficiency analysis
-- Created: 2025-09-27
-- Purpose: Optimize database queries for the new daily comparison API

-- Index for unified_timer_logs queries used in daily comparison
-- Covers user_id, status, start_time for efficient date range filtering
CREATE INDEX IF NOT EXISTS idx_unified_timer_logs_daily_comparison 
ON unified_timer_logs(user_id, status, start_time) 
WHERE status = 'completed';

-- Index for unified_timer_logs with target filtering for task breakdown
-- Covers user_id, target_type, target_id, status, start_time
CREATE INDEX IF NOT EXISTS idx_unified_timer_logs_task_breakdown 
ON unified_timer_logs(user_id, target_type, target_id, status, start_time) 
WHERE status = 'completed' AND target_type = 'project_task';

-- Index for tasks by assignee and completion status for efficiency calculation
-- Covers assignee_id, status, updated_at for completed task counting
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_completed_date 
ON tasks(assignee_id, status, updated_at) 
WHERE status = 'completed';

-- Index for tasks with project join optimization
-- Covers project_id for efficient task-project joins in breakdowns
CREATE INDEX IF NOT EXISTS idx_tasks_project_efficiency 
ON tasks(id, project_id, title, status, assignee_id);

-- Composite index for hourly distribution queries
-- Covers user_id, status with start_time for hour extraction
CREATE INDEX IF NOT EXISTS idx_unified_timer_logs_hourly 
ON unified_timer_logs(user_id, status, start_time) 
WHERE status = 'completed';

-- Add comments to document the purpose of these indexes
COMMENT ON INDEX idx_unified_timer_logs_daily_comparison IS 
'Optimizes daily timer statistics queries for 3-day comparison analysis';

COMMENT ON INDEX idx_unified_timer_logs_task_breakdown IS 
'Optimizes task-specific timer queries for daily task breakdown analysis';

COMMENT ON INDEX idx_tasks_assignee_completed_date IS 
'Optimizes completed task counting queries for efficiency metrics';

COMMENT ON INDEX idx_tasks_project_efficiency IS 
'Optimizes task-project joins for top task and breakdown queries';

COMMENT ON INDEX idx_unified_timer_logs_hourly IS 
'Optimizes hourly distribution analysis queries for daily patterns';