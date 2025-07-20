import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void { // Default 5 minutes
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new SimpleCache(200);

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000 } = options;
  
  // 使用 ref 来存储 fetcher，避免依赖变化
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  
  const [data, setData] = useState<T | null>(() => {
    return globalCache.get<T>(key);
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cachedData = globalCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return cachedData;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcherRef.current();
      
      // Cache the result
      globalCache.set<T>(key, result, ttl);
      setData(result);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, ttl]); // 移除 fetcher 依赖

  const invalidate = useCallback(() => {
    globalCache.delete(key);
    setData(null);
  }, [key]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // 初始化数据加载
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      
      // 检查缓存
      const cachedData = globalCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
      } else {
        // 只有在没有缓存数据时才加载
        fetchData().catch(console.error);
      }
    }
  }, [initialized, key]); // 移除 fetchData 依赖避免循环

  // 设置初始加载状态
  useEffect(() => {
    const cachedData = globalCache.get<T>(key);
    setLoading(!cachedData && !initialized);
  }, [key, initialized]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    mutate: setData,
  };
}
