/**
 * 需求管理类型定义
 * Requirement Management Type Definitions
 */

/**
 * 需求状态枚举
 */
export enum RequirementStatus {
  Draft = 'draft',           // 草稿
  Pending = 'pending',       // 待评审
  Reviewing = 'reviewing',   // 评审中
  NeedMore = 'need_more',    // 待补充
  Approved = 'approved',     // 已通过
  Rejected = 'rejected',     // 已拒绝
  Converted = 'converted',   // 已转任务
  Archived = 'archived',     // 已归档
}

/**
 * 需求优先级枚举
 */
export enum RequirementPriority {
  Low = 'low',       // 低
  Medium = 'medium', // 中
  High = 'high',     // 高
  Urgent = 'urgent', // 紧急
}

/**
 * 需求复杂度枚举
 */
export enum RequirementComplexity {
  Simple = 'simple',               // 简单
  Medium = 'medium',               // 中等
  Complex = 'complex',             // 复杂
  VeryComplex = 'very_complex',    // 非常复杂
}

/**
 * 附件接口
 */
export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

/**
 * 需求接口
 */
export interface Requirement {
  // 主键和编号
  id: number;
  display_id: string;

  // 基础信息
  title: string;
  description?: string;

  // 关联信息
  project_id?: number;
  enterprise_id: number;
  submitter_id: number;
  reviewer_id?: number;

  // 状态和优先级
  status: RequirementStatus | string;
  priority: RequirementPriority | string;
  category?: string;

  // 业务信息
  business_value?: string;
  expected_outcome?: string;
  acceptance_criteria?: string;
  attachments?: Attachment[];

  // 评审信息
  review_status?: string;
  review_comment?: string;
  review_score?: number;
  reviewed_at?: string;

  // 估算信息
  estimated_hours?: number;
  estimated_cost?: number;
  complexity?: RequirementComplexity | string;

  // 转化信息
  converted_task_id?: number;
  converted_at?: string;
  converted_by?: number;

  // 时间戳
  submitted_at?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;

  // 关联对象名称（JOIN查询填充）
  project_name?: string;
  enterprise_name?: string;
  submitter_name?: string;
  reviewer_name?: string;

  // 统计信息
  comments_count?: number;
  views_count?: number;
}

/**
 * 创建需求请求
 */
export interface CreateRequirementRequest {
  title: string;
  description?: string;
  project_id?: number;
  enterprise_id?: number; // system用户创建时需要指定
  priority?: RequirementPriority | string;
  category?: string;
  business_value?: string;
  expected_outcome?: string;
  acceptance_criteria?: string;
  attachments?: Attachment[];
  due_date?: string;
}

/**
 * 更新需求请求
 */
export interface UpdateRequirementRequest {
  title?: string;
  description?: string;
  project_id?: number;
  priority?: RequirementPriority | string;
  category?: string;
  business_value?: string;
  expected_outcome?: string;
  acceptance_criteria?: string;
  attachments?: Attachment[];
  due_date?: string;
}

/**
 * 评审需求请求
 */
export interface ReviewRequirementRequest {
  action: 'approve' | 'reject' | 'need_more_info';
  comment?: string;
  score?: number; // 1-10
  estimated_hours?: number;
  estimated_cost?: number;
  complexity?: RequirementComplexity | string;
}

/**
 * 转任务请求
 */
export interface ConvertToTaskRequest {
  project_id?: number;
  task_title?: string;
  assignee_id?: number;
  due_date?: string;
  priority?: string;
  description?: string;
  create_subtasks?: boolean;
  link_requirement?: boolean;
}

/**
 * 需求筛选参数
 */
export interface RequirementFilters {
  status?: string[];
  priority?: string[];
  category?: string[];
  submitter_id?: number;
  reviewer_id?: number;
  enterprise_id?: number;
  project_id?: number;
  search?: string;
  due_after?: string;
  due_before?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority';
  sort_order?: 'asc' | 'desc';
}

/**
 * 需求列表响应
 */
export interface RequirementListResponse {
  data: Requirement[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * 需求统计信息
 */
export interface RequirementStats {
  total_requirements: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  pending_review: number;
  approved_this_month: number;
  converted_this_month: number;
  average_review_time_hours: number;
  conversion_rate: number;
}

/**
 * 需求状态配置
 */
export const REQUIREMENT_STATUS_CONFIG: Record<
  RequirementStatus,
  {
    label: string;
    color: string;
    icon: string;
  }
> = {
  [RequirementStatus.Draft]: {
    label: '草稿',
    color: 'default',
    icon: '📝',
  },
  [RequirementStatus.Pending]: {
    label: '待评审',
    color: 'blue',
    icon: '⏳',
  },
  [RequirementStatus.Reviewing]: {
    label: '评审中',
    color: 'processing',
    icon: '🔍',
  },
  [RequirementStatus.NeedMore]: {
    label: '待补充',
    color: 'warning',
    icon: '📋',
  },
  [RequirementStatus.Approved]: {
    label: '已通过',
    color: 'success',
    icon: '✅',
  },
  [RequirementStatus.Rejected]: {
    label: '已拒绝',
    color: 'error',
    icon: '❌',
  },
  [RequirementStatus.Converted]: {
    label: '已转任务',
    color: 'purple',
    icon: '🔄',
  },
  [RequirementStatus.Archived]: {
    label: '已归档',
    color: 'default',
    icon: '📦',
  },
};

/**
 * 需求优先级配置
 */
export const REQUIREMENT_PRIORITY_CONFIG: Record<
  RequirementPriority,
  {
    label: string;
    color: string;
    icon: string;
  }
> = {
  [RequirementPriority.Low]: {
    label: '低',
    color: 'default',
    icon: '⬇️',
  },
  [RequirementPriority.Medium]: {
    label: '中',
    color: 'blue',
    icon: '➡️',
  },
  [RequirementPriority.High]: {
    label: '高',
    color: 'orange',
    icon: '⬆️',
  },
  [RequirementPriority.Urgent]: {
    label: '紧急',
    color: 'red',
    icon: '🔥',
  },
};

/**
 * 需求复杂度配置
 */
export const REQUIREMENT_COMPLEXITY_CONFIG: Record<
  RequirementComplexity,
  {
    label: string;
    color: string;
    icon: string;
  }
> = {
  [RequirementComplexity.Simple]: {
    label: '简单',
    color: 'green',
    icon: '🟢',
  },
  [RequirementComplexity.Medium]: {
    label: '中等',
    color: 'blue',
    icon: '🔵',
  },
  [RequirementComplexity.Complex]: {
    label: '复杂',
    color: 'orange',
    icon: '🟠',
  },
  [RequirementComplexity.VeryComplex]: {
    label: '非常复杂',
    color: 'red',
    icon: '🔴',
  },
};

/**
 * 需求常量
 */
export const REQUIREMENT_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_TITLE_LENGTH: 500,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE: 1,
};
