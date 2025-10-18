import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message } from 'antd';
import TimerService from '../services/timerService';
import { personalTimerService, PersonalTimerCurrent } from '../services/personalTimerService';
import { TimerCurrentResponse } from '../types/timer';
import { AppError, ErrorType } from '../utils/errorTypes';
import useSSETimer, { SSETimerState } from '../hooks/useSSETimer';
import { SSEConnectionStatus } from '../services/sseTimerService';

// 🎯 SSE计时器配置常量 - 大幅简化轮询配置
const TIMER_REFRESH_CONFIG = {
  // 🔧 SSE降级轮询配置（仅SSE失败时使用）
  FALLBACK_POLL_INTERVAL: 30000,   // SSE失败后的降级轮询间隔（30秒）
  VISIBILITY_CHANGE_DELAY: 2000,   // 页面可见性变化后2秒刷新
  MAX_RETRY_ATTEMPTS: 3,            // 最大重试次数
  
  // 🆕 SSE特定配置
  SSE_ENABLED: true,               // 是否启用SSE
  SSE_DEBUG: process.env.NODE_ENV === 'development', // SSE调试模式
  
  // 🔧 保留最小必要的跨标签页同步配置
  CROSS_TAB_SYNC_INTERVAL: 5000,  // 跨标签页状态同步间隔（增加到5秒）
  
  // 🆕 添加缺失的刷新间隔常量
  ACTIVE_TIMER_INTERVAL: 5000,    // 活动计时器刷新间隔（5秒）
  INACTIVE_TIMER_INTERVAL: 30000, // 非活动计时器刷新间隔（30秒）
  NETWORK_ERROR_INTERVAL: 15000,  // 网络错误时的刷新间隔（15秒）
  REALTIME_SIMULATION_INTERVAL: 1000, // 准实时模拟间隔（1秒）
};

interface TimerState {
  isRunning: boolean;
  isPaused: boolean; // 🎯 统一为必需字段，兼容SimplifiedTimer
  taskId?: number;
  taskTitle?: string;
  taskType?: string; // 🎯 新增：任务类型 (project_task, personal_task, etc.)
  projectId?: number; // 🎯 新增：项目ID (如果是项目任务)
  startTime?: Date;
  elapsedSeconds: number;
  formattedTime: string;
}

interface TimerContextType {
  // 状态
  timerState: TimerState;
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  
  // 🎯 SSE连接状态
  sseConnectionStatus: SSEConnectionStatus;
  sseEnabled: boolean;
  sseError: string | null;
  
  // 🎯 新增：模式配置
  mode: 'full' | 'simplified';
  setMode: (mode: 'full' | 'simplified') => void;
  
  // 操作方法
startTimer: (taskId: number, taskTitle: string, taskType?: 'personal' | 'project', options?: { autoStopOthers?: boolean }) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
  pauseTimer: () => Promise<boolean>;
  resumeTimer: () => Promise<boolean>;
  refreshTimer: () => Promise<void>;
  
  // 🆕 新增：乐观更新方法
  optimisticStartTimer: (taskId: number, taskTitle: string, taskType?: 'personal' | 'project') => void;
  optimisticStopTimer: () => void;
  optimisticPauseTimer: () => void;
  optimisticResumeTimer: () => void;
  
  // 🎯 SSE控制方法
  toggleSSE: (enabled: boolean) => void;
  reconnectSSE: () => void;
  triggerEventDrivenRefresh: () => void;
  
  // 🎯 新增：任务计时判断工具函数
  isTaskTiming: (taskId: number, taskType: string) => boolean;
  
  // 🎯 新增：简化模式专用功能 (兼容SimplifiedTimer)
  getDebugInfo: () => any;
  
