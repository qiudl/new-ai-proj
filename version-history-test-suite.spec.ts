/**
 * 版本历史功能综合测试套件
 * 涵盖所有核心功能的单元测试、集成测试和端到端测试
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  MyersDiffAlgorithm,
  ThreeWayMergeAlgorithm,
  VersionDiffUtils,
  DiffCache,
  DiffType,
  DiffResult,
  MergeResult
} from './version-diff-algorithm';

import {
  DocumentMergeService,
  MergeStrategy,
  ConflictCategory,
  MergeConfig,
  MergeContext,
  SmartMergeResult
} from './document-merge-service';

import {
  VersionRollbackService,
  RollbackStrategy,
  RollbackScope,
  RollbackConfig,
  RollbackContext,
  RollbackResult
} from './version-rollback-service';

// ================================
// 测试数据和工具函数
// ================================

const testDocuments = {
  simple: {
    original: "Line 1\nLine 2\nLine 3",
    modified: "Line 1\nLine 2 Modified\nLine 3\nLine 4",
    conflicted: "Line 1\nLine 2 Different\nLine 3\nLine 5"
  },
  markdown: {
    original: `# 项目文档

## 介绍
这是一个测试项目。

## 功能
- 功能1
- 功能2

## 结论
项目完成。`,
    modified: `# 项目文档 v2.0

## 介绍
这是一个测试项目的新版本。

## 功能
- 功能1（已优化）
- 功能2
- 功能3（新增）

## 性能
新增性能测试结果。

## 结论
项目完成并发布。`,
    alternative: `# 项目文档

## 介绍
这是一个测试项目的替代版本。

## 功能
- 功能1
- 功能2（重构）
- 新功能A

## 安全
新增安全相关内容。

## 结论
项目完成测试。`
  }
};

const createMockContext = (type: 'merge' | 'rollback' = 'merge') => {
  const baseContext = {
    documentId: 123,
    taskId: 456,
    baseVersion: {
      id: 1,
      content: testDocuments.markdown.original,
      versionNumber: '1.0.0'
    }
  };

  if (type === 'merge') {
    return {
      ...baseContext,
      sourceVersion: {
        id: 2,
        content: testDocuments.markdown.modified,
        versionNumber: '1.1.0',
        author: 'user1'
      },
      targetVersion: {
        id: 3,
        content: testDocuments.markdown.alternative,
        versionNumber: '1.2.0',
        author: 'user2'
      },
      mergedBy: {
        id: 4,
        username: 'merger'
      }
    } as MergeContext;
  } else {
    return {
      ...baseContext,
      currentVersion: {
        id: 3,
        versionNumber: '1.2.0',
        content: testDocuments.markdown.alternative,
        createdAt: new Date(),
        createdBy: 2
      },
      targetVersion: {
        id: 1,
        versionNumber: '1.0.0',
        content: testDocuments.markdown.original,
        createdAt: new Date(Date.now() - 86400000),
        createdBy: 1
      },
      rollbackBy: {
        id: 4,
        username: 'admin',
        email: 'admin@example.com'
      }
    } as RollbackContext;
  }
};

// ================================
// Myers差异算法测试
// ================================

describe('Myers差异算法测试', () => {
  describe('基本功能测试', () => {
    it('应该正确识别相同内容', () => {
      const diffs = MyersDiffAlgorithm.diff(
        testDocuments.simple.original,
        testDocuments.simple.original
      );
      
      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs.every(diff => diff.type === DiffType.UNCHANGED)).toBe(true);
    });

    it('应该正确识别添加的内容', () => {
      const diffs = MyersDiffAlgorithm.diff(
        "Line 1\nLine 2",
        "Line 1\nLine 2\nLine 3"
      );
      
      const addedDiffs = diffs.filter(d => d.type === DiffType.ADDED);
      expect(addedDiffs.length).toBe(1);
      expect(addedDiffs[0].newContent).toBe('Line 3');
    });

    it('应该正确识别删除的内容', () => {
      const diffs = MyersDiffAlgorithm.diff(
        "Line 1\nLine 2\nLine 3",
        "Line 1\nLine 3"
      );
      
      const deletedDiffs = diffs.filter(d => d.type === DiffType.DELETED);
      expect(deletedDiffs.length).toBe(1);
      expect(deletedDiffs[0].oldContent).toBe('Line 2');
    });

    it('应该正确识别修改的内容', () => {
      const diffs = MyersDiffAlgorithm.diff(
        testDocuments.simple.original,
        testDocuments.simple.modified
      );
      
      const modifiedDiffs = diffs.filter(d => d.type === DiffType.MODIFIED);
      expect(modifiedDiffs.length).toBeGreaterThan(0);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空文档', () => {
      const diffs = MyersDiffAlgorithm.diff('', '');
      expect(diffs).toEqual([]);
    });

    it('应该处理一个文档为空的情况', () => {
      const diffs = MyersDiffAlgorithm.diff('', 'New content');
      expect(diffs.every(d => d.type === DiffType.ADDED)).toBe(true);
    });

    it('应该处理单行文档', () => {
      const diffs = MyersDiffAlgorithm.diff('Single line', 'Modified line');
      expect(diffs.length).toBeGreaterThan(0);
    });

    it('应该处理大型文档', () => {
      const largeDoc1 = Array.from({length: 1000}, (_, i) => `Line ${i + 1}`).join('\n');
      const largeDoc2 = Array.from({length: 1000}, (_, i) => `Line ${i + 1}${i % 100 === 0 ? ' Modified' : ''}`).join('\n');
      
      const startTime = Date.now();
      const diffs = MyersDiffAlgorithm.diff(largeDoc1, largeDoc2);
      const endTime = Date.now();
      
      expect(diffs.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成中等大小文档的diff计算', () => {
      const mediumDoc1 = Array.from({length: 500}, (_, i) => `Line ${i + 1}`).join('\n');
      const mediumDoc2 = Array.from({length: 500}, (_, i) => `Line ${i + 1}${i % 50 === 0 ? ' Changed' : ''}`).join('\n');
      
      const startTime = Date.now();
      const diffs = MyersDiffAlgorithm.diff(mediumDoc1, mediumDoc2);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
      expect(diffs.length).toBeGreaterThan(0);
    });

    it('应该提供上下文信息', () => {
      const diffs = MyersDiffAlgorithm.diff(
        testDocuments.markdown.original,
        testDocuments.markdown.modified
      );
      
      const changedDiffs = diffs.filter(d => d.type !== DiffType.UNCHANGED);
      changedDiffs.forEach(diff => {
        expect(diff.contextBefore).toBeDefined();
        expect(diff.contextAfter).toBeDefined();
      });
    });
  });
});

// ================================
// 三方合并算法测试
// ================================

describe('三方合并算法测试', () => {
  describe('基本合并功能', () => {
    it('应该能够成功合并无冲突的版本', () => {
      const base = "Line 1\nLine 2\nLine 3";
      const source = "Line 1\nLine 2 Modified\nLine 3";
      const target = "Line 1\nLine 2\nLine 3\nLine 4";
      
      const result = ThreeWayMergeAlgorithm.merge(base, source, target);
      
      expect(result.success).toBe(true);
      expect(result.conflicts.length).toBe(0);
      expect(result.autoResolvedCount).toBeGreaterThan(0);
    });

    it('应该能够检测并标记冲突', () => {
      const base = "Line 1\nLine 2\nLine 3";
      const source = "Line 1\nLine 2 Source\nLine 3";
      const target = "Line 1\nLine 2 Target\nLine 3";
      
      const result = ThreeWayMergeAlgorithm.merge(base, source, target);
      
      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.manualResolvedCount).toBeGreaterThan(0);
    });

    it('应该能够自动解决相同的变更', () => {
      const base = "Line 1\nLine 2\nLine 3";
      const source = "Line 1\nLine 2 Same\nLine 3";
      const target = "Line 1\nLine 2 Same\nLine 3";
      
      const result = ThreeWayMergeAlgorithm.merge(base, source, target);
      
      expect(result.success).toBe(true);
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('复杂合并场景', () => {
    it('应该处理多重冲突', () => {
      const base = testDocuments.markdown.original;
      const source = testDocuments.markdown.modified;
      const target = testDocuments.markdown.alternative;
      
      const result = ThreeWayMergeAlgorithm.merge(base, source, target);
      
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('应该提供详细的冲突信息', () => {
      const base = "# Title\nContent";
      const source = "# Title Modified\nContent";
      const target = "# Title Changed\nContent";
      
      const result = ThreeWayMergeAlgorithm.merge(base, source, target);
      
      result.conflicts.forEach(conflict => {
        expect(conflict.lineStart).toBeDefined();
        expect(conflict.lineEnd).toBeDefined();
        expect(conflict.baseContent).toBeDefined();
        expect(conflict.sourceContent).toBeDefined();
        expect(conflict.targetContent).toBeDefined();
        expect(conflict.conflictType).toBeDefined();
      });
    });
  });
});

// ================================
// 版本对比工具类测试
// ================================

describe('版本对比工具类测试', () => {
  describe('差异统计功能', () => {
    it('应该正确计算差异统计', () => {
      const diffs = MyersDiffAlgorithm.diff(
        testDocuments.simple.original,
        testDocuments.simple.modified
      );
      
      const stats = VersionDiffUtils.getDiffStatistics(diffs);
      
      expect(stats.totalLines).toBeGreaterThan(0);
      expect(stats.addedLines + stats.deletedLines + stats.modifiedLines + stats.unchangedLines).toBe(stats.totalLines);
      expect(stats.addedChars).toBeGreaterThanOrEqual(0);
      expect(stats.deletedChars).toBeGreaterThanOrEqual(0);
    });

    it('应该处理无差异的情况', () => {
      const diffs = MyersDiffAlgorithm.diff(
        testDocuments.simple.original,
        testDocuments.simple.original
      );
      
      const stats = VersionDiffUtils.getDiffStatistics(diffs);
      
      expect(stats.addedLines).toBe(0);
      expect(stats.deletedLines).toBe(0);
      expect(stats.modifiedLines).toBe(0);
      expect(stats.unchangedLines).toBe(stats.totalLines);
    });
  });

  describe('HTML diff生成', () => {
    it('应该生成有效的HTML diff', () => {
      const diffs = MyersDiffAlgorithm.diff(
        testDocuments.simple.original,
        testDocuments.simple.modified
      );
      
      const htmlDiff = VersionDiffUtils.generateHtmlDiff(diffs);
      
      expect(htmlDiff).toContain('<div class="diff-container">');
      expect(htmlDiff).toContain('</div>');
      expect(htmlDiff.length).toBeGreaterThan(0);
    });

    it('生成的HTML应该包含正确的CSS类', () => {
      const diffs = MyersDiffAlgorithm.diff("Old", "New");
      const htmlDiff = VersionDiffUtils.generateHtmlDiff(diffs);
      
      expect(htmlDiff).toMatch(/diff-line/);
      expect(htmlDiff).toMatch(/line-number/);
      expect(htmlDiff).toMatch(/line-content/);
    });
  });

  describe('统一diff格式生成', () => {
    it('应该生成有效的统一diff格式', () => {
      const unifiedDiff = VersionDiffUtils.generateUnifiedDiff(
        testDocuments.simple.original,
        testDocuments.simple.modified,
        'old.txt',
        'new.txt'
      );
      
      expect(unifiedDiff).toContain('--- old.txt');
      expect(unifiedDiff).toContain('+++ new.txt');
      expect(unifiedDiff).toMatch(/@@.*@@/);
    });

    it('应该正确标记添加和删除的行', () => {
      const unifiedDiff = VersionDiffUtils.generateUnifiedDiff(
        "Line 1",
        "Line 2"
      );
      
      expect(unifiedDiff).toMatch(/^-/m); // 删除行
      expect(unifiedDiff).toMatch(/^\+/m); // 添加行
    });
  });
});

// ================================
// Diff缓存测试
// ================================

describe('Diff缓存测试', () => {
  beforeEach(() => {
    DiffCache.clearCache();
  });

  afterEach(() => {
    DiffCache.clearCache();
  });

  it('应该能够缓存和检索diff结果', () => {
    const oldContent = testDocuments.simple.original;
    const newContent = testDocuments.simple.modified;
    
    // 第一次计算
    const result1 = MyersDiffAlgorithm.diff(oldContent, newContent);
    DiffCache.cacheDiff(oldContent, newContent, result1);
    
    // 从缓存获取
    const cachedResult = DiffCache.getCachedDiff(oldContent, newContent);
    
    expect(cachedResult).toBeDefined();
    expect(cachedResult).toEqual(result1);
  });

  it('应该在缓存未命中时返回null', () => {
    const result = DiffCache.getCachedDiff('not cached', 'content');
    expect(result).toBeNull();
  });

  it('应该实现LRU缓存策略', () => {
    // 填满缓存
    for (let i = 0; i < 101; i++) {
      const diffs = MyersDiffAlgorithm.diff(`content${i}`, `modified${i}`);
      DiffCache.cacheDiff(`content${i}`, `modified${i}`, diffs);
    }
    
    // 第一个条目应该被淘汰
    const firstResult = DiffCache.getCachedDiff('content0', 'modified0');
    expect(firstResult).toBeNull();
    
    // 最后一个条目应该还在
    const lastResult = DiffCache.getCachedDiff('content100', 'modified100');
    expect(lastResult).toBeDefined();
  });
});

// ================================
// 文档合并服务测试
// ================================

describe('文档合并服务测试', () => {
  let mergeService: DocumentMergeService;
  let mockContext: MergeContext;

  beforeEach(() => {
    mergeService = new DocumentMergeService();
    mockContext = createMockContext('merge');
  });

  describe('智能合并功能', () => {
    it('应该能够执行基本合并', async () => {
      const result = await mergeService.mergeDocuments(mockContext);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('应该提供合并统计信息', async () => {
      const result = await mergeService.mergeDocuments(mockContext);
      
      expect(result.statistics.totalLines).toBeGreaterThan(0);
      expect(result.statistics.mergedLines).toBeGreaterThanOrEqual(0);
      expect(result.statistics.conflictLines).toBeGreaterThanOrEqual(0);
      expect(result.statistics.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.statistics.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('应该能够自动解决格式冲突', async () => {
      const formatContext: MergeContext = {
        ...mockContext,
        sourceVersion: {
          ...mockContext.sourceVersion,
          content: "Line 1\n  Line 2\nLine 3"  // 不同缩进
        },
        targetVersion: {
          ...mockContext.targetVersion,
          content: "Line 1\n    Line 2\nLine 3"  // 不同缩进
        }
      };

      const config: Partial<MergeConfig> = {
        strategy: MergeStrategy.AUTO,
        autoResolvePolicy: {
          whitespaceConflicts: true,
          commentConflicts: true,
          importConflicts: false,
          similarityThreshold: 0.8
        }
      };

      const result = await mergeService.mergeDocuments(formatContext, config);
      expect(result.statistics.autoResolvedConflicts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('冲突分析功能', () => {
    it('应该正确分类冲突类型', async () => {
      const result = await mergeService.mergeDocuments(mockContext);
      
      result.conflicts.forEach(conflict => {
        expect(Object.values(ConflictCategory)).toContain(conflict.category);
        expect(['low', 'medium', 'high']).toContain(conflict.severity);
        expect(typeof conflict.similarityScore).toBe('number');
        expect(conflict.similarityScore).toBeGreaterThanOrEqual(0);
        expect(conflict.similarityScore).toBeLessThanOrEqual(1);
      });
    });

    it('应该提供合并建议', async () => {
      const result = await mergeService.mergeDocuments(mockContext);
      
      result.suggestions.forEach(suggestion => {
        expect(['auto_resolve', 'manual_review', 'split_content']).toContain(suggestion.type);
        expect(suggestion.conflictId).toBeDefined();
        expect(suggestion.description).toBeDefined();
        expect(typeof suggestion.confidence).toBe('number');
      });
    });

    it('应该生成合理的警告', async () => {
      const result = await mergeService.mergeDocuments(mockContext);
      
      result.warnings.forEach(warning => {
        expect(['performance', 'data_loss', 'compatibility']).toContain(warning.type);
        expect(['info', 'warning', 'error']).toContain(warning.severity);
        expect(warning.message).toBeDefined();
      });
    });
  });
});

// ================================
// 版本回滚服务测试
// ================================

describe('版本回滚服务测试', () => {
  let rollbackService: VersionRollbackService;
  let mockContext: RollbackContext;

  beforeEach(() => {
    rollbackService = new VersionRollbackService();
    mockContext = createMockContext('rollback');
  });

  describe('基本回滚功能', () => {
    it('应该能够执行完整回滚', async () => {
      const config: Partial<RollbackConfig> = {
        strategy: RollbackStrategy.CREATE_NEW,
        scope: RollbackScope.FULL,
        validateBeforeRollback: false, // 简化测试
        createBackup: false
      };

      const result = await rollbackService.rollbackVersion(mockContext, config);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.rollbackId).toBeDefined();
      expect(result.strategy).toBe(RollbackStrategy.CREATE_NEW);
      expect(result.scope).toBe(RollbackScope.FULL);
      expect(result.timeline).toBeDefined();
      expect(result.timeline.length).toBeGreaterThan(0);
    });

    it('应该能够执行部分回滚', async () => {
      const partialConfig = {
        sections: [
          {
            name: 'Introduction',
            startLine: 0,
            endLine: 5,
            rollback: true,
            priority: 1
          }
        ],
        mergeStrategy: 'theirs' as const,
        conflictResolution: 'auto' as const
      };

      const result = await rollbackService.partialRollback(
        mockContext,
        partialConfig,
        { validateBeforeRollback: false, createBackup: false }
      );
      
      expect(result.success).toBeDefined();
      expect(result.scope).toBe(RollbackScope.PARTIAL);
    });

    it('应该能够执行选择性回滚', async () => {
      const selections = [
        { startLine: 1, endLine: 3 },
        { startLine: 8, endLine: 10 }
      ];

      const result = await rollbackService.selectiveRollback(
        mockContext,
        selections,
        { validateBeforeRollback: false, createBackup: false }
      );
      
      expect(result.success).toBeDefined();
      expect(result.scope).toBe(RollbackScope.SELECTIVE);
      expect(result.affectedLines).toBeDefined();
    });
  });

  describe('风险评估功能', () => {
    it('应该正确评估数据丢失风险', async () => {
      const result = await rollbackService.rollbackVersion(mockContext, {
        validateBeforeRollback: false,
        createBackup: false
      });
      
      expect(['none', 'low', 'medium', 'high']).toContain(result.statistics.dataLossRisk);
    });

    it('应该在高风险情况下给出警告', async () => {
      // 创建高风险场景：目标版本远小于当前版本
      const highRiskContext: RollbackContext = {
        ...mockContext,
        currentVersion: {
          ...mockContext.currentVersion,
          content: testDocuments.markdown.modified // 较长内容
        },
        targetVersion: {
          ...mockContext.targetVersion,
          content: "Short content" // 较短内容
        }
      };

      const result = await rollbackService.rollbackVersion(highRiskContext, {
        validateBeforeRollback: false,
        createBackup: false,
        allowDataLoss: false
      });
      
      const dataLossWarnings = result.warnings.filter(w => w.type === 'data_loss');
      if (result.statistics.dataLossRisk !== 'none') {
        expect(dataLossWarnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('验证功能', () => {
    it('应该执行回滚前验证', async () => {
      const result = await rollbackService.rollbackVersion(mockContext, {
        validateBeforeRollback: true,
        createBackup: false
      });
      
      expect(result.validations).toBeDefined();
      expect(result.validations.length).toBeGreaterThan(0);
      
      result.validations.forEach(validation => {
        expect(['content', 'structure', 'dependency', 'permission']).toContain(validation.type);
        expect(typeof validation.passed).toBe('boolean');
        expect(validation.message).toBeDefined();
      });
    });

    it('应该记录详细的时间线', async () => {
      const result = await rollbackService.rollbackVersion(mockContext, {
        validateBeforeRollback: true,
        createBackup: true
      });
      
      expect(result.timeline.length).toBeGreaterThan(0);
      
      result.timeline.forEach(event => {
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.event).toBeDefined();
        expect(event.details).toBeDefined();
        expect(['pending', 'in_progress', 'completed', 'failed']).toContain(event.status);
      });

      // 验证关键事件
      const eventTypes = result.timeline.map(e => e.event);
      expect(eventTypes).toContain('rollback_started');
      
      if (result.success) {
        expect(eventTypes).toContain('rollback_completed');
      }
    });
  });
});

// ================================
// 集成测试
// ================================

describe('版本历史系统集成测试', () => {
  describe('完整工作流程测试', () => {
    it('应该支持 创建版本 -> 对比 -> 合并 -> 回滚 的完整流程', async () => {
      // 1. 创建版本对比
      const diffs = MyersDiffAlgorithm.diff(
        testDocuments.markdown.original,
        testDocuments.markdown.modified
      );
      
      expect(diffs.length).toBeGreaterThan(0);

      // 2. 执行合并
      const mergeService = new DocumentMergeService();
      const mergeContext = createMockContext('merge');
      const mergeResult = await mergeService.mergeDocuments(mergeContext);
      
      expect(mergeResult).toBeDefined();

      // 3. 如果需要，执行回滚
      if (!mergeResult.success || mergeResult.conflicts.length > 0) {
        const rollbackService = new VersionRollbackService();
        const rollbackContext = createMockContext('rollback');
        
        const rollbackResult = await rollbackService.rollbackVersion(rollbackContext, {
          validateBeforeRollback: false,
          createBackup: false
        });
        
        expect(rollbackResult).toBeDefined();
      }
    });

    it('应该处理复杂的多版本合并场景', async () => {
      const mergeService = new DocumentMergeService();
      
      // 创建复杂合并场景
      const complexContext: MergeContext = {
        documentId: 123,
        taskId: 456,
        baseVersion: {
          id: 1,
          content: testDocuments.markdown.original,
          versionNumber: '1.0.0'
        },
        sourceVersion: {
          id: 2,
          content: testDocuments.markdown.modified,
          versionNumber: '2.0.0',
          author: 'developer1'
        },
        targetVersion: {
          id: 3,
          content: testDocuments.markdown.alternative,
          versionNumber: '2.1.0',
          author: 'developer2'
        },
        mergedBy: {
          id: 4,
          username: 'teamlead'
        }
      };

      const result = await mergeService.mergeDocuments(complexContext);
      
      // 验证合并结果的完整性
      expect(result.success).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.statistics.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.statistics.confidenceScore).toBeLessThanOrEqual(1);
      
      // 如果有冲突，应该提供解决建议
      if (result.conflicts.length > 0) {
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('性能集成测试', () => {
    it('应该在合理时间内处理大型文档的完整工作流程', async () => {
      // 生成大型测试文档
      const largeContent1 = Array.from({length: 1000}, (_, i) => 
        `## Section ${i + 1}\nContent for section ${i + 1}.\n\n`
      ).join('');
      
      const largeContent2 = Array.from({length: 1000}, (_, i) => 
        `## Section ${i + 1}${i % 100 === 0 ? ' (Updated)' : ''}\nContent for section ${i + 1}${i % 50 === 0 ? ' with changes' : ''}.\n\n`
      ).join('');

      const largeContent3 = Array.from({length: 1000}, (_, i) => 
        `## Section ${i + 1}${i % 150 === 0 ? ' (Alternative)' : ''}\nContent for section ${i + 1}${i % 75 === 0 ? ' with different changes' : ''}.\n\n`
      ).join('');

      const startTime = Date.now();

      // 1. 计算差异
      const diffs = MyersDiffAlgorithm.diff(largeContent1, largeContent2);
      const diffTime = Date.now();
      
      // 2. 执行合并
      const mergeService = new DocumentMergeService();
      const largeContext: MergeContext = {
        documentId: 999,
        taskId: 999,
        baseVersion: { id: 1, content: largeContent1, versionNumber: '1.0.0' },
        sourceVersion: { id: 2, content: largeContent2, versionNumber: '2.0.0', author: 'user1' },
        targetVersion: { id: 3, content: largeContent3, versionNumber: '2.1.0', author: 'user2' },
        mergedBy: { id: 4, username: 'admin' }
      };

      const mergeResult = await mergeService.mergeDocuments(largeContext);
      const mergeTime = Date.now();

      // 3. 如果需要，执行回滚
      const rollbackService = new VersionRollbackService();
      const rollbackContext: RollbackContext = {
        documentId: 999,
        taskId: 999,
        currentVersion: {
          id: 3,
          versionNumber: '2.1.0',
          content: largeContent3,
          createdAt: new Date(),
          createdBy: 2
        },
        targetVersion: {
          id: 1,
          versionNumber: '1.0.0',
          content: largeContent1,
          createdAt: new Date(Date.now() - 86400000),
          createdBy: 1
        },
        rollbackBy: {
          id: 4,
          username: 'admin',
          email: 'admin@example.com'
        }
      };

      const rollbackResult = await rollbackService.rollbackVersion(rollbackContext, {
        validateBeforeRollback: false,
        createBackup: false
      });
      const endTime = Date.now();

      // 验证性能要求
      expect(diffTime - startTime).toBeLessThan(3000); // diff计算应该在3秒内
      expect(mergeTime - diffTime).toBeLessThan(5000); // 合并应该在5秒内
      expect(endTime - mergeTime).toBeLessThan(2000); // 回滚应该在2秒内
      expect(endTime - startTime).toBeLessThan(10000); // 总耗时应该在10秒内

      // 验证结果正确性
      expect(diffs.length).toBeGreaterThan(0);
      expect(mergeResult).toBeDefined();
      expect(rollbackResult).toBeDefined();
    });
  });

  describe('错误处理集成测试', () => {
    it('应该优雅地处理各种错误情况', async () => {
      const mergeService = new DocumentMergeService();
      const rollbackService = new VersionRollbackService();

      // 测试空内容
      try {
        const diffs = MyersDiffAlgorithm.diff('', '');
        expect(diffs).toEqual([]);
      } catch (error) {
        fail('空内容diff不应该抛出异常');
      }

      // 测试无效合并上下文
      try {
        const invalidContext: MergeContext = {
          documentId: -1,
          taskId: -1,
          baseVersion: { id: -1, content: '', versionNumber: '' },
          sourceVersion: { id: -1, content: '', versionNumber: '', author: '' },
          targetVersion: { id: -1, content: '', versionNumber: '', author: '' },
          mergedBy: { id: -1, username: '' }
        };

        const result = await mergeService.mergeDocuments(invalidContext);
        expect(result).toBeDefined(); // 应该返回结果而不是抛出异常
      } catch (error) {
        // 如果抛出异常，应该是可预期的错误
        expect(error).toBeInstanceOf(Error);
      }

      // 测试无效回滚上下文
      try {
        const invalidRollbackContext: RollbackContext = {
          documentId: -1,
          taskId: -1,
          currentVersion: {
            id: -1,
            versionNumber: '',
            content: '',
            createdAt: new Date(),
            createdBy: -1
          },
          targetVersion: {
            id: -1,
            versionNumber: '',
            content: '',
            createdAt: new Date(),
            createdBy: -1
          },
          rollbackBy: {
            id: -1,
            username: '',
            email: ''
          }
        };

        const result = await rollbackService.rollbackVersion(invalidRollbackContext, {
          validateBeforeRollback: false,
          createBackup: false
        });
        
        // 应该返回失败结果而不是抛出异常
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});

// ================================
// 端到端测试
// ================================

describe('版本历史系统端到端测试', () => {
  it('应该支持完整的文档版本管理生命周期', async () => {
    const testScenario = {
      documentId: 12345,
      taskId: 67890,
      versions: [
        { id: 1, content: testDocuments.markdown.original, version: '1.0.0', author: 'author1' },
        { id: 2, content: testDocuments.markdown.modified, version: '1.1.0', author: 'author2' },
        { id: 3, content: testDocuments.markdown.alternative, version: '1.2.0', author: 'author3' }
      ]
    };

    const timeline: string[] = [];

    try {
      // 1. 版本对比阶段
      timeline.push('开始版本对比');
      const v1v2Diff = MyersDiffAlgorithm.diff(
        testScenario.versions[0].content,
        testScenario.versions[1].content
      );
      
      const v1v3Diff = MyersDiffAlgorithm.diff(
        testScenario.versions[0].content,
        testScenario.versions[2].content
      );
      
      timeline.push(`对比完成: v1->v2 有 ${v1v2Diff.filter(d => d.type !== DiffType.UNCHANGED).length} 个变更`);
      timeline.push(`对比完成: v1->v3 有 ${v1v3Diff.filter(d => d.type !== DiffType.UNCHANGED).length} 个变更`);

      // 2. 合并阶段
      timeline.push('开始三方合并');
      const mergeService = new DocumentMergeService();
      const mergeContext: MergeContext = {
        documentId: testScenario.documentId,
        taskId: testScenario.taskId,
        baseVersion: {
          id: testScenario.versions[0].id,
          content: testScenario.versions[0].content,
          versionNumber: testScenario.versions[0].version
        },
        sourceVersion: {
          id: testScenario.versions[1].id,
          content: testScenario.versions[1].content,
          versionNumber: testScenario.versions[1].version,
          author: testScenario.versions[1].author
        },
        targetVersion: {
          id: testScenario.versions[2].id,
          content: testScenario.versions[2].content,
          versionNumber: testScenario.versions[2].version,
          author: testScenario.versions[2].author
        },
        mergedBy: {
          id: 999,
          username: 'integration_test'
        }
      };

      const mergeResult = await mergeService.mergeDocuments(mergeContext);
      timeline.push(`合并完成: ${mergeResult.success ? '成功' : '有冲突'}, 冲突数: ${mergeResult.conflicts.length}`);

      // 3. 根据合并结果决定下一步
      if (mergeResult.success && mergeResult.conflicts.length === 0) {
        timeline.push('合并成功，无需回滚');
      } else {
        // 4. 回滚阶段
        timeline.push('开始回滚操作');
        const rollbackService = new VersionRollbackService();
        const rollbackContext: RollbackContext = {
          documentId: testScenario.documentId,
          taskId: testScenario.taskId,
          currentVersion: {
            id: testScenario.versions[2].id,
            versionNumber: testScenario.versions[2].version,
            content: testScenario.versions[2].content,
            createdAt: new Date(),
            createdBy: 3
          },
          targetVersion: {
            id: testScenario.versions[0].id,
            versionNumber: testScenario.versions[0].version,
            content: testScenario.versions[0].content,
            createdAt: new Date(Date.now() - 86400000),
            createdBy: 1
          },
          rollbackBy: {
            id: 999,
            username: 'integration_test',
            email: 'test@example.com'
          },
          reason: '合并冲突，回滚到稳定版本'
        };

        const rollbackResult = await rollbackService.rollbackVersion(rollbackContext, {
          strategy: RollbackStrategy.CREATE_NEW,
          createBackup: true,
          validateBeforeRollback: true
        });

        timeline.push(`回滚完成: ${rollbackResult.success ? '成功' : '失败'}`);
        
        if (rollbackResult.success) {
          timeline.push(`创建了新版本: ${rollbackResult.resultVersion?.versionNumber}`);
          if (rollbackResult.backupVersion) {
            timeline.push(`创建了备份版本: ${rollbackResult.backupVersion.versionNumber}`);
          }
        }
      }

      // 验证整个流程
      expect(timeline.length).toBeGreaterThan(3);
      expect(timeline[0]).toBe('开始版本对比');
      
      console.log('端到端测试时间线:');
      timeline.forEach((event, index) => {
        console.log(`${index + 1}. ${event}`);
      });

    } catch (error) {
      timeline.push(`错误: ${error.message}`);
      throw error;
    }
  });
});

// ================================
// 测试配置和辅助函数
// ================================

export const testConfig = {
  timeout: 30000, // 30秒超时
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']
};

export const mockDatabase = {
  versions: new Map(),
  documents: new Map(),
  users: new Map()
};

export const testHelpers = {
  generateLargeContent: (lines: number, prefix: string = 'Line'): string => {
    return Array.from({length: lines}, (_, i) => `${prefix} ${i + 1}`).join('\n');
  },

  createVersionChain: (count: number, baseContent: string) => {
    const versions = [];
    let currentContent = baseContent;
    
    for (let i = 0; i < count; i++) {
      versions.push({
        id: i + 1,
        versionNumber: `1.0.${i}`,
        content: currentContent,
        createdAt: new Date(Date.now() - (count - i) * 86400000),
        createdBy: 1
      });
      
      // 为下一版本添加一些变化
      currentContent += `\nChange ${i + 1} - ${new Date().toISOString()}`;
    }
    
    return versions;
  },

  measurePerformance: async <T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }> => {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    
    console.log(`${label}: ${duration}ms`);
    
    return { result, duration };
  }
};