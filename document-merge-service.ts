/**
 * 文档合并更新服务实现
 * 提供智能文档合并和冲突解决功能
 */

import { 
  ThreeWayMergeAlgorithm, 
  MyersDiffAlgorithm,
  MergeResult,
  MergeConflict,
  DiffResult 
} from './version-diff-algorithm';

// ================================
// 合并策略枚举
// ================================

export enum MergeStrategy {
  AUTO = 'auto',           // 自动合并（优先使用智能策略）
  OURS = 'ours',          // 采用我们的版本
  THEIRS = 'theirs',      // 采用他们的版本
  MANUAL = 'manual',      // 手动解决所有冲突
  THREE_WAY = 'three_way', // 标准三方合并
  SEMANTIC = 'semantic'    // 基于语义的智能合并
}

// ================================
// 合并配置接口
// ================================

export interface MergeConfig {
  strategy: MergeStrategy;
  autoResolvePolicy: {
    whitespaceConflicts: boolean;    // 自动解决空白字符冲突
    commentConflicts: boolean;       // 自动解决注释冲突
    importConflicts: boolean;        // 自动解决导入语句冲突
    similarityThreshold: number;     // 相似度阈值（0-1）
  };
  conflictMarkers: {
    ourMarker: string;              // 我们版本的标记
    theirMarker: string;            // 他们版本的标记
    separatorMarker: string;        // 分隔符标记
    baseMarker?: string;            // 基准版本标记（可选）
  };
  maxConflictSize: number;          // 最大冲突块大小
  preserveLineEndings: boolean;     // 保持行尾符
}

// ================================
// 合并上下文接口
// ================================

export interface MergeContext {
  documentId: number;
  taskId: number;
  baseVersion: {
    id: number;
    content: string;
    versionNumber: string;
  };
  sourceVersion: {
    id: number;
    content: string;
    versionNumber: string;
    author: string;
  };
  targetVersion: {
    id: number;
    content: string;
    versionNumber: string;
    author: string;
  };
  mergedBy: {
    id: number;
    username: string;
  };
  metadata?: Record<string, any>;
}

// ================================
// 智能合并结果接口
// ================================

export interface SmartMergeResult {
  success: boolean;
  content: string[];
  conflicts: EnhancedMergeConflict[];
  statistics: {
    totalLines: number;
    mergedLines: number;
    conflictLines: number;
    autoResolvedConflicts: number;
    manualConflicts: number;
    confidenceScore: number;        // 合并置信度（0-1）
  };
  suggestions: MergeSuggestion[];   // 合并建议
  warnings: MergeWarning[];         // 合并警告
}

export interface EnhancedMergeConflict extends MergeConflict {
  id: string;                       // 冲突唯一标识
  severity: 'low' | 'medium' | 'high'; // 冲突严重程度
  category: ConflictCategory;       // 冲突类别
  suggestion?: string;              // 解决建议
  similarityScore: number;          // 相似度评分
  canAutoResolve: boolean;          // 是否可自动解决
  contextAnalysis: {
    beforeContext: string[];        // 前置上下文
    afterContext: string[];         // 后置上下文
    semanticType: string;           // 语义类型
  };
}

export enum ConflictCategory {
  CONTENT = 'content',              // 内容冲突
  STRUCTURE = 'structure',          // 结构冲突
  FORMATTING = 'formatting',        // 格式冲突
  METADATA = 'metadata',            // 元数据冲突
  SEMANTIC = 'semantic'             // 语义冲突
}

export interface MergeSuggestion {
  type: 'auto_resolve' | 'manual_review' | 'split_content';
  conflictId: string;
  description: string;
  confidence: number;
  proposedSolution?: string;
}

export interface MergeWarning {
  type: 'performance' | 'data_loss' | 'compatibility';
  message: string;
  severity: 'info' | 'warning' | 'error';
  affectedLines?: number[];
}

// ================================
// 文档合并更新服务
// ================================

export class DocumentMergeService {
  private defaultConfig: MergeConfig = {
    strategy: MergeStrategy.AUTO,
    autoResolvePolicy: {
      whitespaceConflicts: true,
      commentConflicts: true,
      importConflicts: false,
      similarityThreshold: 0.8
    },
    conflictMarkers: {
      ourMarker: '<<<<<<< OURS',
      theirMarker: '>>>>>>> THEIRS',
      separatorMarker: '=======',
      baseMarker: '||||||| BASE'
    },
    maxConflictSize: 100,
    preserveLineEndings: true
  };

