import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { todayTasksService, TodayTasksFilter, TodayTasksResponse, TodayTasksStats } from '../services/todayTasksService';
import { Task } from '../types/task';

interface UseTodayTasksOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // 毫秒
  filters?: TodayTasksFilter;
  enableClientFilter?: boolean; // 是否启用客户端过滤
}

interface UseTodayTasksReturn {
  // 数据状态
  todayTasks: Task[];
  stats: TodayTasksStats | null;
  grouping: TodayTasksResponse['grouping'] | null;
  loading: boolean;
  error: string | null;
  
  // 操作方法
  refreshTasks: () => Promise<void>;
  markCompleted: (taskId: number) => Promise<void>;
  postponeTask: (taskId: number, newDueDate: string, reason?: string) => Promise<void>;
  bulkOperation: (taskIds: number[], operation: 'complete' | 'postpone' | 'priority', data?: any) => Promise<void>;
  
  // 工具方法
  isTaskForToday: (task: Task) => boolean;
  getTodayTaskLabels: (task: Task) => string[];
  filterTasksByCategory: (category: 'in_progress' | 'due_today' | 'created_today' | 'updated_today' | 'overdue') => Task[];
  
  // 统计信息
  totalCount: number;
  urgentCount: number; // 紧急任务数量（逾期 + 今日到期）
  inProgressCount: number;
  overdueCount: number;
}

const DEFAULT_STATS: TodayTasksStats = {
  total_count: 0,
  completed_count: 0,
  in_progress_count: 0,
  pending_count: 0,
  overdue_count: 0,
  due_today_count: 0,
  created_today_count: 0,
  updated_today_count: 0,
  high_priority_count: 0,

  // 优先级统计
  priority_stats: {
    high: 0,
    medium: 0,
    low: 0
  },

  // 精准时间统计默认值
  totalPlannedTime: 0,
  totalActualTime: 0,
  totalRemainingTime: 0,
  timeEfficiency: 0,
  totalPlannedTimeFormatted: '0分钟',
  totalActualTimeFormatted: '0分钟',
  totalRemainingTimeFormatted: '0分钟',
  timeDistribution: {
    short: 0,  // 0-2小时
    medium: 0, // 2-8小时
    long: 0,   // 8小时以上
    huge: 0    // 1天以上
  },

  // 完成率
  completion_rate: 0
};

export const useTodayTasks = (options: UseTodayTasksOptions = {}): UseTodayTasksReturn => {
  const {
    autoRefresh = false,
    refreshInterval = 60000, // 默认1分钟
    filters,
    enableClientFilter = false
  } = options;

  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TodayTasksStats | null>(null);
  const [grouping, setGrouping] = useState<TodayTasksResponse['grouping'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // 获取今日任务数据
  const fetchTodayTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await todayTasksService.getTodayTasks(filters);
      
      setTodayTasks(response.tasks);
      setStats(response.stats);
      setGrouping(response.grouping);
      setLastRefreshTime(new Date());
      
    } catch (err) {
      console.error('Failed to fetch today tasks:', err);
      setError('获取今日任务失败');
      
      // 如果启用客户端过滤，尝试从本地存储获取数据
      if (enableClientFilter) {
        try {
          const cachedTasks = localStorage.getItem('cachedTasks');
          if (cachedTasks) {
            const tasks: Task[] = JSON.parse(cachedTasks);
            const filtered = todayTasksService.filterTodayTasks(tasks);
            setTodayTasks(filtered.tasks);
            setStats(filtered.stats);
            setGrouping(filtered.grouping);
            setError('使用离线数据');
          }
        } catch (cacheError) {
          console.error('Failed to use cached data:', cacheError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [filters, enableClientFilter]);

  // 刷新任务数据
  const refreshTasks = useCallback(async () => {
    await fetchTodayTasks();
  }, [fetchTodayTasks]);

  // 标记任务完成
  const markCompleted = useCallback(async (taskId: number) => {
    try {
      await todayTasksService.markTodayTaskCompleted(taskId);
      message.success('任务已完成');
      await refreshTasks();
    } catch (err) {
      console.error('Failed to mark task completed:', err);
      message.error('标记任务完成失败');
    }
  }, [refreshTasks]);

  // 延期任务
  const postponeTask = useCallback(async (taskId: number, newDueDate: string, reason?: string) => {
    try {
      await todayTasksService.postponeTodayTask(taskId, newDueDate, reason);
      message.success('任务已延期');
      await refreshTasks();
    } catch (err) {
      console.error('Failed to postpone task:', err);
      message.error('延期任务失败');
    }
  }, [refreshTasks]);

  // 批量操作
  const bulkOperation = useCallback(async (taskIds: number[], operation: 'complete' | 'postpone' | 'priority', data?: any) => {
    try {
      await todayTasksService.bulkOperationTodayTasks(taskIds, operation, data);
      message.success(`批量${operation === 'complete' ? '完成' : operation === 'postpone' ? '延期' : '更新'}成功`);
      await refreshTasks();
    } catch (err) {
      console.error('Failed to perform bulk operation:', err);
      message.error('批量操作失败');
    }
  }, [refreshTasks]);

  // 检查任务是否为今日任务
  const isTaskForToday = useCallback((task: Task) => {
    return todayTasksService.isTaskForToday(task);
  }, []);

  // 获取任务的今日标签
  const getTodayTaskLabels = useCallback((task: Task) => {
    return todayTasksService.getTodayTaskLabels(task);
  }, []);

  // 按分类过滤任务
  const filterTasksByCategory = useCallback((category: 'in_progress' | 'due_today' | 'created_today' | 'updated_today' | 'overdue') => {
    return grouping?.[category] || [];
  }, [grouping]);

  // 计算统计数据
  const computedStats = useMemo(() => {
    const currentStats = stats || DEFAULT_STATS;
    
    return {
      totalCount: currentStats.total_count,
      urgentCount: currentStats.overdue_count + currentStats.due_today_count,
      inProgressCount: currentStats.in_progress_count,
      overdueCount: currentStats.overdue_count,
    };
  }, [stats]);

  // 初始加载
  useEffect(() => {
    fetchTodayTasks();
  }, [fetchTodayTasks]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTodayTasks();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTodayTasks]);

  // 页面可见性变化时刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面变为可见时刷新数据
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.getTime();
        if (timeSinceLastRefresh > 30000) { // 30秒后才刷新
          fetchTodayTasks();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTodayTasks, lastRefreshTime]);

  return {
    // 数据状态
    todayTasks,
    stats,
    grouping,
    loading,
    error,
    
    // 操作方法
    refreshTasks,
    markCompleted,
    postponeTask,
    bulkOperation,
    
    // 工具方法
    isTaskForToday,
    getTodayTaskLabels,
    filterTasksByCategory,
    
    // 统计信息
    ...computedStats,
  };
};

// 简化版Hook，只获取统计信息
export const useTodayTasksStats = (filters?: TodayTasksFilter) => {
  const [stats, setStats] = useState<TodayTasksStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const statsData = await todayTasksService.getTodayTasksStats(filters);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch today tasks stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [filters]);

  return { stats, loading };
};