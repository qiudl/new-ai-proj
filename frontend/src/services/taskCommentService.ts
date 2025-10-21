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
   * Note: api interceptor auto-unwraps response, returns TaskComment directly
   */
  static async createComment(
    taskId: number,
    content: string
  ): Promise<TaskComment> {
    try {
      const request: CreateTaskCommentRequest = { content };
      // Note: api interceptor auto-unwraps response, returns TaskComment directly
      const comment: TaskComment = await api.post(`/tasks/${taskId}/comments`, request);

      return comment;
    } catch (error: any) {
      console.error('TaskCommentService.createComment error:', error);
      throw new Error(error?.message || '创建评论失败');
    }
  }

  /**
   * 获取评论列表(分页)
   * GET /api/v1/tasks/:taskId/comments?page=1&limit=20
   * Note: api interceptor auto-unwraps response, returns ListTaskCommentsResponse directly
   */
  static async listComments(
    taskId: number,
    params?: { page?: number; limit?: number }
  ): Promise<ListTaskCommentsResponse> {
    try {
      const { page = 1, limit = 20 } = params || {};
      // Note: api interceptor auto-unwraps response, returns data directly
      const result: ListTaskCommentsResponse = await api.get(`/tasks/${taskId}/comments`, {
        params: { page, limit }
      });

      return result;
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
   * Note: api interceptor auto-unwraps response, DELETE returns null/undefined for success
   */
  static async deleteComment(
    taskId: number,
    commentId: number
  ): Promise<void> {
    try {
      // Note: DELETE成功返回null/undefined
      await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      // 如果没有抛出异常,说明成功
    } catch (error: any) {
      console.error('TaskCommentService.deleteComment error:', error);
      throw new Error(error?.message || '删除评论失败');
    }
  }

  /**
   * 获取评论统计
   * GET /api/v1/tasks/:taskId/comments/stats
   * Note: api interceptor auto-unwraps response, returns TaskCommentStats directly
   */
  static async getCommentStats(taskId: number): Promise<TaskCommentStats> {
    try {
      // Note: api interceptor auto-unwraps response, returns TaskCommentStats directly
      const stats: TaskCommentStats = await api.get(`/tasks/${taskId}/comments/stats`);

      return stats;
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
