/**
 * 文档管理器性能测试工具
 * 用于监控和分析组件性能
 */

import { Document } from '../types/document';

interface PerformanceMetrics {
  renderTime: number;
  loadTime: number;
  searchTime: number;
  memoryUsage: number;
  timestamp: number;
  operation: string;
  documentsCount: number;
  mode: 'simple' | 'advanced';
}

class DocumentManagerPerformance {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // 保留最近100条记录

  // 性能标记开始
  startMeasure(operation: string): string {
    const markName = `${operation}-start-${Date.now()}`;
    performance.mark(markName);
    return markName;
  }

  // 性能标记结束并记录
  endMeasure(
    startMark: string, 
    operation: string, 
    options: {
      documentsCount?: number;
      mode?: 'simple' | 'advanced';
      additionalData?: any;
    } = {}
  ): number {
    const endMarkName = `${operation}-end-${Date.now()}`;
    performance.mark(endMarkName);
    
    const measureName = `${operation}-duration`;
    performance.measure(measureName, startMark, endMarkName);
    
    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure ? measure.duration : 0;

    // 记录指标
    this.recordMetric({
      renderTime: operation.includes('render') ? duration : 0,
      loadTime: operation.includes('load') ? duration : 0,
      searchTime: operation.includes('search') ? duration : 0,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now(),
      operation,
      documentsCount: options.documentsCount || 0,
      mode: options.mode || 'simple'
    });

    // 清理性能标记
    performance.clearMarks(startMark);
    performance.clearMarks(endMarkName);
    performance.clearMeasures(measureName);

    return duration;
  }

  // 记录指标
  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // 保持指标数量在限制内
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // 获取内存使用情况
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // 分析性能数据
  analyzePerformance(): {
    summary: {
      averageRenderTime: number;
      averageLoadTime: number;
      averageSearchTime: number;
      peakMemoryUsage: number;
      totalOperations: number;
    };
    recommendations: string[];
    slowOperations: PerformanceMetrics[];
  } {
    if (this.metrics.length === 0) {
      return {
        summary: {
          averageRenderTime: 0,
          averageLoadTime: 0,
          averageSearchTime: 0,
          peakMemoryUsage: 0,
          totalOperations: 0
        },
        recommendations: ['暂无性能数据'],
        slowOperations: []
      };
    }

    const renderMetrics = this.metrics.filter(m => m.renderTime > 0);
    const loadMetrics = this.metrics.filter(m => m.loadTime > 0);
    const searchMetrics = this.metrics.filter(m => m.searchTime > 0);

    const summary = {
      averageRenderTime: this.average(renderMetrics.map(m => m.renderTime)),
      averageLoadTime: this.average(loadMetrics.map(m => m.loadTime)),
      averageSearchTime: this.average(searchMetrics.map(m => m.searchTime)),
      peakMemoryUsage: Math.max(...this.metrics.map(m => m.memoryUsage)),
      totalOperations: this.metrics.length
    };

    const recommendations = this.generateRecommendations(summary);
    const slowOperations = this.metrics
      .filter(m => 
        m.renderTime > 100 || 
        m.loadTime > 1000 || 
        m.searchTime > 500
      )
      .sort((a, b) => 
        (b.renderTime + b.loadTime + b.searchTime) - 
        (a.renderTime + a.loadTime + a.searchTime)
      )
      .slice(0, 10);

    return {
      summary,
      recommendations,
      slowOperations
    };
  }

  // 计算平均值
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  // 生成性能建议
  private generateRecommendations(summary: { averageRenderTime: number; averageLoadTime: number; averageSearchTime: number; peakMemoryUsage: number; totalOperations: number; }): string[] {
    const recommendations: string[] = [];

    if (summary.averageRenderTime > 50) {
      recommendations.push('渲染时间过长，考虑使用虚拟化或分页减少DOM节点');
    }

    if (summary.averageLoadTime > 2000) {
      recommendations.push('数据加载缓慢，建议优化API响应时间或增加缓存');
    }

    if (summary.averageSearchTime > 300) {
      recommendations.push('搜索响应慢，考虑使用防抖或本地搜索优化');
    }

    if (summary.peakMemoryUsage > 50) {
      recommendations.push('内存使用过高，检查是否存在内存泄漏');
    }

    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，继续保持！');
    }

