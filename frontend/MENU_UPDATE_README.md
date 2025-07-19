# 左侧菜单修改说明

## 修改内容

已成功将左侧菜单中的"批量导入"改为"任务管理"，并添加了三个子菜单：

### 新的菜单结构：
- 工作台
- 项目管理  
- **任务管理** ⬅️ 新增
  - 任务看板 ⬅️ 新增
  - 任务列表 ⬅️ 新增
  - 批量导入 ⬅️ 移动到子菜单

## 文件修改清单

### 1. 新增页面组件
- `frontend/src/pages/TaskBoardPage.tsx` - 任务看板页面
- `frontend/src/pages/TaskListPage.tsx` - 任务列表页面

### 2. 修改的文件
- `frontend/src/components/Layout.tsx` - 更新左侧菜单结构和导航逻辑
- `frontend/src/App.tsx` - 添加新的路由配置
- `frontend/src/services/api.ts` - 添加 getUserName 辅助函数

### 3. 路由配置

新增的路由：
```
/task-board - 任务看板页面
/projects/:projectId/task-board - 项目相关的任务看板页面
/task-list - 任务列表页面  
/projects/:projectId/task-list - 项目相关的任务列表页面
/bulk-import - 批量导入页面
/projects/:projectId/bulk-import - 项目相关的批量导入页面
```

## 功能特性

### 任务看板页面 (TaskBoardPage.tsx)
- 可视化看板视图，按状态分列显示任务
- 支持点击按钮快速更改任务状态
- 显示任务优先级和负责人信息
- 实时统计每列任务数量

### 任务列表页面 (TaskListPage.tsx)  
- 表格形式展示所有任务
- 支持新建、编辑、删除任务
- 可以设置任务状态、优先级、负责人
- 分页显示和搜索功能

### 菜单导航优化
- 自动识别当前页面并高亮对应菜单项
- 支持子菜单的展开和折叠
- 任务管理相关页面会自动展开子菜单

## 技术实现

- 使用 Ant Design 组件库
- React Hooks 进行状态管理
- React Router 进行路由管理
- 通过 API 调用获取用户和任务数据
- 响应式设计，支持不同屏幕尺寸

## 注意事项

1. 确保后端API支持以下接口：
   - `GET /api/projects/:projectId/tasks` - 获取项目任务列表
   - `GET /api/users` - 获取用户列表
   - `GET /api/users/:userId` - 获取单个用户信息
   - `PUT /api/tasks/:taskId` - 更新任务
   - `DELETE /api/tasks/:taskId` - 删除任务
   - `POST /api/projects/:projectId/tasks` - 创建任务

2. 用户权限验证通过 localStorage 中的 token 进行

3. 所有页面都需要登录后才能访问（通过 PrivateRoute 组件保护）
