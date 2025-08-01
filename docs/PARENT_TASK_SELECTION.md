# 父任务选择功能文档

## 概述

父任务选择功能是一个完整的层级任务管理解决方案，允许用户在创建和编辑任务时选择父任务，建立层级关系。该功能支持最多4级任务层级（0-3级），并包含完整的循环依赖检测和验证。

## 架构设计

### 后端架构

#### API 端点
- `GET /api/v1/projects/:id/tasks/search-parents` - 搜索可用的父任务
- `POST /api/v1/tasks/validate-parent` - 验证父任务选择的有效性

#### 核心功能
1. **父任务搜索**: 支持关键词搜索、分页、层级过滤
2. **循环依赖检测**: 使用递归SQL CTE算法检测潜在的循环依赖
3. **层级验证**: 确保任务层级不超过4级限制

#### 数据库支持
- 层级索引优化
- 父子关系约束
- 循环依赖检测存储过程

### 前端架构

#### 核心组件
1. **TaskParentSelector**: 下拉式父任务选择器，适用于简单场景
2. **TaskParentSelectorModal**: 模态框父任务选择器，支持复杂搜索和层级显示
3. **TaskTreeNode**: 层级任务节点显示组件
4. **TaskTreeList**: 任务树形列表组件

#### Hooks
1. **useTaskParentSearch**: 父任务搜索逻辑，包含缓存和防抖
2. **useParentValidation**: 父任务选择验证逻辑

#### 集成点
- TaskModal: 任务创建/编辑弹窗中的父任务选择
- TaskEditPage: 任务编辑页面中的父任务修改

## 功能特性

### 搜索和过滤
- **关键词搜索**: 支持任务标题和描述的模糊搜索
- **层级过滤**: 自动过滤不符合层级要求的任务
- **分页支持**: 处理大量任务数据的分页显示
- **实时搜索**: 带防抖的实时搜索体验

### 验证机制
- **循环依赖检测**: 防止创建循环引用的任务关系
- **层级限制**: 确保任务层级不超过系统限制
- **权限检查**: 验证用户对父任务的访问权限

### 用户体验
- **层级可视化**: 清晰的层级关系显示
- **响应式设计**: 适配桌面端和移动端
- **加载状态**: 完整的加载和错误状态处理
- **无障碍支持**: 键盘导航和屏幕阅读器支持

## 使用指南

### TaskParentSelector 组件

```tsx
import { TaskParentSelector } from '@/components/TaskParentSelector';

<TaskParentSelector
  projectId={1}
  currentTaskId={2}
  currentParentId={null}
  value={null}
  onChange={(parentId, parentTask) => {
    // 处理父任务选择
  }}
  placeholder="选择父任务..."
  allowClear={true}
  showValidation={true}
/>
```

### TaskParentSelectorModal 组件

```tsx
import { TaskParentSelectorModal } from '@/components/TaskParentSelectorModal';

<TaskParentSelectorModal
  visible={true}
  projectId={1}
  currentTaskId={2}
  onOk={(parentId, parentTask) => {
    // 处理确认选择
  }}
  onCancel={() => {
    // 处理取消
  }}
  title="选择父任务"
  allowClear={true}
/>
```

### API 使用示例

```javascript
// 搜索父任务
const response = await fetch(`/api/v1/projects/1/tasks/search-parents?keyword=测试&limit=20&offset=0`);
const data = await response.json();

// 验证父任务选择
const validation = await fetch('/api/v1/tasks/validate-parent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId: 2, parentId: 1 })
});
```

## 技术实现

### 性能优化
1. **缓存机制**: 搜索结果缓存5分钟，减少API调用
2. **防抖搜索**: 300ms防抖，避免频繁请求
3. **虚拟化渲染**: 大量数据时的渲染优化
4. **React.memo**: 组件级别的性能优化

### 内存管理
1. **AbortController**: 自动取消未完成的请求
2. **组件卸载检查**: 防止内存泄漏
3. **事件监听器清理**: 完整的清理机制

### 错误处理
1. **ErrorBoundary**: 组件级错误边界
2. **网络错误处理**: 优雅的网络异常处理
3. **验证错误提示**: 用户友好的错误信息

## 测试覆盖

### 单元测试
- 组件渲染测试
- 用户交互测试
- 验证逻辑测试
- 边界条件测试

### 集成测试
- 端到端工作流测试
- API集成测试
- 组件间交互测试

### 兼容性测试
- 跨浏览器兼容性
- 移动端响应式测试
- 无障碍性测试

## 部署和配置

### 环境变量
```env
# API配置
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1

# 缓存配置
REACT_APP_CACHE_TTL=300000

# 搜索配置
REACT_APP_SEARCH_DEBOUNCE=300
REACT_APP_SEARCH_LIMIT=20
```

### 构建配置
```json
{
  "scripts": {
    "build": "react-scripts build",
    "test": "react-scripts test",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "format": "prettier --write src/**/*.{js,jsx,ts,tsx}"
  }
}
```

## 故障排除

### 常见问题

1. **搜索无结果**
   - 检查API连接
   - 验证项目ID和权限
   - 确认搜索关键词

2. **循环依赖错误**
   - 检查任务层级关系
   - 验证父子关系逻辑
   - 查看控制台错误信息

3. **性能问题**
   - 检查网络连接
   - 验证缓存配置
   - 监控API响应时间

### 调试工具
- React DevTools Profiler
- Network tab in DevTools
- Console logging with logger utility

## 版本历史

### v1.0.0 (M4阶段完成)
- 完整的父任务选择功能
- 跨浏览器兼容性支持
- 移动端响应式设计
- 完整的测试覆盖
- 性能优化和内存管理

### 未来规划
- 批量父任务操作
- 拖拽式层级调整
- 更复杂的层级可视化
- 国际化支持

## 贡献指南

1. 遵循现有的代码风格和架构模式
2. 添加适当的测试覆盖
3. 更新相关文档
4. 确保跨浏览器兼容性
5. 考虑性能和可访问性影响

## 许可证

本项目遵循 MIT 许可证。