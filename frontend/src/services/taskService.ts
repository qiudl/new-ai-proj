import api from './api';
import { ValidationHelper } from '../utils/errorTypes';
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
    try {
      const response: any = await api.get(`/projects/${projectId}/tasks/${taskId}`);

      // If using wrapped APIResponse shape
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to fetch task');
        }
        return (response.data as Task);
      }

      // If axios interceptor already unwrapped to data or { data: Task }
      const data = response && response.data ? response.data : response;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        console.warn('TaskService.getTask: unexpected response shape', response);
        throw new Error('Failed to fetch task');
      }

      return data as Task;
    } catch (error) {
      console.error('TaskService.getTask error:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  static async createTask(projectId: number, task: TaskRequest): Promise<Task> {
    const start = performance.now();
    
    try {
      // Validate input
      ValidationHelper.validateRequired(task.title as any, '任务标题');
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
        let errorMessage = response.error?.message || 'Failed to create task';
        
        // Check for duplicate title error and provide user-friendly message
        if (response.error?.code === 'CONFLICT' || errorMessage.includes('已存在') || errorMessage.includes('重复')) {
          // Extract task ID from backend error message if available
          const taskIdMatch = errorMessage.match(/任务ID:\s*(\d+)/);
          const existingTaskId = taskIdMatch ? taskIdMatch[1] : '';
          
          errorMessage = `任务创建失败：标题 "${task.title}" 已存在于当前项目中${existingTaskId ? `（已存在任务ID: ${existingTaskId}）` : ''}。\n\n建议解决方案：\n1. 修改任务标题，使其更具体或添加编号\n2. 检查已存在的任务是否可以复用\n3. 如需要，可以将其作为已存在任务的子任务`;
        }
        
        const error = new Error(errorMessage);
        logApiError('Task creation failed', error, { 
          projectId, 
          taskTitle: task.title,
          endpoint: `/projects/${projectId}/tasks`,
          isDuplicate: errorMessage.includes('已存在')
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
      // Debug logging removed

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
        error: (error as any).message,
        status: (error as any).status,
        data: (error as any).data,
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
    // 兼容不同的响应格式：
    // 1) 标准包装 { success, data }
    // 2) axios 拦截器已解包，直接返回 data
    // 3) 某些情况下后端返回 { data: [...] }
    try {
      const response: any = await api.get(`/projects/${projectId}/tasks/tree`);

      // 如果是标准包装格式（包含 success 字段）
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to fetch task tree');
        }
        return (response.data as HierarchicalTask[]) || [];
      }

      // 如果 axios 拦截器已解包，response 可能直接是数据或 { data: [...] }
      const data = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : [];

      if (!Array.isArray(data)) {
        console.warn('TaskService.getTaskTree: unexpected response shape', response);
        return [];
      }

      return data as HierarchicalTask[];
    } catch (error) {
      console.error('TaskService.getTaskTree error:', error);
      throw error;
    }
  }

  /**
   * Get root tasks (tasks without parent) for a project
   */
  static async getRootTasks(
    projectId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Task>> {
    try {
      const response: any = await api.get(
        `/projects/${projectId}/tasks/root`,
        { params }
      );
      
      // 1) Wrapped APIResponse shape { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response?.error?.message || 'Failed to fetch root tasks');
        }
        const payload = response.data;
        if (!payload) {
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
        // payload might be { data: Task[], pagination: {...} }
        if (payload && typeof payload === 'object' && Array.isArray(payload.data) && payload.pagination) {
          return payload as PaginatedResponse<Task>;
        }
        console.warn('TaskService.getRootTasks: unexpected wrapped response shape', response);
        throw new Error('Failed to fetch root tasks');
      }

      // 2) Axios-unwrapped cases
      // Important: Do NOT blindly unwrap "response.data" when response is already the PaginatedResponse,
      // because that would drop the pagination field. First, check if response itself matches the expected shape.
      const r = response;
      if (r && typeof r === 'object') {
        // Case A: Already PaginatedResponse { data: Task[], pagination: {...} }
        if (Array.isArray((r as any).data) && (r as any).pagination) {
          return r as PaginatedResponse<Task>;
        }
        // Case B: Nested inside a data field: { data: { data: Task[], pagination: {...} } }
        const nested = (r as any).data;
        if (nested && typeof nested === 'object' && Array.isArray(nested.data) && nested.pagination) {
          return nested as PaginatedResponse<Task>;
        }
      }

      console.warn('TaskService.getRootTasks: unexpected response shape', response);
      throw new Error('Failed to fetch root tasks');
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
      const response: any = await api.get(
        `/projects/${projectId}/tasks/${taskId}/children`
      );
      
      // Handle wrapped APIResponse
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response?.error?.message || 'Failed to fetch task children');
        }
        const d = response.data;
        const children = Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d)
            ? d
            : [];
        return children as Task[];
      }

      // Axios-unwrapped
      const data = response && response.data ? response.data : response;
      const children = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      return children as Task[];
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
   * Batch update tasks status and/or parent
   */
  static async batchUpdateTasks(
    projectId: number,
    taskIds: number[],
    updates: {
      status?: string;
      parent_id?: number | null;
    }
  ): Promise<{
    updated_count: number;
    failed_tasks?: Array<{ task_id: number; error: string }>;
    message: string;
  }> {
    try {
      // 修正参数映射，确保与后端期望的格式一致
      const requestData = {
        task_ids: taskIds,
        status: updates.status || undefined,
        parent_id: updates.parent_id !== undefined ? (updates.parent_id === null ? null : updates.parent_id) : undefined,
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
      const updateType = updates.status && updates.parent_id !== undefined ? 'batch_update_status_parent' : 
                        updates.status ? 'batch_update_status' : 'batch_update_parent';
      logTaskAction(updateType, taskIds.join(','), projectId);
      
      return response.data!;
    } catch (error) {
      logApiError('batchUpdateTasks', error);
      throw error;
    }
  }

  /**
   * Batch update parent task for multiple tasks
   */
  static async batchUpdateParentTask(
    projectId: number,
    taskIds: number[],
    parentId: number | null
  ): Promise<{
    updated_count: number;
    failed_tasks?: Array<{ task_id: number; error: string }>;
    message: string;
  }> {
    return this.batchUpdateTasks(projectId, taskIds, { parent_id: parentId });
  }

  /**
   * Get batch update preview for validation before executing the operation
   */
  static async getBatchUpdatePreview(
    projectId: number,
    taskIds: number[],
    parentId?: number | null
  ): Promise<{
    total_tasks: number;
    valid_tasks: number[];
    invalid_tasks: Array<{
      task_id: number;
      error: string;
      code: string;
    }>;
    warnings: string[];
    new_parent_info?: {
      task_id: number;
      current_depth: number;
      parent_id?: number;
      parent_title?: string;
      children_count: number;
      max_child_depth: number;
    };
  }> {
    try {
      const requestData = {
        task_ids: taskIds,
        parent_id: parentId !== undefined ? (parentId || undefined) : undefined
      };

      const response: APIResponse<{
        total_tasks: number;
        valid_tasks: number[];
        invalid_tasks: Array<{
          task_id: number;
          error: string;
          code: string;
        }>;
        warnings: string[];
        new_parent_info?: {
          task_id: number;
          current_depth: number;
          parent_id?: number;
          parent_title?: string;
          children_count: number;
          max_child_depth: number;
        };
      }> = await api.post(
        `/projects/${projectId}/tasks/batch/preview`,
        requestData
      );
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'Failed to get batch update preview');
      }
      
      return response.data!;
    } catch (error) {
      logApiError('getBatchUpdatePreview', error);
      console.error('TaskService.getBatchUpdatePreview error:', error);
      
      // Return error state instead of throwing to allow graceful degradation
      return {
        total_tasks: taskIds.length,
        valid_tasks: [],
        invalid_tasks: taskIds.map(taskId => ({
          task_id: taskId,
          error: 'Unable to validate task due to API error',
          code: 'API_ERROR'
        })),
        warnings: ['无法连接到验证服务，请稍后重试'],
        new_parent_info: undefined
      };
    }
  }

}