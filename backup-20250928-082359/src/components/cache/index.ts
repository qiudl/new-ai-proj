/**
 * 缓存监控组件导出
 * 统一导出所有缓存相关的组件和工具
 */

// 核心组件
export { default as CacheMonitorDashboard } from './CacheMonitorDashboard';
export { default as CacheDebugTools } from './CacheDebugTools';
export { default as PerformanceAnalyzer } from './PerformanceAnalyzer';
export { default as DeveloperDebugPanel } from './DeveloperDebugPanel';
export { default as CacheMonitoringHub } from './CacheMonitoringHub';

// 缓存感知组件框架
export {
  CacheProvider,
  useCacheContext,
  useCacheAware,
  useCachePerformance,
  withCacheAware
} from './CacheAwareComponent';

// 类型定义
export type {
  CacheContextValue,
  CacheProviderProps,
  CacheAwareOptions,
  CacheAwareProps
} from './CacheAwareComponent';

// 工具函数
export const CacheMonitoringUtils = {
  /**
   * 检查是否需要显示监控面板
   */
  shouldShowMonitoring: (hitRate: number, errorRate: number): boolean => {
    return hitRate < 70 || errorRate > 5;
  },

  /**
   * 格式化缓存键用于显示
   */
  formatCacheKey: (key: string, maxLength: number = 50): string => {
    return key.length > maxLength ? `${key.substring(0, maxLength)}...` : key;
  },

  /**
   * 计算性能评分
   */
  calculatePerformanceScore: (hitRate: number, avgResponseTime: number, errorRate: number): number => {
    const hitRateScore = Math.min(hitRate / 80 * 40, 40);
    const responseTimeScore = Math.max(30 - (avgResponseTime / 100), 0);
    const errorScore = Math.max(30 - (errorRate * 6), 0);
    
    return Math.round(hitRateScore + responseTimeScore + errorScore);
  },

  /**
   * 获取状态颜色
   */
  getStatusColor: (value: number, thresholds: { good: number; warning: number }): string => {
    if (value >= thresholds.good) return '#52c41a';
    if (value >= thresholds.warning) return '#faad14';
    return '#ff4d4f';
  }
};