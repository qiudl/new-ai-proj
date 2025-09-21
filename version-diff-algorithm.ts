/**
 * 版本对比算法实现
 * 实现高效的文档差异对比和三方合并算法
 */

// 差异类型枚举
export enum DiffType {
  ADDED = 'added',
  DELETED = 'deleted',
  MODIFIED = 'modified',
  UNCHANGED = 'unchanged'
}

// 差异结果接口
export interface DiffResult {
  type: DiffType;
  lineNumber: number;
  oldContent?: string;
  newContent?: string;
  contextBefore?: string[];
  contextAfter?: string[];
}

// 合并冲突接口
export interface MergeConflict {
  lineStart: number;
  lineEnd: number;
  baseContent: string[];
  sourceContent: string[];
  targetContent: string[];
  conflictType: 'content' | 'both_modified' | 'both_added' | 'both_deleted';
}

// 合并结果接口
export interface MergeResult {
  success: boolean;
  content: string[];
  conflicts: MergeConflict[];
  autoResolvedCount: number;
  manualResolvedCount: number;
}

/**
 * Myers差异算法实现
 * 基于最长公共子序列(LCS)的高效diff算法
 */
export class MyersDiffAlgorithm {
  /**
   * 计算两个文本之间的差异
   */
  public static diff(oldText: string, newText: string): DiffResult[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    return this.diffLines(oldLines, newLines);
  }

  /**
   * 按行比较两个文本数组
   */
  private static diffLines(oldLines: string[], newLines: string[]): DiffResult[] {
    const n = oldLines.length;
    const m = newLines.length;
    const max = n + m;
    
    // Myers算法的核心数据结构
    const v: number[] = new Array(2 * max + 1);
    const trace: number[][] = [];
    
    // 初始化
    v[max + 1] = 0;
    
    // 前向搜索
    for (let d = 0; d <= max; d++) {
      trace.push([...v]);
      
      for (let k = -d; k <= d; k += 2) {
        const kIndex = max + k;
        let x: number;
        
        if (k === -d || (k !== d && v[kIndex - 1] < v[kIndex + 1])) {
          x = v[kIndex + 1];
        } else {
          x = v[kIndex - 1] + 1;
        }
        
        let y = x - k;
        
        // 扩展对角线
        while (x < n && y < m && oldLines[x] === newLines[y]) {
          x++;
          y++;
        }
        
        v[kIndex] = x;
        
        // 找到终点
        if (x >= n && y >= m) {
          return this.backtrack(oldLines, newLines, trace, d);
        }
      }
    }
    
    return [];
  }

  /**
   * 回溯生成差异结果
   */
  private static backtrack(
    oldLines: string[],
    newLines: string[],
    trace: number[][],
    d: number
  ): DiffResult[] {
    const result: DiffResult[] = [];
    let x = oldLines.length;
    let y = newLines.length;
    
    for (let depth = d; depth >= 0; depth--) {
      const v = trace[depth];
      const max = oldLines.length + newLines.length;
      const k = x - y;
      const kIndex = max + k;
      
      let prevK: number;
      if (k === -depth || (k !== depth && v[kIndex - 1] < v[kIndex + 1])) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }
      
      const prevX = v[max + prevK];
      const prevY = prevX - prevK;
      
      // 处理对角线移动（匹配的行）
      while (x > prevX && y > prevY) {
        x--;
        y--;
        result.unshift({
          type: DiffType.UNCHANGED,
          lineNumber: x,
          oldContent: oldLines[x],
          newContent: newLines[y]
        });
      }
      
      // 处理水平移动（删除）
      if (x > prevX) {
        x--;
        result.unshift({
          type: DiffType.DELETED,
          lineNumber: x,
          oldContent: oldLines[x]
        });
      }
      
      // 处理垂直移动（添加）
      if (y > prevY) {
        y--;
        result.unshift({
          type: DiffType.ADDED,
          lineNumber: y,
          newContent: newLines[y]
        });
      }
    }
    
