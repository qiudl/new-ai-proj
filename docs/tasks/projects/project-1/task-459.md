# 任务 459：Beta 实施（MVP）

## 摘要
- 本阶段聚焦 MVP：智能泳道、任务日历、批量级联三个独立页面，避免影响现有列表页。

## 交付项
- 智能泳道（MVP）：/projects/:projectId/tasks/swimlanes
  - 按状态列分组展示（待办/进行中/已完成）
  - 轻量信息卡片：标题、负责人、截止日期
  - 支持复制分享链接
- 任务日历（MVP）：/projects/:projectId/tasks/calendar
  - 基于截止日期渲染日视图，溢出显示“更多”
  - 支持复制分享链接
- 批量级联（MVP）：/projects/:projectId/tasks/batch-cascade
  - 逗号分隔任务ID，批量更新父任务与状态

## 设计说明
- 数据源统一复用 TaskService.getTasks，分页上限合理控制
- 不新增全局状态管理，仅页面内状态
- 与现有 TasksPage 解耦，降低回归风险

## 后续计划（Beta 持续项）
- 泳道：拖拽修改状态/父子关系 + 实时刷新
- 日历：起止时间渲染与跨天覆盖
- 批量级联：接入 batch/preview 预览与权限校验

## 环境与约束
- 本地/测试：Docker Postgres
- 生产：Postgres
- CI：Jenkins Docker Agent

