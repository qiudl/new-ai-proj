export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskRequest {
  title: string;
  description?: string;
  status: TaskStatus;
  assignee_id?: number;
  due_date?: string;
  custom_fields?: Record<string, any>;
}

export interface TaskFilter {
  status?: TaskStatus;
  assignee_id?: number;
  due_after?: string;
  due_before?: string;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface BulkImportRequest {
  tasks: TaskRequest[];
}

export interface BulkImportResponse {
  total_tasks: number;
  success_count: number;
  failure_count: number;
  failed_tasks?: number[];
  imported_tasks: number[];
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}