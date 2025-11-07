/**
 * 性能监控工具
 * 用于收集和分析应用性能数据
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface NavigationMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface NetworkMetric {
  name: string;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  responseStart: number;
  responseEnd: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;
  private isMonitoring = false;

  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupPerformanceObserver();
    this.collectNavigationMetrics();
    this.collectMemoryMetrics();
    this.startPeriodicCollection();
    
    console.log('🚀 性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    console.log('⏹️ 性能监控已停止');
  }

  /**
   * 设置性能观察器
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver 不支持');
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      // 观察多种类型的性能条目
      this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'measure'] });
      
      // 观察核心网页指标
      if ('observeType' in PerformanceObserver.prototype) {
        const coreWebVitalsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processCoreWebVitals(entry);
          }
        });
        
        coreWebVitalsObserver.observe({ 
          entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] 
        });
      }
    } catch (error) {
      console.error('设置性能观察器失败:', error);
    }
  }

  /**
   * 处理性能条目
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration || entry.startTime,
      timestamp: Date.now(),
      metadata: {
        entryType: entry.entryType,
        startTime: entry.startTime
      }
    };

    // 添加特定类型的元数据
    if (entry.entryType === 'resource') {
      const resourceEntry = entry as PerformanceResourceTiming;
      metric.metadata = {
        ...metric.metadata,
        transferSize: resourceEntry.transferSize,
        encodedBodySize: resourceEntry.encodedBodySize,
        decodedBodySize: resourceEntry.decodedBodySize,
        responseStart: resourceEntry.responseStart,
        responseEnd: resourceEntry.responseEnd
      };
    }

    this.addMetric(metric);
  }

  /**
   * 处理核心网页指标
   */
  private processCoreWebVitals(entry: PerformanceEntry): void {
    let metricName = '';
    let value = 0;

    if (entry.entryType === 'largest-contentful-paint') {
      metricName = 'LCP';
      value = entry.startTime;
    } else if (entry.entryType === 'first-input') {
      metricName = 'FID';
      value = (entry as any).processingStart - entry.startTime;
    } else if (entry.entryType === 'layout-shift') {
      metricName = 'CLS';
      value = (entry as any).value;
    }

    if (metricName) {
      this.addMetric({
        name: metricName,
        value,
        timestamp: Date.now(),
        metadata: { entryType: entry.entryType }
      });
    }
  }

  /**
   * 收集导航指标
   */
  private collectNavigationMetrics(): void {
    if (!performance.getEntriesByType) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    // ✅ FIXED - navigationStart is deprecated, use fetchStart or cast to any for backwards compatibility
    const navAny = navigation as any;
    const metrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      domComplete: navigation.domComplete - (navAny.navigationStart || navigation.fetchStart),
      networkLatency: navigation.responseEnd - navigation.fetchStart
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this.addMetric({
        name: `navigation.${name}`,
        value,
        timestamp: Date.now(),
        metadata: { category: 'navigation' }
      });
    });
  }

  /**
   * 收集内存指标
   */
  private collectMemoryMetrics(): void {
    if (!('memory' in performance)) return;

    const memory = (performance as any).memory as MemoryInfo;
    
    const metrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this.addMetric({
        name: `memory.${name}`,
        value,
        timestamp: Date.now(),
        metadata: { category: 'memory', unit: name === 'usagePercentage' ? 'percent' : 'bytes' }
      });
    });
  }

  /**
   * 开始定期收集
   */
  private startPeriodicCollection(): void {
    const interval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }
      
      this.collectMemoryMetrics();
      this.collectCustomMetrics();
    }, 30000); // 每30秒收集一次
  }

  /**
   * 收集自定义指标
   */
  private collectCustomMetrics(): void {
    // 收集DOM节点数量
    const domNodes = document.querySelectorAll('*').length;
    this.addMetric({
      name: 'dom.nodeCount',
      value: domNodes,
      timestamp: Date.now(),
      metadata: { category: 'dom' }
    });

    // 收集事件监听器数量（近似值）
    const elementsWithListeners = document.querySelectorAll('[onclick], [onchange], [onsubmit]').length;
    this.addMetric({
      name: 'dom.eventListeners',
      value: elementsWithListeners,
      timestamp: Date.now(),
      metadata: { category: 'dom' }
    });
  }

  /**
   * 添加性能指标
   */
  public addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // 保持最近1000个指标
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    // 检查是否需要报警
    this.checkPerformanceThresholds(metric);
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = {
      'LCP': 2500, // 2.5秒
      'FID': 100,  // 100毫秒
      'CLS': 0.1,  // 0.1
      'navigation.domContentLoaded': 1500, // 1.5秒
      'navigation.loadComplete': 3000, // 3秒
      'memory.usagePercentage': 80 // 80%
    };

    const threshold = thresholds[metric.name];
    if (threshold && metric.value > threshold) {
      console.warn(`⚠️ 性能警告: ${metric.name} = ${metric.value} (阈值: ${threshold})`);
      
      // 触发性能警告事件
      window.dispatchEvent(new CustomEvent('performance-warning', {
        detail: { metric, threshold }
      }));
    }
  }

  /**
   * 测量函数执行时间
   */
  measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.addMetric({
      name: `function.${name}`,
      value: endTime - startTime,
      timestamp: Date.now(),
      metadata: { category: 'function' }
    });
    
    return result;
  }

  /**
   * 测量异步函数执行时间
   */
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      
      this.addMetric({
        name: `function.${name}`,
        value: endTime - startTime,
        timestamp: Date.now(),
        metadata: { category: 'async-function', success: true }
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.addMetric({
        name: `function.${name}`,
        value: endTime - startTime,
        timestamp: Date.now(),
        metadata: { category: 'async-function', success: false, error: error.message }
      });
      
      throw error;
    }
  }

  /**
   * 标记自定义时间点
   */
  mark(name: string): void {
    if (performance.mark) {
      performance.mark(name);
    }
    
    this.addMetric({
      name: `mark.${name}`,
      value: performance.now(),
      timestamp: Date.now(),
      metadata: { category: 'mark' }
    });
  }

  /**
   * 测量两个标记之间的时间
   */
  measure(name: string, startMark: string, endMark?: string): void {
    if (performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        
        const measure = performance.getEntriesByName(name, 'measure')[0];
        if (measure) {
          this.addMetric({
            name: `measure.${name}`,
            value: measure.duration,
            timestamp: Date.now(),
            metadata: { category: 'measure', startMark, endMark }
          });
        }
      } catch (error) {
        console.error('测量标记失败:', error);
      }
    }
  }

  /**
   * 获取所有性能指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 按类别获取指标
   */
  getMetricsByCategory(category: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.metadata?.category === category);
  }

  /**
   * 获取指标统计信息
   */
  getMetricStats(metricName: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    latest: number;
  } | null {
    const metrics = this.metrics.filter(m => m.name === metricName);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      latest: values[values.length - 1]
    };
  }

  /**
   * 导出性能报告
   */
  exportReport(): {
    summary: Record<string, any>;
    coreWebVitals: Record<string, number>;
    navigation: Record<string, number>;
    memory: Record<string, number>;
    customMetrics: PerformanceMetric[];
    timestamp: number;
  } {
    const coreWebVitals = {};
    const navigation = {};
    const memory = {};
    const customMetrics = [];

    this.metrics.forEach(metric => {
      if (['LCP', 'FID', 'CLS'].includes(metric.name)) {
        coreWebVitals[metric.name] = metric.value;
      } else if (metric.name.startsWith('navigation.')) {
        navigation[metric.name.replace('navigation.', '')] = metric.value;
      } else if (metric.name.startsWith('memory.')) {
        memory[metric.name.replace('memory.', '')] = metric.value;
      } else {
        customMetrics.push(metric);
      }
    });

    return {
      summary: {
        totalMetrics: this.metrics.length,
        monitoringDuration: this.isMonitoring ? Date.now() - (this.metrics[0]?.timestamp || Date.now()) : 0,
        warningCount: this.metrics.filter(m => this.hasWarning(m)).length
      },
      coreWebVitals,
      navigation,
      memory,
      customMetrics: customMetrics.slice(-50), // 最近50个自定义指标
      timestamp: Date.now()
    };
  }

  /**
   * 检查指标是否有警告
   */
  private hasWarning(metric: PerformanceMetric): boolean {
    const thresholds = {
      'LCP': 2500,
      'FID': 100,
      'CLS': 0.1,
      'navigation.domContentLoaded': 1500,
      'navigation.loadComplete': 3000,
      'memory.usagePercentage': 80
    };

    const threshold = thresholds[metric.name];
    return threshold ? metric.value > threshold : false;
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('📊 性能指标已清除');
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor();

// 自动启动监控（仅在浏览器环境）
if (typeof window !== 'undefined') {
  // 页面加载完成后启动监控
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceMonitor.startMonitoring();
    });
  } else {
    performanceMonitor.startMonitoring();
  }
  
  // 页面卸载时停止监控
  window.addEventListener('beforeunload', () => {
    performanceMonitor.stopMonitoring();
  });
}

export default performanceMonitor;