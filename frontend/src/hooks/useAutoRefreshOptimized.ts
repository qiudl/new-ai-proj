import { useEffect, useRef, useCallback, useState } from 'react';
import { RefreshErrorAnalyzer, RefreshErrorHandler, globalRefreshErrorHandler, RefreshError } from '../utils/RefreshErrorHandler';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';

// 定时器管理器 - 防止定时器泄漏
class TimerManager {
  private timers = new Set<NodeJS.Timeout>();
  private intervalTimers = new Set<NodeJS.Timer>();
  
  createTimer(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
      updateActiveTimersCount(this.getActiveCount());
    }, delay);
    this.timers.add(timer);
    updateActiveTimersCount(this.getActiveCount());
    return timer;
  }
  
  createInterval(callback: () => void, delay: number): NodeJS.Timer {
    const timer = setInterval(callback, delay);
    this.intervalTimers.add(timer);
    updateActiveTimersCount(this.getActiveCount());
    return timer;
  }
  
  clearTimer(timer: NodeJS.Timeout): void {
    if (this.timers.has(timer)) {
      clearTimeout(timer);
      this.timers.delete(timer);
      updateActiveTimersCount(this.getActiveCount());
    }
  }
  
  clearInterval(timer: NodeJS.Timer): void {
    if (this.intervalTimers.has(timer)) {
      clearInterval(timer);
      this.intervalTimers.delete(timer);
      updateActiveTimersCount(this.getActiveCount());
    }
  }
  
  clearAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.intervalTimers.forEach(timer => clearInterval(timer));
    this.intervalTimers.clear();
    updateActiveTimersCount(this.getActiveCount());
  }
  
  getActiveCount(): number {
    return this.timers.size + this.intervalTimers.size;
  }
}

// 请求缓存管理器 - 避免重复请求
class RequestCache {
  private cache = new Map<string, { 
    promise: Promise<any>; 
    timestamp: number; 
    abortController?: AbortController;
  }>();
  private readonly CACHE_TTL = 5000; // 5秒缓存
  
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);
    
    // 检查缓存是否有效
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      try {
        return await cached.promise;
      } catch (error) {
        // 缓存的请求失败，移除缓存
        this.cache.delete(key);
      }
    }
    
    // 创建新的请求
    const abortController = new AbortController();
    const promise = fetcher();
    
    this.cache.set(key, { 
      promise, 
      timestamp: now, 
      abortController 
    });
    
    // 设置清理定时器
    setTimeout(() => this.cleanExpired(), this.CACHE_TTL);
    
    try {
      const result = await promise;
      return result;
    } catch (error) {
      // 请求失败，立即移除缓存
      this.cache.delete(key);
      throw error;
    }
  }
  
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, { timestamp, abortController }] of this.cache.entries()) {
      if (now - timestamp >= this.CACHE_TTL) {
        if (abortController) {
          abortController.abort();
        }
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    for (const [key, { abortController }] of this.cache.entries()) {
      if (abortController) {
        abortController.abort();
      }
    }
    this.cache.clear();
  }
  
  getStats(): { cacheSize: number; hitRate: number } {
    return {
      cacheSize: this.cache.size,
      hitRate: 0 // TODO: 实现命中率统计
    };
  }
}

// 全局统计收集器
const updateGlobalStats = (stats: {
  totalRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  cacheHits: number;
  responseTime?: number;
}) => {
  if (typeof window !== 'undefined') {
    const globalStats = (window as any).__refreshStats || {
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      cacheHits: 0,
      responseTimes: []
    };

    globalStats.totalRefreshes += 1;
    if (stats.successfulRefreshes > 0) {
      globalStats.successfulRefreshes += 1;
    }
    if (stats.failedRefreshes > 0) {
      globalStats.failedRefreshes += 1;
    }
    if (stats.cacheHits > 0) {
      globalStats.cacheHits += 1;
    }
    if (stats.responseTime !== undefined) {
      globalStats.responseTimes.push(stats.responseTime);
      // 保留最近100个响应时间
      if (globalStats.responseTimes.length > 100) {
        globalStats.responseTimes = globalStats.responseTimes.slice(-100);
      }
    }

    (window as any).__refreshStats = globalStats;
  }
};

// 全局请求缓存实例
const globalRequestCache = new RequestCache();

// 更新活动定时器计数
const updateActiveTimersCount = (count: number) => {
  if (typeof window !== 'undefined') {
    (window as any).__activeTimersCount = count;
  }
};

