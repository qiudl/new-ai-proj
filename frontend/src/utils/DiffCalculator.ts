/**
 * DiffCalculator - 文档版本对比工具类
 *
 * 功能：
 * 1. 计算两个文本之间的差异（行级别）
 * 2. 计算行内字符级别的差异
 * 3. 生成统计信息（新增、删除、修改行数）
 *
 * 基于 diff 库（Myers算法）
 */

import { diffLines, diffWords, diffChars, Change } from 'diff';

/**
 * Diff结果类型
 */
export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * 单行Diff结果
 */
export interface DiffLine {
  /** Diff类型 */
  type: DiffType;
  /** 行号（在新版本中的位置） */
  lineNumber: number;
  /** 旧版本行号 */
  oldLineNumber?: number;
  /** 行内容 */
  content: string;
  /** 修改前的内容（仅修改类型） */
  oldContent?: string;
  /** 修改后的内容（仅修改类型） */
  newContent?: string;
  /** 行内字符级别的变更 */
  inlineChanges?: InlineChange[];
}

/**
 * 行内字符级别变更
 */
export interface InlineChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Diff统计信息
 */
export interface DiffStats {
  /** 新增行数 */
  added: number;
  /** 删除行数 */
  removed: number;
  /** 修改行数 */
  modified: number;
  /** 未变更行数 */
  unchanged: number;
  /** 总行数（新版本） */
  totalLines: number;
}

/**
 * DiffCalculator 工具类
 */
export class DiffCalculator {

  /**
   * 计算两个文本的行级别Diff
   *
   * @param oldText 旧文本
   * @param newText 新文本
   * @returns Diff结果数组
   */
  calculateLineDiff(oldText: string, newText: string): DiffLine[] {
    // 使用diff库计算差异
    const changes = diffLines(oldText, newText);

    const results: DiffLine[] = [];
    let newLineNumber = 1;
    let oldLineNumber = 1;

    changes.forEach((change: Change) => {
      const lines = change.value.split('\n');
      // 移除最后一个空行（split产生的）
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }

      lines.forEach((line: string) => {
        if (change.added) {
          // 新增行
          results.push({
            type: 'added',
            lineNumber: newLineNumber,
            content: line
          });
          newLineNumber++;
        } else if (change.removed) {
          // 删除行
          results.push({
            type: 'removed',
            lineNumber: newLineNumber,
            oldLineNumber: oldLineNumber,
            content: line
          });
          oldLineNumber++;
        } else {
          // 未变更行
          results.push({
            type: 'unchanged',
            lineNumber: newLineNumber,
            oldLineNumber: oldLineNumber,
            content: line
          });
          newLineNumber++;
          oldLineNumber++;
        }
      });
    });

    // 检测修改行（连续的删除+新增可能是修改）
    return this.detectModifiedLines(results);
  }

  /**
   * 检测修改行
   * 将连续的删除+新增识别为修改
   *
   * @param diffs 原始Diff结果
   * @returns 优化后的Diff结果
   */
  private detectModifiedLines(diffs: DiffLine[]): DiffLine[] {
    const optimized: DiffLine[] = [];
    let i = 0;

    while (i < diffs.length) {
      const current = diffs[i];
      const next = diffs[i + 1];

      // 检查是否是"删除+新增"模式（可能是修改）
      if (
        current.type === 'removed' &&
        next &&
        next.type === 'added' &&
        // 内容相似度检查（可选）
        this.isSimilarContent(current.content, next.content)
      ) {
        // 识别为修改行
        optimized.push({
          type: 'modified',
          lineNumber: next.lineNumber,
          oldLineNumber: current.oldLineNumber,
          content: next.content,
          oldContent: current.content,
          newContent: next.content,
          inlineChanges: this.calculateInlineChanges(current.content, next.content)
        });
        i += 2; // 跳过下一行
      } else {
        optimized.push(current);
        i++;
      }
    }

    return optimized;
  }

  /**
   * 判断两行内容是否相似（用于识别修改）
   * 简单策略：长度相近或有共同子串
   *
   * @param line1 行1
   * @param line2 行2
   * @returns 是否相似
   */
  private isSimilarContent(line1: string, line2: string): boolean {
    // 如果两行都很短（<10字符），不认为是修改
    if (line1.length < 10 && line2.length < 10 && line1 !== line2) {
      return false;
    }

    // 长度相差不超过50%
    const maxLen = Math.max(line1.length, line2.length);
    const minLen = Math.min(line1.length, line2.length);
    if (maxLen === 0) return true;
    if (minLen / maxLen < 0.5) return false;

    // 有共同的前缀或后缀
    if (this.commonPrefixLength(line1, line2) > 5) return true;
    if (this.commonSuffixLength(line1, line2) > 5) return true;

    // 相似度检查（简单的字符匹配）
    const similarity = this.calculateSimilarity(line1, line2);
    return similarity > 0.3;
  }

  /**
   * 计算共同前缀长度
   */
  private commonPrefixLength(str1: string, str2: string): number {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return i;
  }

  /**
   * 计算共同后缀长度
   */
  private commonSuffixLength(str1: string, str2: string): number {
    let i = 0;
    while (
      i < str1.length &&
      i < str2.length &&
      str1[str1.length - 1 - i] === str2[str2.length - 1 - i]
    ) {
      i++;
    }
    return i;
  }

  /**
   * 计算两个字符串的相似度（0-1）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * 计算行内字符级别的变更（用于修改行的精确高亮）
   *
   * @param oldLine 旧行内容
   * @param newLine 新行内容
   * @returns 行内变更数组
   */
  calculateInlineChanges(oldLine: string, newLine: string): InlineChange[] {
    const changes = diffWords(oldLine, newLine);

    return changes.map((change: Change) => ({
      type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
      value: change.value
    }));
  }

  /**
   * 计算Diff统计信息
   *
   * @param diffs Diff结果数组
   * @returns 统计信息
   */
  calculateStats(diffs: DiffLine[]): DiffStats {
    const stats: DiffStats = {
      added: 0,
      removed: 0,
      modified: 0,
      unchanged: 0,
      totalLines: 0
    };

    diffs.forEach(diff => {
      switch (diff.type) {
        case 'added':
          stats.added++;
          stats.totalLines++;
          break;
        case 'removed':
          stats.removed++;
          break;
        case 'modified':
          stats.modified++;
          stats.totalLines++;
          break;
        case 'unchanged':
          stats.unchanged++;
          stats.totalLines++;
          break;
      }
    });

    return stats;
  }

  /**
   * 格式化统计信息为字符串（如：+12 -3 ~2）
   *
   * @param stats 统计信息
   * @returns 格式化字符串
   */
  formatStats(stats: DiffStats): string {
    const parts: string[] = [];

    if (stats.added > 0) {
      parts.push(`+${stats.added}`);
    }
    if (stats.removed > 0) {
      parts.push(`-${stats.removed}`);
    }
    if (stats.modified > 0) {
      parts.push(`~${stats.modified}`);
    }

    return parts.length > 0 ? parts.join(' ') : '无变更';
  }
}

/**
 * 导出单例实例
 */
export const diffCalculator = new DiffCalculator();
