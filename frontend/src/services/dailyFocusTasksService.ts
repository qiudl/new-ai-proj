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
      
      const response = await api.get<DailyFocusTaskResponse>(url);
      
      // The API interceptor unwraps the response, so we get the data directly
      return response;
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
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '获取统计信息失败');
    }
    
    return response.data.data!;
  }

  async getDailyFocusTask(id: number): Promise<DailyFocusTask> {
    const response = await api.get<APIResponse<DailyFocusTask>>(`${this.basePath}/${id}`);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '获取任务详情失败');
    }
    
    return response.data.data!;
  }

  async addDailyFocusTask(request: DailyFocusTaskRequest): Promise<DailyFocusTask> {
    const response = await api.post<APIResponse<DailyFocusTask>>(this.basePath, request);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '添加今日主要任务失败');
    }
    
    return response.data.data!;
  }

  async updateDailyFocusTask(id: number, update: DailyFocusTaskUpdate): Promise<DailyFocusTask> {
    const response = await api.put<APIResponse<DailyFocusTask>>(`${this.basePath}/${id}`, update);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '更新今日主要任务失败');
    }
    
    return response.data.data!;
  }

  async deleteDailyFocusTask(id: number): Promise<void> {
    const response = await api.delete<APIResponse<void>>(`${this.basePath}/${id}`);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '删除今日主要任务失败');
    }
  }

  async reorderDailyFocusTasks(items: DailyFocusTaskReorderItem[]): Promise<void> {
    const response = await api.put<APIResponse<void>>(`${this.basePath}/reorder`, { items });
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '调整任务顺序失败');
    }
  }

  async markCompleted(id: number): Promise<DailyFocusTask> {
    const response = await api.post<APIResponse<DailyFocusTask>>(`${this.basePath}/${id}/complete`);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '标记任务完成失败');
    }
    
    return response.data.data!;
  }

  async getRecommendations(): Promise<Task[]> {
    try {
      const response = await api.get<Task[]>(`${this.basePath}/recommendations`);
      
      // The API interceptor unwraps the response, so we get the data array directly
      return Array.isArray(response) ? response : [];
    } catch (error: any) {
      // Re-throw error to let hook handle authentication errors
      throw error;
    }
  }

  async batchAddDailyFocusTasks(request: DailyFocusTaskBatchRequest): Promise<DailyFocusTaskBatchResponse> {
    const response = await api.post<APIResponse<DailyFocusTaskBatchResponse>>(`${this.basePath}/batch`, request);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '批量添加今日主要任务失败');
    }
    
    return response.data.data!;
  }

  async carryOverTasks(fromDate: string, toDate: string, taskIds?: number[]): Promise<DailyFocusTaskBatchResponse> {
    const request: any = {
      from_date: fromDate,
      to_date: toDate
    };
    
    if (taskIds && taskIds.length > 0) {
      request.task_ids = taskIds;
    }
    
    const response = await api.post<APIResponse<DailyFocusTaskBatchResponse>>(`${this.basePath}/carry-over`, request);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || '任务延续失败');
    }
    
    return response.data.data!;
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
        count: result.processed_count || 0,
        message: `成功延续 ${result.processed_count} 个任务`
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