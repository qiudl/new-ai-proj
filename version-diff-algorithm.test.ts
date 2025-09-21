/**
 * 版本对比算法测试
 */

import {
  MyersDiffAlgorithm,
  ThreeWayMergeAlgorithm,
  VersionDiffUtils,
  DiffCache,
  DiffType,
  DiffResult,
  MergeResult
} from './version-diff-algorithm';

// 测试数据
const testCases = {
  simple: {
    old: "Line 1\nLine 2\nLine 3",
    new: "Line 1\nLine 2 Modified\nLine 3\nLine 4"
  },
  complex: {
    old: `# 项目文档

## 介绍
这是一个测试项目。

## 功能
- 功能1
- 功能2

## 结论
项目完成。`,
    new: `# 项目文档 v2.0

## 介绍
这是一个测试项目的新版本。

## 功能
- 功能1（已优化）
- 功能2
- 功能3（新增）

## 性能
新增性能测试结果。

## 结论
项目完成并发布。`
  }
};

// 运行测试
function runTests() {
  console.log('🧪 开始运行版本对比算法测试...\n');
  
  testMyersDiffAlgorithm();
  testThreeWayMergeAlgorithm();
  testVersionDiffUtils();
  testDiffCache();
  
  console.log('✅ 所有测试完成！');
}

/**
 * 测试Myers差异算法
 */
