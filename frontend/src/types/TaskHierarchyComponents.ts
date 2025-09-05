/**
 * TypeScript Type Definitions for Task Hierarchy Components
 * 任务层级组件的完整TypeScript类型定义
 */

import React from 'react';
import { TreeProps, CardProps, ButtonProps } from 'antd';
import { 
  UnifiedTaskNode, 
  TaskDescendantsApiResponse 
} from './UnifiedTaskNode';
import { 
  TaskHierarchyDisplayMode,
  TaskSortMode,
  TaskHierarchyFilter,
  NodeAction,
  NodeActionEvent,
  TaskHierarchyCallbacks
} from './TaskHierarchy';

// ===== 基础组件接口 =====

/**
 * 任务节点渲染器接口
 */
export interface TaskNodeRenderer {
  /** 渲染节点图标 */
  renderIcon?: (node: UnifiedTaskNode, expanded?: boolean) => React.ReactNode;
  /** 渲染节点标题 */
  renderTitle?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 渲染状态标签 */
  renderStatus?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 渲染优先级标签 */
  renderPriority?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 渲染负责人信息 */
  renderAssignee?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 渲染截止日期 */
  renderDueDate?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 渲染进度信息 */
  renderProgress?: (node: UnifiedTaskNode) => React.ReactNode;
  /** 渲染操作按钮 */
  renderActions?: (node: UnifiedTaskNode, actions: NodeActionEvent[]) => React.ReactNode;
  /** 自定义完整节点渲染 */
  renderNode?: (
    node: UnifiedTaskNode, 
    defaultRender: () => React.ReactNode,
    depth: number
  ) => React.ReactNode;
}

/**
 * 任务树配置接口
 */
export interface TaskTreeConfig {
  /** 显示模式 */
  displayMode: TaskHierarchyDisplayMode;
  /** 排序模式 */
  sortMode: TaskSortMode;
  /** 过滤条件 */
  filter?: TaskHierarchyFilter;
  /** 最大展示深度 */
  maxDepth: number;
  /** 是否启用虚拟滚动 */
  enableVirtualScroll: boolean;
  /** 虚拟滚动项高度 */
  virtualItemHeight: number;
  /** 是否启用多选 */
  enableMultiSelect: boolean;
  /** 是否启用拖拽排序 */
  enableDragDrop: boolean;
  /** 是否显示行号 */
  showLineNumbers: boolean;
  /** 是否显示连接线 */
  showConnectingLines: boolean;
  /** 是否自动展开 */
  autoExpand: boolean;
  /** 默认展开层级 */
  defaultExpandLevel: number;
}

/**
 * 任务树样式配置
 */
export interface TaskTreeStyleConfig {
  /** 节点高度 */
  nodeHeight: number;
  /** 缩进距离 */
  indentSize: number;
  /** 节点间距 */
  nodeSpacing: number;
  /** 字体大小 */
  fontSize: number;
  /** 主色调 */
  primaryColor: string;
  /** 次要色调 */
  secondaryColor: string;
  /** 成功色调 */
  successColor: string;
  /** 警告色调 */
  warningColor: string;
  /** 错误色调 */
  errorColor: string;
  /** 背景色 */
  backgroundColor: string;
  /** 边框色 */
  borderColor: string;
  /** 悬停背景色 */
  hoverBackgroundColor: string;
  /** 选中背景色 */
  selectedBackgroundColor: string;
  /** 自定义CSS类名 */
  customClassName?: string;
  /** 自定义内联样式 */
  customStyle?: React.CSSProperties;
}

// ===== 具体组件Props接口 =====

/**
 * TaskDetailDescendantsTreeV2 组件Props
 */
export interface TaskDetailDescendantsTreeV2Props {
  /** 项目ID */
  projectId: number;
  /** 根任务ID */
  rootTaskId: number;
  /** 限制数量 */
  limit?: number;
  /** 显示模式 */
  displayMode?: TaskHierarchyDisplayMode;
  /** 启用懒加载 */
  enableLazyLoad?: boolean;
  /** 启用缓存 */
  enableCache?: boolean;
  /** 节点点击事件 */
  onNodeClick?: (node: UnifiedTaskNode) => void;
  /** 节点双击事件 */
  onNodeDoubleClick?: (node: UnifiedTaskNode) => void;
  /** 节点右键事件 */
  onNodeRightClick?: (node: UnifiedTaskNode, event: React.MouseEvent) => void;
  /** 节点展开事件 */
  onNodeExpand?: (node: UnifiedTaskNode) => void;
  /** 节点收起事件 */
  onNodeCollapse?: (node: UnifiedTaskNode) => void;
  /** 自定义渲染器 */
  renderer?: Partial<TaskNodeRenderer>;
  /** 样式配置 */
  styleConfig?: Partial<TaskTreeStyleConfig>;
  /** 组件类名 */
  className?: string;
  /** 组件样式 */
  style?: React.CSSProperties;
  /** 测试ID */
  testId?: string;
}

