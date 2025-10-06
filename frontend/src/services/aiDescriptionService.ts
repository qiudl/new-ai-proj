import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

/**
 * AI描述生成选项
 */
export interface GenerateDescriptionOptions {
  mode: 'replace' | 'append' | 'suggest';
  style: 'brief' | 'detailed' | 'technical';
  length: 'short' | 'medium' | 'long';
  include_context: boolean;
  stream?: boolean;
  max_tokens?: number;
  custom_prompt?: string;
}

/**
 * 描述建议
 */
export interface DescriptionSuggestion {
  style: string;
  length: string;
  name: string;
  description: string;
}

/**
 * 生成结果
 */
export interface DescriptionGenerationResult {
  task_id: number;
  original_desc: string | null;
  generated_desc: string;
  suggestions?: DescriptionSuggestion[];
  mode: string;
  model: string;
  tokens_used?: number;
}

/**
 * 批量生成请求
 */
export interface BatchGenerateRequest {
  task_ids: number[];
  model: string;
  options: GenerateDescriptionOptions;
}

/**
 * 批量生成结果
 */
export interface BatchGenerateResult {
  total: number;
  success: number;
  failed: number;
  results: DescriptionGenerationResult[];
}

/**
 * AI描述生成服务
 */
class AIDescriptionService {
  /**
   * 为单个任务生成描述
   */
  async generateDescription(
    taskId: number,
    model: string = 'deepseek',
    options?: Partial<GenerateDescriptionOptions>
  ): Promise<DescriptionGenerationResult> {
    const defaultOptions: GenerateDescriptionOptions = {
      mode: 'replace',
      style: 'detailed',
      length: 'medium',
      include_context: true,
      max_tokens: 800,
    };

    const response = await axios.post(
      `${API_BASE_URL}/tasks/${taskId}/ai/generate-description`,
      {
        model,
        options: { ...defaultOptions, ...options },
      }
    );

    return response.data.data;
  }

  /**
   * 获取描述建议（多种风格）
   */
  async getDescriptionSuggestions(
    taskId: number,
    model: string = 'deepseek'
  ): Promise<DescriptionSuggestion[]> {
    const response = await axios.get(
      `${API_BASE_URL}/tasks/${taskId}/ai/description-suggestions`,
      {
        params: { model },
      }
    );

    return response.data.data.suggestions || [];
  }

  /**
   * 更新任务描述
   */
  async updateTaskDescription(
    taskId: number,
    description: string,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<void> {
    await axios.post(`${API_BASE_URL}/tasks/${taskId}/ai/update-description`, {
      description,
      mode,
    });
  }

  /**
   * 批量生成描述
   */
  async batchGenerateDescriptions(
    request: BatchGenerateRequest
  ): Promise<BatchGenerateResult> {
    const response = await axios.post(
      `${API_BASE_URL}/tasks/ai/batch-generate-descriptions`,
      request
    );

    return response.data.data;
  }

  /**
   * 流式生成描述（SSE）
   */
  async generateDescriptionStream(
    taskId: number,
    model: string,
    options: Partial<GenerateDescriptionOptions>,
    onChunk: (chunk: string) => void,
    onComplete: (result: DescriptionGenerationResult) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const defaultOptions: GenerateDescriptionOptions = {
      mode: 'replace',
      style: 'detailed',
      length: 'medium',
      include_context: true,
      stream: true,
      max_tokens: 800,
    };

    try {
      const eventSource = new EventSource(
        `${API_BASE_URL}/tasks/${taskId}/ai/generate-description-stream?` +
          new URLSearchParams({
            model,
            options: JSON.stringify({ ...defaultOptions, ...options }),
          })
      );

      eventSource.addEventListener('chunk', (event) => {
        const data = JSON.parse(event.data);
        onChunk(data.chunk);
      });

      eventSource.addEventListener('complete', (event) => {
        const result = JSON.parse(event.data);
        onComplete(result);
        eventSource.close();
      });

      eventSource.addEventListener('error', (event) => {
        onError(new Error('Stream error'));
        eventSource.close();
      });
    } catch (error) {
      onError(error as Error);
    }
  }
}

export default new AIDescriptionService();
