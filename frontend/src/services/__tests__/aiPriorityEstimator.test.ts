/**
 * AI Priority and Time Estimator Tests
 * 
 * Comprehensive test suite for the AI priority and time estimation algorithms
 */

import { AIPriorityEstimator } from '../aiPriorityEstimator';
import { Task } from '../../types/task';

describe('AIPriorityEstimator', () => {
  let estimator: AIPriorityEstimator;
  let mockTasks: Task[];

  beforeEach(() => {
    estimator = new AIPriorityEstimator();
    
    // 创建模拟任务数据
    mockTasks = [
      {
        id: 1,
        project_id: 1,
        title: '紧急修复生产环境Bug',
        description: 'critical production issue causing revenue loss, need to fix ASAP',
        status: 'todo',
        priority: 'high',
        estimated_hours: 2,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天到期
        task_level: 0,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      },
      {
        id: 2,
        project_id: 1,
        title: 'React组件开发',
        description: '实现用户界面组件，包括表单验证和数据绑定',
        status: 'in_progress',
        priority: 'medium',
        estimated_hours: 8,
        task_level: 0,
        sort_order: 2,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z'
      },
      {
        id: 3,
        project_id: 1,
        title: '性能优化研究',
        description: 'research and investigate performance optimization strategies',
        status: 'todo',
        priority: 'low',
        estimated_hours: 16,
        task_level: 0,
        sort_order: 3,
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      },
      {
        id: 4,
        project_id: 1,
        title: '数据库架构设计',
        description: '设计复杂的数据库架构，支持高并发和扩展性',
        status: 'todo',
        estimated_hours: 40,
        dependencies: [1],
        task_level: 0,
        sort_order: 4,
        created_at: '2025-01-04T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z'
      },
      {
        id: 5,
        project_id: 1,
        title: '文档更新',
        description: '更新API文档和用户指南',
        status: 'todo',
        priority: 'low',
        estimated_hours: 3,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后
        task_level: 0,
        sort_order: 5,
        created_at: '2025-01-05T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z'
      }
    ];

    estimator.setTaskContext(mockTasks);
  });

  describe('优先级分析', () => {
    it('应该识别高优先级关键词', async () => {
      const task = {
        ...mockTasks[0],
        title: '紧急修复生产环境关键Bug',
        description: 'urgent critical production issue blocking customers'
      };

      const result = await estimator.analyzePriority(task);

      expect(result.suggestedPriority).toBe('high');
      expect(result.confidence).toBeGreaterThan(0.7);
      
      const hasUrgencyKeywords = result.factors.some(f => 
        f.factor.includes('keywords') && f.impact === 'increase'
      );
      expect(hasUrgencyKeywords).toBe(true);
    });

    it('应该识别低优先级关键词', async () => {
      const task = {
        ...mockTasks[2],
        title: '可选功能研究',
        description: 'optional research task for future consideration, nice to have'
      };

      const result = await estimator.analyzePriority(task);

      expect(result.suggestedPriority).toBe('low');
      
      const hasLowPriorityKeywords = result.factors.some(f => 
        f.factor.includes('keywords') && f.impact === 'decrease'
      );
      expect(hasLowPriorityKeywords).toBe(true);
    });

    it('应该考虑截止时间因素', async () => {
      const urgentTask = {
        ...mockTasks[0],
        due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 昨天到期(逾期)
      };

      const result = await estimator.analyzePriority(urgentTask);

      expect(result.suggestedPriority).toBe('high');
      
      const hasOverdueFactor = result.factors.some(f => 
        f.factor === 'overdue' && f.impact === 'increase'
      );
      expect(hasOverdueFactor).toBe(true);
    });

    it('应该考虑依赖关系影响', async () => {
      // 创建一个被多个高优先级任务依赖的任务
      const blockingTask = {
        ...mockTasks[0],
        id: 10,
        title: '基础功能开发',
        description: '其他功能的基础依赖'
      };

      const dependentTasks = [
        { ...mockTasks[1], id: 11, dependencies: [10], priority: 'high' },
        { ...mockTasks[2], id: 12, dependencies: [10], priority: 'high' }
      ];

      estimator.setTaskContext([blockingTask, ...dependentTasks]);
      const result = await estimator.analyzePriority(blockingTask);

      const hasBlockingFactor = result.factors.some(f => 
        f.factor === 'blocking_high_priority' && f.impact === 'increase'
      );
      expect(hasBlockingFactor).toBe(true);
    });

    it('应该考虑父任务优先级', async () => {
      const parentTask = { ...mockTasks[0], id: 20, priority: 'high' };
      const childTask = { ...mockTasks[1], id: 21, parent_id: 20 };

      estimator.setTaskContext([parentTask, childTask]);
      const result = await estimator.analyzePriority(childTask);

      const hasParentFactor = result.factors.some(f => 
        f.factor === 'parent_high_priority' && f.impact === 'increase'
      );
      expect(hasParentFactor).toBe(true);
    });

    it('应该生成合理的推理说明', async () => {
      const result = await estimator.analyzePriority(mockTasks[0]);

      expect(result.reasoning).toContain('建议优先级');
      expect(result.reasoning.length).toBeGreaterThan(10);
      expect(result.factors.length).toBeGreaterThan(0);
    });
  });

  describe('工时预估', () => {
    it('应该正确分类任务类型', async () => {
      const bugFixTask = {
        ...mockTasks[0],
        title: 'Bug修复',
        description: 'fix critical bug in payment system'
      };

      const result = await estimator.estimateTime(bugFixTask);

      expect(result.estimatedHours).toBeGreaterThan(0);
      expect(result.estimatedHours).toBeLessThan(10); // Bug修复通常较短
    });

    it('应该为研究任务提供合理工时', async () => {
      const researchTask = {
        ...mockTasks[2],
        title: '技术调研',
        description: 'research new technology stack and evaluate options'
      };

      const result = await estimator.estimateTime(researchTask);

      expect(result.estimatedHours).toBeGreaterThan(2);
      expect(result.estimatedHours).toBeLessThan(20);
      
      const hasResearchBreakdown = result.breakdown.some(b => 
        b.phase.includes('资料') || b.phase.includes('分析')
      );
      expect(hasResearchBreakdown).toBe(true);
    });

    it('应该考虑任务复杂度', async () => {
      const simpleTask = {
        ...mockTasks[4],
        title: '简单配置更新',
        description: 'simple config change, minor update'
      };

      const complexTask = {
        ...mockTasks[3],
        title: '复杂架构设计',
        description: 'complex architecture design with multiple integrations and scalability requirements'
      };

      const simpleResult = await estimator.estimateTime(simpleTask);
      const complexResult = await estimator.estimateTime(complexTask);

      expect(complexResult.estimatedHours).toBeGreaterThan(simpleResult.estimatedHours);
    });

    it('应该考虑技术栈复杂度', async () => {
      const frontendTask = {
        ...mockTasks[1],
        description: 'simple React component development'
      };

      const backendTask = {
        ...mockTasks[1],
        description: 'Go backend API with database integration'
      };

      const aiTask = {
        ...mockTasks[1],
        description: 'AI machine learning algorithm implementation'
      };

      const frontendResult = await estimator.estimateTime(frontendTask);
      const backendResult = await estimator.estimateTime(backendTask);
      const aiResult = await estimator.estimateTime(aiTask);

      // AI > Backend > Frontend (complexity order)
      expect(aiResult.estimatedHours).toBeGreaterThan(backendResult.estimatedHours);
      expect(backendResult.estimatedHours).toBeGreaterThan(frontendResult.estimatedHours);
    });

    it('应该基于相似任务调整预估', async () => {
      const similarTask1 = {
        ...mockTasks[1],
        title: 'React表单组件',
        estimated_hours: 6
      };

      const similarTask2 = {
        ...mockTasks[1],
        id: 30,
        title: 'React列表组件',
        estimated_hours: 8
      };

      const newTask = {
        ...mockTasks[1],
        id: 31,
        title: 'React搜索组件',
        description: '开发React搜索组件，包括筛选功能'
      };

      estimator.setTaskContext([similarTask1, similarTask2, newTask]);
      const result = await estimator.estimateTime(newTask);

      expect(result.similarTasks.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('应该生成详细的工时分解', async () => {
      const featureTask = {
        ...mockTasks[1],
        title: '大型功能开发',
        description: '复杂的功能模块，包括前后端和数据库'
      };

      const result = await estimator.estimateTime(featureTask);

      expect(result.breakdown.length).toBeGreaterThan(2);
      
      const totalPercentage = result.breakdown.reduce((sum, b) => sum + b.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0); // 允许1%误差

      const totalHours = result.breakdown.reduce((sum, b) => sum + b.hours, 0);
      expect(totalHours).toBeCloseTo(result.estimatedHours, 0.5); // 允许0.5小时误差
    });

    it('应该计算合理的置信度', async () => {
      const wellDefinedTask = {
        ...mockTasks[1],
        title: 'React组件开发',
        description: '标准的React组件开发任务，包括单元测试'
      };

      const vagueTask = {
        ...mockTasks[1],
        title: '其他任务',
        description: '一些杂项工作'
      };

      const wellDefinedResult = await estimator.estimateTime(wellDefinedTask);
      const vagueResult = await estimator.estimateTime(vagueTask);

      expect(wellDefinedResult.confidence).toBeGreaterThan(vagueResult.confidence);
    });
  });

  describe('综合分析', () => {
    it('应该提供完整的综合分析结果', async () => {
      const result = await estimator.analyzeTask(mockTasks[0]);

      expect(result.taskId).toBe(mockTasks[0].id);
      expect(result.priority).toBeDefined();
      expect(result.timeEstimation).toBeDefined();
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('应该计算正确的整体置信度', async () => {
      const result = await estimator.analyzeTask(mockTasks[0]);

      const expectedConfidence = (result.priority.confidence + result.timeEstimation.confidence) / 2;
      expect(result.overallConfidence).toBeCloseTo(expectedConfidence, 0.1);
    });

    it('应该提供有用的建议', async () => {
      const urgentLargeTask = {
        ...mockTasks[0],
        title: '紧急大型功能开发',
        description: 'urgent large feature development with complex requirements'
      };

      const result = await estimator.analyzeTask(urgentLargeTask);

      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // 如果是高优先级且工时很长，应该建议拆分
      if (result.priority.suggestedPriority === 'high' && result.timeEstimation.estimatedHours > 20) {
        const hasSplitRecommendation = result.recommendations.some(r => r.includes('拆分'));
        expect(hasSplitRecommendation).toBe(true);
      }
    });

    it('应该处理缺少历史数据的情况', async () => {
      estimator.setTaskContext([]); // 清空历史数据

      const result = await estimator.analyzeTask(mockTasks[0]);

      expect(result).toBeDefined();
      expect(result.timeEstimation.similarTasks).toHaveLength(0);
      
      const hasNoHistoryRecommendation = result.recommendations.some(r => 
        r.includes('缺少') || r.includes('调整')
      );
      expect(hasNoHistoryRecommendation).toBe(true);
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空描述的任务', async () => {
      const task = {
        ...mockTasks[0],
        description: ''
      };

      const priorityResult = await estimator.analyzePriority(task);
      const timeResult = await estimator.estimateTime(task);

      expect(priorityResult).toBeDefined();
      expect(timeResult).toBeDefined();
      expect(priorityResult.confidence).toBeGreaterThanOrEqual(0);
      expect(timeResult.confidence).toBeGreaterThanOrEqual(0);
    });

    it('应该处理极端截止时间', async () => {
      const overdueTask = {
        ...mockTasks[0],
        due_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 一年前
      };

      const result = await estimator.analyzePriority(overdueTask);

      expect(result.suggestedPriority).toBe('high');
      expect(result.factors.some(f => f.factor === 'overdue')).toBe(true);
    });

    it('应该处理循环依赖', async () => {
      const task1 = { ...mockTasks[0], id: 40, dependencies: [41] };
      const task2 = { ...mockTasks[1], id: 41, dependencies: [40] };

      estimator.setTaskContext([task1, task2]);
      
      const result1 = await estimator.analyzePriority(task1);
      const result2 = await estimator.analyzePriority(task2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('应该处理无效的任务数据', async () => {
      const invalidTask = {
        ...mockTasks[0],
        due_date: 'invalid-date',
        estimated_hours: -5
      };

      const result = await estimator.analyzeTask(invalidTask);

      expect(result).toBeDefined();
      expect(result.timeEstimation.estimatedHours).toBeGreaterThan(0);
    });

    it('应该处理中英文混合内容', async () => {
      const mixedTask = {
        ...mockTasks[0],
        title: 'Urgent task 紧急任务',
        description: 'This is an urgent task 这是一个紧急任务 with critical importance 非常重要'
      };

      const result = await estimator.analyzePriority(mixedTask);

      expect(result.suggestedPriority).toBe('high');
      
      const hasKeywords = result.factors.some(f => 
        f.description.includes('urgent') || f.description.includes('紧急')
      );
      expect(hasKeywords).toBe(true);
    });
  });
});