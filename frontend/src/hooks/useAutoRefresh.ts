import { useEffect, useRef, useCallback, useState } from 'react';
import { RefreshErrorAnalyzer, RefreshErrorHandler, globalRefreshErrorHandler, RefreshError } from '../utils/RefreshErrorHandler.tsx';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';

// 页面可见性检测Hook
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
};

// 自动刷新Hook的选项接口
export interface AutoRefreshOptions {
  /** 刷新间隔（毫秒），默认30秒。如果设置为0则禁用自动刷新 */
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
  /** 刷新上下文信息，用于错误分析 */
  context?: Record<string, any>;
  /** 是否使用全局配置，默认true */
  useGlobalConfig?: boolean;
}

export interface AutoRefreshState {
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
  };
  /** 手动触发刷新 */
  refresh: () => Promise<void>;
  /** 重置错误状态 */
  resetError: () => void;
  /** 强制重试（忽略重试限制） */
  forceRetry: () => Promise<void>;
  /** 获取错误历史 */
  getErrorHistory: () => RefreshError[];
}

/**
 * 增强的自动刷新Hook
 * 支持配置管理、错误处理、重试机制、性能监控等功能
 * 
 * @param fetchFunction 要执行的刷新函数
 * @param options 配置选项
 * @returns 刷新状态和控制函数
 */
