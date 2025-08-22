# #462 实施文档：埋点与KPI定义与接入（Docker Postgres 写入 + 事件校验）

## 目标
最小闭环：前端事件 → 后端接收 → Docker Postgres 持久化 → schema 校验 → 基础查询可用。

## 事件 Schema（初版）
- event: string (枚举：app_view, task_open, tasks_toggle_expand, tasks_search, a11y_violation)
- user_id: string (可匿名化)
- project_id?: number
- task_id?: number
- context: jsonb（page, ts, extra）
- created_at: timestamptz (服务器)

## 数据表（analytics.events）
```sql
CREATE TABLE IF NOT EXISTS analytics.events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  user_id TEXT,
  project_id BIGINT,
  task_id BIGINT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_event ON analytics.events(event);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_task_id ON analytics.events(task_id);
```
备注：如 schema 不存在 `analytics`，请一并创建。

## 后端 API（示例）
- POST /api/analytics/events  接收单条或批量事件，做字段校验和速率限制。
- GET  /api/analytics/kpi/:name  返回聚合指标（为 #463 预留）。

## 校验与拒收
- 必填字段：event, created_at（可由服务器生成）
- 根据事件枚举校验需要字段（如 task_open 需要 task_id）
- 字段缺失/类型错误：返回 400，或入 dead-letter（analytics.events_dead_letter）。

## 最小实现清单（按优先级）
1) 迁移：schema + analytics.events 表、索引、死信表
2) 接口：POST /api/analytics/events（含基本校验）
3) 本地验证脚本：向 Docker Postgres 写入 100 条模拟事件，检查聚合
4) 文档：README 段落（本地运行、验证步骤）

## 验收步骤
- 本地 Docker Postgres 可见 analytics.events，索引存在
- POST 事件接口可接收并返回 2xx，非法负载被拒收
- 简单 SQL 可聚合出 DAU/任务打开次数等指标
- 后续 #463 可在此基础上创建视图/物化视图

## CI 协调（预留）
- Jenkins Docker Agent 中运行 migration + 校验脚本，产出事件样本与聚合快照。
