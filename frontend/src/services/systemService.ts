import api from './api';

export interface RecycledProject {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  owner_username: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  deleted_tasks_count: number;
}

export interface RecycledTask {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: string;
  assignee_id?: number;
  due_date?: string;
  custom_fields?: any;
  created_at: string;
  deleted_at: string;
  project_name: string;
  assignee_username?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id: number;
  entity_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
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

export interface BackendPaginatedResponse {
  data: any;
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

export class SystemService {
  // Recycled Projects
  static async getRecycledProjects(page = 1, pageSize = 20): Promise<PaginatedResponse<RecycledProject>> {
    const response = await api.get<BackendPaginatedResponse>(
      `/system/recycle/projects?page=${page}&page_size=${pageSize}`
    );
    return {
      data: (response as any).data as RecycledProject[],
      pagination: (response as any).pagination
    };
  }

  static async restoreProject(id: number): Promise<void> {
    await api.post(`/system/recycle/projects/${id}/restore`);
  }

  static async hardDeleteProject(id: number): Promise<void> {
    await api.delete(`/system/recycle/projects/${id}`);
  }

  // Recycled Tasks
  static async getRecycledTasks(page = 1, pageSize = 20): Promise<PaginatedResponse<RecycledTask>> {
    const response = await api.get<BackendPaginatedResponse>(
      `/system/recycle/tasks?page=${page}&page_size=${pageSize}`
    );
    return {
      data: (response as any).data as RecycledTask[],
      pagination: (response as any).pagination
    };
  }

  static async restoreTask(id: number): Promise<void> {
    await api.post(`/system/recycle/tasks/${id}/restore`);
  }

  static async hardDeleteTask(id: number): Promise<void> {
    await api.delete(`/system/recycle/tasks/${id}`);
  }

  // Audit Logs
  static async getAuditLogs(page = 1, pageSize = 20): Promise<PaginatedResponse<AuditLog>> {
    const response = await api.get<BackendPaginatedResponse>(
      `/system/audit/logs?page=${page}&page_size=${pageSize}`
    );
    return {
      data: (response as any).data as AuditLog[],
      pagination: (response as any).pagination
    };
  }

}