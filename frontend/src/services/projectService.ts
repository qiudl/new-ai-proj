import { Project, ProjectRequest, ProjectDetail, ProjectUser, ProjectActivity } from '../types/project';
import { Task } from '../types/task';

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
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'API request failed');
    }

    return result.data;
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
      name: project.name,
      description: project.description,
      company_id: project.company_id,
      company_ids: project.company_ids,
      user_ids: project.user_ids,
      status: project.status,
      priority: project.priority,
      start_date: project.start_date,
      end_date: project.end_date,
      budget: project.budget,
      progress: project.progress,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([_, value]) => value !== undefined)
    );

    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(cleanedData),
    });
  }

  async updateProject(id: number, project: ProjectRequest): Promise<Project> {
    // Convert camelCase to snake_case for backend
    const backendData = {
      name: project.name,
      description: project.description,
      company_id: project.company_id,
      company_ids: project.company_ids,
      user_ids: project.user_ids,
      status: project.status,
      priority: project.priority,
      start_date: project.start_date,
      end_date: project.end_date,
      budget: project.budget,
      progress: project.progress,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([_, value]) => value !== undefined)
    );

    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanedData),
    });
  }

  async deleteProject(id: number): Promise<void> {
    await this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // 获取项目详情（包含用户和活动）
  // 注意：这个方法使用组合API调用，因为后端没有 /projects/{id}/detail 端点
  async getProjectDetail(id: number): Promise<ProjectDetail> {
    const [project, users, stats] = await Promise.all([
      this.getProject(id),
      this.getProjectUsers(id).catch(() => []),
      this.getProjectStats(id).catch(() => ({ task_count: 0, completed_task_count: 0, user_count: 0, progress: 0 }))
    ]);

    return {
      ...project,
      users: users,
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
      body: JSON.stringify(user),
    });
  }

  // 移除项目用户
  async removeProjectUser(projectId: number, userId: number): Promise<void> {
    await this.request<void>(`/projects/${projectId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // 获取项目活动记录
  async getProjectActivities(id: number, params?: PaginationParams): Promise<PaginatedResponse<ProjectActivity>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());
    
    const endpoint = queryParams.toString() ? 
      `/projects/${id}/activities?${queryParams}` : 
      `/projects/${id}/activities?page=1&page_size=20`;
    return this.request<PaginatedResponse<ProjectActivity>>(endpoint);
  }

  // 更新项目状态
  async updateProjectStatus(id: number, status: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
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
}

export const projectService = new ProjectService();