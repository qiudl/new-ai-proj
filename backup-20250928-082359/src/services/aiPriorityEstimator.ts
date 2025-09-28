/**
 * AI Priority and Time Estimator Service
 * 
 * This service implements AI algorithms to automatically analyze task priority
 * and estimate time requirements based on task complexity, content analysis,
 * and historical data patterns.
 */

import { Task } from '../types/task';

// 优先级分析结果接口
export interface PriorityAnalysisResult {
  taskId: number;
  suggestedPriority: 'low' | 'medium' | 'high';
  confidence: number; // 0-1, confidence score
  reasoning: string;
  factors: PriorityFactor[];
}

// 工时预估结果接口
export interface TimeEstimationResult {
  taskId: number;
  estimatedHours: number;
  confidence: number; // 0-1, confidence score
  breakdown: TimeBreakdown[];
  reasoning: string;
  similarTasks: SimilarTask[];
}

// 优先级影响因素接口
export interface PriorityFactor {
  factor: string;
  impact: 'increase' | 'decrease' | 'neutral';
  weight: number; // 0-1, factor weight
  description: string;
}

// 工时分解接口
export interface TimeBreakdown {
  phase: string;
  hours: number;
  percentage: number;
  description: string;
}

// 相似任务接口
export interface SimilarTask {
  taskId: number;
  title: string;
  similarity: number; // 0-1, similarity score
  actualHours?: number;
  estimatedHours?: number;
  priority?: string;
}

// 综合分析结果接口
export interface ComprehensiveAnalysisResult {
  taskId: number;
  priority: PriorityAnalysisResult;
  timeEstimation: TimeEstimationResult;
  overallConfidence: number;
  recommendations: string[];
}

// 优先级关键词配置
const PRIORITY_KEYWORDS = {
  high: {
    urgency: ['urgent', 'critical', 'asap', 'emergency', 'blocking', '紧急', '关键', '阻塞', '立即', '马上'],
    importance: ['important', 'crucial', 'vital', 'essential', '重要', '核心', '关键', '必须'],
    impact: ['production', 'client', 'customer', 'revenue', 'security', '生产', '客户', '收入', '安全'],
    timeline: ['deadline', 'due today', 'overdue', '截止', '今天', '逾期', '延期']
  },
  medium: {
    normal: ['normal', 'standard', 'regular', 'planned', '正常', '标准', '计划', '常规'],
    improvement: ['enhance', 'improve', 'optimize', 'refactor', '增强', '改进', '优化', '重构'],
    feature: ['feature', 'functionality', 'requirement', '功能', '需求', '特性']
  },
  low: {
    maintenance: ['cleanup', 'refactor', 'documentation', 'minor', '清理', '文档', '轻微', '维护'],
    optional: ['nice to have', 'optional', 'future', 'backlog', '可选', '将来', '待办', '非必需'],
    learning: ['research', 'study', 'investigate', 'explore', '研究', '学习', '调研', '探索']
  }
};

// 复杂度评估关键词
const COMPLEXITY_KEYWORDS = {
  high: {
    technical: ['architecture', 'algorithm', 'performance', 'scalability', '架构', '算法', '性能', '扩展'],
    integration: ['integration', 'migration', 'third-party', 'api', '集成', '迁移', '第三方'],
    scope: ['multiple', 'complex', 'advanced', 'enterprise', '多个', '复杂', '高级', '企业级']
  },
  medium: {
    development: ['implement', 'develop', 'create', 'build', '实现', '开发', '创建', '构建'],
    ui: ['interface', 'component', 'page', 'form', '界面', '组件', '页面', '表单'],
    data: ['database', 'query', 'model', 'schema', '数据库', '查询', '模型', '结构']
  },
  low: {
    simple: ['simple', 'basic', 'minor', 'small', '简单', '基础', '轻微', '小'],
    config: ['config', 'setting', 'parameter', 'variable', '配置', '设置', '参数', '变量'],
    fix: ['fix', 'bug', 'patch', 'correction', '修复', '错误', '补丁', '纠正']
  }
};

