/**
 * 任务详情页性能监控工具
 * 监控页面加载时间、API响应时间、渲染性能等关键指标
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PageLoadMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

interface APIMetrics {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  cached: boolean;
  size?: number;
  timestamp: number;
}

interface ComponentMetrics {
  componentName: string;
  mountTime: number;
  renderTime: number;
  updateCount: number;
  timestamp: number;
}

class TaskDetailPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetrics[] = [];
  private componentMetrics: ComponentMetrics[] = [];
  private pageLoadMetrics: Partial<PageLoadMetrics> = {};
  
  private observers: {
    lcp?: PerformanceObserver;
    fid?: PerformanceObserver;
    cls?: PerformanceObserver;
  } = {};

  constructor() {
    this.initializeWebVitals();
    this.trackPageLoad();
  }

  /**
   * 初始化Web Vitals监控
   */
  private initializeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        this.observers.lcp = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.pageLoadMetrics.largestContentfulPaint = lastEntry.startTime;
          this.recordMetric('lcp', lastEntry.startTime);
        });
        this.observers.lcp.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }

      // First Input Delay (FID)
      try {
        this.observers.fid = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-input') {
              const fid = entry.processingStart - entry.startTime;
              this.pageLoadMetrics.firstInputDelay = fid;
              this.recordMetric('fid', fid);
            }
          });
        });
        this.observers.fid.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        console.warn('FID monitoring not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        this.observers.cls = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          this.pageLoadMetrics.cumulativeLayoutShift = clsValue;
          this.recordMetric('cls', clsValue);
        });
        this.observers.cls.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.warn('CLS monitoring not supported');
      }
    }
  }

  /**
   * 跟踪页面加载指标
   */
  private trackPageLoad(): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.pageLoadMetrics.domContentLoaded = performance.now();
        this.recordMetric('dom_content_loaded', performance.now());
      });
    }

    window.addEventListener('load', () => {
      this.pageLoadMetrics.loadComplete = performance.now();
      this.recordMetric('page_load_complete', performance.now());

      // 获取导航时间
      if (performance.getEntriesByType) {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          const nav = navEntries[0];
          this.pageLoadMetrics.navigationStart = nav.navigationStart || nav.fetchStart;
          this.recordMetric('navigation_start', this.pageLoadMetrics.navigationStart);
        }
      }

      // 获取First Contentful Paint
      if (performance.getEntriesByType) {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.pageLoadMetrics.firstContentfulPaint = fcpEntry.startTime;
          this.recordMetric('fcp', fcpEntry.startTime);
        }
      }
    });
  }

  /**
   * 记录通用性能指标
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata
    });

    // 限制指标数量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }

    // 在开发环境输出关键指标
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${name} = ${value.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * 记录API请求性能
   */
  recordAPICall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    cached: boolean = false,
    size?: number
  ): void {
    this.apiMetrics.push({
      endpoint,
      method,
      duration,
      status,
      cached,
      size,
      timestamp: Date.now()
    });

    // 记录到通用指标
    this.recordMetric(`api_${method.toLowerCase()}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, duration, {
      endpoint,
      method,
      status,
      cached,
      size
    });

    // 限制API指标数量
    if (this.apiMetrics.length > 500) {
      this.apiMetrics = this.apiMetrics.slice(-250);
    }
  }

  /**
   * 记录组件性能
   */
  recordComponentMetric(
    componentName: string,
    mountTime?: number,
    renderTime?: number
  ): void {
    const existing = this.componentMetrics.find(m => m.componentName === componentName);
    
    if (existing) {
      existing.updateCount++;
      if (renderTime !== undefined) {
        existing.renderTime = renderTime;
      }
      existing.timestamp = Date.now();
    } else {
      this.componentMetrics.push({
        componentName,
        mountTime: mountTime || 0,
        renderTime: renderTime || 0,
        updateCount: 1,
        timestamp: Date.now()
      });
    }

    if (mountTime !== undefined) {
      this.recordMetric(`component_mount_${componentName}`, mountTime, { componentName });
    }
    
    if (renderTime !== undefined) {
      this.recordMetric(`component_render_${componentName}`, renderTime, { componentName });
    }
  }

  /**
   * 开始计时
   */
  startTimer(name: string): () => number {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return duration;
    };
  }

  /**
   * 异步操作计时
   */
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const endTimer = this.startTimer(name);
    try {
      const result = await operation();
      endTimer();
      return result;
    } catch (error) {
      const duration = endTimer();
      this.recordMetric(`${name}_error`, duration, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * 获取简化的性能指标 (兼容接口)
   */
  getMetrics(): Record<string, any> {
    return {
      pageLoad: this.pageLoadMetrics,
      metrics: this.metrics.slice(-10), // 最近10个指标
      apiMetrics: this.apiMetrics.slice(-10), // 最近10个API调用
      componentMetrics: this.componentMetrics.slice(-10), // 最近10个组件指标
      summary: {
        totalMetrics: this.metrics.length,
        totalAPICallsRecorded: this.apiMetrics.length,
        totalComponentsMonitored: this.componentMetrics.length,
        lastUpdated: Date.now()
      }
    };
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    summary: {
      pageLoad: {
        fcp?: number;
        lcp?: number;
        cls?: number;
        fid?: number;
        domContentLoaded?: number;
        loadComplete?: number;
      };
      api: {
        totalCalls: number;
        averageResponseTime: number;
        cacheHitRate: number;
        slowCalls: number;
        errorRate: number;
      };
      components: {
        totalComponents: number;
        averageMountTime: number;
        averageRenderTime: number;
        reRenderCount: number;
      };
    };
    details: {
      recentMetrics: PerformanceMetric[];
      slowAPIs: APIMetrics[];
      slowComponents: ComponentMetrics[];
    };
    recommendations: string[];
  } {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // 最近1分钟
    
    // API统计
    const recentAPIs = this.apiMetrics.filter(a => now - a.timestamp < 300000); // 最近5分钟
    const totalCalls = recentAPIs.length;
    const averageResponseTime = totalCalls > 0 
      ? recentAPIs.reduce((sum, a) => sum + a.duration, 0) / totalCalls 
      : 0;
    const cachedCalls = recentAPIs.filter(a => a.cached).length;
    const cacheHitRate = totalCalls > 0 ? cachedCalls / totalCalls : 0;
    const slowCalls = recentAPIs.filter(a => a.duration > 2000).length;
    const errorCalls = recentAPIs.filter(a => a.status >= 400).length;
    const errorRate = totalCalls > 0 ? errorCalls / totalCalls : 0;

    // 组件统计
    const totalComponents = this.componentMetrics.length;
    const averageMountTime = totalComponents > 0 
      ? this.componentMetrics.reduce((sum, c) => sum + c.mountTime, 0) / totalComponents 
      : 0;
    const averageRenderTime = totalComponents > 0 
      ? this.componentMetrics.reduce((sum, c) => sum + c.renderTime, 0) / totalComponents 
      : 0;
    const reRenderCount = this.componentMetrics.reduce((sum, c) => sum + c.updateCount, 0);

    // 性能建议
    const recommendations: string[] = [];
    
    if (this.pageLoadMetrics.largestContentfulPaint && this.pageLoadMetrics.largestContentfulPaint > 2500) {
      recommendations.push('LCP过高，建议优化最大内容元素的加载速度');
    }
    
    if (this.pageLoadMetrics.firstInputDelay && this.pageLoadMetrics.firstInputDelay > 100) {
      recommendations.push('FID过高，建议减少JavaScript执行时间');
    }
    
    if (this.pageLoadMetrics.cumulativeLayoutShift && this.pageLoadMetrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('CLS过高，建议减少布局偏移');
    }
    
    if (averageResponseTime > 1000) {
      recommendations.push('API响应时间过长，建议优化后端性能或添加缓存');
    }
    
    if (cacheHitRate < 0.3) {
      recommendations.push('缓存命中率过低，建议优化缓存策略');
    }
    
    if (errorRate > 0.05) {
      recommendations.push('API错误率过高，建议检查错误处理和重试机制');
    }

    return {
      summary: {
        pageLoad: {
          fcp: this.pageLoadMetrics.firstContentfulPaint,
          lcp: this.pageLoadMetrics.largestContentfulPaint,
          cls: this.pageLoadMetrics.cumulativeLayoutShift,
          fid: this.pageLoadMetrics.firstInputDelay,
          domContentLoaded: this.pageLoadMetrics.domContentLoaded,
          loadComplete: this.pageLoadMetrics.loadComplete
        },
        api: {
          totalCalls,
          averageResponseTime,
          cacheHitRate,
          slowCalls,
          errorRate
        },
        components: {
          totalComponents,
          averageMountTime,
          averageRenderTime,
          reRenderCount
        }
      },
      details: {
        recentMetrics: recentMetrics.slice(-20),
        slowAPIs: recentAPIs.filter(a => a.duration > 1000).slice(-10),
        slowComponents: this.componentMetrics
          .filter(c => c.renderTime > 100)
          .sort((a, b) => b.renderTime - a.renderTime)
          .slice(-10)
      },
      recommendations
    };
  }

  /**
   * 清理监控器
   */
  cleanup(): void {
    // 清理Performance Observers
    Object.values(this.observers).forEach(observer => {
      if (observer) {
        try {
          observer.disconnect();
        } catch (e) {
          // 忽略断开连接错误
        }
      }
    });

    this.metrics.length = 0;
    this.apiMetrics.length = 0;
    this.componentMetrics.length = 0;
  }

  /**
   * 导出性能数据
   */
  exportData(): string {
    return JSON.stringify({
      pageLoadMetrics: this.pageLoadMetrics,
      metrics: this.metrics,
      apiMetrics: this.apiMetrics,
      componentMetrics: this.componentMetrics,
      timestamp: Date.now()
    }, null, 2);
  }
}

// 全局实例
export const taskDetailPerformanceMonitor = new TaskDetailPerformanceMonitor();

// React Hook for component performance monitoring
export function useComponentPerformanceMonitor(componentName: string) {
  const mountTimeRef = React.useRef<number>();
  const renderCountRef = React.useRef(0);
  
  React.useEffect(() => {
    // 记录挂载时间
    mountTimeRef.current = performance.now();
    
    return () => {
      // 组件卸载时记录挂载时间
      if (mountTimeRef.current) {
        const mountDuration = performance.now() - mountTimeRef.current;
        taskDetailPerformanceMonitor.recordComponentMetric(
          componentName,
          mountDuration
        );
      }
    };
  }, [componentName]);

  React.useEffect(() => {
    // 记录渲染次数
    renderCountRef.current++;
    const renderStart = performance.now();
    
    // 使用setTimeout确保在渲染完成后测量
    setTimeout(() => {
      const renderTime = performance.now() - renderStart;
      taskDetailPerformanceMonitor.recordComponentMetric(
        componentName,
        undefined,
        renderTime
      );
    }, 0);
  });

  return {
    startTimer: (name: string) => taskDetailPerformanceMonitor.startTimer(`${componentName}_${name}`),
    recordMetric: (name: string, value: number, metadata?: Record<string, any>) => 
      taskDetailPerformanceMonitor.recordMetric(`${componentName}_${name}`, value, metadata)
  };
}

// API拦截器
export function createPerformanceInterceptor() {
  return {
    request: (config: any) => {
      config.metadata = {
        ...config.metadata,
        startTime: performance.now()
      };
      return config;
    },
    response: (response: any) => {
      const startTime = response.config?.metadata?.startTime;
      if (startTime) {
        const duration = performance.now() - startTime;
        const size = JSON.stringify(response.data).length;
        
        taskDetailPerformanceMonitor.recordAPICall(
          response.config.url || 'unknown',
          response.config.method?.toUpperCase() || 'GET',
          duration,
          response.status,
          response.headers?.['x-cache'] === 'hit',
          size
        );
      }
      return response;
    },
    error: (error: any) => {
      const startTime = error.config?.metadata?.startTime;
      if (startTime) {
        const duration = performance.now() - startTime;
        
        taskDetailPerformanceMonitor.recordAPICall(
          error.config?.url || 'unknown',
          error.config?.method?.toUpperCase() || 'GET',
          duration,
          error.response?.status || 0,
          false
        );
      }
      return Promise.reject(error);
    }
  };
}

export default TaskDetailPerformanceMonitor;