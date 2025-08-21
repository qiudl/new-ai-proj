# 全部任务模块（All Tasks）

本模块为“跨项目”的任务列表视图，复用项目内任务页的表格与内联编辑能力，在无项目ID的情况下展示所有项目的任务，并显示“所属项目”列。

## 后端接口
- 全局任务列表：GET /api/v1/tasks
  - 支持参数：page, page_size, sort_by, sort_order, search, project_id, assignee_id, status, priority（部分在后端保留占位）
- 已存在相关接口：
  - 今日任务：GET /api/v1/tasks/today
  - 今日统计：GET /api/v1/tasks/today/stats

## 前端改动
1) 新增全局任务接口封装
- 文件：frontend/src/services/taskService.ts
- 新增方法：TaskService.getAllTasks(params)
- 行为与 TaskService.getTasks 一致，返回 PaginatedResponse<Task>；包含失败降级。

2) 修改 TasksPage 支持全局模式
- 文件：frontend/src/pages/TasksPage.tsx
- 在 loadTasks 中：
  - 有 projectId 时：调用 TaskService.getTasks
  - 无 projectId 时：调用 TaskService.getAllTasks
- 全局模式下自动显示“所属项目”列；其他交互（状态/截止时间内联编辑、计时器、子任务展开、归档等）保持一致。

3) 新增路由 /tasks
- 文件：frontend/src/App.tsx
- 新增受保护路由 /tasks 指向 TasksPage（Layout 包裹）。

## 使用方式
- 访问 “/tasks” 查看跨项目的全部任务列表。
- 在“任务名称”列点击任务标题可跳转到对应项目内任务详情页 /projects/{projectId}/tasks/{taskId}。
- 全局模式下如需新建任务，请先在页面顶部选择一个项目。

## 验证步骤
1. 打开 /tasks，应能正常加载任务并显示“所属项目”列。
2. 切换分页、排序（默认按 updated_at desc）应正常工作。
3. 点击任务标题进入 /projects/{pid}/tasks/{tid} 详情页。
4. 内联编辑状态/截止日期、查看/编辑/归档/删除操作可用。
5. 在全局模式顶部选择一个项目后，新建任务按钮可用，能在该项目下创建任务。
6. 访问 /projects/:projectId/tasks，原项目内列表行为不受影响。

## 已知限制
- 全局列表暂未提供跨项目的批量删除（需要项目ID），批量删除在单项目列表可用；全局模式下会提示先选择项目。
- 部分后端筛选参数在全局接口上保留占位，后续可扩展查询能力。

## 变更摘要
- frontend/src/services/taskService.ts：新增 getAllTasks。
- frontend/src/pages/TasksPage.tsx：在无项目ID时加载全部任务，优化表格列、交互提示与内存回收。
- frontend/src/App.tsx：新增 /tasks 路由。

## 版本与回滚
- 若需回滚，可撤销上述三个文件的改动并移除 /tasks 路由。

