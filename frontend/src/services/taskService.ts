import api from './api';

// ✅ FIXED - Add ErrorType to imports (TS2304)
import { ValidationHelper, AppError, ErrorType } from '../utils/errorTypes';
import { logApiError, logTaskAction, logPerformance } from '../utils/logger';
import { API_ENDPOINTS, apiConfig } from '../config/apiConfig';
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

import { UnifiedTaskNode, isBaseTaskNode, TaskDescendantsApiResponse } from '../types/UnifiedTaskNode';

// API response format validator for V1 format
function validateV1TaskDescendantsResponse(response: any): UnifiedTaskNode[] {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response: response is not an object');
  }

  // V1 format: direct array or nested in data property
  const dataArray = Array.isArray(response) ? response : response.data;
  
  if (!Array.isArray(dataArray)) {
    throw new Error('Invalid API response: data is not an array');
  }

  // Validate each task node
  for (let i = 0; i < dataArray.length; i++) {
    const node = dataArray[i];
    if (!isBaseTaskNode(node)) {
      console.warn(`Invalid task node at index ${i}:`, node);
      throw new Error(`Invalid API response: task node at index ${i} is malformed`);
    }
  }

  return dataArray as UnifiedTaskNode[];
}

// Enhanced parameters interface for the unified API
export interface TaskDescendantsParams {
  depth?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
  includeExtended?: boolean;
  apiVersion?: 'v1' | 'v2';
}


// Legacy function for backward compatibility
export async function fetchTaskDescendants(projectId: number, taskId: number, params?: { depth?: number; limit?: number }) {
  return fetchTaskDescendantsV2(projectId, taskId, {
    depth: params?.depth,
    limit: params?.limit,
    apiVersion: 'v2' // Use V2 by default for standardized interface
  });
}

// Enhanced function supporting the new unified API format
export async function fetchTaskDescendantsV2(
  projectId: number, 
  taskId: number, 
  params?: TaskDescendantsParams
): Promise<TaskDescendantsApiResponse> {
  const {
    depth = 2,
    limit = 200,
    page,
    pageSize,
    includeExtended = false,
    apiVersion = 'v2'
  } = params || {};

  try {
    // Build query parameters
    const queryParams: Record<string, any> = { depth };
    
    if (apiVersion === 'v2') {
      queryParams.api_version = 'v2';
      
      // Add pagination parameters if specified
      if (page !== undefined) {
        queryParams.page = page;
      }
      if (pageSize !== undefined) {
        queryParams.page_size = pageSize;
      } else if (limit !== undefined) {
        queryParams.limit = limit;
      }
      
      // Add extended fields parameter
      if (includeExtended) {
        queryParams.include_extended = 'true';
      }
    } else {
      // V1 API parameters
      queryParams.limit = limit;
    }

    const response: any = await api.get(
      `/projects/${projectId}/tasks/${taskId}/descendants`,
      { params: queryParams }
    );

    // API interceptor automatically unwraps { success: true, data: {...} } to just the data part
    // For V2 API, response is the full unified format
    // For V1 API, response needs to be wrapped for compatibility
    
    if (apiVersion === 'v2') {
      // V2 API returns the full unified format
      return { data: response };
    } else {
      // V1 API - validate and transform for backward compatibility
      const validatedData = validateV1TaskDescendantsResponse(response);
      return { 
        data: { 
          data: validatedData,
          meta: {
            requested_depth: depth,
            max_depth_reached: false,
            truncated: false,
            total_returned: validatedData.length,
            hidden_nodes_truncated: false,
          }
        } 
      };
    }
  } catch (e: any) {
    // Enhanced error handling with validation context
    if (e.message && e.message.includes('Invalid API response')) {
      console.error('API Response Validation Error:', e.message);
      throw new Error(`API validation failed: ${e.message}`);
    }
    
    const status = e?.response?.status;
    const payload = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || '';
    throw new Error(`Failed to fetch descendants: ${status ?? ''} ${payload}`.trim());
  }
}

// Utility function to fetch paginated descendants
export async function fetchTaskDescendantsPaginated(
  projectId: number,
  taskId: number,
  page: number = 1,
  pageSize: number = 20,
  options?: {
    depth?: number;
    includeExtended?: boolean;
  }
): Promise<TaskDescendantsApiResponse> {
  return fetchTaskDescendantsV2(projectId, taskId, {
    depth: options?.depth ?? 2,
    page,
    pageSize,
    includeExtended: options?.includeExtended ?? false,
    apiVersion: 'v2'
  });
}