// 工时预估基准
const TIME_ESTIMATION_BASE = {
  // 基础任务类型工时 (小时)
  taskTypes: {
    'simple_fix': { min: 0.5, max: 2, avg: 1 },
    'feature_small': { min: 2, max: 8, avg: 4 },
    'feature_medium': { min: 8, max: 24, avg: 16 },
    'feature_large': { min: 24, max: 80, avg: 40 },
    'research': { min: 2, max: 16, avg: 8 },
    'design': { min: 4, max: 16, avg: 8 },
    'testing': { min: 1, max: 8, avg: 4 },
    'documentation': { min: 1, max: 8, avg: 3 },
    'deployment': { min: 2, max: 8, avg: 4 }
  },
  // 技术栈复杂度系数
  techStackMultiplier: {
    'frontend': 1.0,
    'backend': 1.2,
    'database': 1.3,
    'devops': 1.4,
    'ai_ml': 1.8,
    'integration': 1.5
  },
  // 经验系数 (基于团队经验)
  experienceMultiplier: {
    'expert': 0.7,
    'experienced': 0.85,
    'intermediate': 1.0,
    'beginner': 1.5
  }
};

export class AIPriorityEstimator {
  private allTasks: Task[] = [];
  private historicalData: Map<string, number> = new Map(); // taskType -> avgHours
  
  /**
   * 设置分析上下文
   */
  setTaskContext(tasks: Task[]): void {
    this.allTasks = tasks;
    this.updateHistoricalData();
  }

  /**
   * 更新历史数据统计
   */
  private updateHistoricalData(): void {
    this.historicalData.clear();
    
    // 统计不同类型任务的平均工时
    const taskGroups = new Map<string, number[]>();
    
    this.allTasks.forEach(task => {
      if (task.estimated_hours && task.estimated_hours > 0) {
        const taskType = this.classifyTaskType(task);
        if (!taskGroups.has(taskType)) {
          taskGroups.set(taskType, []);
        }
        taskGroups.get(taskType)!.push(task.estimated_hours);
      }
    });

    // 计算平均值
    taskGroups.forEach((hours, taskType) => {
      const avgHours = hours.reduce((sum, h) => sum + h, 0) / hours.length;
      this.historicalData.set(taskType, avgHours);
    });
  }

  /**
   * 综合分析优先级和工时
   */
  async analyzeTask(task: Task): Promise<ComprehensiveAnalysisResult> {
    // 并行执行优先级分析和工时预估
    const [priorityResult, timeResult] = await Promise.all([
      this.analyzePriority(task),
      this.estimateTime(task)
    ]);

    // 计算整体置信度
    const overallConfidence = (priorityResult.confidence + timeResult.confidence) / 2;

    // 生成综合建议
    const recommendations = this.generateRecommendations(priorityResult, timeResult);

    return {
      taskId: task.id,
      priority: priorityResult,
      timeEstimation: timeResult,
      overallConfidence,
      recommendations
    };
  }

  /**
   * 分析任务优先级
   */
  async analyzePriority(task: Task): Promise<PriorityAnalysisResult> {
    const textContent = `${task.title} ${task.description || ''}`.toLowerCase();
    const factors: PriorityFactor[] = [];

    // 1. 关键词分析
    const keywordFactors = this.analyzeKeywordPriority(textContent);
    factors.push(...keywordFactors);

    // 2. 项目上下文分析
    const contextFactors = this.analyzeProjectContext(task);
    factors.push(...contextFactors);

    // 3. 时间因素分析
    const timeFactors = this.analyzeTimeFactor(task);
    factors.push(...timeFactors);

    // 4. 依赖关系分析
    const dependencyFactors = this.analyzeDependencyFactor(task);
    factors.push(...dependencyFactors);

    // 5. 计算综合优先级
    const priorityScore = this.calculatePriorityScore(factors);
    const suggestedPriority = this.mapScoreToPriority(priorityScore);

    // 6. 计算置信度
    const confidence = this.calculatePriorityConfidence(factors, textContent);

    // 7. 生成推理说明
    const reasoning = this.generatePriorityReasoning(factors, suggestedPriority);

    return {
      taskId: task.id,
      suggestedPriority,
      confidence,
      reasoning,
      factors
    };
  }

