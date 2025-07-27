import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import TimerService from '../services/timerService';

// 🎯 MVP版定时器 - 简化的状态接口
interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  taskId?: number;
  taskTitle?: string;
  startTime?: Date;
  elapsedSeconds: number;
  formattedTime: string;
}

// 🎯 MVP版定时器 - 简化的Context接口
interface SimplifiedTimerContextType {
  // 基本状态
  timerState: TimerState;
  isLoading: boolean;
  
  // 核心操作
  startTimer: (taskId: number, taskTitle: string) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
  pauseTimer: () => Promise<boolean>;
  resumeTimer: () => Promise<boolean>;
  
  // 调试功能
  getDebugInfo: () => any;
}

const SimplifiedTimerContext = createContext<SimplifiedTimerContextType | undefined>(undefined);

interface SimplifiedTimerProviderProps {
  children: React.ReactNode;
}

export const SimplifiedTimerProvider: React.FC<SimplifiedTimerProviderProps> = ({ children }) => {
  // 🎯 简化的状态管理 - 只保留基本状态
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    formattedTime: '00:00:00'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  // 基本的refs
  const isMountedRef = useRef(true);
  const localTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🎯 简化的时间格式化
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 🎯 简化的本地计时器
  const startLocalTimer = useCallback(() => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
    }
    
    localTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setTimerState(prev => {
        if (!prev.isRunning || !prev.startTime || prev.isPaused) return prev;
        
        const elapsed = Math.floor((Date.now() - prev.startTime.getTime()) / 1000);
        return {
          ...prev,
          elapsedSeconds: elapsed,
          formattedTime: formatTime(elapsed)
        };
      });
    }, 1000);
  }, [formatTime]);

  const stopLocalTimer = useCallback(() => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
      localTimerRef.current = null;
    }
  }, []);

  // 🎯 简化的API调用 - 启动定时器
  const startTimer = useCallback(async (taskId: number, taskTitle: string): Promise<boolean> => {
    if (isLoading) return false;
    
    setIsLoading(true);
    try {
      const response = await TimerService.startTimer(taskId);
      
      if (!isMountedRef.current) return false;
      
      const newState: TimerState = {
        isRunning: true,
        isPaused: false,
        taskId,
        taskTitle,
        startTime: new Date(),
        elapsedSeconds: 0,
        formattedTime: '00:00:00'
      };
      
      setTimerState(newState);
      startLocalTimer();
      
      message.success(`开始计时: ${taskTitle}`);
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
  }, [isLoading, startLocalTimer]);

  // 🎯 简化的API调用 - 停止定时器
  const stopTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning) return false;
    
    setIsLoading(true);
    try {
      await TimerService.stopTimer();
      
      if (!isMountedRef.current) return false;
      
      const finalTime = timerState.formattedTime;
      const taskTitle = timerState.taskTitle;
      
      setTimerState({
        isRunning: false,
        isPaused: false,
        elapsedSeconds: 0,
        formattedTime: '00:00:00'
      });
      
      stopLocalTimer();
      
      message.success(`计时结束: ${taskTitle} (${finalTime})`);
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
  }, [isLoading, timerState.isRunning, timerState.formattedTime, timerState.taskTitle, stopLocalTimer]);

  // 🎯 暂停定时器 - 调用后端API
  const pauseTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning || timerState.isPaused) return false;
    
    setIsLoading(true);
    try {
      await TimerService.pauseTimer();
      
      if (!isMountedRef.current) return false;
      
      stopLocalTimer();
      setTimerState(prev => ({
        ...prev,
        isPaused: true
      }));
      message.success('计时已暂停');
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
  }, [isLoading, timerState.isRunning, timerState.isPaused, stopLocalTimer]);

  const resumeTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning || !timerState.isPaused) return false;
    
    setIsLoading(true);
    try {
      await TimerService.resumeTimer();
      
      if (!isMountedRef.current) return false;
      
      // 重新计算开始时间，保持已经计时的时间
      const newStartTime = new Date(Date.now() - (timerState.elapsedSeconds * 1000));
      
      setTimerState(prev => ({
        ...prev,
        isPaused: false,
        startTime: newStartTime
      }));
      
      // 延迟启动本地计时器，确保状态已更新
      setTimeout(() => {
        startLocalTimer();
      }, 50);
      message.success('计时已恢复');
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
  }, [isLoading, timerState.isRunning, timerState.isPaused, timerState.elapsedSeconds, startLocalTimer]);

  // 🎯 调试信息
  const getDebugInfo = useCallback(() => {
    return {
      timerState,
      isLoading,
      hasLocalTimer: !!localTimerRef.current,
      isMounted: isMountedRef.current,
      timestamp: new Date().toISOString()
    };
  }, [timerState, isLoading]);

  // 🎯 初始化时同步后端状态
  useEffect(() => {
    const syncInitialState = async () => {
      try {
        const currentTimer = await TimerService.getCurrentTimer();
        
        if (!isMountedRef.current) return;
        
        if (currentTimer.is_running) {
          const startTime = new Date(currentTimer.start_time!);
          const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
          
          const newState: TimerState = {
            isRunning: true,
            isPaused: currentTimer.is_paused || false,
            taskId: currentTimer.task_id,
            taskTitle: currentTimer.task_title,
            startTime: startTime,
            elapsedSeconds: elapsedSeconds,
            formattedTime: formatTime(elapsedSeconds)
          };
          
          setTimerState(newState);
          
          // 如果未暂停，启动本地计时器
          if (!currentTimer.is_paused) {
            startLocalTimer();
          }
        }
      } catch (error) {
        console.error('Failed to sync initial timer state:', error);
        // 不显示错误消息，静默处理
      }
    };
    
    syncInitialState();
  }, [formatTime, startLocalTimer]);

  // 🎯 简化的清理逻辑 - 防止内存泄漏
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopLocalTimer();
      // 清理所有可能的定时器
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current);
        localTimerRef.current = null;
      }
    };
  }, [stopLocalTimer]);

  const value: SimplifiedTimerContextType = {
    timerState,
    isLoading,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    getDebugInfo
  };

  return (
    <SimplifiedTimerContext.Provider value={value}>
      {children}
    </SimplifiedTimerContext.Provider>
  );
};

// 🎯 简化的Hook
export const useSimplifiedTimer = (): SimplifiedTimerContextType => {
  const context = useContext(SimplifiedTimerContext);
  if (context === undefined) {
    throw new Error('useSimplifiedTimer must be used within a SimplifiedTimerProvider');
  }
  return context;
};

export default SimplifiedTimerContext;