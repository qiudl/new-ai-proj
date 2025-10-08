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
  custom_prompt?: string;  // 🆕 用户自定义提示词
  context: {
    include_description?: boolean;
    include_siblings?: boolean;
    max_subtasks?: number;
  };
}

/**
 * 提示词选项
 */
export interface PromptOptions {
  useCustom: boolean;
  customPrompt?: string;
  useRecommendation?: boolean;
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
 * 验证自定义提示词
 * @param prompt 提示词内容
 * @returns 验证结果
 */
export function validateCustomPrompt(prompt: string): {
  valid: boolean;
  error?: string;
  warning?: string;
} {
  if (!prompt || !prompt.trim()) {
    return { valid: false, error: '提示词不能为空' };
  }

  const trimmedPrompt = prompt.trim();

  if (trimmedPrompt.length < 10) {
    return { valid: false, error: '提示词至少需要10个字符' };
  }

  if (trimmedPrompt.length > 2000) {
    return { valid: false, error: '提示词不能超过2000字符' };
  }

  // 检查是否包含基本的任务相关关键词
  const keywords = ['任务', '子任务', '分解', '拆分', 'task', 'subtask', '步骤'];
  const hasKeyword = keywords.some(kw =>
    trimmedPrompt.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasKeyword) {
    return {
      valid: true,
      warning: '提示词中建议包含任务相关关键词（如：任务、子任务、分解等）'
    };
  }

  return { valid: true };
}

/**
 * 构建完整的生成请求
 * @param model AI模型
 * @param customPrompt 自定义提示词（可选）
 * @param options 其他选项
 */
export function buildGenerateRequest(
  model: string,
  customPrompt?: string,
  options?: {
    includeDescription?: boolean;
    includeSiblings?: boolean;
    maxSubtasks?: number;
  }
): GenerateSubtasksRequest {
  const request: GenerateSubtasksRequest = {
    model,
    context: {
      include_description: options?.includeDescription ?? true,
      include_siblings: options?.includeSiblings ?? false,
      max_subtasks: options?.maxSubtasks ?? 10
    }
  };

  if (customPrompt && customPrompt.trim()) {
    request.custom_prompt = customPrompt.trim();
  }

  return request;
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
      // 🆕 构建请求体
      const requestBody: any = {
        model: request.model,
        context: request.context
      };

      // 🆕 如果提供了自定义提示词，添加到请求体
      if (request.custom_prompt && request.custom_prompt.trim()) {
        requestBody.custom_prompt = request.custom_prompt.trim();
        console.log('使用自定义提示词:', requestBody.custom_prompt.substring(0, 50) + '...');
      } else {
        console.log('使用系统默认提示词');
      }

      // 发送请求
      const response = await api.post<GenerateSubtasksResponse>(
        `/tasks/${taskId}/ai-generate-subtasks`,
        requestBody
      );

      // response已经是解包后的数据，直接返回
      return response as unknown as GenerateSubtasksResponse;
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
      // 后端直接返回 BatchCreateSubtasksResponse（包含success字段，但不包装在{success, data}中）
      // 拦截器不会解包这种格式，所以response.data就是BatchCreateSubtasksResponse
      const response = await api.post<BatchCreateSubtasksResponse>(
        `/tasks/batch-create-subtasks`,
        request
      );

      // response本身已经是解包后的数据（拦截器处理）
      const result = response as unknown as BatchCreateSubtasksResponse;

      if (!result.success) {
        throw new Error(result.message || '批量创建失败');
      }

      return result;
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