  /**
   * 执行智能文档合并
   */
  async mergeDocuments(
    context: MergeContext,
    config: Partial<MergeConfig> = {}
  ): Promise<SmartMergeResult> {
    const mergeConfig = { ...this.defaultConfig, ...config };
    
    // 预处理内容
    const processedContext = await this.preprocessContent(context);
    
    // 执行基础三方合并
    const basicMergeResult = ThreeWayMergeAlgorithm.merge(
      processedContext.baseVersion.content,
      processedContext.sourceVersion.content,
      processedContext.targetVersion.content
    );

    // 分析冲突
    const enhancedConflicts = await this.analyzeConflicts(
      basicMergeResult.conflicts,
      processedContext,
      mergeConfig
    );

    // 应用智能解决策略
    const resolvedResult = await this.applyIntelligentResolution(
      basicMergeResult,
      enhancedConflicts,
      mergeConfig
    );

    // 生成合并建议
    const suggestions = await this.generateMergeSuggestions(
      enhancedConflicts,
      processedContext
    );

    // 验证合并结果
    const warnings = await this.validateMergeResult(
      resolvedResult,
      processedContext
    );

    return {
      success: enhancedConflicts.filter(c => !c.canAutoResolve).length === 0,
      content: resolvedResult.content,
      conflicts: enhancedConflicts.filter(c => !c.canAutoResolve),
      statistics: {
        totalLines: resolvedResult.content.length,
        mergedLines: resolvedResult.content.length - enhancedConflicts.length,
        conflictLines: enhancedConflicts.length,
        autoResolvedConflicts: enhancedConflicts.filter(c => c.canAutoResolve).length,
        manualConflicts: enhancedConflicts.filter(c => !c.canAutoResolve).length,
        confidenceScore: this.calculateConfidenceScore(enhancedConflicts)
      },
      suggestions,
      warnings
    };
  }

  /**
   * 预处理内容
   */
  private async preprocessContent(context: MergeContext): Promise<MergeContext> {
    return {
      ...context,
      baseVersion: {
        ...context.baseVersion,
        content: this.normalizeContent(context.baseVersion.content)
      },
      sourceVersion: {
        ...context.sourceVersion,
        content: this.normalizeContent(context.sourceVersion.content)
      },
      targetVersion: {
        ...context.targetVersion,
        content: this.normalizeContent(context.targetVersion.content)
      }
    };
  }

  /**
   * 规范化内容
   */
  private normalizeContent(content: string): string {
    // 统一行尾符
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 移除行尾空白
    content = content.replace(/[ \t]+$/gm, '');
    
    // 确保文件以换行符结尾
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    
    return content;
  }

  /**
   * 分析冲突
   */
  private async analyzeConflicts(
    basicConflicts: MergeConflict[],
    context: MergeContext,
    config: MergeConfig
  ): Promise<EnhancedMergeConflict[]> {
    const enhancedConflicts: EnhancedMergeConflict[] = [];

    for (let i = 0; i < basicConflicts.length; i++) {
      const conflict = basicConflicts[i];
      const enhanced = await this.enhanceConflict(conflict, i, context, config);
      enhancedConflicts.push(enhanced);
    }

    return enhancedConflicts;
  }

  /**
   * 增强冲突信息
   */
  private async enhanceConflict(
    conflict: MergeConflict,
    index: number,
    context: MergeContext,
    config: MergeConfig
  ): Promise<EnhancedMergeConflict> {
    const conflictId = `conflict_${context.documentId}_${Date.now()}_${index}`;
    
    // 计算相似度
    const similarityScore = this.calculateSimilarity(
      conflict.sourceContent.join('\n'),
      conflict.targetContent.join('\n')
    );

    // 分析冲突类别
    const category = this.categorizeConflict(conflict);
    
    // 判断严重程度
    const severity = this.assessConflictSeverity(conflict, category, similarityScore);
    
    // 检查是否可自动解决
    const canAutoResolve = this.canAutoResolveConflict(
      conflict, 
      category, 
      similarityScore, 
      config
    );

    // 获取上下文信息
    const contextAnalysis = this.analyzeConflictContext(conflict, context);

    // 生成解决建议
    const suggestion = this.generateConflictSuggestion(
      conflict,
      category,
      similarityScore
    );

    return {
      ...conflict,
      id: conflictId,
      severity,
      category,
      suggestion,
      similarityScore,
      canAutoResolve,
      contextAnalysis
    };
  }

