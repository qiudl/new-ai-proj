/**
 * Task Hierarchy Utility Types
 * 任务层级功能的实用工具类型
 */

import { UnifiedTaskNode } from './UnifiedTaskNode';
import { TaskHierarchyFilter, TaskSortMode } from './TaskHierarchy';

// ===== 类型守卫和验证器 =====

/**
 * 检查是否为有效的任务节点
 */
export const isValidTaskNode = (obj: any): obj is UnifiedTaskNode => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.level === 'number' &&
    typeof obj.has_children === 'boolean' &&
    typeof obj.sort_order === 'number'
  );
};

/**
 * 检查是否为叶子节点
 */
export const isLeafNode = (node: UnifiedTaskNode): boolean => {
  return !node.has_children;
};

/**
 * 检查是否为根节点
 */
export const isRootNode = (node: UnifiedTaskNode): boolean => {
  return node.parent_id === null || node.parent_id === undefined;
};

/**
 * 检查节点是否有特定状态
 */
export const hasStatus = (node: UnifiedTaskNode, status: string): boolean => {
  return node.status === status;
};

/**
 * 检查节点是否已完成
 */
export const isCompleted = (node: UnifiedTaskNode): boolean => {
  return hasStatus(node, 'completed');
};

/**
 * 检查节点是否进行中
 */
export const isInProgress = (node: UnifiedTaskNode): boolean => {
  return hasStatus(node, 'in_progress');
};

/**
 * 检查节点是否已过期
 */
export const isOverdue = (node: UnifiedTaskNode): boolean => {
  if (!node.due_date) return false;
  return new Date(node.due_date) < new Date();
};

// ===== 工具类型定义 =====

/**
 * 任务节点的可选字段类型
 */
export type OptionalTaskFields = Pick<UnifiedTaskNode, 
  | 'description' 
  | 'assignee_id' 
  | 'assignee_name'
  | 'due_date' 
  | 'priority' 
  | 'children_count'
  | 'progress_percent'
  | 'total_time_seconds'
  | 'created_at'
  | 'updated_at'
  | 'custom_fields'
>;

/**
 * 任务节点的必需字段类型
 */
export type RequiredTaskFields = Pick<UnifiedTaskNode,
  | 'id'
  | 'parent_id'
  | 'project_id'
  | 'title'
  | 'status'
  | 'level'
  | 'has_children'
  | 'sort_order'
>;

/**
 * 任务节点创建时需要的字段
 */
export type TaskNodeCreationFields = RequiredTaskFields & Partial<OptionalTaskFields>;

/**
 * 任务节点更新时可修改的字段
 */
export type TaskNodeUpdateFields = Partial<Omit<UnifiedTaskNode, 'id' | 'created_at'>>;

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * 只读的任务节点类型
 */
export type ReadonlyTaskNode = DeepReadonly<UnifiedTaskNode>;

/**
 * 任务节点字段的键类型
 */
export type TaskNodeKey = keyof UnifiedTaskNode;

/**
 * 可排序的字段类型
 */
export type SortableFields = 
  | 'id'
  | 'title'
  | 'status'
  | 'priority'
  | 'due_date'
  | 'created_at'
  | 'updated_at'
  | 'sort_order'
  | 'level';

/**
 * 可筛选的字段类型
 */
export type FilterableFields = 
  | 'status'
  | 'priority'
  | 'assignee_id'
  | 'project_id'
  | 'has_children';

// ===== 函数类型定义 =====

/**
 * 节点比较函数类型
 */
export type NodeCompareFn = (a: UnifiedTaskNode, b: UnifiedTaskNode) => number;

/**
 * 节点筛选函数类型
 */
export type NodeFilterFn = (node: UnifiedTaskNode) => boolean;

/**
 * 节点转换函数类型
 */
export type NodeTransformFn<T> = (node: UnifiedTaskNode) => T;

/**
 * 节点归约函数类型
 */
export type NodeReduceFn<T> = (accumulator: T, currentNode: UnifiedTaskNode, index: number, array: UnifiedTaskNode[]) => T;

/**
 * 异步节点操作函数类型
 */
export type AsyncNodeOperationFn<T = void> = (node: UnifiedTaskNode) => Promise<T>;

// ===== 排序相关类型 =====

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 排序配置
 */
export interface SortConfig {
  field: SortableFields;
  direction: SortDirection;
  customCompareFn?: NodeCompareFn;
}

/**
 * 多字段排序配置
 */
export type MultiSortConfig = SortConfig[];

// ===== 筛选相关类型 =====

/**
 * 基础筛选条件
 */
export type BaseFilterCondition<T> = {
  field: keyof UnifiedTaskNode;
  operator: 'eq' | 'ne' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with' | 'gt' | 'gte' | 'lt' | 'lte';
  value: T | T[];
};

/**
 * 字符串筛选条件
 */
export type StringFilterCondition = BaseFilterCondition<string>;

