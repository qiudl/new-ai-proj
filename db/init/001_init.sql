-- 001_init.sql (runs automatically on first container start)
-- Includes dictionary tables, attributes, and seed data.

-- Schema
BEGIN;

CREATE TABLE IF NOT EXISTS task_categories (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_categories_active ON task_categories(is_active);

CREATE TABLE IF NOT EXISTS task_risk_levels (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  level SMALLINT NOT NULL,
  description TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (level BETWEEN 0 AND 10)
);
CREATE INDEX IF NOT EXISTS idx_task_risk_levels_level ON task_risk_levels(level);

CREATE TABLE IF NOT EXISTS task_attributes (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  category_key TEXT NULL REFERENCES task_categories(key),
  risk_key TEXT NULL REFERENCES task_risk_levels(key),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id)
);
CREATE INDEX IF NOT EXISTS idx_task_attributes_task ON task_attributes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attributes_cat ON task_attributes(category_key);
CREATE INDEX IF NOT EXISTS idx_task_attributes_risk ON task_attributes(risk_key);

COMMIT;

-- Seeds (UPSERT)
BEGIN;

INSERT INTO task_categories(key, name, description) VALUES
  ('backend','后端','后端与数据层任务'),
  ('frontend','前端','前端与可视化任务'),
  ('devops','运维/CI','CI/CD、发布与监控'),
  ('data','数据','数据建模、迁移与质量')
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  updated_at=now();

INSERT INTO task_risk_levels(key, name, level, description) VALUES
  ('low','低风险',1,'影响可忽略，回滚容易'),
  ('medium','中风险',2,'需注意，变更可回退'),
  ('high','高风险',3,'涉及数据或核心流程，需评审'),
  ('critical','致命风险',4,'必须双人评审+灰度')
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name,
  level=EXCLUDED.level,
  description=EXCLUDED.description,
  updated_at=now();

COMMIT;

