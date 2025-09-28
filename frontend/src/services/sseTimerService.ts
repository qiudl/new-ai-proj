/**
 * SSE Timer Service
 * 替代轮询机制的Server-Sent Events实时计时器服务
 * 
 * 功能：
 * - 建立和管理SSE连接
 * - 处理计时器事件（start, stop, pause, resume, update）
 * - 连接状态管理和自动重连
 * - 错误处理和降级机制
 */

import { TimerCurrentResponse } from '../types/timer';
import { urlBuilder } from '../utils/URLBuilder';
import SmartReconnectionManager from '../utils/SmartReconnectionManager';
import { errorLogger } from '../utils/ErrorLogger';

// SSE事件类型定义
export interface SSETimerEvent {
  type: 'timer_start' | 'timer_stop' | 'timer_pause' | 'timer_resume' | 'timer_update' | 'connection_status' | 'heartbeat';
  data: SSETimerData | SSEConnectionData | any;
  user_id: number;
  timestamp: string;
  event_id?: string;
}

export interface SSETimerData {
  id?: number;
  user_id: number;
  target_type: string;
  target_id: number;
  target_title: string;
  status: string;
  start_time?: string;
  elapsed_seconds: number;
  is_running: boolean;
  is_paused: boolean;
  project_id?: number;
  formatted_time: string;
}

export interface SSEConnectionData {
  status: 'connected' | 'disconnected' | 'error';
  user_id: number;
  timestamp: string;
  message?: string;
}

// 连接状态类型
export type SSEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// 事件监听器类型
export type SSEEventListener = (event: SSETimerEvent) => void;
export type SSEStatusListener = (status: SSEConnectionStatus, error?: string) => void;

// SSE配置
const SSE_CONFIG = {
  ENDPOINT: '/api/v1/timer/sse-token', // Token-based SSE endpoint (no auth middleware)
  RECONNECT_INTERVAL: 3000,    // 重连间隔3秒
  MAX_RECONNECT_ATTEMPTS: 10,  // 最大重连次数
  HEARTBEAT_TIMEOUT: 45000,    // 心跳超时45秒
  CONNECTION_TIMEOUT: 10000,   // 连接超时10秒
  FALLBACK_POLL_INTERVAL: 30000, // 降级轮询间隔30秒
};

class SSETimerService {
  private eventSource: EventSource | null = null;
  private connectionStatus: SSEConnectionStatus = 'disconnected';
  private eventListeners: Set<SSEEventListener> = new Set();
  private statusListeners: Set<SSEStatusListener> = new Set();
  
  // 智能重连管理器
  private reconnectionManager: SmartReconnectionManager;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  // 降级轮询
  private fallbackTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  
  // 认证信息
  private authToken: string | null = null;
  
  constructor() {
    this.initAuthToken();
    this.setupNetworkListeners();
    this.setupPageUnloadHandler();
    
    // 初始化智能重连管理器
    this.reconnectionManager = new SmartReconnectionManager({
      maxAttempts: SSE_CONFIG.MAX_RECONNECT_ATTEMPTS,
      baseDelay: SSE_CONFIG.RECONNECT_INTERVAL,
      maxDelay: 60000, // 最大1分钟
      fallbackThreshold: 3, // 3次连续错误后降级
    });
    
    // 监听重连事件
    this.reconnectionManager.addListener((event) => {
      errorLogger.sseEvent('reconnection', `${event.type} - attempt ${event.attempt}`, {
        attempt: event.attempt,
        delay: event.delay,
        error: event.error,
        errorType: event.errorType
      });
      
      if (event.type === 'fallback') {
        this.startFallbackPolling();
      }
    });
  }
  
  /**
   * 初始化认证token
   */
  private initAuthToken(): void {
    // 从localStorage获取token，支持多种可能的key
    this.authToken = localStorage.getItem('access_token') 
                  || localStorage.getItem('authToken')
                  || localStorage.getItem('token')
                  || localStorage.getItem('auth_token');
  }
  
