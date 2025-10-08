import api from './api';
import { Task } from '../types/task';

interface TodayTasksFilter {
  user_id?: number;
  project_id?: number;
  include_overdue?: boolean;
  include_in_progress?: boolean;
  include_due_today?: boolean;
  include_created_today?: boolean;
  include_updated_today?: boolean;
}

interface TodayTasksStats {
  total_count: number;
  completed_count: number;
  in_progress_count: number;
  pending_count: number;
  overdue_count: number;
  due_today_count: number;
  created_today_count?: number;
  updated_today_count?: number;
  high_priority_count?: number;

  // 优先级统计
  priority_stats: {
    high: number;
    medium: number;
    low: number;
  };

  // 时间统计 - 精准时间支持
  totalPlannedTime: number;   // 分钟 (精准到分钟)
  totalActualTime: number;    // 分钟 (精准到分钟)
  totalRemainingTime: number; // 分钟 (精准到分钟)
  timeEfficiency: number;     // 百分比

  // 新增：精准时间格式统计
  totalPlannedTimeFormatted: string;   // 格式化显示
  totalActualTimeFormatted: string;    // 格式化显示
  totalRemainingTimeFormatted: string; // 格式化显示

  // 时间分布统计
  timeDistribution: {
    short: number;   // 0-2小时
    medium: number;  // 2-8小时
    long: number;    // 8小时以上
    huge: number;    // 1天以上
  };

  // 完成率
  completion_rate: number;
}

interface TodayTasksResponse {
  tasks: Task[];
  stats: TodayTasksStats;
  grouping: {
    in_progress: Task[];
    due_today: Task[];
    created_today: Task[];
    updated_today: Task[];
    overdue: Task[];
  };
}

class TodayTasksService {
  /**
   * 获取今日任务列表
   */
  async getTodayTasks(filters?: TodayTasksFilter): Promise<TodayTasksResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const endpoint = params.toString() ? 
      `/tasks/today?${params}` : 
      '/tasks/today';
    
