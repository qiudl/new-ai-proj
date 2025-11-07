import api from './api';
import {
  BatchOperationRequest,
  BatchOperationResponse,
  BatchValidationResult,
  BatchOperationPreview,
  BatchStatusUpdateRequest,
  BatchParentChangeRequest,
  BatchAssigneeChangeRequest,
  BatchPriorityChangeRequest,
  BatchDueDateChangeRequest,
  BatchArchiveRequest,
  BatchDeleteRequest,
  BatchMoveRequest,
  BatchTagsUpdateRequest,
  BatchCustomFieldsUpdateRequest,
  BatchOperationHistoryItem,
} from '../types/batchOperations';

export class BatchOperationService {
  private baseUrl = '/api/v1';

  // 通用批量操作接口

  /**
   * 验证批量操作
   */
  async validateBatchOperation(request: BatchOperationRequest): Promise<BatchValidationResult> {
    const response = await api.post<BatchValidationResult>(`${this.baseUrl}/batch/validate`, request);
    return response.data;
  }

  /**
   * 执行批量操作
   */
  async executeBatchOperation(request: BatchOperationRequest): Promise<BatchOperationResponse> {
    const response = await api.post<BatchOperationResponse>(`${this.baseUrl}/batch/execute`, request);
    return response.data;
  }

  /**
   * 获取批量操作状态
   */
  async getBatchOperationStatus(operationId: string): Promise<BatchOperationResponse> {
    const response = await api.get<BatchOperationResponse>(`${this.baseUrl}/batch/status/${operationId}`);
    return response.data;
  }

  /**
   * 预览批量操作
   */
  async previewBatchOperation(request: BatchOperationRequest): Promise<BatchOperationPreview> {
    const response = await api.post<BatchOperationPreview>(`${this.baseUrl}/batch/preview`, request);
    return response.data;
  }

  // 具体的批量操作方法

  /**
   * 批量更新任务状态
   */
  async batchStatusUpdate(request: BatchStatusUpdateRequest): Promise<BatchOperationResponse> {
    const response = await api.post<BatchOperationResponse>(
      `${this.baseUrl}/batch/operations/status-update`, 
      request
    );
    return response.data;
  }

  /**
   * 批量更改父任务
   */
  async batchParentChange(request: BatchParentChangeRequest): Promise<BatchOperationResponse> {
    const response = await api.post<BatchOperationResponse>(
      `${this.baseUrl}/batch/operations/parent-change`, 
      request
    );
    return response.data;
  }

  /**
   * 批量更改负责人
   */
  async batchAssigneeChange(request: BatchAssigneeChangeRequest): Promise<BatchOperationResponse> {
    const response = await api.post<BatchOperationResponse>(
      `${this.baseUrl}/batch/operations/assignee-change`, 
      request
    );
    return response.data;
  }

  /**
   * 批量更改优先级
   */
  async batchPriorityChange(request: BatchPriorityChangeRequest): Promise<BatchOperationResponse> {
    // 转换为通用批量操作请求
    const batchRequest: BatchOperationRequest = {
      operation_type: 'priority_change',
      task_ids: request.task_ids,
      parameters: {
        new_priority: request.new_priority,
      },
      requested_by: 1, // TODO: 从认证上下文获取
    };
    
    return this.executeBatchOperation(batchRequest);
  }

  /**
   * 批量更改截止日期
   */
  async batchDueDateChange(request: BatchDueDateChangeRequest): Promise<BatchOperationResponse> {
    const batchRequest: BatchOperationRequest = {
      operation_type: 'due_date_change',
      task_ids: request.task_ids,
      parameters: {
        new_due_date: request.new_due_date,
        offset_days: request.offset_days,
      },
      requested_by: 1, // TODO: 从认证上下文获取
    };
    
    return this.executeBatchOperation(batchRequest);
  }

  /**
   * 批量归档任务
   */
  async batchArchive(request: BatchArchiveRequest): Promise<BatchOperationResponse> {
    const response = await api.post<BatchOperationResponse>(
      `${this.baseUrl}/batch/operations/archive`, 
      request
    );
    return response.data;
  }

  /**
   * 批量删除任务
   */
  async batchDelete(request: BatchDeleteRequest): Promise<BatchOperationResponse> {
    const response = await api.post<BatchOperationResponse>(
      `${this.baseUrl}/batch/operations/delete`, 
      request
    );
    return response.data;
  }

  /**
   * 批量移动任务
   */
  async batchMove(request: BatchMoveRequest): Promise<BatchOperationResponse> {
    const batchRequest: BatchOperationRequest = {
      operation_type: 'move',
      task_ids: request.task_ids,
      parameters: {
        target_project_id: request.target_project_id,
        target_parent_id: request.target_parent_id,
        move_children: request.move_children,
        update_references: request.update_references,
      },
      requested_by: 1, // TODO: 从认证上下文获取
    };
    
    return this.executeBatchOperation(batchRequest);
  }

  /**
   * 批量更新标签
   */
  async batchTagsUpdate(request: BatchTagsUpdateRequest): Promise<BatchOperationResponse> {
    const operationType = request.operation === 'add' ? 'tags_add' : 
                         request.operation === 'remove' ? 'tags_remove' : 'tags_add';

    const batchRequest: BatchOperationRequest = {
      operation_type: operationType,
      task_ids: request.task_ids,
      parameters: {
        operation: request.operation,
        tags: request.tags,
      },
      requested_by: 1, // TODO: 从认证上下文获取
    };
    
    return this.executeBatchOperation(batchRequest);
  }