// 页面可见性检测Hook - 增强版
export const usePageVisibilityOptimized = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [wasEverHidden, setWasEverHidden] = useState(document.hidden);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (!visible) {
        setWasEverHidden(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { isVisible, wasEverHidden };
};

// 内存监控Hook
export const useMemoryMonitor = () => {
  const [memoryStats, setMemoryStats] = useState<{
    used: number;
    total: number;
    percentage: number;
    limit: number;
  } | null>(null);
  
  const timerManagerRef = useRef<TimerManager>(new TimerManager());
  
  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryStats = () => {
        const memory = (performance as any).memory;
        const stats = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        };
        setMemoryStats(stats);
        
        // 内存使用率超过80%时发出警告
        if (stats.percentage > 80) {
          console.warn('⚠️ High memory usage detected:', {
            percentage: `${stats.percentage.toFixed(1)}%`,
            used: `${(stats.used / 1024 / 1024).toFixed(1)}MB`,
            total: `${(stats.total / 1024 / 1024).toFixed(1)}MB`,
            activeTimers: timerManagerRef.current.getActiveCount()
          });
        }
      };
      
      const timer = timerManagerRef.current.createInterval(updateMemoryStats, 10000);
      updateMemoryStats(); // 立即检查一次
      
      return () => {
        timerManagerRef.current.clearInterval(timer);
      };
    }
  }, []);
  
  return memoryStats;
};

// 自动刷新Hook的选项接口
export interface AutoRefreshOptimizedOptions {
  /** 刷新间隔（毫秒），默认30秒 */
  interval?: number;
  /** 依赖项数组，当依赖项变化时会重新启动定时器 */
  dependencies?: React.DependencyList;
  /** 是否启用页面可见性检测，默认true */
  enableVisibilityDetection?: boolean;
  /** 是否立即执行一次，默认false */
  immediate?: boolean;
  /** 是否启用，默认true */
  enabled?: boolean;
  /** 错误重试次数，默认3次 */
  maxRetries?: number;
  /** 重试间隔（毫秒），默认5秒 */
  retryInterval?: number;
  /** 自定义错误处理器 */
  errorHandler?: RefreshErrorHandler;
  /** 刷新上下文信息，用于错误分析和缓存 */
  context?: Record<string, any>;
  /** 是否启用请求缓存，默认true */
  enableCache?: boolean;
  /** 缓存键，用于请求去重 */
  cacheKey?: string;
  /** 是否使用全局配置，默认true */
  useGlobalConfig?: boolean;
}

export interface AutoRefreshOptimizedState {
  /** 是否正在刷新 */
  isRefreshing: boolean;
  /** 刷新类型 */
  refreshType: 'initial' | 'auto' | 'manual' | null;
  /** 最后一次刷新时间 */
  lastRefreshTime: Date | null;
  /** 刷新开始时间 */
  refreshStartTime: Date | null;
  /** 刷新错误信息 */
  error: RefreshError | null;
  /** 重试次数 */
  retryCount: number;
  /** 下次自动刷新时间 */
  nextRefreshTime: Date | null;
  /** 刷新统计信息 */
  stats: {
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    averageResponseTime: number;
    cacheHits: number;
  };
  /** 内存统计 */
  memoryStats: {
    used: number;
    total: number;
    percentage: number;
    limit: number;
  } | null;
  /** 手动触发刷新 */
  refresh: () => Promise<void>;
  /** 重置错误状态 */
  resetError: () => void;
  /** 强制重试（忽略重试限制） */
  forceRetry: () => Promise<void>;
  /** 获取错误历史 */
  getErrorHistory: () => RefreshError[];
  /** 清理资源 */
  cleanup: () => void;
}

/**
 * 性能优化版自动刷新Hook
 * 特点：
 * 1. 防止内存泄漏 - 完善的定时器清理和组件卸载保护
 * 2. 请求去重缓存 - 避免重复的网络请求
 * 3. 内存监控 - 实时监控内存使用情况
 * 4. 智能错误处理 - 根据错误类型自适应重试策略
 * 5. 页面可见性优化 - 页面不可见时暂停刷新
 */
