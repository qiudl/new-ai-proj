#!/usr/bin/env node

/**
 * 文档预览组件性能测试脚本
 * 
 * 测试项目：
 * 1. 组件渲染性能
 * 2. 大文档虚拟化性能
 * 3. 内存使用情况
 * 4. 滚动性能
 * 5. 搜索性能
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || './performance-reports';
    this.browser = null;
    this.page = null;
    
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async setup() {
    console.log('🚀 启动性能测试...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // 设置视口
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // 启用性能监控
    await this.page.tracing.start({
      path: path.join(this.outputDir, 'performance-trace.json'),
      screenshots: true
    });
  }

  async cleanup() {
    if (this.page) {
      await this.page.tracing.stop();
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('✅ 性能测试完成');
  }

  // 测试组件初始渲染性能
  async testInitialRenderPerformance() {
    console.log('📊 测试初始渲染性能...');
    
    const metrics = [];
    
    for (let i = 0; i < 5; i++) {
      // 清除缓存
      await this.page.goto('about:blank');
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // 开始计时
      const startTime = Date.now();
      
      // 导航到文档预览页面
      await this.page.goto(`${this.baseUrl}/document-preview/test-doc-1`, {
        waitUntil: 'networkidle0'
      });
      
      // 等待主要组件加载
      await this.page.waitForSelector('[data-testid="enhanced-document-content"]', {
        timeout: 10000
      });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // 获取性能指标
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      metrics.push({
        run: i + 1,
        totalLoadTime: loadTime,
        ...performanceMetrics
      });
      
      console.log(`  Run ${i + 1}: ${loadTime}ms`);
      
      // 短暂等待
      await this.page.waitForTimeout(1000);
    }
    
    // 计算平均值
    const avgMetrics = this.calculateAverageMetrics(metrics);
    console.log('📈 初始渲染性能结果:', avgMetrics);
    
    return avgMetrics;
  }

  // 测试大文档虚拟化性能
  async testVirtualizationPerformance() {
    console.log('📊 测试虚拟化性能...');
    
    await this.page.goto(`${this.baseUrl}/document-preview/large-doc`, {
      waitUntil: 'networkidle0'
    });
    
    // 等待虚拟化组件加载
    await this.page.waitForSelector('.virtualized-document-renderer', {
      timeout: 10000
    });
    
    // 测试滚动性能
    const scrollMetrics = [];
    
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      // 执行滚动
      await this.page.evaluate(() => {
        const container = document.querySelector('.virtualized-document-renderer');
        container.scrollTop += 1000;
      });
      
      // 等待渲染完成
      await this.page.waitForTimeout(50);
      
      const endTime = performance.now();
      scrollMetrics.push(endTime - startTime);
    }
    
    // 测试内存使用
    const memoryUsage = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }
      return null;
    });
    
    const result = {
      averageScrollTime: scrollMetrics.reduce((a, b) => a + b, 0) / scrollMetrics.length,
      maxScrollTime: Math.max(...scrollMetrics),
      minScrollTime: Math.min(...scrollMetrics),
      memoryUsage
    };
    
    console.log('📈 虚拟化性能结果:', result);
    return result;
  }

  // 测试搜索性能
  async testSearchPerformance() {
    console.log('📊 测试搜索性能...');
    
    await this.page.goto(`${this.baseUrl}/document-preview/large-doc`, {
      waitUntil: 'networkidle0'
    });
    
    // 打开搜索面板
    await this.page.click('button:has-text("搜索")');
    await this.page.waitForSelector('input[placeholder*="搜索"]');
    
    const searchTerms = ['test', 'document', 'content', 'section', 'example'];
    const searchMetrics = [];
    
    for (const term of searchTerms) {
      const startTime = performance.now();
      
      // 清空搜索框
      await this.page.fill('input[placeholder*="搜索"]', '');
      
      // 输入搜索词
      await this.page.fill('input[placeholder*="搜索"]', term);
      await this.page.press('input[placeholder*="搜索"]', 'Enter');
      
      // 等待搜索结果
      await this.page.waitForTimeout(500);
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      // 获取搜索结果数量
      const resultCount = await this.page.evaluate(() => {
        const results = document.querySelectorAll('.search-result');
        return results.length;
      });
      
      searchMetrics.push({
        term,
        searchTime,
        resultCount
      });
      
      console.log(`  搜索 "${term}": ${searchTime.toFixed(2)}ms, ${resultCount} 结果`);
    }
    
    const avgSearchTime = searchMetrics.reduce((sum, m) => sum + m.searchTime, 0) / searchMetrics.length;
    
    const result = {
      averageSearchTime: avgSearchTime,
      searchMetrics
    };
    
    console.log('📈 搜索性能结果:', result);
    return result;
  }

  // 测试内存泄漏
  async testMemoryLeaks() {
    console.log('📊 测试内存泄漏...');
    
    const memorySnapshots = [];
    
    for (let i = 0; i < 10; i++) {
      // 导航到页面
      await this.page.goto(`${this.baseUrl}/document-preview/test-doc-${i % 3 + 1}`, {
        waitUntil: 'networkidle0'
      });
      
      // 执行一些操作
      await this.page.click('button:has-text("编辑")');
      await this.page.waitForTimeout(100);
      await this.page.click('button:has-text("预览")');
      await this.page.waitForTimeout(100);
      
      // 强制垃圾回收
      await this.page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      // 获取内存使用情况
      const memoryUsage = await this.page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      if (memoryUsage) {
        memorySnapshots.push({
          iteration: i + 1,
          ...memoryUsage
        });
      }
      
      console.log(`  迭代 ${i + 1}: ${memoryUsage ? Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}`);
    }
    
    // 分析内存趋势
    if (memorySnapshots.length > 1) {
      const initialMemory = memorySnapshots[0].usedJSHeapSize;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      const result = {
        initialMemory: Math.round(initialMemory / 1024 / 1024),
        finalMemory: Math.round(finalMemory / 1024 / 1024),
        memoryIncrease: Math.round(memoryIncrease / 1024 / 1024),
        memoryIncreasePercent: memoryIncreasePercent.toFixed(2),
        snapshots: memorySnapshots
      };
      
      console.log('📈 内存泄漏测试结果:', result);
      return result;
    }
    
    return { error: 'Unable to collect memory data' };
  }

  // 测试CPU使用率
  async testCpuUsage() {
    console.log('📊 测试CPU使用率...');
    
    await this.page.goto(`${this.baseUrl}/document-preview/large-doc`, {
      waitUntil: 'networkidle0'
    });
    
    // 开始CPU分析
    await this.page.coverage.startJSCoverage();
    
    // 执行一系列操作
    const operations = [
      () => this.page.click('button:has-text("编辑")'),
      () => this.page.click('button:has-text("预览")'),
      () => this.page.click('button:has-text("搜索")'),
      () => this.page.fill('input[placeholder*="搜索"]', 'test'),
      () => this.page.press('input[placeholder*="搜索"]', 'Enter'),
      () => this.page.evaluate(() => window.scrollBy(0, 1000)),
      () => this.page.evaluate(() => window.scrollBy(0, -1000))
    ];
    
    const startTime = Date.now();
    
    for (const operation of operations) {
      await operation();
      await this.page.waitForTimeout(100);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 停止CPU分析
    const coverage = await this.page.coverage.stopJSCoverage();
    
    // 计算代码覆盖率
    const totalBytes = coverage.reduce((sum, entry) => sum + entry.text.length, 0);
    const usedBytes = coverage.reduce((sum, entry) => {
      return sum + entry.ranges.reduce((rangeSum, range) => {
        return rangeSum + (range.end - range.start);
      }, 0);
    }, 0);
    
    const codeUtilization = (usedBytes / totalBytes) * 100;
    
    const result = {
      totalOperationTime: totalTime,
      codeUtilization: codeUtilization.toFixed(2),
      operationsPerSecond: (operations.length / (totalTime / 1000)).toFixed(2)
    };
    
    console.log('📈 CPU使用率测试结果:', result);
    return result;
  }

  // 计算平均指标
  calculateAverageMetrics(metrics) {
    const keys = Object.keys(metrics[0]).filter(key => typeof metrics[0][key] === 'number');
    const averages = {};
    
    keys.forEach(key => {
      averages[key] = metrics.reduce((sum, metric) => sum + metric[key], 0) / metrics.length;
    });
    
    return averages;
  }

  // 生成性能报告
  async generateReport(results) {
    console.log('📝 生成性能报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        initialRender: results.initialRender,
        virtualization: results.virtualization,
        search: results.search,
        memoryLeaks: results.memoryLeaks,
        cpuUsage: results.cpuUsage
      },
      recommendations: this.generateRecommendations(results)
    };
    
    // 保存JSON报告
    fs.writeFileSync(
      path.join(this.outputDir, 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // 生成HTML报告
    const htmlReport = this.generateHtmlReport(report);
    fs.writeFileSync(
      path.join(this.outputDir, 'performance-report.html'),
      htmlReport
    );
    
    console.log(`📊 性能报告已保存到: ${this.outputDir}`);
    
    return report;
  }

  // 生成优化建议
  generateRecommendations(results) {
    const recommendations = [];
    
    // 初始渲染性能建议
    if (results.initialRender.totalLoadTime > 3000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: '初始加载时间超过3秒，建议优化资源加载和代码分割'
      });
    }
    
    // 虚拟化性能建议
    if (results.virtualization.averageScrollTime > 16.67) {
      recommendations.push({
        type: 'virtualization',
        priority: 'medium',
        message: '滚动性能低于60FPS，建议优化虚拟滚动算法'
      });
    }
    
    // 内存使用建议
    if (results.memoryLeaks.memoryIncreasePercent > 20) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: '检测到潜在内存泄漏，建议检查事件监听器和定时器清理'
      });
    }
    
    // 搜索性能建议
    if (results.search.averageSearchTime > 200) {
      recommendations.push({
        type: 'search',
        priority: 'medium',
        message: '搜索响应时间较长，建议优化搜索算法或使用索引'
      });
    }
    
    return recommendations;
  }

  // 生成HTML报告
  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档预览组件性能报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #1890ff; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .metric-card { background: #f9f9f9; border-radius: 6px; padding: 15px; margin: 10px 0; border-left: 4px solid #1890ff; }
        .metric-title { font-weight: bold; color: #333; margin-bottom: 10px; }
        .metric-value { font-size: 24px; color: #1890ff; font-weight: bold; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .high { background: #ffebee; border-left: 4px solid #f44336; }
        .medium { background: #fff3e0; border-left: 4px solid #ff9800; }
        .low { background: #e8f5e8; border-left: 4px solid #4caf50; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>文档预览组件性能报告</h1>
            <p>生成时间: ${report.timestamp}</p>
        </div>
        
        <div class="content">
            <div class="metric-card">
                <div class="metric-title">初始渲染性能</div>
                <div class="metric-value">${report.summary.initialRender.totalLoadTime?.toFixed(0) || 'N/A'}ms</div>
                <p>平均加载时间</p>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">虚拟化滚动性能</div>
                <div class="metric-value">${report.summary.virtualization.averageScrollTime?.toFixed(2) || 'N/A'}ms</div>
                <p>平均滚动延迟</p>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">搜索性能</div>
                <div class="metric-value">${report.summary.search.averageSearchTime?.toFixed(0) || 'N/A'}ms</div>
                <p>平均搜索响应时间</p>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">内存使用</div>
                <div class="metric-value">${report.summary.memoryLeaks.memoryIncreasePercent || 'N/A'}%</div>
                <p>内存增长百分比</p>
            </div>
            
            ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>优化建议</h3>
                ${report.recommendations.map(rec => `
                    <div class="recommendation ${rec.priority}">
                        <strong>${rec.type.toUpperCase()}</strong>: ${rec.message}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  // 运行所有测试
  async runAllTests() {
    await this.setup();
    
    try {
      const results = {
        initialRender: await this.testInitialRenderPerformance(),
        virtualization: await this.testVirtualizationPerformance(),
        search: await this.testSearchPerformance(),
        memoryLeaks: await this.testMemoryLeaks(),
        cpuUsage: await this.testCpuUsage()
      };
      
      const report = await this.generateReport(results);
      
      return report;
    } finally {
      await this.cleanup();
    }
  }
}

// 主执行函数
async function main() {
  const tester = new PerformanceTester({
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    outputDir: process.env.OUTPUT_DIR || './performance-reports'
  });
  
  try {
    const report = await tester.runAllTests();
    
    console.log('\n🎉 性能测试完成!');
    console.log('📊 详细报告请查看: ./performance-reports/performance-report.html');
    
    // 如果性能不达标，退出代码为1
    const hasHighPriorityIssues = report.recommendations.some(r => r.priority === 'high');
    process.exit(hasHighPriorityIssues ? 1 : 0);
    
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = PerformanceTester;