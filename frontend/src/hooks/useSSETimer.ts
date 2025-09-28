/**
 * useSSETimer Hook
 * 用于管理SSE计时器连接和事件处理的React Hook
 * 
 * 功能：
 * - 自动管理SSE连接生命周期
 * - 处理SSE事件并转换为TimerState
 * - 提供连接状态和错误信息
 * - 与现有TimerContext集成
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { sseTimerService, SSETimerEvent, SSEConnectionStatus } from '../services/sseTimerService';
import { TimerCurrentResponse } from '../types/timer';

// SSE事件到TimerState的转换接口
export interface SSETimerState {
  isRunning: boolean;
  isPaused: boolean;
  taskId?: number;
  taskTitle?: string;
  taskType?: string;
  projectId?: number;
  startTime?: Date;
  elapsedSeconds: number;
  formattedTime: string;
}

// Hook配置选项
export interface UseSSETimerOptions {
  // 是否自动连接
  autoConnect?: boolean;
  // 是否启用调试日志
  debug?: boolean;
  // 事件处理回调
  onTimerUpdate?: (timerState: SSETimerState) => void;
  onConnectionStatusChange?: (status: SSEConnectionStatus, error?: string) => void;
  // 降级回调（SSE失败时）
  onFallbackToPolling?: () => void;
}

export function useSSETimer(options: UseSSETimerOptions = {}) {
  const {
    autoConnect = true,
    debug = false,
    onTimerUpdate,
    onConnectionStatusChange,
    onFallbackToPolling,
  } = options;
  
  // 状态管理
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Refs for cleanup and callback management
  const isMountedRef = useRef(true);
  const onTimerUpdateRef = useRef(onTimerUpdate);
  const onConnectionStatusChangeRef = useRef(onConnectionStatusChange);
  const onFallbackToPollingRef = useRef(onFallbackToPolling);
  
  // 更新回调refs
  onTimerUpdateRef.current = onTimerUpdate;
  onConnectionStatusChangeRef.current = onConnectionStatusChange;
  onFallbackToPollingRef.current = onFallbackToPolling;
  
  /**
   * 将SSE事件数据转换为TimerState格式
   */
  const convertSSEEventToTimerState = useCallback((event: SSETimerEvent): SSETimerState => {
    if (debug) {
      console.log('useSSETimer: Converting SSE event to timer state', event);
    }
    
    // 根据事件类型处理数据
    switch (event.type) {
      case 'timer_start':
      case 'timer_update':
        if (event.data && typeof event.data === 'object' && 'is_running' in event.data) {
          const data = event.data;
          return {
            isRunning: data.is_running || false,
            isPaused: data.is_paused || false,
            taskId: data.target_id || undefined,
            taskTitle: data.target_title || undefined,
            taskType: data.target_type || undefined,
            projectId: data.project_id || undefined,
            startTime: data.start_time ? new Date(data.start_time) : undefined,
            elapsedSeconds: data.elapsed_seconds || 0,
            formattedTime: data.formatted_time || '00:00:00',
          };
        }
        break;
        
      case 'timer_stop':
        return {
          isRunning: false,
          isPaused: false,
          taskId: undefined,
          taskTitle: undefined,
          taskType: undefined,
          projectId: undefined,
          startTime: undefined,
          elapsedSeconds: 0,
          formattedTime: '00:00:00',
        };
        
      case 'timer_pause':
        if (event.data && typeof event.data === 'object') {
          const data = event.data;
          return {
            isRunning: true,
            isPaused: true,
            taskId: data.target_id || undefined,
            taskTitle: data.target_title || undefined,
            taskType: data.target_type || undefined,
            projectId: data.project_id || undefined,
            startTime: data.start_time ? new Date(data.start_time) : undefined,
            elapsedSeconds: data.elapsed_seconds || 0,
            formattedTime: data.formatted_time || '00:00:00',
          };
        }
        break;
        
      case 'timer_resume':
        if (event.data && typeof event.data === 'object') {
          const data = event.data;
          return {
            isRunning: true,
            isPaused: false,
            taskId: data.target_id || undefined,
            taskTitle: data.target_title || undefined,
            taskType: data.target_type || undefined,
            projectId: data.project_id || undefined,
            startTime: data.start_time ? new Date(data.start_time) : undefined,
            elapsedSeconds: data.elapsed_seconds || 0,
            formattedTime: data.formatted_time || '00:00:00',
          };
        }
        break;
    }
    
    // 默认返回停止状态
    return {
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      formattedTime: '00:00:00',
    };
  }, [debug]);
  
  /**
   * SSE事件处理器
   */
  const handleSSEEvent = useCallback((event: SSETimerEvent) => {
    if (!isMountedRef.current || !isEnabled) return;
    
    if (debug) {
      console.log('useSSETimer: Received SSE event', event);
    }
    
    try {
      // 只处理计时器相关事件
      const timerEvents = ['timer_start', 'timer_stop', 'timer_pause', 'timer_resume', 'timer_update'];
      if (timerEvents.includes(event.type)) {
        const timerState = convertSSEEventToTimerState(event);
        
        // 通知回调
        if (onTimerUpdateRef.current) {
          onTimerUpdateRef.current(timerState);
        }
      }
    } catch (error) {
      console.error('useSSETimer: Error handling SSE event', error);
      setLastError(`Event handling error: ${error}`);
    }
  }, [convertSSEEventToTimerState, debug, isEnabled]);
  
  /**
   * 连接状态处理器
   */
  const handleConnectionStatus = useCallback((status: SSEConnectionStatus, error?: string) => {
    if (!isMountedRef.current) return;
    
    if (debug) {
      console.log('useSSETimer: Connection status changed', status, error);
    }
    
    setConnectionStatus(status);
    setLastError(error || null);
    
    // 通知回调
    if (onConnectionStatusChangeRef.current) {
      onConnectionStatusChangeRef.current(status, error);
    }
    
    // 如果SSE连接失败且达到最大重试次数，触发降级
    if (status === 'error' && error && error.includes('Max reconnection')) {
      if (onFallbackToPollingRef.current) {
        onFallbackToPollingRef.current();
      }
    }
  }, [debug]);
  
  /**
   * 连接SSE服务
   */
  const connect = useCallback(() => {
    if (!isEnabled) return;
    
    if (debug) {
      console.log('useSSETimer: Connecting to SSE service');
    }
    
    sseTimerService.connect();
  }, [debug, isEnabled]);
  
  /**
   * 断开SSE连接
   */
  const disconnect = useCallback(() => {
    if (debug) {
      console.log('useSSETimer: Disconnecting from SSE service');
    }
    
    sseTimerService.disconnect();
  }, [debug]);
  
  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    if (!isEnabled) return;
    
    if (debug) {
      console.log('useSSETimer: Manual reconnect triggered');
    }
    
    sseTimerService.reconnect();
  }, [debug, isEnabled]);
  
  /**
   * 启用/禁用SSE
   */
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    
    if (enabled && autoConnect) {
      connect();
    } else if (!enabled) {
      disconnect();
    }
  }, [autoConnect, connect, disconnect]);
  
  /**
   * 更新认证token
   */
  const updateAuthToken = useCallback((token: string) => {
    if (debug) {
      console.log('useSSETimer: Updating auth token');
    }
    
    sseTimerService.updateAuthToken(token);
  }, [debug]);
  
  // 组件挂载时设置监听器和自动连接
  useEffect(() => {
    if (debug) {
      console.log('useSSETimer: Setting up SSE listeners');
    }
    
    // 添加事件监听器
    sseTimerService.addEventListener(handleSSEEvent);
    sseTimerService.addStatusListener(handleConnectionStatus);
    
    // 自动连接
    if (autoConnect && isEnabled) {
      connect();
    }
    
    // 清理函数
    return () => {
      if (debug) {
        console.log('useSSETimer: Cleaning up SSE listeners');
      }
      
      sseTimerService.removeEventListener(handleSSEEvent);
      sseTimerService.removeStatusListener(handleConnectionStatus);
    };
  }, [handleSSEEvent, handleConnectionStatus, autoConnect, connect, debug, isEnabled]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, disconnect]);
  
  // 页面可见性变化时的处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isMountedRef.current || !isEnabled) return;
      
      if (document.visibilityState === 'visible' && connectionStatus === 'disconnected') {
        if (debug) {
          console.log('useSSETimer: Page visible, attempting to reconnect');
        }
        setTimeout(() => {
          if (isMountedRef.current && isEnabled) {
            connect();
          }
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionStatus, connect, debug, isEnabled]);
  
  return {
    // 状态
    connectionStatus,
    lastError,
    isConnected: connectionStatus === 'connected',
    isEnabled,
    
    // 方法
    connect,
    disconnect,
    reconnect,
    setEnabled,
    updateAuthToken,
    
    // 服务实例（用于高级用法）
    sseService: sseTimerService,
  };
}

export default useSSETimer;