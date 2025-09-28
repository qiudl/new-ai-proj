/**
 * AI Tags Generator Tests
 * 
 * Comprehensive test suite for the AI tags generation algorithms
 */

import { AITagsGenerator } from '../aiTagsGenerator';
import { Task } from '../../types/task';

describe('AITagsGenerator', () => {
  let generator: AITagsGenerator;
  let mockTasks: Task[];

  beforeEach(() => {
    generator = new AITagsGenerator();
    
    // 创建模拟任务数据
    mockTasks = [
      {
        id: 1,
        project_id: 1,
        title: 'React前端开发',
        description: '使用React和TypeScript开发用户界面组件',
        status: 'completed',
        task_level: 0,
        sort_order: 1,
        tags: ['React', 'TypeScript', '前端', 'UI'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      },
      {
        id: 2,
        project_id: 1,
        title: 'Go后端API开发',
        description: '实现REST API接口，使用Go语言和Gin框架',
        status: 'in_progress',
        task_level: 0,
        sort_order: 2,
        tags: ['Go', 'API', '后端', 'Gin'],
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z'
      },
      {
        id: 3,
        project_id: 1,
        title: 'MySQL数据库设计',
        description: '设计数据库表结构，创建索引和存储过程',
        status: 'todo',
        task_level: 0,
        sort_order: 3,
        tags: ['MySQL', '数据库', '设计'],
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      },
      {
        id: 4,
        project_id: 1,
        title: 'Docker容器化部署',
        description: '使用Docker和Kubernetes进行应用部署',
        status: 'todo',
        task_level: 0,
        sort_order: 4,
        tags: ['Docker', 'Kubernetes', '部署'],
        created_at: '2025-01-04T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z'
      },
      {
        id: 5,
        project_id: 1,
        title: '单元测试编写',
        description: '为所有组件和API编写单元测试用例',
        status: 'todo',
        task_level: 0,
        sort_order: 5,
        tags: ['测试', '单元测试', '质量保证'],
        created_at: '2025-01-05T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z'
      }
    ];

    generator.setTaskContext(mockTasks);
  });

  describe('关键词提取算法', () => {
    it('应该提取有效的关键词', async () => {
      const task = {
        ...mockTasks[0],
        title: 'React组件开发',
        description: 'React是一个用于构建用户界面的JavaScript库'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.extractedKeywords.length).toBeGreaterThan(0);
      const keywords = result.analysis.extractedKeywords.map(k => k.keyword);
      expect(keywords).toContain('react');
      expect(keywords).toContain('javascript');
    });

    it('应该过滤停用词', async () => {
      const task = {
        ...mockTasks[0],
        description: 'this is a simple test with many stop words and the'
      };

      const result = await generator.generateTags(task);

      const keywords = result.analysis.extractedKeywords.map(k => k.keyword);
      expect(keywords).not.toContain('this');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('the');
    });

    it('应该计算正确的TF-IDF分数', async () => {
      const task = {
        ...mockTasks[0],
        description: 'React React React component development'
      };

      const result = await generator.generateTags(task);

      const reactKeyword = result.analysis.extractedKeywords.find(k => k.keyword === 'react');
      expect(reactKeyword).toBeDefined();
      expect(reactKeyword!.frequency).toBe(3);
      expect(reactKeyword!.score).toBeGreaterThan(0);
    });
  });

  describe('技术栈识别', () => {
    it('应该识别前端技术栈', async () => {
      const task = {
        ...mockTasks[0],
        title: 'Vue.js应用开发',
        description: '使用Vue.js和TypeScript开发SPA应用'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.techStackTags).toContain('Vue.js');
      expect(result.analysis.techStackTags).toContain('TypeScript');
    });

    it('应该识别后端技术栈', async () => {
      const task = {
        ...mockTasks[1],
        title: 'Python API开发',
        description: '使用Django框架开发REST API'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.techStackTags).toContain('Python');
    });

    it('应该识别数据库技术', async () => {
      const task = {
        ...mockTasks[2],
        description: '设计PostgreSQL数据库架构，配置Redis缓存'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.techStackTags).toContain('PostgreSQL');
      expect(result.analysis.techStackTags).toContain('Redis');
    });

    it('应该识别DevOps技术', async () => {
      const task = {
        ...mockTasks[3],
        description: '使用Kubernetes和Docker进行容器化部署'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.techStackTags).toContain('Docker');
      expect(result.analysis.techStackTags).toContain('Kubernetes');
    });

    it('应该识别中文技术术语', async () => {
      const task = {
        ...mockTasks[0],
        description: '开发前端界面，实现用户交互功能'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.techStackTags).toContain('前端');
    });
  });

  describe('业务领域分类', () => {
    it('应该识别开发类任务', async () => {
      const task = {
        ...mockTasks[0],
        description: 'implement new feature and develop component'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.businessDomainTags).toContain('开发');
    });

    it('应该识别测试类任务', async () => {
      const task = {
        ...mockTasks[4],
        description: '编写单元测试，验证功能正确性'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.businessDomainTags).toContain('测试');
    });

    it('应该识别部署类任务', async () => {
      const task = {
        ...mockTasks[3],
        description: 'deploy application to production environment'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.businessDomainTags).toContain('部署');
    });

    it('应该识别设计类任务', async () => {
      const task = {
        ...mockTasks[2],
        description: '设计UI界面，制作原型图'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.businessDomainTags).toContain('设计');
    });

    it('应该识别文档类任务', async () => {
      const task = {
        ...mockTasks[0],
        title: 'API文档编写',
        description: '编写API使用指南和技术文档'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.businessDomainTags).toContain('文档');
    });

    it('应该识别安全类任务', async () => {
      const task = {
        ...mockTasks[1],
        description: 'implement user authentication and authorization'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.businessDomainTags).toContain('安全');
    });
  });

  describe('上下文标签生成', () => {
    it('应该基于项目生成上下文标签', async () => {
      const task = {
        ...mockTasks[0],
        project_id: 1
      };

      const result = await generator.generateTags(task);

      // 应该包含项目中常见的标签
      expect(result.analysis.contextualTags.length).toBeGreaterThan(0);
    });

    it('应该包含优先级标签', async () => {
      const task = {
        ...mockTasks[0],
        priority: 'high'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.contextualTags).toContain('high');
    });

    it('应该包含状态相关标签', async () => {
      const task = {
        ...mockTasks[0],
        status: 'in_progress'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.contextualTags).toContain('进行中');
    });
  });

  describe('语义相关标签', () => {
    it('应该基于现有标签频率生成语义标签', async () => {
      const task = {
        ...mockTasks[0],
        title: '前端组件重构',
        description: '重构React组件，优化性能'
      };

      const result = await generator.generateTags(task);

      // 应该找到与"React"、"前端"相关的语义标签
      const semanticSuggestions = result.suggestedTags.filter(s => s.type === 'semantic');
      expect(semanticSuggestions.length).toBeGreaterThan(0);
    });

    it('应该计算正确的语义相似度', async () => {
      const task = {
        ...mockTasks[0],
        description: 'TypeScript React开发'
      };

      const result = await generator.generateTags(task);

      const suggestions = result.suggestedTags;
      const hasReactRelated = suggestions.some(s => 
        s.tag.toLowerCase().includes('react') || 
        s.tag.toLowerCase().includes('typescript')
      );
      expect(hasReactRelated).toBe(true);
    });
  });

  describe('标签建议生成', () => {
    it('应该生成多种类型的标签建议', async () => {
      const task = {
        ...mockTasks[0],
        title: 'React TypeScript开发',
        description: '实现用户认证功能，使用JWT token'
      };

      const result = await generator.generateTags(task);

      const suggestionTypes = new Set(result.suggestedTags.map(s => s.type));
      expect(suggestionTypes.size).toBeGreaterThan(1);
      expect(suggestionTypes.has('tech_stack')).toBe(true);
    });

    it('应该按置信度排序建议', async () => {
      const task = {
        ...mockTasks[0],
        description: 'React development with TypeScript'
      };

      const result = await generator.generateTags(task);

      for (let i = 1; i < result.suggestedTags.length; i++) {
        expect(result.suggestedTags[i-1].confidence).toBeGreaterThanOrEqual(
          result.suggestedTags[i].confidence
        );
      }
    });

    it('应该限制建议数量', async () => {
      const task = {
        ...mockTasks[0],
        description: 'React Vue Angular TypeScript JavaScript HTML CSS Node.js Python Go Java'
      };

      const result = await generator.generateTags(task);

      expect(result.suggestedTags.length).toBeLessThanOrEqual(8);
    });

    it('应该去除重复标签', async () => {
      const task = {
        ...mockTasks[0],
        description: 'React React React development'
      };

      const result = await generator.generateTags(task);

      const tags = result.suggestedTags.map(s => s.tag.toLowerCase());
      const uniqueTags = new Set(tags);
      expect(tags.length).toBe(uniqueTags.size);
    });

    it('应该为高质量建议提供高置信度', async () => {
      const task = {
        ...mockTasks[1],
        title: 'Go API开发',
        description: '使用Go语言和Gin框架开发REST API'
      };

      const result = await generator.generateTags(task);

      expect(result.confidence).toBeGreaterThan(0.7);
      const highConfidenceTags = result.suggestedTags.filter(s => s.confidence > 0.8);
      expect(highConfidenceTags.length).toBeGreaterThan(0);
    });
  });

  describe('整体分析质量', () => {
    it('应该为明确的技术任务提供高置信度', async () => {
      const task = {
        ...mockTasks[0],
        title: 'React TypeScript组件开发',
        description: '使用React和TypeScript开发可复用的UI组件'
      };

      const result = await generator.generateTags(task);

      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.suggestedTags.length).toBeGreaterThan(3);
    });

    it('应该为模糊任务提供低置信度', async () => {
      const task = {
        ...mockTasks[0],
        title: '其他工作',
        description: '完成一些杂项任务'
      };

      const result = await generator.generateTags(task);

      expect(result.confidence).toBeLessThan(0.6);
    });

    it('应该生成合理的推理说明', async () => {
      const task = {
        ...mockTasks[0],
        description: '使用React开发前端组件'
      };

      const result = await generator.generateTags(task);

      expect(result.analysis.reasoning).toContain('关键词');
      expect(result.analysis.reasoning).toContain('技术栈');
      expect(result.analysis.reasoning.length).toBeGreaterThan(10);
    });

    it('应该包含标签使用频率信息', async () => {
      const task = {
        ...mockTasks[0],
        description: 'React开发任务'
      };

      const result = await generator.generateTags(task);

      const reactSuggestion = result.suggestedTags.find(s => 
        s.tag.toLowerCase().includes('react')
      );
      
      if (reactSuggestion) {
        expect(reactSuggestion.frequency).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空描述的任务', async () => {
      const task = {
        ...mockTasks[0],
        description: ''
      };

      const result = await generator.generateTags(task);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('应该处理只有标题的任务', async () => {
      const task = {
        ...mockTasks[0],
        title: 'React开发',
        description: ''
      };

      const result = await generator.generateTags(task);

      expect(result.suggestedTags.length).toBeGreaterThan(0);
    });

    it('应该处理特殊字符和标点', async () => {
      const task = {
        ...mockTasks[0],
        description: 'React@2024 & TypeScript!!! (frontend) - development...'
      };

      const result = await generator.generateTags(task);

      expect(result).toBeDefined();
      expect(result.suggestedTags.length).toBeGreaterThan(0);
    });

    it('应该处理中英文混合内容', async () => {
      const task = {
        ...mockTasks[0],
        description: '使用React和TypeScript开发frontend application'
      };

      const result = await generator.generateTags(task);

      expect(result.suggestedTags.length).toBeGreaterThan(0);
      const tags = result.suggestedTags.map(s => s.tag);
      const hasChineseTags = tags.some(tag => /[\u4e00-\u9fff]/.test(tag));
      const hasEnglishTags = tags.some(tag => /[a-zA-Z]/.test(tag));
      
      expect(hasChineseTags || hasEnglishTags).toBe(true);
    });

    it('应该处理空任务列表', async () => {
      generator.setTaskContext([]);

      const task = mockTasks[0];
      const result = await generator.generateTags(task);

      expect(result).toBeDefined();
      expect(result.analysis.contextualTags).toHaveLength(0);
    });

    it('应该处理超长文本', async () => {
      const longDescription = 'React '.repeat(1000) + 'development task';
      const task = {
        ...mockTasks[0],
        description: longDescription
      };

      const result = await generator.generateTags(task);

      expect(result).toBeDefined();
      expect(result.suggestedTags.length).toBeLessThanOrEqual(8);
    });
  });
});