    return recommendations;
  }

  // 生成性能报告
  generateReport(): string {
    const analysis = this.analyzePerformance();
    
    let report = '=== 文档管理器性能报告 ===\n';
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;
    
    report += '📊 性能摘要:\n';
    report += `- 平均渲染时间: ${analysis.summary.averageRenderTime.toFixed(2)}ms\n`;
    report += `- 平均加载时间: ${analysis.summary.averageLoadTime.toFixed(2)}ms\n`;
    report += `- 平均搜索时间: ${analysis.summary.averageSearchTime.toFixed(2)}ms\n`;
    report += `- 峰值内存使用: ${analysis.summary.peakMemoryUsage.toFixed(2)}MB\n`;
    report += `- 总操作次数: ${analysis.summary.totalOperations}\n\n`;
    
    report += '💡 优化建议:\n';
    analysis.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    
    if (analysis.slowOperations.length > 0) {
      report += '\n⚠️  慢操作记录:\n';
      analysis.slowOperations.forEach((op, index) => {
        const totalTime = op.renderTime + op.loadTime + op.searchTime;
        report += `${index + 1}. ${op.operation}: ${totalTime.toFixed(2)}ms (${op.mode}模式, ${op.documentsCount}个文档)\n`;
      });
    }
    
    return report;
  }

  // 监控文档列表渲染性能
  measureDocumentListRender<T>(
    renderFunction: () => T,
    documentsCount: number,
    mode: 'simple' | 'advanced'
  ): T {
    const startMark = this.startMeasure('document-list-render');
    const result = renderFunction();
    this.endMeasure(startMark, 'document-list-render', { documentsCount, mode });
    return result;
  }

  // 监控数据加载性能
  async measureDataLoad<T>(
    loadFunction: () => Promise<T>,
    mode: 'simple' | 'advanced'
  ): Promise<T> {
    const startMark = this.startMeasure('data-load');
    try {
      const result = await loadFunction();
      const documentsCount = Array.isArray(result) ? result.length : 0;
      this.endMeasure(startMark, 'data-load', { mode, documentsCount });
      return result;
    } catch (error) {
      this.endMeasure(startMark, 'data-load-error', { mode });
      throw error;
    }
  }

  // 监控搜索性能
  measureSearch<T>(
    searchFunction: () => T,
    searchTerm: string,
    resultsCount: number
  ): T {
    const startMark = this.startMeasure(`search-${searchTerm.length}`);
    const result = searchFunction();
    this.endMeasure(startMark, 'search', { documentsCount: resultsCount });
    return result;
  }

  // 清除性能数据
  clearMetrics() {
    this.metrics = [];
  }

  // 获取原始指标数据
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // 导出性能数据
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      analysis: this.analyzePerformance()
    }, null, 2);
  }

  // 检查性能阈值
  checkPerformanceThresholds(): {
    passed: boolean;
    failures: string[];
  } {
    const analysis = this.analyzePerformance();
    const failures: string[] = [];

    if (analysis.summary.averageRenderTime > 100) {
      failures.push('渲染时间超过100ms阈值');
    }

    if (analysis.summary.averageLoadTime > 3000) {
      failures.push('加载时间超过3秒阈值');
    }

    if (analysis.summary.averageSearchTime > 500) {
      failures.push('搜索时间超过500ms阈值');
    }

    if (analysis.summary.peakMemoryUsage > 100) {
      failures.push('内存使用超过100MB阈值');
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }
}

// 单例实例
export const documentManagerPerf = new DocumentManagerPerformance();

// 在开发环境下挂载到window
if (process.env.NODE_ENV === 'development') {
  (window as any).documentManagerPerf = documentManagerPerf;
}

// 便捷函数
export const measureRender = documentManagerPerf.measureDocumentListRender.bind(documentManagerPerf);
export const measureLoad = documentManagerPerf.measureDataLoad.bind(documentManagerPerf);
export const measureSearch = documentManagerPerf.measureSearch.bind(documentManagerPerf);
export const getPerformanceReport = () => documentManagerPerf.generateReport();

export default DocumentManagerPerformance;