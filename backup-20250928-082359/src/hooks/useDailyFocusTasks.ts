import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { dailyFocusTasksService } from '../services/dailyFocusTasksService';
import {
  DailyFocusTask,
  DailyFocusTaskRequest,
  DailyFocusTaskUpdate,
  DailyFocusTaskReorderItem,
  DailyFocusTaskStats,
  DailyFocusTaskFilter
} from '../types/dailyFocusTask';
import { Task } from '../types/task';

interface UseDailyFocusTasksOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  filters?: DailyFocusTaskFilter;
}

interface UseDailyFocusTasksReturn {
  // Data state
  focusTasks: DailyFocusTask[];
  stats: DailyFocusTaskStats | null;
  recommendations: Task[];
  loading: boolean;
  error: string | null;
  
  // Operations
  addFocusTask: (request: DailyFocusTaskRequest) => Promise<void>;
  removeFocusTask: (id: number) => Promise<void>;
  updateFocusTask: (id: number, update: DailyFocusTaskUpdate) => Promise<void>;
  reorderFocusTasks: (items: DailyFocusTaskReorderItem[]) => Promise<void>;
  markCompleted: (id: number) => Promise<void>;
  batchAddFocusTasks: (taskIds: number[], priority?: string, notes?: string) => Promise<void>;
  
  // Utility functions
  refreshFocusTasks: () => Promise<void>;
  loadRecommendations: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  autoCarryOverTasks: () => Promise<{ success: boolean; count: number; message: string }>;
  
  // Computed values
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
}

