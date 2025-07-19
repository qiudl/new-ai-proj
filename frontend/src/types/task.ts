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
  parent_id?: number;
  task_level: number;
  sort_order: number;
  parent_title?: string;
  children_count?: number;
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
  parent_id?: number;
  sort_order?: number;
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

// Hierarchical task types
export interface HierarchicalTask {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
  custom_fields?: Record<string, any>;
  parent_id?: number;
  task_level: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: HierarchicalTask[];
}

export interface TaskUpdate {
  id: number;
  task_id: number;
  update_type: string;
  old_value?: string;
  new_value?: string;
  updated_by?: number;
  notes?: string;
  created_at: string;
  updated_by_username?: string;
}

export interface TimelineEvent {
  id: number;
  task_id: number;
  event_type: string;
  event_date: string;
  description: string;
  user_id?: number;
  metadata?: Record<string, any>;
  username?: string;
  task_title?: string;
}