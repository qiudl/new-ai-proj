import { BaseClient } from './base-client.js';
import { requiresPermission } from './permission-manager.js';
import { Project, ApiResponse } from './types.js';

export class ProjectService extends BaseClient {

  // 列出所有项目
  async listProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
    try {
      const response = await this.makeRequest<{ data: Project[]; total?: number }>('GET', '/projects');

      if (response.success && response.data) {
        const projects = response.data.data || [];
        return {
          success: true,
          data: { projects },
          total: response.data.total || projects.length,
          message: `📁 获取到 ${projects.length} 个项目`
        } as ApiResponse<{ projects: Project[] }>;
      } else {
        return {
          success: false,
          error: response.error || '获取项目列表失败',
          data: { projects: [] }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取项目列表失败: ${error.message || error}`
      };
    }
  }

  // 创建新项目
  @requiresPermission('create_project')
  async createProject(name: string, description?: string): Promise<ApiResponse<Project>> {
    try {
      if (!name.trim()) {
        return { success: false, error: '项目名称不能为空' };
      }

      const projectData = {
        name: name.trim(),
        description: description || `通过Claude Code创建：${name.trim()}`,
        status: 'active' as const
      };

      const response = await this.makeRequest<Project>('POST', '/projects', projectData);

      if (response.success) {
        return {
          success: true,
          data: response.data,
          project_id: response.data?.id,
          project_name: name.trim(),
          message: `✅ 项目 "${name.trim()}" 创建成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建项目失败: ${error.message || error}`
      };
    }
  }

  // 获取项目详情
  async getProject(projectId: number): Promise<ApiResponse<Project>> {
    try {
      const response = await this.makeRequest<Project>('GET', `/projects/${projectId}`);

      if (response.success) {
        return {
          success: true,
          data: response.data,
          project_id: projectId,
          message: `📁 获取项目 "${response.data?.name}" 详情成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取项目详情失败: ${error.message || error}`
      };
    }
  }

  // 更新项目
  @requiresPermission('update_project')
  async updateProject(projectId: number, updates: {
    name?: string;
    description?: string;
    status?: Project['status'];
  }): Promise<ApiResponse<Project>> {
    try {
      if (Object.keys(updates).length === 0) {
        return { success: false, error: '没有提供要更新的字段' };
      }

      // 验证名称不为空
      if (updates.name !== undefined && !updates.name.trim()) {
        return { success: false, error: '项目名称不能为空' };
      }

      const response = await this.makeRequest<Project>('PUT', `/projects/${projectId}`, updates);

      if (response.success) {
        return {
          success: true,
          data: response.data,
          project_id: projectId,
          updated_fields: Object.keys(updates),
          message: `📝 项目 ${projectId} 更新成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新项目失败: ${error.message || error}`
      };
    }
  }

  // 删除项目
  @requiresPermission('delete_project')
  async deleteProject(projectId: number, force: boolean = false): Promise<ApiResponse> {
    try {
      // 先获取项目信息
      const projectResponse = await this.getProject(projectId);
      const projectName = projectResponse.data?.name || `项目${projectId}`;

      const response = await this.makeRequest('DELETE', `/projects/${projectId}`, {
        force: force
      });

      if (response.success) {
        return {
          success: true,
          project_id: projectId,
          project_name: projectName,
          force_delete: force,
          message: `🗑️ 项目 "${projectName}" 已删除${force ? '（强制删除）' : ''}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `删除项目失败: ${error.message || error}`
      };
    }
  }

  // 归档项目
  @requiresPermission('update_project')
  async archiveProject(projectId: number): Promise<ApiResponse> {
    try {
      return await this.updateProject(projectId, { status: 'archived' });
    } catch (error: any) {
      return {
        success: false,
        error: `归档项目失败: ${error.message || error}`
      };
    }
  }

  // 激活项目
  @requiresPermission('update_project')
  async activateProject(projectId: number): Promise<ApiResponse> {
    try {
      return await this.updateProject(projectId, { status: 'active' });
    } catch (error: any) {
      return {
        success: false,
        error: `激活项目失败: ${error.message || error}`
      };
    }
  }

  // 停用项目
  @requiresPermission('update_project')
  async deactivateProject(projectId: number): Promise<ApiResponse> {
    try {
      return await this.updateProject(projectId, { status: 'inactive' });
    } catch (error: any) {
      return {
        success: false,
        error: `停用项目失败: ${error.message || error}`
      };
    }
  }

