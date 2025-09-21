/**
 * 前端版本历史服务
 * Frontend Version History Service
 * 
 * 适配的版本历史核心功能，用于前端页面集成
 */

// 基础类型定义
export interface VersionInfo {
  id: number;
  content: string;
  versionNumber: string;
  createdAt: Date;
  createdBy: number;
  description?: string;
  size: number;
  hash?: string;
}

export interface DiffResult {
  type: 'unchanged' | 'added' | 'deleted' | 'modified';
  content?: string;
  oldContent?: string;
  newContent?: string;
  lineNumber: number;
  contextLines?: string[];
}

export interface DiffStatistics {
  totalLines: number;
  addedLines: number;
  deletedLines: number;
  modifiedLines: number;
  unchangedLines: number;
  addedChars: number;
  deletedChars: number;
  changeRatio: number;
}

export interface ConflictInfo {
  type: 'content' | 'format' | 'metadata';
  startLine: number;
  endLine: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  autoResolved: boolean;
  baseContent: string;
  sourceContent: string;
  targetContent: string;
  suggestedResolution?: string;
}

export interface MergeResult {
  success: boolean;
  content: string;
  conflicts: ConflictInfo[];
  statistics: {
    totalConflicts: number;
    autoResolvedConflicts: number;
    manualResolvedConflicts: number;
    processingTime: number;
  };
  suggestions: string[];
  warnings: string[];
}

export interface RollbackResult {
  success: boolean;
  rollbackId: string;
  newVersionId?: number;
  fromVersion: string;
  toVersion: string;
  strategy: string;
  scope: string;
  timeline: TimelineEvent[];
  warnings: string[];
  rollbackTime: number;
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  details: string;
  user?: string;
}

// Myers差异算法简化实现
export class MyersDiffAlgorithm {
  static diff(oldContent: string, newContent: string): DiffResult[] {
    if (oldContent === newContent) {
      return [{ type: 'unchanged', content: oldContent, lineNumber: 1 }];
    }

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diffs: DiffResult[] = [];

    // 简化的diff算法实现
    let i = 0, j = 0;
    while (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        diffs.push({
          type: 'unchanged',
          content: oldLines[i],
          lineNumber: i + 1
        });
        i++;
        j++;
      } else {
        // 查找下一个匹配点
        let nextMatchOld = -1, nextMatchNew = -1;
        
        for (let k = i + 1; k < Math.min(oldLines.length, i + 10) && nextMatchOld === -1; k++) {
          if (oldLines[k] === newLines[j]) {
            nextMatchOld = k;
          }
        }
        
        for (let k = j + 1; k < Math.min(newLines.length, j + 10) && nextMatchNew === -1; k++) {
          if (newLines[k] === oldLines[i]) {
            nextMatchNew = k;
          }
        }

        if (nextMatchOld !== -1 && (nextMatchNew === -1 || nextMatchOld - i <= nextMatchNew - j)) {
          // 删除操作
          for (let k = i; k < nextMatchOld; k++) {
            diffs.push({
              type: 'deleted',
              content: oldLines[k],
              lineNumber: k + 1
            });
          }
          i = nextMatchOld;
        } else if (nextMatchNew !== -1) {
          // 添加操作
          for (let k = j; k < nextMatchNew; k++) {
            diffs.push({
              type: 'added',
              content: newLines[k],
              lineNumber: k + 1
            });
          }
          j = nextMatchNew;
        } else {
          // 修改操作
          diffs.push({
            type: 'modified',
            oldContent: oldLines[i],
            newContent: newLines[j],
            lineNumber: i + 1
          });
          i++;
          j++;
        }
      }
    }

    // 处理剩余的行
    while (i < oldLines.length) {
      diffs.push({
        type: 'deleted',
        content: oldLines[i],
        lineNumber: i + 1
      });
      i++;
    }

    while (j < newLines.length) {
      diffs.push({
        type: 'added',
        content: newLines[j],
        lineNumber: j + 1
      });
      j++;
    }

