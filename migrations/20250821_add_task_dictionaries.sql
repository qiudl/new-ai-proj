-- 2025-08-21: Enums and dictionaries for task attributes
-- This complements 20250821_add_task_structures.sql

BEGIN;

-- Ensure allowed categories and risk levels are documented via CHECK constraints already.
-- Optionally, you can materialize dictionaries for referential integrity and future extensibility.

CREATE TABLE IF NOT EXISTS task_categories (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL
);
INSERT INTO task_categories(key,label) VALUES
  ('frontend','Frontend'),
  ('backend','Backend'),
  ('data','Data'),
  ('infra','Infra'),
  ('test','Test'),
  ('design','Design'),
  ('docs','Docs')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS task_risk_levels (
  key TEXT PRIMARY KEY,
  weight INT NOT NULL CHECK (weight BETWEEN 1 AND 3),
  label TEXT NOT NULL
);
INSERT INTO task_risk_levels(key,weight,label) VALUES
  ('low',1,'Low'),
  ('medium',2,'Medium'),
  ('high',3,'High')
ON CONFLICT (key) DO NOTHING;

COMMIT;