    return this.optimizeDiffResult(result);
  }

  /**
   * 优化差异结果，合并连续的修改为单个修改操作
   */
  private static optimizeDiffResult(diffs: DiffResult[]): DiffResult[] {
    const optimized: DiffResult[] = [];
    let i = 0;
    
    while (i < diffs.length) {
      const current = diffs[i];
      
      if (current.type === DiffType.DELETED) {
        // 查找紧跟的添加操作，合并为修改操作
        if (i + 1 < diffs.length && diffs[i + 1].type === DiffType.ADDED) {
          optimized.push({
            type: DiffType.MODIFIED,
            lineNumber: current.lineNumber,
            oldContent: current.oldContent,
            newContent: diffs[i + 1].newContent,
            contextBefore: this.getContext(diffs, i, -2, -1),
            contextAfter: this.getContext(diffs, i, 2, 3)
          });
          i += 2;
        } else {
          optimized.push({
            ...current,
            contextBefore: this.getContext(diffs, i, -2, -1),
            contextAfter: this.getContext(diffs, i, 1, 2)
          });
          i++;
        }
      } else {
        optimized.push({
          ...current,
          contextBefore: this.getContext(diffs, i, -2, -1),
          contextAfter: this.getContext(diffs, i, 1, 2)
        });
        i++;
      }
    }
    
    return optimized;
  }

  /**
   * 获取上下文信息
   */
  private static getContext(
    diffs: DiffResult[],
    currentIndex: number,
    startOffset: number,
    endOffset: number
  ): string[] {
    const context: string[] = [];
    
    for (let offset = startOffset; offset <= endOffset; offset++) {
      const index = currentIndex + offset;
      if (index >= 0 && index < diffs.length) {
        const diff = diffs[index];
        if (diff.type === DiffType.UNCHANGED && diff.oldContent) {
          context.push(diff.oldContent);
        }
      }
    }
    
    return context;
  }
}

/**
 * 三方合并算法实现
 * 基于共同祖先版本进行智能合并
 */
export class ThreeWayMergeAlgorithm {
  /**
   * 执行三方合并
   */
  public static merge(
    baseContent: string,
    sourceContent: string,
    targetContent: string
  ): MergeResult {
    const baseLines = baseContent.split('\n');
    const sourceLines = sourceContent.split('\n');
    const targetLines = targetContent.split('\n');
    
    return this.mergeLines(baseLines, sourceLines, targetLines);
  }

  /**
   * 按行执行三方合并
   */
  private static mergeLines(
    baseLines: string[],
    sourceLines: string[],
    targetLines: string[]
  ): MergeResult {
    // 计算base->source和base->target的差异
    const baseSourcDiff = MyersDiffAlgorithm.diffLines(baseLines, sourceLines);
    const baseTargetDiff = MyersDiffAlgorithm.diffLines(baseLines, targetLines);
    
    // 构建变更映射
    const sourceChanges = this.buildChangeMap(baseSourcDiff);
    const targetChanges = this.buildChangeMap(baseTargetDiff);
    
    // 执行合并
    const result: string[] = [];
    const conflicts: MergeConflict[] = [];
    let autoResolvedCount = 0;
    let manualResolvedCount = 0;
    
    let baseIndex = 0;
    let sourceIndex = 0;
    let targetIndex = 0;
    
    while (baseIndex < baseLines.length) {
      const sourceChange = sourceChanges.get(baseIndex);
      const targetChange = targetChanges.get(baseIndex);
      
      if (!sourceChange && !targetChange) {
        // 两边都没有变更，保持原内容
        result.push(baseLines[baseIndex]);
        baseIndex++;
        sourceIndex++;
        targetIndex++;
      } else if (sourceChange && !targetChange) {
        // 只有source有变更
        this.applyChange(result, sourceChange);
        autoResolvedCount++;
        baseIndex = sourceChange.endLine + 1;
        sourceIndex = sourceChange.newEndLine + 1;
        targetIndex += sourceChange.endLine - sourceChange.startLine + 1;
      } else if (!sourceChange && targetChange) {
        // 只有target有变更
        this.applyChange(result, targetChange);
        autoResolvedCount++;
        baseIndex = targetChange.endLine + 1;
        sourceIndex += targetChange.endLine - targetChange.startLine + 1;
        targetIndex = targetChange.newEndLine + 1;
      } else if (sourceChange && targetChange) {
        // 两边都有变更，检查冲突
        const conflict = this.detectConflict(
          baseLines, sourceLines, targetLines,
          sourceChange, targetChange
        );
        
        if (conflict) {
          conflicts.push(conflict);
          // 添加冲突标记
          result.push(`<<<<<<< SOURCE`);
          for (let i = sourceChange.startLine; i <= sourceChange.endLine; i++) {
            if (sourceLines[i] !== undefined) {
              result.push(sourceLines[i]);
            }
          }
          result.push(`=======`);
          for (let i = targetChange.startLine; i <= targetChange.endLine; i++) {
            if (targetLines[i] !== undefined) {
              result.push(targetLines[i]);
            }
          }
          result.push(`>>>>>>> TARGET`);
          manualResolvedCount++;
        } else {
          // 无冲突，可以自动合并
          this.applyChange(result, sourceChange);
          autoResolvedCount++;
        }
        
        baseIndex = Math.max(sourceChange.endLine, targetChange.endLine) + 1;
        sourceIndex = sourceChange.newEndLine + 1;
        targetIndex = targetChange.newEndLine + 1;
      }
    }
    
    // 处理剩余的添加内容
    while (sourceIndex < sourceLines.length) {
      result.push(sourceLines[sourceIndex]);
      sourceIndex++;
    }
    
    while (targetIndex < targetLines.length) {
      result.push(targetLines[targetIndex]);
      targetIndex++;
    }
    
    return {
      success: conflicts.length === 0,
      content: result,
      conflicts,
      autoResolvedCount,
      manualResolvedCount
    };
  }

