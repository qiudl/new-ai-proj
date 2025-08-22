import api from './api';
import { HistoryTask } from '../types/historyTask';

export class HistoryTaskService {
  /**
   * 获取历史计时任务列表
   * 按最后更新时间倒序排列
   */
  static async getHistoryTasks(limit: number = 50): Promise<HistoryTask[]> {
    try {
      // 尝试调用专门的历史任务API
      const response = await api.get(`/timer/history?limit=${limit}&order_by=last_updated&order=desc`);
      
      if (response?.data && Array.isArray(response.data)) {
        const items = response.data.map(this.transformHistoryTask);
        // 健壮排序：按 last_updated 降序，无效时间置后
        items.sort((a, b) => this.safeTime(b.last_updated) - this.safeTime(a.last_updated));
        return items.slice(0, limit);
      }
      
      // 如果没有专门的API，从统计数据中获取
      return await this.getFallbackHistoryTasks(limit);
    } catch (error) {
      console.error('获取历史任务失败:', error);
      return await this.getFallbackHistoryTasks(limit);
    }
  }

  /**
   * 降级方案：从统计API获取历史任务
   */
  private static async getFallbackHistoryTasks(limit: number): Promise<HistoryTask[]> {
    try {
      // 从统计数据中获取最近的任务
      const statsResponse = await api.get('/timer/stats');
      const stats = statsResponse?.data;
      
      if (stats?.recent_tasks && Array.isArray(stats.recent_tasks)) {
        const items = stats.recent_tasks
          .map(this.transformFromRecentTask);
        // 健壮排序：按 last_updated 降序，无效时间置后
        items.sort((a, b) => this.safeTime(b.last_updated) - this.safeTime(a.last_updated));
        return items.slice(0, limit);
      }

      // 如果统计API也没有数据，从项目任务中筛选有计时记录的任务
      return await this.getTasksWithTimeEntries(limit);
    } catch (error) {
      console.error('降级方案获取历史任务失败:', error);
      return [];
    }
  }

  /**
   * 从项目任务中筛选有计时记录的任务
   */
  private static async getTasksWithTimeEntries(limit: number): Promise<HistoryTask[]> {
    try {
      // 获取用户的项目
      const projectsResponse = await api.get('/projects?limit=20');
      const projects = projectsResponse?.data?.data || [];

      if (projects.length === 0) {
        return [];
      }

      // 收集所有有计时记录的任务
      const historyTasks: HistoryTask[] = [];

      for (const project of projects) {
        try {
          // 获取项目任务，优先获取有实际时间记录的任务
          const tasksResponse = await api.get(
            `/projects/${project.id}/tasks?page=1&page_size=20&has_time_entries=true`
          );
          
          const tasks = tasksResponse?.data?.data || [];
          
          for (const task of tasks) {
            // 只包含有计时记录的任务
            if (task.total_time_seconds && task.total_time_seconds > 0) {
              historyTasks.push({
                id: task.id,
                task_id: task.id,
                task_title: task.title,
                project_name: project.name,
                total_seconds: task.total_time_seconds,
                formatted_time: this.formatDuration(task.total_time_seconds),
                last_updated: task.updated_at || task.created_at,
                status: this.mapTaskStatus(task.status),
                session_count: 1 // 默认值，实际应该从时间日志计算
              });
            }
          }
        } catch (error) {
          console.warn(`获取项目 ${project.id} 的计时任务失败:`, error);
          continue;
        }
      }

      // 按最后更新时间排序并限制数量
      return historyTasks
        .sort((a, b) => this.safeTime(b.last_updated) - this.safeTime(a.last_updated))
        .slice(0, limit);

    } catch (error) {
      console.error('从任务中筛选历史计时记录失败:', error);
      return [];
    }
  }

  /**
   * 转换API返回的历史任务数据
   */
  private static transformHistoryTask(apiData: any): HistoryTask {
    return {
      id: apiData?.id || apiData?.task_id,
      task_id: apiData?.task_id,
      task_title: apiData?.task_title || apiData?.title,
      project_name: apiData?.project_name || 'Unknown Project',
      total_seconds: apiData?.total_seconds || 0,
      formatted_time: apiData?.formatted_time || this.formatDuration(apiData?.total_seconds || 0),
      last_updated: apiData?.last_updated || apiData?.updated_at || apiData?.last_timed_at || apiData?.created_at,
      status: this.mapTaskStatus(apiData?.status),
      session_count: apiData?.session_count || 1
    };
  }

  /**
   * 从RecentTimedTask转换为HistoryTask
   */
  private static transformFromRecentTask(recentTask: any): HistoryTask {
    return {
      id: recentTask?.task_id,
      task_id: recentTask?.task_id,
      task_title: recentTask?.task_title,
      project_name: recentTask?.project_name,
      total_seconds: recentTask?.total_seconds,
      formatted_time: recentTask?.formatted_time,
      last_updated: recentTask?.last_timed_at || recentTask?.updated_at || recentTask?.created_at,
      status: this.mapTaskStatus(recentTask?.status),
      session_count: 1
    };
  }

  /**
   * 映射任务状态
   */
  private static mapTaskStatus(status: string): 'completed' | 'in_progress' | 'paused' {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'in_progress':
        return 'in_progress';
      case 'paused':
        return 'paused';
      default:
        return 'in_progress';
    }
  }

  /**
   * 格式化时长
   */
  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 将日期字符串或Date转换为时间戳；无效返回0
   */
  private static safeTime(value: any): number {
    if (!value) return 0;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  /**
   * 获取特定任务的计时历史详细信息
   */
  static async getTaskTimeHistory(taskId: number): Promise<{
    task_title: string;
    project_name: string;
    total_sessions: number;
    total_time: string;
    sessions: Array<{
      id: number;
      start_time: string;
      end_time: string;
      duration: string;
      date: string;
    }>;
  } | null> {
    try {
      const response = await api.get(`/tasks/${taskId}/time-history`);
      
      if (response?.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error(`获取任务 ${taskId} 的计时历史失败:`, error);
      return null;
    }
  }

  /**
   * 删除历史记录项
   */
  static async deleteHistoryEntry(historyId: number): Promise<boolean> {
    try {
      await api.delete(`/timer/history/${historyId}`);
      return true;
    } catch (error) {
      console.error(`删除历史记录 ${historyId} 失败:`, error);
      return false;
    }
  }

  /**
   * 批量删除历史记录
   */
  static async batchDeleteHistory(historyIds: number[]): Promise<boolean> {
    try {
      await api.post('/timer/history/batch-delete', { ids: historyIds });
      return true;
    } catch (error) {
      console.error('批量删除历史记录失败:', error);
      return false;
    }
  }
}