  /**
   * 预估任务工时
   */
  async estimateTime(task: Task): Promise<TimeEstimationResult> {
    const textContent = `${task.title} ${task.description || ''}`.toLowerCase();

    // 1. 任务类型分类
    const taskType = this.classifyTaskType(task);

    // 2. 复杂度分析
    const complexity = this.analyzeComplexity(textContent);

    // 3. 技术栈分析
    const techStack = this.analyzeTechStack(textContent);

    // 4. 查找相似任务
    const similarTasks = this.findSimilarTasks(task);

    // 5. 基础工时估算
    const baseEstimation = this.getBaseTimeEstimation(taskType, complexity);

    // 6. 应用调整系数
    const adjustedEstimation = this.applyTimeAdjustments(
      baseEstimation,
      techStack,
      similarTasks,
      complexity
    );

    // 7. 生成工时分解
    const breakdown = this.generateTimeBreakdown(adjustedEstimation, taskType);

    // 8. 计算置信度
    const confidence = this.calculateTimeConfidence(similarTasks, taskType, complexity);

    // 9. 生成推理说明
    const reasoning = this.generateTimeReasoning(
      taskType,
      complexity,
      techStack,
      similarTasks,
      adjustedEstimation
    );

    return {
      taskId: task.id,
      estimatedHours: Math.round(adjustedEstimation * 10) / 10, // 保留一位小数
      confidence,
      breakdown,
      reasoning,
      similarTasks
    };
  }

  /**
   * 关键词优先级分析
   */
  private analyzeKeywordPriority(text: string): PriorityFactor[] {
    const factors: PriorityFactor[] = [];

    Object.entries(PRIORITY_KEYWORDS).forEach(([priority, categories]) => {
      Object.entries(categories).forEach(([category, keywords]) => {
        const matches = keywords.filter(keyword => text.includes(keyword.toLowerCase()));
        
        if (matches.length > 0) {
          const impact = priority === 'high' ? 'increase' : 
                        priority === 'low' ? 'decrease' : 'neutral';
          const weight = matches.length * (priority === 'high' ? 0.8 : 
                                         priority === 'medium' ? 0.5 : 0.3);

          factors.push({
            factor: `${category}_keywords`,
            impact,
            weight: Math.min(weight, 1.0),
            description: `检测到${priority}优先级关键词: ${matches.join(', ')}`
          });
        }
      });
    });

    return factors;
  }

  /**
   * 项目上下文分析
   */
  private analyzeProjectContext(task: Task): PriorityFactor[] {
    const factors: PriorityFactor[] = [];

    // 分析项目中其他任务的优先级分布
    const projectTasks = this.allTasks.filter(t => t.project_id === task.project_id);
    const priorityDistribution = this.calculatePriorityDistribution(projectTasks);

    // 如果项目中高优先级任务较多，稍微降低当前任务优先级
    if (priorityDistribution.high > 0.6) {
      factors.push({
        factor: 'project_high_priority_saturation',
        impact: 'decrease',
        weight: 0.3,
        description: '项目中已有较多高优先级任务，建议平衡优先级分配'
      });
    }

    // 分析任务在项目中的位置
    if (task.parent_id) {
      const parentTask = this.allTasks.find(t => t.id === task.parent_id);
      if (parentTask && parentTask.priority === 'high') {
        factors.push({
          factor: 'parent_high_priority',
          impact: 'increase',
          weight: 0.6,
          description: '父任务为高优先级，子任务继承高优先级特征'
        });
      }
    }

    return factors;
  }