// Utility function to fetch extended task details
export async function fetchTaskDescendantsExtended(
  projectId: number,
  taskId: number,
  params?: {
    depth?: number;
    limit?: number;
    page?: number;
    pageSize?: number;
  }
): Promise<TaskDescendantsApiResponse> {
  return fetchTaskDescendantsV2(projectId, taskId, {
    ...params,
    includeExtended: true,
    apiVersion: 'v2'
  });
}

// Cache capability detection to avoid repeated 404s when backend endpoint is unavailable
let LEGACY_PROGRESS_AVAILABLE: boolean | null = false;

export class TaskService {
  /**
   * 获取任务进度（全局路由）：GET /api/v1/tasks/:taskId/progress
   */
  static async getTaskProgress(taskId: number): Promise<{
    percent_raw: number;
    percent_display: number;
    estimate_minutes: number | null;
    actual_minutes: number;
    overrun_percent: number;
    completed: boolean;
    breakdown?: Array<{ id: number | string; title: string; weight: number; progress: number; status: string }>;
  }> {
    // If we've detected the endpoint is not available, return a benign fallback immediately
    if (LEGACY_PROGRESS_AVAILABLE === false) {
      return {
        percent_raw: 0,
        percent_display: 0,
        estimate_minutes: null,
        actual_minutes: 0,
        overrun_percent: 0,
        completed: false,
        breakdown: []
      };
    }

    try {
      const resp: any = await api.get(`/tasks/${taskId}/progress`);
      LEGACY_PROGRESS_AVAILABLE = true;
      return resp as any;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 404) {
        // Mark as unavailable to suppress further calls in this session
        LEGACY_PROGRESS_AVAILABLE = false;
        return {
          percent_raw: 0,
          percent_display: 0,
          estimate_minutes: null,
          actual_minutes: 0,
          overrun_percent: 0,
          completed: false,
          breakdown: []
        };
      }
      throw err;
    }
  }

  /**
   * Get tasks for a project with pagination and filtering
   */
  static async getTasks(
    projectId: number,
    params?: PaginationParams & TaskFilter
  ): Promise<PaginatedResponse<Task>> {
    try {
      const response: any = await api.get(
        `/projects/${projectId}/tasks`,
        { params }
      );

      // Case 1: Wrapped APIResponse { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response?.error?.message || 'Failed to fetch tasks');
        }
        const payload = response.data;
        if (payload && typeof payload === 'object' && (payload as any).pagination) {
          const d = Array.isArray((payload as any).data) ? (payload as any).data : [];
          return { data: d, pagination: (payload as any).pagination } as PaginatedResponse<Task>;
        }
        // Fallback when payload missing/invalid
        return {
          data: Array.isArray(payload) ? payload : [],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: Array.isArray(payload) ? payload.length : 0,
            total_pages: Array.isArray(payload) ? 1 : 0,
            has_next: false,
            has_prev: false,
          },
        };
      }

      // Case 2: Axios interceptor unwrapped to payload already
      if (response && typeof response === 'object') {
        // 2A) Direct PaginatedResponse shape
        if ((response && typeof response === 'object') && ('data' in (response as any)) && ((response as any).pagination)) {
          const d = Array.isArray((response as any).data) ? (response as any).data : [];
          return { data: d, pagination: (response as any).pagination } as PaginatedResponse<Task>;
        }
        // 2B) Nested inside a data field: { data: { data: Task[], pagination: {...} } }
        const nested = (response as any).data;
        if (nested && typeof nested === 'object' && (nested as any).pagination) {
          const d = Array.isArray((nested as any).data) ? (nested as any).data : [];
          return { data: d, pagination: (nested as any).pagination } as PaginatedResponse<Task>;
        }
      }

      // 2C) Plain array (no pagination)
      if (Array.isArray(response)) {
        return {
          data: response as Task[],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: (response as Task[]).length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        };
      }

      // Additional tolerant shapes
      const respObj: any = response;
      // 2D) { items: Task[], pagination? }
      if (respObj && Array.isArray(respObj.items)) {
        const items = respObj.items as Task[];
        const pg = respObj.pagination || {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: items.length,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        };
        return { data: items, pagination: pg };
      }
      // 2E) { data: { items: Task[], pagination? } }
      const inner = respObj?.data;
      if (inner && Array.isArray(inner?.items)) {
        const items = inner.items as Task[];
        const pg = inner.pagination || {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: items.length,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        };
        return { data: items, pagination: pg };
      }

      // Unknown shape -> fallback
      console.warn('TaskService.getTasks: unexpected response shape', response);
      return {
        data: [],
        pagination: {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      };
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
          has_prev: false,
        },
      };
    }
  }

  /**
   * Get all tasks across projects with pagination and filtering
   * Backend endpoint: GET /api/v1/tasks
   */
