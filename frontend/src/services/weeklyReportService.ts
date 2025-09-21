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
  startTime: string;
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
  async getWeeklyReport(startDate?: string, endDate?: string, options?: { force?: boolean }): Promise<WeeklyReportData> {
    const userId = this.getCurrentUserId();
    const finalStartDate = startDate || this.getDefaultStartDate();
    const finalEndDate = endDate || this.getDefaultEndDate();
    
    // 检查缓存（允许通过 options.force 跳过缓存）
    const cacheKey = CACHE_KEYS.WEEKLY_REPORT(userId, finalStartDate, finalEndDate);
    if (!options?.force) {
      const cached = timerCache.get<WeeklyReportData>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const queryString = params.toString();
      const url = `/timer/weekly${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      // 验证响应结构
      if (!response || typeof response !== 'object') {
        console.warn('API响应格式无效:', response);
        return this.getEmptyWeeklyReportData();
      }

      // response.data可能不存在，直接使用response
      const rawData = response.data || response;
      
      // 检查debug_info
      if (rawData.debug_info) {
        console.warn('API返回调试信息:', rawData.debug_info);
      }
      
      // 转换后端数据格式到前端格式
      const reportData = this.transformWeeklyReportData(rawData);
      
      // 缓存结果
      timerCache.set(cacheKey, reportData, CACHE_TTL.STABLE);
      
      return reportData;
    } catch (error) {
      console.error('获取周报数据失败:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        response: error.response || undefined
      });
      
      // 返回空数据而不是抛出错误，提供更好的用户体验
      return this.getEmptyWeeklyReportData();
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
  private transformWeeklyReportData(backendData: any): WeeklyReportData {
    // 确保backendData存在且为对象
    if (!backendData || typeof backendData !== 'object') {
      console.warn('Backend data is invalid:', backendData);
      return this.getEmptyWeeklyReportData();
    }

    try {
      // 🔧 检查并警告负数时长数据
      const hasNegativeValues = 
        (backendData.weekly_stats?.total_hours < 0) ||
        (backendData.daily_stats || []).some((day: any) => day?.total_hours < 0) ||
        (backendData.task_time_entries || []).some((entry: any) => entry?.duration < 0) ||
        (backendData.project_stats || []).some((project: any) => project?.total_hours < 0);
      
      if (hasNegativeValues) {
        console.warn('⚠️ 检测到负数时长数据，已自动修正为0。后端可能存在时间计算错误。');
      }
      
      return {
        weeklyStats: {
          totalHours: Math.max(0, backendData.weekly_stats?.total_hours || 0), // 🔧 防止负数工作时长
          completedTasks: backendData.weekly_stats?.completed_tasks || 0,
          totalTasks: backendData.weekly_stats?.total_tasks || 0,
          efficiency: backendData.weekly_stats?.efficiency || 0,
          weekStart: backendData.weekly_stats?.week_start || this.getDefaultStartDate(),
          weekEnd: backendData.weekly_stats?.week_end || this.getDefaultEndDate(),
        },
        dailyStats: Array.isArray(backendData.daily_stats) 
          ? backendData.daily_stats.map((day: any) => ({
              date: day?.date || '',
              totalHours: Math.max(0, day?.total_hours || 0), // 🔧 防止负数工作时长
              tasksCompleted: day?.tasks_completed || 0,
              efficiency: day?.efficiency || 0,
              topTask: day?.top_task || '无任务',
            }))
          : [],
        taskTimeEntries: Array.isArray(backendData.task_time_entries)
          ? backendData.task_time_entries.map((entry: any) => ({
              id: entry?.id || '',
              taskTitle: entry?.task_title || '',
              projectName: entry?.project_name || '',
              duration: Math.max(0, entry?.duration || 0), // 🔧 防止负数任务时长
              date: entry?.date || '',
              status: this.mapTaskStatus(entry?.status),
              priority: this.mapTaskPriority(entry?.priority),
              startTime: entry?.start_time || '',
            }))
          : [],
        projectStats: Array.isArray(backendData.project_stats)
          ? backendData.project_stats.map((project: any) => ({
              projectName: project?.project_name || '',
              totalHours: Math.max(0, project?.total_hours || 0), // 🔧 防止负数项目时长
              tasksCount: project?.tasks_count || 0,
              completionRate: project?.completion_rate || 0,
              color: project?.color || '#1890ff',
            }))
          : [],
      };
    } catch (error) {
      console.error('Error transforming weekly report data:', error);
      return this.getEmptyWeeklyReportData();
    }
  }

  /**
   * 获取空的周报数据结构
   */
  private getEmptyWeeklyReportData(): WeeklyReportData {
    return {
      weeklyStats: {
        totalHours: 0,
        completedTasks: 0,
        totalTasks: 0,
        efficiency: 0,
        weekStart: this.getDefaultStartDate(),
        weekEnd: this.getDefaultEndDate(),
      },
      dailyStats: [],
      taskTimeEntries: [],
      projectStats: [],
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