/**
 * 缓存状态管理Hook
 * 提供全局缓存状态监控、统计和管理功能
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { enhancedCacheManager } from '../utils/enhancedCacheManager';
import { cacheEventSystem, CacheEvent, PerformanceMetrics } from '../utils/cacheEventSystem';

export interface CacheRealtimeMetrics {
  /** 实时命中率 */
  hitRate: number;
  /** 内存使用量(MB) */
  memoryUsage: number;
  /** 活跃操作数 */
  activeOperations: number;
  /** 最近1分钟的操作数 */
  recentOperations: number;
  /** 错误率 */
  errorRate: number;
}

export interface CacheAnomalies {
  /** 命中率过低 */
  highMissRate: boolean;
  /** 响应时间过慢 */
  slowResponses: boolean;
  /** 内存使用激增 */
  memorySpikes: boolean;
  /** 错误激增 */
  errorSpikes: boolean;
}

export interface CacheActions {
  /** 清空所有缓存 */
  clearCache: () => Promise<void>;
  /** 按标签失效缓存 */
  invalidateByTag: (tags: string[]) => Promise<string[]>;
  /** 按模式失效缓存 */
  invalidateByPattern: (pattern: string) => Promise<string[]>;
  /** 导出性能指标 */
  exportMetrics: () => CacheMetricsReport;
  /** 重置统计数据 */
  resetStats: () => void;
  /** 触发清理 */
  cleanup: () => Promise<void>;
}

export interface CacheMetricsReport {
  /** 报告生成时间 */
  timestamp: number;
  /** 性能指标 */
  performance: PerformanceMetrics;
  /** 实时指标 */
  realtime: CacheRealtimeMetrics;
  /** 异常检测 */
  anomalies: CacheAnomalies;
  /** 缓存基础统计 */
  baseStats: ReturnType<typeof enhancedCacheManager.getStats>;
  /** 最近事件 */
  recentEvents: CacheEvent[];
  /** 建议 */
  recommendations: string[];
}

export interface UseCacheStateReturn {
  /** 缓存基础统计 */
  stats: ReturnType<typeof enhancedCacheManager.getStats>;
  /** 实时监控指标 */
  realtimeMetrics: CacheRealtimeMetrics;
  /** 热点键分析 */
  hotKeys: { key: string; accessCount: number }[];
  /** 异常检测结果 */
  anomalies: CacheAnomalies;
  /** 操作方法 */
  actions: CacheActions;
  /** 是否正在加载 */
  loading: boolean;
  /** 最近事件 */
  recentEvents: CacheEvent[];
  /** 性能趋势 */
  performanceTrend: {
    hitRates: number[];
    memoryUsages: number[];
    responseTimes: number[];
  };
}

/**
 * 缓存状态管理Hook
 * 提供全局缓存监控和管理能力
 */