export const useAutoRefreshOptimized = <T = any>(
  fetchFunction: () => Promise<T>,
  options: AutoRefreshOptimizedOptions = {}
): AutoRefreshOptimizedState => {
  // 尝试获取全局配置
  let globalConfig = null;
  try {
    if (options.useGlobalConfig !== false) {
      globalConfig = useRefreshConfig?.()?.config;
    }
  } catch {
    // 如果不在Provider内部，忽略错误
  }

  const {
    interval = globalConfig?.defaultInterval ? globalConfig.defaultInterval * 1000 : 30000,
    dependencies = [],
    enableVisibilityDetection = globalConfig?.enableVisibilityDetection ?? true,
    immediate = false,
    enabled = true,
    maxRetries = globalConfig?.maxRetries ?? 3,
    retryInterval = globalConfig?.retryInterval ?? 5000,
    errorHandler = globalRefreshErrorHandler,
    context = {},
    enableCache = true,
    cacheKey,
    useGlobalConfig = true
  } = options;

  // 状态管理
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshType, setRefreshType] = useState<'initial' | 'auto' | 'manual' | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [refreshStartTime, setRefreshStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<RefreshError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  
  // 性能统计
  const [stats, setStats] = useState({
    totalRefreshes: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    averageResponseTime: 0,
    cacheHits: 0
  });
  
  const responseTimes = useRef<number[]>([]);
  
  // 核心引用
  const timerManagerRef = useRef<TimerManager>(new TimerManager());
  const isMountedRef = useRef(true);
  const fetchFunctionRef = useRef(fetchFunction);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 页面可见性和内存监控
  const { isVisible, wasEverHidden } = usePageVisibilityOptimized();
  const memoryStats = useMemoryMonitor();

  // 更新fetchFunction引用
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  // 安全的状态更新函数
  const safeSetState = useCallback(<S>(
    setter: React.Dispatch<React.SetStateAction<S>>
  ) => (value: S | ((prev: S) => S)) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  // 生成缓存键
  const generateCacheKey = useCallback(() => {
    if (cacheKey) return cacheKey;
    
    const contextStr = JSON.stringify(context);
    const depsStr = JSON.stringify(dependencies);
    return `refresh_${btoa(contextStr + depsStr).slice(0, 16)}`;
  }, [cacheKey, context, dependencies]);

  // 执行刷新 - 带缓存和取消支持
  const executeRefresh = useCallback(async (
    type: 'initial' | 'auto' | 'manual' = 'auto'
  ): Promise<T | void> => {
    if (!isMountedRef.current || isRefreshing) return;

    const startTime = Date.now();
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      safeSetState(setIsRefreshing)(true);
      safeSetState(setRefreshType)(type);
      safeSetState(setRefreshStartTime)(new Date());
      safeSetState(setError)(null);
      
      let result: T;
      const key = generateCacheKey();
      
      if (enableCache && type === 'auto') {
        // 使用缓存（仅对自动刷新启用）
        result = await globalRequestCache.getOrFetch(
          key,
          fetchFunctionRef.current,
          abortControllerRef.current.signal
        );
        safeSetState(setStats)(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
      } else {
        // 直接执行（手动刷新或禁用缓存）
        result = await fetchFunctionRef.current();
      }
      
      if (isMountedRef.current) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 更新响应时间统计
        responseTimes.current.push(responseTime);
        if (responseTimes.current.length > 50) {
          responseTimes.current = responseTimes.current.slice(-50);
        }
        
        const avgResponseTime = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;
        
        safeSetState(setStats)(prev => ({
          totalRefreshes: prev.totalRefreshes + 1,
          successfulRefreshes: prev.successfulRefreshes + 1,
          failedRefreshes: prev.failedRefreshes,
          averageResponseTime: Math.round(avgResponseTime),
          cacheHits: prev.cacheHits
        }));
        
        // 更新全局统计
        updateGlobalStats({
          totalRefreshes: 1,
          successfulRefreshes: 1,
          failedRefreshes: 0,
          cacheHits: enableCache && type === 'auto' ? 1 : 0,
          responseTime: responseTime
        });
        
        safeSetState(setLastRefreshTime)(new Date());
        safeSetState(setRetryCount)(0);
        
        // 调试日志
        if (globalConfig?.enableDebugLogs) {
          console.log(`✅ Refresh succeeded (${type}):`, {
            responseTime: `${responseTime}ms`,
            cacheKey: key,
            memoryUsage: memoryStats ? `${memoryStats.percentage.toFixed(1)}%` : 'unknown'
          });
        }
      }
      
      return result;
    } catch (err: any) {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        // 错误分析和处理
        const refreshError = RefreshErrorAnalyzer.analyze(err, {
          ...context,
          type,
          retryCount: retryCount + 1,
          maxRetries,
          interval,
          cacheKey: generateCacheKey()
        });
        
        refreshError.retryCount = retryCount + 1;
        refreshError.maxRetries = maxRetries;
        
        safeSetState(setStats)(prev => ({
          totalRefreshes: prev.totalRefreshes + 1,
          successfulRefreshes: prev.successfulRefreshes,
          failedRefreshes: prev.failedRefreshes + 1,
          averageResponseTime: prev.averageResponseTime,
          cacheHits: prev.cacheHits
        }));
        
        // 更新全局统计
        updateGlobalStats({
          totalRefreshes: 1,
          successfulRefreshes: 0,
          failedRefreshes: 1,
          cacheHits: 0
        });
        
        safeSetState(setError)(refreshError);
        errorHandler.handleError(refreshError);
        
        // 自动重试逻辑
        if (errorHandler.shouldAutoRetry(refreshError)) {
          safeSetState(setRetryCount)(prev => prev + 1);
          timerManagerRef.current.createTimer(() => {
            if (isMountedRef.current) {
              executeRefresh(type);
            }
          }, retryInterval);
        }
        
        throw refreshError;
      }
    } finally {
      if (isMountedRef.current) {
        safeSetState(setIsRefreshing)(false);
        safeSetState(setRefreshType)(null);
        safeSetState(setRefreshStartTime)(null);
      }
    }
  }, [
    isRefreshing, retryCount, maxRetries, retryInterval, errorHandler, 
    context, globalConfig, interval, generateCacheKey, enableCache, memoryStats, safeSetState
  ]);

  // 安排下一次刷新
  const scheduleNextRefresh = useCallback(() => {
    timerManagerRef.current.clearAll();
    
    if (!enabled || !isMountedRef.current || interval <= 0) return;

    // 页面可见性检测
    if (enableVisibilityDetection && !isVisible) return;

    // 计算下次刷新时间
    const nextTime = new Date(Date.now() + interval);
    safeSetState(setNextRefreshTime)(nextTime);

    const timer = timerManagerRef.current.createTimer(() => {
      if (isMountedRef.current && enabled) {
        executeRefresh('auto').finally(() => {
          if (isMountedRef.current) {
            scheduleNextRefresh();
          }
        });
      }
    }, interval);

  }, [enabled, enableVisibilityDetection, isVisible, interval, executeRefresh, safeSetState]);

  // 手动刷新
  const refresh = useCallback(async (): Promise<void> => {
    timerManagerRef.current.clearAll();
    safeSetState(setNextRefreshTime)(null);
    await executeRefresh('manual');
    scheduleNextRefresh();
  }, [executeRefresh, scheduleNextRefresh, safeSetState]);

  // 重置错误状态
  const resetError = useCallback(() => {
    safeSetState(setError)(null);
    safeSetState(setRetryCount)(0);
    safeSetState(setNextRefreshTime)(null);
  }, [safeSetState]);

  // 强制重试
  const forceRetry = useCallback(async (): Promise<void> => {
    timerManagerRef.current.clearAll();
    safeSetState(setRetryCount)(0);
    safeSetState(setError)(null);
    safeSetState(setNextRefreshTime)(null);
    await executeRefresh('manual');
    scheduleNextRefresh();
  }, [executeRefresh, scheduleNextRefresh, safeSetState]);

  // 获取错误历史
  const getErrorHistory = useCallback((): RefreshError[] => {
    return errorHandler.getErrorHistory().filter(err => 
      err.context?.interval === interval
    );
  }, [errorHandler, interval]);

  // 清理资源
  const cleanup = useCallback(() => {
    timerManagerRef.current.clearAll();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    globalRequestCache.clear();
  }, []);

  // 主效应：启动和停止自动刷新
  useEffect(() => {
    if (!enabled) {
      timerManagerRef.current.clearAll();
      return;
    }

    if (immediate) {
      executeRefresh('initial').finally(() => {
        scheduleNextRefresh();
      });
    } else {
      scheduleNextRefresh();
    }

    return () => {
      timerManagerRef.current.clearAll();
    };
  }, [enabled, immediate, scheduleNextRefresh, executeRefresh, ...dependencies]);

  // 页面可见性变化处理
  useEffect(() => {
    if (!enableVisibilityDetection) return;

    if (isVisible && enabled && wasEverHidden) {
      // 页面重新可见且之前被隐藏过，立即刷新一次
      executeRefresh('manual').then(() => {
        scheduleNextRefresh();
      });
    } else if (isVisible && enabled) {
      // 页面可见，正常调度
      scheduleNextRefresh();
    } else {
      // 页面不可见，清除定时器
      timerManagerRef.current.clearAll();
    }
  }, [isVisible, enabled, wasEverHidden, enableVisibilityDetection, scheduleNextRefresh, executeRefresh]);

  // 组件卸载清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timerManagerRef.current.clearAll();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isRefreshing,
    refreshType,
    lastRefreshTime,
    refreshStartTime,
    error,
    retryCount,
    nextRefreshTime,
    stats,
    memoryStats,
    refresh,
    resetError,
    forceRetry,
    getErrorHistory,
    cleanup
  };
};

// 导出简化版本
export const useSimpleAutoRefreshOptimized = <T = any>(
  fetchFunction: () => Promise<T>,
  interval: number = 30000,
  dependencies: React.DependencyList = []
): boolean => {
  const { isRefreshing } = useAutoRefreshOptimized(fetchFunction, {
    interval,
    dependencies,
    enableVisibilityDetection: true,
    immediate: false,
    enabled: true
  });

  return isRefreshing;
};
