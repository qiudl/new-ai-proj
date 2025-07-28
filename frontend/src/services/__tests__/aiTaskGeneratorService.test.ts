import aiTaskGeneratorService from '../aiTaskGeneratorService';
import {
  AITaskGenerationRequest,
  AITaskGenerationResponse,
  GeneratedSubTask,
  TaskGenerationHistory,
  AITaskGenerationErrorCode
} from '../../types/aiTaskGenerator';
import { AIProvider } from '../../types/ai';

// Mock外部依赖
jest.mock('../aiConfigDatabaseService', () => ({
  getConfigs: jest.fn()
}));

jest.mock('../aiProviders/deepseekProvider');
jest.mock('./aiTaskPrompts', () => ({
  PromptSelector: {
    getSystemPrompt: jest.fn().mockReturnValue('system prompt'),
    getUserPrompt: jest.fn().mockReturnValue('user prompt')
  },
  PromptValidator: {
    validateRequest: jest.fn().mockReturnValue({ valid: true, issues: [] })
  }
}));

describe('AITaskGeneratorService', () => {
  let mockAiConfigService: any;
  let mockPromptValidator: any;
  let mockPromptSelector: any;

  beforeEach(() => {
    // 清除localStorage
    localStorage.clear();
    
    // 重置所有mock
    jest.clearAllMocks();
    
    // 获取mock实例
    mockAiConfigService = require('../aiConfigDatabaseService');
    mockPromptValidator = require('./aiTaskPrompts').PromptValidator;
    mockPromptSelector = require('./aiTaskPrompts').PromptSelector;
    
    // 设置默认mock返回值
    mockAiConfigService.getConfigs.mockResolvedValue({
      success: true,
      data: [
        {
          provider: 'deepseek' as AIProvider,
          enabled: true,
          apiKeyMasked: 'sk-***',
          model: 'deepseek-chat',
          baseURL: 'https://api.deepseek.com/v1',
          temperature: 0.3,
          maxTokens: 2000
        }
      ]
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAvailableProviders', () => {
    it('应该返回可用的AI提供商列表', async () => {
      const providers = await aiTaskGeneratorService.getAvailableProviders();
      expect(providers).toEqual(['deepseek']);
      expect(mockAiConfigService.getConfigs).toHaveBeenCalled();
    });

    it('当配置获取失败时应该返回空数组', async () => {
      mockAiConfigService.getConfigs.mockResolvedValue({
        success: false,
        error: 'Config error'
      });

      const providers = await aiTaskGeneratorService.getAvailableProviders();
      expect(providers).toEqual([]);
    });

    it('应该过滤掉未启用的提供商', async () => {
      mockAiConfigService.getConfigs.mockResolvedValue({
        success: true,
        data: [
          {
            provider: 'deepseek' as AIProvider,
            enabled: false,
            apiKeyMasked: 'sk-***'
          },
          {
            provider: 'openai' as AIProvider,
            enabled: true,
            apiKeyMasked: 'sk-***'
          }
        ]
      });

      const providers = await aiTaskGeneratorService.getAvailableProviders();
      expect(providers).toEqual(['openai']);
    });
  });

  describe('generateSubTasks', () => {
    const mockRequest: AITaskGenerationRequest = {
      parentTaskId: 1,
      parentTaskTitle: '测试父任务',
      keywords: '前端开发, React, TypeScript',
      preferredProvider: 'deepseek',
      maxTasks: 5,
      complexity: 'detailed',
      includeTimeEstimate: true,
      projectId: 1
    };

    it('应该成功生成子任务', async () => {
      // Mock AI提供商实例
      const mockInstance = {
        chat: jest.fn().mockResolvedValue({
          success: true,
          data: {
            content: JSON.stringify({
              tasks: [
                {
                  title: '设置React项目',
                  description: '初始化React项目结构',
                  priority: 'high',
                  estimatedHours: 2
                },
                {
                  title: '配置TypeScript',
                  description: '添加TypeScript配置',
                  priority: 'medium',
                  estimatedHours: 1
                }
              ],
              reasoning: '基于前端开发需求分解任务'
            }),
            usage: { input: 100, output: 200, total: 300 }
          }
        })
      };

      // Mock createProviderInstance
      const createProviderInstanceSpy = jest.spyOn(aiTaskGeneratorService as any, 'createProviderInstance');
      createProviderInstanceSpy.mockReturnValue(mockInstance);

      const response = await aiTaskGeneratorService.generateSubTasks(mockRequest);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data!.generatedTasks).toHaveLength(2);
      expect(response.data!.generatedTasks[0].title).toBe('设置React项目');
      expect(response.data!.usedProvider).toBe('deepseek');
      expect(response.data!.tokensUsed.total).toBe(300);
    });

    it('当请求验证失败时应该返回错误', async () => {
      mockPromptValidator.validateRequest.mockReturnValue({
        valid: false,
        issues: ['标题太短', '关键词为空']
      });

      const response = await aiTaskGeneratorService.generateSubTasks(mockRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(AITaskGenerationErrorCode.INVALID_REQUEST);
      expect(response.error?.message).toContain('请求验证失败');
    });

    it('当没有可用提供商时应该返回错误', async () => {
      mockAiConfigService.getConfigs.mockResolvedValue({
        success: true,
        data: []
      });

      const response = await aiTaskGeneratorService.generateSubTasks(mockRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(AITaskGenerationErrorCode.NO_AVAILABLE_PROVIDER);
    });

    it('当AI API调用失败时应该返回错误', async () => {
      const mockInstance = {
        chat: jest.fn().mockResolvedValue({
          success: false,
          error: { message: 'API调用失败' }
        })
      };

      const createProviderInstanceSpy = jest.spyOn(aiTaskGeneratorService as any, 'createProviderInstance');
      createProviderInstanceSpy.mockReturnValue(mockInstance);

      const response = await aiTaskGeneratorService.generateSubTasks(mockRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(AITaskGenerationErrorCode.AI_API_ERROR);
    });

    it('当AI响应解析失败时应该返回错误', async () => {
      const mockInstance = {
        chat: jest.fn().mockResolvedValue({
          success: true,
          data: {
            content: '无效的JSON格式',
            usage: { input: 100, output: 200, total: 300 }
          }
        })
      };

      const createProviderInstanceSpy = jest.spyOn(aiTaskGeneratorService as any, 'createProviderInstance');
      createProviderInstanceSpy.mockReturnValue(mockInstance);

      const response = await aiTaskGeneratorService.generateSubTasks(mockRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(AITaskGenerationErrorCode.PARSE_ERROR);
    });

    it('当质量评分过低时应该返回错误', async () => {
      const mockInstance = {
        chat: jest.fn().mockResolvedValue({
          success: true,
          data: {
            content: JSON.stringify({
              tasks: [
                {
                  title: 'a', // 太短的标题会导致质量分低
                  description: '',
                  priority: 'medium',
                  estimatedHours: 1
                }
              ]
            }),
            usage: { input: 100, output: 200, total: 300 }
          }
        })
      };

      const createProviderInstanceSpy = jest.spyOn(aiTaskGeneratorService as any, 'createProviderInstance');
      createProviderInstanceSpy.mockReturnValue(mockInstance);

      const response = await aiTaskGeneratorService.generateSubTasks(mockRequest);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(AITaskGenerationErrorCode.QUALITY_TOO_LOW);
    });
  });

  describe('parseAIResponse', () => {
    it('应该正确解析JSON格式的AI响应', () => {
      const content = JSON.stringify({
        tasks: [
          {
            title: '任务1',
            description: '描述1',
            priority: 'high',
            estimatedHours: 2
          }
        ],
        reasoning: '分析推理'
      });

      const parseAIResponseSpy = jest.spyOn(aiTaskGeneratorService as any, 'parseAIResponse');
      const result = parseAIResponseSpy.call(aiTaskGeneratorService, content);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('任务1');
      expect(result.parseMethod).toBe('json');
    });

    it('应该处理markdown代码块格式', () => {
      const content = '```json\n' + JSON.stringify({
        tasks: [
          {
            title: '任务1',
            description: '描述1',
            priority: 'medium',
            estimatedHours: 1
          }
        ]
      }) + '\n```';

      const parseAIResponseSpy = jest.spyOn(aiTaskGeneratorService as any, 'parseAIResponse');
      const result = parseAIResponseSpy.call(aiTaskGeneratorService, content);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(1);
    });

    it('当JSON解析失败时应该回退到文本提取', () => {
      const content = `
        1. 设置开发环境
        2. 创建项目结构
        3. 实现核心功能
      `;

      const parseAIResponseSpy = jest.spyOn(aiTaskGeneratorService as any, 'parseAIResponse');
      const result = parseAIResponseSpy.call(aiTaskGeneratorService, content);

      expect(result.success).toBe(true);
      expect(result.tasks).toHaveLength(3);
      expect(result.parseMethod).toBe('fallback');
      expect(result.tasks[0].title).toContain('设置开发环境');
    });
  });

  describe('evaluateTaskQuality', () => {
    it('应该对高质量任务给出高分', () => {
      const tasks: GeneratedSubTask[] = [
        {
          title: '设置React开发环境并配置TypeScript',
          description: '安装Node.js、创建React项目、配置TypeScript编译选项和开发工具',
          priority: 'high',
          estimatedHours: 3,
          status: 'todo',
          custom_fields: { ai_generated: true }
        },
        {
          title: '实现用户界面组件',
          description: '创建Header、Sidebar、Content等基础布局组件',
          priority: 'medium',
          estimatedHours: 4,
          status: 'todo',
          custom_fields: { ai_generated: true }
        },
        {
          title: '编写单元测试',
          description: '为核心组件和功能编写Jest测试用例',
          priority: 'low',
          estimatedHours: 2,
          status: 'todo',
          custom_fields: { ai_generated: true }
        }
      ];

      const evaluateTaskQualitySpy = jest.spyOn(aiTaskGeneratorService as any, 'evaluateTaskQuality');
      const result = evaluateTaskQualitySpy.call(aiTaskGeneratorService, tasks);

      expect(result.overallScore).toBeGreaterThan(60);
      expect(result.scores.taskCount).toBeGreaterThan(0);
      expect(result.scores.titleQuality).toBeGreaterThan(0);
      expect(result.scores.priorityDistribution).toBeGreaterThan(0);
    });

    it('应该对低质量任务给出低分', () => {
      const tasks: GeneratedSubTask[] = [
        {
          title: 'a', // 标题太短
          description: '',
          priority: 'medium',
          estimatedHours: 1,
          status: 'todo',
          custom_fields: { ai_generated: true }
        }
      ];

      const evaluateTaskQualitySpy = jest.spyOn(aiTaskGeneratorService as any, 'evaluateTaskQuality');
      const result = evaluateTaskQualitySpy.call(aiTaskGeneratorService, tasks);

      expect(result.overallScore).toBeLessThan(60);
      expect(result.issues).toContain('任务1标题过短');
    });
  });

  describe('历史记录管理', () => {
    const mockHistory: TaskGenerationHistory = {
      id: 'test-id',
      timestamp: new Date(),
      parentTaskId: 1,
      parentTaskTitle: '测试任务',
      keywords: '测试关键词',
      usedProvider: 'deepseek',
      usedModel: 'deepseek-chat',
      generatedCount: 3,
      quality: 85,
      tokensUsed: 500,
      cost: 0.001,
      success: true
    };

    it('应该能保存历史记录', () => {
      // 模拟私有方法调用
      const saveGenerationHistorySpy = jest.spyOn(aiTaskGeneratorService as any, 'saveGenerationHistory');
      
      // 手动调用保存方法（实际中会在generateSubTasks中自动调用）
      const mockRequest: AITaskGenerationRequest = {
        parentTaskId: 1,
        parentTaskTitle: '测试任务',
        keywords: '测试关键词'
      };
      
      const mockResponse: AITaskGenerationResponse = {
        success: true,
        data: {
          generatedTasks: [],
          usedProvider: 'deepseek',
          usedModel: 'deepseek-chat',
          generationId: 'test-id',
          estimatedQuality: 85,
          tokensUsed: { input: 200, output: 300, total: 500 },
          estimatedCost: 0.001,
          generationTime: 2000
        }
      };

      saveGenerationHistorySpy.call(aiTaskGeneratorService, mockRequest, mockResponse, 2000);

      const history = aiTaskGeneratorService.getGenerationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].parentTaskTitle).toBe('测试任务');
    });

    it('应该能获取历史记录', () => {
      // 先保存一些历史记录
      localStorage.setItem('ai_generation_history', JSON.stringify([mockHistory]));

      const history = aiTaskGeneratorService.getGenerationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].parentTaskTitle).toBe('测试任务');
    });

    it('应该能删除指定的历史记录', () => {
      // 先保存历史记录
      localStorage.setItem('ai_generation_history', JSON.stringify([mockHistory]));

      const result = aiTaskGeneratorService.deleteGenerationHistory('test-id');
      expect(result).toBe(true);

      const history = aiTaskGeneratorService.getGenerationHistory();
      expect(history).toHaveLength(0);
    });

    it('应该能清除所有历史记录', () => {
      // 先保存历史记录
      localStorage.setItem('ai_generation_history', JSON.stringify([mockHistory]));

      aiTaskGeneratorService.clearGenerationHistory();

      const history = aiTaskGeneratorService.getGenerationHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Token使用统计', () => {
    beforeEach(() => {
      // 准备测试数据
      const testHistory: TaskGenerationHistory[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1小时前
          parentTaskId: 1,
          parentTaskTitle: '任务1',
          keywords: '测试',
          usedProvider: 'deepseek',
          usedModel: 'deepseek-chat',
          generatedCount: 3,
          quality: 80,
          tokensUsed: 1000,
          cost: 0.002,
          success: true
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), // 25小时前
          parentTaskId: 2,
          parentTaskTitle: '任务2',
          keywords: '测试',
          usedProvider: 'openai',
          usedModel: 'gpt-3.5-turbo',
          generatedCount: 5,
          quality: 90,
          tokensUsed: 2000,
          cost: 0.01,
          success: true
        }
      ];

      localStorage.setItem('ai_generation_history', JSON.stringify(testHistory));
    });

    it('应该正确计算今日统计', () => {
      const stats = aiTaskGeneratorService.getTokenUsageStats('today');
      
      expect(stats.totalTokens).toBe(1000); // 只有1小时前的记录
      expect(stats.totalCost).toBe(0.002);
      expect(stats.providerBreakdown.deepseek.tokens).toBe(1000);
      expect(stats.providerBreakdown.openai.tokens).toBe(0);
    });

    it('应该正确计算全部时间统计', () => {
      const stats = aiTaskGeneratorService.getTokenUsageStats('all');
      
      expect(stats.totalTokens).toBe(3000); // 两条记录之和
      expect(stats.totalCost).toBe(0.012);
      expect(stats.avgTokensPerRequest).toBe(1500);
      expect(stats.avgCostPerRequest).toBe(0.006);
    });

    it('应该正确分组提供商统计', () => {
      const stats = aiTaskGeneratorService.getTokenUsageStats('all');
      
      expect(stats.providerBreakdown.deepseek.tokens).toBe(1000);
      expect(stats.providerBreakdown.deepseek.cost).toBe(0.002);
      expect(stats.providerBreakdown.deepseek.requests).toBe(1);
      
      expect(stats.providerBreakdown.openai.tokens).toBe(2000);
      expect(stats.providerBreakdown.openai.cost).toBe(0.01);
      expect(stats.providerBreakdown.openai.requests).toBe(1);
    });
  });

  describe('成本优化建议', () => {
    it('当OpenAI使用过多时应该给出建议', () => {
      // 准备高OpenAI使用的测试数据
      const testHistory: TaskGenerationHistory[] = [
        {
          id: '1',
          timestamp: new Date(),
          parentTaskId: 1,
          parentTaskTitle: '任务1',
          keywords: '测试',
          usedProvider: 'openai',
          usedModel: 'gpt-3.5-turbo',
          generatedCount: 3,
          quality: 80,
          tokensUsed: 1000,
          cost: 5, // 高成本
          success: true
        }
      ];

      localStorage.setItem('ai_generation_history', JSON.stringify(testHistory));

      const suggestions = aiTaskGeneratorService.getCostOptimizationSuggestions();
      
      expect(suggestions).toContain('OpenAI使用占比较高，对于简单任务可考虑使用DeepSeek降低成本');
    });

    it('当平均Token使用量过高时应该给出建议', () => {
      const testHistory: TaskGenerationHistory[] = [
        {
          id: '1',
          timestamp: new Date(),
          parentTaskId: 1,
          parentTaskTitle: '任务1',
          keywords: '测试',
          usedProvider: 'deepseek',
          usedModel: 'deepseek-chat',
          generatedCount: 3,
          quality: 80,
          tokensUsed: 5000, // 高Token使用
          cost: 2,
          success: true
        }
      ];

      localStorage.setItem('ai_generation_history', JSON.stringify(testHistory));

      const suggestions = aiTaskGeneratorService.getCostOptimizationSuggestions();
      
      expect(suggestions).toContain('平均Token使用量较高，建议优化prompt长度和复杂度');
    });

    it('当成本控制良好时应该给出正面反馈', () => {
      const testHistory: TaskGenerationHistory[] = [
        {
          id: '1',
          timestamp: new Date(),
          parentTaskId: 1,
          parentTaskTitle: '任务1',
          keywords: '测试',
          usedProvider: 'deepseek',
          usedModel: 'deepseek-chat',
          generatedCount: 3,
          quality: 80,
          tokensUsed: 500,
          cost: 0.001, // 低成本
          success: true
        }
      ];

      localStorage.setItem('ai_generation_history', JSON.stringify(testHistory));

      const suggestions = aiTaskGeneratorService.getCostOptimizationSuggestions();
      
      expect(suggestions).toContain('当前使用成本控制良好，继续保持合理的AI使用习惯');
    });
  });

  describe('月度成本预测', () => {
    it('应该基于历史数据预测月度成本', () => {
      // 准备最近7天的测试数据
      const testHistory: TaskGenerationHistory[] = [];
      
      for (let i = 0; i < 7; i++) {
        testHistory.push({
          id: `test-${i}`,
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          parentTaskId: 1,
          parentTaskTitle: '任务',
          keywords: '测试',
          usedProvider: 'deepseek',
          usedModel: 'deepseek-chat',
          generatedCount: 3,
          quality: 80,
          tokensUsed: 1000,
          cost: 0.01, // 每天0.01元
          success: true
        });
      }

      localStorage.setItem('ai_generation_history', JSON.stringify(testHistory));

      const predictedCost = aiTaskGeneratorService.predictMonthlyCost();
      
      // 7天总成本0.07元，日均0.01元，月度预测应该是0.3元
      expect(predictedCost).toBeCloseTo(0.3, 2);
    });
  });

  describe('配置复用', () => {
    it('应该能根据历史记录生成复用配置', async () => {
      const history: TaskGenerationHistory = {
        id: 'test',
        timestamp: new Date(),
        parentTaskId: 1,
        parentTaskTitle: '原任务',
        keywords: '原关键词',
        usedProvider: 'deepseek',
        usedModel: 'deepseek-chat',
        generatedCount: 5,
        quality: 85,
        tokensUsed: 1000,
        cost: 0.002,
        success: true
      };

      const config = await aiTaskGeneratorService.reuseGenerationConfig(history);

      expect(config.parentTaskId).toBe(1);
      expect(config.parentTaskTitle).toBe('原任务');
      expect(config.keywords).toBe('原关键词');
      expect(config.preferredProvider).toBe('deepseek');
      expect(config.maxTasks).toBe(5);
    });
  });
});