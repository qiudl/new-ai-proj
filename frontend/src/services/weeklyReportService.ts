import api from './api';
import { timerCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

// 周报数据类型定义
export interface WeeklyStats {
  totalHours: number;
  completedTasks: number;
  totalTasks: number;
  efficiency: number;
  weekStart: string;
  weekEnd: string;
}

export interface DailyStats {
  date: string;
  totalHours: number;
  tasksCompleted: number;
  efficiency: number;
  topTask: string;
}

export interface TaskTimeEntry {
  id: string;
  taskTitle: string;
  projectName: string;
  duration: number;
  date: string;
  status: 'completed' | 'in_progress' | 'todo';
  priority: 'high' | 'medium' | 'low';
}

export interface ProjectTimeStats {
  projectName: string;
  totalHours: number;
  tasksCount: number;
  completionRate: number;
  color: string;
}

export interface WeeklyReportData {
  weeklyStats: WeeklyStats;
  dailyStats: DailyStats[];
  taskTimeEntries: TaskTimeEntry[];
  projectStats: ProjectTimeStats[];
}

class WeeklyReportService {
  /**
   * 获取当前用户ID
   */
  private getCurrentUserId(): number {
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
  }

  /**
   * 获取默认开始日期（本周一）
   */
  private getDefaultStartDate(): string {
    const now = new Date();
    const weekday = now.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    return monday.toISOString().split('T')[0];
  }

  /**
   * 获取默认结束日期（本周日）
   */
  private getDefaultEndDate(): string {
    const now = new Date();
    const weekday = now.getDay();
    const sundayOffset = weekday === 0 ? 0 : 7 - weekday;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + sundayOffset);
    return sunday.toISOString().split('T')[0];
  }

  /**
   * 获取周报数据
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   */
  async getWeeklyReport(startDate?: string, endDate?: string): Promise<WeeklyReportData> {
    const userId = this.getCurrentUserId();
    const finalStartDate = startDate || this.getDefaultStartDate();
    const finalEndDate = endDate || this.getDefaultEndDate();
    
    // 检查缓存
    const cacheKey = CACHE_KEYS.WEEKLY_REPORT(userId, finalStartDate, finalEndDate);
    const cached = timerCache.get<WeeklyReportData>(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const queryString = params.toString();
      const url = `/timer/weekly${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      // 转换后端数据格式到前端格式
      const reportData = this.transformWeeklyReportData(response.data);
      
      // 缓存结果
      timerCache.set(cacheKey, reportData, CACHE_TTL.STABLE);
      
      return reportData;
    } catch (error) {
      console.error('获取周报数据失败:', error);
      throw new Error('获取周报数据失败，请稍后重试');
    }
  }

  /**
   * 获取当前周的报表数据
   */
  async getCurrentWeekReport(): Promise<WeeklyReportData> {
    return this.getWeeklyReport();
  }

  /**
   * 获取指定日期范围的报表数据
   * @param dateRange 日期范围数组 [startDate, endDate]
   */
  async getDateRangeReport(dateRange: [string, string]): Promise<WeeklyReportData> {
    return this.getWeeklyReport(dateRange[0], dateRange[1]);
  }

  /**
   * 转换后端数据格式到前端格式
   */
  private transformWeeklyReportData(backendData: unknown): WeeklyReportData {
    return {
      weeklyStats: {
        totalHours: backendData.weekly_stats?.total_hours || 0,
        completedTasks: backendData.weekly_stats?.completed_tasks || 0,
        totalTasks: backendData.weekly_stats?.total_tasks || 0,
        efficiency: backendData.weekly_stats?.efficiency || 0,
        weekStart: backendData.weekly_stats?.week_start || '',
        weekEnd: backendData.weekly_stats?.week_end || '',
      },
      dailyStats: (backendData.daily_stats || []).map((day: unknown) => ({
        date: day.date,
        totalHours: day.total_hours || 0,
        tasksCompleted: day.tasks_completed || 0,
        efficiency: day.efficiency || 0,
        topTask: day.top_task || '无任务',
      })),
      taskTimeEntries: (backendData.task_time_entries || []).map((entry: unknown) => ({
        id: entry.id,
        taskTitle: entry.task_title,
        projectName: entry.project_name,
        duration: entry.duration || 0,
        date: entry.date,
        status: this.mapTaskStatus(entry.status),
        priority: this.mapTaskPriority(entry.priority),
      })),
      projectStats: (backendData.project_stats || []).map((project: unknown) => ({
        projectName: project.project_name,
        totalHours: project.total_hours || 0,
        tasksCount: project.tasks_count || 0,
        completionRate: project.completion_rate || 0,
        color: project.color || '#1890ff',
      })),
    };
  }

  /**
   * 映射任务状态
   */
  private mapTaskStatus(status: string): 'completed' | 'in_progress' | 'todo' {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'in_progress':
        return 'in_progress';
      case 'todo':
        return 'todo';
      default:
        return 'todo';
    }
  }

  /**
   * 映射任务优先级
   */
  private mapTaskPriority(priority: string): 'high' | 'medium' | 'low' {
    switch (priority) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * 获取周报统计概览数据
   */
  async getWeeklyStatsOverview(startDate?: string, endDate?: string): Promise<WeeklyStats> {
    const reportData = await this.getWeeklyReport(startDate, endDate);
    return reportData.weeklyStats;
  }

  /**
   * 导出周报数据为JSON
   */
  async exportWeeklyReportJSON(startDate?: string, endDate?: string): Promise<string> {
    try {
      const data = await this.getWeeklyReport(startDate, endDate);
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('导出周报数据失败:', error);
      throw new Error('导出周报数据失败');
    }
  }

  /**
   * 获取工作效率趋势数据
   */
  async getEfficiencyTrend(startDate?: string, endDate?: string): Promise<DailyStats[]> {
    const reportData = await this.getWeeklyReport(startDate, endDate);
    return reportData.dailyStats.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const weeklyReportService = new WeeklyReportService();
export default weeklyReportService;