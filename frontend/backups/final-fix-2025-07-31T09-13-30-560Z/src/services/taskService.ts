import api from './api';
import { ValidationHelper } from '../utils/errorHandling';
import { logApiError, logTaskAction, logPerformance } from '../utils/logger';
import { TaskHierarchyService } from './taskHierarchyService';
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
  TimelineEvent} from '../types/task';

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
    } catch (error: any) {
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
   * Create a new task with hierarchy logic
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

      // If this is a child task, use hierarchy service
      if (task.parent_id) {
        const createdTask = await TaskHierarchyService.createChildTask(projectId, task.parent_id, task);
        
        const duration = performance.now() - start;
        logTaskAction('create (child)', { taskId: createdTask.id, projectId, parentId: task.parent_id });
        logPerformance('createChildTask', { duration, projectId, taskId: createdTask.id });
        
        return createdTask;
      }

      const response: APIResponse<Task> = await api.post(
        `/projects/${projectId}/tasks`,
        task
      );
      
      if (!response.success) {
        const error = new Error(response.error?.message || 'Failed to create task');
        logApiError('POST', `/projects/${projectId}/tasks`, error);
        throw error;
      }
      
      const duration = performance.now() - start;
      logTaskAction('create', { taskId: response.data!.id, projectId });
      logPerformance('createTask', { duration, projectId, taskId: response.data!.id });
      
      return response.data!;
    } catch (error: any) {
      const duration = performance.now() - start;
      logTaskAction('create failed', { projectId, error: error?.message || 'Unknown error' });
      logPerformance('createTask (failed)', { duration, projectId });
      throw error;
    }
  }

  /**
   * Update an existing task with hierarchy logic
   */
  static async updateTask(
    projectId: number,
    taskId: number,
    task: Partial<TaskRequest>
  ): Promise<Task> {
    try {
      // Log the request data for debugging
      console.log('TaskService.updateTask - Request data:', {
        projectId,
        taskId,
        task,
        taskStringified: JSON.stringify(task, null, 2)
      });

      // Use hierarchy service for updates that might affect parent-child relationships
      if (task.status || task.due_date) {
        return await TaskHierarchyService.updateTaskWithHierarchyLogic(projectId, taskId, task);
      }

      // Basic data validation - let backend handle detailed validation
      const sanitizedTask = {
        ...task
      };

      const response: APIResponse<Task> = await api.put(
        `/projects/${projectId}/tasks/${taskId}`,
        sanitizedTask
      );
      
      if (!response.success) {
        console.error('TaskService.updateTask - API returned error:', response.error);
        throw new Error(response.error?.message || 'Failed to update task');
      }
      
      return response.data!;
    } catch (error: any) {
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
   * Delete a task with hierarchy logic
   */
  static async deleteTask(projectId: number, taskId: number): Promise<void> {
    await TaskHierarchyService.deleteTaskWithHierarchyLogic(projectId, taskId);
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
    // First try the dedicated root endpoint
    try {
      const response: APIResponse<PaginatedResponse<Task>> = await api.get(
        `/projects/${projectId}/tasks/root`,
        { params }
      );
      
      if (response && response.success && response.data) {
        return response.data;
      }
    } catch (rootError: any) {
      console.warn('Root tasks endpoint failed, attempting fallback to regular tasks endpoint:', rootError.message);
    }
    
    // Fallback 1: Try regular tasks endpoint without parent_id filter
    try {
      console.log('Attempting fallback: regular tasks endpoint');
      const response: APIResponse<PaginatedResponse<Task>> = await api.get(
        `/projects/${projectId}/tasks`,
        { params }
      );
      
      if (response && response.success && response.data) {
        // Filter out tasks with parent_id manually on client side
        const allTasks = response.data.data || [];
        const rootTasks = allTasks.filter((task: Task) => !task.parent_id || task.parent_id === null);
        
        console.log(`Fallback successful: Found ${rootTasks.length} root tasks out of ${allTasks.length} total tasks`);
        
        return {
          data: rootTasks,
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: rootTasks.length,
            total_pages: Math.ceil(rootTasks.length / (params?.page_size || 20)),
            has_next: (params?.page || 1) * (params?.page_size || 20) < rootTasks.length,
            has_prev: (params?.page || 1) > 1
          }
        };
      }
    } catch (fallbackError: any) {
      console.warn('Regular tasks endpoint also failed:', fallbackError.message);
    }
    
    // Fallback 2: Return empty data with proper structure
    console.warn('All getRootTasks attempts failed, returning empty data for graceful degradation');
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
   * Archive a single task
   */
  static async archiveTask(
    projectId: number, 
    taskId: number, 
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response: APIResponse<{ success: boolean; message: string }> = await api.post(
        `/projects/${projectId}/tasks/${taskId}/archive`,
        { reason }
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to archive task');
      }
      
      return response.data!;
    } catch (error: any) {
      // Handle 404 errors gracefully for missing backend APIs
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn('Archive API not implemented yet, providing friendly user message');
        return {
          success: false,
          message: '归档功能暂未实现，请联系开发团队。该功能需要后端API支持。'
        };
      }
      
      console.error('TaskService.archiveTask error:', error);
      throw error;
    }
  }

  /**
   * Unarchive a task
   */
  static async unarchiveTask(
    projectId: number, 
    taskId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response: APIResponse<{ success: boolean; message: string }> = await api.post(
        `/projects/${projectId}/tasks/${taskId}/unarchive`
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to unarchive task');
      }
      
      return response.data!;
    } catch (error: any) {
      // Handle 404 errors gracefully for missing backend APIs
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn('Unarchive API not implemented yet, providing friendly user message');
        return {
          success: false,
          message: '取消归档功能暂未实现，请联系开发团队。该功能需要后端API支持。'
        };
      }
      
      console.error('TaskService.unarchiveTask error:', error);
      throw error;
    }
  }

  /**
   * Bulk archive tasks
   */
  static async bulkArchiveTasks(
    projectId: number, 
    taskIds: number[], 
    reason?: string
  ): Promise<{ success: boolean; message: string; archivedCount?: number }> {
    try {
      const response: APIResponse<{ success: boolean; message: string; archivedCount?: number }> = await api.post(
        `/projects/${projectId}/tasks/archive/bulk`,
        { task_ids: taskIds, reason }
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to bulk archive tasks');
      }
      
      return response.data!;
    } catch (error: any) {
      // Handle 404 errors gracefully for missing backend APIs
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn('Bulk archive API not implemented yet, providing friendly user message');
        return {
          success: false,
          message: '批量归档功能暂未实现，请联系开发团队。该功能需要后端API支持。',
          archivedCount: 0
        };
      }
      
      console.error('TaskService.bulkArchiveTasks error:', error);
      throw error;
    }
  }

  /**
   * Get archived tasks for a project
   */
  static async getArchivedTasks(
    projectId: number,
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResponse<Task>> {
    try {
      const response: APIResponse<PaginatedResponse<Task>> = await api.get(
        `/projects/${projectId}/tasks/archived`,
        { params }
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch archived tasks');
      }
      
      return response.data!;
    } catch (error: any) {
      // Handle 404 errors gracefully for missing backend APIs
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn('Archived tasks API not implemented yet, returning empty data');
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
      
      console.error('TaskService.getArchivedTasks error:', error);
      // For other errors, return empty data to prevent UI crashes
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
   * Get archive statistics for a project
   */
  static async getArchiveStats(
    projectId: number
  ): Promise<{ totalArchived: number; archivedThisMonth: number; archivedThisWeek: number }> {
    try {
      const response: APIResponse<{ totalArchived: number; archivedThisMonth: number; archivedThisWeek: number }> = await api.get(
        `/projects/${projectId}/archive/stats`
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch archive statistics');
      }
      
      return response.data!;
    } catch (error: any) {
      // Handle 404 errors gracefully for missing backend APIs
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn('Archive stats API not implemented yet, returning default stats');
        return {
          totalArchived: 0,
          archivedThisMonth: 0,
          archivedThisWeek: 0
        };
      }
      
      console.error('TaskService.getArchiveStats error:', error);
      // Return default stats for other errors
      return {
        totalArchived: 0,
        archivedThisMonth: 0,
        archivedThisWeek: 0
      };
    }
  }

  // Hierarchy-related convenience methods

  /**
   * Get task hierarchy information
   */
  static async getTaskHierarchy(projectId: number, taskId: number) {
    return await TaskHierarchyService.getTaskHierarchyInfo(projectId, taskId);
  }

  /**
   * Update tasks when timer starts/stops (for parent-child timer logic)
   */
  static async updateTasksWithTimer(projectId: number, parentTaskId: number, isTimerRunning: boolean) {
    return await TaskHierarchyService.updateTasksWithTimer(projectId, parentTaskId, isTimerRunning);
  }

}