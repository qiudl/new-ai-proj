/**
 * 增强渲染性能监控工具
 * 专门用于检测和追踪持续渲染问题、无限循环、组件重复渲染等性能问题
 */

import React from 'react';

export interface RenderMetric {
  componentName: string;
  timestamp: number;
  renderCount: number;
  renderDuration: number;
  props: Record<string, any>;
  state: Record<string, any>;
  stackTrace: string;
}

export interface ContinuousRenderingAlert {
  componentName: string;
  renderCount: number;
  timeWindow: number;
  frequency: number; // renders per second
  firstDetected: number;
  lastDetected: number;
  stackTrace: string;
  possibleCauses: string[];
}

export interface PerformanceStats {
  totalRenders: number;
  continuousRenderingComponents: string[];
  highFrequencyComponents: Array<{
    name: string;
    renderCount: number;
    frequency: number;
  }>;
  renderTimeDistribution: Record<string, number>;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}

class RenderingPerformanceMonitor {
  private renderMetrics: Map<string, RenderMetric[]> = new Map();
  private renderCounters: Map<string, number> = new Map();
  private continuousRenderingAlerts: ContinuousRenderingAlert[] = [];
  private startTime: number = performance.now();
  
  // 配置参数
  private readonly CONTINUOUS_RENDERING_THRESHOLD = 10; // 10次渲染
  private readonly TIME_WINDOW = 5000; // 5秒时间窗口
  private readonly HIGH_FREQUENCY_THRESHOLD = 2; // 每秒2次以上
  private readonly MAX_METRICS_PER_COMPONENT = 100; // 每个组件最多保存100条记录
  
  /**
   * 记录组件渲染
   */
  recordRender(
    componentName: string,
    renderDuration: number = 0,
    props: Record<string, any> = {},
    state: Record<string, any> = {}
  ): void {
    const timestamp = performance.now();
    const renderCount = this.incrementRenderCounter(componentName);
    
    // 获取调用栈（仅在开发环境）
    const stackTrace = process.env.NODE_ENV === 'development' 
      ? new Error().stack?.slice(0, 500) || ''
      : '';
    
    // 记录渲染指标
    const metric: RenderMetric = {
      componentName,
      timestamp,
      renderCount,
      renderDuration,
      props: this.sanitizeObject(props),
      state: this.sanitizeObject(state),
      stackTrace
    };
    
    if (!this.renderMetrics.has(componentName)) {
      this.renderMetrics.set(componentName, []);
    }
    
    const metrics = this.renderMetrics.get(componentName)!;
    metrics.push(metric);
    
    // 限制记录数量
    if (metrics.length > this.MAX_METRICS_PER_COMPONENT) {
      metrics.shift();
    }
    
    // 检查连续渲染问题
    this.detectContinuousRendering(componentName);
    
    // 开发环境下的实时日志
    if (process.env.NODE_ENV === 'development' && renderCount > 5) {
      console.warn(`🔄 [RenderMonitor] ${componentName} has rendered ${renderCount} times`);
    }
  }
  
  /**
   * 增加渲染计数器
   */
  private incrementRenderCounter(componentName: string): number {
    const current = this.renderCounters.get(componentName) || 0;
    const newCount = current + 1;
    this.renderCounters.set(componentName, newCount);
    return newCount;
  }
  
