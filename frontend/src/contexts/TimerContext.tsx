import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message } from 'antd';
import TimerService from '../services/timerService';
import { TimerCurrentResponse } from '../types/timer';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean; // 🎯 统一为必需字段，兼容SimplifiedTimer
  taskId?: number;
  taskTitle?: string;
  startTime?: Date;
  elapsedSeconds: number;
  formattedTime: string;
}

interface TimerContextType {
  // 状态
  timerState: TimerState;
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  
  // 🎯 新增：模式配置
  mode: 'full' | 'simplified';
  setMode: (mode: 'full' | 'simplified') => void;
  
  // 操作方法
  startTimer: (taskId: number, taskTitle: string) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
  pauseTimer: () => Promise<boolean>;
  resumeTimer: () => Promise<boolean>;
  refreshTimer: () => Promise<void>;
  
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
  // 状态管理 - 从localStorage初始化
  const [timerState, setTimerState] = useState<TimerState>(() => {
    try {
      const saved = localStorage.getItem('globalTimerState');
      if (saved) {
        const parsedState = JSON.parse(saved);
        // 从localStorage恢复状态
        
        // 如果定时器正在运行，重新计算经过时间
        let elapsedSeconds = parsedState.elapsedSeconds || 0;
        let formattedTime = parsedState.formattedTime || '00:00:00';
        
        if (parsedState.isRunning && parsedState.startTime) {
          const startTime = new Date(parsedState.startTime);
          const currentElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
          elapsedSeconds = currentElapsed;
          
          const hours = Math.floor(currentElapsed / 3600);
          const minutes = Math.floor((currentElapsed % 3600) / 60);
          const seconds = currentElapsed % 60;
          formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        return {
          isRunning: parsedState.isRunning || false,
          isPaused: parsedState.isPaused || false,
          taskId: parsedState.taskId,
          taskTitle: parsedState.taskTitle,
          startTime: parsedState.startTime ? new Date(parsedState.startTime) : undefined,
          elapsedSeconds,
          formattedTime
        };
      }
    } catch (error) {
      console.warn('TimerContext: 无法从localStorage恢复状态:', error);
    }
    return {
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      formattedTime: '00:00:00'
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // 🎯 新增：模式状态管理
  const [currentMode, setCurrentMode] = useState<'full' | 'simplified'>(mode);
  
  // Refs for cleanup and performance
  const isMountedRef = useRef(true);
  const localTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimerUpdateRef = useRef(onTimerUpdate);
  onTimerUpdateRef.current = onTimerUpdate;

  // 本地计时器更新
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

  // 更新定时器状态从API响应
  const updateTimerFromResponse = useCallback((response: TimerCurrentResponse) => {
    if (!isMountedRef.current) return;
    
    const newState: TimerState = {
      isRunning: response.is_running,
      isPaused: response.is_paused || false,
      taskId: response.task_id,
      taskTitle: response.task_title,
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

  // 从服务器加载当前定时器状态
  const refreshTimer = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setConnectionStatus('checking');
      const response = await TimerService.getCurrentTimer();
      
      if (!isMountedRef.current) return;
      
      updateTimerFromResponse(response);
      setConnectionStatus('connected');
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Failed to refresh timer:', error);
      setConnectionStatus('disconnected');
      
      // 尝试从localStorage恢复
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
    }
  }, [updateTimerFromResponse, startLocalTimer]);

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

    const errors = [];
    
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

  // 启动定时器
  const startTimer = useCallback(async (taskId: number, taskTitle: string): Promise<boolean> => {
    if (isLoading) return false;
    
    setIsLoading(true);
    try {
      const response = await TimerService.startTimer(taskId);
      
      if (!isMountedRef.current) return false;
      
      message.success(`开始计时: ${response.task_title}`);
      
      // 立即刷新状态
      await refreshTimer();
      
      return true;
    } catch (error) {
      if (!isMountedRef.current) return false;
      
      console.error('Failed to start timer:', error);
      message.error('启动定时器失败');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, refreshTimer]);

  // 停止定时器
  const stopTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning) return false;
    
    setIsLoading(true);
    try {
      const response = await TimerService.stopTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时结束: ${response.task_title} (${response.formatted_time})`);
      
      // 立即刷新状态
      await refreshTimer();
      
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
  }, [isLoading, timerState.isRunning, refreshTimer]);

  // 暂停定时器
  const pauseTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning || timerState.isPaused) return false;
    
    setIsLoading(true);
    try {
      const response = await TimerService.pauseTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时已暂停: ${response.task_title}`);
      
      // 立即刷新状态
      await refreshTimer();
      
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
  }, [isLoading, timerState.isRunning, timerState.isPaused, refreshTimer]);

  // 恢复定时器
  const resumeTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning || !timerState.isPaused) return false;
    
    setIsLoading(true);
    try {
      const response = await TimerService.resumeTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时已恢复: ${response.task_title}`);
      
      // 立即刷新状态
      await refreshTimer();
      
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
  }, [isLoading, timerState.isRunning, timerState.isPaused, refreshTimer]);

  // 初始化（只运行一次）
  useEffect(() => {
    // 初始加载
    refreshTimer();
    
    // 定期刷新 (每30秒) - 只在没有运行定时器时刷新
    refreshIntervalRef.current = setInterval(() => {
      // 从localStorage检查最新状态，而不是依赖state
      const saved = localStorage.getItem('globalTimerState');
      if (!saved || !JSON.parse(saved).isRunning) {
        refreshTimer();
      }
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshTimer]);

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

  // 页面可见性变化处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) return;
      
      if (document.hidden) {
        // 页面隐藏时停止本地更新
        stopLocalTimer();
      } else if (timerState.isRunning && timerState.startTime) {
        // 页面显示时恢复并同步
        refreshTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerState.isRunning, timerState.startTime, refreshTimer, stopLocalTimer]);

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

  // 组件卸载清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopLocalTimer();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [stopLocalTimer]);

  const value: TimerContextType = useMemo(() => ({
    timerState,
    isLoading,
    // 🎯 简化模式下优化连接状态 (减少网络检查)
    connectionStatus: currentMode === 'simplified' ? 'connected' : connectionStatus,
    // 🎯 新增：模式配置
    mode: currentMode,
    setMode: setCurrentMode,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    refreshTimer,
    // 🎯 新增：调试功能
    getDebugInfo,
    onTimerUpdate
  }), [
    timerState,
    isLoading,
    connectionStatus,
    currentMode,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    refreshTimer,
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