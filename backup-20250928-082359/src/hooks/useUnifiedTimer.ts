// useUnifiedTimer Hook - 统一计时器状态管理
// 任务#243: 前端通用组件开发 - 统一计时器Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { unifiedTimerService } from '../services/unifiedTimerService';
import type { TimerStatus, TimerSuggestion, TimerTemplate, StartTimerRequest } from '../types/timer';

interface UseUnifiedTimerReturn {
  // 状态
  currentTimer: TimerStatus | null;
  activeTimers: TimerStatus[];
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  localElapsedSeconds: number;
  
  // 操作（当前计时器）
  startTimer: (request: StartTimerRequest) => Promise<any>;
  pauseTimer: () => Promise<any>;
  resumeTimer: () => Promise<any>;
  stopTimer: () => Promise<any>;
  getCurrentStatus: () => Promise<TimerStatus | null>;

  // 并行计时：列表与按ID操作
  refreshActiveTimers: () => Promise<TimerStatus[]>;
  pauseTimerById: (timerId: number) => Promise<any>;
  resumeTimerById: (timerId: number) => Promise<any>;
  stopTimerById: (timerId: number) => Promise<any>;
  // 批量操作
  pauseAll: () => Promise<{ success: boolean; paused: number; errors: number }>;
  resumeAll: () => Promise<{ success: boolean; resumed: number; errors: number }>;
  stopAll: () => Promise<{ success: boolean; stopped: number; errors: number }>;
  
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
  const [activeTimers, setActiveTimers] = useState<TimerStatus[]>([]);
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

  // 初始化：获取当前计时器状态与活动列表
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
      await Promise.all([
        getCurrentStatus(),
        refreshActiveTimers()
      ]);
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
    // 每15秒同步一次服务器状态（并更新活动列表）
    pollIntervalRef.current = setInterval(() => {
      getCurrentStatus();
      refreshActiveTimers();
    }, 15000);
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

  // 刷新所有活动计时器
  const refreshActiveTimers = useCallback(async (): Promise<TimerStatus[]> => {
    try {
      const res = await unifiedTimerService.getActiveTimers();
      if (res.success && res.data) {
        const list = res.data.timers || [];
        setActiveTimers(list);
        if (process.env.NODE_ENV !== 'production') {
          try { console.debug('[Timer] Active timers fetched:', list.length); } catch {}
        }
        return list;
      }
      setActiveTimers([]);
      if (process.env.NODE_ENV !== 'production') {
        try { console.debug('[Timer] Active timers fetched:', 0); } catch {}
      }
      return [];
    } catch (err) {
      console.error('获取活动计时器失败:', err);
      setActiveTimers([]);
      if (process.env.NODE_ENV !== 'production') {
        try { console.debug('[Timer] Active timers fetched (error):', 0); } catch {}
      }
      return [];
    }
  }, []);