static async getAllTasks(
    params?: (PaginationParams & TaskFilter & { preset?: 'overdue' | 'planning' | 'on_hold' })
  ): Promise<PaginatedResponse<Task>> {
    try {
// removed forced default preset to allow 'all' view
const mergedRaw = { ...(params || {}) } as any;
      if (mergedRaw.q && !mergedRaw.search) {
        mergedRaw.search = mergedRaw.q;
      }
      const merged = mergedRaw;
      const response: any = await api.get(`/tasks`, { params: merged });

      // Case 1: Wrapped APIResponse { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response?.error?.message || 'Failed to fetch all tasks');
        }
        const payload = response.data;
        if (payload && typeof payload === 'object' && Array.isArray(payload.data) && payload.pagination) {
          return payload as PaginatedResponse<Task>;
        }
        // Fallback when payload missing/invalid
        return {
          data: Array.isArray(payload) ? payload : [],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        };
      }

      // Case 2: Axios interceptor unwrapped to payload already
      // 2A) Direct PaginatedResponse shape
      // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
      if (response && typeof response === 'object' && Array.isArray(response.data) && response.pagination) {
        return response as unknown as PaginatedResponse<Task>;
      }
      // 2B) Nested inside a data field: { data: { data: Task[], pagination: {...} } }
      const nested = response?.data;
      if (nested && typeof nested === 'object' && Array.isArray(nested.data) && nested.pagination) {
        return nested as PaginatedResponse<Task>;
      }
      // 2C) Plain array (no pagination)
      if (Array.isArray(response)) {
        return {
          data: response as Task[],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: (response as Task[]).length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        };
      }
      if (Array.isArray(nested)) {
        return {
          data: nested as Task[],
          pagination: {
            page: params?.page || 1,
            page_size: params?.page_size || 20,
            total: (nested as Task[]).length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        };
      }

      // Unknown shape -> fallback
      console.warn('TaskService.getAllTasks: unexpected response shape', response);
      return {
        data: [],
        pagination: {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      };
    } catch (error: Error | unknown) {
      console.error('TaskService.getAllTasks error:', error);
      console.warn('Using fallback empty data for getAllTasks due to API error');

      // Return empty data instead of throwing for graceful degradation
      return {
        data: [],
        pagination: {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      };
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTask(projectId: number, taskId: number): Promise<Task> {
    try {
      const response: any = await api.get(`/projects/${projectId}/tasks/${taskId}`);

      console.log('[TaskService.getTask] Raw response:', response);
      console.log('[TaskService.getTask] Response has success field:', 'success' in response);

      // Handle wrapped APIResponse { success, message, data }
      // Note: api.ts transformResponse has already parsed JSON strings
      if (response && typeof response === 'object' && 'success' in response) {
        console.log('[TaskService.getTask] Processing wrapped response, success:', response.success);
        if (!response.success) {
          throw new Error(response.message || response.error?.message || 'Failed to fetch task');
        }
        const task = response.data;
        if (!task || typeof task !== 'object' || !task.id || !task.title) {
          console.error('TaskService.getTask: Invalid task data in wrapped response', task);
          throw new Error('Failed to fetch task: Invalid task data');
        }
        console.log('[TaskService.getTask] Returning task from wrapped response:', task.id, task.title);

        // Clean up priority field if it's an empty string
        if (task.priority === '') {
          task.priority = undefined;
        }

        return task as Task;
      }

      // Handle unwrapped response (api.ts interceptor may have unwrapped it)
      console.log('[TaskService.getTask] Processing unwrapped response');
      const task = response;
      if (!task || typeof task !== 'object' || !task.id || !task.title) {
        console.error('TaskService.getTask: Invalid task data in unwrapped response', response);
        throw new Error('Failed to fetch task: Invalid task data');
      }

      console.log('[TaskService.getTask] Returning task from unwrapped response:', task.id, task.title);

      // Clean up priority field if it's an empty string
      if (task.priority === '') {
        task.priority = undefined;
      }

      return task as Task;
    } catch (error) {
      console.error('TaskService.getTask error:', error);
      throw error;
    }
  }

  /**
   * Get a task by ID (without needing project ID)
   * ✅ ADDED - 通过任务ID获取任务(不需要项目ID)
   */
  static async getTaskById(taskId: number): Promise<Task> {
    try {
      // Use the /tasks endpoint with task ID filter
      const response: any = await api.get(`/tasks`, {
        params: {
          ids: taskId,
          page: 1,
          page_size: 1
        }
      });

      // Handle paginated response
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0] as Task;
      }

      // If no task found, throw error
      throw new Error(`Task with ID ${taskId} not found`);
    } catch (error) {
      console.error('TaskService.getTaskById error:', error);
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

      // 注意: api interceptor会自动解包响应，只返回data部分
      // 所以response直接就是Task对象，不是APIResponse包装
      const createdTask: Task = await api.post(
        `/projects/${projectId}/tasks`,
        cleanedTask
      );

      // 记录成功
      const duration = performance.now() - start;
      logTaskAction('create', createdTask.id, projectId);
      logPerformance('createTask', duration, { projectId, taskId: createdTask.id });

      return createdTask;
    } catch (error) {
      const duration = performance.now() - start;

      // 处理特定错误类型
      if (error instanceof AppError) {
        const errorMessage = error.message;

        // 检查重复标题错误
        if (errorMessage.includes('已存在') || errorMessage.includes('重复') || errorMessage.includes('DUPLICATE')) {
          const taskIdMatch = errorMessage.match(/任务ID[：:]\s*(\d+)/);
          const existingTaskId = taskIdMatch ? taskIdMatch[1] : '';

          // ✅ FIXED - Use ErrorType.BUSINESS_LOGIC instead of string literal (TS2345)
          const friendlyError = new AppError(
            `任务创建失败：标题 "${task.title}" 已存在于当前项目中${existingTaskId ? `（已存在任务ID: ${existingTaskId}）` : ''}。\n\n建议解决方案：\n1. 修改任务标题，使其更具体或添加编号\n2. 检查已存在的任务是否可以复用\n3. 如需要，可以将其作为已存在任务的子任务`,
            ErrorType.BUSINESS_LOGIC,
            409
          );

          logApiError('Task creation failed', friendlyError, {
            projectId,
            taskTitle: task.title,
            endpoint: `/projects/${projectId}/tasks`,
            isDuplicate: true
          });
          logTaskAction('create', 'unknown', projectId, friendlyError);
          logPerformance('createTask (failed)', duration, { projectId });
          throw friendlyError;
        }

        // 其他错误直接抛出
        logApiError('Task creation failed', error, {
          projectId,
          taskTitle: task.title,
          endpoint: `/projects/${projectId}/tasks`,
          isDuplicate: false
        });
      }

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
      // 验证和清理任务数据
      const validationResult = validateTaskRequest(task);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.error}`);
      }

      // 清理数据格式
      const sanitizedTask = sanitizeForAPI(validationResult.cleanedData || task);

      const response: any = await api.put(
        `/projects/${projectId}/tasks/${taskId}`,
        sanitizedTask
      );

      // 支持多种响应格式
      // 1) 标准包装 { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          console.error('TaskService.updateTask - API returned error:', (response as any).error || response);
          const err: any = new Error((response as any)?.error?.message || (response as any)?.message || 'Failed to update task');
          err.status = (response as any)?.error?.status || (response as any)?.code;
          err.statusCode = err.status;
          err.data = (response as any)?.error;
          throw err;
        }
        const data = (response as any).data;
        return (sanitizeFromAPI ? (sanitizeFromAPI(data) as Task) : (data as Task));
      }

      // 2) Axios拦截器已解包
      // 2a) 直接是 Task 对象
      if (response && typeof response === 'object' && !Array.isArray(response) && 'id' in response && 'title' in response) {
        return (sanitizeFromAPI ? (sanitizeFromAPI(response) as Task) : (response as Task));
      }
      // 2b) 包在 data 字段内
      if (response && typeof response === 'object' && 'data' in response && response.data) {
        const maybeTask = (response as any).data;
        if (maybeTask && typeof maybeTask === 'object' && 'id' in maybeTask && 'title' in maybeTask) {
          return (sanitizeFromAPI ? (sanitizeFromAPI(maybeTask) as Task) : (maybeTask as Task));
        }
      }

      // 3) 其他未知格式
      console.warn('TaskService.updateTask: unexpected response shape', response);
      throw new Error('Failed to update task');
      
    } catch (error: any) {
      console.error('TaskService.updateTask - Error details:', {
        error: error?.message,
        status: error?.status,
        data: error?.data,
        projectId,
        taskId,
        requestData: task
      });

      // 规范化 AppError 以兼容调用方使用 statusCode/status 判断
      if (error instanceof AppError) {
        const normalized: any = new Error(error.message || 'Failed to update task');
        normalized.status = error.status;
        normalized.statusCode = error.status;
        normalized.data = error.context;
        throw normalized;
      }

      throw error;
    }
  }

  /**
   * Update task's project (move task to another project)
   * Only available for system administrators
   *
   * @param projectId - Current project ID
   * @param taskId - Task ID to update
   * @param targetProjectId - Target project ID to move to
   * @returns Updated task
   */
  static async updateTaskProject(
    projectId: number,
    taskId: number,
    targetProjectId: number
  ): Promise<Task> {
    try {
      // ✅ FIXED - logTaskAction expects (action, taskId, projectId, error?) (TS2554)
      logTaskAction('updateTaskProject', taskId, projectId);

      const response: any = await api.put(
        `/projects/${projectId}/tasks/${taskId}/project`,
        {
          target_project_id: targetProjectId
        }
      );

      // Handle various response formats similar to updateTask
      // 1) Standard wrapper { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          console.error('TaskService.updateTaskProject - API returned error:', (response as any).error || response);
          const err: any = new Error((response as any)?.error?.message || (response as any)?.message || 'Failed to update task project');
          err.status = (response as any)?.error?.status || (response as any)?.code;
          err.statusCode = err.status;
          err.data = (response as any)?.error;
          throw err;
        }
        const data = (response as any).data;
        return (sanitizeFromAPI ? (sanitizeFromAPI(data) as Task) : (data as Task));
      }

      // 2) Axios interceptor already unwrapped
      // 2a) Direct Task object
      if (response && typeof response === 'object' && !Array.isArray(response) && 'id' in response && 'title' in response) {
        return (sanitizeFromAPI ? (sanitizeFromAPI(response) as Task) : (response as Task));
      }
      // 2b) Wrapped in data field
      if (response && typeof response === 'object' && 'data' in response && response.data) {
        const maybeTask = (response as any).data;
        if (maybeTask && typeof maybeTask === 'object' && 'id' in maybeTask && 'title' in maybeTask) {
          return (sanitizeFromAPI ? (sanitizeFromAPI(maybeTask) as Task) : (maybeTask as Task));
        }
      }

      // 3) Unknown format
      console.warn('TaskService.updateTaskProject: unexpected response shape', response);
      throw new Error('Failed to update task project');

    } catch (error: any) {
      logApiError('updateTaskProject', error);
      console.error('TaskService.updateTaskProject - Error details:', {
        error: error?.message,
        status: error?.status,
        data: error?.data,
        projectId,
        taskId,
        targetProjectId
      });

      // Normalize AppError for compatibility
      if (error instanceof AppError) {
        const normalized: any = new Error(error.message || 'Failed to update task project');
        normalized.status = error.status;
        normalized.statusCode = error.status;
        normalized.data = error.context;
        throw normalized;
      }

      throw error;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(projectId: number, taskId: number): Promise<void> {
    // Note: api interceptor auto-unwraps response, returns null/undefined for DELETE
    await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    // Success if no error thrown
  }

  /**
   * Bulk delete tasks
   */
  static async bulkDeleteTasks(projectId: number, taskIds: number[]): Promise<{ deleted_count: number; message: string }> {
    // Note: api interceptor auto-unwraps response, returns data directly
    const result: { deleted_count: number; message: string } = await api.delete(
      `/projects/${projectId}/tasks`,
      {
        data: {
          task_ids: taskIds
        }
      }
    );

    return result;
  }

  /**
   * Bulk import tasks
   */
  static async bulkImportTasks(
    projectId: number,
    bulkImport: BulkImportRequest
  ): Promise<BulkImportResponse> {
    // Note: api interceptor auto-unwraps response, returns data directly
    const result: BulkImportResponse = await api.post(
      `/projects/${projectId}/tasks/bulk-import`,
      bulkImport
    );

    return result;
  }

  // Hierarchical task methods

  /**
   * Get complete task tree for a project
   * @param projectId - Project ID
   * @param sortBy - Sort field (created_at, title, status, etc.)
   * @param sortOrder - Sort order (asc or desc)
   */
  static async getTaskTree(
    projectId: number,
    sortBy?: string,
    sortOrder?: string
  ): Promise<HierarchicalTask[]> {
    // 兼容不同的响应格式：
    // 1) 标准包装 { success, data }
    // 2) axios 拦截器已解包，直接返回 data
    // 3) 某些情况下后端返回 { data: [...] }
    try {
      // Build query parameters
      const params: Record<string, string> = {};
      if (sortBy) params.sort_by = sortBy;
      if (sortOrder) params.sort_order = sortOrder;

      const response: any = await api.get(`/projects/${projectId}/tasks/tree`, { params });

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
            ? response.data
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
  static async getTaskChildren(projectId: number, taskId: number, params?: PaginationParams): Promise<PaginatedResponse<Task> | Task[]> {
    console.log(`[TaskService] getTaskChildren called for project ${projectId}, task ${taskId}`, params);
    
    try {
      const url = `/projects/${projectId}/tasks/${taskId}/children`;
      console.log(`[TaskService] Making API call to: ${url}`);
      
      const response: any = await api.get(url, { params });
      console.log(`[TaskService] Raw API response:`, response);
      
      // Handle wrapped APIResponse
      if (response && typeof response === 'object' && 'success' in response) {
        console.log(`[TaskService] Response has 'success' field:`, response.success);
        if (!response.success) {
          throw new Error(response?.error?.message || 'Failed to fetch task children');
        }
        const d = response.data;
        console.log(`[TaskService] Extracted data from wrapped response:`, d);
        
        if (d && typeof d === 'object' && Array.isArray(d.data) && d.pagination) {
          console.log(`[TaskService] Returning paginated response with ${d.data.length} children`);
          return d as PaginatedResponse<Task>;
        }
        const children = Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d)
            ? d
            : [];
        console.log(`[TaskService] Returning children array with ${children.length} items:`, children);
        return children as Task[];
      }

      // Axios-unwrapped (api.ts may unwrap to body or body.data)
      if (response && typeof response === 'object') {
        console.log(`[TaskService] Processing unwrapped response`);
        const body = (response as any).data ?? response;
        console.log(`[TaskService] Extracted body:`, body);
        
        if (body && typeof body === 'object') {
          if (Array.isArray(body.data) && body.pagination) {
            console.log(`[TaskService] Returning paginated body with ${body.data.length} children`);
            return body as PaginatedResponse<Task>;
          }
          const children = Array.isArray(body.data)
            ? body.data
            : Array.isArray(body)
              ? (body as any)
              : [];
          console.log(`[TaskService] Returning body children array with ${children.length} items:`, children);
          return children as Task[];
        }
      }
      
      console.log(`[TaskService] No valid response structure found, returning empty array`);
      // Fallback
      return [] as Task[];
    } catch (error: Error | unknown) {
      console.error(`[TaskService] getTaskChildren error for project ${projectId}, task ${taskId}:`, error);
      console.warn('Using fallback empty array for getTaskChildren due to API error');
      
      // Return empty array instead of throwing for graceful degradation
      return [];
    }
  }

  /**
   * Get update history for a task
   * Note: api interceptor auto-unwraps response, returns PaginatedResponse<TaskUpdate> directly
   */
  static async getTaskUpdates(
    projectId: number,
    taskId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<TaskUpdate>> {
    const result: PaginatedResponse<TaskUpdate> = await api.get(
      `/projects/${projectId}/tasks/${taskId}/updates`,
      { params }
    );

    return result;
  }

  /**
   * Get timeline events for a task
   */
  static async getTaskTimeline(
    projectId: number,
    taskId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<TimelineEvent>> {
    try {
      const response: any = await api.get(
        `/projects/${projectId}/tasks/${taskId}/timeline`,
        { params }
      );

      console.log(`[TaskService] getTaskTimeline raw response:`, response);

      // Helper to build default pagination
      const buildPagination = (total: number) => ({
        page: params?.page || 1,
        page_size: (params as any)?.page_size || 20,
        total,
        total_pages: Math.max(1, Math.ceil(total / ((params as any)?.page_size || 20))),
        has_next: false,
        has_prev: false,
      });

      // Case 1: Wrapped APIResponse { success, data }
      if (response && typeof response === 'object' && 'success' in response) {
        console.log(`[TaskService] getTaskTimeline case 1: wrapped response, success=${response.success}`);
        if (!response.success) {
          throw new Error(response?.error?.message || 'Failed to fetch task timeline');
        }
        const payload = response.data;
        console.log(`[TaskService] getTaskTimeline payload:`, payload);
        
        // 1A) payload is an array of events
        if (Array.isArray(payload)) {
          console.log(`[TaskService] getTaskTimeline case 1A: payload is array`);
          return { data: payload as TimelineEvent[], pagination: buildPagination(payload.length) };
        }
        // 1B) payload has { data: TimelineEvent[], pagination }
        if (payload && typeof payload === 'object' && Array.isArray(payload.data) && payload.pagination) {
          console.log(`[TaskService] getTaskTimeline case 1B: payload has data array and pagination`);
          return payload as PaginatedResponse<TimelineEvent>;
        }
        // 1C) payload has { events: TimelineEvent[], pagination? }
        if (payload && typeof payload === 'object' && Array.isArray(payload.events)) {
          console.log(`[TaskService] getTaskTimeline case 1C: payload has events array`);
          const pg = (payload as any).pagination || buildPagination((payload as any).events.length);
          return { data: (payload as any).events, pagination: pg } as PaginatedResponse<TimelineEvent>;
        }
      }

      // Case 2: Axios interceptor already unwrapped to payload
      console.log(`[TaskService] getTaskTimeline case 2: checking unwrapped response`);
      // 2A) Direct array of events
      if (Array.isArray(response)) {
        console.log(`[TaskService] getTaskTimeline case 2A: direct array`);
        return { data: response as TimelineEvent[], pagination: buildPagination((response as TimelineEvent[]).length) };
      }
      // 2B) PaginatedResponse shape { data: TimelineEvent[], pagination }
      // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
      if (response && typeof response === 'object' && Array.isArray((response as any).data) && (response as any).pagination) {
        console.log(`[TaskService] getTaskTimeline case 2B: unwrapped paginated response`);
        return response as unknown as PaginatedResponse<TimelineEvent>;
      }
      // 2C) Nested shape { data: { data: TimelineEvent[], pagination } }
      const nested = (response as any)?.data;
      if (nested && typeof nested === 'object' && Array.isArray(nested.data) && nested.pagination) {
        console.log(`[TaskService] getTaskTimeline case 2C: nested shape`);
        return nested as PaginatedResponse<TimelineEvent>;
      }
      // 2D) { events: TimelineEvent[], pagination? }
      if (response && typeof response === 'object' && Array.isArray((response as any).events)) {
        console.log(`[TaskService] getTaskTimeline case 2D: unwrapped events array`);
        const pg = (response as any).pagination || buildPagination(((response as any).events as TimelineEvent[]).length);
        return { data: (response as any).events, pagination: pg } as PaginatedResponse<TimelineEvent>;
      }

      console.warn('TaskService.getTaskTimeline: unexpected response shape', response);
      console.warn('Response type:', typeof response);
      console.warn('Response keys:', response ? Object.keys(response) : 'null');
      return { data: [], pagination: buildPagination(0) };
    } catch (error) {
      console.error('TaskService.getTaskTimeline error:', error);
      // Graceful degradation: return empty data instead of throwing
      const buildPagination = (total: number) => ({
        page: params?.page || 1,
        page_size: (params as any)?.page_size || 20,
        total,
        total_pages: Math.max(1, Math.ceil(total / ((params as any)?.page_size || 20))),
        has_next: false,
        has_prev: false,
      });
      return { data: [], pagination: buildPagination(0) };
    }
  }

  /**
   * Get project timeline (all tasks)
   */
  static async getProjectTimeline(
    projectId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<TimelineEvent>> {
    try {
      const response: any = await api.get(
        `/projects/${projectId}/timeline`,
        { params }
      );

      const buildPagination = (total: number) => ({
        page: params?.page || 1,
        page_size: (params as any)?.page_size || 20,
        total,
        total_pages: Math.max(1, Math.ceil(total / ((params as any)?.page_size || 20))),
        has_next: false,
        has_prev: false,
      });

      // Wrapped APIResponse
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error(response?.error?.message || 'Failed to fetch project timeline');
        }
        const payload = response.data;
        if (Array.isArray(payload)) {
          return { data: payload as TimelineEvent[], pagination: buildPagination(payload.length) };
        }
        if (payload && typeof payload === 'object' && Array.isArray(payload.data) && payload.pagination) {
          return payload as PaginatedResponse<TimelineEvent>;
        }
        if (payload && typeof payload === 'object' && Array.isArray(payload.events)) {
          const pg = (payload as any).pagination || buildPagination((payload as any).events.length);
          return { data: (payload as any).events, pagination: pg } as PaginatedResponse<TimelineEvent>;
        }
      }

      // Unwrapped cases
      if (Array.isArray(response)) {
        return { data: response as TimelineEvent[], pagination: buildPagination((response as TimelineEvent[]).length) };
      }
      // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
      if (response && typeof response === 'object' && Array.isArray((response as any).data) && (response as any).pagination) {
        return response as unknown as PaginatedResponse<TimelineEvent>;
      }
      const nested = (response as any)?.data;
      if (nested && typeof nested === 'object' && Array.isArray(nested.data) && nested.pagination) {
        return nested as PaginatedResponse<TimelineEvent>;
      }
      if (response && typeof response === 'object' && Array.isArray((response as any).events)) {
        const pg = (response as any).pagination || buildPagination(((response as any).events as TimelineEvent[]).length);
        return { data: (response as any).events, pagination: pg } as PaginatedResponse<TimelineEvent>;
      }

      console.warn('TaskService.getProjectTimeline: unexpected response shape', response);
      return { data: [], pagination: buildPagination(0) };
    } catch (error) {
      console.error('TaskService.getProjectTimeline error:', error);
      const buildPagination = (total: number) => ({
        page: params?.page || 1,
        page_size: (params as any)?.page_size || 20,
        total,
        total_pages: Math.max(1, Math.ceil(total / ((params as any)?.page_size || 20))),
        has_next: false,
        has_prev: false,
      });
      return { data: [], pagination: buildPagination(0) };
    }
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
      
      
      // 增强响应处理，适配不同的响应格式
      let responseData = response;
      
      // 如果response有data属性，说明被axios拦截器解包了，但可能还有嵌套
      if (response && typeof response === 'object' && 'data' in response) {
        responseData = (response as any).data;
      }
      
      // 检查多种可能的成功标识
      const isSuccess = 
        (response as any)?.success === true ||
        (responseData as any)?.success === true ||
        ((responseData as any)?.updated_count !== undefined) ||
        ((responseData as any)?.UpdatedCount !== undefined);
      
      if (!isSuccess) {
        throw new Error(responseData?.message || (response as any)?.error?.message || 'Failed to batch update tasks');
      }
      
      // 标准化返回格式，处理大小写不一致问题
      const result = {
        updated_count: (responseData as any)?.updated_count || (responseData as any)?.UpdatedCount || 0,
        failed_tasks: (responseData as any)?.failed_tasks || (responseData as any)?.FailedTasks || [],
        message: (responseData as any)?.message || 'Batch update completed successfully'
      };
      
      
      // Log successful batch operation
      const updateType = updates.status && updates.parent_id !== undefined ? 'batch_update_status_parent' : 
                        updates.status ? 'batch_update_status' : 'batch_update_parent';
      logTaskAction(updateType, taskIds.join(','), projectId);
      
      return result;
    } catch (error) {
      console.error('[DEBUG] batchUpdateTasks 错误', {
        error,
        errorMessage: (error as any)?.message,
        errorResponse: (error as any)?.response?.data,
        errorStatus: (error as any)?.response?.status,
        errorType: typeof error,
        errorName: (error as any)?.name,
        projectId,
        taskIds,
        updates
      });
      
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
  /**
   * Get batch update preview
   * Note: api interceptor auto-unwraps response, returns data directly
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

      // Note: api interceptor auto-unwraps response, returns data directly
      const result: {
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
      } = await api.post(
        `/projects/${projectId}/tasks/batch/preview`,
        requestData
      );

      return result;
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

// Export a default instance
export const taskService = new TaskService();