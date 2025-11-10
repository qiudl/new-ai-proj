import { BaseClient } from './base-client.js';
import { ApiResponse } from './types.js';

// 需求接口定义
export interface Requirement {
  id: number;
  display_id?: string;
  title: string;
  description?: string;
  status: 'draft' | 'pending' | 'reviewing' | 'approved' | 'rejected' | 'archived';
  priority: 'low' | 'medium' | 'high';
  category: 'feature' | 'bug' | 'improvement' | 'documentation' | 'other';
  project_id: number;
  enterprise_id?: number;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// 创建需求选项
export interface CreateRequirementOptions {
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: 'feature' | 'bug' | 'improvement' | 'documentation' | 'other';
  projectId: number;
  enterpriseId?: number;
}

// 更新需求选项
export interface UpdateRequirementOptions {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: 'feature' | 'bug' | 'improvement' | 'documentation' | 'other';
}

// 列出需求的查询参数
export interface ListRequirementsParams {
  page?: number;
  page_size?: number;
  status?: string[];
  priority?: string[];
  category?: string[];
  project_id?: number;
  enterprise_id?: number;
  search?: string;
}

// 分页响应格式
export interface PaginatedRequirementResponse {
  requirements: Requirement[];
  total: number;
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// 需求-任务关联
export interface RequirementTask {
  id: number;
  requirement_id: number;
  task_id: number;
  link_type: 'manual' | 'converted' | 'related';
  linked_by: number;
  link_comment?: string;
  created_at: string;
}

export class RequirementService extends BaseClient {

  // 创建需求
  async createRequirement(
    title: string,
    options: CreateRequirementOptions
  ): Promise<ApiResponse<Requirement>> {
    try {
      console.error(`[DEBUG] 创建需求: ${title}, 项目ID: ${options.projectId}${options.enterpriseId ? `, 企业ID: ${options.enterpriseId}` : ''}`);

      const requirementData: any = {
        title,
        project_id: options.projectId,
        description: options.description || `通过Claude Code创建：${title}`,
        priority: options.priority || 'medium',
        category: options.category || 'feature',
        status: 'draft'
      };

      if (options.enterpriseId) {
        requirementData.enterprise_id = options.enterpriseId;
      }

      const response = await this.makeRequest<Requirement>(
        'POST',
        '/mcp/requirements/create',
        requirementData
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: `✅ 需求 "${title}" 创建成功 (ID: ${response.data?.id})`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建需求失败: ${error.message || error}`
      };
    }
  }

  // 获取需求详情
  async getRequirement(id: number): Promise<ApiResponse<Requirement>> {
    try {
      const response = await this.makeRequest<Requirement>(
        'GET',
        `/mcp/requirements/${id}`
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          message: `📋 需求详情已获取 - #${id} ${response.data.title || ''}`
        };
      }

      throw new Error(`需求 ID ${id} 不存在`);
    } catch (error: any) {
      return {
        success: false,
        error: `获取需求失败: ${error?.message || String(error)}`
      };
    }
  }

  // 列出需求
  async listRequirements(params?: ListRequirementsParams): Promise<ApiResponse<PaginatedRequirementResponse>> {
    try {
      const page = params?.page || 1;
      const page_size = Math.min(params?.page_size || 20, 100);

      let queryParams: any = {
        page,
        page_size
      };

      if (params?.status && params.status.length > 0) {
        queryParams.status = params.status.join(',');
      }

      if (params?.priority && params.priority.length > 0) {
        queryParams.priority = params.priority.join(',');
      }

      if (params?.category && params.category.length > 0) {
        queryParams.category = params.category.join(',');
      }

      if (params?.project_id) {
        queryParams.project_id = params.project_id;
      }

      if (params?.enterprise_id) {
        queryParams.enterprise_id = params.enterprise_id;
      }

      if (params?.search) {
        queryParams.search = params.search;
      }

      const response = await this.makeRequest<{
        data: Requirement[];
        total?: number;
        pagination?: any;
      }>(
        'GET',
        '/mcp/requirements',
        undefined,
        queryParams
      );

      if (response.success && response.data) {
        const requirements = response.data.data || [];
        const total = response.data.total || response.data.pagination?.total || requirements.length;

        const pagination = {
          page,
          page_size,
          total,
          total_pages: Math.ceil(total / page_size)
        };

        const result: PaginatedRequirementResponse = {
          requirements,
          total,
          pagination
        };

        return {
          success: true,
          data: result,
          message: `📋 获取到 ${requirements.length}/${total} 个需求 (第${page}/${pagination.total_pages}页)${params?.project_id ? ` - 项目${params.project_id}` : ''}${params?.status ? ` - 状态: ${params.status.join(',')}` : ''}`
        };
      } else {
        return {
          success: false,
          error: response.error || '获取需求列表失败',
          data: {
            requirements: [],
            total: 0,
            pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 }
          }
        } as ApiResponse<PaginatedRequirementResponse>;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取需求列表失败: ${error.message || error}`,
        data: {
          requirements: [],
          total: 0,
          pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 }
        }
      };
    }
  }

  // 更新需求
  async updateRequirement(
    id: number,
    updates: UpdateRequirementOptions
  ): Promise<ApiResponse<Requirement>> {
    try {
      const response = await this.makeRequest<Requirement>(
        'PUT',
        `/mcp/requirements/${id}`,
        updates
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: `📝 需求 #${id} 更新成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新需求失败: ${error.message || error}`
      };
    }
  }

