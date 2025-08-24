-- V20250821_1501__seed_dictionaries.sql
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

