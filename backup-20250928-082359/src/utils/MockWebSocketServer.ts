import { TaskTimelineEvent, TaskTimelineEventType } from '../types/timeline';
import { WebSocketMessage, TimelineWebSocketEvent } from './WebSocketManager';

/**
 * 模拟WebSocket服务器
 * 用于演示实时时间线功能
 */
export class MockWebSocketServer {
  private clients = new Set<WebSocket>();
  private server: any = null;
  private eventGeneratorInterval: NodeJS.Timeout | null = null;
  private isStarted = false;
  private port: number;

  // 模拟数据配置
  private eventTypes: TaskTimelineEventType[] = [
    'created', 'updated', 'completed', 'started', 'paused',
    'assigned', 'status_changed', 'priority_changed', 'comment_added',
    'time_logged', 'deadline_changed', 'tag_added', 'error_occurred'
  ];

  private users = [
    'alice', 'bob', 'charlie', 'diana', 'eve', 'system'
  ];

  private taskTitles = [
    '实现用户认证', '修复登录bug', '优化数据库', '编写测试',
    '更新文档', '部署应用', '重构代码', '添加功能'
  ];

  constructor(port: number = 8081) {
    this.port = port;
  }

  /**
   * 启动模拟WebSocket服务器
   */
  start(): void {
    if (this.isStarted) {
      console.log('[Mock WebSocket] 服务器已在运行');
      return;
    }

    try {
      // 在浏览器环境中，我们无法创建真正的WebSocket服务器
      // 这里我们创建一个模拟的服务器，用于演示
      console.log(`[Mock WebSocket] 启动模拟服务器在端口 ${this.port}`);
      
      this.isStarted = true;
      this.startEventGenerator();
      
      // 模拟服务器启动成功
      setTimeout(() => {
        console.log('[Mock WebSocket] 模拟服务器已启动');
      }, 1000);
      
    } catch (error) {
      console.error('[Mock WebSocket] 启动服务器失败:', error);
    }
  }

  /**
   * 停止模拟WebSocket服务器
   */
  stop(): void {
    if (!this.isStarted) return;

    console.log('[Mock WebSocket] 停止模拟服务器');
    
    this.stopEventGenerator();
    
    // 关闭所有客户端连接
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    
    this.clients.clear();
    this.isStarted = false;
  }

