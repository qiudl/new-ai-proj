/**
 * Central Type Definitions Export
 * 集中的类型定义导出文件
 */

// ===== Core Types =====
export * from './task';
export * from './project';
export * from './user';

// ===== Unified Task Node Types =====
export * from './UnifiedTaskNode';

// ===== Task Hierarchy Types =====
// 从 TaskHierarchy 导出枚举
export { TaskHierarchyDisplayMode, TaskSortMode, NodeAction } from './TaskHierarchy';
// 从 TaskHierarchyUtilities 导出 EventTypes
export { EventTypes } from './TaskHierarchyUtilities';

// ===== Hook Types =====
export * from '../hooks/useTaskHierarchy';

// ===== Re-export commonly used types with aliases =====
import type { UnifiedTaskNode, TaskDescendantsApiResponse } from './UnifiedTaskNode';
import type { TaskHierarchyDisplayMode, TaskSortMode, TaskHierarchyFilter } from './TaskHierarchy';
import type { UseTaskHierarchyOptions, UseTaskHierarchyReturn } from '../hooks/useTaskHierarchy';
import type { 
  TaskDetailDescendantsTreeV2Props,
  EnhancedHierarchicalTaskTreeV2Props,
  TaskTreeUnifiedProps,
  TaskTreeNodeData
} from './TaskHierarchyComponents';

// Common aliases for frequently used types
export type {
  // Core task types
  UnifiedTaskNode as TaskNode,
  TaskDescendantsApiResponse as TasksApiResponse,
  
  // Hierarchy enums
  TaskHierarchyDisplayMode as DisplayMode,
  TaskSortMode as SortMode,
  TaskHierarchyFilter as HierarchyFilter,
  
  // Hook types
  UseTaskHierarchyOptions as TaskHierarchyOptions,
  UseTaskHierarchyReturn as TaskHierarchyHook,
  
  // Component prop types
  TaskDetailDescendantsTreeV2Props as DescendantsTreeProps,
  EnhancedHierarchicalTaskTreeV2Props as HierarchicalTreeProps,
  TaskTreeUnifiedProps as UnifiedTreeProps,
  TaskTreeNodeData as TreeNodeData
};

// ===== Type guards and utilities =====
export {
  isValidTaskNode,
  isLeafNode,
  isRootNode,
  hasStatus,
  isCompleted,
  isInProgress,
  isOverdue,
} from './TaskHierarchyUtilities';

// ===== Common type combinations =====

/**
 * 任务操作相关类型的联合
 */
export type TaskOperation = 'create' | 'read' | 'update' | 'delete' | 'move' | 'copy';

/**
 * 任务权限类型
 */
export type TaskPermission = {
  [K in TaskOperation]: boolean;
};

/**
 * 带权限的任务节点
 */
export type TaskNodeWithPermissions = UnifiedTaskNode & {
  permissions: TaskPermission;
};

/**
 * 任务树组件的通用Props
 */
export interface CommonTaskTreeProps {
  projectId: number;
  rootTaskId?: number;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  loading?: boolean;
  error?: string | null;
}

/**
 * 任务树事件处理器集合
 */
export interface TaskTreeEventHandlers {
  onNodeClick?: (node: UnifiedTaskNode) => void;
  onNodeDoubleClick?: (node: UnifiedTaskNode) => void;
  onNodeRightClick?: (node: UnifiedTaskNode, event: React.MouseEvent) => void;
  onNodeExpand?: (node: UnifiedTaskNode) => void;
  onNodeCollapse?: (node: UnifiedTaskNode) => void;
  onSelectionChange?: (selectedNodes: UnifiedTaskNode[]) => void;
}

/**
 * 任务树渲染选项
 */
export interface TaskTreeRenderOptions {
  showIcons?: boolean;
  showStatus?: boolean;
  showPriority?: boolean;
  showAssignee?: boolean;
  showDueDate?: boolean;
  showProgress?: boolean;
  showToolbar?: boolean;
}

/**
 * 任务树配置的完整类型
 */
export interface FullTaskTreeConfig extends TaskTreeRenderOptions {
  displayMode: TaskHierarchyDisplayMode;
  sortMode: TaskSortMode;
  filter?: TaskHierarchyFilter;
  enableVirtualScroll?: boolean;
  enableMultiSelect?: boolean;
  enableDragDrop?: boolean;
  maxDepth?: number;
  height?: number;
}

// ===== Environment and Context Types =====

/**
 * 应用主题类型
 */
export type AppTheme = 'light' | 'dark' | 'auto';

/**
 * 语言类型
 */
export type Language = 'zh-CN' | 'en-US' | 'ja-JP';

/**
 * 应用上下文类型
 */
export interface AppContext {
  theme: AppTheme;
  language: Language;
  user?: {
    id: number;
    name: string;
    avatar?: string;
    permissions: string[];
  };
  project?: {
    id: number;
    name: string;
  };
}

// ===== API Related Types =====

/**
 * API响应状态
 */
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 通用API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    version: string;
    [key: string]: any;
  };
}

/**
 * 分页API响应格式
 */
export interface PaginatedApiResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ===== Utility Types =====

/**
 * 深度可选类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 深度必需类型
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * 选择性必需类型
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 选择性可选类型
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 函数参数类型提取
 */
export type ExtractFunctionArgs<T> = T extends (...args: infer P) => any ? P : never;

/**
 * 函数返回值类型提取
 */
export type ExtractFunctionReturn<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * 数组元素类型提取
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * 对象值类型提取
 */
export type ObjectValues<T> = T[keyof T];

/**
 * 字符串字面量联合类型
 */
export type StringUnion<T> = T extends string ? T : never;

// ===== Component Ref Types =====

/**
 * 任务树组件引用类型
 */
export interface TaskTreeRef {
  refresh: () => Promise<void>;
  expandAll: () => void;
  collapseAll: () => void;
  getSelectedNodes: () => UnifiedTaskNode[];
  scrollToNode: (nodeId: number) => void;
}

/**
 * Hook引用类型
 */
export interface TaskHierarchyHookRef {
  refresh: () => Promise<void>;
  loadChildren: (parentId: number) => Promise<void>;
  toggleExpanded: (nodeId: number) => void;
  clear: () => void;
}

// ===== Development and Debug Types =====

/**
 * 开发模式配置
 */
export interface DevConfig {
  enableDebug: boolean;
  enablePerformanceMonitoring: boolean;
  enableStateLogging: boolean;
  mockData?: boolean;
  debugLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

/**
 * 调试信息类型
 */
export interface DebugInfo {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  props: Record<string, any>;
  state: Record<string, any>;
  performance: {
    mountTime: number;
    updateTime: number;
    unmountTime?: number;
  };
}

// ===== Export common constants =====

/**
 * 默认配置常量
 */
export const DEFAULT_CONFIGS = {
  TREE_HEIGHT: 400,
  PAGE_SIZE: 20,
  MAX_DEPTH: 10,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  DEBOUNCE_DELAY: 300,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * 状态常量
 */
export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

/**
 * 优先级常量
 */
export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

/**
 * 显示模式常量
 */
export const DISPLAY_MODES = {
  TREE: 'tree',
  FLAT: 'flat',
  TABLE: 'table',
  CARD: 'card',
} as const;

// ===== Final exports for convenience =====
export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES];
export type TaskPriority = typeof TASK_PRIORITIES[keyof typeof TASK_PRIORITIES];
export type TreeDisplayMode = typeof DISPLAY_MODES[keyof typeof DISPLAY_MODES];