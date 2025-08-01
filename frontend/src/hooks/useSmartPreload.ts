import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, prefetchQueries } from '../utils/queryClient';
import { DashboardService } from '../services/dashboardService';
import { CACHE_TTL } from '../utils/cache';

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

// 预加载策略类型
interface PreloadStrategy {
  key: string;
  priority: 'high' | 'medium' | 'low';
  condition?: () => boolean;
  prefetcher: () => Promise<void>;
}

// 智能预加载hook
export const useSmartPreload = (options?: {
  enabled?: boolean;
  strategies?: string[];
  delay?: number;
}) => {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedStrategies, setPreloadedStrategies] = useState<Set<string>>(new Set());
  const preloadTimerRef = useRef<NodeJS.Timeout>();

  const { 
    enabled = true, 
    strategies = ['dashboard', 'projects', 'tasks'], 
    delay = 1000 
  } = options || {};

  // 预加载策略定义
  const preloadStrategies: PreloadStrategy[] = [
    {
      key: 'dashboard',
      priority: 'high',
      condition: () => true,
      prefetcher: async () => {
        await Promise.all([
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
        ]);
      },
    },
    {
      key: 'projects',
      priority: 'medium',
      condition: () => true,
      prefetcher: () => prefetchQueries.projects(userId),
    },
    {
      key: 'tasks',
      priority: 'medium',
      condition: () => true,
      prefetcher: async () => {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: queryKeys.tasks.byStatus(userId),
            queryFn: () => DashboardService.getTasksByStatus(),
            staleTime: CACHE_TTL.LIVE_UPDATES,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.tasks.today(userId),
            queryFn: () => DashboardService.getTodayTasks(),
            staleTime: CACHE_TTL.LIVE_UPDATES,
          }),
        ]);
      },
    },
    {
      key: 'weekly-stats',
      priority: 'low',
      condition: () => window.location.pathname.includes('task-dashboard'),
      prefetcher: async () => {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        
        await queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.weekly(
            userId, 
            startOfWeek.toISOString().split('T')[0], 
            endOfWeek.toISOString().split('T')[0]
          ),
          queryFn: () => DashboardService.getWeeklyStats(
            startOfWeek.toISOString().split('T')[0], 
            endOfWeek.toISOString().split('T')[0]
          ),
          staleTime: CACHE_TTL.STABLE,
        });
      },
    },
    {
      key: 'user-workload',
      priority: 'low',
      condition: () => true,
      prefetcher: async () => {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.userWorkload(userId),
          queryFn: () => DashboardService.getUserWorkload(),
          staleTime: CACHE_TTL.FREQUENT,
        });
      },
    },
  ];

  // 执行预加载
  const executePreload = async (strategyKeys: string[] = strategies) => {
    if (!enabled || isPreloading) return;

    setIsPreloading(true);
    console.log('🚀 开始智能预加载...', strategyKeys);

    try {
      // 按优先级分组执行
      const priorityGroups = {
        high: [] as PreloadStrategy[],
        medium: [] as PreloadStrategy[],
        low: [] as PreloadStrategy[],
      };

      preloadStrategies
        .filter(strategy => 
          strategyKeys.includes(strategy.key) && 
          !preloadedStrategies.has(strategy.key) &&
          (!strategy.condition || strategy.condition())
        )
        .forEach(strategy => {
          priorityGroups[strategy.priority].push(strategy);
        });

      // 依次执行高、中、低优先级预加载
      for (const priority of ['high', 'medium', 'low'] as const) {
        const group = priorityGroups[priority];
        if (group.length > 0) {
          console.log(`📦 预加载 ${priority} 优先级策略:`, group.map(s => s.key));
          
          await Promise.allSettled(
            group.map(async (strategy) => {
              try {
                await strategy.prefetcher();
                setPreloadedStrategies(prev => new Set([...prev, strategy.key]));
                console.log(`✅ 预加载完成: ${strategy.key}`);
              } catch (error) {
                console.warn(`⚠️ 预加载失败: ${strategy.key}`, error);
              }
            })
          );
          
          // 不同优先级之间添加小延迟
          if (priority !== 'low') {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      console.log('🎉 智能预加载完成');
    } catch (error) {
      console.error('❌ 预加载过程出错:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  // 延迟预加载
  const schedulePreload = (strategyKeys?: string[]) => {
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
    }

    preloadTimerRef.current = setTimeout(() => {
      executePreload(strategyKeys);
    }, delay);
  };

  // 立即预加载
  const preloadNow = (strategyKeys?: string[]) => {
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
    }
    executePreload(strategyKeys);
  };

  // 重置预加载状态
  const resetPreload = () => {
    setPreloadedStrategies(new Set());
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (preloadTimerRef.current) {
        clearTimeout(preloadTimerRef.current);
      }
    };
  }, []);

  return {
    isPreloading,
    preloadedStrategies: Array.from(preloadedStrategies),
    schedulePreload,
    preloadNow,
    resetPreload,
    availableStrategies: preloadStrategies.map(s => s.key),
  };
};

// 页面特定的预加载hook
export const useDashboardPreload = () => {
  const smartPreload = useSmartPreload({
    strategies: ['dashboard', 'projects', 'tasks', 'weekly-stats'],
    delay: 500,
  });

  // 页面加载时自动预加载
  useEffect(() => {
    smartPreload.schedulePreload();
  }, []);

  return smartPreload;
};

// 任务页面预加载hook
export const useTasksPreload = (projectId?: number) => {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  const smartPreload = useSmartPreload({
    strategies: ['tasks', 'projects'],
    delay: 300,
  });

  // 项目特定的任务预加载
  useEffect(() => {
    if (projectId) {
      const prefetchProjectTasks = async () => {
        try {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.tasks.byProject(projectId, 1, 20),
            queryFn: () => Promise.resolve([]), // TODO: 实现 getTasksByProject 方法
            staleTime: CACHE_TTL.REGULAR,
          });
        } catch (error) {
          console.warn('Failed to prefetch project tasks:', error);
        }
      };

      prefetchProjectTasks();
    }

    smartPreload.schedulePreload();
  }, [projectId]);

  return smartPreload;
};

// 周报页面预加载hook
export const useWeeklyReportPreload = (startDate?: string, endDate?: string) => {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  const smartPreload = useSmartPreload({
    strategies: ['weekly-stats', 'dashboard'],
    delay: 200,
  });

  // 周报数据预加载
  useEffect(() => {
    if (startDate && endDate) {
      const prefetchWeeklyData = async () => {
        try {
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: queryKeys.dashboard.weekly(userId, startDate, endDate),
              queryFn: () => DashboardService.getWeeklyStats(startDate, endDate),
              staleTime: CACHE_TTL.STABLE,
            }),
            queryClient.prefetchQuery({
              queryKey: queryKeys.weekly.report(userId, startDate, endDate),
              queryFn: () => Promise.resolve({}), // TODO: 实现 getWeeklyReport 方法
              staleTime: CACHE_TTL.STABLE,
            }),
          ]);
        } catch (error) {
          console.warn('Failed to prefetch weekly data:', error);
        }
      };

      prefetchWeeklyData();
    }

    smartPreload.schedulePreload();
  }, [startDate, endDate]);

  return smartPreload;
};