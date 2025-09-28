# TaskDetailPage 组件架构设计

## 📐 架构设计原则

### 核心原则
1. **单一职责原则 (SRP)**: 每个组件只负责一个明确的功能
2. **组合优于继承**: 通过props和children实现灵活组合
3. **数据向下，事件向上**: 明确的单向数据流
4. **可测试性**: 组件粒度适中，便于单元测试
5. **可复用性**: 通用组件可在其他页面复用
6. **渐进式加载**: 非关键组件延迟加载

## 🏗️ 新组件架构设计

### 整体架构图

```
TaskDetailPage (主容器 - 路由级组件)
├── TaskDetailProvider (Context提供者)
├── TaskDetailErrorBoundary (错误边界)
├── TaskDetailLayout (布局组件)
│   ├── TaskDetailHeader (页头组件)
│   │   ├── TaskBreadcrumb (面包屑导航)
│   │   ├── TaskTitle (任务标题)
│   │   └── TaskActionBar (操作按钮栏)
│   │       ├── EditButton
│   │       ├── DeleteButton
│   │       ├── ArchiveButton
│   │       └── MoreActionsDropdown
│   │
│   ├── TaskDetailContent (主内容区域)
│   │   └── TaskDetailTabs (标签页容器)
│   │       ├── TaskInfoTab (任务信息标签)
│   │       │   ├── TaskBasicCard (基本信息卡片)
│   │       │   ├── TaskDetailCard (详细信息卡片)
│   │       │   └── TaskStatusCard (状态卡片)
│   │       │
│   │       ├── TaskDocumentTab (文档标签)
│   │       │   ├── DocumentToolbar (文档工具栏)
│   │       │   ├── DocumentList (文档列表)
│   │       │   ├── DocumentEditor (文档编辑器)
│   │       │   └── DocumentUploader (文档上传)
│   │       │
│   │       ├── TaskProgressTab (进度标签)
│   │       │   ├── ProgressOverview (进度概览)
│   │       │   ├── SubtaskTree (子任务树)
│   │       │   ├── CompletionStats (完成统计)
│   │       │   └── EfficiencyChart (效率图表)
│   │       │
│   │       └── TaskTimelineTab (时间线标签)
│   │           ├── TimelineFilter (时间线过滤器)
│   │           └── TimelineList (时间线列表)
│   │
│   └── TaskDetailSidebar (侧边栏)
│       ├── TaskTimer (计时器)
│       ├── RelatedTasks (相关任务)
│       │   ├── ParentTask (父任务)
│       │   ├── SiblingTasks (兄弟任务)
│       │   └── SubtasksSummary (子任务摘要)
│       ├── QuickActions (快捷操作)
│       └── TaskMetadata (元数据信息)
│
└── TaskDetailModals (弹窗管理器)
    ├── TaskEditModal (编辑弹窗)
    ├── TaskDeleteModal (删除确认弹窗)
    ├── TaskArchiveModal (归档弹窗)
    └── BulkImportModal (批量导入弹窗)
```

## 📦 组件详细设计

### 1. TaskDetailPage (主容器组件)

```typescript
interface TaskDetailPageProps {
  // 从路由传入
  projectId: string;
  taskId: string;
}

// 主要职责：
// - 初始化Context Provider
// - 设置错误边界
// - 管理页面级状态
// - 处理路由参数
```

### 2. TaskDetailProvider (Context提供者)

```typescript
interface TaskDetailContextValue {
  // 核心数据
  task: Task | null;
  project: Project | null;
  
  // 加载状态
  loading: {
    task: boolean;
    documents: boolean;
    relations: boolean;
    timeline: boolean;
  };
  
  // 错误状态
  errors: {
    task: Error | null;
    documents: Error | null;
    relations: Error | null;
    timeline: Error | null;
  };
  
  // UI状态
  ui: {
    activeTab: string;
    sidebarCollapsed: boolean;
    modals: {
      edit: boolean;
      delete: boolean;
      archive: boolean;
      bulkImport: boolean;
    };
  };
  
  // 操作方法
  actions: {
    refresh: () => Promise<void>;
    updateTask: (data: Partial<Task>) => Promise<void>;
    deleteTask: () => Promise<void>;
    archiveTask: () => Promise<void>;
    setActiveTab: (tab: string) => void;
    toggleModal: (modal: string, visible: boolean) => void;
  };
}
```

### 3. TaskDetailLayout (布局组件)

```typescript
interface TaskDetailLayoutProps {
  header: React.ReactNode;
  content: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

// 职责：
// - 定义页面布局结构
// - 响应式布局适配
// - 管理布局状态（如侧边栏折叠）
```

### 4. TaskDetailHeader (页头组件)

```typescript
interface TaskDetailHeaderProps {
  task: Task;
  project: Project;
  onBack?: () => void;
  actions?: React.ReactNode;
}

// 职责：
// - 显示面包屑导航
// - 显示任务标题
// - 渲染操作按钮
// - 显示任务状态标签
```

### 5. TaskDetailTabs (标签页容器)

```typescript
interface TaskDetailTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  task: Task;
  loading: boolean;
}

// Tab配置
const tabConfig = [
  { key: 'info', label: '任务信息', icon: <InfoCircleOutlined /> },
  { key: 'documents', label: '文档', icon: <FileTextOutlined /> },
  { key: 'progress', label: '进度', icon: <BarChartOutlined /> },
  { key: 'timeline', label: '时间线', icon: <HistoryOutlined /> }
];

// 职责：
// - 管理标签页切换
// - 懒加载标签内容
// - 处理标签权限控制
```

