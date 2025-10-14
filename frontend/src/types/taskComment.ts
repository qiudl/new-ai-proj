/**
 * 任务评论类型定义
 * Task Comment Type Definitions
 */

/**
 * 评论用户信息(轻量级)
 */
export interface CommentUser {
  id: number;
  name: string;
  avatar: string;
}

/**
 * 任务评论
 */
export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  status: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: number | null;

  // 关联字段
  user?: CommentUser;
  can_delete: boolean;
}

/**
 * 创建评论请求
 */
export interface CreateTaskCommentRequest {
  content: string;
}

/**
 * 任务评论统计
 */
export interface TaskCommentStats {
  task_id: number;
  total_comments: number;
  participants: number;
  last_comment_at?: string | null;
}

/**
 * 评论列表响应
 */
export interface ListTaskCommentsResponse {
  comments: TaskComment[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * 评论API响应(标准格式)
 */
export interface TaskCommentApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
}

/**
 * 评论常量
 */
export const COMMENT_CONSTANTS = {
  STATUS: {
    ACTIVE: 'active',
    DELETED: 'deleted',
  },
  MAX_LENGTH: 2000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * 评论状态类型
 */
export type CommentStatus = typeof COMMENT_CONSTANTS.STATUS[keyof typeof COMMENT_CONSTANTS.STATUS];

/**
 * 评论排序方式
 */
export type CommentSortOrder = 'asc' | 'desc';
