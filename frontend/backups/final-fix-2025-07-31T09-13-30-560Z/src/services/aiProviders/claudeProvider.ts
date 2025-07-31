import { AIMessage, AIResponse, AIProviderConfig } from '../../types/ai';

/**
 * Anthropic Claude API集成服务
 */
export class ClaudeProvider {
  private config: AIProviderConfig['claude'];

  constructor(config: AIProviderConfig['claude']) {
    this.config = config;
  }

  /**
   * 调用Claude Messages API
   */
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      // 将消息格式转换为Claude API格式
      const claudeMessages = this.formatMessagesForClaude(messages);
      
      const response = await fetch(`${this.config.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'anthropic-version': '2023-06-01'},
        body: JSON.stringify({
          model: this.config.model,
          messages: claudeMessages.messages,
          system: claudeMessages.system,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens})});

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
      
      if (!data.content || data.content.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_RESPONSE',
            message: 'API返回的响应为空'}};
      }

      return {
        success: true,
        data: {
          content: data.content[0].text,
          usage: data.usage ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens} : undefined,
          model: data.model,
          provider: 'claude'}};
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
        return { success: true, message: 'Claude连接测试成功！' };
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
    // Claude API目前不提供模型列表接口，返回已知的模型
    return [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }

  /**
   * 将通用消息格式转换为Claude格式
   */
  private formatMessagesForClaude(messages: AIMessage[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    return {
      system: systemMessages.length > 0 ? systemMessages.map(m => m.content).join('\n') : undefined,
      messages: conversationMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content}))};
  }

  /**
   * 估算token数量（简单估算）
   */
  estimateTokens(text: string): number {
    // Claude的token计算类似于OpenAI，但可能有些差异
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 2.5 + otherChars / 4);
  }

  /**
   * 计算预估成本（美元）
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    // Claude定价因模型而异
    let inputCostPer1K = 0.00025;  // Haiku定价
    let outputCostPer1K = 0.00125;
    
    if (this.config.model.includes('sonnet')) {
      inputCostPer1K = 0.003;
      outputCostPer1K = 0.015;
    } else if (this.config.model.includes('opus')) {
      inputCostPer1K = 0.015;
      outputCostPer1K = 0.075;
    }
    
    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;
    
    return inputCost + outputCost;
  }
}