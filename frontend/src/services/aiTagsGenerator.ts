/**
 * AI Tags Generator Service
 * 
 * This service implements AI algorithms to automatically generate relevant tags
 * for tasks based on their title, description, and context using keyword extraction,
 * technical stack identification, and business domain classification.
 */

import { Task } from '../types/task';

// 标签生成结果接口
export interface TagsGenerationResult {
  taskId: number;
  suggestedTags: TagSuggestion[];
  confidence: number; // 0-1, overall confidence score
  analysis: {
    extractedKeywords: KeywordExtraction[];
    techStackTags: string[];
    businessDomainTags: string[];
    contextualTags: string[];
    reasoning: string;
  };
}

// 标签建议接口
export interface TagSuggestion {
  tag: string;
  confidence: number; // 0-1, confidence for this specific tag
  type: 'keyword' | 'tech_stack' | 'business_domain' | 'contextual' | 'semantic';
  reason: string; // Human-readable explanation
  frequency?: number; // How often this tag appears in similar tasks
}

// 关键词提取结果接口
export interface KeywordExtraction {
  keyword: string;
  score: number; // TF-IDF score
  frequency: number;
  category: 'noun' | 'verb' | 'adjective' | 'technical';
}

// 技术栈关键词库
const TECH_STACK_KEYWORDS = {
  frontend: {
    frameworks: ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt'],
    languages: ['javascript', 'typescript', 'js', 'ts', 'html', 'css'],
    tools: ['webpack', 'vite', 'babel', 'eslint', 'prettier'],
    chinese: ['前端', '界面', 'UI', '用户界面', '网页', '浏览器']
  },
  backend: {
    frameworks: ['express', 'gin', 'spring', 'django', 'flask', 'fastapi'],
    languages: ['go', 'golang', 'python', 'java', 'node.js', 'php', 'rust'],
    tools: ['api', 'rest', 'graphql', 'grpc', 'microservice'],
    chinese: ['后端', '服务器', '接口', 'API', '服务', '微服务']
  },
  database: {
    sql: ['mysql', 'postgresql', 'sqlite', 'oracle', 'sql server'],
    nosql: ['mongodb', 'redis', 'elasticsearch', 'cassandra'],
    tools: ['migration', 'schema', 'index', 'query'],
    chinese: ['数据库', '数据', '存储', '查询', '索引']
  },
  devops: {
    containers: ['docker', 'kubernetes', 'k8s', 'container'],
    ci_cd: ['jenkins', 'github actions', 'gitlab ci', 'travis', 'circleci'],
    cloud: ['aws', 'azure', 'gcp', 'alicloud', 'tencent cloud'],
    chinese: ['部署', '运维', '容器', '云服务', '自动化']
  },
  testing: {
    types: ['unit test', 'integration test', 'e2e', 'performance test'],
    tools: ['jest', 'mocha', 'cypress', 'selenium', 'playwright'],
    chinese: ['测试', '单元测试', '集成测试', '性能测试']
  }
};

// 业务领域关键词库
const BUSINESS_DOMAIN_KEYWORDS = {
  development: {
    keywords: ['implement', 'develop', 'code', 'build', 'create', 'feature'],
    chinese: ['开发', '实现', '编写', '构建', '创建', '功能']
  },
  design: {
    keywords: ['design', 'ui', 'ux', 'layout', 'wireframe', 'mockup'],
    chinese: ['设计', '界面设计', '用户体验', '布局', '原型']
  },
  testing: {
    keywords: ['test', 'verify', 'validate', 'check', 'debug'],
    chinese: ['测试', '验证', '检查', '调试', '质量保证']
  },
  deployment: {
    keywords: ['deploy', 'release', 'publish', 'launch', 'production'],
    chinese: ['部署', '发布', '上线', '生产环境']
  },
  maintenance: {
    keywords: ['fix', 'bug', 'optimize', 'refactor', 'upgrade'],
    chinese: ['修复', '优化', '重构', '升级', '维护']
  },
  documentation: {
    keywords: ['document', 'readme', 'guide', 'tutorial', 'specification'],
    chinese: ['文档', '说明', '指南', '教程', '规范']
  },
  security: {
    keywords: ['security', 'auth', 'authentication', 'authorization', 'encryption'],
    chinese: ['安全', '认证', '授权', '加密', '权限']
  }
};

