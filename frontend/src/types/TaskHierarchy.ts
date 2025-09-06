/**
 * Task Hierarchy Types
 * 任务层级结构相关类型定义
 */

import { UnifiedTaskNode } from './UnifiedTaskNode';

// 显示模式枚举
export enum TaskHierarchyDisplayMode {
  /** 树形显示 */
  TREE = 'tree',
  /** 平铺列表 */
  FLAT = 'flat',
  /** 表格显示 */
  TABLE = 'table',
  /** 卡片显示 */
  CARD = 'card'
}

// 排序方式枚举
export enum TaskSortMode {
  /** 按排序号 */
  SORT_ORDER = 'sort_order',
  /** 按创建时间 */
  CREATED_AT = 'created_at',
  /** 按更新时间 */
  UPDATED_AT = 'updated_at',
  /** 按优先级 */
  PRIORITY = 'priority',
  /** 按状态 */
  STATUS = 'status',
  /** 按截止时间 */
  DUE_DATE = 'due_date',
  /** 自定义 */
  CUSTOM = 'custom'
}

// 过滤条件接口
export interface TaskHierarchyFilter {
  /** 状态过滤 */
  statuses?: string[];
  /** 优先级过滤 */
  priorities?: string[];
  /** 负责人过滤 */
  assigneeIds?: number[];
  /** 标签过滤 */
  tags?: string[];
  /** 截止时间范围 */
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  /** 关键词搜索 */
  keyword?: string;
  /** 是否只显示有子任务的节点 */
  hasChildrenOnly?: boolean;
  /** 是否只显示叶子节点 */
  leafNodesOnly?: boolean;
}

// 树节点操作类型
export enum NodeAction {
  EXPAND = 'expand',
  COLLAPSE = 'collapse',
  LOAD_CHILDREN = 'load_children',
  SELECT = 'select',
  EDIT = 'edit',
  DELETE = 'delete',
  ADD_CHILD = 'add_child',
  MOVE = 'move',
  COPY = 'copy'
}

// 节点操作事件
export interface NodeActionEvent {
  action: NodeAction;
  nodeId: number;
  node: UnifiedTaskNode;
  payload?: any;
  timestamp: number;
}

// 树形结构配置
export interface TaskTreeConfig {
  /** 显示模式 */
  displayMode: TaskHierarchyDisplayMode;
  /** 排序模式 */
  sortMode: TaskSortMode;
  /** 自定义排序函数 */
  customSortFn?: (a: UnifiedTaskNode, b: UnifiedTaskNode) => number;
  /** 过滤条件 */
  filter?: TaskHierarchyFilter;
  /** 是否显示根节点 */
  showRoot?: boolean;
  /** 是否启用虚拟滚动 */
  enableVirtualScroll?: boolean;
  /** 虚拟滚动项高度 */
  virtualItemHeight?: number;
  /** 是否启用多选 */
  enableMultiSelect?: boolean;
  /** 是否启用拖拽 */
  enableDragDrop?: boolean;
  /** 默认展开层级 */
  defaultExpandLevel?: number;
  /** 是否记住展开状态 */
  rememberExpandState?: boolean;
  /** 展开状态存储键 */
  expandStateKey?: string;
}

// 节点渲染配置
export interface NodeRenderConfig {
  /** 任务ID渲染函数 */
  taskIdRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 自定义图标函数 */
  iconRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 是否显示状态 */
  showStatus?: boolean;
  /** 状态渲染函数 */
  statusRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 是否显示优先级 */
  showPriority?: boolean;
  /** 优先级渲染函数 */
  priorityRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 是否显示负责人 */
  showAssignee?: boolean;
  /** 负责人渲染函数 */
  assigneeRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 是否显示截止时间 */
  showDueDate?: boolean;
  /** 截止时间渲染函数 */
  dueDateRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 是否显示进度 */
  showProgress?: boolean;
  /** 进度渲染函数 */
  progressRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 操作按钮渲染函数 */
  actionsRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 自定义标题渲染 */
  titleRender?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 自定义整个节点渲染 */
  nodeRender?: (node: UnifiedTaskNode, config: NodeRenderConfig) => React.ReactNode;
}

