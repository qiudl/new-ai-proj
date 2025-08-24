/**
 * 智能内容检测引擎 - TaskContentAnalyzer
 * 用于分析任务描述内容，判断是否需要自动创建任务文档
 * 
 * @author Claude AI
 * @version 1.0.0
 * @created 2025-08-03
 */

export class TaskContentAnalyzer {
  constructor(config = {}) {
    // 配置权重系统
    this.weights = {
      length: config.lengthWeight || 0.2,      // 长度权重
      keywords: config.keywordWeight || 0.3,   // 关键词权重
      structure: config.structureWeight || 0.25, // 结构权重
      technical: config.technicalWeight || 0.25  // 技术内容权重
    };

    // 阈值配置
    this.thresholds = {
      minLength: config.minLength || 300,      // 最小长度阈值
      minScore: config.minScore || 0.6,        // 最小评分阈值
      highConfidence: config.highConfidence || 0.8 // 高置信度阈值
    };

    // 关键词配置
    this.keywords = {
      summary: ['总结', '完成', '成果', '结果', '分析', '实现', '修复', '优化', '解决', '达成'],
      structure: ['阶段', 'Phase', '步骤', '流程', '计划', '方案', '策略', '架构'],
      technical: ['代码', 'API', 'HTTP', '数据库', '算法', '接口', '组件', '系统', '功能', '模块'],
      process: ['开发', '测试', '部署', '集成', '配置', '调试', '验证', '执行', '处理', '操作']
    };
  }

