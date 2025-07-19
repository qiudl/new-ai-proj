import api from './api';
import {
  Task,
  TaskRequest,
  TaskFilter,
  PaginationParams,
  PaginatedResponse,
  BulkImportRequest,
  BulkImportResponse,
  APIResponse,
} from '../types/task';

export class TaskService {
  /**
   * Get tasks for a project with pagination and filtering
   */
  static async getTasks(
    projectId: number,
    params?: PaginationParams & TaskFilter
  ): Promise<PaginatedResponse<Task>> {
    const response: APIResponse<PaginatedResponse<Task>> = await api.get(
      `/projects/${projectId}/tasks`,
      { params }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch tasks');
    }
    
    return response.data!;
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
}