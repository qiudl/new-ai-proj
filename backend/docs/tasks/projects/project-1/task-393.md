# 设计与评审：任务后代查询 API

任务：设计与评审 API：/api/tasks/{id}/descendants（depth/分页/权限）

状态：已评审（v1 定稿）
负责人：待定

## 评审结论（已确认）
- depth：默认=2，最大=5。
- limit：默认=200，最大=1000。
- 排序：固定 (parent_id, sort_order ASC, id ASC)；可选 order=updated_at DESC 仅用于同层展示。
- 游标：采用“广度优先”的稳定序，便于分层渲染与增量加载。
- has_children：仅统计“可见子节点”为 true。
- visibility：normal 供普通用户；all 仅管理员/调试使用。
- v1 同时提供最小 /children 接口，支持节点级懒加载。

## 目标
- 提供统一接口，查询指定任务的后代节点（至少到孙任务层级），支持：
  - depth 限制（默认 2）
  - 分页/懒加载（limit + cursor 或 per-level 拉取）
  - 权限过滤
  - 稳定排序
- 返回平铺数据（包含 parent_id），前端自行组装为树，便于复用与性能优化。

## 端点定义
- Method: GET
- Path: /api/tasks/{id}/descendants
- Query：
  - depth: number，最大层级深度（root 的子节点为第 1 层）；默认 2；最大 5（可配置）。
  - limit: number，默认 200，最大 1000。
  - cursor: string，可选。基于广度优先的稳定游标。
  - order: string，可选，默认 by sort_order asc, id asc。可扩展为 updated_at desc（仅同层）。
  - visibility: string，可选，默认 normal（仅可见节点）。可选 all（管理员/调试）。

示例：
GET /api/tasks/123/descendants?depth=2&limit=200

## 响应结构（推荐平铺）
```json
{
  "root": {"id": 123, "title": "Root Task"},
  "data": [
    {"id": 201, "parent_id": 123, "title": "Child A", "level": 1, "has_children": true, "sort_order": 10, "status": "open"},
    {"id": 202, "parent_id": 123, "title": "Child B", "level": 1, "has_children": false, "sort_order": 20, "status": "open"},
    {"id": 301, "parent_id": 201, "title": "Grandchild A1", "level": 2, "has_children": false, "sort_order": 5, "status": "in_progress"}
  ],
  "page_info": {"has_more": false, "next_cursor": null},
  "meta": {
    "requested_depth": 2,
    "max_depth_reached": true,
    "truncated": false,
    "total_returned": 3,
    "hidden_nodes_truncated": false
  }
}
```

说明：
- level 从 1 开始（子任务为 1 层）。
- has_children 基于权限后的可见子节点判断。
- meta.max_depth_reached=false 表示还有更深层可加载。
- page_info 控制是否继续获取下一页。

## 权限与可见性
- 默认仅返回当前用户有权限查看的节点（由 join/过滤保证）。
- 不可见节点一律截断其子树（默认策略 A）；管理员可选策略 B（占位标注）。

## 稳定排序
- 统一使用 (parent_id, sort_order asc, id asc)。
- 若无 sort_order，则默认 0。

## 数据库与查询方案（PostgreSQL）
- 遵循用户规则：开发/测试基于 Docker 的 Postgres；生产环境使用 Postgres。
- 表结构假设：tasks(id, parent_id, sort_order, title, status, assignee_id, project_id, ...)。
- 索引建议：
  - CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_parent_sort ON tasks(parent_id, sort_order, id);
  - CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);

### 递归 CTE（深度限制 + 权限过滤 + 稳定排序）
```sql
WITH RECURSIVE descendants AS (
  -- seed：root 的直接子节点
  SELECT
    t.id, t.parent_id, t.title, t.status, t.sort_order,
    1 AS level
  FROM tasks t
  WHERE t.parent_id = $1
    AND has_task_visibility(t.id, $current_user_id)

  UNION ALL

  -- recursive：向下展开至 depth
  SELECT
    c.id, c.parent_id, c.title, c.status, c.sort_order,
    d.level + 1 AS level
  FROM tasks c
  JOIN descendants d ON c.parent_id = d.id
  WHERE d.level < $depth
    AND has_task_visibility(c.id, $current_user_id)
)
SELECT d.*, EXISTS (
  SELECT 1 FROM tasks cc
  WHERE cc.parent_id = d.id
    AND has_task_visibility(cc.id, $current_user_id)
) AS has_children
FROM descendants d
ORDER BY d.parent_id NULLS FIRST, d.sort_order ASC NULLS LAST, d.id ASC
LIMIT $limit
OFFSET $offset; -- 可替换为基于 (parent_id, sort_order, id) 的 keyset 游标
```

- has_task_visibility(task_id, user_id) 可由 RLS/视图/函数实现。
- 建议采用 keyset 分页避免深 OFFSET。

## /children 最小接口（v1 同步提供）
- GET /api/tasks/{nodeId}/children?limit=200
- 返回：level=1 的直接可见子节点（含 has_children），排序同上。

## 分页与懒加载策略
- 默认广度优先，满足层级渲染；
- 支持全树分页与逐节点懒加载并存。

## 错误码与返回规范
- 400/403/404/409/429/5xx，与主文档一致。

## 监控与日志
- 指标：qps、p50/p95/p99、错误率、超时率。
- 慢查询：pg_stat_statements + 采样日志。
- 追踪：TraceID 跨服务传播，记录 depth、limit、rows_returned。

## 安全
- 权限前置过滤，限流与缓存，输入/输出校验。

## 性能预算（初版）
- ≤1000 节点：p95 < 400ms；200–500 节点：p95 < 250ms。

## 版本演进
- v1：descendants + 平铺结果 + depth/limit/cursor + 最小 /children。
- v2：闭包表/ltree 等结构优化（视规模演进）。

## 清单（实施前最终确认）
- [x] 参数范围与默认值（depth、limit 上限）
- [x] 排序策略与游标为广度优先
- [x] 权限语义与 has_children 判定
- [x] visibility 策略
- [x] /children 最小接口包含在 v1
- [ ] keyset 游标实现细节与序列化格式
- [ ] 压测计划与数据集
