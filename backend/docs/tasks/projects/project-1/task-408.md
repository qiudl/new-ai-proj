# 408 枚举与字典（category/risk_level）

状态：设计与落地到 Postgres（Docker 环境）

## 目标
- 建立标准化的枚举/字典以支撑多AI调度的任务分类与风险分级。
- 字段具备前向兼容（可扩展）、后向兼容（保留旧值）能力。

## 数据模型（Postgres）
- 表：task_categories（任务类别字典）
- 表：task_risk_levels（任务风险字典）
- 表：task_attributes（任务属性：引用上面字典）

## DDL（可用于迁移脚本）

```sql
-- 字典：任务类别
CREATE TABLE IF NOT EXISTS task_categories (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,            -- 机器可读：如 backend, frontend, ci
  name TEXT NOT NULL,                 -- 人类可读：如 后端, 前端
  description TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_categories_active ON task_categories(is_active);

-- 字典：任务风险级别
CREATE TABLE IF NOT EXISTS task_risk_levels (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,            -- 如 low, medium, high, critical
  name TEXT NOT NULL,
  level SMALLINT NOT NULL,             -- 数值强度：low=1, medium=2, high=3, critical=4
  description TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (level BETWEEN 0 AND 10)
);
CREATE INDEX IF NOT EXISTS idx_task_risk_levels_level ON task_risk_levels(level);

-- 任务属性（与已有 tasks 表通过 task_id 关联）
CREATE TABLE IF NOT EXISTS task_attributes (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  category_key TEXT NULL REFERENCES task_categories(key),
  risk_key TEXT NULL REFERENCES task_risk_levels(key),
  -- 预留通用扩展字段
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id)
);
CREATE INDEX IF NOT EXISTS idx_task_attributes_task ON task_attributes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attributes_cat ON task_attributes(category_key);
CREATE INDEX IF NOT EXISTS idx_task_attributes_risk ON task_attributes(risk_key);
```

## 种子数据（基础字典）

```sql
INSERT INTO task_categories(key, name, description) VALUES
  ('backend','后端','后端与数据层任务'),
  ('frontend','前端','前端与可视化任务'),
  ('devops','运维/CI','CI/CD、发布与监控'),
  ('data','数据','数据建模、迁移与质量');

INSERT INTO task_risk_levels(key, name, level, description) VALUES
  ('low','低风险',1,'影响可忽略，回滚容易'),
  ('medium','中风险',2,'需注意，变更可回退'),
  ('high','高风险',3,'涉及数据或核心流程，需评审'),
  ('critical','致命风险',4,'必须双人评审+灰度');
```

## 使用规范
- category：用于多AI分派时的队列/技能映射（如后端→后端Agent）。
- risk_level：用于调度策略（高风险任务优先串行或要求更高的验证门槛）。
- attributes：自由扩展（如 estimate_hours: 4, component: gantt）。

## 校验与守护
- 外键引用通过 key（而非 id），方便跨环境迁移与合并。
- 建议使用 UPSERT 维护字典（保持 key 不变，更新 name/描述）。

## 与规则对齐
- 开发数据库：Docker Postgres（后续 409 将说明回滚与本地验证）。
- CI：后续集成 Jenkins Docker-based agent 执行迁移与校验。

## 下一步
- 409：输出回滚策略与本地验证手册（基于 Docker Postgres）。
- 410：提供种子填充与描述→结构化的兼容层。