export const useAutoRefresh = <T = any>(
  fetchFunction: () => Promise<T>,
  options: AutoRefreshOptions = {}
): AutoRefreshState => {
  // 尝试获取全局配置（如果在Provider内部）
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
    useGlobalConfig = true
  } = options;

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
    averageResponseTime: 0
  });
  
  const responseTimes = useRef<number[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const fetchFunctionRef = useRef(fetchFunction);

  // 页面可见性状态
  const isPageVisible = usePageVisibility();

  // 更新fetchFunction引用
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  // 清理定时器的函数
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // 执行刷新
  const executeRefresh = useCallback(async (type: 'initial' | 'auto' | 'manual' = 'auto'): Promise<void> => {
    if (!isMountedRef.current || isRefreshing) return;

    const startTime = Date.now();
    
    try {
      setIsRefreshing(true);
      setRefreshType(type);
      setRefreshStartTime(new Date());
      setError(null);
      
      const result = await fetchFunctionRef.current();
      
      if (isMountedRef.current) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 更新统计信息
        responseTimes.current.push(responseTime);
        if (responseTimes.current.length > 50) {
          responseTimes.current = responseTimes.current.slice(-50); // 保留最近50次
        }
        
        const avgResponseTime = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;
        
        setStats(prev => ({
          totalRefreshes: prev.totalRefreshes + 1,
          successfulRefreshes: prev.successfulRefreshes + 1,
          failedRefreshes: prev.failedRefreshes,
          averageResponseTime: Math.round(avgResponseTime)
        }));
        
        setLastRefreshTime(new Date());
        setRetryCount(0); // 成功后重置重试次数
        
        // 记录成功日志（如果启用调试）
        if (globalConfig?.enableDebugLogs) {
          console.log(`✅ Refresh succeeded (${type}): ${responseTime}ms`);
        }
      }
      
      return result;
    } catch (err) {
      if (isMountedRef.current) {
        // 使用错误分析器分析错误
        const refreshError = RefreshErrorAnalyzer.analyze(err, {
          ...context,
          type,
          retryCount: retryCount + 1,
          maxRetries,
          interval
        });
        
        refreshError.retryCount = retryCount + 1;
        refreshError.maxRetries = maxRetries;
        
        // 更新统计信息
        setStats(prev => ({
          totalRefreshes: prev.totalRefreshes + 1,
          successfulRefreshes: prev.successfulRefreshes,
          failedRefreshes: prev.failedRefreshes + 1,
          averageResponseTime: prev.averageResponseTime
        }));
        
        setError(refreshError);
        
        // 处理错误
        errorHandler.handleError(refreshError);
        
        // 如果还有重试机会且应该自动重试
        if (errorHandler.shouldAutoRetry(refreshError)) {
          setRetryCount(prev => prev + 1);
          retryTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              executeRefresh(type);
            }
          }, retryInterval);
        }
        
        throw refreshError;
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
        setRefreshType(null);
        setRefreshStartTime(null);
      }
    }
  }, [isRefreshing, retryCount, maxRetries, retryInterval, errorHandler, context, globalConfig, interval]);

  // 安排下一次刷新
  const scheduleNextRefresh = useCallback(() => {
    clearTimers();
    
    if (!enabled || !isMountedRef.current || interval <= 0) return;

    // 如果启用了页面可见性检测且页面不可见，则不安排刷新
    if (enableVisibilityDetection && !isPageVisible) return;

    // 计算下次刷新时间
    const nextTime = new Date(Date.now() + interval);
    setNextRefreshTime(nextTime);

    timerRef.current = setTimeout(() => {
      if (isMountedRef.current && enabled) {
        executeRefresh('auto').finally(() => {
          // 递归安排下一次刷新
          if (isMountedRef.current) {
            scheduleNextRefresh();
          }
        });
      }
    }, interval);
  }, [enabled, enableVisibilityDetection, isPageVisible, interval, executeRefresh, clearTimers]);

  // 手动刷新
  const refresh = useCallback(async (): Promise<void> => {
    clearTimers();
    setNextRefreshTime(null); // 清除下次刷新时间
    await executeRefresh('manual');
    // 手动刷新后重新安排定时刷新
    scheduleNextRefresh();
  }, [executeRefresh, scheduleNextRefresh, clearTimers]);

  // 重置错误状态
  const resetError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setNextRefreshTime(null);
  }, []);

  // 强制重试（忽略重试限制）
  const forceRetry = useCallback(async (): Promise<void> => {
    clearTimers();
    setRetryCount(0);
    setError(null);
    setNextRefreshTime(null);
    await executeRefresh('manual');
    scheduleNextRefresh();
  }, [executeRefresh, scheduleNextRefresh, clearTimers]);

  // 获取错误历史
  const getErrorHistory = useCallback((): RefreshError[] => {
    return errorHandler.getErrorHistory().filter(err => 
      err.context?.interval === interval
    );
  }, [errorHandler, interval]);

  // 主效应：启动和停止自动刷新
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // 如果设置了immediate，立即执行一次
    if (immediate) {
      executeRefresh('initial').finally(() => {
        scheduleNextRefresh();
      });
    } else {
      scheduleNextRefresh();
    }

    return clearTimers;
  }, [enabled, immediate, scheduleNextRefresh, clearTimers, executeRefresh, ...dependencies]);

  // 页面可见性变化时的处理
  useEffect(() => {
    if (!enableVisibilityDetection) return;

    if (isPageVisible && enabled) {
      // 页面变为可见时，重新开始刷新
      scheduleNextRefresh();
    } else {
      // 页面变为不可见时，清除定时器
      clearTimers();
    }
  }, [isPageVisible, enabled, enableVisibilityDetection, scheduleNextRefresh, clearTimers]);

  // 组件卸载时清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isRefreshing,
    refreshType,
    lastRefreshTime,
    refreshStartTime,
    error,
    retryCount,
    nextRefreshTime,
    stats,
    refresh,
    resetError,
    forceRetry,
    getErrorHistory
  };
};

// 导出一个简化版本的Hook，只返回刷新状态
export const useSimpleAutoRefresh = <T = any>(
  fetchFunction: () => Promise<T>,
  interval: number = 30000,
  dependencies: React.DependencyList = []
): boolean => {
  const { isRefreshing } = useAutoRefresh(fetchFunction, {
    interval,
    dependencies,
    enableVisibilityDetection: true,
    immediate: false,
    enabled: true
  });

  return isRefreshing;
};
