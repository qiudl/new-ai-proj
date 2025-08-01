// 性能监控和指标收集服务
import dayjs from 'dayjs';

// 性能指标类型定义
export interface PerformanceMetric {
  id: string;
  type: 'api' | 'page' | 'component' | 'user-action';
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId?: number;
}

// API调用指标
export interface ApiMetric extends PerformanceMetric {
  type: 'api';
  url: string;
  method: string;
  status: number;
  responseSize?: number;
  cacheHit?: boolean;
}

// 页面性能指标
export interface PageMetric extends PerformanceMetric {
  type: 'page';
  path: string;
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

// 组件性能指标
export interface ComponentMetric extends PerformanceMetric {
  type: 'component';
  componentName: string;
  renderTime: number;
  rerenderCount?: number;
}

// 用户行为指标
export interface UserActionMetric extends PerformanceMetric {
  type: 'user-action';
  action: string;
  target: string;
  context?: Record<string, any>;
}

// 性能统计
export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  slowRequestsCount: number; // >2s的请求数量
  cacheHitRate: number;
}

// 错误统计
export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  topErrors: Array<{
    error: string;
    count: number;
    lastOccurred: string;
  }>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;
  private userId?: number;
  private maxMetrics = 1000; // 最大保存指标数量
  private listeners: ((metric: PerformanceMetric) => void)[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeWebVitals();
    this.setupNavigationObserver();
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 设置用户ID
  setUserId(userId: number) {
    this.userId = userId;
  }

  // 开始追踪API调用
  startApiCall(url: string, method: string, metadata?: Record<string, any>): string {
    const id = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: ApiMetric = {
      id,
      type: 'api',
      name: `${method} ${url}`,
      url,
      method,
      startTime: performance.now(),
      success: false,
      status: 0,
      timestamp: dayjs().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata,
    };

    this.addMetric(metric);
    return id;
  }

  // 结束API调用追踪
  endApiCall(id: string, status: number, responseSize?: number, cacheHit?: boolean, error?: string) {
    const metric = this.metrics.find(m => m.id === id) as ApiMetric;
    if (metric) {
      const endTime = performance.now();
      metric.endTime = endTime;
      metric.duration = endTime - metric.startTime;
      metric.status = status;
      metric.success = status >= 200 && status < 400;
      metric.responseSize = responseSize;
      metric.cacheHit = cacheHit;
      metric.error = error;

      this.notifyListeners(metric);
    }
  }

  // 追踪页面加载性能
  trackPageLoad(path: string) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const metric: PageMetric = {
        id: `page_${Date.now()}`,
        type: 'page',
        name: `Page Load: ${path}`,
        path,
        startTime: 0,
        endTime: navigation.loadEventEnd,
        duration: navigation.loadEventEnd - navigation.fetchStart,
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        success: true,
        timestamp: dayjs().toISOString(),
        sessionId: this.sessionId,
        userId: this.userId,
      };

      // 尝试获取Web Vitals指标
      if ('PerformanceObserver' in window) {
        this.getWebVitals(metric);
      }

      this.addMetric(metric);
    }
  }

  // 追踪组件渲染性能
  trackComponent(componentName: string, renderTime: number, rerenderCount?: number) {
    const metric: ComponentMetric = {
      id: `component_${Date.now()}`,
      type: 'component',
      name: `Component: ${componentName}`,
      componentName,
      startTime: performance.now() - renderTime,
      endTime: performance.now(),
      duration: renderTime,
      renderTime,
      rerenderCount,
      success: true,
      timestamp: dayjs().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addMetric(metric);
  }

  // 追踪用户行为
  trackUserAction(action: string, target: string, context?: Record<string, any>) {
    const metric: UserActionMetric = {
      id: `action_${Date.now()}`,
      type: 'user-action',
      name: `User Action: ${action}`,
      action,
      target,
      context,
      startTime: performance.now(),
      success: true,
      timestamp: dayjs().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addMetric(metric);
  }

  // 添加指标到存储
  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // 保持最大数量限制
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 通知监听器
    this.notifyListeners(metric);
  }

  // 获取性能统计
  getPerformanceStats(timeRange?: { start: string; end: string }): PerformanceStats {
    let apiMetrics = this.metrics.filter(m => m.type === 'api') as ApiMetric[];
    
    // 应用时间范围过滤
    if (timeRange) {
      const start = dayjs(timeRange.start);
      const end = dayjs(timeRange.end);
      apiMetrics = apiMetrics.filter(m => {
        const timestamp = dayjs(m.timestamp);
        return timestamp.isAfter(start) && timestamp.isBefore(end);
      });
    }

    const totalRequests = apiMetrics.length;
    const successfulRequests = apiMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const durations = apiMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    const averageResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const p50ResponseTime = durations.length > 0
      ? durations[Math.floor(durations.length * 0.5)]
      : 0;

    const p95ResponseTime = durations.length > 0
      ? durations[Math.floor(durations.length * 0.95)]
      : 0;

    const p99ResponseTime = durations.length > 0
      ? durations[Math.floor(durations.length * 0.99)]
      : 0;

    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    const slowRequestsCount = durations.filter(d => d > 2000).length;
    
    const cacheHitRequests = apiMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalRequests > 0 ? (cacheHitRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      p50ResponseTime: Math.round(p50ResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      slowRequestsCount,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  }

  // 获取错误统计
  getErrorStats(timeRange?: { start: string; end: string }): ErrorStats {
    let errorMetrics = this.metrics.filter(m => !m.success);
    
    // 应用时间范围过滤
    if (timeRange) {
      const start = dayjs(timeRange.start);
      const end = dayjs(timeRange.end);
      errorMetrics = errorMetrics.filter(m => {
        const timestamp = dayjs(m.timestamp);
        return timestamp.isAfter(start) && timestamp.isBefore(end);
      });
    }

    const totalErrors = errorMetrics.length;
    
    // 按错误类型统计
    const errorsByType: Record<string, number> = {};
    errorMetrics.forEach(m => {
      const errorType = m.error || 'Unknown Error';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    // 按端点统计（仅API错误）
    const errorsByEndpoint: Record<string, number> = {};
    errorMetrics
      .filter(m => m.type === 'api')
      .forEach(m => {
        const endpoint = (m as ApiMetric).url;
        errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1;
      });

    // 获取最常见的错误
    const topErrors = Object.entries(errorsByType)
      .map(([error, count]) => ({
        error,
        count,
        lastOccurred: errorMetrics
          .filter(m => m.error === error)
          .sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf())[0]?.timestamp || '',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByType,
      errorsByEndpoint,
      topErrors,
    };
  }

  // 获取指标详情
  getMetrics(filters?: {
    type?: PerformanceMetric['type'];
    timeRange?: { start: string; end: string };
    limit?: number;
  }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filters?.type) {
      filtered = filtered.filter(m => m.type === filters.type);
    }

    if (filters?.timeRange) {
      const start = dayjs(filters.timeRange.start);
      const end = dayjs(filters.timeRange.end);
      filtered = filtered.filter(m => {
        const timestamp = dayjs(m.timestamp);
        return timestamp.isAfter(start) && timestamp.isBefore(end);
      });
    }

    // 按时间排序（最新的在前）
    filtered.sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf());

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  // 添加性能监听器
  addListener(listener: (metric: PerformanceMetric) => void) {
    this.listeners.push(listener);
  }

  // 移除性能监听器
  removeListener(listener: (metric: PerformanceMetric) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // 通知监听器
  private notifyListeners(metric: PerformanceMetric) {
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        console.warn('Performance listener error:', error);
      }
    });
  }

  // 初始化Web Vitals监控
  private initializeWebVitals() {
    if ('PerformanceObserver' in window) {
      try {
        // 监控 Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.trackUserAction('web-vital', 'LCP', { value: lastEntry.startTime });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // 监控 First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            this.trackUserAction('web-vital', 'FID', { value: entry.processingStart - entry.startTime });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // 监控 Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              this.trackUserAction('web-vital', 'CLS', { value: entry.value });
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Failed to initialize Web Vitals monitoring:', error);
      }
    }
  }

  // 获取Web Vitals指标
  private getWebVitals(pageMetric: PageMetric) {
    if ('PerformanceObserver' in window) {
      try {
        // 获取First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          pageMetric.firstContentfulPaint = fcpEntry.startTime;
        }
      } catch (error) {
        console.warn('Failed to get Web Vitals:', error);
      }
    }
  }

  // 设置导航观察器
  private setupNavigationObserver() {
    // 监听路由变化
    let currentPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        this.trackPageLoad(window.location.pathname);
        currentPath = window.location.pathname;
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
  }

  // 清理资源
  cleanup() {
    this.listeners = [];
    this.metrics = [];
  }

  // 导出性能数据
  exportData(format: 'json' | 'csv' = 'json') {
    const data = {
      sessionId: this.sessionId,
      userId: this.userId,
      exportTime: dayjs().toISOString(),
      metrics: this.metrics,
      stats: this.getPerformanceStats(),
      errorStats: this.getErrorStats(),
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${dayjs().format('YYYY-MM-DD-HH-mm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// React Hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startApiCall: performanceMonitor.startApiCall.bind(performanceMonitor),
    endApiCall: performanceMonitor.endApiCall.bind(performanceMonitor),
    trackComponent: performanceMonitor.trackComponent.bind(performanceMonitor),
    trackUserAction: performanceMonitor.trackUserAction.bind(performanceMonitor),
    getPerformanceStats: performanceMonitor.getPerformanceStats.bind(performanceMonitor),
    getErrorStats: performanceMonitor.getErrorStats.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    addListener: performanceMonitor.addListener.bind(performanceMonitor),
    removeListener: performanceMonitor.removeListener.bind(performanceMonitor),
    setUserId: performanceMonitor.setUserId.bind(performanceMonitor),
    exportData: performanceMonitor.exportData.bind(performanceMonitor),
  };
};