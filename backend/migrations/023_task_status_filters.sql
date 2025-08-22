-- 023_task_status_filters.sql
-- Add fields to support status-driven filters and indexes for performance

BEGIN;

ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS on_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Basic helpful indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_active
  ON tasks(due_date)
  WHERE status NOT IN ('completed','cancelled','archived') AND due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_snooze
  ON tasks(snooze_until)
  WHERE snooze_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);

COMMIT;
