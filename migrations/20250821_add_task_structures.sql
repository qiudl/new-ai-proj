-- 2025-08-21: Initial task structures for attributes/dependencies/milestones
-- Notes: compatible with Docker Postgres. Adjust referenced tasks table name if different.

BEGIN;

-- 1) task_attributes
CREATE TABLE IF NOT EXISTS task_attributes (
  task_id        BIGINT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  category       TEXT NOT NULL CHECK (category IN ('frontend','backend','data','infra','test','design','docs')),
  estimate_hours NUMERIC(6,2),
  risk_level     TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),
  owner_hint     TEXT,
  labels         TEXT[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_attributes_category ON task_attributes(category);
CREATE INDEX IF NOT EXISTS idx_task_attributes_risk ON task_attributes(risk_level);

-- 2) task_dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id            BIGSERIAL PRIMARY KEY,
  from_task_id  BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  to_task_id    BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type TEXT   NOT NULL CHECK (relation_type IN ('FS','SS','FF','SF')),
  lag_minutes   INT    NOT NULL DEFAULT 0 CHECK (lag_minutes >= 0),
  is_blocking   BOOLEAN NOT NULL DEFAULT true,
  note          TEXT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_dep_no_self CHECK (from_task_id <> to_task_id),
  CONSTRAINT uq_dep_unique UNIQUE (from_task_id, to_task_id, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_deps_from      ON task_dependencies(from_task_id);
CREATE INDEX IF NOT EXISTS idx_deps_to        ON task_dependencies(to_task_id);
CREATE INDEX IF NOT EXISTS idx_deps_block     ON task_dependencies(is_blocking);
CREATE INDEX IF NOT EXISTS idx_deps_relation  ON task_dependencies(relation_type);
CREATE INDEX IF NOT EXISTS idx_deps_from_type ON task_dependencies(from_task_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_deps_to_type   ON task_dependencies(to_task_id, relation_type);

-- 3) task_milestones & links
CREATE TABLE IF NOT EXISTS task_milestones (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  due_date   timestamptz,
  note       TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS task_milestone_links (
  task_id      BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  milestone_id BIGINT NOT NULL REFERENCES task_milestones(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, milestone_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mlink_task ON task_milestone_links(task_id);
CREATE INDEX IF NOT EXISTS idx_mlink_ms   ON task_milestone_links(milestone_id);

COMMIT;

