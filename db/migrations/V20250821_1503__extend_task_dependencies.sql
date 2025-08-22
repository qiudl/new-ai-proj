-- V20250821_1503__extend_task_dependencies.sql
BEGIN;
ALTER TABLE task_dependencies
  ADD COLUMN IF NOT EXISTS dep_type TEXT NOT NULL DEFAULT 'FS',
  ADD COLUMN IF NOT EXISTS lag_minutes INTEGER NOT NULL DEFAULT 0;

-- Constrain dep_type to known values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_task_dependencies_dep_type'
  ) THEN
    ALTER TABLE task_dependencies
      ADD CONSTRAINT ck_task_dependencies_dep_type CHECK (dep_type IN ('FS','SS','FF','SF'));
  END IF;
END$$;

-- Optional: prevent negative lag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_task_dependencies_lag_nonneg'
  ) THEN
    ALTER TABLE task_dependencies
      ADD CONSTRAINT ck_task_dependencies_lag_nonneg CHECK (lag_minutes >= 0);
  END IF;
END$$;
COMMIT;

