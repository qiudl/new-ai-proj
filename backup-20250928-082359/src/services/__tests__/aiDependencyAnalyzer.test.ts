/**
 * AI Dependency Analyzer Tests
 * 
 * Comprehensive test suite for the AI dependency analysis algorithms
 */

import { AIDependencyAnalyzer } from '../aiDependencyAnalyzer';
import { Task } from '../../types/task';

describe('AIDependencyAnalyzer', () => {
  let analyzer: AIDependencyAnalyzer;
  let mockTasks: Task[];

  beforeEach(() => {
    analyzer = new AIDependencyAnalyzer();
    
    // 创建模拟任务数据
    mockTasks = [
      {
        id: 1,
        project_id: 1,
        title: '设计数据库架构',
        description: '设计用户、项目、任务等核心表结构',
        status: 'completed',
        task_level: 0,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      },
      {
        id: 2,
        project_id: 1,
        title: '实现用户认证API',
        description: '基于任务1的数据库设计，实现用户登录、注册等认证功能',
        status: 'in_progress',
        task_level: 0,
        sort_order: 2,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z'
      },
      {
        id: 3,
        project_id: 1,
        title: '开发前端登录页面',
        description: '依赖于任务2完成后，开发React登录界面组件',
        status: 'todo',
        task_level: 0,
        sort_order: 3,
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      },
      {
        id: 4,
        project_id: 1,
        title: '项目管理功能',
        description: '实现项目的CRUD操作，需要先完成用户认证',
        status: 'todo',
        task_level: 0,
        sort_order: 4,
        created_at: '2025-01-04T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z'
      },
      {
        id: 5,
        project_id: 1,
        title: '任务管理系统优化',
        description: '优化任务管理相关功能性能',
        status: 'todo',
        task_level: 0,
        sort_order: 5,
        created_at: '2025-01-05T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z'
      }
    ];

    analyzer.setTaskContext(mockTasks);
  });

  describe('ID引用识别', () => {
    it('应该识别直接的任务ID引用', async () => {
      const task = {
        ...mockTasks[2],
        description: '依赖于任务2完成后，开发React登录界面组件'
      };

      const result = await analyzer.analyzeDependencies(task);

      expect(result.suggestedDependencies).toHaveLength(1);
      expect(result.suggestedDependencies[0].targetTaskId).toBe(2);
      expect(result.suggestedDependencies[0].type).toBe('reference');
      expect(result.suggestedDependencies[0].confidence).toBeGreaterThan(0.8);
    });

    it('应该识别#号格式的任务引用', async () => {
      const task = {
        ...mockTasks[3],
        description: '基于#1的数据库设计，实现项目管理功能'
      };

      const result = await analyzer.analyzeDependencies(task);

      const suggestion = result.suggestedDependencies.find(s => s.targetTaskId === 1);
      expect(suggestion).toBeDefined();
      expect(suggestion!.type).toBe('reference');
      expect(suggestion!.confidence).toBeGreaterThan(0.8);
    });

    it('应该识别多个任务ID引用', async () => {
      const task = {
        ...mockTasks[4],
        description: '基于任务1和任务2，然后开发任务管理功能'
      };

      const result = await analyzer.analyzeDependencies(task);

      const taskIds = result.suggestedDependencies.map(s => s.targetTaskId);
      expect(taskIds).toContain(1);
      expect(taskIds).toContain(2);
    });
  });

  describe('关键词识别', () => {
    it('应该识别中文依赖关键词', async () => {
      const task = {
        ...mockTasks[3],
        description: '需要先完成用户认证功能，然后开发项目管理'
      };

      const result = await analyzer.analyzeDependencies(task);

      expect(result.analysis.keywordsFound).toContain('需要先完成');
      expect(result.analysis.keywordsFound).toContain('然后');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('应该识别英文依赖关键词', async () => {
      const task = {
        ...mockTasks[3],
        description: 'depends on user authentication, after that implement project management'
      };

      const result = await analyzer.analyzeDependencies(task);

      expect(result.analysis.keywordsFound).toContain('depends on');
      expect(result.analysis.keywordsFound).toContain('after');
    });

    it('应该根据关键词提升置信度', async () => {
      const taskWithKeywords = {
        ...mockTasks[3],
        description: '依赖于用户认证功能'
      };

      const taskWithoutKeywords = {
        ...mockTasks[3],
        description: '用户认证功能'
      };

      const resultWithKeywords = await analyzer.analyzeDependencies(taskWithKeywords);
      const resultWithoutKeywords = await analyzer.analyzeDependencies(taskWithoutKeywords);

      expect(resultWithKeywords.confidence).toBeGreaterThan(resultWithoutKeywords.confidence);
    });
  });

  describe('标题相似性分析', () => {
    it('应该找到标题相似的任务', async () => {
      const task = {
        ...mockTasks[4],
        title: '任务管理功能开发',
        description: '开发任务相关功能'
      };

      const result = await analyzer.analyzeDependencies(task);

      // 应该找到包含"任务"关键词的其他任务
      const matches = result.analysis.matchingTasks.filter(m => m.matchType === 'title');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('应该计算正确的词汇重叠度', async () => {
      const task = {
        ...mockTasks[4],
        title: '用户认证系统',
        description: '实现用户认证相关功能'
      };

      const result = await analyzer.analyzeDependencies(task);

      // 应该与"实现用户认证API"有较高相似度
      const userAuthMatch = result.analysis.matchingTasks.find(
        m => m.taskId === 2 && m.matchType === 'title'
      );
      expect(userAuthMatch).toBeDefined();
      expect(userAuthMatch!.matchScore).toBeGreaterThan(0.3);
    });
  });

  describe('语义相关性分析', () => {
    it('应该识别技术栈相关性', async () => {
      const task = {
        ...mockTasks[4],
        title: 'Frontend登录界面',
        description: '开发前端用户界面'
      };

      const result = await analyzer.analyzeDependencies(task);

      // 应该找到与前端相关的任务
      const frontendMatches = result.analysis.matchingTasks.filter(
        m => m.matchType === 'keyword'
      );
      expect(frontendMatches.length).toBeGreaterThan(0);
    });

    it('应该识别功能模块相关性', async () => {
      const task = {
        ...mockTasks[4],
        title: '用户权限管理',
        description: '实现用户权限控制功能'
      };

      const result = await analyzer.analyzeDependencies(task);

      // 应该与其他用户相关任务有关联
      const userRelatedMatches = result.analysis.matchingTasks.filter(
        m => m.taskTitle.includes('用户') || m.taskTitle.includes('认证')
      );
      expect(userRelatedMatches.length).toBeGreaterThan(0);
    });
  });

  describe('整体分析质量', () => {
    it('应该为明确的依赖关系提供高置信度', async () => {
      const task = {
        ...mockTasks[2],
        description: '依赖于任务2完成后，需要先完成用户认证API'
      };

      const result = await analyzer.analyzeDependencies(task);

      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.suggestedDependencies.length).toBeGreaterThan(0);
    });

    it('应该为不明确的关系提供低置信度', async () => {
      const task = {
        ...mockTasks[4],
        title: '随机任务',
        description: '这是一个完全独立的任务'
      };

      const result = await analyzer.analyzeDependencies(task);

      expect(result.confidence).toBeLessThan(0.5);
    });

    it('应该生成合理的推理说明', async () => {
      const task = {
        ...mockTasks[2],
        description: '依赖于任务2，需要先完成认证功能'
      };

      const result = await analyzer.analyzeDependencies(task);

      expect(result.analysis.reasoning).toContain('依赖关键词');
      expect(result.analysis.reasoning).toContain('ID引用');
      expect(result.analysis.reasoning.length).toBeGreaterThan(10);
    });

    it('应该限制建议数量', async () => {
      // 创建更多相关任务
      const manyTasks = [
        ...mockTasks,
        ...Array.from({ length: 10 }, (_, i) => ({
          id: i + 10,
          project_id: 1,
          title: `相关任务${i}`,
          description: '用户认证相关功能',
          status: 'todo' as const,
          task_level: 0,
          sort_order: i + 10,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }))
      ];

      analyzer.setTaskContext(manyTasks);

      const task = {
        ...mockTasks[2],
        description: '与用户认证相关的功能开发'
      };

      const result = await analyzer.analyzeDependencies(task);

      // 应该限制在5个建议以内
      expect(result.suggestedDependencies.length).toBeLessThanOrEqual(5);
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空描述的任务', async () => {
      const task = {
        ...mockTasks[0],
        description: ''
      };

      const result = await analyzer.analyzeDependencies(task);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('应该处理不存在的任务ID引用', async () => {
      const task = {
        ...mockTasks[0],
        description: '依赖于任务999和任务888'
      };

      const result = await analyzer.analyzeDependencies(task);

      // 不应该包含不存在的任务ID
      const taskIds = result.suggestedDependencies.map(s => s.targetTaskId);
      expect(taskIds).not.toContain(999);
      expect(taskIds).not.toContain(888);
    });

    it('应该排除自引用', async () => {
      const task = {
        ...mockTasks[2],
        description: '任务3依赖于任务3本身，这是错误的'
      };

      const result = await analyzer.analyzeDependencies(task);

      // 不应该包含自己
      const taskIds = result.suggestedDependencies.map(s => s.targetTaskId);
      expect(taskIds).not.toContain(3);
    });

    it('应该处理空任务列表', async () => {
      analyzer.setTaskContext([]);

      const task = mockTasks[0];
      const result = await analyzer.analyzeDependencies(task);

      expect(result.suggestedDependencies).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });
});