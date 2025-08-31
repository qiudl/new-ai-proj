import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  maxMemoryMB?: number; // Maximum memory usage in MB
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  memorySize: number; // Estimated memory size in MB
  accessCount: number; // For LRU eviction
  lastAccessed: number; // For LRU eviction
}

class MemoryAwareCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private maxMemoryMB: number;
  private currentMemoryMB: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize = 50, maxMemoryMB = 20) { // Reduced from 200 items to 50
    this.maxSize = maxSize;
    this.maxMemoryMB = maxMemoryMB;
    this.startCleanupTimer();
  }

  private estimateMemoryUsage(data: Record<string, unknown>): number {
    try {
      // More accurate memory estimation
      const str = JSON.stringify(data);
      // Each character is ~2 bytes in UTF-16, plus object overhead
      const baseSize = (str.length * 2) / (1024 * 1024); // Convert to MB
      const objectOverhead = 0.001; // 1KB overhead per object
      return Math.max(baseSize + objectOverhead, 0.001); // Minimum 1KB
    } catch (error) {
      // Fallback for non-serializable objects
      return 0.01; // 10KB fallback
    }
  }

  private startCleanupTimer(): void {
    // Cleanup expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    const estimatedSize = this.estimateMemoryUsage(data as any);
    
    // Don't cache if single item is too large (>10MB)
    if (estimatedSize > 10) {
      console.warn(`Cache item too large (${estimatedSize.toFixed(2)}MB), skipping cache for key: ${key}`);
      return;
    }

    // Enforce memory limits before adding new item
    this.enforceMemoryLimits(estimatedSize);

    // Remove existing entry if it exists (for updates)
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.currentMemoryMB -= existingEntry.memorySize;
    }

    const entry: CacheEntry = {
      data: data as any,
      timestamp: Date.now(),
      ttl,
      memorySize: estimatedSize,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.currentMemoryMB += estimatedSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.currentMemoryMB -= entry.memorySize;
      this.cache.delete(key);
      return null;
    }

    // Update access tracking for LRU
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryMB -= entry.memorySize;
      this.cache.delete(key);
    }
  }

  private enforceMemoryLimits(newItemSize: number): void {
    // First, remove expired entries
    this.cleanup();

    // If still over limits, use LRU eviction
    while (
      (this.cache.size >= this.maxSize) || 
      (this.currentMemoryMB + newItemSize > this.maxMemoryMB)
    ) {
      const oldestEntry = this.findLRUEntry();
      if (oldestEntry) {
        this.currentMemoryMB -= oldestEntry.entry.memorySize;
        this.cache.delete(oldestEntry.key);
      } else {
        break; // Safety break
      }
    }
  }

  private findLRUEntry(): { key: string; entry: CacheEntry } | null {
    let oldestKey: string | null = null;
    let oldestEntry: CacheEntry | null = null;
    let oldestTime = Date.now();

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
        oldestEntry = entry;
      }
    });

    return oldestKey && oldestEntry ? { key: oldestKey, entry: oldestEntry } : null;
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    // Remove expired entries
    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.currentMemoryMB -= entry.memorySize;
        this.cache.delete(key);
      }
    });

    // Cleanup completed silently
  }

  clear(): void {
    this.cache.clear();
    this.currentMemoryMB = 0;
  }

  size(): number {
    return this.cache.size;
  }

  memoryUsage(): number {
    return this.currentMemoryMB;
  }

  // Get cache statistics for monitoring
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsageMB: this.currentMemoryMB,
      maxMemoryMB: this.maxMemoryMB,
      memoryUtilization: (this.currentMemoryMB / this.maxMemoryMB) * 100
    };
  }

  // Destroy the cache and stop cleanup timer
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

// Global cache instance with memory limits
const globalCache = new MemoryAwareCache(50, 20); // 50 items, 20MB max

// Cleanup cache on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalCache.destroy();
  });
}

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000, maxMemoryMB = 20 } = options;
  
  // Use ref to store fetcher to avoid dependency changes
  const fetcherRef = useRef(fetcher);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  
  fetcherRef.current = fetcher;
  
  const [data, setData] = useState<T | null>(() => {
    return globalCache.get<T>(key);
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  const fetchData = useCallback(async (forceRefresh = false): Promise<T | null> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = globalCache.get<T>(key);
      if (cachedData && isMountedRef.current) {
        setData(cachedData);
        setLoading(false);
        return cachedData;
      }
    }

    if (!isMountedRef.current) return null;

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcherRef.current();
      
      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) {
        return null;
      }
      
      // Cache the result with memory check
      try {
        globalCache.set<T>(key, result, ttl);
      } catch (cacheError) {
        console.warn('Failed to cache result:', cacheError);
        // Continue without caching
      }
      
      setData(result);
      return result;
    } catch (err: unknown) {
      if (!isMountedRef.current || (err as any).name === 'AbortError') {
        return null;
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [key, ttl]);

  const invalidate = useCallback(() => {
    globalCache.delete(key);
    if (isMountedRef.current) {
      setData(null);
    }
  }, [key]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Enhanced mutate function with memory check
  const mutate = useCallback((newData: T | null) => {
    if (!isMountedRef.current) return;
    
    setData(newData);
    
    if (newData !== null) {
      try {
        globalCache.set<T>(key, newData, ttl);
      } catch (error) {
        console.warn('Failed to cache mutated data:', error);
      }
    } else {
      globalCache.delete(key);
    }
  }, [key, ttl]);

  // Initialize data loading
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      
      // Check cache first
      const cachedData = globalCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
      } else {
        // Load data if not in cache
        fetchData().catch(console.error);
      }
    }
  }, [initialized, key, fetchData]);

  // Set initial loading state
  useEffect(() => {
    const cachedData = globalCache.get<T>(key);
    setLoading(!cachedData && !initialized);
  }, [key, initialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing request
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
    // Additional utility functions
    cacheStats: globalCache.getStats(),
    clearCache: () => globalCache.clear()
  };
}

// Export cache instance for manual management if needed
export { globalCache };