  // 删除需求 (软删除)
  async deleteRequirement(id: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'DELETE',
        `/mcp/requirements/${id}`
      );

      if (response.success) {
        return {
          success: true,
          message: `🗑️ 需求 #${id} 已删除`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `删除需求失败: ${error.message || error}`
      };
    }
  }

  // 批量关联任务到需求
  async linkTasksToRequirement(
    requirementId: number,
    taskIds: number[],
    linkComment?: string
  ): Promise<ApiResponse> {
    try {
      console.error(`[DEBUG] 批量关联任务: 需求ID=${requirementId}, 任务IDs=${taskIds.join(',')}`);

      const response = await this.makeRequest(
        'POST',
        `/mcp/requirements/${requirementId}/link-tasks`,
        {
          taskIds,
          linkComment
        }
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: `✅ 成功关联 ${taskIds.length} 个任务到需求 #${requirementId}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `关联任务失败: ${error.message || error}`
      };
    }
  }

  // 取消任务关联
  async unlinkTaskFromRequirement(
    requirementId: number,
    taskId: number
  ): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'DELETE',
        `/mcp/requirements/${requirementId}/tasks/${taskId}`
      );

      if (response.success) {
        return {
          success: true,
          message: `✅ 已取消任务 #${taskId} 与需求 #${requirementId} 的关联`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `取消关联失败: ${error.message || error}`
      };
    }
  }

  // 获取需求的关联任务
  async getRequirementTasks(
    requirementId: number,
    page: number = 1,
    page_size: number = 10
  ): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/mcp/requirements/${requirementId}/tasks`,
        undefined,
        { page, page_size }
      );

      if (response.success) {
        const tasks = response.data?.data || [];
        return {
          success: true,
          data: response.data,
          message: `📋 需求 #${requirementId} 关联了 ${tasks.length} 个任务`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取关联任务失败: ${error.message || error}`
      };
    }
  }

  // 提交需求评审
  async submitRequirement(id: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'POST',
        `/mcp/requirements/${id}/submit`
      );

      if (response.success) {
        return {
          success: true,
          message: `📤 需求 #${id} 已提交评审`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `提交需求失败: ${error.message || error}`
      };
    }
  }

  // 批准需求
  async approveRequirement(id: number, comment?: string): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'POST',
        `/mcp/requirements/${id}/approve`,
        comment ? { comment } : undefined
      );

      if (response.success) {
        return {
          success: true,
          message: `✅ 需求 #${id} 已批准`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `批准需求失败: ${error.message || error}`
      };
    }
  }

  // 拒绝需求
  async rejectRequirement(id: number, reason: string): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'POST',
        `/mcp/requirements/${id}/reject`,
        { reason }
      );

      if (response.success) {
        return {
          success: true,
          message: `❌ 需求 #${id} 已拒绝`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `拒绝需求失败: ${error.message || error}`
      };
    }
  }

  // 撤回需求
  async withdrawRequirement(id: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'POST',
        `/mcp/requirements/${id}/withdraw`
      );

      if (response.success) {
        return {
          success: true,
          message: `↩️ 需求 #${id} 已撤回`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `撤回需求失败: ${error.message || error}`
      };
    }
  }

  // 归档需求
  async archiveRequirement(id: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'POST',
        `/mcp/requirements/${id}/archive`
      );

      if (response.success) {
        return {
          success: true,
          message: `📦 需求 #${id} 已归档`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `归档需求失败: ${error.message || error}`
      };
    }
  }

  // 获取需求操作历史
  async getRequirementHistory(
    id: number,
    page: number = 1,
    page_size: number = 10
  ): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/mcp/requirements/${id}/history`,
        undefined,
        { page, page_size }
      );

      if (response.success) {
        const history = response.data?.data || [];
        return {
          success: true,
          data: response.data,
          message: `📜 需求 #${id} 有 ${history.length} 条历史记录`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取历史记录失败: ${error.message || error}`
      };
    }
  }

  // 获取需求统计信息
  async getRequirementStatistics(id: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/mcp/requirements/${id}/statistics`
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: `📊 需求 #${id} 统计信息已获取`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取统计信息失败: ${error.message || error}`
      };
    }
  }
}
