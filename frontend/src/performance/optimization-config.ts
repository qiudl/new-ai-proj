/**
 * 性能优化配置
 * 定义系统性能优化的各种配置选项
 */

export interface PerformanceConfig {
  // 缓存配置
  caching: {
    componentCacheSize: number;
    requestCacheTTL: number;
    imageCacheSize: number;
    enableServiceWorker: boolean;
  };
  
  // 渲染优化
  rendering: {
    enableVirtualization: boolean;
    virtualScrollThreshold: number;
    lazyLoadingThreshold: number;
    debounceDelay: number;
    throttleDelay: number;
  };
  
  // 网络优化
  network: {
    enableRequestBatching: boolean;
    batchSize: number;
    retryAttempts: number;
    timeout: number;
    enableCompression: boolean;
  };
  
  // 内存管理
  memory: {
    enableMemoryMonitoring: boolean;
    memoryWarningThreshold: number;
    cleanupInterval: number;
    maxCacheSize: number;
  };
  
  // 性能监控
  monitoring: {
    enablePerformanceTracking: boolean;
    sampleRate: number;
    maxMetrics: number;
    reportingInterval: number;
  };
  
  // 优化策略
  optimization: {
    enableCodeSplitting: boolean;
    enableTreeShaking: boolean;
    enableImageOptimization: boolean;
    enableCssOptimization: boolean;
  };
}

// 默认配置
export const defaultPerformanceConfig: PerformanceConfig = {
  caching: {
    componentCacheSize: 100,
    requestCacheTTL: 300000, // 5分钟
    imageCacheSize: 50,
    enableServiceWorker: true,
  },
  
  rendering: {
    enableVirtualization: true,
    virtualScrollThreshold: 100,
    lazyLoadingThreshold: 0.1,
    debounceDelay: 300,
    throttleDelay: 100,
  },
  
  network: {
    enableRequestBatching: true,
    batchSize: 10,
    retryAttempts: 3,
    timeout: 30000,
    enableCompression: true,
  },
  
  memory: {
    enableMemoryMonitoring: true,
    memoryWarningThreshold: 80, // 80%
    cleanupInterval: 300000, // 5分钟
    maxCacheSize: 100 * 1024 * 1024, // 100MB
  },
  
  monitoring: {
    enablePerformanceTracking: true,
    sampleRate: 0.1, // 10%采样率
    maxMetrics: 1000,
    reportingInterval: 60000, // 1分钟
  },
  
  optimization: {
    enableCodeSplitting: true,
    enableTreeShaking: true,
    enableImageOptimization: true,
    enableCssOptimization: true,
  },
};

// 环境特定配置
export const getEnvironmentConfig = (): PerformanceConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isDevelopment) {
    return {
      ...defaultPerformanceConfig,
      monitoring: {
        ...defaultPerformanceConfig.monitoring,
        sampleRate: 1.0, // 开发环境100%采样
        reportingInterval: 10000, // 10秒报告
      },
      caching: {
        ...defaultPerformanceConfig.caching,
        requestCacheTTL: 60000, // 开发环境缓存时间短一些
      },
    };
  }
  
  if (isProduction) {
    return {
      ...defaultPerformanceConfig,
      monitoring: {
        ...defaultPerformanceConfig.monitoring,
        sampleRate: 0.01, // 生产环境1%采样
      },
      memory: {
        ...defaultPerformanceConfig.memory,
        memoryWarningThreshold: 70, // 生产环境更严格
        cleanupInterval: 180000, // 3分钟清理
      },
    };
  }
  
  return defaultPerformanceConfig;
};

// 性能优化策略枚举
export enum OptimizationStrategy {
  AGGRESSIVE = 'aggressive',
  BALANCED = 'balanced',
  CONSERVATIVE = 'conservative',
}

// 根据策略获取配置
export const getConfigByStrategy = (strategy: OptimizationStrategy): Partial<PerformanceConfig> => {
  switch (strategy) {
    case OptimizationStrategy.AGGRESSIVE:
      return {
        rendering: {
          enableVirtualization: true,
          virtualScrollThreshold: 50,
          lazyLoadingThreshold: 0.05,
          debounceDelay: 150,
          throttleDelay: 50,
        },
        memory: {
          enableMemoryMonitoring: true,
          memoryWarningThreshold: 60,
          cleanupInterval: 120000, // 2分钟
          maxCacheSize: 50 * 1024 * 1024, // 50MB
        },
        caching: {
          componentCacheSize: 50,
          requestCacheTTL: 180000, // 3分钟
          imageCacheSize: 30,
          enableServiceWorker: true,
        },
      };
      
    case OptimizationStrategy.CONSERVATIVE:
      return {
        rendering: {
          enableVirtualization: false,
          virtualScrollThreshold: 200,
          lazyLoadingThreshold: 0.2,
          debounceDelay: 500,
          throttleDelay: 200,
        },
        memory: {
          enableMemoryMonitoring: true,
          memoryWarningThreshold: 90,
          cleanupInterval: 600000, // 10分钟
          maxCacheSize: 200 * 1024 * 1024, // 200MB
        },
        caching: {
          componentCacheSize: 200,
          requestCacheTTL: 600000, // 10分钟
          imageCacheSize: 100,
          enableServiceWorker: true,
        },
      };
      
    case OptimizationStrategy.BALANCED:
    default:
      return defaultPerformanceConfig;
  }
};

