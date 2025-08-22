-- Flyway SQL migration: add tasks hierarchy & status fields + indexes
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS snooze_until timestamptz,
  ADD COLUMN IF NOT EXISTS on_hold_reason text,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS parent_id bigint,
  ADD COLUMN IF NOT EXISTS depth int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_children boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_in_parent int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS rollup_cache jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_order ON tasks(parent_id, order_in_parent);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_due_active
  ON tasks(due_date)
  WHERE status NOT IN ('done','cancelled','archived') AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_snooze
  ON tasks(snooze_until)
  WHERE snooze_until IS NOT NULL;