  // 事件回调
  onTimerUpdate?: (isRunning: boolean, taskTitle?: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

interface TimerProviderProps {
  children: React.ReactNode;
  mode?: 'full' | 'simplified'; // 🎯 新增：模式配置
  onTimerUpdate?: (isRunning: boolean, taskTitle?: string) => void;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ 
  children, 
  mode = 'full', // 🎯 默认为完整模式
  onTimerUpdate 
}) => {
  // 状态管理 - 修复组件挂载问题
  const [timerState, setTimerState] = useState<TimerState>(() => {
    // 初始化时使用默认状态，避免复杂计算
    return {
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      formattedTime: '00:00:00'
    };
  });
  
  // 单独的初始化效果，避免挂载时阻塞
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // 🎯 SSE状态管理 - 替代复杂轮询逻辑
  const [sseEnabled, setSSEEnabled] = useState(TIMER_REFRESH_CONFIG.SSE_ENABLED);
  const [fallbackMode, setFallbackMode] = useState(false); // 是否处于降级模式
  
  // 🔧 保留最小必要的轮询状态（仅SSE失败时使用）
  const [retryAttempts, setRetryAttempts] = useState(0);
  
  // 🆕 动态刷新间隔状态管理
  const [currentRefreshInterval, setCurrentRefreshInterval] = useState(TIMER_REFRESH_CONFIG.FALLBACK_POLL_INTERVAL);
  
  // 🆕 准实时模拟状态管理
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  
  // 🆕 乐观更新状态管理
  const [optimisticState, setOptimisticState] = useState<Partial<TimerState> | null>(null);
  const optimisticTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🔧 简化的跨标签页同步（保留基本功能）
  const crossTabSyncRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  
  // 🔧 降级轮询相关 refs（仅SSE失败时使用）
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventDrivenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🎯 新增：模式状态管理
  const [currentMode, setCurrentMode] = useState<'full' | 'simplified'>(mode);
  
  // Refs for cleanup and performance
  const isMountedRef = useRef(true);
  const localTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimerUpdateRef = useRef(onTimerUpdate);
  onTimerUpdateRef.current = onTimerUpdate;

  // 本地计时器更新 - moved to the very beginning to prevent hoisting issues
  const startLocalTimer = useCallback((startTime: Date) => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
    }
    
    localTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const formatted = TimerService.formatDuration(elapsed);
      
      setTimerState(prev => ({
        ...prev,
        elapsedSeconds: elapsed,
        formattedTime: formatted
      }));
    }, 1000);
  }, []);

  // 停止本地计时器
  const stopLocalTimer = useCallback(() => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
      localTimerRef.current = null;
    }
  }, []);

  // 🆕 乐观更新工具函数
  const clearOptimisticState = useCallback(() => {
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
      optimisticTimeoutRef.current = null;
    }
    setOptimisticState(null);
  }, []);

  // 广播计时器状态变化到其他标签页
  const broadcastTimerChange = useCallback((action: string, data?: any) => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'timer-state-change',
          action,
          data,
          timestamp: Date.now()
        });
        console.log('📡 Broadcasted timer change:', action);
      }
    } catch (error) {
      console.warn('Failed to broadcast timer change:', error);
    }
  }, []);

  // 🎯 降级轮询管理 - early declaration to prevent hoisting issues
  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) return; // 避免重复启动
    
    console.log('TimerContext: Starting fallback polling');
    
    const performFallbackRequest = async () => {
      if (!isMountedRef.current || !fallbackMode) return;
      
      try {
        // This will be resolved when refreshTimer is available via effect
        console.log('TimerContext: Fallback polling - placeholder for refresh call');
      } catch (error) {
        console.warn('TimerContext: Fallback polling request failed', error);
      }
    };
    
    // 立即执行一次
    performFallbackRequest();
    
    // 设置定期轮询
    fallbackIntervalRef.current = setInterval(
      performFallbackRequest, 
      TIMER_REFRESH_CONFIG.FALLBACK_POLL_INTERVAL
    );
  }, [fallbackMode]);
  
  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
      
      if (TIMER_REFRESH_CONFIG.SSE_DEBUG) {
        console.log('TimerContext: Stopped fallback polling');
      }
    }
  }, []);
  
  // 🎯 SSE集成 - 处理SSE事件更新
  const handleSSETimerUpdate = useCallback((sseTimerState: SSETimerState) => {
    if (!isMountedRef.current) return;
    
    if (TIMER_REFRESH_CONFIG.SSE_DEBUG) {
      console.log('TimerContext: Received SSE timer update', sseTimerState);
    }
    
    // 转换SSE状态为TimerState
    const newTimerState: TimerState = {
      isRunning: sseTimerState.isRunning,
      isPaused: sseTimerState.isPaused,
      taskId: sseTimerState.taskId,
      taskTitle: sseTimerState.taskTitle,
      taskType: sseTimerState.taskType,
      projectId: sseTimerState.projectId,
      startTime: sseTimerState.startTime,
      elapsedSeconds: sseTimerState.elapsedSeconds,
      formattedTime: sseTimerState.formattedTime,
    };
    
    // 更新状态
    setTimerState(newTimerState);
    setConnectionStatus('connected');
    setFallbackMode(false);
    
    // 通知回调
    if (onTimerUpdateRef.current) {
      onTimerUpdateRef.current(newTimerState.isRunning, newTimerState.taskTitle);
    }
    
    // 管理本地计时器
    if (newTimerState.isRunning && newTimerState.startTime && !newTimerState.isPaused) {
      startLocalTimer(newTimerState.startTime);
    } else {
      stopLocalTimer();
    }
    
    // 保存到localStorage
    try {
      localStorage.setItem('globalTimerState', JSON.stringify({
        ...newTimerState,
        startTime: newTimerState.startTime?.toISOString(),
        lastSync: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save timer state:', error);
    }
    
    // 清除乐观更新状态
    clearOptimisticState();
    
    // 🔧 跨标签页同步
    broadcastTimerChange('sse-update', { 
      taskId: newTimerState.taskId, 
      taskTitle: newTimerState.taskTitle,
      isRunning: newTimerState.isRunning 
    });
    
  }, [startLocalTimer, stopLocalTimer, clearOptimisticState, broadcastTimerChange]);
  
  // 🎯 SSE连接状态处理
  const handleSSEConnectionStatus = useCallback((status: SSEConnectionStatus, error?: string) => {
    if (!isMountedRef.current) return;
    
    if (TIMER_REFRESH_CONFIG.SSE_DEBUG) {
      console.log('TimerContext: SSE connection status changed', status, error);
    }
    
    switch (status) {
      case 'connected':
        setConnectionStatus('connected');
        setFallbackMode(false);
        stopFallbackPolling();
        break;
        
      case 'disconnected':
      case 'error':
        setConnectionStatus('disconnected');
        break;
        
      case 'connecting':
      case 'reconnecting':
        setConnectionStatus('checking');
        break;
    }
  }, [stopFallbackPolling]);
  
  // 🎯 SSE降级处理
  const handleSSEFallback = useCallback(() => {
    if (!isMountedRef.current) return;
    
    console.warn('TimerContext: SSE failed, falling back to polling');
    setFallbackMode(true);
    setConnectionStatus('disconnected');
    
    // 启动降级轮询
    startFallbackPolling();
  }, [startFallbackPolling]);
  

  // 🎯 使用SSE Hook
  const {
    connectionStatus: sseConnectionStatus,
    lastError: sseError,
    isConnected: sseConnected,
    isEnabled: sseHookEnabled,
    connect: connectSSE,
    disconnect: disconnectSSE,
    reconnect: reconnectSSE,
    setEnabled: setSSEHookEnabled,
    updateAuthToken: updateSSEAuthToken,
  } = useSSETimer({
    autoConnect: sseEnabled,
    debug: TIMER_REFRESH_CONFIG.SSE_DEBUG,
    onTimerUpdate: handleSSETimerUpdate,
    onConnectionStatusChange: handleSSEConnectionStatus,
    onFallbackToPolling: handleSSEFallback,
  });

  // 更新定时器状态从API响应
  const updateTimerFromResponse = useCallback((response: TimerCurrentResponse) => {
    if (!isMountedRef.current) return;
    
    const newState: TimerState = {
      isRunning: response.is_running,
      isPaused: response.is_paused || false,
      taskId: response.task_id,
      taskTitle: response.task_title,
      taskType: response.task_type, // 🎯 从backend透传taskType
      projectId: response.project_id, // 🎯 从backend透传projectId
      startTime: response.start_time ? new Date(response.start_time) : undefined,
      elapsedSeconds: response.elapsed_seconds,
      formattedTime: response.formatted_time
    };

    setTimerState(newState);
    
    // 通知回调
    if (onTimerUpdateRef.current) {
      onTimerUpdateRef.current(newState.isRunning, newState.taskTitle);
    }

    // 管理本地计时器
    if (newState.isRunning && newState.startTime && !newState.isPaused) {
      startLocalTimer(newState.startTime);
    } else {
      stopLocalTimer();
    }
    
    // 保存到localStorage
    try {
      localStorage.setItem('globalTimerState', JSON.stringify({
        ...newState,
        startTime: newState.startTime?.toISOString(),
        lastSync: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save timer state:', error);
    }
  }, [startLocalTimer, stopLocalTimer]);

  // 本地恢复函数（离线或失败时）
  const restoreFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('globalTimerState');
      if (saved) {
        const parsedState = JSON.parse(saved);
        const lastSync = new Date(parsedState.lastSync);
        const timeSinceSync = (Date.now() - lastSync.getTime()) / 1000;
        
        // 如果同步时间不超过5分钟，恢复状态
        if (timeSinceSync < 300 && parsedState.isRunning) {
          setTimerState({
            ...parsedState,
            startTime: parsedState.startTime ? new Date(parsedState.startTime) : undefined
          });
          
          if (parsedState.startTime) {
            startLocalTimer(new Date(parsedState.startTime));
          }
          
          message.warning('网络连接异常，已恢复本地计时状态');
        }
      }
    } catch (restoreError) {
      console.warn('Failed to restore timer state:', restoreError);
    }
  }, [startLocalTimer]);

  // 🆕 智能刷新间隔计算
  const calculateRefreshInterval = useCallback(() => {
    try {
      const saved = localStorage.getItem('globalTimerState');
      if (!saved) return TIMER_REFRESH_CONFIG.INACTIVE_TIMER_INTERVAL;
      
      const parsedState = JSON.parse(saved);
      return parsedState.isRunning 
        ? TIMER_REFRESH_CONFIG.ACTIVE_TIMER_INTERVAL 
        : TIMER_REFRESH_CONFIG.INACTIVE_TIMER_INTERVAL;
    } catch {
      return TIMER_REFRESH_CONFIG.INACTIVE_TIMER_INTERVAL;
    }
  }, []);

  // 🆕 动态更新刷新间隔
  const updateRefreshInterval = useCallback((newInterval?: number) => {
    const interval = newInterval || calculateRefreshInterval();
    if (interval !== currentRefreshInterval) {
      setCurrentRefreshInterval(interval);
      console.log(`🔄 Timer refresh interval updated to: ${interval}ms`);
    }
  }, [currentRefreshInterval, calculateRefreshInterval]);


  // 🆕 应用乐观更新
  const applyOptimisticUpdate = useCallback((updates: Partial<TimerState>, revertAfterMs: number = 10000) => {
    setOptimisticState(updates);
    
    // 清除现有的恢复定时器
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }
    
    // 设置自动恢复定时器，防止乐观更新永远不被清除
    optimisticTimeoutRef.current = setTimeout(() => {
      console.warn('🔄 Optimistic update timeout, clearing optimistic state');
      setOptimisticState(null);
    }, revertAfterMs);
    
    console.log('🚀 Applied optimistic update:', updates);
  }, []);

  // 🆕 计算最终显示的状态（合并实际状态和乐观更新）
  const finalTimerState = useMemo(() => {
    if (!optimisticState) return timerState;
    
    return {
      ...timerState,
      ...optimisticState
    };
  }, [timerState, optimisticState]);

  // 🆕 阶段4：准实时推送核心功能
  
  // 初始化BroadcastChannel用于跨标签页通信 - 🔧 移除refreshTimer依赖避免循环
  const initBroadcastChannel = useCallback(() => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      
      broadcastChannelRef.current = new BroadcastChannel('timer-sync');
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'timer-state-change') {
          console.log('🔄 Received cross-tab timer sync:', event.data);
          // 延迟一点刷新，避免与发送者冲突 - 使用异步调用
          setTimeout(() => {
            // 这里会在refreshTimer定义后调用
            if (isMountedRef.current) {
              refreshTimer();
            }
          }, TIMER_REFRESH_CONFIG.CROSS_TAB_SYNC_INTERVAL / 2);
        }
      };
    } catch (error) {
      console.warn('BroadcastChannel not supported:', error);
    }
  }, []);


  // 启用准实时模拟 - 🔧 移除refreshTimer依赖避免循环  
  const enableRealtimeSimulation = useCallback(() => {
    setRealtimeEnabled(true);
    
    // 启动准实时刷新（更高频率的轮询）
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
    }
    
    realtimeIntervalRef.current = setInterval(() => {
      if (finalTimerState.isRunning) {
        // 异步调用refreshTimer
        if (isMountedRef.current) {
          refreshTimer();
        }
      }
    }, TIMER_REFRESH_CONFIG.REALTIME_SIMULATION_INTERVAL);
    
  }, [finalTimerState.isRunning]);

  // 禁用准实时模拟
  const disableRealtimeSimulation = useCallback(() => {
    setRealtimeEnabled(false);
    
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
    
  }, []);

  // 从服务器加载当前定时器状态 - moved before first use
  const refreshTimer = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // 离线检测：若浏览器检测为离线，则直接进入本地恢复逻辑，避免无效请求与控制台噪音
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setConnectionStatus('disconnected');
      // 🆕 网络错误时使用错误重试间隔
      updateRefreshInterval(TIMER_REFRESH_CONFIG.NETWORK_ERROR_INTERVAL);
      restoreFromLocalStorage();
      return;
    }

    try {
      setConnectionStatus('checking');
      // 🔧 使用personalTimerService获取Timer 2.0状态
      const response = await personalTimerService.getCurrentTimer();
      
      if (!isMountedRef.current) return;
      
      // 检查响应是否为空
      if (!response) {
        // 当没有活动计时器时，设置默认状态
        const emptyResponse: TimerCurrentResponse = {
          is_running: false,
          is_paused: false,
          task_id: undefined,
          task_title: undefined,
          start_time: undefined,
          elapsed_seconds: 0,
          formatted_time: '00:00:00'
        };
        updateTimerFromResponse(emptyResponse);
        setConnectionStatus('connected');
        // 🆕 无计时器时使用较长间隔
        updateRefreshInterval(TIMER_REFRESH_CONFIG.INACTIVE_TIMER_INTERVAL);
        setRetryAttempts(0); // 重置重试次数
        
        // 🆕 清除乐观更新状态
        clearOptimisticState();
        return;
      }

      // 转换PersonalTimerCurrent到TimerCurrentResponse格式
      const convertedResponse: TimerCurrentResponse = {
        is_running: response.is_running,
        is_paused: response.is_paused || false,
        task_id: response.target_id,
        task_title: response.target_title,
        task_type: response.target_type, // 🎯 透传taskType (backend中为target_type)
        project_id: response.project_id, // 🎯 透传projectId (如果backend提供)
        start_time: response.start_time,
        elapsed_seconds: response.elapsed_seconds,
        formatted_time: response.formatted_time || TimerService.formatDuration(response.elapsed_seconds)
      };
      
      updateTimerFromResponse(convertedResponse);
      setConnectionStatus('connected');
      // 🆕 根据计时器运行状态动态调整刷新间隔
      const newInterval = convertedResponse.is_running 
        ? TIMER_REFRESH_CONFIG.ACTIVE_TIMER_INTERVAL 
        : TIMER_REFRESH_CONFIG.INACTIVE_TIMER_INTERVAL;
      updateRefreshInterval(newInterval);
      setRetryAttempts(0); // 重置重试次数
      
      // 🆕 清除乐观更新状态（服务器状态已获取到）
      clearOptimisticState();
      
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // 🆕 增加重试逻辑
      const newRetryAttempts = retryAttempts + 1;
      setRetryAttempts(newRetryAttempts);
      
      // 网络类错误降级为警告，减少控制台噪音
      if (error instanceof AppError && error.type === ErrorType.NETWORK) {
        console.warn(`网络异常，刷新计时器失败 (重试${newRetryAttempts}/${TIMER_REFRESH_CONFIG.MAX_RETRY_ATTEMPTS})，将尝试使用本地状态:`, error.message);
      } else {
        console.error('Failed to refresh timer:', error);
      }
      setConnectionStatus('disconnected');
      
      // 🆕 错误时使用网络错误间隔
      updateRefreshInterval(TIMER_REFRESH_CONFIG.NETWORK_ERROR_INTERVAL);
      
      // 尝试从localStorage恢复
      restoreFromLocalStorage();
    }
  }, [updateTimerFromResponse, startLocalTimer, restoreFromLocalStorage, updateRefreshInterval, retryAttempts, clearOptimisticState]);

  // 🎯 SSE增强的事件驱动刷新
  const triggerEventDrivenRefresh = useCallback(() => {
    // 如果SSE已连接，不需要手动刷新
    if (sseConnected) {
      if (TIMER_REFRESH_CONFIG.SSE_DEBUG) {
        console.log('TimerContext: SSE connected, skipping manual refresh');
      }
      // 仍然广播给其他标签页
      broadcastTimerChange('event-driven-refresh');
      return;
    }
    
    // SSE未连接时才使用轮询刷新
    if (fallbackMode) {
      // 清除现有的延迟刷新
      if (eventDrivenTimeoutRef.current) {
        clearTimeout(eventDrivenTimeoutRef.current);
      }
      
      // 延迟执行刷新，避免频繁调用
      eventDrivenTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          refreshTimer();
        }
        // 广播给其他标签页
        broadcastTimerChange('event-driven-refresh');
      }, TIMER_REFRESH_CONFIG.VISIBILITY_CHANGE_DELAY);
    }
  }, [sseConnected, fallbackMode, refreshTimer, broadcastTimerChange]);

  // 🎯 新增：调试信息获取 (兼容SimplifiedTimer)
  const getDebugInfo = useCallback(() => {
    const localStorageState = (() => {
      try {
        const saved = localStorage.getItem('globalTimerState');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return 'Error parsing localStorage';
      }
    })();

    const errors: string[] = [];
    
    // 检查常见问题
    if (timerState.isRunning && !timerState.startTime) {
      errors.push('定时器运行中但缺少开始时间');
    }
    
    if (timerState.isRunning && timerState.isPaused) {
      errors.push('定时器状态冲突：同时运行和暂停');
    }
    
    if (!timerState.isRunning && localTimerRef.current) {
      errors.push('定时器已停止但本地计时器仍在运行');
    }
    
    if (connectionStatus === 'disconnected' && timerState.isRunning) {
      errors.push('网络断开但定时器仍显示运行状态');
    }

    return {
      // 基本状态
      timerState,
      isLoading,
      connectionStatus,
      mode: currentMode,
      
      // 内部状态
      hasLocalTimer: !!localTimerRef.current,
      intervalId: localTimerRef.current ? 'active' : 'inactive',
      isMounted: isMountedRef.current,
      
      // 本地存储状态
      hasLocalStorage: !!localStorageState,
      localStorageState,
      localStorageSync: localStorageState ? {
        lastSync: localStorageState.lastSync,
        isValid: localStorageState.lastSync && (Date.now() - new Date(localStorageState.lastSync).getTime()) < 300000 // 5分钟内
      } : null,
      
      // 错误检测
      errors,
      errorCount: errors.length,
      
      // 性能信息
      lastSync: new Date().toISOString(),
      uptime: timerState.startTime ? Date.now() - new Date(timerState.startTime).getTime() : 0,
      
      // 简化模式特定信息
      ...(currentMode === 'simplified' && {
        simplifiedMode: true,
        debugMode: process.env.NODE_ENV === 'development'
      }),
      
      // 时间戳
      timestamp: new Date().toISOString()
    };
  }, [timerState, isLoading, connectionStatus, currentMode]);

  // 🆕 乐观更新操作方法
  const optimisticStartTimer = useCallback((taskId: number, taskTitle: string, taskType: 'personal' | 'project' = 'personal') => {
    const now = new Date();
    applyOptimisticUpdate({
      isRunning: true,
      isPaused: false,
      taskId,
      taskTitle,
      taskType,
      startTime: now,
      elapsedSeconds: 0,
      formattedTime: '00:00:00'
    });
    
    // 立即启动本地计时器以显示时间增长
    startLocalTimer(now);
  }, [applyOptimisticUpdate, startLocalTimer]);

  const optimisticStopTimer = useCallback(() => {
    applyOptimisticUpdate({
      isRunning: false,
      isPaused: false,
      taskId: undefined,
      taskTitle: undefined,
      taskType: undefined,
      startTime: undefined
    });
    
    // 停止本地计时器
    stopLocalTimer();
  }, [applyOptimisticUpdate, stopLocalTimer]);

  const optimisticPauseTimer = useCallback(() => {
    applyOptimisticUpdate({
      isPaused: true
    });
    
    // 停止本地计时器
    stopLocalTimer();
  }, [applyOptimisticUpdate, stopLocalTimer]);

  const optimisticResumeTimer = useCallback(() => {
    applyOptimisticUpdate({
      isPaused: false,
      startTime: new Date() // 重新设置开始时间
    });
    
    // 重新启动本地计时器
    if (finalTimerState.startTime) {
      startLocalTimer(finalTimerState.startTime);
    }
  }, [applyOptimisticUpdate, startLocalTimer, finalTimerState]);

  // 启动定时器 - 🆕 集成乐观更新
