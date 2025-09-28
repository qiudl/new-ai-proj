/**
 * Smart Reconnection Manager
 * 智能重连策略管理器，减少无效重连和资源消耗
 * 
 * 功能：
 * - 指数退避重连策略
 * - 错误类型判断和处理
 * - 连接健康度监控
 * - 降级策略和熔断机制
 */

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterRange: number;
  healthCheckInterval: number;
  fallbackThreshold: number;
}

export interface ConnectionHealth {
  successCount: number;
  errorCount: number;
  lastSuccessTime: number;
  lastErrorTime: number;
  consecutiveErrors: number;
  averageConnectionTime: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'fallback';

export type ErrorType = 'network' | 'auth' | 'config' | 'server' | 'unknown';

export interface ReconnectionEvent {
  type: 'attempt' | 'success' | 'error' | 'fallback' | 'circuit_break';
  attempt: number;
  delay: number;
  error?: string;
  errorType?: ErrorType;
}

export type ReconnectionEventListener = (event: ReconnectionEvent) => void;

class SmartReconnectionManager {
  private config: ReconnectionConfig;
  private health: ConnectionHealth;
  private currentAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isCircuitOpen = false;
  private lastReconnectTime = 0;
  private listeners: Set<ReconnectionEventListener> = new Set();
  
  constructor(config?: Partial<ReconnectionConfig>) {
    this.config = {
      maxAttempts: 8,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffFactor: 1.5,
      jitterRange: 0.2,
      healthCheckInterval: 60000,
      fallbackThreshold: 5,
      ...config
    };
    
    this.health = {
      successCount: 0,
      errorCount: 0,
      lastSuccessTime: 0,
      lastErrorTime: 0,
      consecutiveErrors: 0,
      averageConnectionTime: 0
    };
    
    this.startHealthCheck();
  }
  
  /**
   * 分析错误类型
   */
  private analyzeError(error: string | Error): ErrorType {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
      return 'network';
    }
    
    if (lowerError.includes('auth') || lowerError.includes('token') || lowerError.includes('unauthorized')) {
      return 'auth';
    }
    
    if (lowerError.includes('invalid') || lowerError.includes('config') || lowerError.includes('url')) {
      return 'config';
    }
    
    if (lowerError.includes('server') || lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503')) {
      return 'server';
    }
    
    return 'unknown';
  }
  
  /**
   * 判断是否应该重连
   */
  private shouldReconnect(errorType: ErrorType): boolean {
    // 配置错误和认证错误通常不需要重连
    if (errorType === 'config' || errorType === 'auth') {
      return false;
    }
    
    // 检查熔断器状态
    if (this.isCircuitOpen) {
      return false;
    }
    
    // 检查是否达到最大重连次数
    if (this.currentAttempt >= this.config.maxAttempts) {
      return false;
    }
    
    // 检查连续错误次数
    if (this.health.consecutiveErrors >= this.config.fallbackThreshold) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 计算延迟时间（指数退避 + 抖动）
   */
  private calculateDelay(): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffFactor, this.currentAttempt);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    // 添加抖动以避免惊群效应
    const jitter = cappedDelay * this.config.jitterRange * (Math.random() - 0.5) * 2;
    
