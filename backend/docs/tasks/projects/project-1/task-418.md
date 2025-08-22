# 新增全部任务模块（All Tasks 页面）

## 背景
为提升跨项目的任务可见性，复用现有 TasksPage，在无 projectId 时提供“全部任务”列表视图，并新增 /tasks 路由。后端已具备全局任务接口（GET /api/v1/tasks）。

## 子任务拆分
- [x] 在 taskService 中新增 getAllTasks（调用 /api/v1/tasks）
- [x] 修改 TasksPage 支持全局模式（无 projectId 时加载全部任务）
- [x] 在 App.tsx 新增 /tasks 路由（指向 TasksPage）
- [x] 新增文档：docs/features/all-tasks-module.md（接口、路由、验证步骤）
- [ ] 更新导航（可选）：在导航中暴露“全部任务”入口 /tasks
- [ ] 验证与提交：本地验证 /tasks + 项目内回归；提交变更并记录变更说明

## 技术实现
1) TaskService.getAllTasks
- 新增方法调用 GET /api/v1/tasks，返回 PaginatedResponse<Task>，与 getTasks 结构一致；失败降级返回空数据结构。

2) TasksPage 全局模式
- loadTasks 无 projectId 时调用 getAllTasks；全局模式下显示“所属项目”列，其他内联编辑、展开、计时器均沿用。

3) 路由
- 新增受保护路由 /tasks 指向 TasksPage。

## 文件改动
- frontend/src/services/taskService.ts：新增 getAllTasks
- frontend/src/pages/TasksPage.tsx：修改 loadTasks 逻辑，增强全局模式 UI
- frontend/src/App.tsx：新增 /tasks 路由
- docs/features/all-tasks-module.md：新增文档

## 验证建议
- 访问 /tasks，应加载全局任务列表并包含“所属项目”列
- 排序、分页、查看详情、内联编辑等操作正常
- /projects/:projectId/tasks 行为不受影响

## 后续可选项
- 导航中加入 /tasks 菜单入口
- 全局模式下支持跨项目筛选与批量操作（需设计）。