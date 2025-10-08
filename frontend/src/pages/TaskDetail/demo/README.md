# TaskDetail Component Demos

这个目录包含TaskDetail相关组件的演示页面，用于独立测试和展示组件功能。

## 可用的演示页面

### 1. TaskDetailComponentsDemo（推荐）

**访问路径**: `/demo/task-detail-components`

**完整URL**: `http://localhost:3000/demo/task-detail-components`

**功能展示**:
- ✅ **完整组件系统展示** - 所有TaskDetail组件（任务2500-2511）
- ✅ **TaskBreadcrumb** - 面包屑导航 (任务2500)
- ✅ **EnhancedTaskHeaderCard** - 增强型任务头部 (任务2501)
- ✅ **TaskDetailContent** - 任务详情内容 (任务2502)
- ✅ **TaskDetailSidebar** - 任务详情侧边栏 (任务2503)
- ✅ **TaskDetailModals** - 任务详情弹窗 (任务2504)
- ✅ **TaskDetailLayout** - 任务详情布局 (任务2505)

**交互功能**:
- 三个Tab页：独立组件展示、完整布局展示、组件文档
- 状态切换（待办、进行中、已完成、阻塞）
- 归档/取消归档切换
- 实时预览所有组件效果
- 完整的API文档和使用示例

**使用方法**:
1. 启动前端开发服务器: `npm run dev`
2. 访问: `http://localhost:3000/demo/task-detail-components`
3. 使用控制面板切换不同状态
4. 在不同Tab页查看组件效果

### 2. EnhancedTaskHeaderCardDemo

**访问路径**: `/demo/enhanced-task-header-card`

**完整URL**: `http://localhost:3000/demo/enhanced-task-header-card`

**功能展示**:
- ✅ 状态背景色和边框（5种状态）
- ✅ 任务进度条显示
- ✅ Daily Focus切换按钮
- ✅ 归档状态提示和恢复功能
- ✅ 编辑和删除操作
- ✅ 时间剩余显示（逾期/即将到期/正常）
- ✅ 负责人信息显示

**交互功能**:
- 状态切换下拉框（待办、进行中、已完成、阻塞）
- 归档/取消归档按钮
- 实时预览组件效果
- 完整的功能说明文档

**使用方法**:
1. 启动前端开发服务器: `npm run dev`
2. 访问: `http://localhost:3000/demo/enhanced-task-header-card`
3. 使用控制面板切换不同状态
4. 测试各种交互功能

## 添加新的演示页面

1. 在 `demo/` 目录下创建新的组件文件
2. 在 `demo/index.tsx` 中导出组件
3. 在 `App.tsx` 中添加lazy import和路由配置
4. 更新此README文档

## 开发规范

- 演示页面应该是独立的，不依赖实际的后端API
- 使用Mock数据展示组件功能
- 提供交互控制面板方便测试不同状态
- 包含详细的功能说明和使用文档
- 支持实时预览和状态切换

## 相关文件

- `TaskDetailComponentsDemo.tsx` - 完整TaskDetail组件系统演示（推荐）
- `EnhancedTaskHeaderCardDemo.tsx` - EnhancedTaskHeaderCard组件演示
- `index.tsx` - 演示页面导出
- `README.md` - 本文档

## 注意事项

- 演示页面仅用于开发和测试，不应在生产环境中使用
- 确保Mock数据符合实际的数据结构
- 测试各种边界情况和异常状态
