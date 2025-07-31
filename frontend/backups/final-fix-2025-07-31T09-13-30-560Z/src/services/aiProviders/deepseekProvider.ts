import { AIMessage, AIResponse, AIProviderConfig } from '../../types/ai';

/**
 * DeepSeek API集成服务
 */
export class DeepSeekProvider {
  private config: AIProviderConfig['deepseek'];

  constructor(config: AIProviderConfig['deepseek']) {
    this.config = config;
  }

  /**
   * 调用DeepSeek Chat Completion API
   */
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`},
        body: JSON.stringify({
          model: this.config.model,
          messages: messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false})});

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.error?.message || `请求失败: ${response.status}`,
            details: errorData}};
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_RESPONSE',
            message: 'API返回的响应为空'}};
      }

      return {
        success: true,
        data: {
          content: data.choices[0].message.content,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens} : undefined,
          model: data.model,
          provider: 'deepseek'}};
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `网络请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
          details: error}};
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
        return { success: true, message: 'DeepSeek连接测试成功！' };
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
          'Authorization': `Bearer ${this.config.apiKey}`}});

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`);
      }

      const data = await response.json();
      return data.data
        .filter((model: any) => model.id.includes('deepseek'))
        .map((model: any) => model.id)
        .sort();
    } catch (error) {
      console.error('获取DeepSeek模型列表失败:', error);
      // 返回默认模型列表
      return ['deepseek-chat', 'deepseek-coder'];
    }
  }

  /**
   * 估算token数量（简单估算）
   */
  estimateTokens(text: string): number {
    // DeepSeek对中文优化较好，中文token比例可能更优
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    // DeepSeek中文token效率更高
    return Math.ceil(chineseChars / 3 + otherChars / 4);
  }

  /**
   * 计算预估成本（人民币）
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    // DeepSeek定价（人民币，2024年）
    const inputCostPer1K = 0.001;   // ¥0.001 per 1K input tokens
    const outputCostPer1K = 0.002;  // ¥0.002 per 1K output tokens
    
    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;
    
    return inputCost + outputCost;
  }

  /**
   * 支持的特殊功能
   */
  getFeatures(): string[] {
    return [
      '中文优化',
      '代码生成',
      '数学推理',
      '长文本处理',
      '高性价比',
    ];
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelName: string): { description: string; context: number; features: string[] } {
    const modelInfoMap: Record<string, any> = {
      'deepseek-chat': {
        description: 'DeepSeek通用对话模型，适合各种对话和文本生成任务',
        context: 32768,
        features: ['通用对话', '中文优化', '推理能力']},
      'deepseek-coder': {
        description: 'DeepSeek代码专用模型，在代码生成和理解方面表现出色',
        context: 16384,
        features: ['代码生成', '代码解释', '调试协助']}};

    return modelInfoMap[modelName] || {
      description: '未知模型',
      context: 4096,
      features: []};
  }
}