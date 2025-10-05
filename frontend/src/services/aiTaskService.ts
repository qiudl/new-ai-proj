import axios from 'axios';
import api from './api'; // 使用配置好认证拦截器的api实例
import type { SubtaskPreview } from '../components/TaskDetail/SubtaskPreviewModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1';

/**
 * AI模型信息
 */
export interface AIModel {
  key: string;
  label: string;
  provider?: string;
  modelName?: string;
}

/**
 * AI生成子任务请求参数
 */
export interface GenerateSubtasksRequest {
  model: string;
  context: {
    include_description?: boolean;
    include_siblings?: boolean;
    max_subtasks?: number;
  };
}

/**
 * AI生成子任务响应
 */
export interface GenerateSubtasksResponse {
  parent_task: {
    id: number;
    title: string;
    description?: string;
  };
  model_used: string;
  subtasks: SubtaskPreview[];
  statistics: {
    total_count: number;
    total_estimated_hours: number;
    priority_distribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
  generated_at: string;
}

/**
 * 批量创建子任务请求参数
 */
export interface BatchCreateSubtasksRequest {
  parent_id: number;
  subtasks: Array<{
    title: string;
    description: string;
    estimated_hours: number;
    priority: 'low' | 'medium' | 'high';
    tags?: string[];
  }>;
}

/**
 * 批量创建子任务响应
 */
export interface BatchCreateSubtasksResponse {
  success: boolean;
  created_count: number;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
  }>;
  message?: string;
}

/**
 * AI任务服务类
 */
class AITaskService {
  /**
   * 使用AI生成子任务预览
   * @param taskId 父任务ID
   * @param request 生成请求参数
   * @returns 生成的子任务预览列表
   */
  async generateSubtasks(
    taskId: number,
    request: GenerateSubtasksRequest
  ): Promise<GenerateSubtasksResponse> {
    try {
      const response = await api.post<{ success: boolean; data: GenerateSubtasksResponse }>(
        `/tasks/${taskId}/ai-generate-subtasks`,
        request
      );

      if (!response.data.success) {
        throw new Error('AI生成失败');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`AI生成子任务失败: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * 批量创建子任务
   * @param request 批量创建请求参数
   * @returns 创建结果
   */
  async batchCreateSubtasks(
    request: BatchCreateSubtasksRequest
  ): Promise<BatchCreateSubtasksResponse> {
    try {
      const response = await api.post<BatchCreateSubtasksResponse>(
        `/tasks/batch-create-subtasks`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || '批量创建失败');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`批量创建子任务失败: ${errorMessage}`);
      }
      throw error;
    }
  }
}

// 导出单例
export const aiTaskService = new AITaskService();

export default aiTaskService;
