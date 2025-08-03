// useUnifiedTimer Hook - 统一计时器状态管理
// 任务#243: 前端通用组件开发 - 统一计时器Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { unifiedTimerService } from '../services/unifiedTimerService';
import type { TimerStatus, TimerSuggestion, TimerTemplate, StartTimerRequest } from '../types/timer';

interface UseUnifiedTimerReturn {
  // 状态
  currentTimer: TimerStatus | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  localElapsedSeconds: number;
  
  // 操作
  startTimer: (request: StartTimerRequest) => Promise<any>;
  pauseTimer: () => Promise<any>;
  resumeTimer: () => Promise<any>;
  stopTimer: () => Promise<any>;
  getCurrentStatus: () => Promise<TimerStatus | null>;
  
  // 数据获取
  getSuggestions: () => Promise<TimerSuggestion[]>;
  getTemplates: () => Promise<TimerTemplate[]>;
  getRecentTasks: (limit?: number) => Promise<any[]>;
  
  // 状态
  loading: boolean;
  error: string | null;
}

export const useUnifiedTimer = (): UseUnifiedTimerReturn => {
  // 核心状态
  const [currentTimer, setCurrentTimer] = useState<TimerStatus | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [localElapsedSeconds, setLocalElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 本地计时器引用
  const localTimerRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // 派生状态
  const isRunning = currentTimer?.status === 'running';
  const isPaused = currentTimer?.status === 'paused';

  // 初始化：获取当前计时器状态
  useEffect(() => {
    initializeTimer();
    startPolling();

    return () => {
      stopLocalTimer();
      stopPolling();
    };
  }, []);

  // 本地计时器更新
  useEffect(() => {
    if (isRunning && !isPaused) {
      startLocalTimer();
    } else {
      stopLocalTimer();
    }

    return () => stopLocalTimer();
  }, [isRunning, isPaused]);

  const initializeTimer = async () => {
    try {
      await getCurrentStatus();
    } catch (err) {
      console.error('初始化计时器失败:', err);
    }
  };

  const startLocalTimer = () => {
    stopLocalTimer();
    lastUpdateRef.current = Date.now();
    
    localTimerRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = Math.floor((now - lastUpdateRef.current) / 1000);
      
      if (deltaSeconds >= 1) {
        setLocalElapsedSeconds(prev => prev + deltaSeconds);
        lastUpdateRef.current = now;
      }
    }, 1000);
  };

  const stopLocalTimer = () => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
      localTimerRef.current = undefined;
    }
  };

  const startPolling = () => {
    // 每30秒同步一次服务器状态
    pollIntervalRef.current = setInterval(() => {
      if (isRunning) {
        getCurrentStatus();
      }
    }, 30000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = undefined;
    }
  };

  const setLoadingError = (isLoading: boolean, errorMsg: string | null = null) => {
    setLoading(isLoading);
    setError(errorMsg);
  };

  const calculateElapsedSeconds = (timer: TimerStatus): number => {
    if (!timer.start_time) return 0;
    
    const startTime = new Date(timer.start_time).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    
    // 减去暂停时间
    const pauseSeconds = timer.pause_total_seconds || 0;
    return Math.max(0, elapsed - pauseSeconds);
  };

  const updateTimerState = (timer: TimerStatus | null) => {
    setCurrentTimer(timer);
    
    if (timer) {
      const serverElapsed = calculateElapsedSeconds(timer);
      setElapsedSeconds(serverElapsed);
      setLocalElapsedSeconds(serverElapsed);
      lastUpdateRef.current = Date.now();
    } else {
      setElapsedSeconds(0);
      setLocalElapsedSeconds(0);
    }
  };

  // API 操作方法
  const startTimer = useCallback(async (request: StartTimerRequest) => {
    setLoadingError(true);
    
    try {
      const response = await unifiedTimerService.startTimer(request);
      
      if (response.success) {
        await getCurrentStatus(); // 重新获取状态
        message.success('计时器启动成功');
        return response;
      } else {
        throw new Error(response.message || '启动失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '启动计时器失败';
      setLoadingError(false, errorMsg);
      message.error(errorMsg);
      throw err;
    } finally {
      setLoadingError(false);
    }
  }, []);

  const pauseTimer = useCallback(async () => {
    setLoadingError(true);
    
    try {
      const response = await unifiedTimerService.pauseTimer();
      
      if (response.success) {
        await getCurrentStatus();
        message.info('计时器已暂停');
        return response;
      } else {
        throw new Error(response.message || '暂停失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '暂停计时器失败';
      setLoadingError(false, errorMsg);
      message.error(errorMsg);
      throw err;
    } finally {
      setLoadingError(false);
    }
  }, []);

  const resumeTimer = useCallback(async () => {
    setLoadingError(true);
    
    try {
      const response = await unifiedTimerService.resumeTimer();
      
      if (response.success) {
        await getCurrentStatus();
        message.success('计时器已恢复');
        return response;
      } else {
        throw new Error(response.message || '恢复失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '恢复计时器失败';
      setLoadingError(false, errorMsg);
      message.error(errorMsg);
      throw err;
    } finally {
      setLoadingError(false);
    }
  }, []);

  const stopTimer = useCallback(async () => {
    setLoadingError(true);
    
    try {
      const response = await unifiedTimerService.stopTimer();
      
      if (response.success) {
        updateTimerState(null); // 清除计时器状态
        message.success('计时器已停止');
        return response;
      } else {
        throw new Error(response.message || '停止失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '停止计时器失败';
      setLoadingError(false, errorMsg);
      message.error(errorMsg);
      throw err;
    } finally {
      setLoadingError(false);
    }
  }, []);

  const getCurrentStatus = useCallback(async (): Promise<TimerStatus | null> => {
    try {
      const response = await unifiedTimerService.getCurrentTimer();
      
      if (response.success && response.data) {
        updateTimerState(response.data);
        setError(null);
        return response.data;
      } else {
        updateTimerState(null);
        return null;
      }
    } catch (err) {
      console.error('获取计时器状态失败:', err);
      setError(err instanceof Error ? err.message : '获取状态失败');
      return null;
    }
  }, []);

  // 数据获取方法
  const getSuggestions = useCallback(async (): Promise<TimerSuggestion[]> => {
    try {
      const response = await unifiedTimerService.getSuggestions();
      return response.success ? response.data || [] : [];
    } catch (err) {
      console.error('获取建议失败:', err);
      return [];
    }
  }, []);

  const getTemplates = useCallback(async (): Promise<TimerTemplate[]> => {
    try {
      const response = await unifiedTimerService.getTemplates();
      return response.success ? response.data || [] : [];
    } catch (err) {
      console.error('获取模板失败:', err);
      return [];
    }
  }, []);

  const getRecentTasks = useCallback(async (limit: number = 10): Promise<any[]> => {
    try {
      const response = await unifiedTimerService.getRecentTasks(limit);
      return response.success ? response.data || [] : [];
    } catch (err) {
      console.error('获取最近任务失败:', err);
      return [];
    }
  }, []);

  return {
    // 状态
    currentTimer,
    isRunning,
    isPaused,
    elapsedSeconds: isRunning ? localElapsedSeconds : elapsedSeconds,
    localElapsedSeconds,
    
    // 操作
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getCurrentStatus,
    
    // 数据获取
    getSuggestions,
    getTemplates,
    getRecentTasks,
    
    // 状态
    loading,
    error
  };
};