export function useCacheState(): UseCacheStateReturn {
  // 状态管理
  const [stats, setStats] = useState(() => enhancedCacheManager.getStats());
  const [realtimeMetrics, setRealtimeMetrics] = useState<CacheRealtimeMetrics>({
    hitRate: 0,
    memoryUsage: 0,
    activeOperations: 0,
    recentOperations: 0,
    errorRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [recentEvents, setRecentEvents] = useState<CacheEvent[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState({
    hitRates: [] as number[],
    memoryUsages: [] as number[],
    responseTimes: [] as number[]
  });

  // 引用管理
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 更新统计数据
  const updateStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      
      // 获取基础统计
      const baseStats = enhancedCacheManager.getStats();
      setStats(baseStats);

      // 获取事件系统性能指标
      const performanceMetrics = cacheEventSystem.getPerformanceMetrics();
      const realtimeStats = cacheEventSystem.getRealTimeStats(60000); // 最近1分钟

      // 计算实时指标
      const newRealtimeMetrics: CacheRealtimeMetrics = {
        hitRate: performanceMetrics.hitRate,
        memoryUsage: baseStats.memoryUsageMB,
        activeOperations: realtimeStats.activeKeys.size,
        recentOperations: realtimeStats.recentOperations,
        errorRate: realtimeStats.recentErrors > 0 ? 
          (realtimeStats.recentErrors / Math.max(realtimeStats.recentOperations, 1)) * 100 : 0
      };
      setRealtimeMetrics(newRealtimeMetrics);

      // 更新最近事件
      const latestEvents = cacheEventSystem.getEventHistory(undefined, 10);
      setRecentEvents(latestEvents);

      // 更新性能趋势
      setPerformanceTrend(prev => {
        const maxTrendLength = 20; // 保持最近20个数据点
        
        return {
          hitRates: [...prev.hitRates, performanceMetrics.hitRate].slice(-maxTrendLength),
          memoryUsages: [...prev.memoryUsages, baseStats.memoryUsageMB].slice(-maxTrendLength),
          responseTimes: [...prev.responseTimes, performanceMetrics.avgResponseTime].slice(-maxTrendLength)
        };
      });
    } catch (error) {
      console.error('Failed to update cache stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取热点键
  const hotKeys = useMemo(() => {
    const performanceMetrics = cacheEventSystem.getPerformanceMetrics();
    return performanceMetrics.hotKeys;
  }, [stats]); // 依赖stats来触发更新

  // 异常检测
  const anomalies = useMemo((): CacheAnomalies => {
    const detected = cacheEventSystem.detectAnomalies();
    return {
      highMissRate: detected.highMissRate,
      slowResponses: detected.slowResponses,
      memorySpikes: detected.memorySpikes,
      errorSpikes: detected.errorSpikes
    };
  }, [realtimeMetrics]);

  // 操作方法
  const actions: CacheActions = useMemo(() => ({
    clearCache: async () => {
      setLoading(true);
      try {
        await enhancedCacheManager.clear();
        cacheEventSystem.emitCleanup([], 0, 'manual');
        await updateStats();
      } finally {
        setLoading(false);
      }
    },

    invalidateByTag: async (tags: string[]) => {
      setLoading(true);
      try {
        const invalidatedKeys = await enhancedCacheManager.invalidateByTags(tags);
        await updateStats();
        return invalidatedKeys;
      } finally {
        setLoading(false);
      }
    },

    invalidateByPattern: async (pattern: string) => {
      setLoading(true);
      try {
        const invalidatedKeys = await enhancedCacheManager.invalidateByPattern(pattern);
        await updateStats();
        return invalidatedKeys;
      } finally {
        setLoading(false);
      }
    },

    exportMetrics: (): CacheMetricsReport => {
      const performanceMetrics = cacheEventSystem.getPerformanceMetrics();
      const baseStats = enhancedCacheManager.getStats();
      
      // 生成建议
      const recommendations: string[] = [];
      if (anomalies.highMissRate) {
        recommendations.push('考虑调整缓存策略或增加缓存时间');
      }
      if (anomalies.memorySpikes) {
        recommendations.push('监控内存使用，考虑降低缓存大小限制');
      }
      if (anomalies.slowResponses) {
        recommendations.push('检查数据获取逻辑，优化API响应时间');
      }
      if (anomalies.errorSpikes) {
        recommendations.push('检查错误日志，修复潜在的缓存问题');
      }
      if (recommendations.length === 0) {
        recommendations.push('缓存系统运行良好，继续监控');
      }

      return {
        timestamp: Date.now(),
        performance: performanceMetrics,
        realtime: realtimeMetrics,
        anomalies,
        baseStats,
        recentEvents: cacheEventSystem.getEventHistory(undefined, 20),
        recommendations
      };
    },

    resetStats: () => {
      cacheEventSystem.clearPerformanceData();
      enhancedCacheManager.resetStats();
      setPerformanceTrend({
        hitRates: [],
        memoryUsages: [],
        responseTimes: []
      });
      updateStats();
    },

    cleanup: async () => {
      setLoading(true);
      try {
        await enhancedCacheManager.cleanup();
        await updateStats();
      } finally {
        setLoading(false);
      }
    }
  }), [anomalies, realtimeMetrics, updateStats]);

  // 自动更新定时器
  useEffect(() => {
    // 立即更新一次
    updateStats();

    // 设置定期更新 (每5秒)
    updateIntervalRef.current = setInterval(() => {
      updateStats();
    }, 5000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [updateStats]);

  // 事件监听
  useEffect(() => {
    const unsubscribe = cacheEventSystem.onAll((event) => {
      // 实时更新最近事件
      setRecentEvents(prev => {
        const newEvents = [event, ...prev].slice(0, 10);
        return newEvents;
      });
    });

    return unsubscribe;
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    stats,
    realtimeMetrics,
    hotKeys,
    anomalies,
    actions,
    loading,
    recentEvents,
    performanceTrend
  };
}

// 轻量级版本，仅提供基础统计
export function useCacheStats() {
  const [stats, setStats] = useState(() => enhancedCacheManager.getStats());

  useEffect(() => {
    const updateStats = () => {
      setStats(enhancedCacheManager.getStats());
    };

    // 立即更新
    updateStats();

    // 每10秒更新一次
    const interval = setInterval(updateStats, 10000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// 缓存事件监听Hook
export function useCacheEvents(eventType?: CacheEvent['type']) {
  const [events, setEvents] = useState<CacheEvent[]>([]);

  useEffect(() => {
    const unsubscribe = eventType
      ? cacheEventSystem.on(eventType, (event) => {
          setEvents(prev => [event, ...prev].slice(0, 50));
        })
      : cacheEventSystem.onAll((event) => {
          setEvents(prev => [event, ...prev].slice(0, 50));
        });

    // 初始化事件历史
    const initialEvents = cacheEventSystem.getEventHistory(eventType, 50);
    setEvents(initialEvents);

    return unsubscribe;
  }, [eventType]);

  return events;
}

export default useCacheState;