  /**
   * 清理敏感对象数据
   */
  private sanitizeObject(obj: any): Record<string, any> {
    if (!obj || typeof obj !== 'object') return {};
    
    const sanitized: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value) 
          ? `[Array(${value.length})]`
          : '[Object]';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }
  
  /**
   * 检测连续渲染问题
   */
  private detectContinuousRendering(componentName: string): void {
    const metrics = this.renderMetrics.get(componentName);
    if (!metrics) return;
    
    const now = performance.now();
    const recentMetrics = metrics.filter(
      m => now - m.timestamp < this.TIME_WINDOW
    );
    
    if (recentMetrics.length >= this.CONTINUOUS_RENDERING_THRESHOLD) {
      const frequency = recentMetrics.length / (this.TIME_WINDOW / 1000);
      
      // 检查是否已经有告警
      const existingAlert = this.continuousRenderingAlerts.find(
        alert => alert.componentName === componentName
      );
      
      if (existingAlert) {
        existingAlert.renderCount = recentMetrics.length;
        existingAlert.frequency = frequency;
        existingAlert.lastDetected = now;
      } else {
        // 分析可能的原因
        const possibleCauses = this.analyzePossibleCauses(recentMetrics);
        
        const alert: ContinuousRenderingAlert = {
          componentName,
          renderCount: recentMetrics.length,
          timeWindow: this.TIME_WINDOW,
          frequency,
          firstDetected: now,
          lastDetected: now,
          stackTrace: recentMetrics[recentMetrics.length - 1]?.stackTrace || '',
          possibleCauses
        };
        
        this.continuousRenderingAlerts.push(alert);
        
        // 实时告警
        if (process.env.NODE_ENV === 'development') {
          console.error(`🚨 [RenderMonitor] Continuous rendering detected:`, alert);
          console.group('Possible causes:');
          possibleCauses.forEach(cause => console.warn(`- ${cause}`));
          console.groupEnd();
        }
      }
    }
  }
  
  /**
   * 分析可能的连续渲染原因
   */
  private analyzePossibleCauses(metrics: RenderMetric[]): string[] {
    const causes: string[] = [];
    
    if (metrics.length < 2) return causes;
    
    // 检查props变化频率
    const propsChanges = this.detectPropsChanges(metrics);
    if (propsChanges > metrics.length * 0.8) {
      causes.push('Props频繁变化，检查父组件是否有不必要的状态更新');
    }
    
    // 检查state变化频率
    const stateChanges = this.detectStateChanges(metrics);
    if (stateChanges > metrics.length * 0.8) {
      causes.push('State频繁变化，检查是否有无限循环的状态更新');
    }
    
    // 检查调用栈中的循环模式
    const stackTraces = metrics.map(m => m.stackTrace);
    if (this.detectStackTraceLoop(stackTraces)) {
      causes.push('检测到调用栈循环模式，可能存在useEffect依赖循环');
    }
    
    // 检查时间间隔
    const intervals = this.calculateRenderIntervals(metrics);
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    if (avgInterval < 100) { // 小于100ms
      causes.push('渲染间隔过短，检查是否有定时器或动画导致的频繁更新');
    }
    
    return causes;
  }
  
  /**
   * 检测props变化
   */
  private detectPropsChanges(metrics: RenderMetric[]): number {
    let changes = 0;
    for (let i = 1; i < metrics.length; i++) {
      if (JSON.stringify(metrics[i].props) !== JSON.stringify(metrics[i - 1].props)) {
        changes++;
      }
    }
    return changes;
  }
  
  /**
   * 检测state变化
   */
  private detectStateChanges(metrics: RenderMetric[]): number {
    let changes = 0;
    for (let i = 1; i < metrics.length; i++) {
      if (JSON.stringify(metrics[i].state) !== JSON.stringify(metrics[i - 1].state)) {
        changes++;
      }
    }
    return changes;
  }
  
  /**
   * 检测调用栈循环
   */
  private detectStackTraceLoop(stackTraces: string[]): boolean {
    if (stackTraces.length < 3) return false;
    
    // 简单的循环检测：检查相似的调用栈模式
    const lastThree = stackTraces.slice(-3);
    return lastThree.every(trace => 
      trace.includes('useEffect') || 
      trace.includes('useState') || 
      trace.includes('useCallback')
    );
  }
  
  /**
   * 计算渲染间隔
   */
  private calculateRenderIntervals(metrics: RenderMetric[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < metrics.length; i++) {
      intervals.push(metrics[i].timestamp - metrics[i - 1].timestamp);
    }
    return intervals;
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStats(): PerformanceStats {
    const totalRenders = Array.from(this.renderCounters.values())
      .reduce((sum, count) => sum + count, 0);
    
    const continuousRenderingComponents = this.continuousRenderingAlerts
      .map(alert => alert.componentName);
    
    const highFrequencyComponents = Array.from(this.renderCounters.entries())
      .map(([name, count]) => {
        const metrics = this.renderMetrics.get(name) || [];
        const timeSpan = metrics.length > 0 
          ? (performance.now() - metrics[0].timestamp) / 1000
          : 1;
        return {
          name,
          renderCount: count,
          frequency: count / timeSpan
        };
      })
      .filter(comp => comp.frequency > this.HIGH_FREQUENCY_THRESHOLD)
      .sort((a, b) => b.frequency - a.frequency);
    
    const renderTimeDistribution: Record<string, number> = {};
    this.renderMetrics.forEach((metrics, componentName) => {
      const avgRenderTime = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.renderDuration, 0) / metrics.length
        : 0;
      renderTimeDistribution[componentName] = avgRenderTime;
    });
    
    // 获取内存使用情况（如果支持）
    const memoryUsage = this.getMemoryUsage();
    
    return {
      totalRenders,
      continuousRenderingComponents,
      highFrequencyComponents,
      renderTimeDistribution,
      memoryUsage
    };
  }
  
  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } | undefined {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return undefined;
  }
  
  /**
   * 获取连续渲染告警
   */
  getContinuousRenderingAlerts(): ContinuousRenderingAlert[] {
    return [...this.continuousRenderingAlerts];
  }
  
  /**
   * 获取组件详细渲染信息
   */
  getComponentRenderInfo(componentName: string): {
    renderCount: number;
    recentMetrics: RenderMetric[];
    averageRenderTime: number;
    renderFrequency: number;
  } | null {
    const metrics = this.renderMetrics.get(componentName);
    const renderCount = this.renderCounters.get(componentName);
    
    if (!metrics || !renderCount) return null;
    
    const recentMetrics = metrics.slice(-10); // 最近10次渲染
    const averageRenderTime = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.renderDuration, 0) / metrics.length
      : 0;
    
    const timeSpan = metrics.length > 0 
      ? (performance.now() - metrics[0].timestamp) / 1000
      : 1;
    const renderFrequency = renderCount / timeSpan;
    
    return {
      renderCount,
      recentMetrics,
      averageRenderTime,
      renderFrequency
    };
  }
  
  /**
   * 清理过期的数据
   */
  cleanup(): void {
    const now = performance.now();
    const maxAge = 300000; // 5分钟
    
    this.renderMetrics.forEach((metrics, componentName) => {
      const filteredMetrics = metrics.filter(
        m => now - m.timestamp < maxAge
      );
      
      if (filteredMetrics.length === 0) {
        this.renderMetrics.delete(componentName);
        this.renderCounters.delete(componentName);
      } else {
        this.renderMetrics.set(componentName, filteredMetrics);
      }
    });
    
    // 清理过期的告警
    this.continuousRenderingAlerts = this.continuousRenderingAlerts.filter(
      alert => now - alert.lastDetected < maxAge
    );
  }
  
  /**
   * 重置所有监控数据
   */
  reset(): void {
    this.renderMetrics.clear();
    this.renderCounters.clear();
    this.continuousRenderingAlerts.length = 0;
    this.startTime = performance.now();
  }
  
  /**
   * 生成性能报告
   */
  generateReport(): string {
    const stats = this.getPerformanceStats();
    const alerts = this.getContinuousRenderingAlerts();
    
    let report = '=== 渲染性能监控报告 ===\n\n';
    
    report += `监控开始时间: ${new Date(Date.now() - (performance.now() - this.startTime)).toLocaleString()}\n`;
    report += `总渲染次数: ${stats.totalRenders}\n`;
    report += `监控组件数: ${this.renderMetrics.size}\n\n`;
    
    if (alerts.length > 0) {
      report += '🚨 连续渲染问题:\n';
      alerts.forEach(alert => {
        report += `- ${alert.componentName}: ${alert.renderCount}次渲染在${alert.timeWindow/1000}秒内 (${alert.frequency.toFixed(2)} 次/秒)\n`;
        alert.possibleCauses.forEach(cause => {
          report += `  原因: ${cause}\n`;
        });
      });
      report += '\n';
    }
    
    if (stats.highFrequencyComponents.length > 0) {
      report += '⚡ 高频渲染组件:\n';
      stats.highFrequencyComponents.forEach(comp => {
        report += `- ${comp.name}: ${comp.renderCount}次渲染 (${comp.frequency.toFixed(2)} 次/秒)\n`;
      });
      report += '\n';
    }
    
    if (stats.memoryUsage) {
      report += `💾 内存使用: ${(stats.memoryUsage.used / 1024 / 1024).toFixed(1)}MB / ${(stats.memoryUsage.total / 1024 / 1024).toFixed(1)}MB (${stats.memoryUsage.percentage.toFixed(1)}%)\n\n`;
    }
    
    report += '📊 组件渲染时间分布:\n';
    Object.entries(stats.renderTimeDistribution).forEach(([name, time]) => {
      report += `- ${name}: ${time.toFixed(2)}ms 平均渲染时间\n`;
    });
    
    return report;
  }
}

