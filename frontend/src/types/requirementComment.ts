/**
 * 需求评论类型定义
 * Requirement Comment Type Definitions
 */

/**
 * 评论类型枚举
 */
export enum RequirementCommentType {
  General = 'general',      // 一般评论
  Question = 'question',    // 提问
  Suggestion = 'suggestion', // 建议
  Approval = 'approval',    // 批准
}

/**
 * 评论状态枚举
 */
export enum RequirementCommentStatus {
  Active = 'active',               // 活跃
  Deleted = 'deleted',             // 已删除
  PendingReview = 'pending_review', // 待审核
  Rejected = 'rejected',           // 已拒绝
}

/**
 * 提及的用户信息
 */
export interface MentionedUser {
  user_id: number;
  username: string;
  avatar?: string;
}

/**
 * 附件类型
 */
export interface CommentAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

/**
 * 需求评论
 */
export interface RequirementComment {
  // 基本信息
  id: number;
  requirement_id: number;
  user_id: number;
  parent_comment_id?: number | null;

  // 内容
  content: string;
  comment_type: RequirementCommentType;
  attachments?: CommentAttachment[];

  // 特殊标记
  is_internal: boolean;  // 内部评论（客户不可见）
  is_pinned: boolean;    // 置顶评论

  // @用户提及
  mentioned_user_ids: number[];
  mentioned_users?: MentionedUser[];
  mentioned_count: number;

  // 状态
  status: RequirementCommentStatus;

  // 时间戳
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: number | null;

  // 审核信息
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  rejection_note?: string | null;
  moderation_flag?: string | null;

  // 关联用户信息（从后端JOIN查询）
  username?: string;
  user_avatar?: string;
  user_type?: string;

  // 回复信息
  replies_count?: number;
  replies?: RequirementComment[];
}

/**
 * 创建评论请求
 */
export interface CreateRequirementCommentRequest {
  requirement_id: number;
  parent_comment_id?: number;
  content: string;
  comment_type?: RequirementCommentType;
  attachments?: CommentAttachment[];
  is_internal?: boolean;
  mentioned_user_ids?: number[];
}

/**
 * 更新评论请求
 */
export interface UpdateRequirementCommentRequest {
  content?: string;
  comment_type?: RequirementCommentType;
  attachments?: CommentAttachment[];
  is_internal?: boolean;
  is_pinned?: boolean;
}

/**
 * 评论列表响应
 */
export interface RequirementCommentListResponse {
  data: RequirementComment[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * 评论筛选选项
 */
export interface RequirementCommentFilters {
  requirement_id?: number;
  user_id?: number;
  mentioned_user_id?: number;  // 查询@了某用户的评论
  comment_type?: RequirementCommentType[];
  status?: RequirementCommentStatus;
  is_internal?: boolean;
  is_pinned?: boolean;
  has_mentions?: boolean;      // 查询有@提及的评论
  parent_comment_id?: number | null; // null for top-level comments
  created_after?: string;
  created_before?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * 评论统计信息
 */
export interface RequirementCommentStats {
  total_comments: number;
  by_comment_type: Record<string, number>;
  active_comments: number;
  deleted_comments: number;
  internal_comments: number;
  pinned_comments: number;
  top_level_comments: number;
  reply_comments: number;
  todays_comments: number;
  this_weeks_comments: number;
}

/**
 * API响应格式
 */
export interface RequirementCommentApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
}

/**
 * 评论常量
 */
export const REQUIREMENT_COMMENT_CONSTANTS = {
  // 评论类型
  TYPE: {
    GENERAL: RequirementCommentType.General,
    QUESTION: RequirementCommentType.Question,
    SUGGESTION: RequirementCommentType.Suggestion,
    APPROVAL: RequirementCommentType.Approval,
  },

  // 评论状态
  STATUS: {
    ACTIVE: RequirementCommentStatus.Active,
    DELETED: RequirementCommentStatus.Deleted,
    PENDING_REVIEW: RequirementCommentStatus.PendingReview,
    REJECTED: RequirementCommentStatus.Rejected,
  },

  // 限制
  MAX_LENGTH: 2000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * 评论类型标签配置
 */
export const COMMENT_TYPE_CONFIG = {
  [RequirementCommentType.General]: {
    label: '评论',
    color: 'default',
    icon: '💬',
  },
  [RequirementCommentType.Question]: {
    label: '提问',
    color: 'blue',
    icon: '❓',
  },
  [RequirementCommentType.Suggestion]: {
    label: '建议',
    color: 'orange',
    icon: '💡',
  },
  [RequirementCommentType.Approval]: {
    label: '批准',
    color: 'green',
    icon: '✅',
  },
} as const;

/**
 * 评论状态标签配置
 */
export const COMMENT_STATUS_CONFIG = {
  [RequirementCommentStatus.Active]: {
    label: '活跃',
    color: 'success',
  },
  [RequirementCommentStatus.Deleted]: {
    label: '已删除',
    color: 'default',
  },
  [RequirementCommentStatus.PendingReview]: {
    label: '待审核',
    color: 'processing',
  },
  [RequirementCommentStatus.Rejected]: {
    label: '已拒绝',
    color: 'error',
  },
} as const;