  /**
   * 构建变更映射表
   */
  private static buildChangeMap(diffs: DiffResult[]): Map<number, ChangeInfo> {
    const changes = new Map<number, ChangeInfo>();
    let currentChange: ChangeInfo | null = null;
    
    for (const diff of diffs) {
      if (diff.type !== DiffType.UNCHANGED) {
        if (!currentChange || diff.lineNumber !== currentChange.endLine + 1) {
          // 开始新的变更块
          if (currentChange) {
            changes.set(currentChange.startLine, currentChange);
          }
          currentChange = {
            startLine: diff.lineNumber,
            endLine: diff.lineNumber,
            newStartLine: diff.lineNumber,
            newEndLine: diff.lineNumber,
            type: diff.type,
            content: []
          };
        }
        
        currentChange.endLine = diff.lineNumber;
        if (diff.newContent) {
          currentChange.content.push(diff.newContent);
          currentChange.newEndLine++;
        }
      }
    }
    
    if (currentChange) {
      changes.set(currentChange.startLine, currentChange);
    }
    
    return changes;
  }

  /**
   * 应用变更到结果中
   */
  private static applyChange(result: string[], change: ChangeInfo): void {
    for (const line of change.content) {
      result.push(line);
    }
  }

  /**
   * 检测合并冲突
   */
  private static detectConflict(
    baseLines: string[],
    sourceLines: string[],
    targetLines: string[],
    sourceChange: ChangeInfo,
    targetChange: ChangeInfo
  ): MergeConflict | null {
    // 检查变更区域是否重叠
    const sourceStart = sourceChange.startLine;
    const sourceEnd = sourceChange.endLine;
    const targetStart = targetChange.startLine;
    const targetEnd = targetChange.endLine;
    
    if (sourceEnd < targetStart || targetEnd < sourceStart) {
      // 没有重叠，无冲突
      return null;
    }
    
    // 检查内容是否相同
    if (this.areChangesIdentical(sourceChange, targetChange)) {
      // 变更内容相同，无冲突
      return null;
    }
    
    // 存在冲突
    return {
      lineStart: Math.min(sourceStart, targetStart),
      lineEnd: Math.max(sourceEnd, targetEnd),
      baseContent: baseLines.slice(
        Math.min(sourceStart, targetStart),
        Math.max(sourceEnd, targetEnd) + 1
      ),
      sourceContent: sourceChange.content,
      targetContent: targetChange.content,
      conflictType: this.getConflictType(sourceChange, targetChange)
    };
  }

