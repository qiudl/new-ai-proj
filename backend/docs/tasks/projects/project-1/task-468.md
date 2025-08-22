# 任务 #468 执行文档：实现 智能泳道（后端 + 前端）

## 概述
本次实现了项目任务页的“智能泳道”视图（Beta）：支持按状态或负责人分组、拖拽跨泳道更新任务字段（状态/负责人）、搜索过滤、数量徽章等。默认隐藏在 URL 参数后，便于灰度与回退。

- 入口：项目任务列表页 URL 增加 `?view=swimlane` 参数
  - 示例：`/projects/{projectId}/tasks?view=swimlane`
- 适用范围：仅限单项目任务列表页（全局任务列表暂不支持泳道视图）

## 设计方案（摘要）
- 分组维度：
  - status：todo / in_progress / completed / cancelled（固定四列，保持一致的颜色与图标）
  - assignee：按负责人分组，未指派单独一列且置前
- 交互：
  - 拖拽跨列：
    - groupBy=status → updateTask({ status })
    - groupBy=assignee → updateTask({ assignee_id })；未指派为 null
  - 乐观更新：先本地移动，失败回滚并提示
  - 搜索：标题/描述包含匹配
- 发布：隐藏在 `?view=swimlane`，稳定后可在 UI 中加入显式 Tab/切换按钮

## 实施内容
- 新增组件：SwimlaneBoard（前端）
  - 文件：`frontend/src/components/SwimlaneBoard.tsx`
  - 样式：`frontend/src/styles/SwimlaneBoard.css`
  - 特性：
    - 组内卡片渲染：标题、状态标签、负责人、截止与更新时间
    - 拖拽更新：onDragStart / onDrop（最小实现，无第三方依赖）
    - 搜索输入、分组切换（状态/负责人）
- 集成到任务列表页：
  - 文件：`frontend/src/pages/TasksPage.tsx`
  - 逻辑：当 URL 查询参数 `view=swimlane` 时，渲染 SwimlaneBoard；提供“返回列表视图”按钮移除该参数

## 代码变更清单
- 新增：
  - `frontend/src/components/SwimlaneBoard.tsx`
  - `frontend/src/styles/SwimlaneBoard.css`
- 修改：
  - `frontend/src/pages/TasksPage.tsx`：
    - 引入 `useLocation` 与 `SwimlaneBoard`
    - 解析 URL 参数以切换视图
    - 在泳道视图中传入当前项目任务数据与加载状态

## 数据与接口
- 读取：沿用 `TaskService.getTasks(projectId, { ...filters })`（外部页面已加载任务列表并传入 SwimlaneBoard）
- 更新：`TaskService.updateTask(projectId, taskId, payload)`
  - payload：`{ status: 'todo'|'in_progress'|'completed'|'cancelled' }` 或 `{ assignee_id: number|null }`

## 使用说明
1. 打开项目任务列表页：`/projects/{projectId}/tasks`
2. 在地址栏追加 `?view=swimlane` 进入泳道视图
3. 右上角“返回列表视图”可移除该参数
4. 默认分组为“按状态”，可切换为“按负责人”
5. 在任意卡片上按住拖拽到目标泳道即可更新状态或负责人

## 验收清单（DoD）
- [x] 支持按状态分组并拖拽更新状态
- [x] 支持按负责人分组并拖拽更新负责人（含未指派）
- [x] 搜索框对标题/描述生效
- [x] 刷新后持久化结果正确（服务器端已更新）
- [x] 保持一致的状态颜色/图标（与任务详情页一致）

## 已知限制
- 仅支持单项目任务列表，暂不支持全局任务列表泳道视图
- 当前未内置分页懒加载（沿用页面现有分页/过滤加载，泳道内仅对已加载集合进行分列）
- 拖拽大规模数据时仍依赖前端渲染性能

## 后续改进建议
- 在 UI 顶部提供显式的“泳道视图”切换按钮
- 支持可配置分组（如优先级、自定义字段）与列顺序
- 支持列内排序、WIP 限制与批量拖拽
- 增加端到端用例（Playwright）覆盖状态拖拽与负责人拖拽

## 验证建议
- 打开 `/projects/{projectId}/tasks?view=swimlane`
- 在“按状态”分组下，将某任务从“待开始”拖拽到“进行中”，刷新页面后应保持
- 切换到“按负责人”，将任务拖拽到某个负责人列，刷新页面应保持

---
更新时间：${new Date().toISOString()}