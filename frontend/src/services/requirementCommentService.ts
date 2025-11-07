/**
 * 需求评论服务
 * Requirement Comment Service
 */

import api from './api';
import {
  RequirementComment,
  RequirementCommentType,
  CreateRequirementCommentRequest,
  UpdateRequirementCommentRequest,
  RequirementCommentListResponse,
  RequirementCommentStats,
  RequirementCommentFilters,
  RequirementCommentApiResponse,
} from '../types/requirementComment';

/**
 * 需求评论Service类
 */
export class RequirementCommentService {
  /**
   * 创建评论
   * POST /api/v1/requirements/comments
   */
  static async createComment(
    requirementId: number,
    request: CreateRequirementCommentRequest
  ): Promise<RequirementComment> {
    try {
      const comment: RequirementComment = await api.post(
        `/requirements/comments`,
        { ...request, requirement_id: requirementId }
      );
      return comment;
    } catch (error: any) {
      console.error('RequirementCommentService.createComment error:', error);
      throw new Error(error?.message || '创建评论失败');
    }
  }

  /**
   * 获取评论列表(分页，支持筛选)
   * GET /api/v1/requirements/comments
   */
  static async listComments(
    requirementId: number,
    filters?: RequirementCommentFilters
  ): Promise<RequirementCommentListResponse> {
    try {
      const params = {
        requirement_id: requirementId,
        page: filters?.page || 1,
        page_size: filters?.page_size || 20,
        ...filters,
      };

      const result: RequirementCommentListResponse = await api.get(
        `/requirements/comments`,
        { params }
      );

      return result;
    } catch (error: any) {
      console.error('RequirementCommentService.listComments error:', error);

      // 返回空数据而不是抛出错误,以实现优雅降级
      return {
        data: [],
        total: 0,
        page: filters?.page || 1,
        page_size: filters?.page_size || 20,
      };
    }
  }

  /**
   * 获取单个评论详情
   * GET /api/v1/requirements/comments/:commentId
   */
  static async getComment(
    requirementId: number,
    commentId: number
  ): Promise<RequirementComment> {
    try {
      const comment: RequirementComment = await api.get(
        `/requirements/comments/${commentId}`
      );
      return comment;
    } catch (error: any) {
      console.error('RequirementCommentService.getComment error:', error);
      throw new Error(error?.message || '获取评论失败');
    }
  }

  /**
   * 更新评论
   * PUT /api/v1/requirements/comments/:commentId
   */
  static async updateComment(
    requirementId: number,
    commentId: number,
    request: UpdateRequirementCommentRequest
  ): Promise<RequirementComment> {
    try {
      const comment: RequirementComment = await api.put(
        `/requirements/comments/${commentId}`,
        request
      );
      return comment;
    } catch (error: any) {
      console.error('RequirementCommentService.updateComment error:', error);
      throw new Error(error?.message || '更新评论失败');
    }
  }

  /**
   * 删除评论
   * DELETE /api/v1/requirements/comments/:commentId
   */
  static async deleteComment(
    requirementId: number,
    commentId: number
  ): Promise<void> {
    try {
      await api.delete(
        `/requirements/comments/${commentId}`
      );
    } catch (error: any) {
      console.error('RequirementCommentService.deleteComment error:', error);
      throw new Error(error?.message || '删除评论失败');
    }
  }

  /**
   * 获取评论统计
   * GET /api/v1/requirements/comments/stats (Note: This endpoint doesn't exist yet)
   */
  static async getCommentStats(
    requirementId: number
  ): Promise<RequirementCommentStats> {
    try {
      const stats: RequirementCommentStats = await api.get(
        `/requirements/comments/stats`,
        { params: { requirement_id: requirementId } }
      );
      return stats;
    } catch (error: any) {
      console.error('RequirementCommentService.getCommentStats error:', error);

      // 返回默认值而不是抛出错误（后端暂未实现此接口）
      return {
        total_comments: 0,
        by_comment_type: {},
        active_comments: 0,
        deleted_comments: 0,
        internal_comments: 0,
        pinned_comments: 0,
        top_level_comments: 0,
        reply_comments: 0,
        todays_comments: 0,
        this_weeks_comments: 0,
      };
    }
  }

  /**
   * 创建回复评论
   * POST /api/v1/requirements/comments
   * 便捷方法，用于创建回复
   */
  static async createReply(
    requirementId: number,
    parentCommentId: number,
    content: string,
    options?: {
      comment_type?: RequirementCommentType;
      mentioned_user_ids?: number[];
      is_internal?: boolean;
    }
  ): Promise<RequirementComment> {
    const request: CreateRequirementCommentRequest = {
      requirement_id: requirementId,
      parent_comment_id: parentCommentId,
      content,
      ...options,
    };

    return this.createComment(requirementId, request);
  }

  /**
   * 置顶/取消置顶评论
   * PUT /api/v1/requirements/comments/:commentId
   */
  static async togglePin(
    requirementId: number,
    commentId: number,
    isPinned: boolean
  ): Promise<RequirementComment> {
    const request: UpdateRequirementCommentRequest = {
      is_pinned: isPinned,
    };

    return this.updateComment(requirementId, commentId, request);
  }

  /**
   * 切换内部/外部评论
   * PUT /api/v1/requirements/comments/:commentId
   */
  static async toggleInternal(
    requirementId: number,
    commentId: number,
    isInternal: boolean
  ): Promise<RequirementComment> {
    const request: UpdateRequirementCommentRequest = {
      is_internal: isInternal,
    };

    return this.updateComment(requirementId, commentId, request);
  }
}

// 导出默认实例
export const requirementCommentService = RequirementCommentService;

// 导出便捷函数
export const {
  createComment,
  listComments,
  getComment,
  updateComment,
  deleteComment,
  getCommentStats,
  createReply,
  togglePin,
  toggleInternal,
} = RequirementCommentService;