    return Math.max(cappedDelay + jitter, this.config.baseDelay);
  }
  
  /**
   * 尝试重连
   */
  public async attemptReconnection(
    connectFunction: () => Promise<void>,
    error: string | Error
  ): Promise<boolean> {
    const errorType = this.analyzeError(error);
    
    // 更新健康状态
    this.recordError(errorType);
    
    // 判断是否应该重连
    if (!this.shouldReconnect(errorType)) {
      this.notifyListeners({
        type: errorType === 'config' || errorType === 'auth' ? 'circuit_break' : 'fallback',
        attempt: this.currentAttempt,
        delay: 0,
        error: typeof error === 'string' ? error : error.message,
        errorType
      });
      return false;
    }
    
    this.currentAttempt++;
    const delay = this.calculateDelay();
    
    this.notifyListeners({
      type: 'attempt',
      attempt: this.currentAttempt,
      delay,
      error: typeof error === 'string' ? error : error.message,
      errorType
    });
    
    // 设置重连定时器
    return new Promise((resolve) => {
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectTimer = null;
        this.lastReconnectTime = Date.now();
        
        try {
          await connectFunction();
          this.recordSuccess();
          this.notifyListeners({
            type: 'success',
            attempt: this.currentAttempt,
            delay: 0
          });
          resolve(true);
        } catch (reconnectError) {
          this.notifyListeners({
            type: 'error',
            attempt: this.currentAttempt,
            delay: 0,
            error: typeof reconnectError === 'string' ? reconnectError : (reconnectError as Error).message,
            errorType: this.analyzeError(reconnectError as Error)
          });
          resolve(false);
        }
      }, delay);
    });
  }
  
  /**
   * 记录成功连接
   */
  private recordSuccess(): void {
    this.health.successCount++;
    this.health.lastSuccessTime = Date.now();
    this.health.consecutiveErrors = 0;
    this.currentAttempt = 0;
    this.isCircuitOpen = false;
    
    // 计算平均连接时间
    if (this.lastReconnectTime > 0) {
      const connectionTime = Date.now() - this.lastReconnectTime;
      this.health.averageConnectionTime = 
        (this.health.averageConnectionTime * (this.health.successCount - 1) + connectionTime) / this.health.successCount;
    }
  }
  
  /**
   * 记录错误
   */
  private recordError(errorType: ErrorType): void {
    this.health.errorCount++;
    this.health.lastErrorTime = Date.now();
    this.health.consecutiveErrors++;
    
    // 检查是否需要开启熔断器
    if (this.health.consecutiveErrors >= this.config.fallbackThreshold * 2) {
      this.isCircuitOpen = true;
      console.warn('SmartReconnectionManager: Circuit breaker opened due to consecutive errors');
    }
  }
  
  /**
   * 重置重连状态
   */
  public reset(): void {
    this.currentAttempt = 0;
    this.cancelReconnection();
    this.isCircuitOpen = false;
  }
  
  /**
   * 取消当前重连
   */
  public cancelReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * 获取当前状态
   */
  public getStatus(): {
    currentAttempt: number;
    maxAttempts: number;
    isReconnecting: boolean;
    isCircuitOpen: boolean;
    health: ConnectionHealth;
  } {
    return {
      currentAttempt: this.currentAttempt,
      maxAttempts: this.config.maxAttempts,
      isReconnecting: this.reconnectTimer !== null,
      isCircuitOpen: this.isCircuitOpen,
      health: { ...this.health }
    };
  }
  
  /**
   * 开始健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();
      
      // 检查是否长时间没有成功连接
      if (this.health.lastSuccessTime === 0 || 
          now - this.health.lastSuccessTime > this.config.healthCheckInterval * 3) {
        
        // 如果错误率过高，开启熔断器
        const errorRate = this.health.errorCount / Math.max(this.health.successCount + this.health.errorCount, 1);
        if (errorRate > 0.8 && this.health.errorCount > 10) {
          this.isCircuitOpen = true;
        }
      }
      
      // 定期尝试关闭熔断器
      if (this.isCircuitOpen && now - this.health.lastErrorTime > this.config.healthCheckInterval) {
        this.isCircuitOpen = false;
        console.log('SmartReconnectionManager: Circuit breaker closed, allowing reconnection attempts');
      }
      
    }, this.config.healthCheckInterval);
  }
  
  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
  
  /**
   * 添加事件监听器
   */
  public addListener(listener: ReconnectionEventListener): void {
    this.listeners.add(listener);
  }
  
  /**
   * 移除事件监听器
   */
  public removeListener(listener: ReconnectionEventListener): void {
    this.listeners.delete(listener);
  }
  
  /**
   * 通知监听器
   */
  private notifyListeners(event: ReconnectionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('SmartReconnectionManager: Error in event listener', error);
      }
    });
  }
  
  /**
   * 检查是否应该降级到轮询
   */
  public shouldFallbackToPolling(): boolean {
    return this.health.consecutiveErrors >= this.config.fallbackThreshold || this.isCircuitOpen;
  }
  
  /**
   * 获取建议的轮询间隔
   */
  public getSuggestedPollingInterval(): number {
    // 根据错误率动态调整轮询间隔
    const errorRate = this.health.errorCount / Math.max(this.health.successCount + this.health.errorCount, 1);
    const baseInterval = 30000; // 30秒基础间隔
    
    if (errorRate > 0.8) {
      return baseInterval * 3; // 高错误率时降低轮询频率
    } else if (errorRate > 0.5) {
      return baseInterval * 2;
    } else {
      return baseInterval;
    }
  }
  
  /**
   * 清理资源
   */
  public cleanup(): void {
    this.cancelReconnection();
    this.stopHealthCheck();
    this.listeners.clear();
  }
}

export default SmartReconnectionManager;