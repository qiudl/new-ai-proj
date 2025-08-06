import { QueryClient } from '@tanstack/react-query';
import { CACHE_TTL } from './cache';

// 自定义默认选项
const queryClientOptions = {
  defaultOptions: {
    queries: {
      // 设置默认的stale time，数据在这个时间内被认为是新鲜的
      staleTime: CACHE_TTL.FREQUENT, // 2分钟
      // 设置默认的garbage collection time，数据在这个时间内保留在内存中
      gcTime: CACHE_TTL.REGULAR, // 5分钟
      // 窗口重新获得焦点时不自动重新获取
      refetchOnWindowFocus: false,
      // 组件重新挂载时不自动重新获取
      refetchOnMount: true,
      // 网络重连时自动重新获取
      refetchOnReconnect: true,
      // 重试次数
      retry: (failureCount: number, error: Error | unknown) => {
        // HTTP 4xx 错误不重试
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status: number };
          if (httpError.status >= 400 && httpError.status < 500) {
            return false;
          }
        }
        // 最多重试2次
        return failureCount < 2;
      },
      // 重试延迟
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // 变更失败时重试1次
      retry: 1,
      // 重试延迟
      retryDelay: 1000,
    },
  },
};

// 创建查询客户端
export const queryClient = new QueryClient(queryClientOptions);

// 查询键工厂 - 标准化查询键命名
export const queryKeys = {
  // 仪表板相关
  dashboard: {
    all: ['dashboard'] as const,
    stats: (userId: number) => [...queryKeys.dashboard.all, 'stats', userId] as const,
    weekly: (userId: number, startDate: string, endDate: string, projectId?: number) => 
      [...queryKeys.dashboard.all, 'weekly', userId, startDate, endDate, projectId] as const,
    projectProgress: (userId: number) => [...queryKeys.dashboard.all, 'project-progress', userId] as const,
    userWorkload: (userId: number) => [...queryKeys.dashboard.all, 'user-workload', userId] as const,
    recentActivities: (userId: number, limit: number) => 
      [...queryKeys.dashboard.all, 'recent-activities', userId, limit] as const,
  },
  
  // 任务相关
  tasks: {
    all: ['tasks'] as const,
    byProject: (projectId: number, page: number, pageSize: number) => 
      [...queryKeys.tasks.all, 'by-project', projectId, page, pageSize] as const,
    byStatus: (userId: number) => [...queryKeys.tasks.all, 'by-status', userId] as const,
    overdue: (userId: number) => [...queryKeys.tasks.all, 'overdue', userId] as const,
    highPriority: (userId: number) => [...queryKeys.tasks.all, 'high-priority', userId] as const,
    today: (userId: number) => [...queryKeys.tasks.all, 'today', userId] as const,
    thisWeek: (userId: number) => [...queryKeys.tasks.all, 'this-week', userId] as const,
    detail: (taskId: number) => [...queryKeys.tasks.all, 'detail', taskId] as const,
  },
  
  // 项目相关
  projects: {
    all: ['projects'] as const,
    list: (userId: number, page: number, pageSize: number) => 
      [...queryKeys.projects.all, 'list', userId, page, pageSize] as const,
    detail: (projectId: number) => [...queryKeys.projects.all, 'detail', projectId] as const,
    stats: (projectId: number) => [...queryKeys.projects.all, 'stats', projectId] as const,
  },
  
  // 计时系统相关
  timer: {
    all: ['timer'] as const,
    tasks: (userId: number, filters?: any) => 
      [...queryKeys.timer.all, 'tasks', userId, JSON.stringify(filters || {})] as const,
    analytics: (userId: number, timeRange: string) => 
      [...queryKeys.timer.all, 'analytics', userId, timeRange] as const,
    history: (userId: number, page: number, limit: number) => 
      [...queryKeys.timer.all, 'history', userId, page, limit] as const,
  },
  
  // 周报相关
  weekly: {
    all: ['weekly'] as const,
    report: (userId: number, startDate: string, endDate: string) => 
      [...queryKeys.weekly.all, 'report', userId, startDate, endDate] as const,
    stats: (userId: number, startDate: string, endDate: string) => 
      [...queryKeys.weekly.all, 'stats', userId, startDate, endDate] as const,
    efficiency: (userId: number, startDate: string, endDate: string) => 
      [...queryKeys.weekly.all, 'efficiency', userId, startDate, endDate] as const,
  },
} as const;

// 缓存失效辅助函数
export const invalidateQueries = {
  // 失效仪表板相关查询
  dashboard: (userId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byStatus(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  },
  
  // 失效任务相关查询
  tasks: (userId: number, projectId?: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.stats(projectId) });
    }
  },
  
  // 失效项目相关查询
  projects: (projectId?: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId, 1, 100) });
    }
  },
  
  // 失效计时相关查询
  timer: (userId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(userId) });
  },
  
  // 失效周报相关查询
  weekly: (userId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.weekly.all });
  },
};

// 预取数据辅助函数
export const prefetchQueries = {
  // 预取仪表板数据
  dashboard: async (userId: number) => {
    const promises = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.stats(userId),
        staleTime: CACHE_TTL.REAL_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.projectProgress(userId),
        staleTime: CACHE_TTL.FREQUENT,
      }),
    ];
    
    await Promise.allSettled(promises);
  },
  
  // 预取项目数据
  projects: async (userId: number) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.projects.list(userId, 1, 20),
      staleTime: CACHE_TTL.REGULAR,
    });
  },
};

// 错误处理
export const handleQueryError = (error: Error | unknown, context?: string) => {
  console.error(`Query error${context ? ` in ${context}` : ''}:`, error);
  
  // 可以在这里添加全局错误处理逻辑
  // 例如：显示通知、记录错误日志、重定向到错误页面等
  
  return error;
};

// 成功处理
export const handleQuerySuccess = (data: Record<string, unknown>, context?: string) => {
  if (context) {
    console.log(`Query success in ${context}:`, data);
  }
  
  return data;
};