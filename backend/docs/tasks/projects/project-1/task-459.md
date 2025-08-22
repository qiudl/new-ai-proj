# 任务 #459 进展（Beta MVP）

## 已交付
- 智能泳道视图（MVP）：/projects/:projectId/tasks/swimlanes
  - 按状态分三列（待办/进行中/已完成），轻量展示任务、负责人与截止信息
- 任务日历视图（MVP）：/projects/:projectId/tasks/calendar
  - 基于截止日期进行日历可视化，支持复制分享当前视图链接
- 批量级联页面（MVP）：/projects/:projectId/tasks/batch-cascade
  - 通过逗号分隔任务ID，对状态与父任务进行批量更新（依赖后端 batchUpdateTasks）

## 路由
- /projects/:projectId/tasks/swimlanes
- /projects/:projectId/tasks/calendar
- /projects/:projectId/tasks/batch-cascade

## 注意事项
- 当前以 MVP 为目标，尽量减少依赖与复杂度：
  - 泳道/日历使用现有 TaskService.getTasks 数据源，分页上限控制在合理范围
  - 批量级联提供最小操作面板，不做复杂预览校验（后续可接入 batch/preview）

## 下一步（Beta 持续项）
- 泳道：拖拽移动任务（变更状态/父任务）与即时刷新
- 日历：支持起止时间渲染与跨天覆盖可视化
- 批量级联：引入预览能力与错误回显，结合权限控制

## 环境约束
- 本地/测试：Docker Postgres；生产：Postgres；CI：Jenkins Docker Agent