  /**
   * 计算文本相似度
   */
  private calculateSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    
    const len1 = text1.length;
    const len2 = text2.length;
    
    if (len1 === 0 || len2 === 0) return 0.0;
    
    // 使用Levenshtein距离计算相似度
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = text1[i - 1] === text2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    
    return 1.0 - (distance / maxLen);
  }

  /**
   * 分类冲突类型
   */
  private categorizeConflict(conflict: MergeConflict): ConflictCategory {
    const sourceContent = conflict.sourceContent.join('\n');
    const targetContent = conflict.targetContent.join('\n');
    
    // 检查是否只是格式差异
    if (sourceContent.replace(/\s+/g, '') === targetContent.replace(/\s+/g, '')) {
      return ConflictCategory.FORMATTING;
    }
    
    // 检查是否是结构性变更
    if (this.isStructuralChange(sourceContent, targetContent)) {
      return ConflictCategory.STRUCTURE;
    }
    
    // 检查是否是元数据变更
    if (this.isMetadataChange(sourceContent, targetContent)) {
      return ConflictCategory.METADATA;
    }
    
    // 默认为内容冲突
    return ConflictCategory.CONTENT;
  }

  /**
   * 检查是否为结构性变更
   */
  private isStructuralChange(content1: string, content2: string): boolean {
    // 检查标题结构变化（Markdown）
    const headers1 = content1.match(/^#{1,6}\s+.*/gm) || [];
    const headers2 = content2.match(/^#{1,6}\s+.*/gm) || [];
    
    if (headers1.length !== headers2.length) return true;
    
    // 检查列表结构变化
    const lists1 = content1.match(/^[\s]*[-*+]\s+/gm) || [];
    const lists2 = content2.match(/^[\s]*[-*+]\s+/gm) || [];
    
    return Math.abs(lists1.length - lists2.length) > 2;
  }

  /**
   * 检查是否为元数据变更
   */
  private isMetadataChange(content1: string, content2: string): boolean {
    // 检查YAML front matter
    const yaml1 = content1.match(/^---\n[\s\S]*?\n---/m);
    const yaml2 = content2.match(/^---\n[\s\S]*?\n---/m);
    
    return (yaml1 !== null) !== (yaml2 !== null);
  }

  /**
   * 评估冲突严重程度
   */
  private assessConflictSeverity(
    conflict: MergeConflict,
    category: ConflictCategory,
    similarity: number
  ): 'low' | 'medium' | 'high' {
    // 格式冲突通常严重程度较低
    if (category === ConflictCategory.FORMATTING) {
      return similarity > 0.9 ? 'low' : 'medium';
    }
    
    // 结构性冲突严重程度较高
    if (category === ConflictCategory.STRUCTURE) {
      return 'high';
    }
    
    // 根据相似度判断
    if (similarity > 0.8) return 'low';
    if (similarity > 0.5) return 'medium';
    return 'high';
  }

  /**
   * 检查是否可自动解决
   */
  private canAutoResolveConflict(
    conflict: MergeConflict,
    category: ConflictCategory,
    similarity: number,
    config: MergeConfig
  ): boolean {
    // 格式冲突可自动解决
    if (category === ConflictCategory.FORMATTING && config.autoResolvePolicy.whitespaceConflicts) {
      return true;
    }
    
    // 高相似度冲突可自动解决
    if (similarity >= config.autoResolvePolicy.similarityThreshold) {
      return true;
    }
    
    // 注释冲突可自动解决
    if (this.isCommentConflict(conflict) && config.autoResolvePolicy.commentConflicts) {
      return true;
    }
    
    return false;
  }

  /**
   * 检查是否为注释冲突
   */
  private isCommentConflict(conflict: MergeConflict): boolean {
    const sourceContent = conflict.sourceContent.join('\n');
    const targetContent = conflict.targetContent.join('\n');
    
    // 检查Markdown注释
    const commentPattern = /<!--[\s\S]*?-->/g;
    const sourceComments = sourceContent.match(commentPattern);
    const targetComments = targetContent.match(commentPattern);
    
    return sourceComments !== null || targetComments !== null;
  }

  /**
   * 分析冲突上下文
   */
  private analyzeConflictContext(
    conflict: MergeConflict,
    context: MergeContext
  ): { beforeContext: string[], afterContext: string[], semanticType: string } {
    const baseLines = context.baseVersion.content.split('\n');
    const startLine = Math.max(0, conflict.lineStart - 3);
    const endLine = Math.min(baseLines.length, conflict.lineEnd + 3);
    
    return {
      beforeContext: baseLines.slice(startLine, conflict.lineStart),
      afterContext: baseLines.slice(conflict.lineEnd + 1, endLine + 1),
      semanticType: this.detectSemanticType(baseLines.slice(conflict.lineStart, conflict.lineEnd + 1))
    };
  }

  /**
   * 检测语义类型
   */
  private detectSemanticType(lines: string[]): string {
    const content = lines.join('\n');
    
    if (content.match(/^#{1,6}\s+/m)) return 'heading';
    if (content.match(/^[\s]*[-*+]\s+/m)) return 'list';
    if (content.match(/```/)) return 'code_block';
    if (content.match(/^\|.*\|$/m)) return 'table';
    if (content.match(/!\[.*\]\(.*\)/)) return 'image';
    if (content.match(/\[.*\]\(.*\)/)) return 'link';
    
    return 'text';
  }

  /**
   * 生成冲突解决建议
   */
  private generateConflictSuggestion(
    conflict: MergeConflict,
    category: ConflictCategory,
    similarity: number
  ): string {
    if (category === ConflictCategory.FORMATTING) {
      return '这是一个格式差异，建议保持统一的格式标准。';
    }
    
    if (similarity > 0.8) {
      return '两个版本内容相似度很高，建议手动合并相似部分。';
    }
    
    if (category === ConflictCategory.STRUCTURE) {
      return '这是结构性变更，需要仔细评估对整体文档的影响。';
    }
    
    return '建议仔细比较两个版本的差异，选择合适的内容进行合并。';
  }

  /**
   * 应用智能解决策略
   */
  private async applyIntelligentResolution(
    basicResult: MergeResult,
    conflicts: EnhancedMergeConflict[],
    config: MergeConfig
  ): Promise<MergeResult> {
    const resolvedContent = [...basicResult.content];
    const unresolvedConflicts: MergeConflict[] = [];

    // 处理可自动解决的冲突
    for (const conflict of conflicts) {
      if (conflict.canAutoResolve) {
        const resolution = this.autoResolveConflict(conflict, config);
        if (resolution) {
          // 替换冲突标记内容
          this.replaceConflictInContent(resolvedContent, conflict, resolution);
        }
      } else {
        unresolvedConflicts.push(conflict);
      }
    }

    return {
      ...basicResult,
      content: resolvedContent,
      conflicts: unresolvedConflicts,
      autoResolvedCount: basicResult.autoResolvedCount + (conflicts.length - unresolvedConflicts.length),
      manualResolvedCount: unresolvedConflicts.length
    };
  }

  /**
   * 自动解决冲突
   */
  private autoResolveConflict(
    conflict: EnhancedMergeConflict,
    config: MergeConfig
  ): string[] | null {
    if (conflict.category === ConflictCategory.FORMATTING) {
      // 格式冲突：选择更规范的格式
      return this.selectBetterFormatting(conflict.sourceContent, conflict.targetContent);
    }
    
    if (conflict.similarityScore >= config.autoResolvePolicy.similarityThreshold) {
      // 高相似度：尝试智能合并
      return this.intelligentMerge(conflict.sourceContent, conflict.targetContent);
    }
    
    if (this.isCommentConflict(conflict)) {
      // 注释冲突：保留两个版本的注释
      return this.mergeComments(conflict.sourceContent, conflict.targetContent);
    }
    
    return null;
  }

  /**
   * 选择更好的格式
   */
  private selectBetterFormatting(source: string[], target: string[]): string[] {
    // 简单策略：选择缩进更一致的版本
    const sourceIndentVariance = this.calculateIndentVariance(source);
    const targetIndentVariance = this.calculateIndentVariance(target);
    
    return sourceIndentVariance <= targetIndentVariance ? source : target;
  }

  /**
   * 计算缩进方差
   */
  private calculateIndentVariance(lines: string[]): number {
    const indents = lines
      .filter(line => line.trim().length > 0)
      .map(line => line.match(/^(\s*)/)?.[1]?.length || 0);
    
    if (indents.length === 0) return 0;
    
    const mean = indents.reduce((sum, indent) => sum + indent, 0) / indents.length;
    const variance = indents.reduce((sum, indent) => sum + Math.pow(indent - mean, 2), 0) / indents.length;
    
    return variance;
  }

  /**
   * 智能合并相似内容
   */
  private intelligentMerge(source: string[], target: string[]): string[] {
    const merged: string[] = [];
    const maxLength = Math.max(source.length, target.length);
    
    for (let i = 0; i < maxLength; i++) {
      const sourceLine = source[i] || '';
      const targetLine = target[i] || '';
      
      if (sourceLine === targetLine) {
        merged.push(sourceLine);
      } else if (sourceLine && targetLine) {
        // 选择更完整的版本
        merged.push(sourceLine.length >= targetLine.length ? sourceLine : targetLine);
      } else {
        merged.push(sourceLine || targetLine);
      }
    }
    
    return merged;
  }

  /**
   * 合并注释
   */
  private mergeComments(source: string[], target: string[]): string[] {
    const merged: string[] = [];
    
    // 添加源版本注释
    const sourceComments = source.filter(line => line.trim().startsWith('<!--'));
    const targetComments = target.filter(line => line.trim().startsWith('<!--'));
    
    // 去重并合并
    const allComments = [...sourceComments, ...targetComments];
    const uniqueComments = [...new Set(allComments)];
    
    merged.push(...uniqueComments);
    
    // 添加非注释内容
    const sourceNonComments = source.filter(line => !line.trim().startsWith('<!--'));
    const targetNonComments = target.filter(line => !line.trim().startsWith('<!--'));
    
    // 合并非注释内容
    merged.push(...this.intelligentMerge(sourceNonComments, targetNonComments));
    
    return merged;
  }

  /**
   * 在内容中替换冲突
   */
  private replaceConflictInContent(
    content: string[],
    conflict: EnhancedMergeConflict,
    resolution: string[]
  ): void {
    // 找到冲突标记的位置
    for (let i = 0; i < content.length; i++) {
      if (content[i].includes('<<<<<<< ')) {
        let endIndex = i;
        while (endIndex < content.length && !content[endIndex].includes('>>>>>>> ')) {
          endIndex++;
        }
        
        if (endIndex < content.length) {
          // 替换冲突区域
          content.splice(i, endIndex - i + 1, ...resolution);
          break;
        }
      }
    }
  }

  /**
   * 生成合并建议
   */
  private async generateMergeSuggestions(
    conflicts: EnhancedMergeConflict[],
    context: MergeContext
  ): Promise<MergeSuggestion[]> {
    const suggestions: MergeSuggestion[] = [];

    for (const conflict of conflicts) {
      if (conflict.canAutoResolve) {
        suggestions.push({
          type: 'auto_resolve',
          conflictId: conflict.id,
          description: `建议自动解决${conflict.category}类型的冲突`,
          confidence: conflict.similarityScore,
          proposedSolution: conflict.suggestion
        });
      } else if (conflict.severity === 'high') {
        suggestions.push({
          type: 'manual_review',
          conflictId: conflict.id,
          description: '此冲突需要手动仔细审查',
          confidence: 0.3
        });
      } else if (conflict.category === ConflictCategory.CONTENT) {
        suggestions.push({
          type: 'split_content',
          conflictId: conflict.id,
          description: '建议将冲突内容拆分到不同段落',
          confidence: 0.6
        });
      }
    }

    return suggestions;
  }

  /**
   * 验证合并结果
   */
  private async validateMergeResult(
    result: MergeResult,
    context: MergeContext
  ): Promise<MergeWarning[]> {
    const warnings: MergeWarning[] = [];

    // 检查内容完整性
    const originalContentSize = context.baseVersion.content.length;
    const mergedContentSize = result.content.join('\n').length;
    
    if (mergedContentSize < originalContentSize * 0.8) {
      warnings.push({
        type: 'data_loss',
        message: '合并后内容大小显著减少，可能存在数据丢失',
        severity: 'warning'
      });
    }

    // 检查性能影响
    if (result.content.length > 10000) {
      warnings.push({
        type: 'performance',
        message: '合并后文档过大，可能影响处理性能',
        severity: 'info'
      });
    }

    // 检查格式兼容性
    const formatIssues = this.checkFormatCompatibility(result.content);
    if (formatIssues.length > 0) {
      warnings.push({
        type: 'compatibility',
        message: '发现格式兼容性问题',
        severity: 'warning',
        affectedLines: formatIssues
      });
    }

    return warnings;
  }

  /**
   * 检查格式兼容性
   */
  private checkFormatCompatibility(content: string[]): number[] {
    const issues: number[] = [];
    
    for (let i = 0; i < content.length; i++) {
      const line = content[i];
      
      // 检查混合缩进
      if (line.match(/^\t+ +/) || line.match(/^ +\t+/)) {
        issues.push(i + 1);
      }
      
      // 检查行尾空格
      if (line.match(/\s+$/)) {
        issues.push(i + 1);
      }
    }
    
    return issues;
  }

  /**
   * 计算置信度评分
   */
  private calculateConfidenceScore(conflicts: EnhancedMergeConflict[]): number {
    if (conflicts.length === 0) return 1.0;
    
    const autoResolvedCount = conflicts.filter(c => c.canAutoResolve).length;
    const totalCount = conflicts.length;
    const avgSimilarity = conflicts.reduce((sum, c) => sum + c.similarityScore, 0) / totalCount;
    
    // 综合考虑自动解决率和平均相似度
    const autoResolveScore = autoResolvedCount / totalCount;
    const confidenceScore = (autoResolveScore + avgSimilarity) / 2;
    
    return Math.max(0, Math.min(1, confidenceScore));
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): MergeConfig {
    return { ...this.defaultConfig };
  }

  /**
   * 创建自定义配置
   */
  createCustomConfig(overrides: Partial<MergeConfig>): MergeConfig {
    return { ...this.defaultConfig, ...overrides };
  }
}

// ================================
// 合并工具函数
// ================================

export class MergeUtils {
  /**
   * 清理合并标记
   */
  static cleanupMergeMarkers(content: string): string {
    return content
      .replace(/^<<<<<<< .*$/gm, '')
      .replace(/^=======$/gm, '')
      .replace(/^>>>>>>> .*$/gm, '')
      .replace(/^\|\|\|\|\|\|\| .*$/gm, '')
      .replace(/\n\n\n+/g, '\n\n')
      .trim();
  }

  /**
   * 提取冲突块
   */
  static extractConflictBlocks(content: string): Array<{
    start: number;
    end: number;
    ours: string;
    theirs: string;
    base?: string;
  }> {
    const blocks: Array<{
      start: number;
      end: number;
      ours: string;
      theirs: string;
      base?: string;
    }> = [];

    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      if (lines[i].startsWith('<<<<<<<')) {
        const start = i;
        let separator = -1;
        let base = -1;
        let end = -1;

        // 查找分隔符和结束标记
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith('|||||||') && base === -1) {
            base = j;
          } else if (lines[j].startsWith('=======') && separator === -1) {
            separator = j;
          } else if (lines[j].startsWith('>>>>>>>')) {
            end = j;
            break;
          }
        }

        if (separator !== -1 && end !== -1) {
          const oursStart = base !== -1 ? base + 1 : start + 1;
          const oursEnd = separator;
          const theirsStart = separator + 1;
          const theirsEnd = end;

          blocks.push({
            start,
            end,
            ours: lines.slice(oursStart, oursEnd).join('\n'),
            theirs: lines.slice(theirsStart, theirsEnd).join('\n'),
            base: base !== -1 ? lines.slice(start + 1, base).join('\n') : undefined
          });

          i = end + 1;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    return blocks;
  }

  /**
   * 应用解决方案
   */
  static applyResolution(
    content: string,
    conflictId: string,
    resolution: string
  ): string {
    const blocks = this.extractConflictBlocks(content);
    const lines = content.split('\n');
    
    // 这里应该根据conflictId找到对应的冲突块并应用解决方案
    // 简化实现，直接替换第一个冲突块
    if (blocks.length > 0) {
      const block = blocks[0];
      lines.splice(block.start, block.end - block.start + 1, resolution);
      return lines.join('\n');
    }
    
    return content;
  }
}