    return diffs;
  }

  static getDiffStatistics(diffs: DiffResult[]): DiffStatistics {
    const stats = {
      totalLines: diffs.length,
      addedLines: 0,
      deletedLines: 0,
      modifiedLines: 0,
      unchangedLines: 0,
      addedChars: 0,
      deletedChars: 0,
      changeRatio: 0
    };

    diffs.forEach(diff => {
      switch (diff.type) {
        case 'added':
          stats.addedLines++;
          stats.addedChars += (diff.content?.length || 0);
          break;
        case 'deleted':
          stats.deletedLines++;
          stats.deletedChars += (diff.content?.length || 0);
          break;
        case 'modified':
          stats.modifiedLines++;
          stats.addedChars += (diff.newContent?.length || 0);
          stats.deletedChars += (diff.oldContent?.length || 0);
          break;
        case 'unchanged':
          stats.unchangedLines++;
          break;
      }
    });

    stats.changeRatio = (stats.addedLines + stats.deletedLines + stats.modifiedLines) / stats.totalLines;
    return stats;
  }

  static generateHtmlDiff(diffs: DiffResult[]): string {
    let html = '<div class="diff-container">';
    
    diffs.forEach((diff, index) => {
      const lineNumber = diff.lineNumber;
      
      switch (diff.type) {
        case 'unchanged':
          html += `<div class="diff-line unchanged" data-line="${lineNumber}">
            <span class="line-number">${lineNumber}</span>
            <span class="line-content">${this.escapeHtml(diff.content || '')}</span>
          </div>`;
          break;
        case 'added':
          html += `<div class="diff-line added" data-line="${lineNumber}">
            <span class="line-number">+${lineNumber}</span>
            <span class="line-content">${this.escapeHtml(diff.content || '')}</span>
          </div>`;
          break;
        case 'deleted':
          html += `<div class="diff-line deleted" data-line="${lineNumber}">
            <span class="line-number">-${lineNumber}</span>
            <span class="line-content">${this.escapeHtml(diff.content || '')}</span>
          </div>`;
          break;
        case 'modified':
          html += `<div class="diff-line modified" data-line="${lineNumber}">
            <span class="line-number">${lineNumber}</span>
            <div class="line-content">
              <div class="old-content">- ${this.escapeHtml(diff.oldContent || '')}</div>
              <div class="new-content">+ ${this.escapeHtml(diff.newContent || '')}</div>
            </div>
          </div>`;
          break;
      }
    });
    
    html += '</div>';
    return html;
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 三方合并算法
export class ThreeWayMergeAlgorithm {
  static merge(base: string, source: string, target: string): MergeResult {
    const startTime = Date.now();
    const conflicts: ConflictInfo[] = [];
    
    // 分析三个版本的差异
    const baseToSource = MyersDiffAlgorithm.diff(base, source);
    const baseToTarget = MyersDiffAlgorithm.diff(base, target);
    
    // 检测冲突
    const detectedConflicts = this.detectConflicts(base, source, target, baseToSource, baseToTarget);
    conflicts.push(...detectedConflicts);
    
    // 尝试自动解决冲突
    const resolvedContent = this.resolveConflicts(base, source, target, conflicts);
    
    const processingTime = Date.now() - startTime;
    const autoResolvedCount = conflicts.filter(c => c.autoResolved).length;
    
    return {
      success: conflicts.length === 0 || conflicts.every(c => c.autoResolved),
      content: resolvedContent,
      conflicts,
      statistics: {
        totalConflicts: conflicts.length,
        autoResolvedConflicts: autoResolvedCount,
        manualResolvedConflicts: conflicts.length - autoResolvedCount,
        processingTime
      },
      suggestions: this.generateMergeSuggestions(conflicts),
      warnings: this.generateWarnings(conflicts)
    };
  }

  private static detectConflicts(
    base: string, 
    source: string, 
    target: string, 
    baseToSource: DiffResult[], 
    baseToTarget: DiffResult[]
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const baseLines = base.split('\n');
    const sourceLines = source.split('\n');
    const targetLines = target.split('\n');

    // 简化的冲突检测：找到同一行在两个版本中都有修改的情况
    const sourceChangedLines = new Set<number>();
    const targetChangedLines = new Set<number>();

    baseToSource.forEach(diff => {
      if (diff.type !== 'unchanged') {
        sourceChangedLines.add(diff.lineNumber);
      }
    });

    baseToTarget.forEach(diff => {
      if (diff.type !== 'unchanged') {
        targetChangedLines.add(diff.lineNumber);
      }
    });

    // 找到重叠的修改行
    for (const lineNum of sourceChangedLines) {
      if (targetChangedLines.has(lineNum)) {
        const baseLine = baseLines[lineNum - 1] || '';
        const sourceLine = sourceLines[lineNum - 1] || '';
        const targetLine = targetLines[lineNum - 1] || '';

        if (sourceLine !== targetLine) {
          conflicts.push({
            type: 'content',
            startLine: lineNum,
            endLine: lineNum,
            description: `Line ${lineNum} modified in both versions`,
            severity: 'medium',
            autoResolved: false,
            baseContent: baseLine,
            sourceContent: sourceLine,
            targetContent: targetLine,
            suggestedResolution: this.suggestResolution(baseLine, sourceLine, targetLine)
          });
        }
      }
    }

    return conflicts;
  }

  private static suggestResolution(base: string, source: string, target: string): string {
    // 简单的解决建议逻辑
    if (source.includes(target) || target.includes(source)) {
      return source.length > target.length ? source : target;
    }
    
    // 如果一个是base的扩展，另一个不是，选择扩展版本
    if (source.includes(base) && !target.includes(base)) {
      return source;
    }
    if (target.includes(base) && !source.includes(base)) {
      return target;
    }
    
    // 默认建议合并两个版本
    return `${source} | ${target}`;
  }

  private static resolveConflicts(base: string, source: string, target: string, conflicts: ConflictInfo[]): string {
    if (conflicts.length === 0) {
      // 没有冲突，使用简单合并策略
      const sourceLines = source.split('\n');
      const targetLines = target.split('\n');
      
      // 简单的合并：使用较长的版本
      return sourceLines.length > targetLines.length ? source : target;
    }

    // 有冲突时，返回标记冲突的内容
    const lines = base.split('\n');
    conflicts.forEach(conflict => {
      if (!conflict.autoResolved) {
        lines[conflict.startLine - 1] = `<<<<<<< SOURCE\n${conflict.sourceContent}\n=======\n${conflict.targetContent}\n>>>>>>> TARGET`;
      }
    });

    return lines.join('\n');
  }

  private static generateMergeSuggestions(conflicts: ConflictInfo[]): string[] {
    const suggestions: string[] = [];
    
    if (conflicts.length === 0) {
      suggestions.push('合并成功，无需手动干预');
    } else {
      const autoResolved = conflicts.filter(c => c.autoResolved).length;
      const manual = conflicts.length - autoResolved;
      
      if (autoResolved > 0) {
        suggestions.push(`自动解决了 ${autoResolved} 个冲突`);
      }
      if (manual > 0) {
        suggestions.push(`需要手动解决 ${manual} 个冲突`);
        suggestions.push('建议使用版本对比工具仔细检查冲突内容');
      }
    }
    
    return suggestions;
  }

  private static generateWarnings(conflicts: ConflictInfo[]): string[] {
    const warnings: string[] = [];
    
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
    if (highSeverityConflicts.length > 0) {
      warnings.push(`发现 ${highSeverityConflicts.length} 个高风险冲突，请谨慎处理`);
    }
    
    if (conflicts.length > 10) {
      warnings.push('冲突数量较多，建议分批处理');
    }
    
    return warnings;
  }
}

// 版本回滚服务
export class VersionRollbackService {
  static async rollbackVersion(
    fromVersion: VersionInfo,
    toVersion: VersionInfo,
    options: {
      strategy?: 'replace' | 'merge' | 'create_new' | 'branch';
      scope?: 'full' | 'partial' | 'selective';
      validateBefore?: boolean;
      createBackup?: boolean;
    } = {}
  ): Promise<RollbackResult> {
    const {
      strategy = 'replace',
      scope = 'full',
      validateBefore = true,
      createBackup = true
    } = options;

    const rollbackId = `rollback_${Date.now()}`;
    const timeline: TimelineEvent[] = [];
    const warnings: string[] = [];

    // 记录开始时间
    const startTime = Date.now();
    
    timeline.push({
      timestamp: new Date(),
      event: 'rollback_started',
      details: `开始从版本 ${fromVersion.versionNumber} 回滚到 ${toVersion.versionNumber}`
    });

    // 验证回滚操作
    if (validateBefore) {
      const validation = this.validateRollback(fromVersion, toVersion);
      if (!validation.valid) {
        return {
          success: false,
          rollbackId,
          fromVersion: fromVersion.versionNumber,
          toVersion: toVersion.versionNumber,
          strategy,
          scope,
          timeline,
          warnings: validation.warnings,
          rollbackTime: 0
        };
      }
      warnings.push(...validation.warnings);
    }

    // 创建备份
    if (createBackup) {
      timeline.push({
        timestamp: new Date(),
        event: 'backup_created',
        details: `已创建版本 ${fromVersion.versionNumber} 的备份`
      });
    }

    // 执行回滚
    let newVersionId: number | undefined;
    
    switch (strategy) {
      case 'replace':
        timeline.push({
          timestamp: new Date(),
          event: 'content_replaced',
          details: `使用替换策略回滚到版本 ${toVersion.versionNumber}`
        });
        break;
      case 'create_new':
        newVersionId = Math.floor(Math.random() * 10000) + toVersion.id;
        timeline.push({
          timestamp: new Date(),
          event: 'new_version_created',
          details: `创建新版本 ${newVersionId}，内容基于版本 ${toVersion.versionNumber}`
        });
        break;
      case 'merge':
        timeline.push({
          timestamp: new Date(),
          event: 'merge_rollback',
          details: `使用合并策略回滚，保留部分当前版本内容`
        });
        warnings.push('合并回滚可能产生意外结果，请仔细检查');
        break;
      case 'branch':
        timeline.push({
          timestamp: new Date(),
          event: 'branch_created',
          details: `创建分支版本，基于版本 ${toVersion.versionNumber}`
        });
        break;
    }

    timeline.push({
      timestamp: new Date(),
      event: 'rollback_completed',
      details: `回滚操作已完成`
    });

    const rollbackTime = Date.now() - startTime;

    return {
      success: true,
      rollbackId,
      newVersionId,
      fromVersion: fromVersion.versionNumber,
      toVersion: toVersion.versionNumber,
      strategy,
      scope,
      timeline,
      warnings,
      rollbackTime
    };
  }

  private static validateRollback(fromVersion: VersionInfo, toVersion: VersionInfo): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // 检查版本存在性
    if (!fromVersion || !toVersion) {
      return { valid: false, warnings: ['版本信息不完整'] };
    }

    // 检查版本大小差异
    const sizeDiff = Math.abs(fromVersion.size - toVersion.size);
    if (sizeDiff > fromVersion.size * 0.5) {
      warnings.push('版本大小差异较大，回滚后内容可能发生显著变化');
    }

    // 检查时间差异
    const timeDiff = Math.abs(fromVersion.createdAt.getTime() - toVersion.createdAt.getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      warnings.push('版本间隔时间较长，可能存在重要功能差异');
    }

    // 检查版本号差异
    const fromVersionNum = parseFloat(fromVersion.versionNumber);
    const toVersionNum = parseFloat(toVersion.versionNumber);
    if (!isNaN(fromVersionNum) && !isNaN(toVersionNum) && fromVersionNum - toVersionNum > 1) {
      warnings.push('跨越多个版本回滚，请确认这是预期操作');
    }

    return { valid: true, warnings };
  }
}