  /**
   * 时间因素分析
   */
  private analyzeTimeFactor(task: Task): PriorityFactor[] {
    const factors: PriorityFactor[] = [];

    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        factors.push({
          factor: 'overdue',
          impact: 'increase',
          weight: 1.0,
          description: `任务已逾期 ${Math.abs(daysUntilDue)} 天，需要立即处理`
        });
      } else if (daysUntilDue <= 1) {
        factors.push({
          factor: 'due_soon',
          impact: 'increase',
          weight: 0.9,
          description: '任务即将到期，优先级较高'
        });
      } else if (daysUntilDue <= 3) {
        factors.push({
          factor: 'due_this_week',
          impact: 'increase',
          weight: 0.6,
          description: '任务本周到期，需要适当关注'
        });
      } else if (daysUntilDue > 30) {
        factors.push({
          factor: 'due_far',
          impact: 'decrease',
          weight: 0.3,
          description: '任务截止时间较远，可以适当降低优先级'
        });
      }
    }

    return factors;
  }

  /**
   * 依赖关系分析
   */
  private analyzeDependencyFactor(task: Task): PriorityFactor[] {
    const factors: PriorityFactor[] = [];

    // 分析是否有其他任务依赖此任务
    const dependentTasks = this.allTasks.filter(t => 
      t.dependencies && Array.isArray(t.dependencies) && t.dependencies.includes(task.id)
    );

    if (dependentTasks.length > 0) {
      const highPriorityDependents = dependentTasks.filter(t => t.priority === 'high');
      
      if (highPriorityDependents.length > 0) {
        factors.push({
          factor: 'blocking_high_priority',
          impact: 'increase',
          weight: 0.8,
          description: `阻塞 ${highPriorityDependents.length} 个高优先级任务，需要优先完成`
        });
      } else if (dependentTasks.length >= 3) {
        factors.push({
          factor: 'blocking_multiple',
          impact: 'increase',
          weight: 0.6,
          description: `阻塞 ${dependentTasks.length} 个任务，建议提高优先级`
        });
      }
    }

    // 分析此任务的依赖
    if (task.dependencies && Array.isArray(task.dependencies) && task.dependencies.length > 0) {
      const incompleteDependencies = task.dependencies.filter(depId => {
        const depTask = this.allTasks.find(t => t.id === depId);
        return depTask && depTask.status !== 'completed';
      });

      if (incompleteDependencies.length > 0) {
        factors.push({
          factor: 'has_dependencies',
          impact: 'decrease',
          weight: 0.4,
          description: `依赖 ${incompleteDependencies.length} 个未完成任务，可适当降低优先级`
        });
      }
    }

    return factors;
  }

  /**
   * 计算优先级分数
   */
  private calculatePriorityScore(factors: PriorityFactor[]): number {
    let score = 0.5; // 基础分数 (medium)
    
    factors.forEach(factor => {
      const adjustment = factor.weight * (factor.impact === 'increase' ? 0.3 : 
                                        factor.impact === 'decrease' ? -0.3 : 0);
      score += adjustment;
    });

    return Math.max(0, Math.min(1, score)); // 限制在 0-1 范围
  }

  /**
   * 分数映射到优先级
   */
  private mapScoreToPriority(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * 任务类型分类
   */
  private classifyTaskType(task: Task): string {
    const text = `${task.title} ${task.description || ''}`.toLowerCase();

    // 简单修复
    if (/\b(fix|bug|patch|error)\b/.test(text)) {
      return 'simple_fix';
    }

    // 研究和调研
    if (/\b(research|study|investigate|explore|analysis)\b|研究|调研|分析|探索/.test(text)) {
      return 'research';
    }

    // 设计相关
    if (/\b(design|ui|ux|mockup|wireframe)\b|设计|界面|原型/.test(text)) {
      return 'design';
    }

    // 测试相关
    if (/\b(test|testing|qa|quality)\b|测试|质量/.test(text)) {
      return 'testing';
    }

    // 文档相关
    if (/\b(document|doc|readme|guide|manual)\b|文档|说明|指南/.test(text)) {
      return 'documentation';
    }

    // 部署相关
    if (/\b(deploy|deployment|release|publish)\b|部署|发布|上线/.test(text)) {
      return 'deployment';
    }

    // 功能开发 - 根据复杂度判断大小
    const complexity = this.analyzeComplexity(text);
    if (complexity >= 0.8) return 'feature_large';
    if (complexity >= 0.5) return 'feature_medium';
    return 'feature_small';
  }

  /**
   * 复杂度分析
   */
  private analyzeComplexity(text: string): number {
    let complexityScore = 0.3; // 基础复杂度

    Object.entries(COMPLEXITY_KEYWORDS).forEach(([level, categories]) => {
      Object.values(categories).flat().forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          const adjustment = level === 'high' ? 0.3 : level === 'medium' ? 0.15 : -0.1;
          complexityScore += adjustment;
        }
      });
    });

    // 文本长度影响复杂度
    const textLength = text.length;
    if (textLength > 500) complexityScore += 0.2;
    else if (textLength > 200) complexityScore += 0.1;

    return Math.max(0.1, Math.min(1.0, complexityScore));
  }

  /**
   * 技术栈分析
   */
  private analyzeTechStack(text: string): string[] {
    const techStacks = [];

    const patterns = {
      'frontend': /\b(react|vue|angular|javascript|typescript|html|css|ui|frontend|前端)\b/i,
      'backend': /\b(go|python|java|node|api|server|backend|后端|服务器)\b/i,
      'database': /\b(mysql|postgresql|mongodb|redis|database|sql|数据库)\b/i,
      'devops': /\b(docker|kubernetes|jenkins|ci\/cd|deployment|devops|部署|运维)\b/i,
      'ai_ml': /\b(ai|ml|machine learning|neural|algorithm|人工智能|机器学习|算法)\b/i,
      'integration': /\b(integration|api|microservice|third-party|集成|微服务|第三方)\b/i
    };

    Object.entries(patterns).forEach(([stack, pattern]) => {
      if (pattern.test(text)) {
        techStacks.push(stack);
      }
    });

    return techStacks;
  }

  /**
   * 查找相似任务
   */
  private findSimilarTasks(task: Task): SimilarTask[] {
    const similarTasks: SimilarTask[] = [];
    const taskWords = this.extractWords(`${task.title} ${task.description || ''}`);

    this.allTasks.forEach(otherTask => {
      if (otherTask.id === task.id) return;

      const otherWords = this.extractWords(`${otherTask.title} ${otherTask.description || ''}`);
      const similarity = this.calculateSimilarity(taskWords, otherWords);

      if (similarity > 0.3) {
        similarTasks.push({
          taskId: otherTask.id,
          title: otherTask.title,
          similarity,
          actualHours: otherTask.total_time_seconds ? otherTask.total_time_seconds / 3600 : undefined,
          estimatedHours: otherTask.estimated_hours,
          priority: otherTask.priority
        });
      }
    });

    return similarTasks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  /**
   * 基础工时估算
   */
  private getBaseTimeEstimation(taskType: string, complexity: number): number {
    const baseTime = TIME_ESTIMATION_BASE.taskTypes[taskType] || 
                    TIME_ESTIMATION_BASE.taskTypes['feature_medium'];
    
    // 根据复杂度调整基础时间
    const complexityMultiplier = 0.5 + complexity * 1.5; // 0.5-2.0 倍数
    return baseTime.avg * complexityMultiplier;
  }

  /**
   * 应用时间调整系数
   */
  private applyTimeAdjustments(
    baseTime: number,
    techStacks: string[],
    similarTasks: SimilarTask[],
    complexity: number
  ): number {
    let adjustedTime = baseTime;

    // 技术栈复杂度调整
    techStacks.forEach(stack => {
      const multiplier = TIME_ESTIMATION_BASE.techStackMultiplier[stack] || 1.0;
      adjustedTime *= multiplier;
    });

    // 相似任务历史数据调整
    if (similarTasks.length > 0) {
      const historicalHours = similarTasks
        .filter(t => t.estimatedHours && t.estimatedHours > 0)
        .map(t => t.estimatedHours!);

      if (historicalHours.length > 0) {
        const avgHistorical = historicalHours.reduce((sum, h) => sum + h, 0) / historicalHours.length;
        // 历史数据权重 30%，算法预估权重 70%
        adjustedTime = adjustedTime * 0.7 + avgHistorical * 0.3;
      }
    }

    // 复杂度额外调整
    if (complexity > 0.8) {
      adjustedTime *= 1.3; // 高复杂度额外增加 30%
    } else if (complexity < 0.3) {
      adjustedTime *= 0.8; // 低复杂度减少 20%
    }

    return adjustedTime;
  }

  /**
   * 生成工时分解
   */
  private generateTimeBreakdown(totalHours: number, taskType: string): TimeBreakdown[] {
    const breakdown: TimeBreakdown[] = [];

    // 根据任务类型分配时间比例
    const phaseDistribution = this.getPhaseDistribution(taskType);

    Object.entries(phaseDistribution).forEach(([phase, percentage]) => {
      const hours = totalHours * percentage;
      breakdown.push({
        phase,
        hours: Math.round(hours * 10) / 10,
        percentage: Math.round(percentage * 100),
        description: this.getPhaseDescription(phase)
      });
    });

    return breakdown;
  }

  /**
   * 获取阶段分布
   */
  private getPhaseDistribution(taskType: string): Record<string, number> {
    const distributions: Record<string, Record<string, number>> = {
      'feature_large': {
        '需求分析': 0.15,
        '技术设计': 0.20,
        '开发实现': 0.45,
        '测试验证': 0.15,
        '部署上线': 0.05
      },
      'feature_medium': {
        '需求分析': 0.10,
        '开发实现': 0.60,
        '测试验证': 0.25,
        '部署上线': 0.05
      },
      'feature_small': {
        '开发实现': 0.70,
        '测试验证': 0.25,
        '部署上线': 0.05
      },
      'simple_fix': {
        '问题定位': 0.30,
        '修复实现': 0.50,
        '测试验证': 0.20
      },
      'research': {
        '资料收集': 0.40,
        '分析整理': 0.40,
        '报告输出': 0.20
      },
      'design': {
        '需求理解': 0.20,
        '设计制作': 0.60,
        '评审修改': 0.20
      },
      'testing': {
        '测试设计': 0.30,
        '测试执行': 0.50,
        '报告整理': 0.20
      }
    };

    return distributions[taskType] || distributions['feature_medium'];
  }

  /**
   * 获取阶段描述
   */
  private getPhaseDescription(phase: string): string {
    const descriptions: Record<string, string> = {
      '需求分析': '理解和分析任务需求',
      '技术设计': '设计技术方案和架构',
      '开发实现': '编码实现核心功能',
      '测试验证': '功能测试和质量验证',
      '部署上线': '部署发布和环境配置',
      '问题定位': '定位和分析问题原因',
      '修复实现': '实施修复方案',
      '资料收集': '收集相关资料和信息',
      '分析整理': '分析数据和整理结论',
      '报告输出': '编写分析报告',
      '需求理解': '理解设计需求和目标',
      '设计制作': '制作设计稿和原型',
      '评审修改': '设计评审和修改完善',
      '测试设计': '设计测试用例和方案',
      '测试执行': '执行测试和记录结果'
    };

    return descriptions[phase] || '执行相关任务';
  }

  // 工具方法

  /**
   * 计算优先级置信度
   */
  private calculatePriorityConfidence(factors: PriorityFactor[], text: string): number {
    if (factors.length === 0) return 0.3;

    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const avgWeight = totalWeight / factors.length;
    
    // 基于因素数量和权重计算置信度
    let confidence = Math.min(0.9, 0.4 + avgWeight * 0.5);
    
    // 如果有明确的优先级关键词，提升置信度
    const hasKeywords = factors.some(f => f.factor.includes('keywords'));
    if (hasKeywords) confidence += 0.1;

    return Math.min(0.95, confidence);
  }

  /**
   * 计算工时置信度
   */
  private calculateTimeConfidence(similarTasks: SimilarTask[], taskType: string, complexity: number): number {
    let confidence = 0.5; // 基础置信度

    // 相似任务数量影响置信度
    if (similarTasks.length >= 3) {
      confidence += 0.2;
    } else if (similarTasks.length >= 1) {
      confidence += 0.1;
    }

    // 任务类型清晰度影响置信度
    const knownTypes = Object.keys(TIME_ESTIMATION_BASE.taskTypes);
    if (knownTypes.includes(taskType)) {
      confidence += 0.2;
    }

    // 复杂度明确性影响置信度
    if (complexity > 0.7 || complexity < 0.4) {
      confidence += 0.1; // 明确的高复杂度或低复杂度
    }

    return Math.min(0.9, confidence);
  }

  /**
   * 生成优先级推理
   */
  private generatePriorityReasoning(factors: PriorityFactor[], priority: string): string {
    const parts = [];

    parts.push(`基于多维度分析，建议优先级为 ${priority}`);

    const increaseFactors = factors.filter(f => f.impact === 'increase');
    const decreaseFactors = factors.filter(f => f.impact === 'decrease');

    if (increaseFactors.length > 0) {
      const topFactors = increaseFactors
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 2)
        .map(f => f.description);
      parts.push(`提升因素：${topFactors.join('；')}`);
    }

    if (decreaseFactors.length > 0) {
      const topFactors = decreaseFactors
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 2)
        .map(f => f.description);
      parts.push(`降低因素：${topFactors.join('；')}`);
    }

    return parts.join('。') + '。';
  }

  /**
   * 生成工时推理
   */
  private generateTimeReasoning(
    taskType: string,
    complexity: number,
    techStacks: string[],
    similarTasks: SimilarTask[],
    estimatedHours: number
  ): string {
    const parts = [];

    parts.push(`任务类型为 ${taskType}，复杂度 ${(complexity * 100).toFixed(0)}%`);

    if (techStacks.length > 0) {
      parts.push(`涉及技术栈：${techStacks.join('、')}`);
    }

    if (similarTasks.length > 0) {
      const avgSimilarHours = similarTasks
        .filter(t => t.estimatedHours)
        .reduce((sum, t, _, arr) => sum + t.estimatedHours! / arr.length, 0);
      
      if (avgSimilarHours > 0) {
        parts.push(`参考 ${similarTasks.length} 个相似任务，平均工时 ${avgSimilarHours.toFixed(1)} 小时`);
      }
    }

    parts.push(`预估总工时 ${estimatedHours} 小时`);

    return parts.join('，') + '。';
  }

  /**
   * 生成综合建议
   */
  private generateRecommendations(
    priorityResult: PriorityAnalysisResult,
    timeResult: TimeEstimationResult
  ): string[] {
    const recommendations = [];

    // 优先级建议
    if (priorityResult.confidence > 0.8) {
      recommendations.push(`高置信度建议：设置优先级为 ${priorityResult.suggestedPriority}`);
    } else {
      recommendations.push(`建议优先级为 ${priorityResult.suggestedPriority}，建议人工确认`);
    }

    // 工时建议
    if (timeResult.confidence > 0.7) {
      recommendations.push(`预估工时 ${timeResult.estimatedHours} 小时，置信度较高`);
    } else {
      recommendations.push(`预估工时 ${timeResult.estimatedHours} 小时，建议根据实际情况调整`);
    }

    // 特殊建议
    if (priorityResult.suggestedPriority === 'high' && timeResult.estimatedHours > 20) {
      recommendations.push('高优先级大型任务，建议拆分为多个子任务');
    }

    if (timeResult.similarTasks.length === 0) {
      recommendations.push('缺少相似任务参考，建议在开发过程中及时调整工时预估');
    }

    return recommendations;
  }

  /**
   * 提取词汇
   */
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);
  }

  /**
   * 计算相似度
   */
  private calculateSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 计算优先级分布
   */
  private calculatePriorityDistribution(tasks: Task[]): { high: number; medium: number; low: number } {
    const total = tasks.length;
    if (total === 0) return { high: 0, medium: 0, low: 0 };

    const counts = { high: 0, medium: 0, low: 0 };
    tasks.forEach(task => {
      if (task.priority && task.priority in counts) {
        counts[task.priority as keyof typeof counts]++;
      }
    });

    return {
      high: counts.high / total,
      medium: counts.medium / total,
      low: counts.low / total
    };
  }
}

// 导出单例实例
export const aiPriorityEstimator = new AIPriorityEstimator();