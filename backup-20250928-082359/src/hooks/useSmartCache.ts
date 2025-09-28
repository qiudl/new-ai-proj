/**
 * 智能缓存Hook
 * 提供自动键管理、依赖追踪和智能失效的高级缓存功能
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { enhancedCacheManager } from '../utils/enhancedCacheManager';
import { cacheEventSystem, CacheEvent } from '../utils/cacheEventSystem';
import { CacheKeyBuilder } from '../utils/cacheKeyBuilder';

export interface UseSmartCacheOptions<T> {
  /** 缓存键构建函数 */
  keyBuilder: (params: any) => string;
  /** 数据获取函数 */
  fetcher: (params: any) => Promise<T>;
  /** 依赖项配置 */
  dependencies?: {
    entityType: 'task' | 'user' | 'project';
    entityId: number;
    projectId?: number;
  };
  /** 智能失效配置 */
  smartInvalidation?: {
    trigger: ('create' | 'update' | 'delete')[];
    cascade: boolean;
  };
  /** 缓存策略 */
  strategy?: {
    ttl?: number;
    maxMemory?: number;
    priority?: 'low' | 'normal' | 'high';
    tags?: string[];
  };
  /** 事件回调 */
  onCacheEvent?: (event: CacheEvent) => void;
  /** 错误处理 */
  onError?: (error: Error, context: string) => void;
  /** 预加载配置 */
  prefetch?: {
    enabled: boolean;
    delay?: number;
    relatedKeys?: (params: any) => string[];
  };
}

export interface UseSmartCacheReturn<T> {
  /** 缓存数据 */
  data: T | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 刷新数据 */
  refresh: () => Promise<T | null>;
  /** 失效缓存 */
  invalidate: () => Promise<void>;
  /** 更新数据 */
  mutate: (newData: T | null) => Promise<void>;
  /** 缓存统计 */
  stats: ReturnType<typeof enhancedCacheManager.getStats>;
  /** 预加载相关数据 */
  prefetch: (relatedParams?: any[]) => Promise<void>;
  /** 智能失效相关缓存 */
  smartInvalidate: (changeType?: 'create' | 'update' | 'delete') => Promise<void>;
}

/**
 * 智能缓存Hook
 * 自动处理键管理、依赖追踪和智能失效
 */
