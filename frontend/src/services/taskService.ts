import api from './api';
import { ValidationHelper } from '../utils/errorHandling';
import { logApiError, logTaskAction, logPerformance } from '../utils/logger';
import { validateTaskRequest, sanitizeForAPI, sanitizeFromAPI } from '../utils/dataValidator';
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
            has_prev: false
          }
        };
      }
      
      return response.data;
    } catch (error: Error | unknown) {
      console.error('TaskService.getTasks error:', error);
      console.warn('Using fallback empty data for getTasks due to API error');
      
      // Return empty data instead of throwing for graceful degradation
      return {
        data: [],
        pagination: {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      };
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
    const start = performance.now();
    
    try {
      // Validate input
      ValidationHelper.validateRequired(task.title, '任务标题');
      ValidationHelper.validateLength(task.title, '任务标题', 2, 200);
      
      if (task.description) {
        ValidationHelper.validateLength(task.description, '任务描述', 0, 1000);
      }

      // 验证和清理任务数据
      const validationResult = validateTaskRequest(task);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.error}`);
      }

      // 清理数据格式
      const cleanedTask = sanitizeForAPI(validationResult.cleanedData || task);

      const response: APIResponse<Task> = await api.post(
        `/projects/${projectId}/tasks`,
        cleanedTask
      );
      
      if (!response.success) {
        const error = new Error(response.error?.message || 'Failed to create task');
        logApiError('Task creation failed', error, { 
          projectId, 
          taskTitle: task.title,
          endpoint: `/projects/${projectId}/tasks`
        });
        throw error;
      }
      
      const duration = performance.now() - start;
      logTaskAction('create', response.data!.id, projectId);
      logPerformance('createTask', duration, { projectId, taskId: response.data!.id });
      
      return response.data!;
    } catch (error) {
      const duration = performance.now() - start;
      logTaskAction('create', 'unknown', projectId, error);
      logPerformance('createTask (failed)', duration, { projectId });
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  static async updateTask(
    projectId: number,
    taskId: number,
    task: Partial<TaskRequest>
  ): Promise<Task> {
    try {
      // Log the request data for debugging
      });

      // 验证和清理任务数据
      const validationResult = validateTaskRequest(task);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.error}`);
      }

      // 清理数据格式
      const sanitizedTask = sanitizeForAPI(validationResult.cleanedData || task);

      const response: APIResponse<Task> = await api.put(
        `/projects/${projectId}/tasks/${taskId}`,
        sanitizedTask
      );
      
      if (!response.success) {
        console.error('TaskService.updateTask - API returned error:', response.error);
        throw new Error(response.error?.message || 'Failed to update task');
      }
      
      return response.data!;
    } catch (error: Error | unknown) {
      console.error('TaskService.updateTask - Error details:', {
        error: error.message,
        status: error.status,
        data: error.data,
        projectId,
        taskId,
        requestData: task
      });
      throw error;
    }
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
            has_prev: false
          }
        };
      }
      
      return response.data;
    } catch (error: Error | unknown) {
      console.error('TaskService.getRootTasks error:', error);
      console.warn('Using fallback empty data for getRootTasks due to API error');
      
      // Return empty data instead of throwing for graceful degradation
      return {
        data: [],
        pagination: {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      };
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
    } catch (error: Error | unknown) {
      console.error('TaskService.getTaskChildren error:', error);
      console.warn('Using fallback empty array for getTaskChildren due to API error');
      
      // Return empty array instead of throwing for graceful degradation
      return [];
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
   * Batch update tasks status
   */
  static async batchUpdateTasks(
    projectId: number,
    taskIds: number[],
    status: string
  ): Promise<{
    updated_count: number;
    failed_tasks?: Array<{ task_id: number; error: string }>;
    message: string;
  }> {
    try {
      const requestData = {
        task_ids: taskIds,
        status: status,
        updated_by: 1 // TODO: Get from auth context
      };

      const response: APIResponse<{
        updated_count: number;
        failed_tasks?: Array<{ task_id: number; error: string }>;
        message: string;
      }> = await api.patch(
        `/projects/${projectId}/tasks/batch`,
        requestData
      );
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'Failed to batch update tasks');
      }
      
      // Log successful batch operation
      logTaskAction('batch_update', {
        projectId,
        taskIds,
        status,
        updatedCount: response.data?.updated_count || 0,
        failedCount: response.data?.failed_tasks?.length || 0
      });
      
      return response.data!;
    } catch (error) {
      logApiError('batchUpdateTasks', error);
      throw error;
    }
  }

}