/**
 * EnhancedHierarchicalTaskTreeV2 组件Props
 */
export interface EnhancedHierarchicalTaskTreeV2Props {
  /** 项目ID */
  projectId: number;
  /** 根任务ID */
  rootTaskId?: number;
  /** 启用虚拟滚动 */
  enableVirtualScroll?: boolean;
  /** 启用多选 */
  enableMultiSelect?: boolean;
  /** 启用拖拽排序 */
  enableDragDrop?: boolean;
  /** 显示模式 */
  displayMode?: TaskHierarchyDisplayMode;
  /** 任务选择事件 */
  onTaskSelect?: (taskIds: number[]) => void;
  /** 任务双击事件 */
  onTaskDoubleClick?: (taskId: number) => void;
  /** 任务拖拽事件 */
  onTaskDrag?: (draggedTaskId: number, targetTaskId: number, position: 'before' | 'after' | 'inside') => void;
  /** 搜索变化事件 */
  onSearchChange?: (searchValue: string) => void;
  /** 过滤变化事件 */
  onFilterChange?: (filter: TaskHierarchyFilter) => void;
  /** 排序变化事件 */
  onSortChange?: (sortMode: TaskSortMode) => void;
  /** 自定义工具栏渲染 */
  renderToolbar?: () => React.ReactNode;
  /** 自定义搜索框渲染 */
  renderSearchBox?: (searchValue: string, onChange: (value: string) => void) => React.ReactNode;
  /** 自定义过滤器渲染 */
  renderFilters?: (filter: TaskHierarchyFilter, onChange: (filter: TaskHierarchyFilter) => void) => React.ReactNode;
  /** 树配置 */
  treeConfig?: Partial<TaskTreeConfig>;
  /** 样式配置 */
  styleConfig?: Partial<TaskTreeStyleConfig>;
  /** Antd Tree组件的额外Props */
  treeProps?: Partial<TreeProps>;
  /** Antd Card组件的额外Props */
  cardProps?: Partial<CardProps>;
  /** 组件类名 */
  className?: string;
  /** 组件样式 */
  style?: React.CSSProperties;
}

/**
 * TaskTreeUnified 组件Props
 */
export interface TaskTreeUnifiedProps {
  /** 项目ID */
  projectId: number;
  /** 根任务ID */
  rootTaskId?: number;
  /** 树的高度 */
  height?: number;
  /** 显示工具栏 */
  showToolbar?: boolean;
  /** 显示图标 */
  showIcons?: boolean;
  /** 显示状态 */
  showStatus?: boolean;
  /** 显示优先级 */
  showPriority?: boolean;
  /** 显示负责人 */
  showAssignee?: boolean;
  /** 显示截止日期 */
  showDueDate?: boolean;
  /** 显示进度 */
  showProgress?: boolean;
  /** 启用虚拟滚动 */
  enableVirtualScroll?: boolean;
  /** 启用多选 */
  enableMultiSelect?: boolean;
  /** 最大深度 */
  maxDepth?: number;
  /** 节点点击事件 */
  onNodeClick?: (node: UnifiedTaskNode) => void;
  /** 节点双击事件 */
  onNodeDoubleClick?: (node: UnifiedTaskNode) => void;
  /** 选择变化事件 */
  onSelectionChange?: (selectedNodes: UnifiedTaskNode[]) => void;
  /** 自定义节点渲染 */
  nodeRenderer?: (node: UnifiedTaskNode, defaultRender: () => React.ReactNode) => React.ReactNode;
  /** 自定义工具栏渲染 */
  toolbarRenderer?: () => React.ReactNode;
  /** 加载状态渲染 */
  loadingRenderer?: () => React.ReactNode;
  /** 错误状态渲染 */
  errorRenderer?: (error: string, retry: () => void) => React.ReactNode;
  /** 空状态渲染 */
  emptyRenderer?: () => React.ReactNode;
  /** 组件类名 */
  className?: string;
  /** 组件样式 */
  style?: React.CSSProperties;
  /** 测试ID */
  testId?: string;
}

