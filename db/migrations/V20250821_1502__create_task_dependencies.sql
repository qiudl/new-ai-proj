-- V20250821_1502__create_task_dependencies.sql
BEGIN;

-- Minimal dependency table; UNIQUE prevents duplicate edges; self-dependency is rejected by CHECK.
CREATE TABLE IF NOT EXISTS task_dependencies (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  depends_on_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_task_dep UNIQUE(task_id, depends_on_id),
  CONSTRAINT ck_no_self_dep CHECK (task_id <> depends_on_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_dep ON task_dependencies(depends_on_id);

COMMIT;

