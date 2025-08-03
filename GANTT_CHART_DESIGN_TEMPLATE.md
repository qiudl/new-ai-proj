# 甘特图功能设计文档模板

## 📋 文档信息
- **任务**: {TASK_TITLE}
- **任务ID**: {TASK_ID}
- **文档类型**: 前端功能设计文档
- **创建时间**: {CREATION_DATE}
- **最后更新**: {UPDATE_DATE}

## 🎯 项目概述

### 业务背景
{BUSINESS_BACKGROUND}

### 核心目标
- 📊 **可视化展示**: 以甘特图形式展示项目时间线
- 🔗 **依赖关系**: 清晰显示任务间的依赖关系
- ⚡ **交互体验**: 支持拖拽、缩放、编辑等交互操作
- 📱 **响应式设计**: 适配桌面端和移动端显示

### 成功指标
- 用户操作响应时间 < 200ms
- 支持1000+任务的流畅渲染
- 跨浏览器兼容性 > 95%
- 用户满意度评分 > 4.5/5

## 📋 功能需求分析

### 核心功能
1. **时间轴显示**
   - 可调节时间粒度（日/周/月/季度）
   - 支持时间范围缩放和平移
   - 今日标线和工作日高亮

2. **任务展示**
   - 任务条形图显示（开始时间、结束时间、进度）
   - 任务层级结构（父子任务关系）
   - 任务状态色彩编码
   - 里程碑节点标记

3. **依赖关系**
   - 依赖线可视化连接
   - 关键路径高亮显示
   - 依赖冲突检测和提示

4. **交互操作**
   - 任务拖拽调整时间
   - 任务条长度调整
   - 依赖关系连线编辑
   - 右键菜单操作

### 高级功能
- **资源分配视图**: 显示人员工作负载
- **基线对比**: 计划vs实际进度对比
- **导出功能**: PNG/PDF/Excel格式导出
- **实时协作**: 多用户同时编辑

## 🎨 UI/UX设计

### 整体布局
```
┌─────────────────────────────────────────────────────────┐
│ 工具栏: [视图] [缩放] [筛选] [导出] [设置]                │
├──────────────┬──────────────────────────────────────────┤
│ 任务列表区域  │           甘特图时间轴区域                │
│              │                                          │
│ □ 项目1      │ ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │
│   □ 任务1    │   ████████████                          │
│   □ 任务2    │     ████████████                        │
│ □ 项目2      │ ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │
│              │                                          │
├──────────────┼──────────────────────────────────────────┤
│ 状态栏: 显示统计信息和操作提示                            │
└─────────────────────────────────────────────────────────┘
```

### 视觉设计规范
- **色彩方案**: 
  - 主色调: #1890ff (Ant Design主色)
  - 成功: #52c41a, 警告: #faad14, 错误: #ff4d4f
  - 背景: #f5f5f5, 边框: #d9d9d9
- **字体**: 
  - 中文: PingFang SC, Microsoft YaHei
  - 英文: Helvetica Neue, Arial
  - 代码: Consolas, Monaco, monospace
- **间距**: 8px基础单位，遵循8px栅格系统

### 组件设计
1. **GanttChart** - 主容器组件
2. **TaskList** - 左侧任务列表
3. **Timeline** - 时间轴组件
4. **TaskBar** - 任务条组件
5. **DependencyLine** - 依赖关系线
6. **ContextMenu** - 右键菜单
7. **Toolbar** - 工具栏组件

## 🔧 技术架构设计

### 技术栈选择
- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5.x
- **图形渲染**: SVG + Canvas 混合方案
- **状态管理**: Redux Toolkit + RTK Query
- **虚拟化**: React Window (大数据量优化)
- **时间处理**: Day.js
- **拖拽交互**: react-dnd 或 @dnd-kit/core

### 核心组件架构
```typescript
// 数据模型定义
interface GanttTask {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  parentId?: number;
  dependencies: number[];
  assignees: User[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  color?: string;
}

interface GanttProject {
  id: number;
  name: string;
  tasks: GanttTask[];
  startDate: Date;
  endDate: Date;
  baseline?: {
    startDate: Date;
    endDate: Date;
  };
}
```

### 核心算法
1. **时间轴计算算法**
   ```typescript
   const calculateTimeScale = (
     startDate: Date, 
     endDate: Date, 
     viewportWidth: number
   ) => {
     const totalDays = dayjs(endDate).diff(startDate, 'day');
     const pixelsPerDay = viewportWidth / totalDays;
     return { totalDays, pixelsPerDay };
   };
   ```

2. **关键路径算法** (CPM - Critical Path Method)
   ```typescript
   const calculateCriticalPath = (tasks: GanttTask[]) => {
     // 实现CPM算法，计算最早开始时间和最晚开始时间
     // 返回关键路径上的任务ID列表
   };
   ```

3. **依赖冲突检测**
   ```typescript
   const detectConflicts = (tasks: GanttTask[]) => {
     // 检测循环依赖和时间冲突
     // 返回冲突列表和建议解决方案
   };
   ```

## 📊 性能优化策略

### 渲染优化
1. **虚拟滚动**: 仅渲染可视区域内的任务
2. **Canvas优化**: 大量任务条使用Canvas绘制
3. **懒加载**: 依赖关系线按需计算和渲染
4. **防抖节流**: 拖拽和缩放操作使用防抖