### 6. 任务信息标签组件群

#### TaskBasicCard
```typescript
interface TaskBasicCardProps {
  task: Task;
  editable?: boolean;
  onEdit?: () => void;
}

// 显示字段：
// - 任务标题
// - 任务描述
// - 创建时间
// - 更新时间
```

#### TaskDetailCard
```typescript
interface TaskDetailCardProps {
  task: Task;
  project: Project;
  editable?: boolean;
}

// 显示字段：
// - 负责人
// - 截止日期
// - 优先级
// - 标签
// - 自定义字段
```

#### TaskStatusCard
```typescript
interface TaskStatusCardProps {
  task: Task;
  onStatusChange?: (status: string) => void;
  loading?: boolean;
}

// 功能：
// - 当前状态展示
// - 状态切换操作
// - 状态历史记录
```

### 7. 文档管理组件群

#### DocumentList
```typescript
interface DocumentListProps {
  taskId: number;
  documents: Document[];
  loading?: boolean;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
}
```

#### DocumentEditor
```typescript
interface DocumentEditorProps {
  taskId: number;
  document?: Document;
  mode: 'create' | 'edit';
  onSave?: (content: string) => Promise<void>;
  onCancel?: () => void;
}
```

### 8. 进度分析组件群

#### SubtaskTree
```typescript
interface SubtaskTreeProps {
  parentTaskId: number;
  subtasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddSubtask?: () => void;
  expandedKeys?: string[];
  onExpand?: (keys: string[]) => void;
}
```

#### CompletionStats
```typescript
interface CompletionStatsProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
  showChart?: boolean;
  compact?: boolean;
}
```

### 9. 侧边栏组件群

#### TaskTimer
```typescript
interface TaskTimerProps {
  taskId: number;
  compact?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}
```

#### RelatedTasks
```typescript
interface RelatedTasksProps {
  currentTaskId: number;
  parentTask?: Task;
  siblingTasks?: Task[];
  subtasksSummary?: {
    total: number;
    completed: number;
  };
  onTaskClick?: (task: Task) => void;
}
```

## 🔌 组件通信方案

### 1. Context 通信
- 核心数据通过 `TaskDetailContext` 共享
- UI状态通过 Context 统一管理
- 操作方法通过 Context actions 提供

### 2. Props 通信
- 父子组件直接通过 props 传递
- 回调函数用于子组件向父组件通信
- 纯展示组件只接收数据props

### 3. 事件总线 (可选)
```typescript
// 用于跨组件通信的事件
enum TaskDetailEvents {
  TASK_UPDATED = 'task:updated',
  DOCUMENT_ADDED = 'document:added',
  SUBTASK_COMPLETED = 'subtask:completed',
  TIMER_STARTED = 'timer:started'
}
```

## 🎯 性能优化策略

### 1. 代码分割
```typescript
// 懒加载大型组件
const TaskGanttChart = lazy(() => import('./TaskGanttChart'));
const TaskAnalysisPanel = lazy(() => import('./TaskAnalysisPanel'));
const DocumentEditor = lazy(() => import('./DocumentEditor'));
```

### 2. Memo优化
```typescript
// 对纯展示组件使用React.memo
export const TaskBasicCard = React.memo(TaskBasicCardComponent);
export const CompletionStats = React.memo(CompletionStatsComponent);
```

### 3. 状态分离
```typescript
// 将频繁变化的状态分离，避免不必要的重渲染
const useTimerState = () => {
  // 独立的计时器状态
};

const useDocumentState = () => {
  // 独立的文档状态
};
```

### 4. 虚拟滚动
```typescript
// 对长列表使用虚拟滚动
<VirtualList
  data={timelineEvents}
  height={500}
  itemHeight={80}
  renderItem={renderTimelineItem}
/>
```

## 📝 组件接口定义示例

### Task 接口
```typescript
interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: number;
  parentId?: number;
  dueDate?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Document 接口
```typescript
interface Document {
  id: number;
  taskId: number;
  title: string;
  content: string;
  type: 'markdown' | 'text' | 'html';
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

## 🚀 实施计划

### 第一阶段：基础架构
1. 创建 TaskDetailProvider 和 Context
2. 实现 TaskDetailLayout 布局组件
3. 创建基础的 Header 和 Tabs 组件

### 第二阶段：功能组件
4. 实现任务信息相关组件
5. 实现文档管理组件
6. 实现进度分析组件

### 第三阶段：增强功能
7. 添加侧边栏组件
8. 实现弹窗管理器
9. 添加性能优化

### 第四阶段：集成测试
10. 组件集成测试
11. 性能测试与优化
12. 用户体验优化

## ✅ 验收标准

### 功能验收
- [ ] 所有原有功能正常工作
- [ ] 组件加载速度提升30%以上
- [ ] 代码可维护性显著提高

### 技术验收
- [ ] 单个组件不超过300行代码
- [ ] 组件测试覆盖率达到80%
- [ ] TypeScript 类型完整
- [ ] 无循环依赖

### 性能验收
- [ ] 首次加载时间减少20%
- [ ] 内存使用优化15%
- [ ] 减少不必要的重渲染

---

*文档创建时间: 2025-09-28*
*架构师: Claude Code Assistant*