// 性能监控接口
export interface TaskHierarchyPerformance {
  /** 加载开始时间 */
  loadStartTime: number;
  /** 加载结束时间 */
  loadEndTime: number;
  /** 加载耗时 */
  loadDuration: number;
  /** 渲染开始时间 */
  renderStartTime: number;
  /** 渲染结束时间 */
  renderEndTime: number;
  /** 渲染耗时 */
  renderDuration: number;
  /** 节点数量 */
  nodeCount: number;
  /** 层级深度 */
  maxDepth: number;
  /** 内存使用情况 */
  memoryUsage?: {
    used: number;
    limit: number;
  };
}

// 缓存策略配置
export interface CacheStrategy {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 缓存类型 */
  type: 'memory' | 'sessionStorage' | 'localStorage';
  /** 缓存键前缀 */
  keyPrefix?: string;
  /** 缓存超时时间(毫秒) */
  timeout: number;
  /** 最大缓存条目数 */
  maxEntries?: number;
  /** 缓存策略 */
  strategy: 'lru' | 'fifo' | 'ttl';
  /** 是否在组件卸载时清理缓存 */
  clearOnUnmount?: boolean;
}

// 懒加载配置
export interface LazyLoadConfig {
  /** 是否启用懒加载 */
  enabled: boolean;
  /** 预加载阈值（展开节点时预加载几层） */
  preloadDepth?: number;
  /** 是否启用预测性预加载 */
  enablePredictivePreload?: boolean;
  /** 预加载延迟时间(毫秒) */
  preloadDelay?: number;
  /** 最大并发加载数 */
  maxConcurrentLoads?: number;
  /** 重试次数 */
  retryAttempts?: number;
  /** 重试延迟时间(毫秒) */
  retryDelay?: number;
}

// 事件回调接口
export interface TaskHierarchyCallbacks {
  /** 节点点击事件 */
  onNodeClick?: (node: UnifiedTaskNode, event: React.MouseEvent) => void;
  /** 节点双击事件 */
  onNodeDoubleClick?: (node: UnifiedTaskNode, event: React.MouseEvent) => void;
  /** 节点右键事件 */
  onNodeRightClick?: (node: UnifiedTaskNode, event: React.MouseEvent) => void;
  /** 节点展开事件 */
  onNodeExpand?: (node: UnifiedTaskNode) => void;
  /** 节点收起事件 */
  onNodeCollapse?: (node: UnifiedTaskNode) => void;
  /** 节点选择事件 */
  onNodeSelect?: (selectedNodes: UnifiedTaskNode[]) => void;
  /** 数据加载开始事件 */
  onLoadStart?: (parentId: number) => void;
  /** 数据加载完成事件 */
  onLoadComplete?: (parentId: number, data: UnifiedTaskNode[]) => void;
  /** 数据加载错误事件 */
  onLoadError?: (parentId: number, error: Error) => void;
  /** 拖拽开始事件 */
  onDragStart?: (node: UnifiedTaskNode, event: React.DragEvent) => void;
  /** 拖拽结束事件 */
  onDragEnd?: (node: UnifiedTaskNode, event: React.DragEvent) => void;
  /** 放置事件 */
  onDrop?: (dragNode: UnifiedTaskNode, dropNode: UnifiedTaskNode, dropPosition: 'before' | 'after' | 'inside') => void;
}

// 完整的任务层级组件属性
export interface TaskHierarchyProps {
  /** 项目ID */
  projectId: number;
  /** 根任务ID */
  rootTaskId?: number;
  /** 树形结构配置 */
  config?: Partial<TaskTreeConfig>;
  /** 节点渲染配置 */
  renderConfig?: Partial<NodeRenderConfig>;
  /** 缓存策略配置 */
  cacheConfig?: Partial<CacheStrategy>;
  /** 懒加载配置 */
  lazyLoadConfig?: Partial<LazyLoadConfig>;
  /** 事件回调 */
  callbacks?: TaskHierarchyCallbacks;
  /** 自定义样式类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 是否禁用 */
  disabled?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 错误状态 */
  error?: Error | null;
  /** 是否显示性能监控信息 */
  showPerformanceInfo?: boolean;
  /** 测试ID */
  testId?: string;
}

// 导出所有相关类型 - 通过 index.ts 统一导出
// export type { 这里移除直接导出，通过 index.ts 统一管理 }