// Utility functions for memory optimization and performance

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: unknown[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function to limit function calls to once per interval
 */
export function throttle<T extends (...args: unknown[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastExecution = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecution >= delay) {
      lastExecution = now;
      func(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastExecution = Date.now();
        timeoutId = null;
        func(...args);
      }, delay - (now - lastExecution));
    }
  };
}

/**
 * Memory-safe array chunking for large datasets
 */
export function chunkArray<T>(array: T[], size: number = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Estimate memory usage of an object in bytes
 */
export function estimateObjectSize(obj: unknown): number {
  try {
    const str = JSON.stringify(obj);
    return str.length * 2; // Each character is ~2 bytes in UTF-16
  } catch (error) {
    return 1024; // 1KB fallback for non-serializable objects
  }
}

/**
 * Clean up localStorage of expired entries
 */
export function cleanupLocalStorage(maxAgeDays: number = 7): number {
  let removedCount = 0;
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;
      
      // Try to parse as JSON to check for timestamp
      const parsed = JSON.parse(value);
      if (parsed.timestamp && typeof parsed.timestamp === 'number') {
        if (now - parsed.timestamp > maxAge) {
          keysToRemove.push(key);
        }
      }
    } catch (error) {
      // If parsing fails, check if key looks like it could be a cache key
      if (key.includes('cache_') || key.includes('timer_') || key.includes('temp_')) {
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    removedCount++;
  });
  
  return removedCount;
}

/**
 * Memory-optimized object deep clone (limited depth)
 */
export function shallowClone<T>(obj: T, maxDepth: number = 3): T {
  if (maxDepth <= 0 || obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => shallowClone(item, maxDepth - 1)) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = shallowClone(obj[key], maxDepth - 1);
    }
  }
  
  return cloned;
}

/**
 * Create a memory-safe ref cleanup function
 */
export function createCleanupRef<T>(initialValue: T | null = null) {
  const ref = { current: initialValue };
  
  return {
    ref,
    cleanup: () => {
      ref.current = null;
    }
  };
}

/**
 * Memory monitoring utilities
 */
export const MemoryUtils = {
  /**
   * Get current memory usage if available
   */
  getCurrentMemoryUsage(): { used: number; total: number; limit: number } | null {
    if ('memory' in performance) {
      const memory = (performance as unknown).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  },

  /**
   * Check if memory usage is high
   */
  isMemoryUsageHigh(thresholdMB: number = 100): boolean {
    const usage = this.getCurrentMemoryUsage();
    if (!usage) return false;
    
    const usedMB = usage.used / (1024 * 1024);
    return usedMB > thresholdMB;
  },

  /**
   * Force garbage collection if available (Chrome with --js-flags="--expose-gc")
   */
  forceGarbageCollection(): void {
    if ('gc' in window) {
      (window as unknown).gc();
    }
  }
};

/**
 * Hook for automatic cleanup of refs and timers
 */
export function useMemoryCleanup() {
  const cleanupRefs = new Set<() => void>();
  
  const addCleanup = (cleanupFn: () => void) => {
    cleanupRefs.add(cleanupFn);
  };
  
  const cleanup = () => {
    cleanupRefs.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    cleanupRefs.clear();
  };
  
  return { addCleanup, cleanup };
}