// Memory Management Utilities for Timer Components

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class MemoryManager {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static isMonitoring = false;
  private static readonly MEMORY_WARNING_THRESHOLD = 200; // 200MB (increased from 100MB)
  private static readonly MEMORY_CRITICAL_THRESHOLD = 400; // 400MB (increased from 200MB)
  private static readonly CHECK_INTERVAL = 60000; // 60 seconds (reduced frequency)

  // Start memory monitoring (with environment check)
  static startMonitoring(): void {
    // Skip memory monitoring in development for better developer experience
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    if (this.isMonitoring || this.checkInterval) {
      return;
    }

    this.isMonitoring = true;
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.CHECK_INTERVAL);

    // Initial check
    this.checkMemoryUsage();
  }

  // Stop memory monitoring
  static stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    }

  // Check current memory usage
  private static checkMemoryUsage(): void {
    if (!this.isMonitoring) {
      this.stopMonitoring();
      return;
    }

    try {
      const memoryInfo = this.getMemoryInfo();
      if (!memoryInfo) {
        return;
      }

      const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
      const usagePercentage = (usedMB / limitMB) * 100;
      
      // Use percentage-based thresholds for better accuracy
      if (usagePercentage > 80) { // Critical: >80% of heap limit
        console.error(`❌ Critical memory usage: ${usedMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}% of ${limitMB.toFixed(0)}MB limit)`);
        this.performEmergencyCleanup();
      } else if (usagePercentage > 60) { // Warning: >60% of heap limit
        console.warn(`⚠️ High memory usage: ${usedMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}% of ${limitMB.toFixed(0)}MB limit)`);
        this.performGentleCleanup();
      } else if (usedMB > this.MEMORY_WARNING_THRESHOLD) {
        // Legacy absolute threshold check (only log, don't cleanup)
        console.info(`ℹ️ Memory usage: ${usedMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}% of ${limitMB.toFixed(0)}MB limit) - Normal for complex React app`);
      }
    } catch (error) {
      console.warn('Memory check failed:', error);
    }
  }

  // Get memory information
  static getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      return (performance as unknown).memory as MemoryInfo;
    }
    return null;
  }

  // Get formatted memory usage
  static getMemoryUsageString(): string {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) {
      return 'Memory info not available';
    }

    const used = (memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2);
    const total = (memoryInfo.totalJSHeapSize / (1024 * 1024)).toFixed(2);
    const limit = (memoryInfo.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);

    return `Used: ${used}MB / Total: ${total}MB / Limit: ${limit}MB`;
  }

  // Perform gentle cleanup
  private static performGentleCleanup(): void {
    try {
      // Clear old localStorage entries
      this.cleanupOldStorage();
      
      // Clear expired session data
      this.clearExpiredSessionData();
      
      } catch (error) {
      console.error('Gentle cleanup failed:', error);
    }
  }

  // Perform emergency cleanup
  private static performEmergencyCleanup(): void {
    try {
      // All gentle cleanup actions
      this.performGentleCleanup();
      
      // More aggressive cleanup
      this.clearAllTimerStorage();
      
      // Force garbage collection if available
      this.forceGarbageCollection();
      
      } catch (error) {
      console.error('Emergency cleanup failed:', error);
    }
  }

  // Clean up old localStorage entries
  private static cleanupOldStorage(): void {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('timer_temp_') || key.includes('_cache_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const age = now - (data.timestamp || 0);
            
            // Remove entries older than 1 hour
            if (age > 3600000) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Remove corrupted entries
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup old storage:', error);
    }
  }

  // Clear expired session data
  private static clearExpiredSessionData(): void {
    try {
      const sessionKeys = Object.keys(sessionStorage);
      const now = Date.now();
      
      sessionKeys.forEach(key => {
        if (key.startsWith('timer_')) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key) || '{}');
            const age = now - (data.timestamp || 0);
            
            // Remove session data older than 30 minutes
            if (age > 1800000) {
              sessionStorage.removeItem(key);
            }
          } catch (e) {
            sessionStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clear expired session data:', error);
    }
  }

  // Clear all timer-related storage
  private static clearAllTimerStorage(): void {
    try {
      // localStorage cleanup
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.includes('timer') || key.includes('Timer') || key.includes('notification')) {
          localStorage.removeItem(key);
        }
      });

      // sessionStorage cleanup
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('timer') || key.includes('Timer')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear timer storage:', error);
    }
  }

  // Force garbage collection if available
  private static forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as unknown).gc === 'function') {
      try {
        (window as unknown).gc();
        } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    }
  }

  // Manual cleanup trigger
  static performManualCleanup(): void {
    this.performEmergencyCleanup();
  }

  // Check if memory usage is critical
  static isMemoryUsageCritical(): boolean {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) {
      return false;
    }

    const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
    return usedMB > this.MEMORY_CRITICAL_THRESHOLD;
  }

  // Get memory usage percentage
  static getMemoryUsagePercentage(): number {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) {
      return 0;
    }

    return (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
  }
}

export default MemoryManager;
export type { MemoryInfo };
