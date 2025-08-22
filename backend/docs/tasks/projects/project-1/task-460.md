# 任务 #460 文档：GA 实施：洞察/权限/a11y 完备/埋点与KPI

## 背景与范围
为“全部任务”页面重构（父任务 #425）的 GA/分析能力补齐最后一块：
- 事件埋点与 KPI 定义与校验
- 洞察报表（漏斗/留存/自定义事件）
- 权限与可见性控制（事件与报表）
- a11y 可访问性满足基线要求

本任务完成 = 父任务 #425 可交付。

## 规则对齐
- 开发/本地与测试环境：使用 Docker 的 Postgres（禁止直接使用本地进程数据库）。
- 生产环境：数据以 Postgres 为准（报表与验证均以 Postgres 数据源）。
- CI/CD 与定时任务：使用 Jenkins 的 Docker-based Agent 执行校验和快照任务。

## 数据流与组件
1) 前端事件 -> 后端接收（如 /api/analytics/events）-> Postgres(analytics.events)
2) KPI 与洞察基于 SQL 视图/物化视图（analytics.v_*）
3) 报表快照（每日/每次主分支构建）由 Jenkins Docker Agent 运行脚本生成并存档

## 事件与 KPI（示例清单）
| KPI | 事件 | 触发时机 | 验收 |
| --- | --- | --- | --- |
| DAU/WAU | app_view | 进入应用/主要页面 | Postgres 中可按天/周聚合 |
| 任务浏览深度 | task_open | 打开任务详情 | 可按用户/任务聚合、top N |
| 全部任务展开交互 | tasks_toggle_expand | 点击展开/折叠 | 事件包含层级、节点数 |
| 搜索使用率 | tasks_search | 在 /tasks 搜索 | 记录关键词、结果数 |
| 可访问性问题率 | a11y_violation | 自动/半自动扫描 | p95<目标值，按页面统计 |

事件示例（简化）：
```json
{
  "event": "task_open",
  "user_id": "u_123",
  "task_id": 390,
  "context": {
    "page": "/tasks/390",
    "ts": 1724310000
  }
}
```

## 验收标准（Definition of Done）
- 埋点：
  - [ ] 列表中至少 5 个核心事件已在 Postgres 中可查询（dev= Docker PG，prod= PG）。
  - [ ] 事件 Schema 有校验（字段缺失/类型错误时拒收或落入 dead-letter）。
- 洞察：
  - [ ] 提供至少 3 个可复用视图/报表（漏斗、留存、使用率），SQL/视图提交至仓库。
  - [ ] 报表在 Jenkins Docker Agent 中生成快照并存档（CSV/JSON）。
- 权限：
  - [ ] 基于现有 RBAC，限制报表与事件查询的可见性（仅能访问授权项目/范围）。
  - [ ] 查询带审计日志（操作者、范围、时间）。
- a11y：
  - [ ] /tasks 及任务详情主要流程符合 WCAG 2.1 AA 基线：
    - 键盘可达、焦点可见、语义/ARIA 正确、颜色对比度通过。
  - [ ] 至少 10 条自动化/半自动化检查规则（axe/pa11y 等）集成进 CI。
- 文档与回归：
  - [ ] README/运行指南覆盖 Docker Postgres、Jenkins Agent 使用方法。
  - [ ] 端到端演练脚本：插入测试事件 -> 查询报表 -> 校验 KPI。

## 交付物
- 代码：事件接入、SQL 视图/物化视图、权限拦截器、a11y 修复
- 文档：本任务文档、使用与验证说明、报表字典
- CI：Jenkinsfile/脚本（Docker Agent），报表快照产物

## 任务分解（对应将创建的子任务）
1) 460.1 埋点与KPI定义与接入（Docker Postgres 写入 + 事件校验）
2) 460.2 洞察配置：漏斗/留存/自定义事件查询（SQL/视图）
3) 460.3 权限控制：事件与报表可见性（RBAC + 审计）
4) 460.4 可访问性整改（a11y）：语义、对比度、键盘、ARIA
5) 460.5 验收与回归：端到端事件回放 + 数据一致性
6) 460.6 CI 集成：事件Schema校验与报表快照（Jenkins Docker Agent）

## 风险与缓解
- 事件口径不一致：建立事件字典与 schema 校验。
- 大表查询性能：使用合适索引与物化视图，必要时分区。
- a11y 变更影响交互：分批修复并回归测试。