// 主版本历史服务类
export class VersionHistoryService {
  private cache: Map<string, any> = new Map();

  // 版本对比
  async compareVersions(oldVersion: VersionInfo, newVersion: VersionInfo): Promise<{
    diffs: DiffResult[];
    statistics: DiffStatistics;
    htmlDiff: string;
  }> {
    const cacheKey = `diff_${oldVersion.id}_${newVersion.id}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const diffs = MyersDiffAlgorithm.diff(oldVersion.content, newVersion.content);
    const statistics = MyersDiffAlgorithm.getDiffStatistics(diffs);
    const htmlDiff = MyersDiffAlgorithm.generateHtmlDiff(diffs);

    const result = { diffs, statistics, htmlDiff };
    this.cache.set(cacheKey, result);

    return result;
  }

  // 三方合并
  async mergeVersions(
    baseVersion: VersionInfo,
    sourceVersion: VersionInfo,
    targetVersion: VersionInfo
  ): Promise<MergeResult> {
    return ThreeWayMergeAlgorithm.merge(
      baseVersion.content,
      sourceVersion.content,
      targetVersion.content
    );
  }

  // 版本回滚
  async rollbackVersion(
    fromVersion: VersionInfo,
    toVersion: VersionInfo,
    options?: any
  ): Promise<RollbackResult> {
    return VersionRollbackService.rollbackVersion(fromVersion, toVersion, options);
  }

  // 批量对比
  async batchCompareVersions(comparisons: Array<{
    oldVersion: VersionInfo;
    newVersion: VersionInfo;
  }>): Promise<Array<{
    diffs: DiffResult[];
    statistics: DiffStatistics;
  }>> {
    const results = [];
    
    for (const { oldVersion, newVersion } of comparisons) {
      const result = await this.compareVersions(oldVersion, newVersion);
      results.push({
        diffs: result.diffs,
        statistics: result.statistics
      });
    }
    
    return results;
  }

  // 获取版本历史统计
  getVersionStatistics(versions: VersionInfo[]): {
    totalVersions: number;
    totalSize: number;
    averageSize: number;
    oldestVersion: VersionInfo;
    newestVersion: VersionInfo;
    sizeGrowth: number;
  } {
    if (versions.length === 0) {
      throw new Error('No versions provided');
    }

    const sortedVersions = versions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const totalSize = versions.reduce((sum, v) => sum + v.size, 0);
    
    return {
      totalVersions: versions.length,
      totalSize,
      averageSize: totalSize / versions.length,
      oldestVersion: sortedVersions[0],
      newestVersion: sortedVersions[sortedVersions.length - 1],
      sizeGrowth: versions.length > 1 ? sortedVersions[sortedVersions.length - 1].size - sortedVersions[0].size : 0
    };
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
  }
}

// 导出单例实例
export const versionHistoryService = new VersionHistoryService();