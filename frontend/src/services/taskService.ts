import api, { safeApiCall } from './api';
import { NetworkErrorHandler, BoundaryHelper, ValidationHelper } from '../utils/errorHandling';
import {
  Task,
  TaskRequest,
  TaskFilter,
  PaginationParams,
  PaginatedResponse,
  BulkImportRequest,
  BulkImportResponse,
  APIResponse,
  HierarchicalTask,
  TaskUpdate,
  TimelineEvent,
} from '../types/task';

export class TaskService {
  /**
   * Get tasks for a project with pagination and filtering
   */
  static async getTasks(
    projectId: number,
    params?: PaginationParams & TaskFilter
  ): Promise<PaginatedResponse<Task>> {
    try {
      const response: APIResponse<PaginatedResponse<Task>> = await api.get(
        `/projects/${projectId}/tasks`,
        { params }
      );
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'Failed to fetch tasks');
      }
      
      // Ensure response.data has the correct structure
      if (!response.data) {
        return {
          data: [],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          }
        };
      }
      
      // Ensure data is an array
      const data = Array.isArray(response.data.data) ? response.data.data : [];
      
      return {
        data,
        pagination: response.data.pagination || {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        }
      };
    } catch (error: any) {
      console.error('TaskService.getTasks error:', error);
      throw new Error(error.message || 'Failed to fetch tasks');
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTask(projectId: number, taskId: number): Promise<Task> {
    const response: APIResponse<Task> = await api.get(
      `/projects/${projectId}/tasks/${taskId}`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch task');
    }
    
    return response.data!;
  }

  /**
   * Create a new task
   */
  static async createTask(projectId: number, task: TaskRequest): Promise<Task> {
    // Validate input
    ValidationHelper.validateRequired(task.title, '任务标题');
    ValidationHelper.validateLength(task.title, '任务标题', 2, 200);
    
    if (task.description) {
      ValidationHelper.validateLength(task.description, '任务描述', 0, 1000);
    }

    const response: APIResponse<Task> = await api.post(
      `/projects/${projectId}/tasks`,
      task
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create task');
    }
    
    return response.data!;
  }

  /**
   * Update an existing task
   */
  static async updateTask(
    projectId: number,
    taskId: number,
    task: Partial<TaskRequest>
  ): Promise<Task> {
    const response: APIResponse<Task> = await api.put(
      `/projects/${projectId}/tasks/${taskId}`,
      task
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update task');
    }
    
    return response.data!;
  }

  /**
   * Delete a task
   */
  static async deleteTask(projectId: number, taskId: number): Promise<void> {
    const response: APIResponse = await api.delete(
      `/projects/${projectId}/tasks/${taskId}`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete task');
    }
  }

  /**
   * Bulk delete tasks
   */
  static async bulkDeleteTasks(projectId: number, taskIds: number[]): Promise<{ deleted_count: number; message: string }> {
    const response: APIResponse<{ deleted_count: number; message: string }> = await api.delete(
      `/projects/${projectId}/tasks`,
      {
        data: {
          task_ids: taskIds
        }
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to bulk delete tasks');
    }
    
    return response.data!;
  }

  /**
   * Bulk import tasks
   */
  static async bulkImportTasks(
    projectId: number,
    bulkImport: BulkImportRequest
  ): Promise<BulkImportResponse> {
    const response: APIResponse<BulkImportResponse> = await api.post(
      `/projects/${projectId}/tasks/bulk-import`,
      bulkImport
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to import tasks');
    }
    
    return response.data!;
  }

  // Hierarchical task methods

  /**
   * Get complete task tree for a project
   */
  static async getTaskTree(projectId: number): Promise<HierarchicalTask[]> {
    const response: APIResponse<HierarchicalTask[]> = await api.get(
      `/projects/${projectId}/tasks/tree`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch task tree');
    }
    
    return response.data!;
  }

  /**
   * Get root tasks (tasks without parent) for a project
   */
  static async getRootTasks(
    projectId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Task>> {
    try {
      const response: APIResponse<PaginatedResponse<Task>> = await api.get(
        `/projects/${projectId}/tasks/root`,
        { params }
      );
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'Failed to fetch root tasks');
      }
      
      // Ensure response.data has the correct structure
      if (!response.data) {
        return {
          data: [],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          }
        };
      }
      
      // Ensure data is an array
      const data = Array.isArray(response.data.data) ? response.data.data : [];
      
      return {
        data,
        pagination: response.data.pagination || {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        }
      };
    } catch (error: any) {
      console.error('TaskService.getRootTasks error:', error);
      throw new Error(error.message || 'Failed to fetch root tasks');
    }
  }

  /**
   * Get children of a specific task
   */
  static async getTaskChildren(projectId: number, taskId: number): Promise<Task[]> {
    try {
      const response: APIResponse<Task[]> = await api.get(
        `/projects/${projectId}/tasks/${taskId}/children`
      );
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'Failed to fetch task children');
      }
      
      // Ensure response.data is an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('TaskService.getTaskChildren error:', error);
      throw new Error(error.message || 'Failed to fetch task children');
    }
  }

  /**
   * Get update history for a task
   */
  static async getTaskUpdates(
    projectId: number,
    taskId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<TaskUpdate>> {
    const response: APIResponse<PaginatedResponse<TaskUpdate>> = await api.get(
      `/projects/${projectId}/tasks/${taskId}/updates`,
      { params }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch task updates');
    }
    
    return response.data!;
  }

  /**
   * Get timeline events for a task
   */
  static async getTaskTimeline(
    projectId: number,
    taskId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<TimelineEvent>> {
    const response: APIResponse<PaginatedResponse<TimelineEvent>> = await api.get(
      `/projects/${projectId}/tasks/${taskId}/timeline`,
      { params }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch task timeline');
    }
    
    return response.data!;
  }

  /**
   * Get project timeline (all tasks)
   */
  static async getProjectTimeline(
    projectId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<TimelineEvent>> {
    const response: APIResponse<PaginatedResponse<TimelineEvent>> = await api.get(
      `/projects/${projectId}/timeline`,
      { params }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch project timeline');
    }
    
    return response.data!;
  }

  /**
   * Get all tasks across all projects
   */
  static async getAllTasks(
    params?: PaginationParams & TaskFilter
  ): Promise<PaginatedResponse<Task>> {
    try {
      const response: APIResponse<PaginatedResponse<Task>> = await api.get(
        '/tasks',
        { params }
      );
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'Failed to fetch all tasks');
      }
      
      // Ensure response.data has the correct structure
      if (!response.data) {
        return {
          data: [],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          }
        };
      }
      
      // Ensure data is an array
      const data = Array.isArray(response.data.data) ? response.data.data : [];
      
      return {
        data,
        pagination: response.data.pagination || {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        }
      };
    } catch (error: any) {
      console.error('TaskService.getAllTasks error:', error);
      throw new Error(error.message || 'Failed to fetch all tasks');
    }
  }
}