/**
 * AI Dependency Analyzer Service
 * 
 * This service implements AI algorithms to automatically analyze task descriptions
 * and identify potential dependencies between tasks using natural language processing
 * and smart matching algorithms.
 */

import { Task } from '../types/task';

// 依赖关系分析结果接口
export interface DependencyAnalysisResult {
  taskId: number;
  suggestedDependencies: DependencySuggestion[];
  confidence: number; // 0-1, overall confidence score
  analysis: {
    keywordsFound: string[];
    matchingTasks: TaskMatch[];
    reasoning: string;
  };
}

// 依赖建议接口
export interface DependencySuggestion {
  targetTaskId: number;
  targetTaskTitle: string;
  confidence: number; // 0-1, confidence for this specific suggestion
  reason: string; // Human-readable explanation
  type: 'keyword' | 'semantic' | 'sequential' | 'reference';
}

// 任务匹配接口
export interface TaskMatch {
  taskId: number;
  taskTitle: string;
  matchScore: number;
  matchType: 'title' | 'keyword' | 'id_reference';
  matchedText: string;
}

// 依赖关键词配置
const DEPENDENCY_KEYWORDS = {
  // 直接依赖关键词
  direct: [
    '需要先完成', '依赖于', '基于', '前置条件', '先决条件',
    '需要等待', '依赖', '基础是', '前提是', '建立在',
    'depends on', 'based on', 'requires', 'after', 'following'
  ],
  // 序列关键词  
  sequential: [
    '然后', '接下来', '之后', '随后', '完成后',
    '第一步', '第二步', '第三步', '最后',
    'then', 'next', 'after', 'following', 'subsequently'
  ],
  // 引用关键词
  reference: [
    '任务', 'task', 'ID', '#', '编号', '第', '项'
  ]
};

