## 进展更新（Alpha：筛选与 Tree 基础）

- 前端：
  - 新增 URL 同步筛选 Hook（useTaskListUrlState），支持 status/priority/assignee/q 并与 URL tfilters 参数双向同步。
  - 新增 TasksFilterBar 组件并接入 TasksPage（全局/项目内均可用）。
  - TaskFilter 类型扩展：priority 与 q 字段，并将筛选参数注入 getTasks/getAllTasks 请求。
  - 更新文档 docs/features/all-tasks-module.md，记录筛选与 URL 同步的用法与验证步骤。
- 构建/类型检查：
  - 修复 UserTimerPreferences.tsx 中非法字符导致的 TS 失败。
  - 其余类型告警主要在 AI/依赖/权限等非本任务路径的文件中，不阻塞本功能；后续分批清理。

- 后续计划（Alpha 继续项）：
  - 将 descendants(depth) 与筛选结合，按需加载子节点（限制默认深度，支持懒加载）。
  - 增加最小单测：筛选参数映射与 URL parse/serialize。
  - 性能冒烟：全局逾期 preset 下 p95 与首次渲染。

- 环境与约束：
  - 本地与测试环境使用 Docker Postgres；生产 Postgres。
  - CI 通过 Jenkins Docker Agent。