  /**
   * 注册WebSocket客户端（模拟）
   */
  addClient(client: WebSocket): void {
    this.clients.add(client);
    console.log(`[Mock WebSocket] 客户端已连接，当前连接数: ${this.clients.size}`);
    
    // 发送欢迎消息
    this.sendToClient(client, {
      type: 'connection',
      data: { message: 'Connected to mock WebSocket server' },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 移除WebSocket客户端
   */
  removeClient(client: WebSocket): void {
    this.clients.delete(client);
    console.log(`[Mock WebSocket] 客户端已断开，当前连接数: ${this.clients.size}`);
  }

  /**
   * 向特定客户端发送消息
   */
  private sendToClient(client: WebSocket, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('[Mock WebSocket] 发送消息失败:', error);
        this.removeClient(client);
      }
    }
  }

  /**
   * 向所有客户端广播消息
   */
  broadcast(message: WebSocketMessage): void {
    console.log(`[Mock WebSocket] 广播消息给 ${this.clients.size} 个客户端`);
    
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  /**
   * 生成随机时间线事件
   */
  private generateRandomEvent(): TaskTimelineEvent {
    const now = new Date();
    const eventType = this.eventTypes[Math.floor(Math.random() * this.eventTypes.length)];
    const user = Math.random() > 0.2 ? this.users[Math.floor(Math.random() * this.users.length)] : null;
    const taskTitle = this.taskTitles[Math.floor(Math.random() * this.taskTitles.length)];

    return {
      id: Date.now() + Math.random(),
      task_id: Math.floor(Math.random() * 10) + 1,
      event_type: eventType,
      event_date: now.toISOString(),
      description: this.generateEventDescription(eventType),
      username: user,
      user_id: user ? Math.floor(Math.random() * 100) + 1 : null,
      task_title: taskTitle,
      severity: this.getEventSeverity(eventType),
      category: user ? 'user' : 'system',
      metadata: this.generateEventMetadata(eventType)
    };
  }

  /**
   * 生成事件描述
   */
  private generateEventDescription(eventType: TaskTimelineEventType): string {
    const descriptions: Record<TaskTimelineEventType, string[]> = {
      'created': ['创建了新任务', '新建任务项目'],
      'updated': ['更新了任务信息', '修改任务详情'],
      'deleted': ['删除了任务', '移除任务项目'],
      'restored': ['恢复了已删除的任务', '重新激活任务'],
      'completed': ['完成了任务', '标记任务为已完成'],
      'started': ['开始执行任务', '启动任务工作'],
      'paused': ['暂停了任务', '中断任务执行'],
      'cancelled': ['取消了任务', '终止任务执行'],
      'assigned': ['分配了任务责任人', '指派任务给团队成员'],
      'status_changed': ['更改了任务状态', '修改任务进度'],
      'priority_changed': ['调整了任务优先级', '变更任务重要性'],
      'deadline_changed': ['修改了任务截止日期', '调整任务时限'],
      'comment_added': ['添加了任务评论', '发表了进度评论'],
      'time_logged': ['记录了工作时间', '登记了任务用时'],
      'tag_added': ['为任务添加了标签', '增加任务分类标签'],
      'tag_removed': ['移除了任务标签', '删除任务标签'],
      'bulk_updated': ['批量更新了多个任务', '执行批量任务操作'],
      'error_occurred': ['任务执行出现错误', '检测到任务异常']
    };

    const eventDescriptions = descriptions[eventType] || ['执行了未知操作'];
    return eventDescriptions[Math.floor(Math.random() * eventDescriptions.length)];
  }

  /**
   * 获取事件严重性
   */
  private getEventSeverity(eventType: TaskTimelineEventType): 'info' | 'warning' | 'error' {
    if (eventType === 'error_occurred' || eventType === 'cancelled') return 'error';
    if (eventType === 'deadline_changed' || eventType === 'priority_changed') return 'warning';
    return 'info';
  }

  /**
   * 生成事件元数据
   */
  private generateEventMetadata(eventType: TaskTimelineEventType): any {
    const baseMetadata = {
      source: 'mock_server',
      generated_at: new Date().toISOString()
    };

    switch (eventType) {
      case 'status_changed':
        return {
          ...baseMetadata,
          old_value: 'todo',
          new_value: 'in_progress',
          change_source: 'manual'
        };
      
      case 'priority_changed':
        return {
          ...baseMetadata,
          old_value: 'medium',
          new_value: 'high',
          change_reason: '紧急需求变更'
        };
      
      case 'time_logged':
        return {
          ...baseMetadata,
          duration_ms: Math.floor(Math.random() * 4) * 60 * 60 * 1000, // 0-4小时
          activity_type: '开发编码'
        };
      
      case 'assigned':
        return {
          ...baseMetadata,
          old_value: null,
          new_value: 'developer',
          assignee_name: '开发者'
        };
      
      case 'comment_added':
        return {
          ...baseMetadata,
          comment_content: '任务进展顺利，预计今天完成'
        };
      
      case 'error_occurred':
        return {
          ...baseMetadata,
          error_code: 'ERR_' + Math.floor(Math.random() * 1000),
          error_message: '执行过程中遇到异常'
        };
      
      case 'bulk_updated':
        return {
          ...baseMetadata,
          batch_id: 'BATCH_' + Date.now(),
          affected_tasks: [1, 2, 3, 4],
          change_source: 'automation'
        };
      
      default:
        return Math.random() > 0.5 ? baseMetadata : undefined;
    }
  }

  /**
   * 开始自动生成事件
   */
  private startEventGenerator(): void {
    if (this.eventGeneratorInterval) return;

    console.log('[Mock WebSocket] 开始自动生成时间线事件');
    
    this.eventGeneratorInterval = setInterval(() => {
      if (this.clients.size === 0) return; // 没有客户端连接时不生成事件

      // 随机决定生成事件的类型
      const random = Math.random();
      
      if (random < 0.8) {
        // 80% 概率生成单个事件
        const event = this.generateRandomEvent();
        this.broadcastTimelineEvent({
          type: 'new_event',
          event
        });
      } else if (random < 0.95) {
        // 15% 概率生成批量事件
        const eventCount = Math.floor(Math.random() * 3) + 2; // 2-4个事件
        const events = Array.from({ length: eventCount }, () => this.generateRandomEvent());
        
        this.broadcastTimelineEvent({
          type: 'bulk_update',
          events
        });
      } else {
        // 5% 概率生成事件更新或删除
        const actionType = Math.random() > 0.5 ? 'event_updated' : 'event_deleted';
        
        if (actionType === 'event_updated') {
          const event = this.generateRandomEvent();
          event.description += ' (已更新)';
          
          this.broadcastTimelineEvent({
            type: 'event_updated',
            event
          });
        } else {
          this.broadcastTimelineEvent({
            type: 'event_deleted',
            eventId: Math.floor(Math.random() * 1000) + 1
          });
        }
      }
    }, 2000 + Math.random() * 3000); // 2-5秒间隔
  }

  /**
   * 停止自动生成事件
   */
  private stopEventGenerator(): void {
    if (this.eventGeneratorInterval) {
      clearInterval(this.eventGeneratorInterval);
      this.eventGeneratorInterval = null;
      console.log('[Mock WebSocket] 停止自动生成时间线事件');
    }
  }

  /**
   * 广播时间线事件
   */
  private broadcastTimelineEvent(eventData: TimelineWebSocketEvent): void {
    const message: WebSocketMessage = {
      type: 'timeline_event',
      data: eventData,
      timestamp: new Date().toISOString(),
      source: 'mock_server'
    };

    this.broadcast(message);
  }

  /**
   * 手动触发特定类型的事件
   */
  triggerEvent(eventType: TaskTimelineEventType, count = 1): void {
    console.log(`[Mock WebSocket] 手动触发 ${count} 个 ${eventType} 事件`);
    
    if (count === 1) {
      const event = this.generateRandomEvent();
      event.event_type = eventType;
      
      this.broadcastTimelineEvent({
        type: 'new_event',
        event
      });
    } else {
      const events = Array.from({ length: count }, () => {
        const event = this.generateRandomEvent();
        event.event_type = eventType;
        return event;
      });
      
      this.broadcastTimelineEvent({
        type: 'bulk_update',
        events
      });
    }
  }

  /**
   * 获取服务器统计信息
   */
  getStats() {
    return {
      isStarted: this.isStarted,
      clientCount: this.clients.size,
      port: this.port,
      eventGeneratorActive: this.eventGeneratorInterval !== null
    };
  }
}

// 全局模拟服务器实例
let mockServerInstance: MockWebSocketServer | null = null;

/**
 * 获取模拟WebSocket服务器实例
 */
export function getMockWebSocketServer(port = 8081): MockWebSocketServer {
  if (!mockServerInstance) {
    mockServerInstance = new MockWebSocketServer(port);
  }
  return mockServerInstance;
}