const DEFAULT_STATS: DailyFocusTaskStats = {
  total_count: 0,
  completed_count: 0,
  pending_count: 0,
  completion_rate: 0,
  priority_distribution: {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
};

export const useDailyFocusTasks = (options: UseDailyFocusTasksOptions = {}): UseDailyFocusTasksReturn => {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    filters
  } = options;

  // State
  const [focusTasks, setFocusTasks] = useState<DailyFocusTask[]>([]);
  const [stats, setStats] = useState<DailyFocusTaskStats | null>(null);
  const [recommendations, setRecommendations] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  // Load daily focus tasks
  const loadFocusTasks = useCallback(async (suppressError = false) => {
    try {
      setLoading(!suppressError); // Don't show loading for background retries
      if (!suppressError) {
        setError(null);
      }
      
      const response = await dailyFocusTasksService.getDailyFocusTasks(filters);
      setFocusTasks(response.tasks || []);
      setStats(response.stats);
      if (suppressError) {
        setError(null); // Clear error if background retry succeeds
      }
      
    } catch (err: any) {
      console.error('Failed to load daily focus tasks:', err);
      
      // Don't set error state for 401 errors to prevent infinite loops
      // Check both axios response and AppError
      const is401Error = err?.response?.status === 401 || 
                        (err?.status === 401) ||
                        (err?.type === 'authentication') ||
                        (err?.message?.includes('登录已过期')) ||
                        (err?.message?.includes('认证')) ||
                        (err?.message?.includes('Unauthorized')) ||
                        (err?.message?.includes('authorization')) ||
                        (err?.message?.includes('Missing authorization header'));
                        
      if (is401Error) {
        console.warn('Authentication required for daily focus tasks - using default empty state');
        // 使用默认空状态，让用户看到认证提示
        setFocusTasks([]);
        setStats(DEFAULT_STATS);
        if (!suppressError) {
          setError('请先登录以查看今日主要任务');
        }
        return;
      }
      
      if (!suppressError) {
        setError('获取今日主要任务失败');
      }
      setFocusTasks([]);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // Use JSON.stringify to avoid reference changes

  // Refresh tasks
  const refreshFocusTasks = useCallback(async () => {
    await loadFocusTasks();
  }, [loadFocusTasks]);

  // Load recommendations
  const loadRecommendations = useCallback(async (searchKeyword?: string) => {
    try {
      const recommendations = await dailyFocusTasksService.getRecommendations(searchKeyword);
      setRecommendations(recommendations);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      // Don't show error message for recommendations failure
      setRecommendations([]);
    }
  }, []);

  // Add focus task
  const addFocusTask = useCallback(async (request: DailyFocusTaskRequest) => {
    try {
      await dailyFocusTasksService.addDailyFocusTask(request);
      await refreshFocusTasks();
    } catch (err) {
      console.error('Failed to add focus task:', err);
      throw err;
    }
  }, [refreshFocusTasks]);

  // Remove focus task
  const removeFocusTask = useCallback(async (id: number) => {
    try {
      await dailyFocusTasksService.deleteDailyFocusTask(id);
      await refreshFocusTasks();
    } catch (err) {
      console.error('Failed to remove focus task:', err);
      throw err;
    }
  }, [refreshFocusTasks]);

  // Update focus task
  const updateFocusTask = useCallback(async (id: number, update: DailyFocusTaskUpdate) => {
    try {
      await dailyFocusTasksService.updateDailyFocusTask(id, update);
      await refreshFocusTasks();
    } catch (err) {
      console.error('Failed to update focus task:', err);
      throw err;
    }
  }, [refreshFocusTasks]);

  // Reorder focus tasks
  const reorderFocusTasks = useCallback(async (items: DailyFocusTaskReorderItem[]) => {
    try {
      await dailyFocusTasksService.reorderDailyFocusTasks(items);
      // Update local state immediately for better UX
      setFocusTasks(prevTasks => {
        const reorderedTasks = [...prevTasks];
        items.forEach(item => {
          const task = reorderedTasks.find(t => t.id === item.id);
          if (task) {
            task.sort_order = item.sort_order;
          }
        });
        return reorderedTasks.sort((a, b) => a.sort_order - b.sort_order);
      });
      
      // Refresh to get server state
      setTimeout(() => refreshFocusTasks(), 1000);
    } catch (err) {
      console.error('Failed to reorder focus tasks:', err);
      // Revert local state on error
      await refreshFocusTasks();
      throw err;
    }
  }, [refreshFocusTasks]);

  // Mark completed
  const markCompleted = useCallback(async (id: number) => {
    try {
      await dailyFocusTasksService.markCompleted(id);
      await refreshFocusTasks();
    } catch (err) {
      console.error('Failed to mark focus task completed:', err);
      throw err;
    }
  }, [refreshFocusTasks]);

  // Batch add focus tasks
  const batchAddFocusTasks = useCallback(async (taskIds: number[], priority: string = 'medium', notes?: string) => {
    try {
      await dailyFocusTasksService.batchAddDailyFocusTasks({
        task_ids: taskIds,
        priority: priority as any,
        notes
      });
      await refreshFocusTasks();
      message.success(`成功添加 ${taskIds.length} 个任务`);
    } catch (err) {
      console.error('Failed to batch add focus tasks:', err);
      message.error('批量添加任务失败');
      throw err;
    }
  }, [refreshFocusTasks]);

  // Clear completed tasks
  const clearCompleted = useCallback(async () => {
    try {
      const completedTasks = focusTasks?.filter(task => task.completed_at) || [];
      if (completedTasks.length === 0) {
        message.info('没有已完成的任务需要清理');
        return;
      }

      await Promise.all(
        completedTasks.map(task => dailyFocusTasksService.deleteDailyFocusTask(task.id))
      );
      
      await refreshFocusTasks();
      message.success(`已清理 ${completedTasks.length} 个已完成任务`);
    } catch (err) {
      console.error('Failed to clear completed tasks:', err);
      message.error('清理已完成任务失败');
      throw err;
    }
  }, [focusTasks, refreshFocusTasks]);

  // Auto carry-over yesterday's tasks
  const autoCarryOverTasks = useCallback(async () => {
    try {
      const result = await dailyFocusTasksService.autoCarryOverYesterdayTasks();
      
      if (result.success && result.count > 0) {
        message.success(result.message);
        await refreshFocusTasks(); // Refresh tasks after carry-over
        await loadRecommendations(); // Refresh recommendations too
      } else if (result.success && result.count === 0) {
        console.info('No tasks to carry over from yesterday');
      }
      
      return result;
    } catch (err) {
      console.error('Failed to carry over tasks:', err);
      const result = {
        success: false,
        count: 0,
        message: err instanceof Error ? err.message : '自动延续任务失败'
      };
      return result;
    }
  }, [refreshFocusTasks, loadRecommendations]);

  // Computed values
  const computedStats = {
    totalCount: stats?.total_count || 0,
    completedCount: stats?.completed_count || 0,
    pendingCount: stats?.pending_count || 0,
    completionRate: stats?.completion_rate || 0
  };

  // Initial load - only run once
  useEffect(() => {
    if (!isInitializedRef.current) {
      const initializeApp = async () => {
        // First load existing tasks
        await loadFocusTasks();
        
        // Try to auto carry-over tasks from yesterday (silent, no UI interruption)
        try {
          await autoCarryOverTasks();
        } catch (err) {
          console.warn('Auto carry-over failed on initialization:', err);
        }
        
        // Load recommendations after carry-over
        try {
          await loadRecommendations();
        } catch (err) {
          console.warn('Loading recommendations failed on initialization:', err);
        }
      };
      
      initializeApp();
      isInitializedRef.current = true;
    }
  }, []); // Empty dependency array for true one-time execution

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !isInitializedRef.current) return;

    const interval = setInterval(async () => {
      await loadFocusTasks(true); // Suppress error/loading for background refresh
      
      // Also refresh recommendations periodically (every 10 minutes)
      const now = Date.now();
      const lastRecommendationRefresh = window.localStorage.getItem('last_recommendation_refresh');
      const shouldRefreshRecommendations = !lastRecommendationRefresh || 
        (now - parseInt(lastRecommendationRefresh)) > 10 * 60 * 1000; // 10 minutes
      
      if (shouldRefreshRecommendations) {
        try {
          await loadRecommendations();
          window.localStorage.setItem('last_recommendation_refresh', now.toString());
        } catch (err) {
          console.warn('Background recommendation refresh failed:', err);
        }
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadFocusTasks, loadRecommendations]);

  // Page visibility refresh - only when coming back from hidden
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    const handleVisibilityChange = async () => {
      if (!document.hidden && isInitializedRef.current) {
        await loadFocusTasks(true); // Suppress error for background visibility refresh
        
        // Also refresh recommendations when coming back
        try {
          await loadRecommendations();
        } catch (err) {
          console.warn('Recommendation refresh on visibility change failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadFocusTasks, loadRecommendations]);

  // Listen for login state changes
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'currentUser') {
        // User logged in/out, refresh tasks and recommendations
        if (isInitializedRef.current) {
          await loadFocusTasks();
          try {
            await loadRecommendations();
          } catch (err) {
            console.warn('Recommendation refresh on login state change failed:', err);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadFocusTasks, loadRecommendations]);

  return {
    // Data state
    focusTasks,
    stats,
    recommendations,
    loading,
    error,
    
    // Operations
    addFocusTask,
    removeFocusTask,
    updateFocusTask,
    reorderFocusTasks,
    markCompleted,
    batchAddFocusTasks,
    
    // Utility functions
    refreshFocusTasks,
    loadRecommendations,
    clearCompleted,
    autoCarryOverTasks,
    
    // Computed values
    ...computedStats
  };
};