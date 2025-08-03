import { Project, ProjectRequest, ProjectDetail, ProjectUser, ProjectActivity } from '../types/project';
import { Task } from '../types/task';
import api from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

class ProjectService {
  private async request<T>(endpoint: string, options?: { method?: string; data?: any }): Promise<T> {
    try {
      let response;
      const fullEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      
      switch (options?.method?.toUpperCase()) {
        case 'POST':
          response = await api.post(fullEndpoint, options.data);
          break;
        case 'PUT':
          response = await api.put(fullEndpoint, options.data);
          break;
        case 'DELETE':
          response = await api.delete(fullEndpoint);
          break;
        case 'GET':
        default:
          response = await api.get(fullEndpoint);
          break;
      }
      
      // axios interceptor已经处理了响应格式化，返回的是后端response.data
      // 后端返回格式: { success: true, data: {...}, message: "..." }
      // api.ts的interceptor已经返回了response.data，所以response就是后端的整个响应
      // 我们需要返回response.data，即后端响应中的data字段
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data;
      }
      return response;
    } catch (error: Error | unknown) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getProjects(params?: PaginationParams): Promise<PaginatedResponse<Project>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());
    
    const endpoint = queryParams.toString() ? `/projects?${queryParams}` : '/projects?page=1&page_size=20';
    return this.request<PaginatedResponse<Project>>(endpoint);
  }

  async getProjectsByCompany(companyId: number): Promise<Project[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('company_id', companyId.toString());
    queryParams.append('page_size', '100'); // 获取足够多的项目
    
    const response = await this.request<PaginatedResponse<Project>>(`/projects?${queryParams}`);
    return response.data;
  }

  async getProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(project: ProjectRequest): Promise<Project> {
    // Convert camelCase to snake_case for backend
    const backendData = {
      project_number: project.project_number?.trim(),
      name: project.name?.trim(),
      description: project.description?.trim(),
      company_id: project.company_id,
      company_ids: project.company_ids,
      user_ids: project.user_ids,
      status: project.status,
      priority: project.priority,
      progress: project.progress,
      start_date: project.start_date,
      end_date: project.end_date,
    };

    // Remove undefined and null values, but allow empty strings for project_number
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([key, value]) => {
        if (value === undefined || value === null) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        // Allow empty string for project_number to enable clearing
        if (typeof value === 'string' && value === '' && key !== 'project_number') return false;
        return true;
      })
    );

    return this.request<Project>('/projects', {
      method: 'POST',
      data: cleanedData,
    });
  }

  async updateProject(id: number, project: ProjectRequest): Promise<Project> {
    // Convert camelCase to snake_case for backend
    const backendData = {
      project_number: project.project_number?.trim(),
      name: project.name?.trim(),
      description: project.description?.trim(),
      company_id: project.company_id,
      company_ids: project.company_ids,
      user_ids: project.user_ids,
      status: project.status,
      priority: project.priority,
      progress: project.progress,
      start_date: project.start_date,
      end_date: project.end_date,
    };

    // Remove undefined and null values, but allow empty strings for project_number
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([key, value]) => {
        if (value === undefined || value === null) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        // Allow empty string for project_number to enable clearing
        if (typeof value === 'string' && value === '' && key !== 'project_number') return false;
        return true;
      })
    );

    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      data: cleanedData,
    });
  }

  async deleteProject(id: number): Promise<void> {
    await this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // 获取项目详情（包含用户和活动）
  async getProjectDetail(id: number): Promise<ProjectDetail> {
    const [project, users, stats] = await Promise.all([
      this.getProject(id),
      this.getProjectUsers(id).catch(() => []),
      this.getProjectStats(id).catch(() => ({ task_count: 0, completed_task_count: 0, user_count: 0, progress: 0 }))
    ]);

    return {
      ...project,
      users: Array.isArray(users) ? users : [],
      task_count: stats.task_count,
      completed_task_count: stats.completed_task_count,
      user_count: stats.user_count,
      activities: [] // 活动记录需要单独加载
    } as ProjectDetail;
  }

  // 获取项目任务列表
  async getProjectTasks(id: number, params?: PaginationParams): Promise<PaginatedResponse<Task>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());
    
    const endpoint = queryParams.toString() ? 
      `/projects/${id}/tasks?${queryParams}` : 
      `/projects/${id}/tasks?page=1&page_size=50`;
    return this.request<PaginatedResponse<Task>>(endpoint);
  }

  // 获取项目用户列表
  async getProjectUsers(id: number): Promise<ProjectUser[]> {
    return this.request<ProjectUser[]>(`/projects/${id}/users`);
  }

  // 添加项目用户
  async addProjectUser(id: number, user: {
    user_id: number;
    role: string;
    is_primary?: boolean;
  }): Promise<ProjectUser> {
    return this.request<ProjectUser>(`/projects/${id}/users`, {
      method: 'POST',
      data: user,
    });
  }

  // 移除项目用户
  async removeProjectUser(projectId: number, userId: number): Promise<void> {
    await this.request<void>(`/projects/${projectId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // 获取项目活动记录（暂未实现）
  async getProjectActivities(id: number, params?: PaginationParams): Promise<PaginatedResponse<ProjectActivity>> {
    console.warn('getProjectActivities: Backend API not implemented');
    return {
      data: [],
      pagination: {
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false
      }
    };
  }

  // 更新项目状态（暂未实现）
  async updateProjectStatus(id: number, status: string): Promise<Project> {
    console.warn('updateProjectStatus: Backend API not implemented');
    throw new Error('Project status update functionality not implemented in backend');
  }

  // 获取项目统计信息
  async getProjectStats(id: number): Promise<{
    task_count: number;
    completed_task_count: number;
    user_count: number;
    progress: number;
  }> {
    return this.request(`/projects/${id}/stats`);
  }

  /**
   * 获取项目元数据用于文档关联
   */
  async getProjectsForDocumentMetadata(): Promise<ProjectOption[]> {
    try {
      const response = await api.get('/projects/metadata');
      return response.data.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status
      }));
    } catch (error) {
      console.error('获取项目元数据失败:', error);
      throw error;
    }
  }
}

// 类型定义
export interface ProjectOption {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

export const projectService = new ProjectService();