  // API 操作方法
  const startTimer = useCallback(async (request: StartTimerRequest) => {
    setLoadingError(true);
    
    try {
      const response = await unifiedTimerService.startTimer(request);
      
      if (response.success) {
        await getCurrentStatus(); // 重新获取状态
        
        // 如果启动的是任务计时器，刷新相关查询以同步任务状态变化
        if (request.task_id) {
          const { invalidateQueries } = await import('../utils/queryClient');
          // 获取用户ID (假设从本地存储或上下文获取)
          const userId = 1; // TODO: 从实际的用户上下文获取
          
          // 刷新任务相关查询
          invalidateQueries.tasks(userId);
          // 刷新仪表板数据
          invalidateQueries.dashboard(userId);
        }
        
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
        await refreshActiveTimers();
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
  }, [refreshActiveTimers]);

  const getCurrentStatus = useCallback(async (): Promise<TimerStatus | null> => {
    try {
      const response = await unifiedTimerService.getCurrentTimer();
      
      if (response.success) {
        updateTimerState(response.data || null);
        setError(null);
        return response.data || null;
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

  // 并行计时：按ID控制
  const pauseTimerById = useCallback(async (timerId: number) => {
    setLoadingError(true);
    try {
      const res = await unifiedTimerService.pauseTimerById(timerId);
      await Promise.all([getCurrentStatus(), refreshActiveTimers()]);
      message.info('指定计时器已暂停');
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '暂停计时器失败';
      setLoadingError(false, msg);
      message.error(msg);
      throw err;
    } finally {
      setLoadingError(false);
    }
  }, [getCurrentStatus, refreshActiveTimers]);

  const resumeTimerById = useCallback(async (timerId: number) => {
    setLoadingError(true);
    try {
      const res = await unifiedTimerService.resumeTimerById(timerId);
      await Promise.all([getCurrentStatus(), refreshActiveTimers()]);
      message.success('指定计时器已恢复');
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '恢复计时器失败';
      setLoadingError(false, msg);
      message.error(msg);
      throw err;
    } finally {
      setLoadingError(false);
    }
  }, [getCurrentStatus, refreshActiveTimers]);

  const stopTimerById = useCallback(async (timerId: number) => {
    setLoadingError(true);
    try {
      const res = await unifiedTimerService.stopTimerById(timerId);
      await Promise.all([getCurrentStatus(), refreshActiveTimers()]);
      message.success('指定计时器已停止');
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '停止计时器失败';
      setLoadingError(false, msg);
      message.error(msg);
      throw err;
    } finally {
      setLoadingError(false);
    }
  }, [getCurrentStatus, refreshActiveTimers]);

  // 批量操作：暂停所有运行中的计时器
  const pauseAll = useCallback(async (): Promise<{ success: boolean; paused: number; errors: number }> => {
    setLoadingError(true);
    try {
      const timers = await refreshActiveTimers();
      const running = timers.filter(t => t.status === 'running');
      const results = await Promise.allSettled(running.map(t => unifiedTimerService.pauseTimerById(t.id)));
      const paused = results.filter(r => r.status === 'fulfilled').length;
      const errors = results.length - paused;
      await Promise.all([getCurrentStatus(), refreshActiveTimers()]);
      if (paused > 0) message.info(`已暂停 ${paused} 个计时器`);
      if (errors > 0) message.warning?.(`有 ${errors} 个计时器暂停失败` as any);
      return { success: errors === 0, paused, errors };
    } finally {
      setLoadingError(false);
    }
  }, [refreshActiveTimers, getCurrentStatus]);

  // 批量操作：恢复所有暂停的计时器
  const resumeAll = useCallback(async (): Promise<{ success: boolean; resumed: number; errors: number }> => {
    setLoadingError(true);
    try {
      const timers = await refreshActiveTimers();
      const pausedList = timers.filter(t => t.status === 'paused');
      const results = await Promise.allSettled(pausedList.map(t => unifiedTimerService.resumeTimerById(t.id)));
      const resumed = results.filter(r => r.status === 'fulfilled').length;
      const errors = results.length - resumed;
      await Promise.all([getCurrentStatus(), refreshActiveTimers()]);
      if (resumed > 0) message.success(`已恢复 ${resumed} 个计时器`);
      if (errors > 0) message.warning?.(`有 ${errors} 个计时器恢复失败` as any);
      return { success: errors === 0, resumed, errors };
    } finally {
      setLoadingError(false);
    }
  }, [refreshActiveTimers, getCurrentStatus]);

  // 批量操作：停止所有活动计时器
  const stopAll = useCallback(async (): Promise<{ success: boolean; stopped: number; errors: number }> => {
    setLoadingError(true);
    try {
      const timers = await refreshActiveTimers();
      const results = await Promise.allSettled(timers.map(t => unifiedTimerService.stopTimerById(t.id)));
      const stopped = results.filter(r => r.status === 'fulfilled').length;
      const errors = results.length - stopped;
      await Promise.all([getCurrentStatus(), refreshActiveTimers()]);
      if (stopped > 0) message.success(`已完成 ${stopped} 个计时器`);
      if (errors > 0) message.warning?.(`有 ${errors} 个计时器完成失败` as any);
      return { success: errors === 0, stopped, errors };
    } finally {
      setLoadingError(false);
    }
  }, [refreshActiveTimers, getCurrentStatus]);

  return {
    // 状态
    currentTimer,
    activeTimers,
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

    // 并行计时
    refreshActiveTimers,
    pauseTimerById,
    resumeTimerById,
    stopTimerById,
    // 批量
    pauseAll,
    resumeAll,
    stopAll,
    
    // 数据获取
    getSuggestions,
    getTemplates,
    getRecentTasks,
    
    // 状态
    loading,
    error
  };
};
