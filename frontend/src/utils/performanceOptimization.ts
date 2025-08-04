/**
 * Performance Optimization Utilities for Document Management System
 * Task 307-15: 性能优化和错误处理
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

// Request cache implementation with TTL (Time To Live)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl
      }))
    };
  }
}

// Global cache instance
export const apiCache = new APICache();

// Cleanup expired cache entries every 10 minutes
setInterval(() => apiCache.cleanup(), 10 * 60 * 1000);

// Performance monitoring utilities
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  startMeasure(operationName: string, metadata?: Record<string, any>): string {
    const id = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
      memoryUsage: {
        before: this.getMemoryUsage(),
        after: 0,
        delta: 0
      },
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    return id;
  }

  endMeasure(operationName: string): PerformanceMetrics | null {
    const metric = this.metrics
      .reverse()
      .find(m => m.operationName === operationName && !m.endTime);
    
    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    if (metric.memoryUsage) {
      metric.memoryUsage.after = this.getMemoryUsage();
      metric.memoryUsage.delta = metric.memoryUsage.after - metric.memoryUsage.before;
    }

    return metric;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  getMetrics(operationName?: string): PerformanceMetrics[] {
    if (operationName) {
      return this.metrics.filter(m => m.operationName === operationName);
    }
    return [...this.metrics];
  }

  getAverageTime(operationName: string): number {
    const ops = this.metrics.filter(m => 
      m.operationName === operationName && 
      m.duration !== undefined
    );
    
    if (ops.length === 0) return 0;
    
    const totalTime = ops.reduce((sum, op) => sum + (op.duration || 0), 0);
    return totalTime / ops.length;
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React performance optimization hooks
export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T => {
  return useMemo(() => {
    if (debugName) {
      performanceMonitor.startMeasure(`memo_${debugName}`);
    }
    
    const result = factory();
    
    if (debugName) {
      performanceMonitor.endMeasure(`memo_${debugName}`);
    }
    
    return result;
  }, deps);
};

export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T => {
  return useCallback((...args: Parameters<T>) => {
    if (debugName) {
      performanceMonitor.startMeasure(`callback_${debugName}`);
    }
    
    const result = callback(...args);
    
    if (debugName) {
      performanceMonitor.endMeasure(`callback_${debugName}`);
    }
    
    return result;
  }, deps) as T;
};

// Debounced and throttled utilities
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T => {
  const debouncedFn = useRef(debounce(callback, delay));
  
  useEffect(() => {
    debouncedFn.current = debounce(callback, delay);
  }, deps);
  
  useEffect(() => {
    return () => {
      debouncedFn.current.cancel();
    };
  }, []);

  return debouncedFn.current as T;
};

export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T => {
  const throttledFn = useRef(throttle(callback, delay));
  
  useEffect(() => {
    throttledFn.current = throttle(callback, delay);
  }, deps);
  
  useEffect(() => {
    return () => {
      throttledFn.current.cancel();
    };
  }, []);

  return throttledFn.current as T;
};

// Virtual scrolling helper for large lists
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  items: any[];
  overscan?: number;
}

export const useVirtualScroll = ({
  itemHeight,
  containerHeight,
  items,
  overscan = 5
}: VirtualScrollOptions) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + overscan, items.length);
  const visibleItems = items.slice(Math.max(0, startIndex - overscan), endIndex);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = Math.max(0, startIndex - overscan) * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
};

// Image lazy loading utility
export const useLazyImage = (src: string) => {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  useEffect(() => {
    let observer: IntersectionObserver;
    
    if (imageRef && src) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(imageRef);
            }
          });
        },
        { threshold: 0.1 }
      );
      
      observer.observe(imageRef);
    }
    
    return () => {
      if (observer && imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
  }, []);

  return {
    imageSrc,
    setImageRef,
    isLoaded,
    isError,
    handleLoad,
    handleError
  };
};

// Bundle splitting utilities
export const loadComponentDynamically = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
): React.LazyExoticComponent<T> => {
  return React.lazy(async () => {
    performanceMonitor.startMeasure(`dynamic_import_${componentName}`);
    
    try {
      const component = await importFn();
      performanceMonitor.endMeasure(`dynamic_import_${componentName}`);
      return component;
    } catch (error) {
      performanceMonitor.endMeasure(`dynamic_import_${componentName}`);
      throw error;
    }
  });
};

// Error boundary with performance tracking
export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  eventType?: string;
}

export class PerformanceTrackingErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<any> }>,
  { hasError: boolean; error?: Error }
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ComponentType<any> }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    performanceMonitor.startMeasure('error_boundary_catch', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    console.error('Performance tracking error boundary caught an error:', error, errorInfo);
    
    performanceMonitor.endMeasure('error_boundary_catch');
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Memory usage monitoring
export const useMemoryMonitor = (componentName: string) => {
  const mountTime = useRef(Date.now());
  
  useEffect(() => {
    performanceMonitor.startMeasure(`component_mount_${componentName}`);
    
    return () => {
      performanceMonitor.endMeasure(`component_mount_${componentName}`);
    };
  }, [componentName]);
  
  const getComponentAge = useCallback(() => {
    return Date.now() - mountTime.current;
  }, []);
  
  return { getComponentAge };
};

// File upload optimization utilities
export interface ChunkedUploadOptions {
  file: File;
  chunkSize: number;
  onProgress: (progress: number) => void;
  onChunkUploaded: (chunkIndex: number, totalChunks: number) => void;
  uploadChunk: (chunk: Blob, chunkIndex: number, totalChunks: number) => Promise<void>;
}

export const uploadFileInChunks = async ({
  file,
  chunkSize,
  onProgress,
  onChunkUploaded,
  uploadChunk
}: ChunkedUploadOptions): Promise<void> => {
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedBytes = 0;
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    performanceMonitor.startMeasure(`chunk_upload_${chunkIndex}`, {
      chunkIndex,
      totalChunks,
      chunkSize: chunk.size
    });
    
    try {
      await uploadChunk(chunk, chunkIndex, totalChunks);
      uploadedBytes += chunk.size;
      
      const progress = (uploadedBytes / file.size) * 100;
      onProgress(progress);
      onChunkUploaded(chunkIndex, totalChunks);
      
      performanceMonitor.endMeasure(`chunk_upload_${chunkIndex}`);
    } catch (error) {
      performanceMonitor.endMeasure(`chunk_upload_${chunkIndex}`);
      throw error;
    }
  }
};

// React.memo with performance tracking
export const memoWithPerformance = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> => {
  const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
    const componentName = displayName || Component.displayName || Component.name || 'Anonymous';
    performanceMonitor.startMeasure(`memo_comparison_${componentName}`);
    
    const result = propsAreEqual ? propsAreEqual(prevProps, nextProps) : Object.is(prevProps, nextProps);
    
    performanceMonitor.endMeasure(`memo_comparison_${componentName}`);
    return result;
  });
  
  if (displayName) {
    MemoizedComponent.displayName = displayName;
  }
  
  return MemoizedComponent;
};