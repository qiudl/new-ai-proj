import { AIProvider } from '../types/ai';
import {
  AITaskGenerationRequest,
  AITaskGenerationResponse,
  GeneratedSubTask,
  AIResponseParseResult,
  TaskQualityAssessment,
  AIServiceStatus,
  AITaskGenerationErrorCode,
  AI_TASK_GENERATION_CONSTANTS,
  TaskGenerationHistory
} from '../types/aiTaskGenerator';
import aiConfigDatabaseService, { AIConfigResponse } from './aiConfigDatabaseService';
import { DeepSeekProvider } from './aiProviders/deepseekProvider';
import { PromptSelector, PromptValidator } from './aiTaskPrompts';

/**
 * AI任务生成器服务
 * 基于现有AI配置系统，提供智能任务分解功能
 */
class AITaskGeneratorService {
  private providerInstances: Map<AIProvider, any> = new Map();
  private serviceStatus: Map<AIProvider, AIServiceStatus> = new Map();
  private generationCache: Map<string, AITaskGenerationResponse> = new Map();

  constructor() {
    this.initializeService();
  }

  /**
   * 解析AI配置数据为数组格式
   */
  private parseConfigData(data: Record<string, unknown> | AIConfigResponse[]): any[] {
    if (Array.isArray(data)) {
      return data;
    } else if (typeof data === 'object' && data !== null) {
      // 如果是对象，检查是否有 data 或 configs 属性
      if (Array.isArray(data.data)) {
        return data.data;
      } else if (Array.isArray(data.configs)) {
        return data.configs;
      } else {
        // 尝试将对象的值转换为数组
        const values = Object.values(data);
        if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null)) {
          return values;
        }
      }
    }
    return [];
  }

  /**
   * 系统健康检查
   */
  async checkSystemHealth(): Promise<boolean> {
    try {
      const response = await fetch('/health');
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * 生成任务
   */
  async generateTasks(request: AITaskGenerationRequest): Promise<AITaskGenerationResponse> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      return data.success ? data.data : data;
    } catch (error: Error | unknown) {
      console.error('Generate tasks failed:', error);
      throw new Error((error as any).message || '任务生成失败');
    }
  }

  /**
   * 验证任务
   */
  async validateTasks(request: unknown): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      return data.success ? data.data : data;
    } catch (error: Error | unknown) {
      console.error('Validate tasks failed:', error);
      throw new Error((error as any).message || '任务验证失败');
    }
  }

  /**
   * 优化任务
   */
  async optimizeTasks(request: unknown): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      return data.success ? data.data : data;
    } catch (error: Error | unknown) {
      console.error('Optimize tasks failed:', error);
      throw new Error((error as any).message || '任务优化失败');
    }
  }

  /**
   * 获取模板列表
   */
  async getTemplates(params?: string): Promise<any> {
    try {
      const url = params 
        ? `/api/v1/system/ai-tasks/templates?${params}`
        : '/api/v1/system/ai-tasks/templates';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Get templates failed:', error);
      throw new Error((error as any).message || '获取模板失败');
    }
  }

  /**
   * 创建模板
   */
  async createTemplate(templateData: unknown): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(templateData)
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Create template failed:', error);
      throw new Error((error as any).message || '创建模板失败');
    }
  }

  /**
   * 更新模板
   */
  async updateTemplate(templateId: number, templateData: unknown): Promise<any> {
    try {
      const response = await fetch(`/api/v1/system/ai-tasks/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(templateData)
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Update template failed:', error);
      throw new Error((error as any).message || '更新模板失败');
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId: number): Promise<any> {
    try {
      const response = await fetch(`/api/v1/system/ai-tasks/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Delete template failed:', error);
      throw new Error((error as any).message || '删除模板失败');
    }
  }

  /**
   * 基于模板生成任务
   */
  async generateFromTemplate(request: unknown): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Generate from template failed:', error);
      throw new Error((error as any).message || '基于模板生成任务失败');
    }
  }

  /**
   * 批量优化任务
   */
  async batchOptimizeTasks(request: unknown): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/batch/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Batch optimize failed:', error);
      throw new Error((error as any).message || '批量优化失败');
    }
  }

  /**
   * 获取成本摘要
   */
  async getCostSummary(params?: string): Promise<any> {
    try {
      const url = params 
        ? `/api/v1/system/ai-tasks/cost/summary?${params}`
        : '/api/v1/system/ai-tasks/cost/summary';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Get cost summary failed:', error);
      throw new Error((error as any).message || '获取成本摘要失败');
    }
  }

  /**
   * 获取预算状态
   */
  async getBudgetStatus(params?: string): Promise<any> {
    try {
      const url = params 
        ? `/api/v1/system/ai-tasks/budget/status?${params}`
        : '/api/v1/system/ai-tasks/budget/status';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Get budget status failed:', error);
      throw new Error((error as any).message || '获取预算状态失败');
    }
  }

  /**
   * 设置预算限制
   */
  async setBudgetLimit(budgetData: unknown): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/budget/limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(budgetData)
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Set budget limit failed:', error);
      throw new Error((error as any).message || '设置预算限制失败');
    }
  }

  /**
   * 获取预算警告
   */
  async getBudgetAlerts(): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/budget/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Get budget alerts failed:', error);
      throw new Error((error as any).message || '获取预算警告失败');
    }
  }


  /**
   * 获取使用统计
   */
  async getUsageStats(request?: any): Promise<any> {
    try {
      const response = await fetch('/api/v1/system/ai-tasks/usage/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(request || {})
      });

      const data = await response.json();
      return data;
    } catch (error: Error | unknown) {
      console.error('Get usage stats failed:', error);
      throw new Error((error as any).message || '获取使用统计失败');
    }
  }

  /**
   * 初始化服务
   */
  private async initializeService(): Promise<void> {
    try {
      await this.refreshProviderStatus();
    } catch (error) {
      console.warn('AI任务生成服务初始化警告:', error);
    }
  }

  /**
   * 获取可用的AI提供商
   */
  async getAvailableProviders(): Promise<AIProvider[]> {
    try {
      const configs = await aiConfigDatabaseService.getConfigs();
      
      if (!configs.success || !configs.data) {
        console.warn('AI配置获取失败或数据为空:', configs);
        return [];
      }

      // 打印实际的数据结构以便调试
      // 解析配置数据
      const configArray = this.parseConfigData(configs.data);
      
      if (configArray.length === 0) {
        console.error('AI配置数据格式错误，无法解析为配置数组:', configs.data);
        return [];
      }

      return configArray
        .filter(config => config && config.enabled && config.apiKeyMasked)
        .map(config => config.provider);
    } catch (error) {
      console.error('获取可用AI提供商失败:', error);
      return [];
    }
  }

  /**
   * 刷新提供商状态
   */
  async refreshProviderStatus(): Promise<void> {
    const availableProviders = await this.getAvailableProviders();
    
    for (const provider of availableProviders) {
      try {
        const startTime = Date.now();
        const configs = await aiConfigDatabaseService.getConfigs();
        const configArray = configs.success && configs.data ? 
          this.parseConfigData(configs.data) : [];
        const config = configArray.find(c => c.provider === provider) || null;

        if (config) {
          const providerInstance = this.createProviderInstance(provider, config);
          this.providerInstances.set(provider, providerInstance);
          
          const responseTime = Date.now() - startTime;
          this.serviceStatus.set(provider, {
            provider,
            available: true,
            lastCheck: new Date(),
            responseTime,
            model: config.model
          });
        }
      } catch (error) {
        this.serviceStatus.set(provider, {
          provider,
          available: false,
          lastCheck: new Date(),
          errorMessage: error instanceof Error ? error.message : '状态检查失败',
          model: 'unknown'
        });
      }
    }
  }

  /**
   * 选择最佳AI提供商
   */
  async selectBestProvider(preferredProvider?: AIProvider): Promise<{
    provider: AIProvider;
    config: unknown;
    instance: React.FormEvent | React.ChangeEvent<HTMLInputElement>;
  }> {
    // 如果指定了偏好提供商，优先使用
    if (preferredProvider) {
      const status = this.serviceStatus.get(preferredProvider);
      if (status?.available) {
        const configs = await aiConfigDatabaseService.getConfigs();
        const configArray = configs.data ? this.parseConfigData(configs.data) : [];
        const config = configArray.find(c => c.provider === preferredProvider) || null;
        if (config) {
          return {
            provider: preferredProvider,
            config,
            instance: this.providerInstances.get(preferredProvider)
          };
        }
      }
    }

    // 自动选择最佳提供商
    // 优先级：DeepSeek（性价比） > Claude（分析能力） > OpenAI（通用性）
    const priorityOrder: AIProvider[] = ['deepseek', 'claude', 'openai'];
    
    for (const provider of priorityOrder) {
      const status = this.serviceStatus.get(provider);
      if (status?.available) {
        const configs = await aiConfigDatabaseService.getConfigs();
        const configArray = configs.data ? this.parseConfigData(configs.data) : [];
        const config = configArray.find(c => c.provider === provider) || null;
        if (config) {
          return {
            provider,
            config,
            instance: this.providerInstances.get(provider)
          };
        }
      }
    }

    throw new Error(AITaskGenerationErrorCode.NO_AVAILABLE_PROVIDER);
  }

  /**
   * 创建AI提供商实例
   */
  private createProviderInstance(provider: AIProvider, config: unknown): unknown {
    const providerConfig = {
      apiKey: (config as any).apiKey || 'placeholder', // 实际使用时会从数据库获取
      baseURL: (config as any).baseURL,
      model: (config as any).model,
      temperature: (config as any).temperature,
      maxTokens: (config as any).maxTokens
    };

    switch (provider) {
      case 'deepseek':
        return new DeepSeekProvider(providerConfig);
      case 'claude':
        // TODO: 实现ClaudeProvider
        throw new Error('Claude provider not implemented yet');
      case 'openai':
        // TODO: 实现OpenAIProvider  
        throw new Error('OpenAI provider not implemented yet');
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }

  /**
   * 生成子任务
   */
  async generateSubTasks(request: AITaskGenerationRequest): Promise<AITaskGenerationResponse> {
    const startTime = Date.now();
    
    try {
      // 输入验证
      const validation = PromptValidator.validateRequest(
        request.parentTaskTitle,
        request.keywords
      );
      
      if (!validation.valid) {
        const response: AITaskGenerationResponse = {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.INVALID_REQUEST,
            message: `请求验证失败: ${validation.issues.join(', ')}`
          }
        };

        // 保存失败的历史记录
        this.saveGenerationHistory(request, response, Date.now() - startTime);
        return response;
      }

      // 检查缓存
      const cacheKey = this.generateCacheKey(request);
      const cached = this.generationCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // 选择AI提供商
      const { provider, config, instance } = await this.selectBestProvider(
        request.preferredProvider
      );

      // 构建prompt
      const systemPrompt = PromptSelector.getSystemPrompt(
        provider as any,
        request.complexity || 'detailed'
      );
      
      const userPrompt = PromptSelector.getUserPrompt(
        provider as any,
        request.parentTaskTitle,
        request.keywords,
        request.complexity || 'detailed'
      );

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];

      // 调用AI API
      const aiResponse = await (instance as any).chat(messages);
      
      if (!aiResponse.success) {
        const response: AITaskGenerationResponse = {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.AI_API_ERROR,
            message: aiResponse.error?.message || 'AI API调用失败'
          }
        };

        // 保存失败的历史记录
        this.saveGenerationHistory(request, response, Date.now() - startTime);
        return response;
      }

      // 解析AI响应
      const parseResult = this.parseAIResponse(aiResponse.data.content);
      
      if (!parseResult.success) {
        const response: AITaskGenerationResponse = {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.PARSE_ERROR,
            message: '解析AI响应失败'
          }
        };

        // 保存失败的历史记录
        this.saveGenerationHistory(request, response, Date.now() - startTime);
        return response;
      }

      // 质量评估
      const quality = this.evaluateTaskQuality(parseResult.tasks);
      
      if (quality.overallScore < AI_TASK_GENERATION_CONSTANTS.MIN_QUALITY_THRESHOLD) {
        const response: AITaskGenerationResponse = {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.QUALITY_TOO_LOW,
            message: `生成质量过低 (${quality.overallScore}分)，建议重新生成`
          }
        };

        // 保存失败的历史记录（质量过低）
        this.saveGenerationHistory(request, response, Date.now() - startTime);
        return response;
      }

      // 构建响应
      const response: AITaskGenerationResponse = {
        success: true,
        data: {
          generatedTasks: parseResult.tasks,
          usedProvider: provider,
          usedModel: (config as any).model,
          generationId: this.generateId(),
          estimatedQuality: quality.overallScore,
          tokensUsed: aiResponse.data.usage || { input: 0, output: 0, total: 0 },
          estimatedCost: this.calculateCost(provider, aiResponse.data.usage),
          generationTime: Date.now() - startTime,
          reasoning: parseResult.reasoning
        }
      };

      // 缓存结果
      this.generationCache.set(cacheKey, response);
      
      // 保存成功的历史记录
      this.saveGenerationHistory(request, response, Date.now() - startTime);
      
      return response;

    } catch (error) {
      console.error('AI任务生成失败:', error);
      
      const response: AITaskGenerationResponse = {
        success: false,
        error: {
          code: AITaskGenerationErrorCode.AI_API_ERROR,
          message: error instanceof Error ? error.message : '未知错误'
        }
      };

      // 保存异常的历史记录
      this.saveGenerationHistory(request, response, Date.now() - startTime);
      return response;
    }
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(content: string): AIResponseParseResult {
    const warnings: string[] = [];
    
    try {
      // 预处理AI响应内容
      const cleanContent = this.preprocessAIResponse(content);
      let jsonStr = cleanContent;
      
      // 移除可能的markdown代码块标记和其他格式化标记
      jsonStr = this.extractJSONFromContent(cleanContent);
      
      // 尝试修复常见的JSON格式问题
      jsonStr = this.fixCommonJSONIssues(jsonStr);
      
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('响应格式错误：缺少tasks数组');
      }

      const tasks: GeneratedSubTask[] = parsed.tasks.map((task: unknown, index: number) => {
        // 验证必需字段
        if (!(task as any).title) {
          warnings.push(`任务${index + 1}缺少标题`);
          (task as any).title = `子任务${index + 1}`;
        }
        
        // 规范化优先级
        if (!['high', 'medium', 'low'].includes((task as any).priority)) {
          warnings.push(`任务${index + 1}优先级无效，已设为medium`);
          (task as any).priority = 'medium';
        }
        
        // 验证工时估算
        if (typeof (task as any).estimatedHours !== 'number' || (task as any).estimatedHours <= 0) {
          warnings.push(`任务${index + 1}工时估算无效，已设为2小时`);
          (task as any).estimatedHours = 2;
        }

        return {
          title: (task as any).title,
          description: (task as any).description || '',
          priority: (task as any).priority,
          estimatedHours: (task as any).estimatedHours,
          status: 'todo' as const,
          custom_fields: {
            tags: Array.isArray((task as any).tags) ? (task as any).tags : [],
            ai_generated: true,
            generation_id: this.generateId(),
            confidence_score: 85 // 默认置信度
          }
        };
      });

      return {
        success: true,
        tasks,
        reasoning: parsed.reasoning,
        confidence: 90,
        parseMethod: 'json',
        warnings
      };

    } catch (error) {
      // JSON解析失败，尝试文本提取
      console.warn('JSON解析失败，尝试文本提取:', error);
      return this.fallbackTaskExtraction(content);
    }
  }

  /**
   * 预处理AI响应内容
   */
  private preprocessAIResponse(content: string): string {
    let cleanContent = content.trim();
    
    // 移除常见的AI响应前缀
    const prefixPatterns = [
      /^基于.*?，我为你生成了以下任务：?\s*/i,
      /^以下是.*?生成的任务列表：?\s*/i,
      /^根据.*?，我建议以下任务：?\s*/i,
      /^这里是.*?的子任务分解：?\s*/i
    ];
    
    for (const pattern of prefixPatterns) {
      cleanContent = cleanContent.replace(pattern, '');
    }
    
    // 移除末尾的说明文字
    const suffixPatterns = [
      /\s*以上任务.*?$/i,
      /\s*这些任务.*?$/i,
      /\s*希望.*?$/i
    ];
    
    for (const pattern of suffixPatterns) {
      cleanContent = cleanContent.replace(pattern, '');
    }
    
    return cleanContent.trim();
  }

  /**
   * 从内容中提取JSON字符串
   */
  private extractJSONFromContent(content: string): string {
    // 移除markdown代码块标记
    if (content.startsWith('```json')) {
      return content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      return content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // 尝试找到JSON对象的开始和结束
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return content.substring(jsonStart, jsonEnd + 1);
    }
    
    return content;
  }

  /**
   * 修复常见的JSON格式问题
   */
  private fixCommonJSONIssues(jsonStr: string): string {
    let fixed = jsonStr;
    
    // 修复末尾缺少逗号的问题
    fixed = fixed.replace(/}(\s*){/g, '},$1{');
    
    // 修复单引号问题
    fixed = fixed.replace(/'/g, '"');
    
    // 修复属性名没有引号的问题
    fixed = fixed.replace(/(\w+):/g, '"$1":');
    
    // 修复多余的逗号
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // 修复换行和缩进问题
    fixed = fixed.replace(/\n\s*/g, ' ');
    
    return fixed;
  }

  /**
   * 从文本中提取优先级
   */
  private extractPriority(text: string): 'high' | 'medium' | 'low' {
    const highKeywords = ['高优先级', '高', 'high', '紧急', '重要', '优先'];
    const lowKeywords = ['低优先级', '低', 'low', '次要', '可选'];
    
    const lowerText = text.toLowerCase();
    
    for (const keyword of highKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return 'high';
      }
    }
    
    for (const keyword of lowKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return 'low';
      }
    }
    
    return 'medium';
  }

  /**
   * 从文本中提取时间估算
   */
  private extractEstimatedHours(text: string): number | null {
    // 匹配各种时间格式
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:小时|hour|h)/i,
      /(\d+(?:\.\d+)?)\s*(?:天|day|d)/i,
      /预计\s*(\d+(?:\.\d+)?)/i,
      /需要\s*(\d+(?:\.\d+)?)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const hours = parseFloat(match[1]);
        // 如果是天数，转换为小时（8小时工作日）
        if (pattern.source.includes('天|day|d')) {
          return hours * 8;
        }
        return hours;
      }
    }
    
    return null;
  }

  /**
   * 清理任务标题，移除优先级和时间标记
   */
  private cleanTaskTitle(title: string): string {
    let cleaned = title;
    
    // 移除优先级标记
    cleaned = cleaned.replace(/\s*[\(（].*?(?:优先级|priority|高|中|低|high|medium|low).*?[\)）]/gi, '');
    
    // 移除时间估算标记
    cleaned = cleaned.replace(/\s*[\(（].*?(?:小时|hour|h|天|day|d|预计|需要).*?[\)）]/gi, '');
    
    // 移除多余的空格和标点
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/[,，;；]\s*$/, '');
    
    return cleaned;
  }

  /**
   * 备用任务提取（当JSON解析失败时）
   */
  private fallbackTaskExtraction(content: string): AIResponseParseResult {
    const tasks: GeneratedSubTask[] = [];
    const warnings: string[] = ['使用备用解析方法，结果可能不完整'];
    
    // 预处理内容
    const cleanContent = this.preprocessAIResponse(content);
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    let taskCounter = 1;
    for (const line of lines) {
      // 扩展的匹配模式，支持更多格式
      const patterns = [
        /^(\d+)[\.\)]?\s*(.+)/,  // "1. 任务" 或 "1) 任务"
        /^[-\*\+]\s*(.+)/,       // "- 任务" 或 "* 任务"
        /^【.*?】\s*(.+)/,       // "【标签】任务"
        /^任务\d*[:：]\s*(.+)/,  // "任务1：标题"
        /^Step\s*\d*[:：]?\s*(.+)/i, // "Step 1: 任务"
      ];
      
      let title = '';
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          title = (match[2] || match[1]).trim();
          break;
        }
      }
      
      if (title && title.length > 3 && taskCounter <= AI_TASK_GENERATION_CONSTANTS.DEFAULT_MAX_TASKS) {
        // 尝试提取优先级和时间估算
        const priority = this.extractPriority(title);
        const estimatedHours = this.extractEstimatedHours(title) || 2;
        
        // 清理标题，移除优先级和时间标记
        const cleanTitle = this.cleanTaskTitle(title);
        
        tasks.push({
          title: cleanTitle,
          description: `从AI响应中提取的任务：${cleanTitle}`,
          priority,
          estimatedHours,
          status: 'todo',
          custom_fields: {
            tags: ['AI提取', '备用解析'],
            ai_generated: true,
            generation_id: this.generateId(),
            confidence_score: 60
          }
        });
        taskCounter++;
      }
    }

    if (tasks.length === 0) {
      // 最后的回退：创建一个基本任务
      tasks.push({
        title: '需要人工拆分的任务',
        description: 'AI生成失败，请手动创建子任务',
        priority: 'medium',
        estimatedHours: 4,
        status: 'todo',
        custom_fields: {
          tags: ['待拆分'],
          ai_generated: false,
          generation_id: this.generateId(),
          confidence_score: 30
        }
      });
    }

    return {
      success: tasks.length > 0,
      tasks,
      confidence: 50,
      parseMethod: 'fallback',
      warnings
    };
  }

  /**
   * 评估任务质量
   */
  private evaluateTaskQuality(tasks: GeneratedSubTask[]): TaskQualityAssessment {
    let totalScore = 0;
    const scores = {
      taskCount: 0,
      titleQuality: 0,
      descriptionQuality: 0,
      priorityDistribution: 0,
      timeEstimation: 0
    };
    const suggestions: string[] = [];
    const issues: string[] = [];

    // 新增质量检查项
    this.checkTaskTitleDuplication(tasks, issues, suggestions);
    this.checkTaskComplexity(tasks, issues, suggestions);
    this.checkTaskActionability(tasks, issues, suggestions);
    this.checkTaskDependencies(tasks, issues, suggestions);

    // 任务数量评分（3-8个为理想）
    const taskCount = tasks.length;
    if (taskCount >= 3 && taskCount <= 8) {
      scores.taskCount = 30;
    } else if (taskCount >= 2 && taskCount <= 10) {
      scores.taskCount = 20;
    } else {
      scores.taskCount = 10;
      if (taskCount < 3) {
        issues.push('任务数量过少，可能拆分不够细致');
      } else {
        issues.push('任务数量过多，可能过度拆分');
      }
    }

    // 标题质量评分
    let titleScore = 0;
    tasks.forEach((task, index) => {
      if (task.title.length >= 5 && task.title.length <= 50) {
        titleScore += 10;
      } else if (task.title.length < 5) {
        issues.push(`任务${index + 1}标题过短`);
      } else {
        issues.push(`任务${index + 1}标题过长`);
      }
    });
    scores.titleQuality = Math.min(30, titleScore);

    // 描述质量评分
    let descriptionScore = 0;
    tasks.forEach((task, index) => {
      if (task.description && task.description.length > 10) {
        descriptionScore += 5;
      } else {
        suggestions.push(`任务${index + 1}建议添加更详细的描述`);
      }
    });
    scores.descriptionQuality = Math.min(20, descriptionScore);

    // 优先级分布评分
    const priorities = tasks.map(t => t.priority);
    const highCount = priorities.filter(p => p === 'high').length;
    const mediumCount = priorities.filter(p => p === 'medium').length;
    const lowCount = priorities.filter(p => p === 'low').length;
    
    if (highCount > 0 && mediumCount > 0) {
      scores.priorityDistribution = 15;
    } else if (priorities.length > 1) {
      scores.priorityDistribution = 10;
      suggestions.push('建议任务优先级更加多样化');
    } else {
      scores.priorityDistribution = 5;
      issues.push('任务优先级分布不合理');
    }

    // 时间估算评分
    let timeScore = 0;
    tasks.forEach((task, index) => {
      if (task.estimatedHours && task.estimatedHours > 0 && task.estimatedHours <= 16) {
        timeScore += 5;
      } else {
        suggestions.push(`任务${index + 1}时间估算需要优化`);
      }
    });
    scores.timeEstimation = Math.min(5, timeScore);

    totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

    return {
      overallScore: totalScore,
      scores,
      suggestions,
      issues
    };
  }

  /**
   * 计算估算成本
   */
  private calculateCost(provider: AIProvider, usage?: any): number {
    if (!usage) return 0;

    const pricing = {
      deepseek: { input: 0.001, output: 0.002 }, // 人民币每1K tokens
      claude: { input: 0.008, output: 0.024 },
      openai: { input: 0.01, output: 0.03 }
    };

    const rate = pricing[provider] || pricing.deepseek;
    const inputCost = (usage.input / 1000) * rate.input;
    const outputCost = (usage.output / 1000) * rate.output;
    
    return Number((inputCost + outputCost).toFixed(4));
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `ai_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: AITaskGenerationRequest): string {
    const key = `${request.parentTaskId}_${request.keywords}_${request.complexity || 'detailed'}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 32);
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(response: AITaskGenerationResponse): boolean {
    if (!response.data) return false;
    
    const cacheAge = Date.now() - (response.data.generationTime || 0);
    return cacheAge < AI_TASK_GENERATION_CONSTANTS.CACHE_DURATION;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.generationCache.clear();
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): Map<AIProvider, AIServiceStatus> {
    return new Map(this.serviceStatus);
  }

  /**
   * 测试AI连接
   */
  async testAIConnection(provider: AIProvider): Promise<boolean> {
    try {
      const status = this.serviceStatus.get(provider);
      if (!status?.available) {
        return false;
      }

      const instance = this.providerInstances.get(provider);
      if (!instance || typeof instance.testConnection !== 'function') {
        return false;
      }

      const result = await instance.testConnection();
      return result.success;
    } catch (error) {
      console.error(`测试${provider}连接失败:`, error);
      return false;
    }
  }

  /**
   * 检查任务标题重复
   */
  private checkTaskTitleDuplication(tasks: GeneratedSubTask[], issues: string[], suggestions: string[]): void {
    const titles = tasks.map(t => t.title.toLowerCase().trim());
    const duplicates = titles.filter((title, index) => titles.indexOf(title) !== index);
    
    if (duplicates.length > 0) {
      issues.push('发现重复的任务标题');
      suggestions.push('建议重新生成以避免任务重复，或手动修改重复标题');
    }
  }

  /**
   * 检查任务复杂度
   */
  private checkTaskComplexity(tasks: GeneratedSubTask[], issues: string[], suggestions: string[]): void {
    tasks.forEach((task, index) => {
      const title = task.title.toLowerCase();
      const estimatedHours = task.estimatedHours || 0;
      
      // 检查任务是否过于复杂（超过8小时的任务可能需要进一步拆分）
      if (estimatedHours > 8) {
        suggestions.push(`任务${index + 1}"${task.title}"预估时间较长，建议进一步拆分`);
      }
      
      // 检查任务是否过于简单（少于0.5小时的任务可能过度拆分）
      if (estimatedHours > 0 && estimatedHours < 0.5) {
        suggestions.push(`任务${index + 1}"${task.title}"可能过度拆分，考虑与其他任务合并`);
      }
      
      // 检查标题中的复杂度指示词
      const complexWords = ['设计', '架构', '分析', '研究', '评估', '调研'];
      const simpleWords = ['修改', '更新', '添加', '删除', '调整'];
      
      const hasComplexWords = complexWords.some(word => title.includes(word));
      const hasSimpleWords = simpleWords.some(word => title.includes(word));
      
      if (hasComplexWords && estimatedHours < 2) {
        suggestions.push(`任务${index + 1}涉及复杂工作，但时间估算可能偏低`);
      }
      
      if (hasSimpleWords && estimatedHours > 4) {
        suggestions.push(`任务${index + 1}看起来相对简单，但时间估算可能偏高`);
      }
    });
  }

  /**
   * 检查任务可操作性
   */
  private checkTaskActionability(tasks: GeneratedSubTask[], issues: string[], suggestions: string[]): void {
    const actionWords = ['创建', '开发', '实现', '设计', '编写', '构建', '配置', '测试', '部署', '修复', '更新', '添加', '删除', '分析', '调研'];
    
    tasks.forEach((task, index) => {
      const title = task.title.toLowerCase();
      const hasActionWord = actionWords.some(word => title.includes(word));
      
      if (!hasActionWord) {
        suggestions.push(`任务${index + 1}"${task.title}"建议使用更明确的动作词，如"创建"、"实现"、"设计"等`);
      }
      
      // 检查是否过于抽象
      const abstractWords = ['优化', '改进', '提升', '完善', '加强'];
      const isAbstract = abstractWords.some(word => title.includes(word));
      
      if (isAbstract && (!task.description || task.description.length < 20)) {
        suggestions.push(`任务${index + 1}比较抽象，建议在描述中添加具体的实施步骤`);
      }
    });
  }

  /**
   * 检查任务依赖关系
   */
  private checkTaskDependencies(tasks: GeneratedSubTask[], issues: string[], suggestions: string[]): void {
    // 检查可能的依赖关系
    const dependencyPatterns = [
      { before: ['设计', '分析', '规划'], after: ['实现', '开发', '编码'] },
      { before: ['创建', '搭建'], after: ['配置', '部署'] },
      { before: ['开发', '实现'], after: ['测试', '调试'] },
      { before: ['测试'], after: ['部署', '发布'] }
    ];
    
    const taskTitles = tasks.map(t => t.title.toLowerCase());
    
    dependencyPatterns.forEach(pattern => {
      const beforeTasks = taskTitles.filter(title => 
        pattern.before.some(word => title.includes(word))
      );
      const afterTasks = taskTitles.filter(title => 
        pattern.after.some(word => title.includes(word))
      );
      
      if (beforeTasks.length > 0 && afterTasks.length > 0) {
        suggestions.push(`建议按照依赖顺序执行任务：先完成${pattern.before.join('、')}相关任务，再进行${pattern.after.join('、')}相关任务`);
      }
    });
    
    // 检查时间分配是否合理
    const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    if (totalHours > 40) {
      suggestions.push(`总工时预估${totalHours}小时，建议评估是否需要调整任务范围或延长时间线`);
    } else if (totalHours < 4) {
      suggestions.push(`总工时预估${totalHours}小时，可能任务拆分不够充分或时间估算偏低`);
    }
  }

  /**
   * 生成任务优化建议
   */
  generateOptimizationSuggestions(tasks: GeneratedSubTask[]): string[] {
    const suggestions: string[] = [];
    
    // 基于任务分析生成优化建议
    const priorities = tasks.map(t => t.priority);
    const highPriorityCount = priorities.filter(p => p === 'high').length;
    const totalTasks = tasks.length;
    
    // 优先级分布建议
    if (highPriorityCount > totalTasks * 0.6) {
      suggestions.push('高优先级任务过多，建议重新评估优先级分布，确保关键任务突出');
    } else if (highPriorityCount === 0) {
      suggestions.push('没有高优先级任务，建议识别最重要和紧急的任务并设为高优先级');
    }
    
    // 时间分配建议
    const timeEstimates = tasks.map(t => t.estimatedHours || 0);
    const avgTime = timeEstimates.reduce((a, b) => a + b, 0) / timeEstimates.length;
    
    if (avgTime > 6) {
      suggestions.push('平均任务时间较长，建议进一步拆分大型任务以提高执行效率');
    } else if (avgTime < 1) {
      suggestions.push('平均任务时间较短，可能过度拆分，建议合并相关的小任务');
    }
    
    // 任务类型分布建议
    const developmentTasks = tasks.filter(t => 
      ['开发', '实现', '编码', '构建'].some(word => t.title.includes(word))
    ).length;
    
    const testingTasks = tasks.filter(t => 
      ['测试', '验证', '检查'].some(word => t.title.includes(word))
    ).length;
    
    if (developmentTasks > 0 && testingTasks === 0) {
      suggestions.push('建议添加测试相关任务，确保开发质量');
    }
    
    return suggestions;
  }

  /**
   * 保存生成历史记录
   */
  private saveGenerationHistory(
    request: AITaskGenerationRequest,
    response: AITaskGenerationResponse,
    generationTime: number
  ): void {
    try {
      const history: TaskGenerationHistory = {
        id: this.generateId(),
        timestamp: new Date(),
        parentTaskId: request.parentTaskId,
        parentTaskTitle: request.parentTaskTitle,
        keywords: request.keywords,
        usedProvider: response.data?.usedProvider || 'unknown' as AIProvider,
        usedModel: response.data?.usedModel || 'unknown',
        generatedCount: response.data?.generatedTasks?.length || 0,
        quality: response.data?.estimatedQuality || 0,
        tokensUsed: response.data?.tokensUsed?.total || 0,
        cost: response.data?.estimatedCost || 0,
        success: response.success,
        errorMessage: response.error?.message
      };

      // 获取现有历史记录
      const existingHistory = this.getLocalGenerationHistory();
      existingHistory.unshift(history); // 最新的在前面

      // 保持最多100条记录
      if (existingHistory.length > 100) {
        existingHistory.splice(100);
      }

      // 保存到localStorage
      localStorage.setItem('ai_generation_history', JSON.stringify(existingHistory));

      } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  /**
   * 获取本地生成历史记录
   */
  getLocalGenerationHistory(): TaskGenerationHistory[] {
    try {
      const data = localStorage.getItem('ai_generation_history');
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map((item: unknown) => ({
        ...(item as any),
        timestamp: new Date((item as any).timestamp)
      }));
    } catch (error) {
      console.error('读取历史记录失败:', error);
      return [];
    }
  }

  /**
   * 清除生成历史记录
   */
  clearGenerationHistory(): void {
    try {
      localStorage.removeItem('ai_generation_history');
      } catch (error) {
      console.error('清除历史记录失败:', error);
    }
  }

  /**
   * 删除指定的历史记录
   */
  deleteGenerationHistory(id: string): boolean {
    try {
      const existingHistory = this.getLocalGenerationHistory();
      const filteredHistory = existingHistory.filter(item => item.id !== id);
      
      localStorage.setItem('ai_generation_history', JSON.stringify(filteredHistory));
      return true;
    } catch (error) {
      console.error('删除历史记录失败:', error);
      return false;
    }
  }

  /**
   * 根据历史记录复用生成配置
   */
  async reuseGenerationConfig(history: TaskGenerationHistory): Promise<AITaskGenerationRequest> {
    return {
      parentTaskId: history.parentTaskId,
      parentTaskTitle: history.parentTaskTitle,
      keywords: history.keywords,
      preferredProvider: history.usedProvider,
      maxTasks: history.generatedCount,
      complexity: 'detailed', // 默认复杂度
      includeTimeEstimate: true,
      projectId: undefined // 需要调用方提供
    };
  }

  /**
   * 获取Token使用统计
   */
  getTokenUsageStats(timeRange?: 'today' | 'week' | 'month' | 'all'): {
    totalTokens: number;
    totalCost: number;
    avgTokensPerRequest: number;
    avgCostPerRequest: number;
    providerBreakdown: Record<AIProvider, { tokens: number; cost: number; requests: number }>;
  } {
    const history = this.getLocalGenerationHistory();
    
    // 时间过滤
    let filteredHistory = history;
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (timeRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filteredHistory = history.filter(h => new Date(h.timestamp) >= filterDate);
    }
    
    const totalTokens = filteredHistory.reduce((sum, h) => sum + h.tokensUsed, 0);
    const totalCost = filteredHistory.reduce((sum, h) => sum + h.cost, 0);
    const totalRequests = filteredHistory.length;
    
    const providerBreakdown: Record<AIProvider, { tokens: number; cost: number; requests: number }> = {
      openai: { tokens: 0, cost: 0, requests: 0 },
      claude: { tokens: 0, cost: 0, requests: 0 },
      deepseek: { tokens: 0, cost: 0, requests: 0 }
    };
    
    filteredHistory.forEach(h => {
      if (providerBreakdown[h.usedProvider]) {
        providerBreakdown[h.usedProvider].tokens += h.tokensUsed;
        providerBreakdown[h.usedProvider].cost += h.cost;
        providerBreakdown[h.usedProvider].requests += 1;
      }
    });
    
    return {
      totalTokens,
      totalCost,
      avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      providerBreakdown
    };
  }

  /**
   * 获取成本优化建议
   */
  getCostOptimizationSuggestions(): string[] {
    const stats = this.getTokenUsageStats('month');
    const suggestions: string[] = [];
    
    // 分析提供商使用情况
    const totalCost = stats.totalCost;
    const { providerBreakdown } = stats;
    
    if (totalCost > 1) { // 月度成本超过1元
      const deepseekRatio = providerBreakdown.deepseek.cost / totalCost;
      const claudeRatio = providerBreakdown.claude.cost / totalCost;
      const openaiRatio = providerBreakdown.openai.cost / totalCost;
      
      if (openaiRatio > 0.5) {
        suggestions.push('OpenAI使用占比较高，对于简单任务可考虑使用DeepSeek降低成本');
      }
      
      if (claudeRatio > 0.3 && deepseekRatio < 0.3) {
        suggestions.push('Claude适合复杂分析任务，日常任务建议更多使用DeepSeek');
      }
      
      if (stats.avgTokensPerRequest > 3000) {
        suggestions.push('平均Token使用量较高，建议优化prompt长度和复杂度');
      }
      
      if (totalCost > 10) {
        suggestions.push('月度使用成本较高，建议制定AI使用策略和预算控制');
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push('当前使用成本控制良好，继续保持合理的AI使用习惯');
    }
    
    return suggestions;
  }

  /**
   * 预测月度成本
   */
  predictMonthlyCost(): number {
    const todayStats = this.getTokenUsageStats('today');
    const weekStats = this.getTokenUsageStats('week');
    
    // 基于最近7天的平均值预测
    const dailyAvgCost = weekStats.totalCost / 7;
    const predictedMonthlyCost = dailyAvgCost * 30;
    
    return predictedMonthlyCost;
  }
}

// 导出单例实例
export default new AITaskGeneratorService();