// 全局实例
export const renderingPerformanceMonitor = new RenderingPerformanceMonitor();

// React Hook for tracking component renders
export function useRenderTracker(componentName: string, props?: any, state?: any) {
  const renderCount = React.useRef(0);
  const renderStartTime = React.useRef(performance.now());
  
  React.useLayoutEffect(() => {
    const renderDuration = performance.now() - renderStartTime.current;
    renderCount.current++;
    
    renderingPerformanceMonitor.recordRender(
      componentName,
      renderDuration,
      props,
      state
    );
    
    // 为下次渲染准备
    renderStartTime.current = performance.now();
  });
  
  React.useEffect(() => {
    renderStartTime.current = performance.now();
  });
  
  return {
    renderCount: renderCount.current,
    getComponentInfo: () => renderingPerformanceMonitor.getComponentRenderInfo(componentName)
  };
}

// 开发环境下的全局监控函数
if (process.env.NODE_ENV === 'development') {
  (window as any).renderingMonitor = {
    getStats: () => renderingPerformanceMonitor.getPerformanceStats(),
    getAlerts: () => renderingPerformanceMonitor.getContinuousRenderingAlerts(),
    getReport: () => renderingPerformanceMonitor.generateReport(),
    cleanup: () => renderingPerformanceMonitor.cleanup(),
    reset: () => renderingPerformanceMonitor.reset(),
    getComponentInfo: (name: string) => renderingPerformanceMonitor.getComponentRenderInfo(name)
  };
  
  // 定期清理
  setInterval(() => {
    renderingPerformanceMonitor.cleanup();
  }, 60000); // 每分钟清理一次
}

export default RenderingPerformanceMonitor;