// 性能监控配置 - 优化内存使用
export const PERFORMANCE_CONFIG = {
  // 开发环境配置（减少内存占用）
  development: {
    enablePerformanceMonitoring: false, // 开发环境禁用性能监控
    enableApiInterceptors: false,       // 禁用API拦截器
    enableWebVitals: false,             // 禁用Web Vitals监控
    enableComponentTracking: false,     // 禁用组件性能追踪
    enableUserActionTracking: false,    // 禁用用户行为追踪
    maxMetrics: 10,                     // 最多保存10条指标
    onlyTrackErrors: true,              // 只追踪错误
    memoryCheckInterval: 30000,         // 30秒检查一次内存
    autoCleanup: true,                  // 自动清理内存
  },
  
  // 生产环境配置（正常监控）
  production: {
    enablePerformanceMonitoring: true,
    enableApiInterceptors: true,
    enableWebVitals: true,
    enableComponentTracking: false,     // 生产环境也禁用组件追踪
    enableUserActionTracking: false,    // 生产环境也禁用用户行为追踪
    maxMetrics: 100,                    // 生产环境保存更多指标
    onlyTrackErrors: false,
    memoryCheckInterval: 60000,         // 60秒检查一次内存
    autoCleanup: true,
  },
  
  // 测试环境配置
  test: {
    enablePerformanceMonitoring: false,
    enableApiInterceptors: false,
    enableWebVitals: false,
    enableComponentTracking: false,
    enableUserActionTracking: false,
    maxMetrics: 5,
    onlyTrackErrors: true,
    memoryCheckInterval: 0,
    autoCleanup: true,
  }
};

// 获取当前环境配置
export const getCurrentPerformanceConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return PERFORMANCE_CONFIG[env as keyof typeof PERFORMANCE_CONFIG] || PERFORMANCE_CONFIG.development;
};

// 内存使用检查
export const checkMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    const percentage = Math.round((used / total) * 100);
    
    console.log(`内存使用: ${used}MB / ${total}MB (${percentage}%)`);
    
    // 如果内存使用超过75%，触发清理
    if (percentage > 75) {
      console.warn('内存使用过高，触发自动清理');
      triggerMemoryCleanup();
      return { warning: true, used, total, percentage };
    }
    
    return { warning: false, used, total, percentage };
  }
  
  return null;
};

// 触发内存清理
export const triggerMemoryCleanup = () => {
  // 清理性能监控数据
  if (window.performanceMonitor) {
    window.performanceMonitor.cleanup();
  }
  
  // 清理过期的localStorage数据
  cleanupExpiredStorage();
  
  // 请求浏览器进行垃圾回收（仅开发环境）
  if (process.env.NODE_ENV === 'development' && 'gc' in window) {
    (window as any).gc();
  }
  
  console.log('内存清理完成');
};

// 清理过期的本地存储
const cleanupExpiredStorage = () => {
  const keysToCheck = [
    'taskDetailRefreshConfig',
    'performanceMetrics',
    'debugLogs'
  ];
  
  keysToCheck.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item && item.length > 10000) { // 如果数据过大，清理掉
        localStorage.removeItem(key);
        console.log(`清理过大的存储项: ${key}`);
      }
    } catch (error) {
      console.warn(`清理存储项失败: ${key}`, error);
    }
  });
};

// 内存监控器
export class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private config = getCurrentPerformanceConfig();
  
  start() {
    if (this.interval || !this.config.memoryCheckInterval) return;
    
    this.interval = setInterval(() => {
      const result = checkMemoryUsage();
      if (result?.warning && this.config.autoCleanup) {
        triggerMemoryCleanup();
      }
    }, this.config.memoryCheckInterval);
    
    console.log(`内存监控已启动，检查间隔: ${this.config.memoryCheckInterval}ms`);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('内存监控已停止');
    }
  }
  
  cleanup() {
    this.stop();
  }
}

// 全局内存监控实例
export const memoryMonitor = new MemoryMonitor();
