import api, { cachedGet, cachedGetWithTTL } from './api';
import { logApiError } from '../utils/logger';
import {
  Requirement,
  RequirementListResponse,
  RequirementStats,
  CreateRequirementRequest,
  UpdateRequirementRequest,
  ReviewRequirementRequest,
  ConvertToTaskRequest,
  RequirementFilters,
} from '../types/requirement';
import {
  RequirementComment,
  RequirementCommentListResponse,
  CreateRequirementCommentRequest,
  UpdateRequirementCommentRequest,
  RequirementCommentFilters,
  RequirementCommentStats,
} from '../types/requirementComment';

/**
 * 需求-任务关联类型
 */
export enum RequirementTaskLinkType {
  Manual = 'manual',      // 手动关联
  Converted = 'converted', // 需求转任务
  Related = 'related',     // 相关任务
}

/**
 * 需求-任务关联信息
 */
export interface RequirementTaskLink {
  id: number;
  requirement_id: number;
  task_id: number;
  link_type: RequirementTaskLinkType;
  linked_by: number;
  link_comment: string;
  created_at: string;
  updated_at: string;

  // 关联数据
  requirement_title?: string;
  requirement_status?: string;
  task_title?: string;
  task_status?: string;
  linker_username?: string;
}

/**
 * 需求-任务列表响应
 */
export interface RequirementTaskListResponse {
  data: RequirementTaskLink[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * API响应格式
 */
interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 获取任务关联的需求列表
 */
export async function getTaskRequirements(
  taskId: number,
  params?: {
    page?: number;
    page_size?: number;
    link_type?: RequirementTaskLinkType;
  }
): Promise<RequirementTaskListResponse> {
  try {
    const response = await api.get<APIResponse<RequirementTaskListResponse>>(
      `/tasks/${taskId}/requirements`,
      { params }
    );

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || '获取任务关联需求失败');
    }
  } catch (error: any) {
    logApiError(error, 'getTaskRequirements');
    throw error;
  }
}

/**
 * 获取需求关联的任务列表
 */
export async function getRequirementTasks(
  requirementId: number,
  params?: {
    page?: number;
    page_size?: number;
    link_type?: RequirementTaskLinkType;
  }
): Promise<RequirementTaskListResponse> {
  try {
    // API拦截器已经自动解包了响应 {success, data} -> data
    // 所以response直接就是RequirementTaskListResponse
    const response = await api.get<RequirementTaskListResponse>(
      `/requirements/${requirementId}/tasks`,
      { params }
    );

    // 修复：拦截器已经解包，直接返回response（不是response.data）
    return response as any as RequirementTaskListResponse;
  } catch (error: any) {
    logApiError(error, 'getRequirementTasks');
    throw error;
  }
}

/**
 * 创建需求-任务关联
 */
export async function linkTaskToRequirement(
  requirementId: number,
  taskId: number,
  linkType: RequirementTaskLinkType = RequirementTaskLinkType.Manual,
  linkComment?: string
): Promise<RequirementTaskLink> {
  try {
    const response = await api.post<APIResponse<RequirementTaskLink>>(
      `/requirements/${requirementId}/tasks`,
      {
        task_id: taskId,
        link_type: linkType,
        link_comment: linkComment || '',
      }
    );

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || '创建需求-任务关联失败');
    }
  } catch (error: any) {
    logApiError(error, 'linkTaskToRequirement');
    throw error;
  }
}

/**
 * 删除需求-任务关联
 */