// ===== 工具类型和辅助接口 =====

/**
 * 任务树节点数据结构
 */
export interface TaskTreeNodeData {
  /** 节点键值 */
  key: string;
  /** 节点标题 */
  title: React.ReactNode;
  /** 节点图标 */
  icon?: React.ReactNode;
  /** 子节点 */
  children?: TaskTreeNodeData[];
  /** 是否为叶子节点 */
  isLeaf: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否可选择 */
  selectable?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 节点深度 */
  depth: number;
  /** 原始任务节点数据 */
  node: UnifiedTaskNode;
  /** 额外的元数据 */
  metadata?: Record<string, any>;
}

/**
 * 任务树事件数据
 */
export interface TaskTreeEventData {
  /** 事件类型 */
  type: 'click' | 'doubleClick' | 'rightClick' | 'expand' | 'collapse' | 'select' | 'drag' | 'drop';
  /** 触发事件的节点 */
  node: UnifiedTaskNode;
  /** 额外的事件数据 */
  eventData?: any;
  /** 事件时间戳 */
  timestamp: number;
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
}

/**
 * 任务树状态接口
 */
export interface TaskTreeState {
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error?: string;
  /** 选中的节点键值 */
  selectedKeys: string[];
  /** 展开的节点键值 */
  expandedKeys: string[];
  /** 已加载的节点 */
  loadedNodes: Set<number>;
  /** 搜索关键词 */
  searchValue: string;
  /** 当前过滤条件 */
  filter: TaskHierarchyFilter;
  /** 当前排序模式 */
  sortMode: TaskSortMode;
  /** 树的数据版本（用于缓存失效） */
  dataVersion: number;
}

/**
 * 任务树操作接口
 */
export interface TaskTreeOperations {
  /** 刷新树数据 */
  refresh: () => Promise<void>;
  /** 重新加载特定节点 */
  reloadNode: (nodeId: number) => Promise<void>;
  /** 展开节点 */
  expandNode: (nodeId: number) => void;
  /** 收起节点 */
  collapseNode: (nodeId: number) => void;
  /** 展开所有节点 */
  expandAll: () => void;
  /** 收起所有节点 */
  collapseAll: () => void;
  /** 选择节点 */
  selectNode: (nodeId: number, multiSelect?: boolean) => void;
  /** 取消选择 */
  unselectNode: (nodeId: number) => void;
  /** 清空选择 */
  clearSelection: () => void;
  /** 搜索节点 */
  search: (keyword: string) => void;
  /** 应用过滤器 */
  applyFilter: (filter: TaskHierarchyFilter) => void;
  /** 应用排序 */
  applySort: (sortMode: TaskSortMode) => void;
  /** 滚动到节点 */
  scrollToNode: (nodeId: number) => void;
  /** 获取节点路径 */
  getNodePath: (nodeId: number) => UnifiedTaskNode[];
  /** 获取选中的节点 */
  getSelectedNodes: () => UnifiedTaskNode[];
}

// ===== Hook返回值类型 =====

/**
 * useTaskTreeState Hook返回值
 */
export interface UseTaskTreeStateReturn {
  /** 树状态 */
  state: TaskTreeState;
  /** 树操作方法 */
  operations: TaskTreeOperations;
  /** 更新状态方法 */
  updateState: (updates: Partial<TaskTreeState>) => void;
}

/**
 * useTaskTreeEvents Hook返回值
 */
export interface UseTaskTreeEventsReturn {
  /** 绑定事件监听器 */
  bindEventListener: (eventType: string, handler: (event: TaskTreeEventData) => void) => void;
  /** 解绑事件监听器 */
  unbindEventListener: (eventType: string) => void;
  /** 触发事件 */
  emitEvent: (event: TaskTreeEventData) => void;
  /** 事件历史 */
  eventHistory: TaskTreeEventData[];
}

/**
 * useTaskTreePerformance Hook返回值
 */
export interface UseTaskTreePerformanceReturn {
  /** 性能指标 */
  metrics: {
    renderTime: number;
    nodeCount: number;
    memoryUsage: number;
    cacheHitRate: number;
  };
  /** 开始性能监控 */
  startMonitoring: () => void;
  /** 停止性能监控 */
  stopMonitoring: () => void;
  /** 重置性能指标 */
  resetMetrics: () => void;
}

// ===== 类型定义完毕 - 通过 index.ts 统一导出 =====