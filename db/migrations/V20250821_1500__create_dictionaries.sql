-- V20250821_1500__create_dictionaries.sql
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

