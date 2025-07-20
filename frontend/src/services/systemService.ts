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
  user_name?: string;
  session_id?: string;
  event_id?: string;
  description?: string;
  status?: string;
  error_message?: string;
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

export interface AuditLogFilter {
  action?: string;
  entity_type?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  ip_address?: string;
  search?: string;
  status?: string;
}

export interface AuditStats {
  total_events: number;
  actions_distribution: { action: string; count: number }[];
  entities_distribution: { entity_type: string; count: number }[];
  timeline_data: { date: string; count: number }[];
  top_users: { user_name: string; count: number }[];
  peak_hours: { hour: number; count: number }[];
  error_rate: number;
  unique_users: number;
  unique_ips: number;
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
    // Since api.interceptors.response already extracts data from response
    // the response here is already the 'data' part of the backend response
    return {
      data: response.data.data as RecycledProject[],
      pagination: response.data.pagination
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
    // Since api.interceptors.response already extracts data from response
    // the response here is already the 'data' part of the backend response
    return {
      data: response.data.data as RecycledTask[],
      pagination: response.data.pagination
    };
  }

  static async restoreTask(id: number): Promise<void> {
    await api.post(`/system/recycle/tasks/${id}/restore`);
  }

  static async hardDeleteTask(id: number): Promise<void> {
    await api.delete(`/system/recycle/tasks/${id}`);
  }

  // Audit Logs
  static async getAuditLogs(
    page = 1, 
    pageSize = 20, 
    filters: AuditLogFilter = {}
  ): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    // Add filter parameters
    if (filters.action) params.append('action', filters.action);
    if (filters.entity_type) params.append('entity_type', filters.entity_type);
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.ip_address) params.append('ip_address', filters.ip_address);
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);

    const response = await api.get<BackendPaginatedResponse>(
      `/system/audit/logs?${params.toString()}`
    );
    return {
      data: response.data.data as AuditLog[],
      pagination: response.data.pagination
    };
  }

  static async getAuditLog(id: number): Promise<AuditLog> {
    const response = await api.get<ApiResponse<AuditLog>>(`/system/audit/logs/${id}`);
    return response.data.data;
  }

  static async getAuditStats(filters: AuditLogFilter = {}): Promise<AuditStats> {
    const params = new URLSearchParams();
    
    // Add filter parameters for stats
    if (filters.action) params.append('action', filters.action);
    if (filters.entity_type) params.append('entity_type', filters.entity_type);
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const response = await api.get<ApiResponse<AuditStats>>(
      `/system/audit/stats?${params.toString()}`
    );
    return response.data.data;
  }

  static async exportAuditLogs(
    filters: AuditLogFilter = {},
    format: 'csv' | 'excel' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams({ format });
    
    // Add filter parameters
    if (filters.action) params.append('action', filters.action);
    if (filters.entity_type) params.append('entity_type', filters.entity_type);
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get(`/system/audit/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

}