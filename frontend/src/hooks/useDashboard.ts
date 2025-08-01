import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardService, DashboardStats, WeeklyDashboardStats, ProjectProgressInfo, UserWorkload, TasksByStatus } from '../services/dashboardService';
import { queryKeys, invalidateQueries, handleQueryError, handleQuerySuccess } from '../utils/queryClient';
import { CACHE_TTL } from '../utils/cache';
import { TimelineEvent } from '../types/task';

// 获取当前用户ID的辅助函数
const getCurrentUserId = (): number => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || 1;
    }
  } catch (error) {
    console.warn('Failed to get user ID from token:', error);
  }
  return 1;
};

// 仪表板统计数据
export const useDashboardStats = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.dashboard.stats(userId),
    queryFn: () => DashboardService.getDashboardStats(),
    staleTime: CACHE_TTL.REAL_TIME,
    gcTime: CACHE_TTL.FREQUENT,
    // 启用后台更新
    refetchInterval: 30000, // 30秒自动刷新
    refetchIntervalInBackground: false,
  });
};

// 周报仪表板数据
export const useWeeklyDashboardStats = (
  startDate?: string,
  endDate?: string,
  projectId?: number,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.dashboard.weekly(userId, startDate || '', endDate || '', projectId),
    queryFn: () => DashboardService.getWeeklyStats(startDate, endDate, projectId),
    staleTime: CACHE_TTL.STABLE,
    gcTime: CACHE_TTL.SEMI_STATIC,
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
  });
};

// 项目进度信息
export const useProjectProgress = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.dashboard.projectProgress(userId),
    queryFn: () => DashboardService.getProjectProgress(),
    staleTime: CACHE_TTL.FREQUENT,
    gcTime: CACHE_TTL.REGULAR,
  });
};

// 用户工作负载
export const useUserWorkload = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.dashboard.userWorkload(userId),
    queryFn: () => DashboardService.getUserWorkload(),
    staleTime: CACHE_TTL.FREQUENT,
    gcTime: CACHE_TTL.REGULAR,
  });
};

// 最近活动
export const useRecentActivities = (limit: number = 5) => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.dashboard.recentActivities(userId, limit),
    queryFn: () => DashboardService.getRecentActivities(limit),
    staleTime: CACHE_TTL.REGULAR,
    gcTime: CACHE_TTL.FREQUENT,
  });
};

// 按状态分组的任务
export const useTasksByStatus = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.tasks.byStatus(userId),
    queryFn: () => DashboardService.getTasksByStatus(),
    staleTime: CACHE_TTL.LIVE_UPDATES,
    gcTime: CACHE_TTL.FREQUENT,
  });
};

// 逾期任务
export const useOverdueTasks = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.tasks.overdue(userId),
    queryFn: () => DashboardService.getOverdueTasks(),
    staleTime: CACHE_TTL.LIVE_UPDATES,
    gcTime: CACHE_TTL.FREQUENT,
  });
};

// 高优先级任务
export const useHighPriorityTasks = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.tasks.highPriority(userId),
    queryFn: () => DashboardService.getHighPriorityTasks(),
    staleTime: CACHE_TTL.LIVE_UPDATES,
    gcTime: CACHE_TTL.FREQUENT,
  });
};

// 今日任务
export const useTodayTasks = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.tasks.today(userId),
    queryFn: () => DashboardService.getTodayTasks(),
    staleTime: CACHE_TTL.LIVE_UPDATES,
    gcTime: CACHE_TTL.FREQUENT,
    // 今日任务需要更频繁的更新
    refetchInterval: 60000, // 1分钟
  });
};

// 本周任务
export const useThisWeekTasks = () => {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: queryKeys.tasks.thisWeek(userId),
    queryFn: () => DashboardService.getThisWeekTasks(),
    staleTime: CACHE_TTL.REGULAR,
    gcTime: CACHE_TTL.FREQUENT,
  });
};

// 工作效率统计
export const useProductivityStats = () => {
  return useQuery({
    queryKey: ['productivity-stats'],
    queryFn: () => DashboardService.getProductivityStats(),
    staleTime: CACHE_TTL.FREQUENT,
    gcTime: CACHE_TTL.REGULAR,
  });
};

// 任务摘要
export const useTaskSummary = () => {
  return useQuery({
    queryKey: ['task-summary'],
    queryFn: () => DashboardService.getTaskSummary(),
    staleTime: CACHE_TTL.REGULAR,
    gcTime: CACHE_TTL.FREQUENT,
  });
};

// 刷新仪表板数据的mutation
export const useRefreshDashboard = () => {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();
  
  return useMutation({
    mutationFn: async () => {
      // 同时刷新多个关键查询
      const promises = [
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byStatus(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.projectProgress(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.recentActivities(userId, 5) }),
      ];
      
      await Promise.all(promises);
      return 'Dashboard refreshed successfully';
    },
  });
};

// 批量预取仪表板数据
export const usePrefetchDashboard = () => {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();
  
  return useMutation({
    mutationFn: async () => {
      const promises = [
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.stats(userId),
          queryFn: () => DashboardService.getDashboardStats(),
          staleTime: CACHE_TTL.REAL_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.projectProgress(userId),
          queryFn: () => DashboardService.getProjectProgress(),
          staleTime: CACHE_TTL.FREQUENT,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.tasks.byStatus(userId),
          queryFn: () => DashboardService.getTasksByStatus(),
          staleTime: CACHE_TTL.LIVE_UPDATES,
        }),
      ];
      
      await Promise.allSettled(promises);
      return 'Dashboard data prefetched';
    },
  });
};

// 智能仪表板数据管理hook
export const useDashboardManager = () => {
  const refreshMutation = useRefreshDashboard();
  const prefetchMutation = usePrefetchDashboard();
  
  return {
    // 刷新所有仪表板数据
    refresh: refreshMutation.mutate,
    refreshAsync: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
    
    // 预取数据
    prefetch: prefetchMutation.mutate,
    prefetchAsync: prefetchMutation.mutateAsync,
    isPrefetching: prefetchMutation.isPending,
    
    // 失效特定数据
    invalidateDashboard: () => invalidateQueries.dashboard(getCurrentUserId()),
    invalidateTasks: (projectId?: number) => invalidateQueries.tasks(getCurrentUserId(), projectId),
    invalidateProjects: (projectId?: number) => invalidateQueries.projects(projectId),
  };
};