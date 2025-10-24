import api from './api';
import {
  DailyFocusTask,
  DailyFocusTaskRequest,
  DailyFocusTaskUpdate,
  DailyFocusTaskReorderItem,
  DailyFocusTaskResponse,
  DailyFocusTaskStats,
  DailyFocusTaskFilter,
  DailyFocusTaskBatchRequest,
  DailyFocusTaskBatchResponse
} from '../types/dailyFocusTask';
import { Task } from '../types/task';
import { APIResponse } from '../types/task';

class DailyFocusTasksService {
  private readonly basePath = '/daily-focus-tasks';

  async getDailyFocusTasks(filters?: DailyFocusTaskFilter): Promise<DailyFocusTaskResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.priority) {
        params.append('priority', filters.priority);
      }
      if (filters?.completed !== undefined) {
        params.append('completed', filters.completed.toString());
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }

      const queryString = params.toString();
      const url = queryString ? `${this.basePath}?${queryString}` : this.basePath;
      
      const response = await api.get<any>(url);
      
      // API interceptor已经unwrapped响应，需要将后端格式转换为前端期望的格式
      // 后端返回: {total_count, active_count, completed_count, tasks: [...]}
      // 前端期望: {tasks: [...], stats: {...}}
      const totalCount = response.total_count || 0;
      const completedCount = response.completed_count || 0;
      const activeCount = response.active_count || 0;
      const pendingCount = totalCount - completedCount;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      // 计算优先级分布
      const tasks = response.tasks || [];
      const priorityDistribution = tasks.reduce((acc: any, task: any) => {
        const priority = task.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      });

      return {
        tasks: tasks,
        stats: {
          total_count: totalCount,
          completed_count: completedCount,
          pending_count: pendingCount,
          completion_rate: completionRate,
          priority_distribution: priorityDistribution
        },
        total_count: totalCount
      };
    } catch (error: any) {
      // 重新抛出错误，让 hook 处理认证错误
      throw error;
    }
  }

  async getDailyFocusTasksStats(filters?: DailyFocusTaskFilter): Promise<DailyFocusTaskStats> {
    const params = new URLSearchParams();
    
    if (filters?.priority) {
      params.append('priority', filters.priority);
    }
    if (filters?.completed !== undefined) {
      params.append('completed', filters.completed.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `${this.basePath}/stats?${queryString}` : `${this.basePath}/stats`;
    
    const response = await api.get<APIResponse<DailyFocusTaskStats>>(url);

    if (!response || !response.success) {
      throw new Error(response?.error?.message || '获取统计信息失败');
    }

    return response.data!;
  }

  async getDailyFocusTask(id: number): Promise<DailyFocusTask> {
    const response = await api.get<APIResponse<DailyFocusTask>>(`${this.basePath}/${id}`);

    if (!response || !response.success) {
      throw new Error(response?.error?.message || '获取任务详情失败');
    }

    return response.data!;
  }

  async addDailyFocusTask(request: DailyFocusTaskRequest): Promise<DailyFocusTask> {
    const response = await api.post<DailyFocusTask>(this.basePath, request);
    
    // API interceptor已经unwrapped响应，直接返回数据
    return response;
  }

  async updateDailyFocusTask(id: number, update: DailyFocusTaskUpdate): Promise<DailyFocusTask> {
    const response = await api.put<DailyFocusTask>(`${this.basePath}/${id}`, update);
    
    // API interceptor已经unwrapped响应，直接返回数据
    return response;
  }

  async deleteDailyFocusTask(id: number): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
    
    // API interceptor已经unwrapped响应，无需检查success字段
  }

  async reorderDailyFocusTasks(items: DailyFocusTaskReorderItem[]): Promise<void> {
    await api.put(`${this.basePath}/reorder`, { items });
    
    // API interceptor已经unwrapped响应，无需检查success字段
  }

  async markCompleted(id: number): Promise<DailyFocusTask> {
    const response = await api.post<DailyFocusTask>(`${this.basePath}/${id}/complete`);
    
    // API interceptor已经unwrapped响应，直接返回数据
    return response;
  }

  async getRecommendations(searchKeyword?: string): Promise<Task[]> {
    try {
      const params = new URLSearchParams();
      if (searchKeyword) {
        params.append('search', searchKeyword);
      }
      
      const url = params.toString() ? `${this.basePath}/recommendations?${params}` : `${this.basePath}/recommendations`;
      const response = await api.get(url);
      
      // Handle the actual API response structure: {data: {suggestions: [{task: ...}]}}
      if (response && response.suggestions && Array.isArray(response.suggestions)) {
        const tasks = response.suggestions.map((suggestion: any) => suggestion.task).filter(Boolean);
        return tasks;
      }
      
      return [];
    } catch (error: any) {
      // Re-throw error to let hook handle authentication errors  
      throw error;
    }
  }

  async batchAddDailyFocusTasks(request: DailyFocusTaskBatchRequest): Promise<DailyFocusTaskBatchResponse> {
    const response = await api.post<DailyFocusTaskBatchResponse>(`${this.basePath}/batch`, request);
    
    // API interceptor已经unwrapped响应，直接返回数据
    return response;
  }

  async carryOverTasks(fromDate: string, toDate: string, taskIds?: number[]): Promise<DailyFocusTaskBatchResponse> {
    const request: any = {
      from_date: fromDate,
      to_date: toDate
    };
    
    if (taskIds && taskIds.length > 0) {
      request.task_ids = taskIds;
    }
    
    try {
      const response = await api.post<DailyFocusTaskBatchResponse>(`${this.basePath}/carry-over`, request);
      
      // API interceptor已经unwrapped响应，直接返回数据
      return response;
    } catch (error: any) {
      // Enhanced error handling
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('任务延续失败');
      }
    }
  }

  async autoCarryOverYesterdayTasks(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const today = new Date();
      
      const fromDateStr = yesterday.toISOString().split('T')[0];
      const toDateStr = today.toISOString().split('T')[0];
      
      const result = await this.carryOverTasks(fromDateStr, toDateStr);
      
      return {
        success: true,
        count: result.processed_count || result.ProcessedCount || 0,
        message: `成功延续 ${result.processed_count || result.ProcessedCount || 0} 个任务`
      };
    } catch (error: any) {
      console.warn('Auto carry-over failed:', error);
      return {
        success: false,
        count: 0,
        message: error.message || '自动延续任务失败'
      };
    }
  }

  // Utility functions
  isDailyFocusTask(task: Task): boolean {
    // Check if a task is marked as daily focus task
    // This would typically be implemented based on task metadata or tags
    return task.tags?.includes('daily_focus') || false;
  }

  getDailyFocusTaskLabels(task: DailyFocusTask): string[] {
    const labels: string[] = [];
    
    if (task.completed_at) {
      labels.push('已完成');
    }
    
    if (task.priority === 'critical') {
      labels.push('关键任务');
    } else if (task.priority === 'high') {
      labels.push('高优先级');
    }
    
    if (task.task_due_date) {
      const dueDate = new Date(task.task_due_date);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      if (dueDate < today) {
        labels.push('已逾期');
      } else if (dueDate.toDateString() === today.toDateString()) {
        labels.push('今日到期');
      } else if (dueDate.toDateString() === tomorrow.toDateString()) {
        labels.push('明日到期');
      }
    }
    
    return labels;
  }

  validateDailyFocusTaskRequest(request: DailyFocusTaskRequest): string[] {
    const errors: string[] = [];
    
    if (!request.task_id || request.task_id <= 0) {
      errors.push('任务ID无效');
    }
    
    if (!request.priority || !['critical', 'high', 'medium', 'low'].includes(request.priority)) {
      errors.push('优先级无效');
    }
    
    if (request.notes && request.notes.length > 500) {
      errors.push('备注不能超过500字符');
    }
    
    if (request.sort_order !== undefined && request.sort_order < 0) {
      errors.push('排序序号不能为负数');
    }
    
    return errors;
  }

  // Client-side filtering for offline support
  filterDailyFocusTasks(tasks: DailyFocusTask[], filters?: DailyFocusTaskFilter): DailyFocusTask[] {
    if (!filters) return tasks;
    
    return tasks.filter(task => {
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      
      if (filters.completed !== undefined) {
        const isCompleted = !!task.completed_at;
        if (filters.completed !== isCompleted) {
          return false;
        }
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const taskTitle = task.task_title?.toLowerCase() || '';
        const notes = task.notes?.toLowerCase() || '';
        if (!taskTitle.includes(searchLower) && !notes.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }

  // Calculate client-side stats
  calculateStats(tasks: DailyFocusTask[]): DailyFocusTaskStats {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed_at).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const priorityDistribution = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    } as Record<string, number>);
    
    return {
      total_count: total,
      completed_count: completed,
      pending_count: pending,
      completion_rate: completionRate,
      priority_distribution: priorityDistribution as any
    };
  }
}

export const dailyFocusTasksService = new DailyFocusTasksService();