  /**
   * 检查两个变更是否相同
   */
  private static areChangesIdentical(
    sourceChange: ChangeInfo,
    targetChange: ChangeInfo
  ): boolean {
    if (sourceChange.content.length !== targetChange.content.length) {
      return false;
    }
    
    for (let i = 0; i < sourceChange.content.length; i++) {
      if (sourceChange.content[i] !== targetChange.content[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取冲突类型
   */
  private static getConflictType(
    sourceChange: ChangeInfo,
    targetChange: ChangeInfo
  ): 'content' | 'both_modified' | 'both_added' | 'both_deleted' {
    if (sourceChange.type === DiffType.MODIFIED && targetChange.type === DiffType.MODIFIED) {
      return 'both_modified';
    } else if (sourceChange.type === DiffType.ADDED && targetChange.type === DiffType.ADDED) {
      return 'both_added';
    } else if (sourceChange.type === DiffType.DELETED && targetChange.type === DiffType.DELETED) {
      return 'both_deleted';
    } else {
      return 'content';
    }
  }
}

/**
 * 变更信息接口
 */
interface ChangeInfo {
  startLine: number;
  endLine: number;
  newStartLine: number;
  newEndLine: number;
  type: DiffType;
  content: string[];
}

/**
 * 版本对比工具类
 * 提供高级的版本对比和合并功能
 */
export class VersionDiffUtils {
  /**
   * 计算两个版本之间的差异统计
   */
  public static getDiffStatistics(diffs: DiffResult[]): DiffStatistics {
    const stats: DiffStatistics = {
      totalLines: diffs.length,
      addedLines: 0,
      deletedLines: 0,
      modifiedLines: 0,
      unchangedLines: 0,
      addedChars: 0,
      deletedChars: 0
    };
    
    for (const diff of diffs) {
      switch (diff.type) {
        case DiffType.ADDED:
          stats.addedLines++;
          stats.addedChars += diff.newContent?.length || 0;
          break;
        case DiffType.DELETED:
          stats.deletedLines++;
          stats.deletedChars += diff.oldContent?.length || 0;
          break;
        case DiffType.MODIFIED:
          stats.modifiedLines++;
          stats.addedChars += diff.newContent?.length || 0;
          stats.deletedChars += diff.oldContent?.length || 0;
          break;
        case DiffType.UNCHANGED:
          stats.unchangedLines++;
          break;
      }
    }
    
    return stats;
  }

  /**
   * 生成HTML格式的差异展示
   */
  public static generateHtmlDiff(diffs: DiffResult[]): string {
    const lines: string[] = [];
    
    lines.push('<div class="diff-container">');
    
    for (const diff of diffs) {
      const lineClass = `diff-line diff-${diff.type}`;
      const lineNumber = diff.lineNumber + 1;
      
      switch (diff.type) {
        case DiffType.ADDED:
          lines.push(
            `<div class="${lineClass}">` +
            `<span class="line-number">+${lineNumber}</span>` +
            `<span class="line-content">${this.escapeHtml(diff.newContent || '')}</span>` +
            `</div>`
          );
          break;
        case DiffType.DELETED:
          lines.push(
            `<div class="${lineClass}">` +
            `<span class="line-number">-${lineNumber}</span>` +
            `<span class="line-content">${this.escapeHtml(diff.oldContent || '')}</span>` +
            `</div>`
          );
          break;
        case DiffType.MODIFIED:
          lines.push(
            `<div class="${lineClass}">` +
            `<span class="line-number">-${lineNumber}</span>` +
            `<span class="line-content old">${this.escapeHtml(diff.oldContent || '')}</span>` +
            `</div>`
          );
          lines.push(
            `<div class="${lineClass}">` +
            `<span class="line-number">+${lineNumber}</span>` +
            `<span class="line-content new">${this.escapeHtml(diff.newContent || '')}</span>` +
            `</div>`
          );
          break;
        case DiffType.UNCHANGED:
          lines.push(
            `<div class="${lineClass}">` +
            `<span class="line-number">${lineNumber}</span>` +
            `<span class="line-content">${this.escapeHtml(diff.oldContent || '')}</span>` +
            `</div>`
          );
          break;
      }
    }
    
    lines.push('</div>');
    
    return lines.join('\n');
  }

  /**
   * 生成统一diff格式输出
   */
  public static generateUnifiedDiff(
    oldContent: string,
    newContent: string,
    oldFileName: string = 'a/document',
    newFileName: string = 'b/document'
  ): string {
    const diffs = MyersDiffAlgorithm.diff(oldContent, newContent);
    const lines: string[] = [];
    
    lines.push(`--- ${oldFileName}`);
    lines.push(`+++ ${newFileName}`);
    
    let hunkStart = 0;
    let hunkOldCount = 0;
    let hunkNewCount = 0;
    const hunkLines: string[] = [];
    
    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      
      switch (diff.type) {
        case DiffType.UNCHANGED:
          hunkLines.push(` ${diff.oldContent}`);
          hunkOldCount++;
          hunkNewCount++;
          break;
        case DiffType.ADDED:
          hunkLines.push(`+${diff.newContent}`);
          hunkNewCount++;
          break;
        case DiffType.DELETED:
          hunkLines.push(`-${diff.oldContent}`);
          hunkOldCount++;
          break;
        case DiffType.MODIFIED:
          hunkLines.push(`-${diff.oldContent}`);
          hunkLines.push(`+${diff.newContent}`);
          hunkOldCount++;
          hunkNewCount++;
          break;
      }
      
      // 检查是否需要输出hunk头
      if (hunkStart === 0) {
        hunkStart = diff.lineNumber;
      }
      
      // 检查是否需要结束当前hunk
      if (i === diffs.length - 1 || this.shouldStartNewHunk(diffs, i)) {
        if (hunkLines.length > 0) {
          lines.push(`@@ -${hunkStart + 1},${hunkOldCount} +${hunkStart + 1},${hunkNewCount} @@`);
          lines.push(...hunkLines);
          
          hunkStart = 0;
          hunkOldCount = 0;
          hunkNewCount = 0;
          hunkLines.length = 0;
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 判断是否应该开始新的hunk
   */
  private static shouldStartNewHunk(diffs: DiffResult[], currentIndex: number): boolean {
    // 如果连续多行未变更，则开始新hunk
    let unchangedCount = 0;
    for (let i = currentIndex + 1; i < Math.min(currentIndex + 6, diffs.length); i++) {
      if (diffs[i].type === DiffType.UNCHANGED) {
        unchangedCount++;
      } else {
        break;
      }
    }
    
    return unchangedCount >= 3;
  }

  /**
   * HTML转义
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * 差异统计接口
 */
export interface DiffStatistics {
  totalLines: number;
  addedLines: number;
  deletedLines: number;
  modifiedLines: number;
  unchangedLines: number;
  addedChars: number;
  deletedChars: number;
}

/**
 * 缓存机制
 * 缓存diff计算结果以提高性能
 */
export class DiffCache {
  private static cache = new Map<string, DiffResult[]>();
  private static maxCacheSize = 100;

  /**
   * 生成缓存键
   */
  private static getCacheKey(oldContent: string, newContent: string): string {
    const oldHash = this.hash(oldContent);
    const newHash = this.hash(newContent);
    return `${oldHash}-${newHash}`;
  }

  /**
   * 简单哈希函数
   */
  private static hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * 获取缓存的diff结果
   */
  public static getCachedDiff(oldContent: string, newContent: string): DiffResult[] | null {
    const key = this.getCacheKey(oldContent, newContent);
    return this.cache.get(key) || null;
  }

  /**
   * 缓存diff结果
   */
  public static cacheDiff(oldContent: string, newContent: string, result: DiffResult[]): void {
    if (this.cache.size >= this.maxCacheSize) {
      // LRU策略：删除最旧的条目
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const key = this.getCacheKey(oldContent, newContent);
    this.cache.set(key, result);
  }

  /**
   * 清空缓存
   */
  public static clearCache(): void {
    this.cache.clear();
  }
}