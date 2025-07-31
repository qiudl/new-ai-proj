import api from './api';
import { checkTokenValidity } from './api';

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
   * 获取周报数据 - 增强版本，包含完整的错误处理和Token验证
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   */
  async getWeeklyReport(startDate?: string, endDate?: string): Promise<WeeklyReportData> {
    try {
      // 首先检查Token有效性
      if (!checkTokenValidity()) {
        console.warn('❌ Token无效，返回默认数据并触发登录流程');
        return this.getDefaultWeeklyReportData();
      }

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const queryString = params.toString();
      const url = `/timer/weekly${queryString ? `?${queryString}` : ''}`;
      
      console.log('📡 发送周报请求:', url);
      
      const response = await api.get(url);
      
      // 详细的响应数据验证和日志
      console.log('📥 周报API原始响应:', response);
      
      // 检查响应数据结构
      if (!response || typeof response !== 'object') {
        console.warn('⚠️ 周报API返回的不是对象，使用默认值');
        return this.getDefaultWeeklyReportData();
      }

      // 验证核心数据结构是否存在
      const hasWeeklyStats = (response as any).weekly_stats && typeof (response as any).weekly_stats === 'object';
      const hasDailyStats = Array.isArray((response as any).daily_stats);
      const hasTaskTimeEntries = Array.isArray((response as any).task_time_entries);
      const hasProjectStats = Array.isArray((response as any).project_stats);
      
      console.log('🔍 数据结构检查:', {
        hasWeeklyStats,
        hasDailyStats,
        hasTaskTimeEntries,
        hasProjectStats,
        responseKeys: Object.keys(response)
      });
      
      // 如果缺少关键数据结构，记录详细信息
      if (!hasWeeklyStats) {
        console.error('❌ 缺少 weekly_stats 数据结构');
        console.error('📊 当前响应数据:', JSON.stringify(response, null, 2));
      }
      
      // 转换后端数据格式到前端格式
      return this.transformWeeklyReportData(response);
    } catch (error: any) {
      console.error('💥 获取周报数据失败:', error);
      
      // 增强的错误处理
      if (error?.response?.status === 401) {
        console.warn('🔐 认证失败，用户将被重定向到登录页面');
        // API拦截器会处理401错误和重定向
      } else if (error?.response?.status === 500) {
        console.error('🔧 服务器内部错误，可能是数据库问题');
      } else if (error?.code === 'NETWORK_ERROR' || !error?.response) {
        console.error('🌐 网络连接错误');
      }
      
      // 返回默认数据而不是抛出错误，避免UI崩溃
      console.warn('🛡️ 返回默认周报数据以避免UI崩溃');
      return this.getDefaultWeeklyReportData();
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
   * 转换后端数据格式到前端格式 - 增强版本，包含详细的安全访问
   */
  private transformWeeklyReportData(backendData: any): WeeklyReportData {
    // 添加数据验证和安全访问
    if (!backendData) {
      console.warn('⚠️ 后端返回数据为空，使用默认值');
      return this.getDefaultWeeklyReportData();
    }

    // 安全地访问 weekly_stats，并记录详细信息
    const weeklyStats = backendData.weekly_stats;
    if (!weeklyStats) {
      console.error('❌ weekly_stats 字段不存在');
      console.error('📋 可用字段:', Object.keys(backendData));
      console.error('📄 完整数据:', JSON.stringify(backendData, null, 2));
    }

    // 安全地访问其他数据字段
    const dailyStats = this.ensureArray(backendData.daily_stats);
    const taskTimeEntries = this.ensureArray(backendData.task_time_entries);
    const projectStats = this.ensureArray(backendData.project_stats);

    console.log('🔄 数据转换信息:', {
      weeklyStatsExists: !!weeklyStats,
      dailyStatsCount: dailyStats.length,
      taskEntriesCount: taskTimeEntries.length,
      projectStatsCount: projectStats.length
    });

    return {
      weeklyStats: {
        totalHours: this.safeNumber(weeklyStats?.total_hours, 0),
        completedTasks: this.safeNumber(weeklyStats?.completed_tasks, 0),
        totalTasks: this.safeNumber(weeklyStats?.total_tasks, 0),
        efficiency: this.safeNumber(weeklyStats?.efficiency, 0),
        weekStart: this.safeString(weeklyStats?.week_start, this.getCurrentWeekStart()),
        weekEnd: this.safeString(weeklyStats?.week_end, this.getCurrentWeekEnd())},
      dailyStats: dailyStats.map((day: any) => ({
        date: this.safeString(day?.date, ''),
        totalHours: this.safeNumber(day?.total_hours, 0),
        tasksCompleted: this.safeNumber(day?.tasks_completed, 0),
        efficiency: this.safeNumber(day?.efficiency, 0),
        topTask: this.safeString(day?.top_task, '无任务')})),
      taskTimeEntries: taskTimeEntries.map((entry: any) => ({
        id: this.safeString(entry?.id, ''),
        taskTitle: this.safeString(entry?.task_title, '未知任务'),
        projectName: this.safeString(entry?.project_name, '未知项目'),
        duration: this.safeNumber(entry?.duration, 0),
        date: this.safeString(entry?.date, ''),
        status: this.mapTaskStatus(entry?.status),
        priority: this.mapTaskPriority(entry?.priority)})),
      projectStats: projectStats.map((project: any) => ({
        projectName: this.safeString(project?.project_name, '未知项目'),
        totalHours: this.safeNumber(project?.total_hours, 0),
        tasksCount: this.safeNumber(project?.tasks_count, 0),
        completionRate: this.safeNumber(project?.completion_rate, 0),
        color: this.safeString(project?.color, '#1890ff')}))};
  }

  /**
   * 安全的数字类型转换
   */
  private safeNumber(value: any, defaultValue: number): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  }

  /**
   * 安全的字符串类型转换
   */
  private safeString(value: any, defaultValue: string): string {
    if (typeof value === 'string') {
      return value;
    }
    if (value != null) {
      return String(value);
    }
    return defaultValue;
  }

  /**
   * 确保返回数组格式
   */
  private ensureArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value == null) {
      return [];
    }
    return [value];
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
      console.error('💥 导出周报数据失败:', error);
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

  /**
   * 获取默认的周报数据，用于API失败时的fallback
   */
  private getDefaultWeeklyReportData(): WeeklyReportData {
    console.log('🛡️ 使用默认周报数据');
    return {
      weeklyStats: {
        totalHours: 0,
        completedTasks: 0,
        totalTasks: 0,
        efficiency: 0,
        weekStart: this.getCurrentWeekStart(),
        weekEnd: this.getCurrentWeekEnd()},
      dailyStats: [],
      taskTimeEntries: [],
      projectStats: []};
  }

  /**
   * 获取当前周的开始日期
   */
  private getCurrentWeekStart(): string {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return startOfWeek.toISOString().split('T')[0];
  }

  /**
   * 获取当前周的结束日期
   */
  private getCurrentWeekEnd(): string {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() - now.getDay() + 6);
    return endOfWeek.toISOString().split('T')[0];
  }
}

export const weeklyReportService = new WeeklyReportService();
export default weeklyReportService;