  // 获取项目统计信息
  async getProjectStats(projectId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/projects/${projectId}/stats`);

      if (response.success) {
        return {
          success: true,
          project_id: projectId,
          stats: response.data,
          message: `📊 项目 ${projectId} 统计信息获取成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取项目统计失败: ${error.message || error}`
      };
    }
  }

  // 搜索项目
  async searchProjects(query: string, options: {
    status?: Project['status'];
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse> {
    try {
      if (!query.trim()) {
        return { success: false, error: '搜索关键词不能为空' };
      }

      const params = {
        q: query.trim(),
        limit: options.limit || 10,
        offset: options.offset || 0,
        ...options
      };

      const response = await this.makeRequest('GET', '/projects/search', undefined, params);

      if (response.success) {
        const projects = response.data?.projects || [];
        return {
          success: true,
          query: query.trim(),
          projects: projects,
          total: response.data?.total || projects.length,
          options: options,
          message: `🔍 搜索到 ${projects.length} 个项目`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `搜索项目失败: ${error.message || error}`
      };
    }
  }

  // 复制项目
  @requiresPermission('create_project')
  async duplicateProject(projectId: number, newName?: string, includeTasksAndDocs: boolean = false): Promise<ApiResponse> {
    try {
      // 1. 获取原项目信息
      const originalResponse = await this.getProject(projectId);
      if (!originalResponse.success || !originalResponse.data) {
        return { success: false, error: `项目 ${projectId} 不存在` };
      }

      const original = originalResponse.data;
      
      // 2. 创建新项目
      const name = newName || `${original.name} (副本)`;
      const copyResponse = await this.createProject(name, `${original.description || ''} (复制自项目 ${projectId})`);

      if (!copyResponse.success) {
        return copyResponse;
      }

      const newProjectId = copyResponse.data?.id;
      
      if (!includeTasksAndDocs) {
        return {
          success: true,
          original_project_id: projectId,
          new_project_id: newProjectId,
          original_name: original.name,
          new_name: name,
          include_tasks_and_docs: false,
          message: `📋 项目 "${original.name}" 已复制为 "${name}" (仅复制项目信息)`
        };
      }

      // 3. 如果需要复制任务和文档，调用后端API
      const response = await this.makeRequest('POST', `/projects/${projectId}/duplicate`, {
        new_project_id: newProjectId,
        include_tasks: includeTasksAndDocs,
        include_documents: includeTasksAndDocs
      });

      if (response.success) {
        return {
          success: true,
          original_project_id: projectId,
          new_project_id: newProjectId,
          original_name: original.name,
          new_name: name,
          include_tasks_and_docs: includeTasksAndDocs,
          copy_stats: response.data,
          message: `📋 项目 "${original.name}" 已完整复制为 "${name}"`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `复制项目失败: ${error.message || error}`
      };
    }
  }

  // 获取项目成员
  async getProjectMembers(projectId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/projects/${projectId}/members`);

      if (response.success) {
        const members = response.data?.members || [];
        return {
          success: true,
          project_id: projectId,
          members: members,
          member_count: members.length,
          message: `👥 项目 ${projectId} 有 ${members.length} 个成员`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取项目成员失败: ${error.message || error}`
      };
    }
  }

  // 添加项目成员
  @requiresPermission('manage_project_members')
  async addProjectMember(projectId: number, userId: number, role: string = 'member'): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('POST', `/projects/${projectId}/members`, {
        user_id: userId,
        role: role
      });

      if (response.success) {
        return {
          success: true,
          project_id: projectId,
          user_id: userId,
          role: role,
          message: `👤 用户 ${userId} 已添加到项目 ${projectId}，角色：${role}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `添加项目成员失败: ${error.message || error}`
      };
    }
  }

  // 移除项目成员
  @requiresPermission('manage_project_members')
  async removeProjectMember(projectId: number, userId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('DELETE', `/projects/${projectId}/members/${userId}`);

      if (response.success) {
        return {
          success: true,
          project_id: projectId,
          user_id: userId,
          message: `👤 用户 ${userId} 已从项目 ${projectId} 中移除`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `移除项目成员失败: ${error.message || error}`
      };
    }
  }

  // 更新项目成员角色
  @requiresPermission('manage_project_members')
  async updateMemberRole(projectId: number, userId: number, newRole: string): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PUT', `/projects/${projectId}/members/${userId}`, {
        role: newRole
      });

      if (response.success) {
        return {
          success: true,
          project_id: projectId,
          user_id: userId,
          new_role: newRole,
          message: `👤 用户 ${userId} 在项目 ${projectId} 中的角色已更新为：${newRole}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新成员角色失败: ${error.message || error}`
      };
    }
  }

  // 按状态获取项目
  async getProjectsByStatus(status: Project['status'], limit: number = 10, offset: number = 0): Promise<ApiResponse> {
    try {
      const params = {
        status: status,
        limit: limit,
        offset: offset
      };

      const response = await this.makeRequest('GET', '/projects', undefined, params);

      if (response.success) {
        const projects = response.data?.data || [];
        return {
          success: true,
          status: status,
          projects: projects,
          total: response.data?.total || projects.length,
          limit: limit,
          offset: offset,
          message: `📁 获取到 ${projects.length} 个状态为 "${status}" 的项目`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `按状态获取项目失败: ${error.message || error}`
      };
    }
  }
}