export function useSmartCache<T>(
  params: any,
  options: UseSmartCacheOptions<T>
): UseSmartCacheReturn<T> {
  const {
    keyBuilder,
    fetcher,
    dependencies,
    smartInvalidation,
    strategy = {},
    onCacheEvent,
    onError,
    prefetch: prefetchConfig
  } = options;

  const {
    ttl = 5 * 60 * 1000,
    priority = 'normal',
    tags = []
  } = strategy;

  // 状态管理
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 引用管理
  const fetcherRef = useRef(fetcher);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  fetcherRef.current = fetcher;

  // 生成缓存键
  const cacheKey = useMemo(() => {
    try {
      return keyBuilder(params);
    } catch (error) {
      console.error('Error building cache key:', error);
      return `fallback:${JSON.stringify(params)}`;
    }
  }, [keyBuilder, params]);

  // 自动注册依赖关系
  useEffect(() => {
    if (dependencies) {
      const { entityType, entityId, projectId } = dependencies;
      
      if (entityType === 'task' && projectId) {
        enhancedCacheManager.registerTaskDependencies(projectId, entityId);
      } else if (entityType === 'user' && projectId) {
        enhancedCacheManager.registerUserDependencies(entityId, projectId);
      }
    }
  }, [dependencies]);

  // 错误处理函数
  const handleError = useCallback((err: Error, context: string) => {
    console.error(`SmartCache Error in ${context}:`, err);
    onError?.(err, context);
  }, [onError]);

  // 核心数据获取函数
  const fetchData = useCallback(async (forceRefresh = false): Promise<T | null> => {
    const startTime = Date.now();

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // 检查缓存
    if (!forceRefresh) {
      try {
        const cachedData = await enhancedCacheManager.get<T>(cacheKey);
        const duration = Date.now() - startTime;
        const cacheHit = cachedData !== null;

        // 发出缓存事件
        cacheEventSystem.emitGet(cacheKey, cacheHit, duration, undefined, 'useSmartCache');
        
        if (onCacheEvent) {
          onCacheEvent({
            type: cacheHit ? 'hit' : 'miss',
            key: cacheKey,
            timestamp: Date.now(),
            duration,
            source: 'useSmartCache'
          });
        }

        if (cachedData && isMountedRef.current) {
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError);
      }
    }

    if (!isMountedRef.current) return null;

    try {
      setLoading(true);
      setError(null);

      const result = await fetcherRef.current(params);

      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) {
        return null;
      }

      // 缓存结果
      await enhancedCacheManager.set(cacheKey, result, {
        ttl,
        tags: [...tags, ...(dependencies ? [`${dependencies.entityType}:${dependencies.entityId}`] : [])],
        priority,
        registerDependencies: Boolean(dependencies)
      });

      // 发出缓存设置事件
      cacheEventSystem.emitSet(
        cacheKey,
        JSON.stringify(result).length,
        ttl,
        undefined,
        tags,
        'useSmartCache'
      );

      setData(result);
      return result;
    } catch (err) {
      if (!isMountedRef.current || (err as any).name === 'AbortError') {
        return null;
      }

      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      handleError(errorObj, 'fetchData');
      throw errorObj;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [params, cacheKey, ttl, tags, priority, dependencies, onCacheEvent, handleError]);

  // 刷新数据
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // 失效缓存
  const invalidate = useCallback(async () => {
    await enhancedCacheManager.delete(cacheKey);
    
    if (isMountedRef.current) {
      setData(null);
    }
  }, [cacheKey]);

  // 更新数据
  const mutate = useCallback(async (newData: T | null) => {
    if (!isMountedRef.current) return;

    setData(newData);

    if (newData !== null) {
      await enhancedCacheManager.set(cacheKey, newData, {
        ttl,
        tags,
        priority,
        registerDependencies: Boolean(dependencies)
      });
    } else {
      await enhancedCacheManager.delete(cacheKey);
    }
  }, [cacheKey, ttl, tags, priority, dependencies]);

  // 智能失效
  const smartInvalidate = useCallback(async (changeType: 'create' | 'update' | 'delete' = 'update') => {
    if (!dependencies) {
      await invalidate();
      return;
    }

    const { entityType, entityId, projectId } = dependencies;
    
    if (entityType === 'task' && projectId) {
      await enhancedCacheManager.invalidateTask(projectId, entityId, changeType);
    } else if (entityType === 'user') {
      await enhancedCacheManager.invalidateUserData(entityId, 'task');
    } else {
      await invalidate();
    }
  }, [dependencies, invalidate]);

  // 预加载功能
  const prefetch = useCallback(async (relatedParams?: any[]) => {
    if (!prefetchConfig?.enabled) return;

    const delay = prefetchConfig.delay || 0;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      let keysToFetch: string[] = [];

      if (relatedParams) {
        keysToFetch = relatedParams.map(rp => keyBuilder(rp));
      } else if (prefetchConfig.relatedKeys) {
        keysToFetch = prefetchConfig.relatedKeys(params);
      }

      // 并行预加载
      await Promise.allSettled(
        keysToFetch.map(async (key) => {
          const exists = await enhancedCacheManager.has(key);
          if (!exists) {
            // 这里可以实现预加载逻辑
            // 目前只是标记需要预加载
            console.log(`Prefetch candidate: ${key}`);
          }
        })
      );
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }, [prefetchConfig, keyBuilder, params]);

  // 初始化数据加载
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      fetchData().catch(error => {
        handleError(error, 'initialization');
      });
    }
  }, [initialized, fetchData, handleError]);

  // 参数变化时重新加载
  useEffect(() => {
    if (initialized) {
      fetchData().catch(error => {
        handleError(error, 'params change');
      });
    }
  }, [cacheKey, initialized, fetchData, handleError]);

  // 预加载触发
  useEffect(() => {
    if (prefetchConfig?.enabled && data) {
      const timer = setTimeout(() => {
        prefetch().catch(error => {
          console.warn('Auto prefetch failed:', error);
        });
      }, prefetchConfig.delay || 100);

      return () => clearTimeout(timer);
    }
  }, [data, prefetch, prefetchConfig]);

  // 清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    mutate,
    stats: enhancedCacheManager.getStats(),
    prefetch,
    smartInvalidate
  };
}

// 预加载功能的独立Hook
export function useSmartCachePrefetch() {
  return {
    prefetch: useCallback(async <T>(
      params: any,
      options: Pick<UseSmartCacheOptions<T>, 'keyBuilder' | 'fetcher'>
    ) => {
      const key = options.keyBuilder(params);
      const exists = await enhancedCacheManager.has(key);
      
      if (!exists) {
        try {
          const data = await options.fetcher(params);
          await enhancedCacheManager.set(key, data, {
            ttl: 5 * 60 * 1000,
            priority: 'low',
            tags: ['prefetch']
          });
          
          cacheEventSystem.emitSet(
            key,
            JSON.stringify(data).length,
            5 * 60 * 1000,
            undefined,
            ['prefetch'],
            'prefetch'
          );
        } catch (error) {
          console.warn(`Prefetch failed for key ${key}:`, error);
        }
      }
    }, [])
  };
}

export default useSmartCache;