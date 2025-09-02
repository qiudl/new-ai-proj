import { useMemo, useCallback, useRef, useEffect } from 'react';

// React import for lazy loading
import React from 'react';

// Add useState import
import { useState } from 'react';

/**
 * 性能优化工具集
 * 提供各种性能监控和优化的工具函数和Hooks
 */

// 性能监控器
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private activeTimers: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const duration = end - start;
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      this.metrics.get(label)!.push(duration);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      }
    };
  }

  startMeasure(label: string, context?: any): void {
    this.activeTimers.set(label, performance.now());
    if (process.env.NODE_ENV === 'development' && context) {
      console.log(`🚀 Starting ${label}:`, context);
    }
  }

  endMeasure(label: string): void {
    const start = this.activeTimers.get(label);
    if (start === undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ No start time found for ${label}`);
      }
      return;
    }

    const end = performance.now();
    const duration = end - start;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    this.activeTimers.delete(label);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.metrics.get(label);
    if (!measurements || measurements.length === 0) return null;

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * 优化的 useMemo，添加性能监控
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  label?: string
): T {
  return useMemo(() => {
    const stopTimer = label ? performanceMonitor.startTimer(`memo:${label}`) : undefined;
    const result = factory();
    stopTimer?.();
    return result;
  }, deps);
}

/**
 * 优化的 useCallback，添加性能监控
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  label?: string
): T {
  return useCallback((...args: any[]) => {
    const stopTimer = label ? performanceMonitor.startTimer(`callback:${label}`) : undefined;
    const result = callback(...args);
    stopTimer?.();
    return result;
  }, deps) as T;
}

/**
 * 内存使用监控Hook
 */
export function useMemoryMonitor(label: string) {
  const memoryRef = useRef<number>(0);

  useEffect(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryRef.current = memory.usedJSHeapSize;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧠 Memory [${label}]: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  });

  return memoryRef.current;
}

/**
 * 防抖 useCallback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, deps);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback as T;
}

/**
 * 组件渲染次数监控
 */
export function useRenderMonitor(componentName: string) {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} rendered: ${renderCount.current} times`);
    }
  });

  return renderCount.current;
}

/**
 * 性能分析装饰器（用于类方法）
 */
export function measurePerformance(label: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const stopTimer = performanceMonitor.startTimer(`method:${label}`);
      const result = originalMethod.apply(this, args);
      stopTimer();
      return result;
    };

    return descriptor;
  };
}

/**
 * 异步操作性能监控
 */
export async function measureAsync<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  const stopTimer = performanceMonitor.startTimer(`async:${label}`);
  try {
    const result = await operation();
    stopTimer();
    return result;
  } catch (error) {
    stopTimer();
    throw error;
  }
}

/**
 * 延迟加载工具
 */
export function createLazyLoader<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): React.LazyExoticComponent<T> {
  const LazyComponent = React.lazy(async () => {
    const stopTimer = performanceMonitor.startTimer('lazy-load');
    try {
      const result = await loader();
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();
      throw error;
    }
  });

  return LazyComponent;
}

/**
 * 批处理状态更新
 */
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const updateScheduled = useRef(false);

  const batchUpdate = useCallback((updateFn: () => void) => {
    pendingUpdates.current.push(updateFn);

    if (!updateScheduled.current) {
      updateScheduled.current = true;
      Promise.resolve().then(() => {
        const updates = pendingUpdates.current.splice(0);
        updateScheduled.current = false;
        
        updates.forEach(update => update());
      });
    }
  }, []);

  return batchUpdate;
}

/**
 * 虚拟滚动优化Hook
 */
export function useVirtualScroll(
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    itemCount
  );

  const offsetY = visibleStart * itemHeight;

  return {
    visibleStart,
    visibleEnd,
    offsetY,
    setScrollTop
  };
}

// Simple cache implementation for API responses
class APICache {
  private cache = new Map<string, { data: any; expiry: number }>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        size: JSON.stringify(value.data).length,
        expiry: value.expiry
      }))
    };
  }
}

export const apiCache = new APICache();

// Chunked upload interface and options
export interface ChunkedUploadOptions {
  chunkSize?: number;
  maxRetries?: number;
  onProgress?: (progress: number) => void;
  onChunkComplete?: (chunk: number, total: number) => void;
}

// Simple chunked upload implementation
export async function uploadFileInChunks(
  file: File,
  uploadUrl: string,
  options: ChunkedUploadOptions = {}
): Promise<any> {
  const { chunkSize = 1024 * 1024, maxRetries = 3, onProgress, onChunkComplete } = options;
  
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedBytes = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    let retries = 0;
    while (retries < maxRetries) {
      try {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileName', file.name);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Chunk ${i} upload failed`);
        }

        uploadedBytes += chunk.size;
        onProgress?.(uploadedBytes / file.size);
        onChunkComplete?.(i + 1, totalChunks);
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  return { success: true, message: 'File uploaded successfully' };
}