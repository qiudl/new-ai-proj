/**
 * 缓存事件系统
 * 提供缓存操作的实时监控、调试和性能分析
 */

export interface CacheEvent {
  /** 事件类型 */
  type: 'set' | 'get' | 'delete' | 'invalidate' | 'hit' | 'miss' | 'cleanup' | 'memory_warning';
  /** 缓存键 */
  key: string;
  /** 时间戳 */
  timestamp: number;
  /** 事件数据 */
  data?: any;
  /** 操作耗时(毫秒) */
  duration?: number;
  /** 内存使用量(MB) */
  memoryUsage?: number;
  /** 错误信息 */
  error?: string;
  /** 源信息 */
  source?: string;
  /** 标签 */
  tags?: string[];
}

export interface PerformanceMetrics {
  /** 操作总数 */
  totalOperations: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
  /** 平均响应时间(毫秒) */
  avgResponseTime: number;
  /** 内存使用趋势 */
  memoryTrend: number[];
  /** 最近错误 */
  recentErrors: CacheEvent[];
  /** 热点键Top10 */
  hotKeys: { key: string; accessCount: number }[];
}

export type CacheEventListener = (event: CacheEvent) => void;

export class CacheEventSystem {
  private listeners: Map<string, CacheEventListener[]> = new Map();
  private eventHistory: CacheEvent[] = [];
  private maxHistorySize = 1000;
  private performanceData = {
    operations: 0,
    hits: 0,
    misses: 0,
    responseTimes: [] as number[],
    memoryUsages: [] as number[],
    errors: [] as CacheEvent[],
    keyAccess: new Map<string, number>()
  };

  /**
   * 添加事件监听器
   */
  on(eventType: CacheEvent['type'], listener: CacheEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);

