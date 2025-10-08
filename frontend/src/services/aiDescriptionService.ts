import api from './api';

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

    // api interceptor已经解包了响应，直接返回data内容
    return await api.post(
      `/tasks/${taskId}/ai/generate-description`,
      {
        model,
        options: { ...defaultOptions, ...options },
      }
    );
  }

  /**
   * 获取描述建议（多种风格）
   */
  async getDescriptionSuggestions(
    taskId: number,
    model: string = 'deepseek'
  ): Promise<DescriptionSuggestion[]> {
    // api interceptor已经解包了响应，直接返回data内容
    const data = await api.get(
      `/tasks/${taskId}/ai/description-suggestions`,
      {
        params: { model },
      }
    );

    return data.suggestions || [];
  }

  /**
   * 更新任务描述
   */
  async updateTaskDescription(
    taskId: number,
    description: string,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<void> {
    await api.post(`/tasks/${taskId}/ai/update-description`, {
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
    // api interceptor已经解包了响应，直接返回data内容
    return await api.post(
      `/tasks/ai/batch-generate-descriptions`,
      request
    );
  }

  /**
   * 流式生成描述（SSE） - 使用fetch API支持认证
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
      // 使用fetch而不是EventSource以支持Authorization header
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        model,
        options: JSON.stringify({ ...defaultOptions, ...options }),
      });

      const response = await fetch(
        `${api.defaults.baseURL}/tasks/${taskId}/ai/generate-description-stream?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.event === 'chunk') {
                onChunk(parsed.chunk);
              } else if (parsed.event === 'complete') {
                onComplete(parsed);
              } else if (parsed.event === 'error') {
                onError(new Error(parsed.error || 'Stream error'));
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      onError(error as Error);
    }
  }
}

export default new AIDescriptionService();
