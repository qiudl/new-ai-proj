import { AIMessage, AIResponse, AIProviderConfig } from '../../types/ai';

/**
 * OpenAI API集成服务
 */
export class OpenAIProvider {
  private config: AIProviderConfig['openai'];

  constructor(config: AIProviderConfig['openai']) {
    this.config = config;
  }

  /**
   * 调用OpenAI Chat Completion API
   */
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.error?.message || `请求失败: ${response.status}`,
            details: errorData,
          },
        };
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_RESPONSE',
            message: 'API返回的响应为空',
          },
        };
      }

      return {
        success: true,
        data: {
          content: data.choices[0].message.content,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          } : undefined,
          model: data.model,
          provider: 'openai',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `网络请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
          details: error,
        },
      };
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const testMessages: AIMessage[] = [
        { role: 'user', content: '你好，这是一个连接测试。请简单回复"连接成功"。' }
      ];

      const response = await this.chat(testMessages);
      
      if (response.success) {
        return { success: true, message: 'OpenAI连接测试成功！' };
      } else {
        return { success: false, message: response.error?.message || '连接测试失败' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`);
      }

      const data = await response.json();
      return data.data
        .filter((model: unknown) => (model as any).id.includes('gpt'))
        .map((model: unknown) => (model as any).id)
        .sort();
    } catch (error) {
      console.error('获取OpenAI模型列表失败:', error);
      // 返回默认模型列表
      return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o'];
    }
  }

  /**
   * 估算token数量（简单估算）
   */
  estimateTokens(text: string): number {
    // 简单的token估算：中文约2-3字符一个token，英文约4字符一个token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 2.5 + otherChars / 4);
  }

  /**
   * 计算预估成本（美元）
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    // OpenAI GPT-3.5-turbo定价（截至2024年）
    const inputCostPer1K = 0.0015;  // $0.0015 per 1K input tokens
    const outputCostPer1K = 0.002;  // $0.002 per 1K output tokens
    
    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;
    
    return inputCost + outputCost;
  }
}