function testMyersDiffAlgorithm() {
  console.log('📊 测试 Myers 差异算法');
  console.log('=' + '='.repeat(50));
  
  // 测试简单差异
  const simpleDiffs = MyersDiffAlgorithm.diff(testCases.simple.old, testCases.simple.new);
  console.log('简单差异结果:');
  simpleDiffs.forEach((diff, index) => {
    console.log(`  ${index + 1}. [${diff.type}] Line ${diff.lineNumber + 1}: ${diff.oldContent || diff.newContent}`);
  });
  
  // 测试复杂差异
  const complexDiffs = MyersDiffAlgorithm.diff(testCases.complex.old, testCases.complex.new);
  console.log(`\n复杂差异结果 (共 ${complexDiffs.length} 个变更):`);
  const changes = complexDiffs.filter(d => d.type !== DiffType.UNCHANGED);
  changes.slice(0, 5).forEach((diff, index) => {
    const content = diff.oldContent || diff.newContent || '';
    console.log(`  ${index + 1}. [${diff.type}] ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
  });
  
  // 性能测试
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    MyersDiffAlgorithm.diff(testCases.complex.old, testCases.complex.new);
  }
  const endTime = Date.now();
  console.log(`性能测试: 100次复杂diff计算耗时 ${endTime - startTime}ms`);
  
  console.log('');
}

/**
 * 测试三方合并算法
 */
function testThreeWayMergeAlgorithm() {
  console.log('🔀 测试三方合并算法');
  console.log('=' + '='.repeat(50));
  
  const base = `Line 1\nLine 2\nLine 3\nLine 4`;
  const source = `Line 1\nLine 2 (source modified)\nLine 3\nLine 4\nLine 5 (source added)`;
  const target = `Line 1\nLine 2 (target modified)\nLine 3 (target modified)\nLine 4`;
  
  const mergeResult = ThreeWayMergeAlgorithm.merge(base, source, target);
  
  console.log('合并结果:');
  console.log(`  成功: ${mergeResult.success}`);
  console.log(`  自动解决冲突: ${mergeResult.autoResolvedCount}`);
  console.log(`  需手动解决冲突: ${mergeResult.manualResolvedCount}`);
  console.log(`  冲突数量: ${mergeResult.conflicts.length}`);
  
  if (mergeResult.conflicts.length > 0) {
    console.log(`\n冲突详情:`);
    mergeResult.conflicts.forEach((conflict, index) => {
      console.log(`  冲突 ${index + 1}: 行 ${conflict.lineStart}-${conflict.lineEnd} (${conflict.conflictType})`);
    });
  }
  
  console.log(`\n合并后内容预览:`);
  mergeResult.content.slice(0, 10).forEach((line, index) => {
    console.log(`  ${index + 1}: ${line}`);
  });
  
  console.log('');
}

/**
 * 测试版本对比工具类
 */
function testVersionDiffUtils() {
  console.log('🛠️ 测试版本对比工具类');
  console.log('=' + '='.repeat(50));
  
  const diffs = MyersDiffAlgorithm.diff(testCases.complex.old, testCases.complex.new);
  
  // 测试差异统计
  const stats = VersionDiffUtils.getDiffStatistics(diffs);
  console.log('差异统计:');
  console.log(`  总行数: ${stats.totalLines}`);
  console.log(`  新增行: ${stats.addedLines}`);
  console.log(`  删除行: ${stats.deletedLines}`);
  console.log(`  修改行: ${stats.modifiedLines}`);
  console.log(`  未变更行: ${stats.unchangedLines}`);
  console.log(`  新增字符: ${stats.addedChars}`);
  console.log(`  删除字符: ${stats.deletedChars}`);
  
  // 测试统一diff格式
  const unifiedDiff = VersionDiffUtils.generateUnifiedDiff(
    testCases.simple.old,
    testCases.simple.new,
    'old-version.md',
    'new-version.md'
  );
  console.log(`\n统一diff格式预览:`);
  console.log(unifiedDiff.split('\n').slice(0, 8).join('\n'));
  
  console.log('');
}

/**
 * 测试diff缓存
 */
function testDiffCache() {
  console.log('💾 测试Diff缓存机制');
  console.log('=' + '='.repeat(50));
  
  // 清空缓存
  DiffCache.clearCache();
  
  const { old, new: newContent } = testCases.complex;
  
  // 第一次计算（无缓存）
  let startTime = Date.now();
  const result1 = MyersDiffAlgorithm.diff(old, newContent);
  const firstTime = Date.now() - startTime;
  
  // 缓存结果
  DiffCache.cacheDiff(old, newContent, result1);
  
  // 第二次计算（使用缓存）
  startTime = Date.now();
  const cachedResult = DiffCache.getCachedDiff(old, newContent);
  const cachedTime = Date.now() - startTime;
  
  console.log(`首次计算耗时: ${firstTime}ms`);
  console.log(`缓存查询耗时: ${cachedTime}ms`);
  console.log(`缓存命中: ${cachedResult !== null}`);
  console.log(`结果一致性: ${cachedResult && cachedResult.length === result1.length}`);
  
  if (firstTime > 0) {
    console.log(`性能提升: ${((firstTime - cachedTime) / firstTime * 100).toFixed(1)}%`);
  }
  
  console.log('');
}

/**
 * 性能基准测试
 */
function benchmarkPerformance() {
  console.log('⚡ 性能基准测试');
  console.log('=' + '='.repeat(50));
  
  const sizes = [100, 500, 1000, 2000];
  const results: Array<{size: number, time: number}> = [];
  
  sizes.forEach(size => {
    // 生成测试数据
    const oldLines = Array.from({length: size}, (_, i) => `Line ${i + 1}`);
    const newLines = [...oldLines];
    
    // 随机修改30%的行
    const changeCount = Math.floor(size * 0.3);
    for (let i = 0; i < changeCount; i++) {
      const randomIndex = Math.floor(Math.random() * size);
      newLines[randomIndex] = `Modified Line ${randomIndex + 1}`;
    }
    
    // 添加一些新行
    for (let i = 0; i < Math.floor(size * 0.1); i++) {
      newLines.push(`New Line ${size + i + 1}`);
    }
    
    const oldText = oldLines.join('\n');
    const newText = newLines.join('\n');
    
    // 性能测试
    const startTime = Date.now();
    const iterations = Math.max(1, Math.floor(1000 / size)); // 根据大小调整迭代次数
    
    for (let i = 0; i < iterations; i++) {
      MyersDiffAlgorithm.diff(oldText, newText);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    results.push({ size, time: avgTime });
    console.log(`${size} 行文档: 平均 ${avgTime.toFixed(2)}ms (${iterations} 次迭代)`);
  });
  
  console.log('');
  return results;
}

// 导出测试函数供外部调用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runTests,
    benchmarkPerformance,
    testMyersDiffAlgorithm,
    testThreeWayMergeAlgorithm,
    testVersionDiffUtils,
    testDiffCache
  };
} else {
  // 浏览器环境下自动运行测试
  runTests();
  benchmarkPerformance();
}
