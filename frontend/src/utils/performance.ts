import React from 'react';

// 防抖函数
export function debounce<T extends (...args: unknown[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: unknown[]) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  }) as T;
}

// 节流函数
export function throttle<T extends (...args: unknown[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean = false;
  
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

// 延迟加载 (React import needed separately)
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc);
}

// 批量处理函数
export function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize = 10,
  delay = 0
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let currentIndex = 0;
    
    const processBatch = () => {
      const endIndex = Math.min(currentIndex + batchSize, items.length);
      
      for (let i = currentIndex; i < endIndex; i++) {
        results.push(processor(items[i]));
      }
      
      currentIndex = endIndex;
      
      if (currentIndex < items.length) {
        setTimeout(processBatch, delay);
      } else {
        resolve(results);
      }
    };
    
    processBatch();
  });
}

// 性能监控
export class PerformanceMonitor {
  private static marks = new Map<string, number>();
  
  static mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  static measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Debug log removed: Performance measure
    return duration;
  }
  
  static clear(): void {
    this.marks.clear();
  }
}

// 内存优化 - 弱引用映射
export class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>();
  
  set(key: K, value: V): void {
    this.cache.set(key, value);
  }
  
  get(key: K): V | undefined {
    return this.cache.get(key);
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
}