// 任务ID提取正则表达式
const TASK_ID_PATTERNS = [
  /(?:任务|task|ID)\s*[#\s]*(\d+)/gi,
  /#(\d+)/g,
  /(?:第|第)(\d+)(?:个|项|任务)/g,
  /(?:编号|ID|id)\s*:?\s*(\d+)/gi
];

export class AIDependencyAnalyzer {
  private allTasks: Task[] = [];
  
  /**
   * 设置分析上下文中的所有任务
   */
  setTaskContext(tasks: Task[]): void {
    this.allTasks = tasks;
  }

  /**
   * 分析任务依赖关系
   */
  async analyzeDependencies(task: Task): Promise<DependencyAnalysisResult> {
    const analysis = {
      keywordsFound: [] as string[],
      matchingTasks: [] as TaskMatch[],
      reasoning: ''
    };

    // 1. 提取文本内容进行分析
    const textContent = `${task.title} ${task.description || ''}`.toLowerCase();
    
    // 2. 关键词识别
    const foundKeywords = this.extractDependencyKeywords(textContent);
    analysis.keywordsFound = foundKeywords;

    // 3. 任务ID引用识别
    const idReferences = this.extractTaskIdReferences(textContent);

    // 4. 任务标题智能匹配
    const titleMatches = this.findSimilarTasks(task);

    // 5. 语义相关性分析
    const semanticMatches = this.analyzeSemanticRelations(task);

    // 6. 合并所有匹配结果
    const allMatches = [
      ...idReferences,
      ...titleMatches,
      ...semanticMatches
    ];

    analysis.matchingTasks = allMatches;

    // 7. 生成依赖建议
    const suggestions = this.generateDependencySuggestions(
      task,
      allMatches,
      foundKeywords
    );

    // 8. 计算整体置信度
    const confidence = this.calculateOverallConfidence(suggestions, foundKeywords);

    // 9. 生成推理说明
    analysis.reasoning = this.generateReasoning(suggestions, foundKeywords, allMatches);

    return {
      taskId: task.id,
      suggestedDependencies: suggestions,
      confidence,
      analysis
    };
  }

  /**
   * 提取依赖关键词
   */
  private extractDependencyKeywords(text: string): string[] {
    const found: string[] = [];
    
    Object.values(DEPENDENCY_KEYWORDS).flat().forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    });

    return found;
  }

  /**
   * 提取任务ID引用
   */
  private extractTaskIdReferences(text: string): TaskMatch[] {
    const matches: TaskMatch[] = [];
    
    TASK_ID_PATTERNS.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const taskId = parseInt(match[1]);
        const referencedTask = this.allTasks.find(t => t.id === taskId);
        
        if (referencedTask) {
          matches.push({
            taskId: referencedTask.id,
            taskTitle: referencedTask.title,
            matchScore: 0.9, // 高置信度：直接ID引用
            matchType: 'id_reference',
            matchedText: match[0]
          });
        }
      }
    });

    return matches;
  }

  /**
   * 查找标题相似的任务
   */
  private findSimilarTasks(currentTask: Task): TaskMatch[] {
    const matches: TaskMatch[] = [];
    const currentTitle = currentTask.title.toLowerCase();
    const currentWords = this.extractKeyWords(currentTitle);

    this.allTasks.forEach(task => {
      if (task.id === currentTask.id) return; // 跳过自己

      const taskTitle = task.title.toLowerCase();
      const taskWords = this.extractKeyWords(taskTitle);
      
      // 计算词汇重叠度
      const overlap = this.calculateWordOverlap(currentWords, taskWords);
      
      if (overlap > 0.3) { // 30%以上重叠度才考虑
        matches.push({
          taskId: task.id,
          taskTitle: task.title,
          matchScore: overlap,
          matchType: 'title',
          matchedText: this.findMatchedWords(currentWords, taskWords).join(', ')
        });
      }
    });

    // 按匹配分数排序
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * 分析语义相关性
   */
  private analyzeSemanticRelations(currentTask: Task): TaskMatch[] {
    const matches: TaskMatch[] = [];
    const currentText = `${currentTask.title} ${currentTask.description || ''}`.toLowerCase();
    
    // 技术栈相关性分析
    const techStackKeywords = [
      'frontend', 'backend', 'database', 'api', 'ui', 'service',
      '前端', '后端', '数据库', '接口', '界面', '服务'
    ];

    // 功能模块相关性分析
    const moduleKeywords = [
      'user', 'auth', 'login', 'task', 'project', 'timer',
      '用户', '认证', '登录', '任务', '项目', '计时'
    ];

    this.allTasks.forEach(task => {
      if (task.id === currentTask.id) return;

      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      
      // 技术栈匹配
      const techScore = this.calculateKeywordScore(currentText, taskText, techStackKeywords);
      
      // 功能模块匹配
      const moduleScore = this.calculateKeywordScore(currentText, taskText, moduleKeywords);
      
      const totalScore = (techScore + moduleScore) / 2;
      
      if (totalScore > 0.2) { // 20%以上相关性
        matches.push({
          taskId: task.id,
          taskTitle: task.title,
          matchScore: totalScore,
          matchType: 'keyword',
          matchedText: `技术栈: ${techScore.toFixed(2)}, 模块: ${moduleScore.toFixed(2)}`
        });
      }
    });

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * 生成依赖建议
   */
  private generateDependencySuggestions(
    task: Task,
    matches: TaskMatch[],
    keywords: string[]
  ): DependencySuggestion[] {
    const suggestions: DependencySuggestion[] = [];

    matches.forEach(match => {
      let confidence = match.matchScore;
      let type: DependencySuggestion['type'] = 'semantic';
      let reason = '';

      // 根据匹配类型调整置信度和说明
      switch (match.matchType) {
        case 'id_reference':
          confidence = 0.9;
          type = 'reference';
          reason = `任务描述中直接引用了任务ID ${match.taskId}`;
          break;
        case 'title':
          confidence = Math.min(0.8, match.matchScore + 0.2);
          type = 'semantic';
          reason = `任务标题存在高度相似性: "${match.matchedText}"`;
          break;
        case 'keyword':
          confidence = Math.min(0.7, match.matchScore + 0.3);
          type = 'keyword';
          reason = `存在相关技术栈或功能模块关联: ${match.matchedText}`;
          break;
      }

      // 如果存在依赖关键词，提升置信度
      if (keywords.length > 0) {
        confidence = Math.min(0.95, confidence + 0.1);
        reason += ` (检测到依赖关键词: ${keywords.slice(0, 2).join(', ')})`;
      }

      // 过滤低置信度建议
      if (confidence > 0.3) {
        suggestions.push({
          targetTaskId: match.taskId,
          targetTaskTitle: match.taskTitle,
          confidence,
          reason,
          type
        });
      }
    });

    // 按置信度排序，返回前5个建议
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(
    suggestions: DependencySuggestion[],
    keywords: string[]
  ): number {
    if (suggestions.length === 0) return 0;

    // 基础置信度：建议的平均置信度
    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
    
    // 关键词加权
    const keywordBonus = Math.min(0.2, keywords.length * 0.1);
    
    // 建议数量加权
    const suggestionBonus = Math.min(0.1, suggestions.length * 0.02);

    return Math.min(0.95, avgConfidence + keywordBonus + suggestionBonus);
  }

  /**
   * 生成推理说明
   */
  private generateReasoning(
    suggestions: DependencySuggestion[],
    keywords: string[],
    matches: TaskMatch[]
  ): string {
    if (suggestions.length === 0) {
      return '未发现明确的依赖关系指示。任务描述中缺少依赖关键词或相关任务引用。';
    }

    const parts = [];

    if (keywords.length > 0) {
      parts.push(`检测到 ${keywords.length} 个依赖关键词: ${keywords.slice(0, 3).join(', ')}`);
    }

    if (matches.length > 0) {
      const idRefs = matches.filter(m => m.matchType === 'id_reference').length;
      const titleRefs = matches.filter(m => m.matchType === 'title').length;
      const keywordRefs = matches.filter(m => m.matchType === 'keyword').length;

      const refParts = [];
      if (idRefs > 0) refParts.push(`${idRefs}个直接ID引用`);
      if (titleRefs > 0) refParts.push(`${titleRefs}个标题相似任务`);
      if (keywordRefs > 0) refParts.push(`${keywordRefs}个语义相关任务`);

      parts.push(`发现 ${refParts.join('、')}`);
    }

    parts.push(`生成 ${suggestions.length} 个依赖建议，最高置信度 ${Math.max(...suggestions.map(s => s.confidence)).toFixed(2)}`);

    return parts.join('。') + '。';
  }

  // 工具方法

  /**
   * 提取关键词
   */
  private extractKeyWords(text: string): string[] {
    // 移除标点符号，分割单词
    return text
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .map(word => word.toLowerCase());
  }

  /**
   * 计算词汇重叠度
   */
  private calculateWordOverlap(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 查找匹配的词汇
   */
  private findMatchedWords(words1: string[], words2: string[]): string[] {
    const set2 = new Set(words2);
    return words1.filter(word => set2.has(word));
  }

  /**
   * 计算关键词匹配分数
   */
  private calculateKeywordScore(text1: string, text2: string, keywords: string[]): number {
    let score = 0;
    let total = 0;

    keywords.forEach(keyword => {
      total++;
      if (text1.includes(keyword) && text2.includes(keyword)) {
        score++;
      }
    });

    return total > 0 ? score / total : 0;
  }
}

// 导出单例实例
export const aiDependencyAnalyzer = new AIDependencyAnalyzer();