// 优先级关键词
const PRIORITY_KEYWORDS = {
  high: ['urgent', 'critical', 'important', 'asap', 'priority', '紧急', '重要', '关键', '优先'],
  medium: ['normal', 'standard', 'regular', '正常', '标准', '常规'],
  low: ['low', 'minor', 'optional', 'nice to have', '低', '次要', '可选']
};

// 停用词列表
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  '的', '了', '在', '是', '我', '你', '他', '她', '它', '我们', '你们', '他们', '这', '那',
  '有', '没', '不', '也', '都', '很', '就', '还', '只', '从', '把', '被', '让', '给'
]);

export class AITagsGenerator {
  private allTasks: Task[] = [];
  private existingTags: Map<string, number> = new Map(); // tag -> frequency
  
  /**
   * 设置标签生成上下文
   */
  setTaskContext(tasks: Task[]): void {
    this.allTasks = tasks;
    this.updateExistingTagsFrequency();
  }

  /**
   * 更新现有标签频率统计
   */
  private updateExistingTagsFrequency(): void {
    this.existingTags.clear();
    
    this.allTasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          this.existingTags.set(normalizedTag, (this.existingTags.get(normalizedTag) || 0) + 1);
        });
      }
    });
  }

  /**
   * 生成AI标签建议
   */
  async generateTags(task: Task): Promise<TagsGenerationResult> {
    const analysis = {
      extractedKeywords: [] as KeywordExtraction[],
      techStackTags: [] as string[],
      businessDomainTags: [] as string[],
      contextualTags: [] as string[],
      reasoning: ''
    };

    // 1. 提取文本内容
    const textContent = `${task.title} ${task.description || ''}`;
    
    // 2. 关键词提取 (TF-IDF)
    const keywords = this.extractKeywords(textContent);
    analysis.extractedKeywords = keywords;

    // 3. 技术栈识别
    const techStackTags = this.identifyTechStack(textContent);
    analysis.techStackTags = techStackTags;

    // 4. 业务领域分类
    const businessDomainTags = this.classifyBusinessDomain(textContent);
    analysis.businessDomainTags = businessDomainTags;

    // 5. 上下文标签 (基于项目和其他任务)
    const contextualTags = this.generateContextualTags(task);
    analysis.contextualTags = contextualTags;

    // 6. 生成标签建议
    const suggestions = this.generateTagSuggestions(
      keywords,
      techStackTags,
      businessDomainTags,
      contextualTags,
      textContent
    );

    // 7. 计算整体置信度
    const confidence = this.calculateOverallConfidence(suggestions);

    // 8. 生成推理说明
    analysis.reasoning = this.generateReasoning(suggestions, analysis);

    return {
      taskId: task.id,
      suggestedTags: suggestions,
      confidence,
      analysis
    };
  }

  /**
   * 关键词提取 (简化版TF-IDF)
   */
  private extractKeywords(text: string): KeywordExtraction[] {
    const words = this.tokenize(text);
    const wordFreq = new Map<string, number>();
    
    // 计算词频
    words.forEach(word => {
      if (!STOP_WORDS.has(word) && word.length > 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // 计算TF-IDF分数
    const keywords: KeywordExtraction[] = [];
    const totalWords = words.length;
    
    wordFreq.forEach((freq, word) => {
      const tf = freq / totalWords;
      const idf = this.calculateIDF(word);
      const score = tf * idf;
      
      if (score > 0.01) { // 阈值过滤
        keywords.push({
          keyword: word,
          score,
          frequency: freq,
          category: this.categorizeWord(word)
        });
      }
    });

    // 按分数排序，返回前10个
    return keywords
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * 计算逆文档频率 (简化版)
   */
  private calculateIDF(word: string): number {
    const totalDocs = this.allTasks.length || 1;
    let docsWithWord = 0;

    this.allTasks.forEach(task => {
      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      if (taskText.includes(word)) {
        docsWithWord++;
      }
    });

    return Math.log(totalDocs / (docsWithWord + 1));
  }

  /**
   * 技术栈识别
   */
  private identifyTechStack(text: string): string[] {
    const lowerText = text.toLowerCase();
    const identifiedTags: string[] = [];

    Object.entries(TECH_STACK_KEYWORDS).forEach(([category, subcategories]) => {
      Object.values(subcategories).flat().forEach(keyword => {
        if (lowerText.includes(keyword.toLowerCase())) {
          // 映射到标准标签
          const mappedTag = this.mapToStandardTag(keyword, category);
          if (mappedTag && !identifiedTags.includes(mappedTag)) {
            identifiedTags.push(mappedTag);
          }
        }
      });
    });

    return identifiedTags;
  }

  /**
   * 业务领域分类
   */
  private classifyBusinessDomain(text: string): string[] {
    const lowerText = text.toLowerCase();
    const identifiedDomains: string[] = [];

    Object.entries(BUSINESS_DOMAIN_KEYWORDS).forEach(([domain, config]) => {
      const allKeywords = [...config.keywords, ...config.chinese];
      const matchCount = allKeywords.filter(keyword => 
        lowerText.includes(keyword.toLowerCase())
      ).length;

      if (matchCount > 0) {
        // 将域名映射为中文标签
        const domainTag = this.mapDomainToTag(domain);
        if (domainTag && !identifiedDomains.includes(domainTag)) {
          identifiedDomains.push(domainTag);
        }
      }
    });

    return identifiedDomains;
  }

  /**
   * 生成上下文标签
   */
  private generateContextualTags(task: Task): string[] {
    const contextualTags: string[] = [];

    // 基于项目的标签
    if (task.project_id) {
      const projectTasks = this.allTasks.filter(t => t.project_id === task.project_id);
      const commonTags = this.findCommonTags(projectTasks);
      contextualTags.push(...commonTags.slice(0, 3)); // 最多3个项目相关标签
    }

    // 基于优先级的标签
    if (task.priority) {
      contextualTags.push(task.priority);
    }

    // 基于状态的标签
    const statusTag = this.mapStatusToTag(task.status);
    if (statusTag) {
      contextualTags.push(statusTag);
    }

    return Array.from(new Set(contextualTags)); // 去重
  }

  /**
   * 生成标签建议
   */
  private generateTagSuggestions(
    keywords: KeywordExtraction[],
    techStackTags: string[],
    businessDomainTags: string[],
    contextualTags: string[],
    text: string
  ): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];

    // 从关键词生成标签
    keywords.slice(0, 5).forEach(keyword => {
      suggestions.push({
        tag: keyword.keyword,
        confidence: Math.min(0.8, keyword.score * 10),
        type: 'keyword',
        reason: `高频关键词，TF-IDF分数: ${keyword.score.toFixed(3)}`,
        frequency: this.existingTags.get(keyword.keyword.toLowerCase()) || 0
      });
    });

    // 技术栈标签
    techStackTags.forEach(tag => {
      suggestions.push({
        tag,
        confidence: 0.9,
        type: 'tech_stack',
        reason: `检测到技术栈关键词`,
        frequency: this.existingTags.get(tag.toLowerCase()) || 0
      });
    });

    // 业务领域标签
    businessDomainTags.forEach(tag => {
      suggestions.push({
        tag,
        confidence: 0.85,
        type: 'business_domain',
        reason: `业务领域分类匹配`,
        frequency: this.existingTags.get(tag.toLowerCase()) || 0
      });
    });

    // 上下文标签
    contextualTags.forEach(tag => {
      suggestions.push({
        tag,
        confidence: 0.7,
        type: 'contextual',
        reason: `基于项目和任务上下文`,
        frequency: this.existingTags.get(tag.toLowerCase()) || 0
      });
    });

    // 语义相关标签 (基于现有标签频率)
    const semanticTags = this.generateSemanticTags(text);
    semanticTags.forEach(tag => {
      suggestions.push({
        tag: tag.tag,
        confidence: tag.confidence,
        type: 'semantic',
        reason: `语义相关性分析`,
        frequency: tag.frequency
      });
    });

    // 去重并按置信度排序
    const uniqueSuggestions = this.deduplicateTags(suggestions);
    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // 最多返回8个建议
  }

  /**
   * 生成语义相关标签
   */
  private generateSemanticTags(text: string): TagSuggestion[] {
    const semanticTags: TagSuggestion[] = [];
    const lowerText = text.toLowerCase();

    // 基于现有标签的语义匹配
    this.existingTags.forEach((frequency, tag) => {
      if (frequency >= 2) { // 只考虑出现过至少2次的标签
        const similarity = this.calculateTextSimilarity(lowerText, tag);
        if (similarity > 0.3) {
          semanticTags.push({
            tag,
            confidence: Math.min(0.8, similarity),
            type: 'semantic',
            reason: `与现有标签语义相关 (相似度: ${(similarity * 100).toFixed(1)}%)`,
            frequency
          });
        }
      }
    });

    return semanticTags.slice(0, 3); // 最多3个语义标签
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(suggestions: TagSuggestion[]): number {
    if (suggestions.length === 0) return 0;

    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
    const techStackBonus = suggestions.filter(s => s.type === 'tech_stack').length * 0.1;
    const keywordBonus = suggestions.filter(s => s.type === 'keyword').length * 0.05;
    
    return Math.min(0.95, avgConfidence + techStackBonus + keywordBonus);
  }

  /**
   * 生成推理说明
   */
  private generateReasoning(suggestions: TagSuggestion[], analysis: any): string {
    const parts = [];

    if (analysis.extractedKeywords.length > 0) {
      parts.push(`提取了 ${analysis.extractedKeywords.length} 个关键词`);
    }

    if (analysis.techStackTags.length > 0) {
      parts.push(`识别了 ${analysis.techStackTags.length} 个技术栈标签`);
    }

    if (analysis.businessDomainTags.length > 0) {
      parts.push(`分类了 ${analysis.businessDomainTags.length} 个业务领域`);
    }

    const highConfidenceTags = suggestions.filter(s => s.confidence > 0.8).length;
    if (highConfidenceTags > 0) {
      parts.push(`生成了 ${highConfidenceTags} 个高置信度标签`);
    }

    parts.push(`总共推荐 ${suggestions.length} 个标签`);

    return parts.join('，') + '。';
  }

  // 工具方法

  /**
   * 文本分词
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * 词汇分类
   */
  private categorizeWord(word: string): KeywordExtraction['category'] {
    // 简化的词汇分类
    if (/^(get|set|create|update|delete|add|remove|build|deploy|test|fix|implement)/.test(word)) {
      return 'verb';
    }
    if (this.isTechnicalTerm(word)) {
      return 'technical';
    }
    if (/ing$|ed$|ly$/.test(word)) {
      return 'adjective';
    }
    return 'noun';
  }

  /**
   * 检查是否为技术术语
   */
  private isTechnicalTerm(word: string): boolean {
    const techTerms = Object.values(TECH_STACK_KEYWORDS)
      .flatMap(category => Object.values(category))
      .flat();
    return techTerms.some(term => term.toLowerCase().includes(word));
  }

  /**
   * 映射到标准标签
   */
  private mapToStandardTag(keyword: string, category: string): string {
    const mappings: Record<string, string> = {
      // Frontend
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      '前端': '前端',
      'UI': 'UI设计',
      
      // Backend
      'go': 'Go',
      'golang': 'Go',
      'python': 'Python',
      'java': 'Java',
      'api': 'API',
      '后端': '后端',
      '接口': 'API',
      
      // Database
      'mysql': 'MySQL',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'redis': 'Redis',
      '数据库': '数据库',
      
      // DevOps
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'k8s': 'Kubernetes',
      '部署': '部署',
      '容器': 'Docker'
    };

    return mappings[keyword.toLowerCase()] || keyword;
  }

  /**
   * 映射领域到标签
   */
  private mapDomainToTag(domain: string): string {
    const mappings: Record<string, string> = {
      'development': '开发',
      'design': '设计',
      'testing': '测试',
      'deployment': '部署',
      'maintenance': '维护',
      'documentation': '文档',
      'security': '安全'
    };

    return mappings[domain] || domain;
  }

  /**
   * 映射状态到标签
   */
  private mapStatusToTag(status: string): string | null {
    const mappings: Record<string, string> = {
      'todo': '待开始',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };

    return mappings[status] || null;
  }

  /**
   * 查找常见标签
   */
  private findCommonTags(tasks: Task[]): string[] {
    const tagFreq = new Map<string, number>();
    
    tasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          tagFreq.set(normalizedTag, (tagFreq.get(normalizedTag) || 0) + 1);
        });
      }
    });

    return Array.from(tagFreq.entries())
      .filter(([_, freq]) => freq >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, _]) => tag);
  }

  /**
   * 计算文本相似度
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 标签去重
   */
  private deduplicateTags(suggestions: TagSuggestion[]): TagSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const normalizedTag = suggestion.tag.toLowerCase();
      if (seen.has(normalizedTag)) {
        return false;
      }
      seen.add(normalizedTag);
      return true;
    });
  }
}

// 导出单例实例
export const aiTagsGenerator = new AITagsGenerator();