/**
 * 数字筛选条件
 */
export type NumberFilterCondition = BaseFilterCondition<number>;

/**
 * 日期筛选条件
 */
export type DateFilterCondition = BaseFilterCondition<string>;

/**
 * 布尔筛选条件
 */
export type BooleanFilterCondition = BaseFilterCondition<boolean>;

/**
 * 联合筛选条件
 */
export type FilterCondition = 
  | StringFilterCondition 
  | NumberFilterCondition 
  | DateFilterCondition 
  | BooleanFilterCondition;

/**
 * 复合筛选器
 */
export interface ComplexFilter {
  conditions: FilterCondition[];
  logic: 'and' | 'or';
  customFilterFn?: NodeFilterFn;
}

// ===== 分页相关类型 =====

/**
 * 分页配置
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => string;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===== 缓存相关类型 =====

/**
 * 缓存键生成函数
 */
export type CacheKeyGenerator = (...args: any[]) => string;

/**
 * 缓存条目
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * 缓存策略
 */
export type CacheStrategy = 'lru' | 'fifo' | 'ttl' | 'custom';

/**
 * 缓存配置
 */
export interface CacheConfig {
  strategy: CacheStrategy;
  maxSize: number;
  defaultTTL: number;
  checkExpiredInterval?: number;
  customEvictionFn?: (entries: CacheEntry[]) => CacheEntry[];
}

// ===== 事件相关类型 =====

/**
 * 事件类型枚举
 */
const EventTypes = {
  NODE_CLICK: 'node:click',
  NODE_DOUBLE_CLICK: 'node:doubleClick',
  NODE_RIGHT_CLICK: 'node:rightClick',
  NODE_EXPAND: 'node:expand',
  NODE_COLLAPSE: 'node:collapse',
  NODE_SELECT: 'node:select',
  NODE_UNSELECT: 'node:unselect',
  TREE_REFRESH: 'tree:refresh',
  TREE_LOAD_START: 'tree:loadStart',
  TREE_LOAD_END: 'tree:loadEnd',
  TREE_ERROR: 'tree:error',
  FILTER_CHANGE: 'filter:change',
  SORT_CHANGE: 'sort:change',
  SEARCH_CHANGE: 'search:change'
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

/**
 * 事件监听器函数类型
 */
export type EventListener<T = any> = (event: T) => void;

/**
 * 事件分发器接口
 */
export interface EventDispatcher {
  on: <T = any>(eventType: EventType, listener: EventListener<T>) => void;
  off: (eventType: EventType, listener?: EventListener) => void;
  emit: <T = any>(eventType: EventType, event: T) => void;
  once: <T = any>(eventType: EventType, listener: EventListener<T>) => void;
}

// ===== 性能相关类型 =====

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 组件渲染时间 */
  renderTime: number;
  /** 数据加载时间 */
  loadTime: number;
  /** 节点数量 */
  nodeCount: number;
  /** 内存使用量（KB） */
  memoryUsage: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 虚拟化渲染的节点数 */
  virtualizedNodeCount?: number;
  /** DOM节点数量 */
  domNodeCount: number;
}

/**
 * 性能监控配置
 */
export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  maxSamples: number;
  reportInterval: number;
  onReport?: (metrics: PerformanceMetrics) => void;
}

// ===== 工具函数类型 =====

/**
 * 树遍历访问器函数
 */
export type TreeVisitor = (node: UnifiedTaskNode, depth: number, path: UnifiedTaskNode[]) => boolean | void;

/**
 * 树构建器选项
 */
export interface TreeBuilderOptions {
  rootId?: number;
  maxDepth?: number;
  sortFn?: NodeCompareFn;
  filterFn?: NodeFilterFn;
  includeRoot?: boolean;
}

/**
 * 树统计信息
 */
export interface TreeStats {
  totalNodes: number;
  maxDepth: number;
  leafNodeCount: number;
  branchNodeCount: number;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
}

// ===== 错误处理相关类型 =====

/**
 * 任务树错误类型
 */
export type TaskTreeErrorType = 
  | 'network_error'
  | 'validation_error'
  | 'permission_error'
  | 'data_error'
  | 'timeout_error'
  | 'unknown_error';

/**
 * 任务树错误信息
 */
export interface TaskTreeError {
  type: TaskTreeErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: number;
  context?: string;
}

/**
 * 错误恢复策略
 */
export type ErrorRecoveryStrategy = 
  | 'retry'
  | 'fallback'
  | 'ignore'
  | 'user_action'
  | 'refresh';

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  strategy: ErrorRecoveryStrategy;
  maxRetries: number;
  retryDelay: number;
  fallbackData?: UnifiedTaskNode[];
  onError?: (error: TaskTreeError) => void;
  onRecover?: (error: TaskTreeError, recoveryData: any) => void;
}

// ===== 导出所有工具类型和函数 =====
export {
  EventTypes
};