### 数据优化
1. **分页加载**: 大项目按时间范围分页加载
2. **增量更新**: 仅更新变化的数据
3. **本地缓存**: IndexedDB缓存项目数据
4. **压缩传输**: API数据使用gzip压缩

### 代码分割
```typescript
// 懒加载甘特图组件
const GanttChart = lazy(() => import('./components/GanttChart'));

// 按功能分割代码块
const DependencyEditor = lazy(() => import('./components/DependencyEditor'));
const ResourceView = lazy(() => import('./components/ResourceView'));
```

## 🔌 API接口设计

### 数据获取接口
```typescript
// 获取项目甘特图数据
GET /api/v1/projects/{projectId}/gantt
Response: {
  success: boolean;
  data: {
    project: GanttProject;
    tasks: GanttTask[];
    dependencies: Dependency[];
    resources: Resource[];
  };
}

// 更新任务时间
PUT /api/v1/projects/{projectId}/tasks/{taskId}/schedule
Request: {
  startDate: string;
  endDate: string;
  dependencies?: number[];
}

// 批量更新任务
PATCH /api/v1/projects/{projectId}/tasks/batch
Request: {
  updates: Array<{
    taskId: number;
    changes: Partial<GanttTask>;
  }>;
}
```

### 实时同步
```typescript
// WebSocket实时数据同步
ws://api/v1/projects/{projectId}/gantt/subscribe
Messages: {
  type: 'task_updated' | 'dependency_changed' | 'user_cursor';
  data: any;
  userId: number;
  timestamp: string;
}
```

## 🧪 测试策略

### 单元测试
- **组件测试**: 使用React Testing Library测试组件行为
- **算法测试**: 时间计算、路径算法的准确性测试
- **工具函数**: 日期处理、数据转换函数测试

### 集成测试
- **API集成**: 与后端接口的数据交互测试
- **组件集成**: 复杂交互场景的端到端测试
- **状态管理**: Redux store的状态变更测试

### 性能测试
- **渲染性能**: 1000+任务的渲染时间测试
- **内存使用**: 长时间使用的内存泄漏检测
- **交互响应**: 拖拽操作的响应延迟测试

### 兼容性测试
- **浏览器兼容**: Chrome, Firefox, Safari, Edge
- **设备兼容**: 桌面端、平板、手机响应式测试
- **分辨率兼容**: 1920x1080, 1366x768, 4K显示器

## 📅 开发计划

### 第1周: 基础架构搭建
- [ ] 项目环境配置和依赖安装
- [ ] 基础组件结构设计
- [ ] 数据模型定义和类型声明
- [ ] 基础的时间轴渲染

### 第2周: 核心功能开发
- [ ] 任务条渲染和基础交互
- [ ] 拖拽功能实现
- [ ] 时间轴缩放和平移
- [ ] 任务列表与甘特图联动

### 第3周: 高级功能实现
- [ ] 依赖关系可视化
- [ ] 关键路径计算和显示
- [ ] 右键菜单和工具栏
- [ ] 进度更新和状态同步

### 第4周: 优化和完善
- [ ] 性能优化和虚拟滚动
- [ ] 响应式设计适配
- [ ] 错误处理和边界情况
- [ ] 单元测试和集成测试

### 第5周: 测试和上线
- [ ] 完整功能测试
- [ ] 用户体验测试
- [ ] 性能压力测试
- [ ] 文档完善和部署

## 🔍 风险评估与应对

### 技术风险
1. **性能瓶颈**: 大量任务渲染可能导致页面卡顿
   - 应对: 虚拟滚动 + Canvas优化
2. **复杂交互**: 拖拽操作的复杂状态管理
   - 应对: 使用成熟的拖拽库，充分测试
3. **浏览器兼容**: 不同浏览器的渲染差异
   - 应对: 渐进增强，核心功能优先

### 业务风险
1. **需求变更**: 甘特图功能需求可能调整
   - 应对: 模块化设计，便于扩展和修改
2. **用户接受度**: 复杂界面可能影响用户体验
   - 应对: 分阶段发布，收集用户反馈

## 📚 参考资料

### 设计参考
- [Microsoft Project](https://www.microsoft.com/en-us/microsoft-365/project) - 专业项目管理工具
- [Gantt Chart Library](https://github.com/frappe/gantt) - 开源甘特图实现
- [DHTMLX Gantt](https://dhtmlx.com/docs/products/dhtmlxGantt/) - 商业甘特图组件

### 技术文档
- [React官方文档](https://react.dev/) - React组件开发
- [Ant Design组件库](https://ant.design/) - UI组件规范
- [SVG教程](https://developer.mozilla.org/zh-CN/docs/Web/SVG) - SVG图形绘制

### 算法资料
- [关键路径法](https://zh.wikipedia.org/wiki/关键路径法) - CPM算法原理
- [项目网络图](https://en.wikipedia.org/wiki/Project_network) - 项目依赖关系建模

---

**文档状态**: 🚧 设计阶段  
**下一步**: 开发环境搭建和基础组件实现  
**负责人**: {ASSIGNEE_NAME}  
**审核人**: {REVIEWER_NAME}  

*本文档将随着开发进度持续更新和完善*