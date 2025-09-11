import { TaskTimelineEvent } from '../types/timeline';

export interface WebSocketMessage {
  type: 'timeline_event' | 'timeline_update' | 'timeline_delete' | 'connection' | 'error';
  data?: any;
  timestamp: string;
  source?: string;
}

export interface TimelineWebSocketEvent {
  type: 'new_event' | 'event_updated' | 'event_deleted' | 'bulk_update';
  event?: TaskTimelineEvent;
  events?: TaskTimelineEvent[];
  eventId?: number;
  eventIds?: number[];
  taskId?: number;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

/**
 * WebSocket 连接管理器
 * 专门用于时间线实时更新
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1秒
  private maxReconnectDelay = 30000; // 30秒
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isIntentionallyClosed = false;
  private eventHandlers = new Set<WebSocketEventHandler>();
  private connectionPromise: Promise<void> | null = null;

  // 消息队列，用于连接断开时缓存消息
  private messageQueue: WebSocketMessage[] = [];
  private maxQueueSize = 100;

  // 连接状态回调
  private onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * 建立WebSocket连接
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return this.connectionPromise || Promise.resolve();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.isIntentionallyClosed = false;
    this.isConnecting = true;
    this.onConnectionStatusChange?.('connecting');

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('[WebSocket] 连接已建立');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.onConnectionStatusChange?.('connected');
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] 连接已关闭', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (!this.isIntentionallyClosed) {
            this.onConnectionStatusChange?.('disconnected');
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] 连接错误', error);
          this.isConnecting = false;
          this.onConnectionStatusChange?.('error');
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        this.onConnectionStatusChange?.('error');
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * 关闭WebSocket连接
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.onConnectionStatusChange?.('disconnected');
  }

  /**
   * 添加事件处理器
   */
  addEventHandler(handler: WebSocketEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * 移除事件处理器
   */
  removeEventHandler(handler: WebSocketEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * 设置连接状态变化回调
   */
  setConnectionStatusHandler(handler: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): void {
    this.onConnectionStatusChange = handler;
  }

  /**
   * 发送消息
   */
  send(message: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[WebSocket] 发送消息失败', error);
        return false;
      }
    } else {
      // 将消息添加到队列中，等连接恢复后发送
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push({
          type: 'connection',
          data: message,
          timestamp: new Date().toISOString()
        });
      }
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
      default:
        return 'closed';
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // 处理心跳响应
      if (message.type === 'connection' && message.data === 'pong') {
        return; // 心跳响应，不需要传递给业务处理器
      }

      // 广播消息给所有处理器
      this.eventHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WebSocket] 事件处理器执行错误', error);
        }
      });
    } catch (error) {
      console.error('[WebSocket] 消息解析失败', error);
    }
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 先停止已有的心跳
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
      }
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] 停止重连尝试');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] ${delay}ms 后尝试重连 (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('[WebSocket] 重连失败', error);
      });
    }, delay);
  }

  /**
   * 清空消息队列并发送所有缓存的消息
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && message.data) {
        this.send(message.data);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      connectionState: this.getConnectionState(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      eventHandlers: this.eventHandlers.size,
      isIntentionallyClosed: this.isIntentionallyClosed
    };
  }
}

/**
 * 时间线专用WebSocket管理器
 * 提供时间线事件的实时更新功能
 */
export class TimelineWebSocketManager extends WebSocketManager {
  private taskId?: number;
  private eventBuffer: TaskTimelineEvent[] = [];
  private bufferTimeout: NodeJS.Timeout | null = null;
  private bufferDelay = 500; // 500ms缓冲延迟

  // 事件处理回调
  private onNewEvent?: (event: TaskTimelineEvent) => void;
  private onEventUpdated?: (event: TaskTimelineEvent) => void;
  private onEventDeleted?: (eventId: number) => void;
  private onBulkUpdate?: (events: TaskTimelineEvent[]) => void;

  constructor(url: string, taskId?: number) {
    super(url);
    this.taskId = taskId;
    this.setupTimelineHandlers();
  }

  /**
   * 设置任务ID过滤
   */
  setTaskId(taskId: number): void {
    this.taskId = taskId;
    // 向服务器发送任务ID，用于过滤事件
    this.send({
      type: 'subscribe',
      taskId: taskId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 设置事件回调
   */
  setEventHandlers(handlers: {
    onNewEvent?: (event: TaskTimelineEvent) => void;
    onEventUpdated?: (event: TaskTimelineEvent) => void;
    onEventDeleted?: (eventId: number) => void;
    onBulkUpdate?: (events: TaskTimelineEvent[]) => void;
  }): void {
    this.onNewEvent = handlers.onNewEvent;
    this.onEventUpdated = handlers.onEventUpdated;
    this.onEventDeleted = handlers.onEventDeleted;
    this.onBulkUpdate = handlers.onBulkUpdate;
  }

  /**
   * 设置时间线消息处理器
   */
  private setupTimelineHandlers(): void {
    this.addEventHandler((message: WebSocketMessage) => {
      if (message.type === 'timeline_event') {
        this.handleTimelineEvent(message.data);
      }
    });
  }

  /**
   * 处理时间线事件
   */
  private handleTimelineEvent(data: TimelineWebSocketEvent): void {
    // 如果设置了taskId过滤，检查事件是否属于该任务
    if (this.taskId && data.event && data.event.task_id !== this.taskId) {
      return; // 过滤掉其他任务的事件
    }

    switch (data.type) {
      case 'new_event':
        if (data.event) {
          this.bufferNewEvent(data.event);
        }
        break;
      
      case 'event_updated':
        if (data.event) {
          this.onEventUpdated?.(data.event);
        }
        break;
      
      case 'event_deleted':
        if (data.eventId) {
          this.onEventDeleted?.(data.eventId);
        }
        break;
      
      case 'bulk_update':
        if (data.events) {
          this.onBulkUpdate?.(data.events);
        }
        break;
    }
  }

  /**
   * 缓冲新事件，避免频繁更新UI
   */
  private bufferNewEvent(event: TaskTimelineEvent): void {
    this.eventBuffer.push(event);
    
    // 如果已经有缓冲计时器，重置它
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }
    
    this.bufferTimeout = setTimeout(() => {
      this.flushEventBuffer();
    }, this.bufferDelay);
  }

  /**
   * 清空事件缓冲区并处理所有事件
   */
  private flushEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;
    
    if (this.eventBuffer.length === 1) {
      // 单个事件
      this.onNewEvent?.(this.eventBuffer[0]);
    } else {
      // 多个事件作为批量更新
      this.onBulkUpdate?.(this.eventBuffer);
    }
    
    this.eventBuffer = [];
    this.bufferTimeout = null;
  }

  /**
   * 手动请求时间线事件刷新
   */
  requestRefresh(taskId?: number): void {
    this.send({
      type: 'request_refresh',
      taskId: taskId || this.taskId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 断开连接时清理缓冲区
   */
  disconnect(): void {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
    this.flushEventBuffer(); // 处理剩余的缓冲事件
    super.disconnect();
  }
}