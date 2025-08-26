import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message } from 'antd';
import TimerService from '../services/timerService';
import { personalTimerService, PersonalTimerCurrent } from '../services/personalTimerService';
import { TimerCurrentResponse } from '../types/timer';
import { AppError, ErrorType } from '../utils/errorTypes';

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
  
  // 🎯 新增：模式配置
  mode: 'full' | 'simplified';
  setMode: (mode: 'full' | 'simplified') => void;
  
  // 操作方法
startTimer: (taskId: number, taskTitle: string, taskType?: 'personal' | 'project', options?: { autoStopOthers?: boolean }) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
  pauseTimer: () => Promise<boolean>;
  resumeTimer: () => Promise<boolean>;
  refreshTimer: () => Promise<void>;
  
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

  // 从服务器加载当前定时器状态
  const refreshTimer = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // 离线检测：若浏览器检测为离线，则直接进入本地恢复逻辑，避免无效请求与控制台噪音
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setConnectionStatus('disconnected');
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
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // 网络类错误降级为警告，减少控制台噪音
      if (error instanceof AppError && error.type === ErrorType.NETWORK) {
        console.warn('网络异常，刷新计时器失败，将尝试使用本地状态:', error.message);
      } else {
        console.error('Failed to refresh timer:', error);
      }
      setConnectionStatus('disconnected');
      
      // 尝试从localStorage恢复
      restoreFromLocalStorage();
    }
  }, [updateTimerFromResponse, startLocalTimer, restoreFromLocalStorage]);

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

  // 启动定时器
const startTimer = useCallback(async (taskId: number, taskTitle: string, taskType: 'personal' | 'project' = 'personal', options?: { autoStopOthers?: boolean }): Promise<boolean> => {
    if (isLoading) return false;
    
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
  }, [isLoading, refreshTimer]);

  // 停止定时器
  const stopTimer = useCallback(async (): Promise<boolean> => {
    if (isLoading || !timerState.isRunning) return false;
    
    setIsLoading(true);
    try {
      // 🔧 使用personalTimerService停止Timer 2.0
      const response = await personalTimerService.stopTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时结束: ${timerState.taskTitle} (${timerState.formattedTime})`);
      
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
      // 🔧 使用personalTimerService暂停Timer
      const response = await personalTimerService.pauseTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时已暂停: ${response.task_title || response.message}`);
      
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
    if (isLoading || timerState.isRunning || !timerState.isPaused) return false;
    
    setIsLoading(true);
    try {
      // 🔧 使用personalTimerService恢复Timer
      const response = await personalTimerService.resumeTimer();
      
      if (!isMountedRef.current) return false;
      
      message.success(`计时已恢复: ${response.task_title || response.message}`);
      
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

  // 🎯 新增：判断指定任务是否正在计时
  const isTaskTiming = useCallback((taskId: number, taskType: string): boolean => {
    const normalize = (t?: string) => (t ? t.replace('_task', '') : t);
    return (
      timerState.isRunning && 
      !timerState.isPaused &&
      timerState.taskId === taskId &&
      normalize(timerState.taskType) === normalize(taskType)
    );
  }, [timerState.isRunning, timerState.isPaused, timerState.taskId, timerState.taskType]);

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
        }
        
      } catch (error) {
        console.error('初始化定时器失败:', error);
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };
    
    initializeTimerState();
    
    // 定期刷新 (每30秒) - 只在没有运行定时器时刷新
    refreshIntervalRef.current = setInterval(() => {
      if (!mounted) return;
      
      // 从localStorage检查最新状态，而不是依赖state
      try {
        const saved = localStorage.getItem('globalTimerState');
        if (!saved || !JSON.parse(saved).isRunning) {
          refreshTimer();
        }
      } catch (error) {
        // 忽略JSON解析错误，继续刷新
        refreshTimer();
      }
    }, 30000);

    return () => {
      mounted = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

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
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []); // 空依赖数组，只在真正挂载/卸载时执行

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
    // 🎯 新增：任务计时判断工具函数
    isTaskTiming,
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