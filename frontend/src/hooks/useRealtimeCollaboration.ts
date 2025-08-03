/**
 * 实时协作Hook
 * 支持多用户同时编辑和实时同步
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';

// 协作事件类型
export type CollaborationEventType = 
  | 'document_lock'        // 文档锁定
  | 'document_unlock'      // 文档解锁
  | 'document_update'      // 文档更新
  | 'document_delete'      // 文档删除
  | 'document_create'      // 文档创建
  | 'user_join'           // 用户加入
  | 'user_leave'          // 用户离开
  | 'cursor_position'     // 光标位置
  | 'selection_change';   // 选择变化

// 协作事件数据
export interface CollaborationEvent {
  id: string;
  type: CollaborationEventType;
  userId: string;
  userName: string;
  userAvatar?: string;
  documentId?: number;
  data?: any;
  timestamp: number;
}

// 在线用户信息
export interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  lastSeen: number;
  currentDocument?: number;
  cursorPosition?: {
    line: number;
    column: number;
  };
}

// 文档锁定状态
export interface DocumentLock {
  documentId: number;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;
}

interface UseRealtimeCollaborationOptions {
  enabled?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  lockTimeout?: number; // 文档锁定超时时间（毫秒）
}

interface RealtimeCollaborationState {
  connected: boolean;
  onlineUsers: OnlineUser[];
  documentLocks: Map<number, DocumentLock>;
  events: CollaborationEvent[];
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

const useRealtimeCollaboration = (options: UseRealtimeCollaborationOptions = {}) => {
  const {
    enabled = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    heartbeatInterval = 30000,
    lockTimeout = 5 * 60 * 1000 // 5分钟
  } = options;

  // 状态管理
  const [state, setState] = useState<RealtimeCollaborationState>({
    connected: false,
    onlineUsers: [],
    documentLocks: new Map(),
    events: [],
    connectionQuality: 'disconnected'
  });

  // WebSocket引用
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCountRef = useRef(0);

  // 事件监听器
  const eventListenersRef = useRef<Map<CollaborationEventType, Function[]>>(new Map());

  // 获取WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/collaboration`;
  }, []);

  // 连接WebSocket
  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = getWebSocketUrl();
      const token = localStorage.getItem('token');
      
      wsRef.current = new WebSocket(`${wsUrl}?token=${token}`);

      wsRef.current.onopen = () => {
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connectionQuality: 'excellent' 
        }));
        
        reconnectCountRef.current = 0;
        startHeartbeat();
        
        // 发送用户上线事件
        sendEvent({
          type: 'user_join',
          data: {
            timestamp: Date.now()
          }
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: CollaborationEvent = JSON.parse(event.data);
          handleIncomingEvent(data);
        } catch (error) {
          console.error('解析协作事件失败:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connectionQuality: 'disconnected' 
        }));
        
        stopHeartbeat();
        
        // 自动重连
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            `);
            connect();
          }, reconnectDelay * reconnectCountRef.current);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ 实时协作连接错误:', error);
        setState(prev => ({ 
          ...prev, 
          connectionQuality: 'poor' 
        }));
      };

    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      message.error('无法建立实时协作连接');
    }
  }, [enabled, getWebSocketUrl, reconnectAttempts, reconnectDelay]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // 发送用户离线事件
      sendEvent({
        type: 'user_leave',
        data: {
          timestamp: Date.now()
        }
      });
      
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    stopHeartbeat();
  }, []);

  // 发送事件
  const sendEvent = useCallback((event: Omit<CollaborationEvent, 'id' | 'userId' | 'userName' | 'timestamp'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接，无法发送事件');
      return false;
    }

    const currentUser = getCurrentUser(); // 假设有获取当前用户的函数
    const fullEvent: CollaborationEvent = {
      ...event,
      id: generateEventId(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      timestamp: Date.now()
    };

    try {
      wsRef.current.send(JSON.stringify(fullEvent));
      return true;
    } catch (error) {
      console.error('发送协作事件失败:', error);
      return false;
    }
  }, []);

  // 处理传入事件
  const handleIncomingEvent = useCallback((event: CollaborationEvent) => {
    // 更新状态
    setState(prev => ({
      ...prev,
      events: [...prev.events.slice(-99), event] // 保留最近100个事件
    }));

    // 处理不同类型的事件
    switch (event.type) {
      case 'user_join':
        handleUserJoin(event);
        break;
      case 'user_leave':
        handleUserLeave(event);
        break;
      case 'document_lock':
        handleDocumentLock(event);
        break;
      case 'document_unlock':
        handleDocumentUnlock(event);
        break;
      case 'document_update':
        handleDocumentUpdate(event);
        break;
      case 'document_delete':
        handleDocumentDelete(event);
        break;
      case 'document_create':
        handleDocumentCreate(event);
        break;
      case 'cursor_position':
        handleCursorPosition(event);
        break;
      case 'selection_change':
        handleSelectionChange(event);
        break;
    }

    // 触发事件监听器
    const listeners = eventListenersRef.current.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('协作事件监听器错误:', error);
      }
    });
  }, []);

  // 处理用户加入
  const handleUserJoin = useCallback((event: CollaborationEvent) => {
    setState(prev => {
      const existingUser = prev.onlineUsers.find(u => u.id === event.userId);
      if (existingUser) {
        return {
          ...prev,
          onlineUsers: prev.onlineUsers.map(u => 
            u.id === event.userId 
              ? { ...u, isActive: true, lastSeen: event.timestamp }
              : u
          )
        };
      } else {
        return {
          ...prev,
          onlineUsers: [...prev.onlineUsers, {
            id: event.userId,
            name: event.userName,
            avatar: event.userAvatar,
            isActive: true,
            lastSeen: event.timestamp
          }]
        };
      }
    });

    message.success(`${event.userName} 加入了协作`, 2);
  }, []);

  // 处理用户离开
  const handleUserLeave = useCallback((event: CollaborationEvent) => {
    setState(prev => ({
      ...prev,
      onlineUsers: prev.onlineUsers.filter(u => u.id !== event.userId)
    }));

    message.info(`${event.userName} 离开了协作`, 2);
  }, []);

  // 处理文档锁定
  const handleDocumentLock = useCallback((event: CollaborationEvent) => {
    if (!event.documentId) return;

    const lock: DocumentLock = {
      documentId: event.documentId,
      userId: event.userId,
      userName: event.userName,
      lockedAt: event.timestamp,
      expiresAt: event.timestamp + lockTimeout
    };

    setState(prev => ({
      ...prev,
      documentLocks: new Map(prev.documentLocks).set(event.documentId!, lock)
    }));

    const currentUser = getCurrentUser();
    if (event.userId !== currentUser.id) {
      message.warning(`文档被 ${event.userName} 锁定编辑中`, 3);
    }
  }, [lockTimeout]);

  // 处理文档解锁
  const handleDocumentUnlock = useCallback((event: CollaborationEvent) => {
    if (!event.documentId) return;

    setState(prev => {
      const newLocks = new Map(prev.documentLocks);
      newLocks.delete(event.documentId!);
      return {
        ...prev,
        documentLocks: newLocks
      };
    });
  }, []);

  // 处理文档更新
  const handleDocumentUpdate = useCallback((event: CollaborationEvent) => {
    const currentUser = getCurrentUser();
    if (event.userId !== currentUser.id) {
      message.info(`${event.userName} 更新了文档`, 2);
    }
  }, []);

  // 处理文档删除
  const handleDocumentDelete = useCallback((event: CollaborationEvent) => {
    const currentUser = getCurrentUser();
    if (event.userId !== currentUser.id) {
      message.warning(`${event.userName} 删除了文档`, 3);
    }
  }, []);

  // 处理文档创建
  const handleDocumentCreate = useCallback((event: CollaborationEvent) => {
    const currentUser = getCurrentUser();
    if (event.userId !== currentUser.id) {
      message.success(`${event.userName} 创建了新文档`, 2);
    }
  }, []);

  // 处理光标位置
  const handleCursorPosition = useCallback((event: CollaborationEvent) => {
    if (!event.data?.position) return;

    setState(prev => ({
      ...prev,
      onlineUsers: prev.onlineUsers.map(u => 
        u.id === event.userId 
          ? { ...u, cursorPosition: event.data.position }
          : u
      )
    }));
  }, []);

  // 处理选择变化
  const handleSelectionChange = useCallback((event: CollaborationEvent) => {
    // 处理文本选择变化
  }, []);

  // 开始心跳
  const startHeartbeat = useCallback(() => {
    heartbeatTimeoutRef.current = setInterval(() => {
      sendEvent({
        type: 'user_join', // 使用user_join作为心跳
        data: {
          heartbeat: true,
          timestamp: Date.now()
        }
      });
    }, heartbeatInterval);
  }, [sendEvent, heartbeatInterval]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
    }
  }, []);

  // 锁定文档
  const lockDocument = useCallback((documentId: number) => {
    return sendEvent({
      type: 'document_lock',
      documentId,
      data: {
        lockTimeout
      }
    });
  }, [sendEvent, lockTimeout]);

  // 解锁文档
  const unlockDocument = useCallback((documentId: number) => {
    return sendEvent({
      type: 'document_unlock',
      documentId,
      data: {}
    });
  }, [sendEvent]);

  // 检查文档是否被锁定
  const isDocumentLocked = useCallback((documentId: number): DocumentLock | null => {
    const lock = state.documentLocks.get(documentId);
    if (!lock) return null;

    // 检查锁是否过期
    if (Date.now() > lock.expiresAt) {
      setState(prev => {
        const newLocks = new Map(prev.documentLocks);
        newLocks.delete(documentId);
        return {
          ...prev,
          documentLocks: newLocks
        };
      });
      return null;
    }

    return lock;
  }, [state.documentLocks]);

  // 添加事件监听器
  const addEventListener = useCallback((type: CollaborationEventType, listener: Function) => {
    const listeners = eventListenersRef.current.get(type) || [];
    listeners.push(listener);
    eventListenersRef.current.set(type, listeners);

    // 返回移除监听器的函数
    return () => {
      const currentListeners = eventListenersRef.current.get(type) || [];
      const index = currentListeners.indexOf(listener);
      if (index > -1) {
        currentListeners.splice(index, 1);
        eventListenersRef.current.set(type, currentListeners);
      }
    };
  }, []);

  // 组件挂载时连接
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    // 状态
    ...state,
    
    // 控制方法
    connect,
    disconnect,
    
    // 事件方法
    sendEvent,
    addEventListener,
    
    // 文档锁定方法
    lockDocument,
    unlockDocument,
    isDocumentLocked,
    
    // 工具方法
    getOnlineUserCount: () => state.onlineUsers.length,
    isUserOnline: (userId: string) => state.onlineUsers.some(u => u.id === userId),
    getRecentEvents: (count = 10) => state.events.slice(-count),
    
    // 连接质量检查
    checkConnectionQuality: () => {
      if (!state.connected) return 'disconnected';
      
      const recentEvents = state.events.slice(-5);
      const avgLatency = recentEvents.reduce((sum, event) => {
        return sum + (Date.now() - event.timestamp);
      }, 0) / recentEvents.length;
      
      if (avgLatency < 100) return 'excellent';
      if (avgLatency < 500) return 'good';
      return 'poor';
    }
  };
};

// 工具函数
const getCurrentUser = () => {
  // 这里应该从全局状态或context获取当前用户信息
  return {
    id: 'current-user-id',
    name: '当前用户',
    avatar: ''
  };
};

const generateEventId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default useRealtimeCollaboration;