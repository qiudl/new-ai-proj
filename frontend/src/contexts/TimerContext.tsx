import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import TimerService from '../services/timerService';
import { TimerCurrentResponse } from '../types/timer';

interface TimerState {
  isRunning: boolean;
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
  
  // 操作方法
  startTimer: (taskId: number, taskTitle: string) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
  refreshTimer: () => Promise<void>;
  
  // 事件回调
  onTimerUpdate?: (isRunning: boolean, taskTitle?: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

interface TimerProviderProps {
  children: React.ReactNode;
  onTimerUpdate?: (isRunning: boolean, taskTitle?: string) => void;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ 
  children, 
  onTimerUpdate 
}) => {
  // 状态管理 - 从localStorage初始化
  const [timerState, setTimerState] = useState<TimerState>(() => {
    try {
      const saved = localStorage.getItem('globalTimerState');
      if (saved) {
        const parsedState = JSON.parse(saved);
        console.log('TimerContext: 从localStorage恢复状态:', parsedState);
        return {
          isRunning: parsedState.isRunning || false,
          taskId: parsedState.taskId,
          taskTitle: parsedState.taskTitle,
          startTime: parsedState.startTime ? new Date(parsedState.startTime) : undefined,
          elapsedSeconds: parsedState.elapsedSeconds || 0,
          formattedTime: parsedState.formattedTime || '00:00:00'
        };
      }
    } catch (error) {
      console.warn('TimerContext: 无法从localStorage恢复状态:', error);
    }
    return {
      isRunning: false,
      elapsedSeconds: 0,
      formattedTime: '00:00:00'
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
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
    if (newState.isRunning && newState.startTime) {
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

  // 初始化和定期刷新
  useEffect(() => {
    // 初始加载
    refreshTimer();
    
    // 定期刷新 (每30秒)
    refreshIntervalRef.current = setInterval(() => {
      if (!timerState.isRunning) {
        refreshTimer();
      }
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshTimer, timerState.isRunning]);

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

  const value: TimerContextType = {
    timerState,
    isLoading,
    connectionStatus,
    startTimer,
    stopTimer,
    refreshTimer,
    onTimerUpdate
  };

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