  /**
   * 批量更新自定义字段
   */
  async batchCustomFieldsUpdate(request: BatchCustomFieldsUpdateRequest): Promise<BatchOperationResponse> {
    const batchRequest: BatchOperationRequest = {
      operation_type: 'custom_fields_update',
      task_ids: request.task_ids,
      parameters: {
        operation: request.operation,
        custom_fields: request.custom_fields,
      },
      requested_by: 1, // TODO: 从认证上下文获取
    };
    
    return this.executeBatchOperation(batchRequest);
  }

  // 兼容性方法 (与现有bulk handler兼容)

  /**
   * 批量导入任务 (兼容现有接口)
   */
  async bulkImportTasks(data: any): Promise<any> {
    const response = await api.post(`${this.baseUrl}/batch/tasks/import`, data);
    return response.data;
  }

  /**
   * 从CSV批量导入任务
   */
  async importTasksFromCSV(formData: FormData): Promise<any> {
    const response = await api.post(`${this.baseUrl}/batch/tasks/csv-import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * 批量验证任务预览 (兼容现有接口)
   */
  async batchValidateTasksPreview(data: any): Promise<any> {
    const response = await api.post(`${this.baseUrl}/batch/tasks/validate-preview`, data);
    return response.data;
  }

  /**
   * 批量更新任务状态 (兼容现有接口)
   */
  async bulkUpdateTaskStatus(data: any): Promise<any> {
    const response = await api.post(`${this.baseUrl}/batch/tasks/status-update`, data);
    return response.data;
  }

  /**
   * 批量更新任务 (兼容现有接口)
   */
  async bulkUpdateTasks(data: any): Promise<any> {
    const response = await api.post(`${this.baseUrl}/batch/tasks/update`, data);
    return response.data;
  }

  /**
   * 批量删除任务 (兼容现有接口)
   */
  async bulkDeleteTasks(data: any): Promise<any> {
    const response = await api.delete(`${this.baseUrl}/batch/tasks/delete`, { data });
    return response.data;
  }

  // 历史记录和监控

  /**
   * 获取批量操作历史记录
   */
  async getBatchOperationHistory(params?: {
    page?: number;
    pageSize?: number;
    operationType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    items: BatchOperationHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const response = await api.get(`${this.baseUrl}/batch/history`, { params });
    return response.data;
  }

  /**
   * 取消批量操作
   */
  async cancelBatchOperation(operationId: string): Promise<void> {
    await api.post(`${this.baseUrl}/batch/${operationId}/cancel`);
  }

  // 实用工具方法

  /**
   * 轮询批量操作状态直到完成
   */
  async pollBatchOperationStatus(
    operationId: string,
    onProgress?: (response: BatchOperationResponse) => void,
    pollInterval: number = 1000,
    maxAttempts: number = 300
  ): Promise<BatchOperationResponse> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await this.getBatchOperationStatus(operationId);
        
        if (onProgress) {
          onProgress(response);
        }

        // 检查是否已完成
        if (response.status === 'completed' ||
            response.status === 'failed' ||
            response.status === 'cancelled' ||
            response.status === 'partial') {
          // ✅ FIXED - getBatchOperationStatus已经返回unwrapped data，无需再访问.data
          return response;
        }

        // 等待下次轮询
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
      } catch (error) {
        console.error('Error polling batch operation status:', error);
        attempts++;
        
        // 如果轮询失败次数过多，抛出错误
        if (attempts >= 5) {
          throw error;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`Batch operation polling timeout after ${maxAttempts} attempts`);
  }

  /**
   * 估算批量操作时间
   */
  estimateBatchOperationTime(taskCount: number, operationType: string): number {
    // 基础时间估算 (毫秒)
    const baseTimePerTask = {
      'status_update': 50,
      'parent_change': 100,
      'assignee_change': 75,
      'priority_change': 50,
      'due_date_change': 60,
      'archive': 80,
      'restore': 80,
      'delete': 120,
      'move': 150,
      'duplicate': 200,
      'tags_add': 60,
      'tags_remove': 60,
      'custom_fields_update': 100,
    };

    const timePerTask = baseTimePerTask[operationType as keyof typeof baseTimePerTask] || 100;
    const totalTime = taskCount * timePerTask;
    
    // 添加固定开销
    const overhead = 500; // 500ms 固定开销
    
    return totalTime + overhead;
  }

  /**
   * 验证任务选择
   */
  validateTaskSelection(taskIds: number[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!taskIds || taskIds.length === 0) {
      errors.push('请选择至少一个任务');
    }

    if (taskIds.length > 1000) {
      errors.push('单次操作最多支持1000个任务');
    }

    if (taskIds.length > 100) {
      warnings.push(`选择了${taskIds.length}个任务，操作可能需要较长时间`);
    }

    // 检查重复的任务ID
    const uniqueIds = new Set(taskIds);
    if (uniqueIds.size !== taskIds.length) {
      warnings.push('检测到重复的任务ID，将自动去重');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// 创建单例实例
export const batchOperationService = new BatchOperationService();