    // 返回取消监听的函数
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 监听所有事件
   */
  onAll(listener: CacheEventListener): () => void {
    const eventTypes: CacheEvent['type'][] = ['set', 'get', 'delete', 'invalidate', 'hit', 'miss', 'cleanup', 'memory_warning'];
    const unsubscribeFunctions = eventTypes.map(type => this.on(type, listener));

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * 触发事件
   */
  emit(event: CacheEvent): void {
    // 记录事件到历史
    this.addToHistory(event);
    
    // 更新性能数据
    this.updatePerformanceData(event);
    
    // 通知监听器
    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cache event listener:', error);
      }
    });
  }

  /**
   * 记录缓存获取事件
   */
  emitGet(key: string, hit: boolean, duration: number, memoryUsage?: number, source?: string): void {
    this.emit({
      type: 'get',
      key,
      timestamp: Date.now(),
      duration,
      memoryUsage,
      source,
      data: { hit }
    });

    // 同时触发命中/未命中事件
    this.emit({
      type: hit ? 'hit' : 'miss',
      key,
      timestamp: Date.now(),
      duration,
      source
    });
  }

  /**
   * 记录缓存设置事件
   */
  emitSet(key: string, dataSize: number, ttl: number, memoryUsage?: number, tags?: string[], source?: string): void {
    this.emit({
      type: 'set',
      key,
      timestamp: Date.now(),
      memoryUsage,
      tags,
      source,
      data: { 
        size: dataSize,
        ttl 
      }
    });
  }

  /**
   * 记录缓存删除事件
   */
  emitDelete(key: string, reason: 'explicit' | 'expiry' | 'eviction', memoryFreed?: number, source?: string): void {
    this.emit({
      type: 'delete',
      key,
      timestamp: Date.now(),
      memoryUsage: memoryFreed,
      source,
      data: { reason }
    });
  }

  /**
   * 记录缓存失效事件
   */
  emitInvalidate(keys: string[], reason: string, cascadeDepth: number, source?: string): void {
    keys.forEach(key => {
      this.emit({
        type: 'invalidate',
        key,
        timestamp: Date.now(),
        source,
        data: {
          reason,
          cascadeDepth,
          totalInvalidated: keys.length
        }
      });
    });
  }

  /**
   * 记录内存警告事件
   */
  emitMemoryWarning(currentUsage: number, maxUsage: number, source?: string): void {
    this.emit({
      type: 'memory_warning',
      key: 'system',
      timestamp: Date.now(),
      memoryUsage: currentUsage,
      source,
      data: {
        maxUsage,
        utilizationRate: (currentUsage / maxUsage) * 100
      }
    });
  }

  /**
   * 记录清理事件
   */
  emitCleanup(cleanedKeys: string[], memoryFreed: number, source?: string): void {
    this.emit({
      type: 'cleanup',
      key: 'system',
      timestamp: Date.now(),
      memoryUsage: memoryFreed,
      source,
      data: {
        cleanedCount: cleanedKeys.length,
        keys: cleanedKeys
      }
    });
  }

  /**
   * 添加事件到历史记录
   */
  private addToHistory(event: CacheEvent): void {
    this.eventHistory.push(event);
    
    // 保持历史记录大小限制
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 更新性能数据
   */
  private updatePerformanceData(event: CacheEvent): void {
    this.performanceData.operations++;

    // 统计命中/未命中
    if (event.type === 'hit') {
      this.performanceData.hits++;
    } else if (event.type === 'miss') {
      this.performanceData.misses++;
    }

    // 记录响应时间
    if (event.duration !== undefined) {
      this.performanceData.responseTimes.push(event.duration);
      // 保持最近1000条记录
      if (this.performanceData.responseTimes.length > 1000) {
        this.performanceData.responseTimes.shift();
      }
    }

    // 记录内存使用
    if (event.memoryUsage !== undefined) {
      this.performanceData.memoryUsages.push(event.memoryUsage);
      // 保持最近100条记录
      if (this.performanceData.memoryUsages.length > 100) {
        this.performanceData.memoryUsages.shift();
      }
    }

    // 记录错误
    if (event.error) {
      this.performanceData.errors.push(event);
      // 保持最近50条错误记录
      if (this.performanceData.errors.length > 50) {
        this.performanceData.errors.shift();
      }
    }

    // 统计键访问频次
    if (event.type === 'get' || event.type === 'hit') {
      const currentCount = this.performanceData.keyAccess.get(event.key) || 0;
      this.performanceData.keyAccess.set(event.key, currentCount + 1);
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const total = this.performanceData.hits + this.performanceData.misses;
    const hitRate = total > 0 ? (this.performanceData.hits / total) * 100 : 0;
    
    const avgResponseTime = this.performanceData.responseTimes.length > 0
      ? this.performanceData.responseTimes.reduce((sum, time) => sum + time, 0) / this.performanceData.responseTimes.length
      : 0;

    // 获取热点键Top10
    const hotKeys = Array.from(this.performanceData.keyAccess.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, accessCount]) => ({ key, accessCount }));

    return {
      totalOperations: this.performanceData.operations,
      hits: this.performanceData.hits,
      misses: this.performanceData.misses,
      hitRate,
      avgResponseTime,
      memoryTrend: [...this.performanceData.memoryUsages],
      recentErrors: [...this.performanceData.errors],
      hotKeys
    };
  }

  /**
   * 获取事件历史
   */
  getEventHistory(eventType?: CacheEvent['type'], limit?: number): CacheEvent[] {
    let events = eventType 
      ? this.eventHistory.filter(event => event.type === eventType)
      : this.eventHistory;

    if (limit) {
      events = events.slice(-limit);
    }

    return [...events];
  }

  /**
   * 获取实时统计
   */
  getRealTimeStats(timeWindow = 60000): {
    recentOperations: number;
    recentHitRate: number;
    recentErrors: number;
    activeKeys: Set<string>;
  } {
    const cutoffTime = Date.now() - timeWindow;
    const recentEvents = this.eventHistory.filter(event => event.timestamp > cutoffTime);
    
    const recentHits = recentEvents.filter(e => e.type === 'hit').length;
    const recentMisses = recentEvents.filter(e => e.type === 'miss').length;
    const recentTotal = recentHits + recentMisses;
    const recentHitRate = recentTotal > 0 ? (recentHits / recentTotal) * 100 : 0;
    
    const recentErrors = recentEvents.filter(e => e.error).length;
    const activeKeys = new Set(recentEvents.map(e => e.key));

    return {
      recentOperations: recentEvents.length,
      recentHitRate,
      recentErrors,
      activeKeys
    };
  }

  /**
   * 检测异常模式
   */
  detectAnomalies(): {
    highMissRate: boolean;
    slowResponses: boolean;
    memorySpikes: boolean;
    errorSpikes: boolean;
  } {
    const stats = this.getPerformanceMetrics();
    const realtimeStats = this.getRealTimeStats();
    
    return {
      highMissRate: stats.hitRate < 70, // 命中率低于70%
      slowResponses: stats.avgResponseTime > 100, // 平均响应时间超过100ms
      memorySpikes: stats.memoryTrend.length > 0 && 
        stats.memoryTrend[stats.memoryTrend.length - 1] > 15, // 内存使用超过15MB
      errorSpikes: realtimeStats.recentErrors > 5 // 最近1分钟错误超过5个
    };
  }

  /**
   * 清理性能数据
   */
  clearPerformanceData(): void {
    this.performanceData = {
      operations: 0,
      hits: 0,
      misses: 0,
      responseTimes: [],
      memoryUsages: [],
      errors: [],
      keyAccess: new Map()
    };
  }

  /**
   * 清理事件历史
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 设置历史记录大小限制
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    
    // 如果当前历史超过新限制，截断它
    if (this.eventHistory.length > size) {
      this.eventHistory = this.eventHistory.slice(-size);
    }
  }

  /**
   * 销毁事件系统
   */
  destroy(): void {
    this.listeners.clear();
    this.clearHistory();
    this.clearPerformanceData();
  }
}

// 单例实例
export const cacheEventSystem = new CacheEventSystem();

// 开发环境下启用调试日志
if (process.env.NODE_ENV === 'development') {
  cacheEventSystem.on('memory_warning', (event) => {
    console.warn('Cache memory warning:', event);
  });
  
  cacheEventSystem.on('invalidate', (event) => {
    console.log('Cache invalidated:', event.key, 'Reason:', event.data?.reason);
  });
}

export default CacheEventSystem;