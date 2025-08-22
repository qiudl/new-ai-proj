# 410 种子与兼容层（解析描述→结构化）

状态：提供种子脚本与兼容层设计，使旧任务描述中的信息（Category/Risk/Depends on）自动解析并同步到结构化表。

## 目标
- 一次性种子填充（categories、risk_levels）。
- 兼容层：扫描任务描述，将"Category:"、"Risk:"、"Depends on:" 解析后写入 task_attributes 与 task_dependencies（若后者已存在表结构）。

## 种子脚本（与 #408 对齐）

```sql
-- 种子在 UPSERT 形式，避免重复插入
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
```

## 兼容层：描述解析策略
- 语法约定（描述中任选其一，大小写不敏感）：
  - Category: backend|frontend|devops|data
  - Risk: low|medium|high|critical
  - Depends on: #12, #34（多个以逗号/空格分隔）

- 伪代码流程：

```pseudo
for task in tasks:
  cat = match_regex(task.description, /Category:\s*(\w+)/i)
  risk = match_regex(task.description, /Risk:\s*(\w+)/i)
  deps = match_all(task.description, /#(\d+)/g) if /Depends on:/i 存在

  if cat or risk:
    upsert task_attributes(task_id=task.id, category_key=cat?, risk_key=risk?)

  for d in deps:
    insert into task_dependencies(task_id=task.id, depends_on_id=d) on conflict do nothing
```

## SQL 函数与脚本（示例，Postgres）
- 可用 pg_proc + regexp_replace/substring 实现解析，或在应用层/批处理脚本中实现。
- 建议使用应用层脚本（保证可维护性），并在 Jenkins Docker Agent 中定时执行同步。

## Jenkins（Docker Agent）周期任务示例
- cron：每小时执行一次，扫描新增/变更任务描述，将结构化字段同步。
- 输出日志与统计（解析成功/失败数量）。

## 验收要点
- 运行种子后，字典表含有预期的 key。
- 描述中存在 Category/Risk/Depends on 的任务被正确同步到结构化表。
- 不破坏原有描述内容，兼容双写。