  /**
   * 分析任务描述内容的总结质量
   * @param {string} content - 任务描述内容
   * @returns {Object} 分析结果
   */
  analyzeSummaryContent(content) {
    if (!content || typeof content !== 'string') {
      return {
        shouldCreateDocument: false,
        score: 0,
        confidence: 0,
        reason: '内容为空或无效',
        recommendations: ['请提供有效的任务描述内容']
      };
    }

    // 执行各维度分析
    const lengthAnalysis = this.analyzeLengthDimension(content);
    const keywordAnalysis = this.analyzeKeywordDimension(content);
    const structureAnalysis = this.analyzeStructureDimension(content);
    const technicalAnalysis = this.analyzeTechnicalDimension(content);

    // 计算加权总分
    const score = this.calculateWeightedScore({
      length: lengthAnalysis.score,
      keywords: keywordAnalysis.score,
      structure: structureAnalysis.score,
      technical: technicalAnalysis.score
    });

    // 计算置信度
    const confidence = this.calculateConfidence({
      lengthAnalysis,
      keywordAnalysis,
      structureAnalysis,
      technicalAnalysis,
      score
    });

    // 判断是否应该创建文档
    const shouldCreateDocument = score >= this.thresholds.minScore;

    // 生成改进建议
    const recommendations = this.generateRecommendations({
      lengthAnalysis,
      keywordAnalysis,
      structureAnalysis,
      technicalAnalysis,
      score
    });

    return {
      shouldCreateDocument,
      score: Math.round(score * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      reason: this.generateReason(score, shouldCreateDocument),
      recommendations,
      details: {
        length: lengthAnalysis,
        keywords: keywordAnalysis,
        structure: structureAnalysis,
        technical: technicalAnalysis
      }
    };
  }

  /**
   * 长度维度分析
   * @param {string} content - 内容
   * @returns {Object} 长度分析结果
   */
  analyzeLengthDimension(content) {
    const length = content.length;
    let score = 0;
    let quality = 'poor';

    if (length >= this.thresholds.minLength) {
      if (length >= 1000) {
        score = 1.0;
        quality = 'excellent';
      } else if (length >= 600) {
        score = 0.8;
        quality = 'good';
      } else {
        score = 0.6;
        quality = 'adequate';
      }
    } else if (length >= 200) {
      score = 0.4;
      quality = 'short';
    } else if (length >= 100) {
      score = 0.2;
      quality = 'very_short';
    }

    return {
      score,
      quality,
      length,
      analysis: `内容长度${length}字符，质量评级：${quality}`
    };
  }

  /**
   * 关键词维度分析
   * @param {string} content - 内容
   * @returns {Object} 关键词分析结果
   */
  analyzeKeywordDimension(content) {
    const matches = {};
    let totalMatches = 0;
    let totalKeywords = 0;

    // 分析各类关键词
    Object.keys(this.keywords).forEach(category => {
      const categoryKeywords = this.keywords[category];
      const categoryMatches = categoryKeywords.filter(keyword => 
        content.includes(keyword)
      );
      
      matches[category] = {
        found: categoryMatches,
        count: categoryMatches.length,
        total: categoryKeywords.length
      };
      
      totalMatches += categoryMatches.length;
      totalKeywords += categoryKeywords.length;
    });

    // 计算关键词得分
    const keywordDensity = totalMatches / totalKeywords;
    let score = Math.min(keywordDensity * 3, 1.0); // 归一化到0-1

    // 特殊加权：如果包含总结类关键词，额外加分
    if (matches.summary.count > 0) {
      score = Math.min(score + 0.2, 1.0);
    }

    return {
      score,
      totalMatches,
      totalKeywords,
      density: Math.round(keywordDensity * 1000) / 10, // 百分比
      matches,
      analysis: `发现${totalMatches}个关键词，密度${Math.round(keywordDensity * 1000) / 10}%`
    };
  }

  /**
   * 结构化维度分析
   * @param {string} content - 内容
   * @returns {Object} 结构分析结果
   */
  analyzeStructureDimension(content) {
    const features = {
      headers: (content.match(/#{1,6}\s+/g) || []).length,
      lists: (content.match(/^[\s]*[-*+]\s+/gm) || []).length,
      orderedLists: (content.match(/^[\s]*\d+\.\s+/gm) || []).length,
      codeBlocks: (content.match(/```[\s\S]*?```/g) || []).length,
      inlineCode: (content.match(/`[^`]+`/g) || []).length,
      tables: (content.match(/\|.*\|/g) || []).length,
      links: (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
      emojis: (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length
    };

    // 计算结构化特征总数
    const totalFeatures = Object.values(features).reduce((sum, count) => sum + count, 0);
    
    // 计算结构化评分
    let score = 0;
    if (totalFeatures >= 10) {
      score = 1.0;
    } else if (totalFeatures >= 6) {
      score = 0.8;
    } else if (totalFeatures >= 3) {
      score = 0.6;
    } else if (totalFeatures >= 1) {
      score = 0.4;
    }

    // 特殊加分：如果有代码块，说明是技术文档
    if (features.codeBlocks > 0) {
      score = Math.min(score + 0.2, 1.0);
    }

    return {
      score,
      totalFeatures,
      features,
      analysis: `发现${totalFeatures}个结构化特征：${Object.entries(features).filter(([, count]) => count > 0).map(([name, count]) => `${name}(${count})`).join(', ')}`
    };
  }

  /**
   * 技术内容维度分析
   * @param {string} content - 内容
   * @returns {Object} 技术分析结果
   */
  analyzeTechnicalDimension(content) {
    const technicalPatterns = {
      httpMethods: /\b(GET|POST|PUT|DELETE|PATCH)\b/g,
      httpStatus: /\b(200|201|400|401|403|404|500|502|503)\b/g,
      apiEndpoints: /\/api\/[a-zA-Z0-9\/_-]+/g,
      fileExtensions: /\.[a-zA-Z0-9]{2,5}\b/g,
      functionCalls: /\w+\([^)]*\)/g,
      variables: /\$\w+|\{\w+\}/g,
      sqlKeywords: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/gi,
      jsKeywords: /\b(function|const|let|var|async|await|import|export)\b/g,
      gitCommands: /\bgit\s+(add|commit|push|pull|merge|checkout)\b/g
    };

    const matches = {};
    let totalMatches = 0;

    // 分析各种技术模式
    Object.keys(technicalPatterns).forEach(pattern => {
      const patternMatches = content.match(technicalPatterns[pattern]) || [];
      matches[pattern] = {
        count: patternMatches.length,
        examples: patternMatches.slice(0, 3) // 保留前3个示例
      };
      totalMatches += patternMatches.length;
    });

    // 计算技术含量评分
    let score = 0;
    if (totalMatches >= 20) {
      score = 1.0;
    } else if (totalMatches >= 10) {
      score = 0.8;
    } else if (totalMatches >= 5) {
      score = 0.6;
    } else if (totalMatches >= 2) {
      score = 0.4;
    } else if (totalMatches >= 1) {
      score = 0.2;
    }

    return {
      score,
      totalMatches,
      matches,
      analysis: `发现${totalMatches}个技术特征，主要包含：${Object.entries(matches).filter(([, data]) => data.count > 0).map(([name, data]) => `${name}(${data.count})`).join(', ')}`
    };
  }

  /**
   * 计算加权总分
   * @param {Object} scores - 各维度得分
   * @returns {number} 加权总分
   */
  calculateWeightedScore(scores) {
    return (
      scores.length * this.weights.length +
      scores.keywords * this.weights.keywords +
      scores.structure * this.weights.structure +
      scores.technical * this.weights.technical
    );
  }

  /**
   * 计算置信度
   * @param {Object} analyses - 各维度分析结果
   * @returns {number} 置信度
   */
  calculateConfidence({ lengthAnalysis, keywordAnalysis, structureAnalysis, technicalAnalysis, score }) {
    let confidence = score; // 基础置信度等于总分

    // 长度足够时增加置信度
    if (lengthAnalysis.length >= this.thresholds.minLength * 2) {
      confidence += 0.1;
    }

    // 有明确总结关键词时增加置信度
    if (keywordAnalysis.matches.summary.count >= 2) {
      confidence += 0.15;
    }

    // 结构化程度高时增加置信度
    if (structureAnalysis.totalFeatures >= 5) {
      confidence += 0.1;
    }

    // 技术含量高时增加置信度
    if (technicalAnalysis.totalMatches >= 10) {
      confidence += 0.1;
    }

    // 确保置信度在0-1范围内
    return Math.min(confidence, 1.0);
  }

  /**
   * 生成决策原因
   * @param {number} score - 总分
   * @param {boolean} shouldCreate - 是否应创建
   * @returns {string} 决策原因
   */
  generateReason(score, shouldCreate) {
    if (shouldCreate) {
      if (score >= this.thresholds.highConfidence) {
        return '内容质量优秀，强烈建议创建文档';
      } else {
        return '内容质量良好，建议创建文档';
      }
    } else {
      if (score >= 0.4) {
        return '内容质量一般，可考虑补充后创建文档';
      } else {
        return '内容质量不足，建议补充后再创建文档';
      }
    }
  }

  /**
   * 生成改进建议
   * @param {Object} analyses - 分析结果
   * @returns {Array} 建议列表
   */
  generateRecommendations({ lengthAnalysis, keywordAnalysis, structureAnalysis, technicalAnalysis, score }) {
    const recommendations = [];

    // 长度建议
    if (lengthAnalysis.length < this.thresholds.minLength) {
      recommendations.push(`建议增加内容长度到${this.thresholds.minLength}字符以上（当前${lengthAnalysis.length}字符）`);
    }

    // 关键词建议
    if (keywordAnalysis.matches.summary.count === 0) {
      recommendations.push('建议添加总结性关键词，如：总结、完成、成果、实现等');
    }

    // 结构化建议
    if (structureAnalysis.totalFeatures < 3) {
      recommendations.push('建议使用Markdown格式添加标题、列表或代码块等结构化元素');
    }

    // 技术内容建议
    if (technicalAnalysis.totalMatches < 5) {
      recommendations.push('如果是技术任务，建议添加更多技术细节、代码示例或API信息');
    }

    // 综合建议
    if (score < this.thresholds.minScore) {
      recommendations.push('整体内容质量需要提升，建议综合改进上述各个方面');
    }

    return recommendations.length > 0 ? recommendations : ['内容质量良好，可以创建文档'];
  }

  /**
   * 批量分析多个任务
   * @param {Array} tasks - 任务列表
   * @returns {Array} 批量分析结果
   */
  batchAnalyze(tasks) {
    const startTime = Date.now();
    const results = [];

    for (const task of tasks) {
      const analysis = this.analyzeSummaryContent(task.description || '');
      results.push({
        taskId: task.id,
        task: task,
        analysis: analysis
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      results,
      statistics: {
        totalTasks: tasks.length,
        shouldCreateCount: results.filter(r => r.analysis.shouldCreateDocument).length,
        averageScore: results.reduce((sum, r) => sum + r.analysis.score, 0) / results.length,
        averageConfidence: results.reduce((sum, r) => sum + r.analysis.confidence, 0) / results.length,
        processingTime: duration,
        tasksPerSecond: Math.round((tasks.length / duration) * 1000 * 100) / 100
      }
    };
  }

  /**
   * 获取分析器配置信息
   * @returns {Object} 配置信息
   */
  getConfig() {
    return {
      weights: this.weights,
      thresholds: this.thresholds,
      keywordCategories: Object.keys(this.keywords),
      version: '1.0.0'
    };
  }
}

// 使用示例
export function createTaskContentAnalyzer(config = {}) {
  return new TaskContentAnalyzer(config);
}

// 默认导出
export default TaskContentAnalyzer;