// 性能预设配置
export const performancePresets = {
  // 高性能预设
  highPerformance: {
    ...defaultPerformanceConfig,
    ...getConfigByStrategy(OptimizationStrategy.AGGRESSIVE),
    optimization: {
      enableCodeSplitting: true,
      enableTreeShaking: true,
      enableImageOptimization: true,
      enableCssOptimization: true,
    },
  },
  
  // 低内存预设
  lowMemory: {
    ...defaultPerformanceConfig,
    caching: {
      componentCacheSize: 20,
      requestCacheTTL: 120000, // 2分钟
      imageCacheSize: 10,
      enableServiceWorker: false,
    },
    memory: {
      enableMemoryMonitoring: true,
      memoryWarningThreshold: 50,
      cleanupInterval: 60000, // 1分钟
      maxCacheSize: 20 * 1024 * 1024, // 20MB
    },
  },
  
  // 开发模式预设
  development: {
    ...defaultPerformanceConfig,
    monitoring: {
      enablePerformanceTracking: true,
      sampleRate: 1.0,
      maxMetrics: 2000,
      reportingInterval: 5000, // 5秒
    },
    caching: {
      componentCacheSize: 10,
      requestCacheTTL: 30000, // 30秒
      imageCacheSize: 5,
      enableServiceWorker: false,
    },
  },
};

// 性能阈值常量
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms)
  CLS: 0.1,  // Cumulative Layout Shift
  
  // 自定义阈值
  PAGE_LOAD_TIME: 3000, // 页面加载时间 (ms)
  API_RESPONSE_TIME: 1000, // API响应时间 (ms)
  RENDER_TIME: 16, // 渲染时间 (ms)
  MEMORY_USAGE: 80, // 内存使用率 (%)
  
  // 网络阈值
  SLOW_CONNECTION_THRESHOLD: 1000, // 慢连接阈值 (ms)
  TIMEOUT_THRESHOLD: 30000, // 超时阈值 (ms)
  
  // 用户体验阈值
  INTERACTION_DELAY: 50, // 交互延迟 (ms)
  ANIMATION_FPS: 55, // 动画帧率
  SCROLL_PERFORMANCE: 16, // 滚动性能 (ms)
};

// 性能优化建议
export const OPTIMIZATION_RECOMMENDATIONS = {
  // 高优先级建议
  HIGH_PRIORITY: [
    {
      condition: (metrics: any) => metrics.LCP > PERFORMANCE_THRESHOLDS.LCP,
      message: '最大内容绘制时间过长，建议优化关键资源加载',
      actions: ['优化图片', '减少阻塞资源', '使用CDN'],
    },
    {
      condition: (metrics: any) => metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_USAGE,
      message: '内存使用过高，建议优化内存管理',
      actions: ['清理未使用的缓存', '减少内存泄漏', '优化大对象处理'],
    },
  ],
  
  // 中优先级建议
  MEDIUM_PRIORITY: [
    {
      condition: (metrics: any) => metrics.FID > PERFORMANCE_THRESHOLDS.FID,
      message: '首次输入延迟较高，建议优化JavaScript执行',
      actions: ['代码分割', '延迟非关键代码', '优化事件处理'],
    },
    {
      condition: (metrics: any) => metrics.apiResponseTime > PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME,
      message: 'API响应时间较长，建议优化后端性能',
      actions: ['实现请求缓存', '优化数据库查询', '使用数据预取'],
    },
  ],
  
  // 低优先级建议
  LOW_PRIORITY: [
    {
      condition: (metrics: any) => metrics.CLS > PERFORMANCE_THRESHOLDS.CLS,
      message: '累积布局偏移较高，建议稳定页面布局',
      actions: ['为图片设置尺寸', '避免动态插入内容', '使用骨架屏'],
    },
  ],
};

export default {
  defaultPerformanceConfig,
  getEnvironmentConfig,
  getConfigByStrategy,
  performancePresets,
  PERFORMANCE_THRESHOLDS,
  OPTIMIZATION_RECOMMENDATIONS,
  OptimizationStrategy,
};