  /**
   * 执行实际连接操作（供重连管理器调用）
   */
  private async performActualConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.authToken) {
        reject(new Error('No auth token available'));
        return;
      }
      
      try {
        // 使用URLBuilder构建SSE URL
        const urlResult = urlBuilder.buildSSEUrl(SSE_CONFIG.ENDPOINT, this.authToken);
        
        if (!urlResult.isValid) {
          reject(new Error(urlResult.error || 'Failed to build SSE URL'));
          return;
        }
        
        // 创建EventSource连接
        this.eventSource = new EventSource(urlResult.url);
        
        // 设置连接超时
        const connectionTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, SSE_CONFIG.CONNECTION_TIMEOUT);
        
        // 连接建立
        this.eventSource.onopen = () => {
          clearTimeout(connectionTimeout);
          this.setConnectionStatus('connected');
          this.stopFallbackPolling();
          this.startHeartbeatMonitor();
          errorLogger.sseConnection('established', { url: urlResult.url });
          resolve();
        };
        
        // 错误处理
        this.eventSource.onerror = (event) => {
          clearTimeout(connectionTimeout);
          let errorMessage = 'EventSource error';
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            errorMessage = 'Connection closed by server';
          }
          errorLogger.sseError(errorMessage, { event, readyState: this.eventSource?.readyState });
          reject(new Error(errorMessage));
        };
        
        // 设置事件监听器
        this.setupEventListeners();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 建立SSE连接
   */
  public async connect(): Promise<void> {
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
      return;
    }
    
    this.setConnectionStatus('connecting');
    this.initAuthToken(); // 重新获取token
    
    if (!this.authToken) {
      errorLogger.sseError('No auth token found, cannot establish SSE connection');
      this.setConnectionStatus('error', 'Authentication token not found');
      this.startFallbackPolling();
      return;
    }
    
    try {
      await this.performActualConnection();
      errorLogger.sseConnection('success');
    } catch (error) {
      errorLogger.sseError('Connection failed', error);
      await this.handleConnectionError(typeof error === 'string' ? error : (error as Error).message);
    }
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;
    
    // 计时器事件
    const timerEvents = ['timer_start', 'timer_stop', 'timer_pause', 'timer_resume', 'timer_update'];
    timerEvents.forEach(eventType => {
      this.eventSource!.addEventListener(eventType, (event) => {
        this.handleSSEMessage(event);
      });
    });
    
    // 连接状态事件
    this.eventSource.addEventListener('connection_status', (event) => {
      this.handleSSEMessage(event);
    });
    
    // 心跳事件
    this.eventSource.addEventListener('heartbeat', (event) => {
      this.handleHeartbeat(event);
    });
  }
  
  /**
   * 处理SSE消息
   */
  private handleSSEMessage(event: MessageEvent): void {
    try {
      const eventData: SSETimerEvent = JSON.parse(event.data);
      
      // 更新最后心跳时间
      this.lastHeartbeat = Date.now();
      
      // 通知所有事件监听器
      this.eventListeners.forEach(listener => {
        try {
          listener(eventData);
        } catch (error) {
          console.error('SSE Timer Service: Error in event listener', error);
        }
      });
      
    } catch (error) {
      console.error('SSE Timer Service: Failed to parse SSE message', error, event.data);
    }
  }
  
  /**
   * 处理心跳消息
   */
  private handleHeartbeat(event: MessageEvent): void {
    this.lastHeartbeat = Date.now();
    // 心跳事件通常不需要特殊处理，只是更新时间戳
  }
  
  /**
   * 开始心跳监控
   */
  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor();
    
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > SSE_CONFIG.HEARTBEAT_TIMEOUT) {
        console.warn('SSE Timer Service: Heartbeat timeout, reconnecting');
        this.handleConnectionError('Heartbeat timeout');
      }
    }, SSE_CONFIG.HEARTBEAT_TIMEOUT / 3); // 检查频率为超时时间的1/3
  }
  
  /**
   * 停止心跳监控
   */
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * 处理连接错误
   */
  private async handleConnectionError(error: string): Promise<void> {
    // 如果是用户中断，不进行重连
    if (error.includes('interrupted') || error.includes('User interrupted')) {
      this.setConnectionStatus('disconnected', error);
      this.closeConnection();
      return;
    }
    
    this.setConnectionStatus('error', error);
    this.closeConnection();
    
    // 使用智能重连管理器
    const shouldReconnect = await this.reconnectionManager.attemptReconnection(
      () => this.performActualConnection(),
      error
    );
    
    if (!shouldReconnect) {
      console.warn('SSE Timer Service: Smart reconnection manager decided to fallback');
      this.startFallbackPolling();
    }
  }
  
  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    this.setConnectionStatus('reconnecting');
    
    console.log(`SSE Timer Service: Scheduling reconnection attempt ${this.reconnectAttempts}/${SSE_CONFIG.MAX_RECONNECT_ATTEMPTS}`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, SSE_CONFIG.RECONNECT_INTERVAL);
  }
  
  /**
   * 开始降级轮询
   */
  private startFallbackPolling(): void {
    this.stopFallbackPolling();
    
    console.log('SSE Timer Service: Starting fallback polling');
    
    this.fallbackTimer = setInterval(() => {
      this.performFallbackRequest();
    }, SSE_CONFIG.FALLBACK_POLL_INTERVAL);
    
    // 立即执行一次
    this.performFallbackRequest();
  }
  
  /**
   * 停止降级轮询
   */
  private stopFallbackPolling(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
  
  /**
   * 执行降级轮询请求
   */
  private async performFallbackRequest(): Promise<void> {
    try {
      // 使用URLBuilder构建API URL
      const urlResult = urlBuilder.buildApiUrl('/user/timer/current');
      
      if (!urlResult.isValid) {
        console.error('SSE Timer Service: Failed to build fallback URL:', urlResult.error);
        return;
      }
      
      const response = await fetch(urlResult.url, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data: TimerCurrentResponse = await response.json();
        
        // 模拟SSE事件格式
        const simulatedEvent: SSETimerEvent = {
          type: 'timer_update',
          data: {
            user_id: 1, // 从token解析或设置默认值
            target_type: 'project_task',
            target_id: data.task_id || 0,
            target_title: data.task_title || '',
            status: data.is_running ? 'running' : 'stopped',
            start_time: data.start_time,
            elapsed_seconds: data.elapsed_seconds,
            is_running: data.is_running,
            is_paused: data.is_paused || false,
            formatted_time: data.formatted_time,
          },
          user_id: 1,
          timestamp: new Date().toISOString(),
        };
        
        // 通知监听器
        this.eventListeners.forEach(listener => {
          try {
            listener(simulatedEvent);
          } catch (error) {
            console.error('SSE Timer Service: Error in fallback listener', error);
          }
        });
      }
    } catch (error) {
      console.error('SSE Timer Service: Fallback request failed', error);
    }
  }
  
  /**
   * 关闭连接
   */
  public disconnect(): void {
    this.closeConnection();
    this.stopHeartbeatMonitor();
    this.stopFallbackPolling();
    this.cancelReconnect();
    this.setConnectionStatus('disconnected');
  }
  
  /**
   * 关闭EventSource连接
   */
  private closeConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
  
  /**
   * 取消重连
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * 设置连接状态
   */
  private setConnectionStatus(status: SSEConnectionStatus, error?: string): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      
      // 通知状态监听器
      this.statusListeners.forEach(listener => {
        try {
          listener(status, error);
        } catch (err) {
          console.error('SSE Timer Service: Error in status listener', err);
        }
      });
    }
  }
  
  /**
   * 添加事件监听器
   */
  public addEventListener(listener: SSEEventListener): void {
    this.eventListeners.add(listener);
  }
  
  /**
   * 移除事件监听器
   */
  public removeEventListener(listener: SSEEventListener): void {
    this.eventListeners.delete(listener);
  }
  
  /**
   * 添加状态监听器
   */
  public addStatusListener(listener: SSEStatusListener): void {
    this.statusListeners.add(listener);
  }
  
  /**
   * 移除状态监听器
   */
  public removeStatusListener(listener: SSEStatusListener): void {
    this.statusListeners.delete(listener);
  }
  
  /**
   * 获取当前连接状态
   */
  public getConnectionStatus(): SSEConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }
  
  /**
   * 手动重连
   */
  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    setTimeout(() => this.connect(), 1000);
  }
  
  /**
   * 设置页面卸载处理器
   */
  private setupPageUnloadHandler(): void {
    // 页面卸载时优雅关闭连接
    window.addEventListener('beforeunload', () => {
      if (this.eventSource) {
        console.log('SSE Timer Service: Page unloading, closing connection gracefully');
        this.eventSource.close();
        this.eventSource = null;
      }
    });
    
    // 页面隐藏时不立即断开连接，但标记状态
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.connectionStatus === 'connected') {
        console.log('SSE Timer Service: Page hidden, connection may be interrupted');
      }
    });
  }
  
  /**
   * 设置网络状态监听器
   */
  private setupNetworkListeners(): void {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      console.log('SSE Timer Service: Network back online, attempting to reconnect');
      if (this.connectionStatus === 'error' || this.connectionStatus === 'disconnected') {
        setTimeout(() => this.connect(), 1000);
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('SSE Timer Service: Network offline, starting fallback mode');
      this.setConnectionStatus('error', 'Network offline');
      this.startFallbackPolling();
    });
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.connectionStatus !== 'connected') {
        console.log('SSE Timer Service: Page visible, checking connection');
        setTimeout(() => {
          if (this.connectionStatus !== 'connected') {
            this.connect();
          }
        }, 2000);
      }
    });
  }
  
  /**
   * 更新认证token
   */
  public updateAuthToken(token: string): void {
    this.authToken = token;
    if (this.isConnected()) {
      // 重新连接以使用新token
      this.reconnect();
    }
  }
  
  /**
   * 清理资源
   */
  public cleanup(): void {
    this.disconnect();
    // 移除事件监听器
    window.removeEventListener('online', this.connect);
    window.removeEventListener('offline', this.handleConnectionError);
  }
}

// 创建单例实例
export const sseTimerService = new SSETimerService();

export default sseTimerService;