export async function unlinkTaskFromRequirement(
  requirementId: number,
  taskId: number
): Promise<void> {
  try {
    const response = await api.delete<APIResponse<null>>(
      `/requirements/${requirementId}/tasks/${taskId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || '删除需求-任务关联失败');
    }
  } catch (error: any) {
    logApiError(error, 'unlinkTaskFromRequirement');
    throw error;
  }
}

/**
 * =================================================================
 * 需求管理CRUD操作
 * Requirement Management CRUD Operations
 * =================================================================
 */

/**
 * 需求管理服务类
 */
class RequirementService {
  /**
   * 获取需求列表（支持分页和筛选）
   * GET /api/v1/requirements
   */
  async getRequirements(filters?: RequirementFilters): Promise<RequirementListResponse> {
    try {
      const params: Record<string, any> = {};

      if (filters) {
        // 数组参数
        if (filters.status && filters.status.length > 0) {
          params.status = filters.status.join(',');
        }
        if (filters.priority && filters.priority.length > 0) {
          params.priority = filters.priority.join(',');
        }
        if (filters.category && filters.category.length > 0) {
          params.category = filters.category.join(',');
        }

        // 数字参数
        if (filters.submitter_id) params.submitter_id = filters.submitter_id;
        if (filters.reviewer_id) params.reviewer_id = filters.reviewer_id;
        if (filters.enterprise_id) params.enterprise_id = filters.enterprise_id;
        if (filters.project_id) params.project_id = filters.project_id;

        // 字符串参数
        if (filters.search) params.search = filters.search;
        if (filters.due_after) params.due_after = filters.due_after;
        if (filters.due_before) params.due_before = filters.due_before;

        // 分页和排序
        params.page = filters.page || 1;
        params.page_size = filters.page_size || 20;
        if (filters.sort_by) params.sort_by = filters.sort_by;
        if (filters.sort_order) params.sort_order = filters.sort_order;
      } else {
        // 默认分页参数
        params.page = 1;
        params.page_size = 20;
      }

      const response: RequirementListResponse = await api.get('/requirements', { params });
      return response;
    } catch (error: any) {
      logApiError(error, 'RequirementService.getRequirements');
      throw new Error(error?.message || '获取需求列表失败');
    }
  }

  /**
   * 获取单个需求详情
   * GET /api/v1/requirements/:id
   */
  async getRequirement(id: number): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.get(`/requirements/${id}`);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementService.getRequirement');
      throw new Error(error?.message || '获取需求详情失败');
    }
  }

  /**
   * 创建需求
   * POST /api/v1/requirements
   */
  async createRequirement(request: CreateRequirementRequest): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post('/requirements', request);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementService.createRequirement');
      throw new Error(error?.message || '创建需求失败');
    }
  }

  /**
   * 更新需求
   * PUT /api/v1/requirements/:id
   */
  async updateRequirement(id: number, request: UpdateRequirementRequest): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.put(`/requirements/${id}`, request);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementService.updateRequirement');
      throw new Error(error?.message || '更新需求失败');
    }
  }

  /**
   * 删除需求
   * DELETE /api/v1/requirements/:id
   */
  async deleteRequirement(id: number): Promise<void> {
    try {
      await api.delete(`/requirements/${id}`);
    } catch (error: any) {
      logApiError(error, 'RequirementService.deleteRequirement');
      throw new Error(error?.message || '删除需求失败');
    }
  }

  /**
   * 提交需求（草稿 -> 待评审）
   * POST /api/v1/requirements/:id/submit
   */
  async submitRequirement(id: number): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post(`/requirements/${id}/submit`);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementService.submitRequirement');
      throw new Error(error?.message || '提交需求失败');
    }
  }

  /**
   * 评审需求
   * POST /api/v1/requirements/:id/approve (批准)
   * POST /api/v1/requirements/:id/reject (拒绝)
   * POST /api/v1/requirements/:id/withdraw (撤回,用于need_more_info)
   */
  async reviewRequirement(id: number, request: ReviewRequirementRequest): Promise<Requirement> {
    try {
      // 根据action调用不同的后端端点
      let endpoint: string;

      switch (request.action) {
        case 'approve':
          endpoint = `/requirements/${id}/approve`;
          break;
        case 'reject':
          endpoint = `/requirements/${id}/reject`;
          break;
        case 'need_more_info':
          // 使用withdraw端点表示需要补充信息
          endpoint = `/requirements/${id}/withdraw`;
          break;
        default:
          throw new Error(`未知的评审操作: ${request.action}`);
      }

      // 后端端点期望的请求体(不包含action字段)
      const { action, ...requestBody } = request;

      const requirement: Requirement = await api.post(endpoint, requestBody);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementService.reviewRequirement');
      throw new Error(error?.message || '评审需求失败');
    }
  }

  /**
   * 转换需求为任务
   * POST /api/v1/requirements/:id/convert-to-task
   */
  async convertToTask(id: number, request?: ConvertToTaskRequest): Promise<any> {
    try {
      const result = await api.post(`/requirements/${id}/convert-to-task`, request || {});
      return result;
    } catch (error: any) {
      logApiError(error, 'RequirementService.convertToTask');
      throw new Error(error?.message || '转换任务失败');
    }
  }

  /**
   * 获取需求统计
   * GET /api/v1/requirements/stats
   */
  async getStats(filters?: Pick<RequirementFilters, 'enterprise_id' | 'project_id'>): Promise<RequirementStats> {
    try {
      const params: Record<string, any> = {};
      if (filters?.enterprise_id) params.enterprise_id = filters.enterprise_id;
      if (filters?.project_id) params.project_id = filters.project_id;

      const stats: RequirementStats = await api.get('/requirements/stats', { params });
      return stats;
    } catch (error: any) {
      logApiError(error, 'RequirementService.getStats');

      // 返回默认值而不是抛出错误
      return {
        total_requirements: 0,
        by_status: {},
        by_priority: {},
        pending_review: 0,
        approved_this_month: 0,
        converted_this_month: 0,
        average_review_time_hours: 0,
        conversion_rate: 0,
      };
    }
  }

  /**
   * 归档需求
   * POST /api/v1/requirements/:id/archive
   */
  async archiveRequirement(id: number): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post(`/requirements/${id}/archive`);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementService.archiveRequirement');
      throw new Error(error?.message || '归档需求失败');
    }
  }

  /**
   * 批量删除需求
   * POST /api/v1/requirements/batch-delete
   */
  async batchDeleteRequirements(ids: number[]): Promise<void> {
    try {
      await api.post('/requirements/batch-delete', { ids });
    } catch (error: any) {
      logApiError(error, 'RequirementService.batchDeleteRequirements');
      throw new Error(error?.message || '批量删除需求失败');
    }
  }

  /**
   * 批量更新需求状态
   * POST /api/v1/requirements/batch-update-status
   */
  async batchUpdateStatus(ids: number[], status: string): Promise<void> {
    try {
      await api.post('/requirements/batch-update-status', { ids, status });
    } catch (error: any) {
      logApiError(error, 'RequirementService.batchUpdateStatus');
      throw new Error(error?.message || '批量更新状态失败');
    }
  }
}

// 导出单例
export const requirementManagementService = new RequirementService();

// 导出便捷函数 (使用不同的名称避免与现有函数冲突)
export const requirementApi = {
  getRequirements: requirementManagementService.getRequirements.bind(requirementManagementService),
  getRequirement: requirementManagementService.getRequirement.bind(requirementManagementService),
  createRequirement: requirementManagementService.createRequirement.bind(requirementManagementService),
  updateRequirement: requirementManagementService.updateRequirement.bind(requirementManagementService),
  deleteRequirement: requirementManagementService.deleteRequirement.bind(requirementManagementService),
  submitRequirement: requirementManagementService.submitRequirement.bind(requirementManagementService),
  reviewRequirement: requirementManagementService.reviewRequirement.bind(requirementManagementService),
  convertToTask: requirementManagementService.convertToTask.bind(requirementManagementService),
  getStats: requirementManagementService.getStats.bind(requirementManagementService),
  archiveRequirement: requirementManagementService.archiveRequirement.bind(requirementManagementService),
  batchDeleteRequirements: requirementManagementService.batchDeleteRequirements.bind(requirementManagementService),
  batchUpdateStatus: requirementManagementService.batchUpdateStatus.bind(requirementManagementService),
};

export default requirementManagementService;

/**
 * =================================================================
 * 需求评论管理服务
 * Requirement Comment Management
 * =================================================================
 */

/**
 * 需求评论服务类
 */
class RequirementCommentService {
  /**
   * 创建评论
   * POST /api/v1/requirements/comments
   */
  async createComment(request: CreateRequirementCommentRequest): Promise<RequirementComment> {
    try {
      const comment: RequirementComment = await api.post('/requirements/comments', request);
      return comment;
    } catch (error: any) {
      logApiError(error, 'RequirementCommentService.createComment');
      throw new Error(error?.message || '创建评论失败');
    }
  }

  /**
   * 获取评论列表
   * GET /api/v1/requirements/comments
   */
  async getComments(filters?: RequirementCommentFilters): Promise<RequirementCommentListResponse> {
    try {
      const params: Record<string, any> = {};

      if (filters) {
        // 数组参数
        if (filters.comment_type && filters.comment_type.length > 0) {
          params.comment_type = filters.comment_type.join(',');
        }

        // 数字参数
        if (filters.requirement_id) params.requirement_id = filters.requirement_id;
        if (filters.user_id) params.user_id = filters.user_id;
        if (filters.mentioned_user_id) params.mentioned_user_id = filters.mentioned_user_id;
        if (filters.parent_comment_id !== undefined) params.parent_comment_id = filters.parent_comment_id;

        // 字符串参数
        if (filters.status) params.status = filters.status;
        if (filters.created_after) params.created_after = filters.created_after;
        if (filters.created_before) params.created_before = filters.created_before;

        // 布尔参数
        if (filters.is_internal !== undefined) params.is_internal = filters.is_internal;
        if (filters.is_pinned !== undefined) params.is_pinned = filters.is_pinned;
        if (filters.has_mentions !== undefined) params.has_mentions = filters.has_mentions;

        // 分页和排序
        params.page = filters.page || 1;
        params.page_size = filters.page_size || 20;
        if (filters.sort_by) params.sort_by = filters.sort_by;
        if (filters.sort_order) params.sort_order = filters.sort_order;
      } else {
        // 默认分页参数
        params.page = 1;
        params.page_size = 20;
      }

      const response: RequirementCommentListResponse = await api.get('/requirements/comments', { params });
      return response;
    } catch (error: any) {
      logApiError(error, 'RequirementCommentService.getComments');
      throw new Error(error?.message || '获取评论列表失败');
    }
  }

  /**
   * 获取@我的评论
   * GET /api/v1/requirements/comments/mentions/me
   */
  async getMentionedComments(params?: {
    page?: number;
    page_size?: number;
  }): Promise<RequirementCommentListResponse> {
    try {
      const response: RequirementCommentListResponse = await api.get(
        '/requirements/comments/mentions/me',
        { params }
      );
      return response;
    } catch (error: any) {
      logApiError(error, 'RequirementCommentService.getMentionedComments');
      throw new Error(error?.message || '获取@我的评论失败');
    }
  }

  /**
   * 获取单个评论详情
   * GET /api/v1/requirements/comments/:id
   */
  async getComment(id: number): Promise<RequirementComment> {
    try {
      const comment: RequirementComment = await api.get(`/requirements/comments/${id}`);
      return comment;
    } catch (error: any) {
      logApiError(error, 'RequirementCommentService.getComment');
      throw new Error(error?.message || '获取评论详情失败');
    }
  }

  /**
   * 更新评论
   * PUT /api/v1/requirements/comments/:id
   */
  async updateComment(id: number, request: UpdateRequirementCommentRequest): Promise<RequirementComment> {
    try {
      const comment: RequirementComment = await api.put(`/requirements/comments/${id}`, request);
      return comment;
    } catch (error: any) {
      logApiError(error, 'RequirementCommentService.updateComment');
      throw new Error(error?.message || '更新评论失败');
    }
  }

  /**
   * 删除评论
   * DELETE /api/v1/requirements/comments/:id
   */
  async deleteComment(id: number): Promise<void> {
    try {
      await api.delete(`/requirements/comments/${id}`);
    } catch (error: any) {
      logApiError(error, 'RequirementCommentService.deleteComment');
      throw new Error(error?.message || '删除评论失败');
    }
  }

  /**
   * 置顶/取消置顶评论
   * PUT /api/v1/requirements/comments/:id/pin
   */
  async togglePin(id: number): Promise<RequirementComment> {
    try {
      const comment: RequirementComment = await api.put(`/requirements/comments/${id}/pin`);
      return comment;
    } catch (error: any) {
      logApiError(error, 'RequirementCommentService.togglePin');
      throw new Error(error?.message || '置顶评论失败');
    }
  }
}

// 导出评论服务单例
export const requirementCommentService = new RequirementCommentService();

// 导出评论便捷函数
export const requirementCommentApi = {
  createComment: requirementCommentService.createComment.bind(requirementCommentService),
  getComments: requirementCommentService.getComments.bind(requirementCommentService),
  getMentionedComments: requirementCommentService.getMentionedComments.bind(requirementCommentService),
  getComment: requirementCommentService.getComment.bind(requirementCommentService),
  updateComment: requirementCommentService.updateComment.bind(requirementCommentService),
  deleteComment: requirementCommentService.deleteComment.bind(requirementCommentService),
  togglePin: requirementCommentService.togglePin.bind(requirementCommentService),
};

/**
 * =================================================================
 * 增强的需求状态管理服务
 * Enhanced Requirement Status Management
 * =================================================================
 */

/**
 * 需求权限信息
 */
export interface RequirementPermissions {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_submit: boolean;
  can_review: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_withdraw: boolean;
  can_archive: boolean;
  can_convert_to_task: boolean;
  can_link_task: boolean;
  available_transitions: string[];
}

/**
 * 需求状态管理服务类
 */
class RequirementStatusService {
  /**
   * 提交需求
   * POST /api/v1/requirements/:id/submit
   */
  async submitRequirement(id: number): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post(`/requirements/${id}/submit`);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementStatusService.submitRequirement');
      throw new Error(error?.message || '提交需求失败');
    }
  }

  /**
   * 批准需求
   * POST /api/v1/requirements/:id/approve
   */
  async approveRequirement(id: number, comment?: string): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post(`/requirements/${id}/approve`, { comment });
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementStatusService.approveRequirement');
      throw new Error(error?.message || '批准需求失败');
    }
  }

  /**
   * 拒绝需求
   * POST /api/v1/requirements/:id/reject
   */
  async rejectRequirement(id: number, comment?: string): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post(`/requirements/${id}/reject`, { comment });
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementStatusService.rejectRequirement');
      throw new Error(error?.message || '拒绝需求失败');
    }
  }

  /**
   * 撤回需求
   * POST /api/v1/requirements/:id/withdraw
   */
  async withdrawRequirement(id: number): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post(`/requirements/${id}/withdraw`);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementStatusService.withdrawRequirement');
      throw new Error(error?.message || '撤回需求失败');
    }
  }

  /**
   * 归档需求
   * POST /api/v1/requirements/:id/archive
   */
  async archiveRequirement(id: number): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.post(`/requirements/${id}/archive`);
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementStatusService.archiveRequirement');
      throw new Error(error?.message || '归档需求失败');
    }
  }

  /**
   * 获取需求权限
   * GET /api/v1/requirements/:id/permissions
   */
  async getRequirementPermissions(id: number): Promise<RequirementPermissions> {
    try {
      // 使用5分钟缓存
      const permissions: RequirementPermissions = await cachedGetWithTTL(
        `/requirements/${id}/permissions`,
        5
      );
      return permissions;
    } catch (error: any) {
      logApiError(error, 'RequirementStatusService.getRequirementPermissions');

      // 返回默认权限（全部禁止）
      return {
        can_view: false,
        can_edit: false,
        can_delete: false,
        can_submit: false,
        can_review: false,
        can_approve: false,
        can_reject: false,
        can_withdraw: false,
        can_archive: false,
        can_convert_to_task: false,
        can_link_task: false,
        available_transitions: [],
      };
    }
  }

  /**
   * 更新需求状态（增强版）
   * PUT /api/v1/requirements/:id/status
   */
  async updateRequirementStatus(id: number, status: string, comment?: string): Promise<Requirement> {
    try {
      const requirement: Requirement = await api.put(`/requirements/${id}/status`, {
        status,
        comment,
      });
      return requirement;
    } catch (error: any) {
      logApiError(error, 'RequirementStatusService.updateRequirementStatus');
      throw new Error(error?.message || '更新需求状态失败');
    }
  }
}

// 导出状态管理服务单例
export const requirementStatusService = new RequirementStatusService();

// 导出状态管理便捷函数
export const requirementStatusApi = {
  submitRequirement: requirementStatusService.submitRequirement.bind(requirementStatusService),
  approveRequirement: requirementStatusService.approveRequirement.bind(requirementStatusService),
  rejectRequirement: requirementStatusService.rejectRequirement.bind(requirementStatusService),
  withdrawRequirement: requirementStatusService.withdrawRequirement.bind(requirementStatusService),
  archiveRequirement: requirementStatusService.archiveRequirement.bind(requirementStatusService),
  getRequirementPermissions: requirementStatusService.getRequirementPermissions.bind(requirementStatusService),
  updateRequirementStatus: requirementStatusService.updateRequirementStatus.bind(requirementStatusService),
};

/**
 * =================================================================
 * 统一导出所有需求相关服务
 * Unified Export for All Requirement Services
 * =================================================================
 */

export const requirementServices = {
  // 基础CRUD
  ...requirementApi,

  // 评论管理
  comment: requirementCommentApi,

  // 状态管理
  status: requirementStatusApi,

  // 任务关联
  linkTask: linkTaskToRequirement,
  unlinkTask: unlinkTaskFromRequirement,
  getRequirementTasks,
  getTaskRequirements,
};