    const response = await api.get(endpoint);
    return response.data?.data || response.data;
  }

  /**
   * 获取用户的今日任务
   */
  async getUserTodayTasks(userId?: number): Promise<TodayTasksResponse> {
    const params = userId ? `?user_id=${userId}` : '';
    const response = await api.get(`/users/me/tasks/today${params}`);
    return response.data?.data || response.data;
  }

  /**
   * 获取项目的今日任务
   */
  async getProjectTodayTasks(projectId: number): Promise<TodayTasksResponse> {
    const response = await api.get(`/projects/${projectId}/tasks/today`);
    return response.data?.data || response.data;
  }

  /**
   * 获取今日任务统计信息
   */
  async getTodayTasksStats(filters?: TodayTasksFilter): Promise<TodayTasksStats> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const endpoint = params.toString() ? 
      `/tasks/today/stats?${params}` : 
      '/tasks/today/stats';
    
    const response = await api.get(endpoint);
    return response.data?.data || response.data;
  }

  /**
   * 标记今日任务为已完成
   */
  async markTodayTaskCompleted(taskId: number): Promise<Task> {
    const response = await api.post(`/tasks/${taskId}/complete`, {
      completed_at: new Date().toISOString()
    });
    return response.data?.data || response.data;
  }

  /**
   * 延期今日任务
   */
  async postponeTodayTask(taskId: number, newDueDate: string, reason?: string): Promise<Task> {
    const response = await api.post(`/tasks/${taskId}/postpone`, {
      new_due_date: newDueDate,
      postpone_reason: reason
    });
    return response.data?.data || response.data;
  }

  /**
   * 批量操作今日任务
   */
  async bulkOperationTodayTasks(taskIds: number[], operation: 'complete' | 'postpone' | 'priority', data?: any): Promise<void> {
    await api.post('/tasks/today/bulk-operation', {
      task_ids: taskIds,
      operation,
      data
    });
  }

  /**
   * 客户端任务过滤逻辑（用于离线或实时过滤）
   */
  filterTodayTasks(tasks: Task[]): TodayTasksResponse {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const todayTasks: Task[] = [];
    const grouping = {
      in_progress: [] as Task[],
      due_today: [] as Task[],
      created_today: [] as Task[],
      updated_today: [] as Task[],
      overdue: [] as Task[]
    };

    tasks.forEach(task => {
      // 排除已取消的任务
      if (task.status === 'cancelled') {
        return;
      }

      let isToday = false;
      const taskCreatedDate = task.created_at?.split('T')[0];
      const taskUpdatedDate = task.updated_at?.split('T')[0];
      const taskDueDate = task.due_date?.split('T')[0];

      // 1. 任务状态为"正在进行中"
      if (task.status === 'in_progress') {
        isToday = true;
        grouping.in_progress.push(task);
      }

      // 2. 任务今天到期
      if (taskDueDate === todayStr) {
        isToday = true;
        grouping.due_today.push(task);
      }

      // 3. 任务今天被创建
      if (taskCreatedDate === todayStr) {
        isToday = true;
        grouping.created_today.push(task);
      }

      // 4. 任务今天被更新（更新时间不等于创建时间）
      if (taskUpdatedDate === todayStr && 
          task.updated_at !== task.created_at) {
        isToday = true;
        grouping.updated_today.push(task);
      }

      // 5. 任务已逾期但未完成
      if (taskDueDate && taskDueDate < todayStr && 
          task.status !== 'completed') {
        isToday = true;
        grouping.overdue.push(task);
      }

      if (isToday) {
        todayTasks.push(task);
      }
    });

    // 去重（一个任务可能满足多个条件）
    const uniqueTasks = Array.from(new Map(todayTasks.map(task => [task.id, task])).values());

    // 计算统计信息
    const stats: TodayTasksStats = {
      total_count: uniqueTasks.length,
      in_progress_count: grouping.in_progress.length,
      due_today_count: grouping.due_today.length,
      created_today_count: grouping.created_today.length,
      updated_today_count: grouping.updated_today.length,
      overdue_count: grouping.overdue.length,
      high_priority_count: uniqueTasks.filter(task => 
        task.custom_fields?.priority === 'high'
      ).length
    };

    return {
      tasks: uniqueTasks,
      stats,
      grouping
    };
  }

  /**
   * 检查单个任务是否为今日任务
   */
  isTaskForToday(task: Task): boolean {
    // 排除已取消的任务
    if (task.status === 'cancelled') {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const taskCreatedDate = task.created_at?.split('T')[0];
    const taskUpdatedDate = task.updated_at?.split('T')[0];
    const taskDueDate = task.due_date?.split('T')[0];

    // 检查各种条件
    return Boolean(
      // 正在进行中的任务
      task.status === 'in_progress' ||
      
      // 今天到期的任务
      taskDueDate === todayStr ||
      
      // 今天创建的任务
      taskCreatedDate === todayStr ||
      
      // 今天更新的任务（且不是创建时间）
      (taskUpdatedDate === todayStr && task.updated_at !== task.created_at) ||
      
      // 已逾期但未完成的任务
      (taskDueDate && taskDueDate < todayStr && 
       task.status !== 'completed')
    );
  }

  /**
   * 获取任务的今日状态标签
   */
  getTodayTaskLabels(task: Task): string[] {
    const labels: string[] = [];
    
    if (task.status === 'cancelled') {
      return labels;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const taskCreatedDate = task.created_at?.split('T')[0];
    const taskUpdatedDate = task.updated_at?.split('T')[0];
    const taskDueDate = task.due_date?.split('T')[0];

    if (task.status === 'in_progress') {
      labels.push('进行中');
    }

    if (taskDueDate === todayStr) {
      labels.push('今日到期');
    }

    if (taskCreatedDate === todayStr) {
      labels.push('今日创建');
    }

    if (taskUpdatedDate === todayStr && task.updated_at !== task.created_at) {
      labels.push('今日更新');
    }

    if (taskDueDate && taskDueDate < todayStr && 
        task.status !== 'completed') {
      labels.push('已逾期');
    }

    return labels;
  }
}

export const todayTasksService = new TodayTasksService();
export type { TodayTasksFilter, TodayTasksStats, TodayTasksResponse };