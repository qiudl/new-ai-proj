/**
 * 任务评论服务
 * Task Comment Service
 */

import api from './api';
import {
  TaskComment,
  CreateTaskCommentRequest,
  ListTaskCommentsResponse,
  TaskCommentStats,
  TaskCommentApiResponse
} from '../types/taskComment';

/**
 * 任务评论Service类
 */
export class TaskCommentService {
  /**
   * 创建评论
   * POST /api/v1/tasks/:taskId/comments
   */
  static async createComment(
    taskId: number,
    content: string
  ): Promise<TaskComment> {
    try {
      const request: CreateTaskCommentRequest = { content };
      const response: any = await api.post(`/tasks/${taskId}/comments`, request);

      // 处理标准包装格式 { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response.message || '创建评论失败');
        }
        return response.data as TaskComment;
      }

      // 处理已解包的响应
      return response as TaskComment;
    } catch (error: any) {
      console.error('TaskCommentService.createComment error:', error);
      throw new Error(error?.message || '创建评论失败');
    }
  }

  /**
   * 获取评论列表(分页)
   * GET /api/v1/tasks/:taskId/comments?page=1&limit=20
   */
  static async listComments(
    taskId: number,
    params?: { page?: number; limit?: number }
  ): Promise<ListTaskCommentsResponse> {
    try {
      const { page = 1, limit = 20 } = params || {};
      const response: any = await api.get(`/tasks/${taskId}/comments`, {
        params: { page, limit }
      });

      // 处理标准包装格式 { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response.message || '获取评论列表失败');
        }
        return response.data as ListTaskCommentsResponse;
      }

      // 处理已解包的响应
      // 检查是否是直接的评论列表格式
      if (response && typeof response === 'object') {
        if ('comments' in response && Array.isArray(response.comments)) {
          return response as ListTaskCommentsResponse;
        }
        // 如果response.data是评论列表格式
        if (response.data && 'comments' in response.data) {
          return response.data as ListTaskCommentsResponse;
        }
      }

      // 兜底返回空列表
      console.warn('TaskCommentService.listComments: unexpected response shape', response);
      return {
        comments: [],
        total: 0,
        page: page,
        page_size: limit,
      };
    } catch (error: any) {
      console.error('TaskCommentService.listComments error:', error);

      // 返回空数据而不是抛出错误,以实现优雅降级
      return {
        comments: [],
        total: 0,
        page: params?.page || 1,
        page_size: params?.limit || 20,
      };
    }
  }

  /**
   * 删除评论
   * DELETE /api/v1/tasks/:taskId/comments/:commentId
   */
  static async deleteComment(
    taskId: number,
    commentId: number
  ): Promise<void> {
    try {
      const response: any = await api.delete(`/tasks/${taskId}/comments/${commentId}`);

      // 处理标准包装格式 { success, message }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response.message || '删除评论失败');
        }
        return;
      }

      // 如果是204 No Content或者成功响应,直接返回
      return;
    } catch (error: any) {
      console.error('TaskCommentService.deleteComment error:', error);
      throw new Error(error?.message || '删除评论失败');
    }
  }

  /**
   * 获取评论统计
   * GET /api/v1/tasks/:taskId/comments/stats
   */
  static async getCommentStats(taskId: number): Promise<TaskCommentStats> {
    try {
      const response: any = await api.get(`/tasks/${taskId}/comments/stats`);

      // 处理标准包装格式 { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response.message || '获取评论统计失败');
        }
        return response.data as TaskCommentStats;
      }

      // 处理已解包的响应
      if (response && typeof response === 'object' && 'task_id' in response) {
        return response as TaskCommentStats;
      }

      // 检查response.data
      if (response && response.data && typeof response.data === 'object' && 'task_id' in response.data) {
        return response.data as TaskCommentStats;
      }

      // 兜底返回空统计
      console.warn('TaskCommentService.getCommentStats: unexpected response shape', response);
      return {
        task_id: taskId,
        total_comments: 0,
        participants: 0,
        last_comment_at: null,
      };
    } catch (error: any) {
      console.error('TaskCommentService.getCommentStats error:', error);

      // 返回默认值而不是抛出错误
      return {
        task_id: taskId,
        total_comments: 0,
        participants: 0,
        last_comment_at: null,
      };
    }
  }
}

// 导出默认实例
export const taskCommentService = TaskCommentService;

// 导出便捷函数
export const {
  createComment,
  listComments,
  deleteComment,
  getCommentStats,
} = TaskCommentService;