const startTimer = useCallback(async (taskId: number, taskTitle: string, taskType: 'personal' | 'project' = 'personal', options?: { autoStopOthers?: boolean }): Promise<boolean> => {
    if (isLoading) return false;
    
    // 🆕 立即应用乐观更新
    optimisticStartTimer(taskId, taskTitle, taskType);
    
    setIsLoading(true);
    try {
      let response;
      if (taskType === 'project') {
        // 启动项目任务计时
        response = await personalTimerService.startProjectTimer({
          task_type: 'project',
          task_id: taskId,
          title: taskTitle,
          context: 'dashboard',
          ...(typeof options?.autoStopOthers === 'boolean' ? { auto_stop_others: options.autoStopOthers } : {})
        });
        } else {
        // 启动个人任务计时
        response = await personalTimerService.startPersonalTimer({
          task_type: 'personal',
          task_id: taskId,
          title: taskTitle,
          context: 'dashboard',
          ...(typeof options?.autoStopOthers === 'boolean' ? { auto_stop_others: options.autoStopOthers } : {})
        });
        }
      
      if (!isMountedRef.current) return false;
      
      message.success(`开始计时: ${taskTitle}`);
      
      // 立即刷新状态
      await refreshTimer();
      
      // 🆕 阶段4：广播计时器启动事件
      broadcastTimerChange('start', { taskId, taskTitle, taskType });
      
      return true;
    } catch (error) {
      if (!isMountedRef.current) return false;
      
      console.error('❌ Failed to start timer:', error);
      console.error('❌ Error details:', {
        taskId,
        taskTitle,
        taskType,
        error: error instanceof Error ? error.message : error
      });
      message.error('启动定时器失败');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, refreshTimer, optimisticStartTimer, broadcastTimerChange]);

  // 停止定时器 - 🆕 集成乐观更新
  const stopTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning) return false;
    
    // 🆕 立即应用乐观更新
    optimisticStopTimer();
    
    setIsLoading(true);
    try {
      // 🔧 使用personalTimerService停止Timer 2.0
      const response = await personalTimerService.stopTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时结束: ${timerState.taskTitle} (${timerState.formattedTime})`);
      
      // 立即刷新状态
      await refreshTimer();
      
      // 🆕 阶段4：广播计时器停止事件
      broadcastTimerChange('stop', { taskTitle: timerState.taskTitle });
      
      return true;
    } catch (error) {
      if (!isMountedRef.current) return false;
      
      console.error('Failed to stop timer:', error);
      message.error('停止定时器失败');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, timerState.isRunning, refreshTimer, optimisticStopTimer, broadcastTimerChange]);

  // 暂停定时器 - 🆕 集成乐观更新
  const pauseTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning || timerState.isPaused) return false;
    
    // 🆕 立即应用乐观更新
    optimisticPauseTimer();
    
    setIsLoading(true);
    try {
      // 🔧 使用personalTimerService暂停Timer
      const response = await personalTimerService.pauseTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时已暂停: ${response.task_title || response.message}`);
      
      // 立即刷新状态
      await refreshTimer();
      
      // 🆕 阶段4：广播计时器暂停事件
      broadcastTimerChange('pause', { taskTitle: response.task_title });
      
      return true;
    } catch (error) {
      if (!isMountedRef.current) return false;
      
      console.error('Failed to pause timer:', error);
      message.error('暂停定时器失败');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, timerState.isRunning, timerState.isPaused, refreshTimer, optimisticPauseTimer, broadcastTimerChange]);

  // 恢复定时器 - 🆕 集成乐观更新
  const resumeTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || timerState.isRunning || !timerState.isPaused) return false;
    
    // 🆕 立即应用乐观更新
    optimisticResumeTimer();
    
    setIsLoading(true);
    try {
      // 🔧 使用personalTimerService恢复Timer
      const response = await personalTimerService.resumeTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时已恢复: ${response.task_title || response.message}`);
      
      // 立即刷新状态
      await refreshTimer();
      
      // 🆕 阶段4：广播计时器恢复事件
      broadcastTimerChange('resume', { taskTitle: response.task_title });
      
      return true;
    } catch (error) {
      if (!isMountedRef.current) return false;
      
      console.error('Failed to resume timer:', error);
      message.error('恢复定时器失败');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, timerState.isRunning, timerState.isPaused, refreshTimer, optimisticResumeTimer, broadcastTimerChange]);

  // 🎯 新增：判断指定任务是否正在计时 - 🆕 使用最终状态
  const isTaskTiming = useCallback((taskId: number, taskType: string): boolean => {
    const normalize = (t?: string) => (t ? t.replace('_task', '') : t);
    return (
      finalTimerState.isRunning && 
      !finalTimerState.isPaused &&
      finalTimerState.taskId === taskId &&
      normalize(finalTimerState.taskType) === normalize(taskType)
    );
  }, [finalTimerState.isRunning, finalTimerState.isPaused, finalTimerState.taskId, finalTimerState.taskType]);
  
  // 🎯 SSE控制方法
  const toggleSSE = useCallback((enabled: boolean) => {
    setSSEEnabled(enabled);
    setSSEHookEnabled(enabled);
    
    if (enabled && !sseConnected) {
      connectSSE();
    } else if (!enabled && sseConnected) {
      disconnectSSE();
      // 启动降级轮询
      setFallbackMode(true);
      startFallbackPolling();
    }
  }, [setSSEHookEnabled, sseConnected, connectSSE, disconnectSSE, startFallbackPolling]);
  
  const reconnectSSEHandler = useCallback(() => {
    if (sseEnabled) {
      reconnectSSE();
    }
  }, [sseEnabled, reconnectSSE]);
  

  // 💡 修复：分离初始化和状态恢复
  useEffect(() => {
    let mounted = true;
    
    const initializeTimerState = async () => {
      try {
        // 首先尝试从localStorage恢复状态
        const saved = localStorage.getItem('globalTimerState');
        if (saved && mounted) {
          try {
            const parsedState = JSON.parse(saved);
            const lastSync = new Date(parsedState.lastSync || Date.now());
            const timeSinceSync = (Date.now() - lastSync.getTime()) / 1000;
            
            // 如果同步时间在5分钟内，认为状态有效
            if (timeSinceSync < 300) {
              let elapsedSeconds = parsedState.elapsedSeconds || 0;
              let formattedTime = parsedState.formattedTime || '00:00:00';
              
              // 重新计算运行时间
              if (parsedState.isRunning && parsedState.startTime) {
                const startTime = new Date(parsedState.startTime);
                const currentElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
                elapsedSeconds = currentElapsed;
                formattedTime = TimerService.formatDuration(currentElapsed);
              }
              
              const restoredState = {
                isRunning: parsedState.isRunning || false,
                isPaused: parsedState.isPaused || false,
                taskId: parsedState.taskId,
                taskTitle: parsedState.taskTitle,
                taskType: parsedState.taskType, // include taskType to avoid fallback scanning
                projectId: parsedState.projectId, // include projectId when available
                startTime: parsedState.startTime ? new Date(parsedState.startTime) : undefined,
                elapsedSeconds,
                formattedTime,
              };
              
              setTimerState(restoredState);
              
              // 如果定时器在运行，启动本地计时器
              if (restoredState.isRunning && restoredState.startTime && !restoredState.isPaused) {
                startLocalTimer(restoredState.startTime);
              }
            }
          } catch (error) {
            console.warn('恢复定时器状态失败:', error);
          }
        }
        
        // 然后从服务器获取最新状态
        if (mounted) {
          await refreshTimer();
        }
        
        if (mounted) {
          setIsInitialized(true);
          // 🆕 阶段4：初始化准实时推送功能
          initBroadcastChannel();
          if (realtimeEnabled) {
            enableRealtimeSimulation();
          }
        }
        
      } catch (error) {
        console.error('初始化定时器失败:', error);
        if (mounted) {
          setIsInitialized(true);
          // 🆕 阶段4：即使出错也要初始化实时功能
          initBroadcastChannel();
        }
      }
    };
    
    initializeTimerState();
    
    // 🆕 智能动态刷新 - 根据计时器状态使用不同的刷新间隔
    const startDynamicRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      const scheduleRefresh = () => {
        if (!mounted) return;
        
        refreshIntervalRef.current = setTimeout(() => {
          if (!mounted) return;
          
          // 检查是否需要刷新
          try {
            const saved = localStorage.getItem('globalTimerState');
            const hasRunningTimer = saved && JSON.parse(saved).isRunning;
            
            // 有运行计时器时也要定期刷新以确保同步
            refreshTimer().finally(() => {
              if (mounted) {
                scheduleRefresh(); // 递归调度下一次刷新
              }
            });
          } catch (error) {
            // 忽略JSON解析错误，继续刷新
            refreshTimer().finally(() => {
              if (mounted) {
                scheduleRefresh(); // 递归调度下一次刷新
              }
            });
          }
        }, currentRefreshInterval);
      };
      
      scheduleRefresh();
    };
    
    startDynamicRefresh();

    return () => {
      mounted = false;
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current); // 🆕 更改为clearTimeout
        refreshIntervalRef.current = null;
      }
      // 🆕 阶段4：清理准实时推送资源
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [initBroadcastChannel, enableRealtimeSimulation]);

  // 🆕 监听刷新间隔变化并重新调度
  // 移除 refreshTimer 依赖避免无限循环
  useEffect(() => {
    if (!isInitialized) return;

    // 注意：这里不需要主动调度，因为 startDynamicRefresh 已经在初始化时启动了
    // 只在间隔变化时记录日志
    if (TIMER_REFRESH_CONFIG.SSE_DEBUG) {
      console.log(`Refresh interval changed to: ${currentRefreshInterval}ms`);
    }
  }, [currentRefreshInterval, isInitialized]);

  // 单独处理本地计时器的启动和停止
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime && !timerState.isPaused) {
      // 启动本地计时器
      startLocalTimer(timerState.startTime);
    } else {
      // 停止本地计时器
      stopLocalTimer();
    }
  }, [timerState.isRunning, timerState.startTime, timerState.isPaused, startLocalTimer, stopLocalTimer]);

  // 页面可见性变化处理 - 🆕 集成动态刷新间隔
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) return;
      
      if (document.hidden) {
        // 页面隐藏时停止本地更新
        stopLocalTimer();
      } else {
        // 页面显示时恢复并同步
        // 🆕 延迟一段时间后刷新，避免频繁切换
        setTimeout(() => {
          if (isMountedRef.current) {
            refreshTimer();
          }
        }, TIMER_REFRESH_CONFIG.VISIBILITY_CHANGE_DELAY);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshTimer, stopLocalTimer]);

  // 跨页面/标签页同步 - 监听localStorage变化
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (!isMountedRef.current) return;
      
      // 只处理我们关心的timer状态变化
      if (event.key === 'globalTimerState' && event.newValue !== event.oldValue) {
        try {
          if (event.newValue) {
            const newState = JSON.parse(event.newValue);
            // 检测到其他页面的计时器状态变化
            
            // 更新本地状态以同步其他页面的更改
            setTimerState({
              isRunning: newState.isRunning || false,
              isPaused: newState.isPaused || false,
              taskId: newState.taskId,
              taskTitle: newState.taskTitle,
              taskType: newState.taskType, // 🎯 同步taskType
              projectId: newState.projectId, // 🎯 同步projectId
              startTime: newState.startTime ? new Date(newState.startTime) : undefined,
              elapsedSeconds: newState.elapsedSeconds || 0,
              formattedTime: newState.formattedTime || '00:00:00'
            });

            // 通知回调
            if (onTimerUpdateRef.current) {
              onTimerUpdateRef.current(newState.isRunning, newState.taskTitle);
            }

            // 管理本地计时器
            if (newState.isRunning && newState.startTime && !newState.isPaused) {
              startLocalTimer(new Date(newState.startTime));
            } else {
              stopLocalTimer();
            }
          } else {
            // localStorage被清除，重置状态
            // 计时器状态已在其他页面清除
            setTimerState({
              isRunning: false,
              isPaused: false,
              elapsedSeconds: 0,
              formattedTime: '00:00:00'
            });
            stopLocalTimer();
            
            if (onTimerUpdateRef.current) {
              onTimerUpdateRef.current(false);
            }
          }
        } catch (error) {
          console.warn('TimerContext: 处理跨页面同步失败:', error);
        }
      }
    };

    // 添加storage事件监听器
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [startLocalTimer, stopLocalTimer]);

  // 组件挂载状态管理 - 确保只在真正卸载时才设置为false
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      stopLocalTimer();
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current); // 🆕 更改为clearTimeout
        refreshIntervalRef.current = null;
      }
      // 🆕 清理乐观更新状态
      clearOptimisticState();
      // 🆕 阶段4：清理所有准实时推送资源
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
      if (eventDrivenTimeoutRef.current) {
        clearTimeout(eventDrivenTimeoutRef.current);
        eventDrivenTimeoutRef.current = null;
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, []); // 空依赖数组，只在真正挂载/卸载时执行

  const value: TimerContextType = useMemo(() => ({
    timerState: finalTimerState, // 🆕 使用最终状态（包含乐观更新）
    isLoading,
    // 🎯 简化模式下优化连接状态 (减少网络检查)
    connectionStatus: currentMode === 'simplified' ? 'connected' : connectionStatus,
    
    // 🎯 SSE连接状态
    sseConnectionStatus,
    sseEnabled,
    sseError,
    
    // 🎯 新增：模式配置
    mode: currentMode,
    setMode: setCurrentMode,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    refreshTimer,
    // 🆕 新增：乐观更新方法
    optimisticStartTimer,
    optimisticStopTimer,
    optimisticPauseTimer,
    optimisticResumeTimer,
    
    // 🎯 SSE控制方法
    toggleSSE,
    reconnectSSE: reconnectSSEHandler,
    triggerEventDrivenRefresh,
    
    // 🎯 新增：任务计时判断工具函数
    isTaskTiming,
    // 🎯 新增：调试功能
    getDebugInfo,
    onTimerUpdate
  }), [
    finalTimerState, // 🆕 使用最终状态
    isLoading,
    connectionStatus,
    // 🎯 SSE状态依赖
    sseConnectionStatus,
    sseEnabled,
    sseError,
    currentMode,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    refreshTimer,
    // 🆕 添加乐观更新方法依赖
    optimisticStartTimer,
    optimisticStopTimer,
    optimisticPauseTimer,
    optimisticResumeTimer,
    // 🎯 SSE控制方法依赖
    toggleSSE,
    reconnectSSEHandler,
    triggerEventDrivenRefresh,
    isTaskTiming,
    getDebugInfo,
    onTimerUpdate
  ]);

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};

// Hook for using timer context
export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export default TimerContext;