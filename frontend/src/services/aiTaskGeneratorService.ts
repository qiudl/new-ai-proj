import { AIProvider } from '../types/ai';
import {
  AITaskGenerationRequest,
  AITaskGenerationResponse,
  GeneratedSubTask,
  AIResponseParseResult,
  TaskQualityAssessment,
  AIServiceStatus,
  AITaskGenerationErrorCode,
  AI_TASK_GENERATION_CONSTANTS
} from '../types/aiTaskGenerator';
import aiConfigDatabaseService from './aiConfigDatabaseService';
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
        return [];
      }

      return configs.data
        .filter(config => config.enabled && config.apiKeyMasked)
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
        const config = configs.success && configs.data ? 
          configs.data.find(c => c.provider === provider) : null;

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
    config: any;
    instance: any;
  }> {
    // 如果指定了偏好提供商，优先使用
    if (preferredProvider) {
      const status = this.serviceStatus.get(preferredProvider);
      if (status?.available) {
        const configs = await aiConfigDatabaseService.getConfigs();
        const config = configs.data?.find(c => c.provider === preferredProvider);
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
        const config = configs.data?.find(c => c.provider === provider);
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
  private createProviderInstance(provider: AIProvider, config: any): any {
    const providerConfig = {
      apiKey: config.apiKey || 'placeholder', // 实际使用时会从数据库获取
      baseURL: config.baseURL,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens
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
        return {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.INVALID_REQUEST,
            message: `请求验证失败: ${validation.issues.join(', ')}`
          }
        };
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
      const aiResponse = await instance.chat(messages);
      
      if (!aiResponse.success) {
        return {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.AI_API_ERROR,
            message: aiResponse.error?.message || 'AI API调用失败'
          }
        };
      }

      // 解析AI响应
      const parseResult = this.parseAIResponse(aiResponse.data.content);
      
      if (!parseResult.success) {
        return {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.PARSE_ERROR,
            message: '解析AI响应失败'
          }
        };
      }

      // 质量评估
      const quality = this.evaluateTaskQuality(parseResult.tasks);
      
      if (quality.overallScore < AI_TASK_GENERATION_CONSTANTS.MIN_QUALITY_THRESHOLD) {
        return {
          success: false,
          error: {
            code: AITaskGenerationErrorCode.QUALITY_TOO_LOW,
            message: `生成质量过低 (${quality.overallScore}分)，建议重新生成`
          }
        };
      }

      // 构建响应
      const response: AITaskGenerationResponse = {
        success: true,
        data: {
          generatedTasks: parseResult.tasks,
          usedProvider: provider,
          usedModel: config.model,
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
      
      return response;

    } catch (error) {
      console.error('AI任务生成失败:', error);
      
      return {
        success: false,
        error: {
          code: AITaskGenerationErrorCode.AI_API_ERROR,
          message: error instanceof Error ? error.message : '未知错误'
        }
      };
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

      const tasks: GeneratedSubTask[] = parsed.tasks.map((task: any, index: number) => {
        // 验证必需字段
        if (!task.title) {
          warnings.push(`任务${index + 1}缺少标题`);
          task.title = `子任务${index + 1}`;
        }
        
        // 规范化优先级
        if (!['high', 'medium', 'low'].includes(task.priority)) {
          warnings.push(`任务${index + 1}优先级无效，已设为medium`);
          task.priority = 'medium';
        }
        
        // 验证工时估算
        if (typeof task.estimatedHours !== 'number' || task.estimatedHours <= 0) {
          warnings.push(`任务${index + 1}工时估算无效，已设为2小时`);
          task.estimatedHours = 2;
        }

        return {
          title: task.title,
          description: task.description || '',
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          status: 'todo' as const,
          custom_fields: {
            tags: Array.isArray(task.tags) ? task.tags : [],
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
}

// 导出单例实例
export default new AITaskGeneratorService();