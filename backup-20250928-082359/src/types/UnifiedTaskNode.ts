/**
 * 统一任务节点接口定义
 * Unified Task Node interface to resolve data model confusion
 * 
 * This interface unifies the various Node types used across components
 * and aligns with both TaskDescendantNode (descendants API) and Task (children API)
 */

// 任务状态枚举
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
  ARCHIVED: 'archived'
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// 任务优先级枚举
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export type TaskPriorityType = typeof TaskPriority[keyof typeof TaskPriority];

// 基础任务节点接口 - 对应 TaskDescendantNode 的字段
export interface BaseTaskNode {
  /** 任务ID */
  readonly id: number;
  
  /** 父任务ID */
  readonly parent_id: number | null;
  
  /** 项目ID */
  readonly project_id?: number;
  
  /** 任务标题 */
  title: string;
  
  /** 任务状态 */
  status: TaskStatusType;
  
  /** 层级深度 */
  readonly level: number;
  
  /** 是否有子任务 */
  readonly has_children: boolean;
  
  /** 排序顺序 */
  sort_order: number;
}

// 扩展任务节点接口 - 包含完整Task模型的额外字段
export interface ExtendedTaskNode extends BaseTaskNode {
  /** 任务描述 */
  description?: string | null;
  
  /** 负责人ID */
  assignee_id?: number | null;
  
  /** 负责人姓名 */
  assignee_name?: string | null;
  
  /** 截止日期 (ISO 8601 格式) */
  due_date?: string | null;
  
  /** 开始日期 (ISO 8601 格式) */
  start_datetime?: string | null;
  
  /** 截止日期 (ISO 8601 格式) */
  due_datetime?: string | null;
  
  /** 优先级 */
  priority?: TaskPriorityType;
  
  /** 子任务数量 */
  children_count?: number;
  
  /** 进度百分比 0-100 */
  progress_percent?: number;
  
  /** 总工时（秒） */
  total_time_seconds?: number;
  
  /** 预估工时（分钟） */
  estimated_minutes?: number;
  
  /** 实际工时（分钟） */
  actual_minutes?: number;
  
  /** 标签列表 */
  tags?: string[] | null;
  
  /** 依赖关系 */
  dependencies?: number[] | null;
  
  /** 创建时间 (ISO 8601 格式) */
  readonly created_at?: string;
  
  /** 更新时间 (ISO 8601 格式) */
  readonly updated_at?: string;
  
  /** 自定义字段 */
  custom_fields?: Record<string, any> | null;
  
  /** 时间单位偏好 */
  time_unit_preference?: 'auto' | 'minutes' | 'hours' | 'days';
  
  /** 每日工作时长 */
  work_hours_per_day?: number;
  
  /** 时间跟踪模式 */
  time_tracking_mode?: 'manual' | 'automatic' | 'hybrid';
}

// 默认使用扩展节点接口，向后兼容
export type UnifiedTaskNode = ExtendedTaskNode;

// 类型守卫函数
export const isBaseTaskNode = (node: any): node is BaseTaskNode => {
  return node &&
    typeof node.id === 'number' &&
    typeof node.title === 'string' &&
    typeof node.status === 'string' &&
    typeof node.level === 'number' &&
    typeof node.has_children === 'boolean' &&
    typeof node.sort_order === 'number';
};

export const isExtendedTaskNode = (node: any): node is ExtendedTaskNode => {
  return isBaseTaskNode(node);
};

// 用于API响应的类型定义
export interface TaskNodeApiResponse {
  data: UnifiedTaskNode[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

// 用于后代树API的响应格式（支持V1/V2 API）
export interface TaskDescendantsApiResponse {
  data: {
    data: UnifiedTaskNode[];
    root?: {
      id: number;
      title: string;
      description?: string;
      status?: string;
    };
    meta: {
      requested_depth: number;
      max_depth_reached: boolean;
      truncated: boolean;
      total_returned: number;
      hidden_nodes_truncated: boolean;
      response_type?: string;
      include_extended_fields?: boolean;
    };
    page_info?: {
      has_more: boolean;
      next_cursor: any;
      page?: number;
      page_size?: number;
      total?: number;
    };
    pagination?: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}