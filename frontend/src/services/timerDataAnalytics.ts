// Phase 3: 数据可视化服务 - 计时数据分析和统计
import * as dayjs from 'dayjs';
import * as isoWeek from 'dayjs/plugin/isoWeek';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);

// 基础数据接口
export interface TimerSession {
  id: number;
  task_id?: number;
  user_timer_task_id?: number;
  task_title: string;
  project_name?: string;
  category: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  is_completed: boolean;
  interruption_count: number;
  focus_score: number; // 专注度评分 0-100
}

export interface ProjectTimeStats {
  project_id: number;
  project_name: string;
  total_seconds: number;
  session_count: number;
  completion_rate: number;
  avg_focus_score: number;
  color: string;
}

export interface DailyWorkPattern {
  hour: number;
  total_seconds: number;
  session_count: number;
  avg_efficiency: number;
  peak_focus_score: number;
}

export interface WeeklyTrendData {
  date: string;
  total_seconds: number;
  planned_seconds: number;
  efficiency_score: number;
  focus_score: number;
  session_count: number;
}

export interface EfficiencyMetrics {
  overall_efficiency: number; // 整体效率 0-100
  focus_index: number; // 专注指数 0-100
  consistency_score: number; // 一致性评分 0-100
  interruption_rate: number; // 中断率 0-1
  optimal_work_hours: number[]; // 最佳工作时段 [start, end]
  productivity_trend: 'increasing' | 'stable' | 'decreasing';
}

export interface TimerAnalyticsData {
  today_stats: {
    total_seconds: number;
    planned_seconds: number;
    efficiency_score: number;
    session_count: number;
    project_distribution: ProjectTimeStats[];
    hourly_pattern: DailyWorkPattern[];
  };
  weekly_trend: WeeklyTrendData[];
  efficiency_metrics: EfficiencyMetrics;
  task_completion_analysis: {
    avg_completion_time: number;
    completion_rate: number;
    most_productive_categories: string[];
    improvement_suggestions: string[];
  };
}

class TimerDataAnalyticsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取缓存数据
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * 设置缓存数据
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * 计算专注度评分
   */
  private calculateFocusScore(session: Partial<TimerSession>): number {
    const duration = session.duration_seconds || 0;
    const interruptions = session.interruption_count || 0;
    
    // 基础评分：连续工作时长贡献
    let baseScore = Math.min(duration / 3600, 2) * 50; // 最多2小时贡献100分
    
    // 中断惩罚：每次中断扣5分
    const interruptionPenalty = interruptions * 5;
    
    // 时长奖励：25分钟以上的专注块给额外奖励
    const focusBonus = duration > 1500 ? 10 : 0; // 25分钟
    
    return Math.max(0, Math.min(100, baseScore - interruptionPenalty + focusBonus));
  }

  /**
   * 计算效率评分
   */
  private calculateEfficiencyScore(
    actualTime: number, 
    estimatedTime: number,
    qualityScore: number = 80
  ): number {
    if (estimatedTime <= 0) return qualityScore;
    
    const timeRatio = actualTime / estimatedTime;
    let efficiencyScore: number;
    
    if (timeRatio <= 0.8) {
      // 提前完成，给予奖励
      efficiencyScore = 100 + (0.8 - timeRatio) * 50;
    } else if (timeRatio <= 1.2) {
      // 正常范围
      efficiencyScore = 100 - (timeRatio - 0.8) * 125;
    } else {
      // 超时，扣分更多
      efficiencyScore = 50 - (timeRatio - 1.2) * 25;
    }
    
    // 结合质量评分
    return Math.max(0, Math.min(100, efficiencyScore * 0.7 + qualityScore * 0.3));
  }

  /**
   * 生成模拟的今日统计数据（基于真实模式）
   */
  private generateTodayMockData(): TimerAnalyticsData['today_stats'] {
    const now = dayjs();
    const todayStart = now.startOf('day');
    
    // 模拟项目分布数据
    const projectDistribution: ProjectTimeStats[] = [
      {
        project_id: 1,
        project_name: 'AI上下文任务系统MVP',
        total_seconds: 14400, // 4小时
        session_count: 6,
        completion_rate: 85,
        avg_focus_score: 78,
        color: '#1890ff'
      },
      {
        project_id: 2,
        project_name: '个人计时系统',
        total_seconds: 7200, // 2小时
        session_count: 3,
        completion_rate: 92,
        avg_focus_score: 88,
        color: '#52c41a'
      },
      {
        project_id: 0,
        project_name: '个人学习',
        total_seconds: 3600, // 1小时
        session_count: 2,
        completion_rate: 100,
        avg_focus_score: 85,
        color: '#fa8c16'
      }
    ];

    // 模拟每小时工作模式
    const hourlyPattern: DailyWorkPattern[] = [];
    for (let hour = 0; hour < 24; hour++) {
      let totalSeconds = 0;
      let sessionCount = 0;
      let avgEfficiency = 0;
      let peakFocusScore = 0;

      // 模拟工作时间分布（9-12, 14-18, 20-22较活跃）
      if ((hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 18) || (hour >= 20 && hour <= 22)) {
        totalSeconds = Math.floor(Math.random() * 3000) + 600; // 10分钟到1小时
        sessionCount = Math.floor(Math.random() * 3) + 1;
        avgEfficiency = Math.floor(Math.random() * 20) + 70; // 70-90效率
        peakFocusScore = Math.floor(Math.random() * 25) + 75; // 75-100专注度
      }

      hourlyPattern.push({
        hour,
        total_seconds: totalSeconds,
        session_count: sessionCount,
        avg_efficiency: avgEfficiency,
        peak_focus_score: peakFocusScore
      });
    }

    const totalSeconds = projectDistribution.reduce((sum, p) => sum + p.total_seconds, 0);
    const plannedSeconds = 28800; // 8小时计划
    const efficiencyScore = Math.round((totalSeconds / plannedSeconds) * 100);

    return {
      total_seconds: totalSeconds,
      planned_seconds: plannedSeconds,
      efficiency_score: Math.min(100, efficiencyScore),
      session_count: projectDistribution.reduce((sum, p) => sum + p.session_count, 0),
      project_distribution: projectDistribution,
      hourly_pattern: hourlyPattern
    };
  }

  /**
   * 生成模拟的周度趋势数据
   */
  private generateWeeklyMockData(): WeeklyTrendData[] {
    const weeklyData: WeeklyTrendData[] = [];
    const today = dayjs();
    
    for (let i = 6; i >= 0; i--) {
      const date = today.subtract(i, 'day');
      const isWeekend = date.day() === 0 || date.day() === 6;
      const isFuture = date.isAfter(today, 'day');
      
      if (isFuture) {
        weeklyData.push({
          date: date.format('YYYY-MM-DD'),
          total_seconds: 0,
          planned_seconds: isWeekend ? 0 : 28800,
          efficiency_score: 0,
          focus_score: 0,
          session_count: 0
        });
      } else {
        const baseWorkTime = isWeekend ? 
          Math.floor(Math.random() * 14400) : // 周末0-4小时
          Math.floor(Math.random() * 10800) + 18000; // 工作日5-8小时

        weeklyData.push({
          date: date.format('YYYY-MM-DD'),
          total_seconds: baseWorkTime,
          planned_seconds: isWeekend ? 0 : 28800,
          efficiency_score: Math.floor(Math.random() * 20) + 70,
          focus_score: Math.floor(Math.random() * 25) + 65,
          session_count: Math.floor(baseWorkTime / 3600) + Math.floor(Math.random() * 3)
        });
      }
    }
    
    return weeklyData;
  }

  /**
   * 生成模拟的效率指标
   */
  private generateEfficiencyMockData(): EfficiencyMetrics {
    return {
      overall_efficiency: 82,
      focus_index: 76,
      consistency_score: 88,
      interruption_rate: 0.15,
      optimal_work_hours: [9, 12], // 上午9点到12点是最佳工作时段
      productivity_trend: 'increasing'
    };
  }

  /**
   * 获取完整的分析数据
   */
  async getAnalyticsData(): Promise<TimerAnalyticsData> {
    const cacheKey = 'analytics-full-data';
    const cached = this.getFromCache<TimerAnalyticsData>(cacheKey);
    if (cached) return cached;

    try {
      // 这里将来可以调用真实的API
      // const response = await fetch('/api/v1/timer/analytics');
      // const data = await response.json();
      
      // 目前使用模拟数据
      const analyticsData: TimerAnalyticsData = {
        today_stats: this.generateTodayMockData(),
        weekly_trend: this.generateWeeklyMockData(),
        efficiency_metrics: this.generateEfficiencyMockData(),
        task_completion_analysis: {
          avg_completion_time: 3240, // 54分钟平均完成时间
          completion_rate: 0.78,
          most_productive_categories: ['开发', '设计', '学习'],
          improvement_suggestions: [
            '可以考虑在上午9-12点安排最重要的任务',
            '建议减少任务切换频率，提高专注度',
            '下午2-4点效率较低，可安排轻松的任务'
          ]
        }
      };

      this.setCache(cacheKey, analyticsData);
      return analyticsData;
    } catch (error) {
      console.error('获取分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取今日统计数据
   */
  async getTodayStats(): Promise<TimerAnalyticsData['today_stats']> {
    const fullData = await this.getAnalyticsData();
    return fullData.today_stats;
  }

  /**
   * 获取周度趋势数据
   */
  async getWeeklyTrend(): Promise<WeeklyTrendData[]> {
    const fullData = await this.getAnalyticsData();
    return fullData.weekly_trend;
  }

  /**
   * 获取效率指标
   */
  async getEfficiencyMetrics(): Promise<EfficiencyMetrics> {
    const fullData = await this.getAnalyticsData();
    return fullData.efficiency_metrics;
  }

  /**
   * 格式化时间显示
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * 格式化效率分数
   */
  formatEfficiencyScore(score: number): string {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '一般';
    if (score >= 60) return '需改进';
    return '待提升';
  }

  /**
   * 获取专注度等级描述
   */
  getFocusLevelDescription(score: number): string {
    if (score >= 90) return '深度专注';
    if (score >= 80) return '高度专注';
    if (score >= 70) return '较为专注';
    if (score >= 60) return '一般专注';
    return '容易分心';
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const timerDataAnalyticsService = new TimerDataAnalyticsService();
export default timerDataAnalyticsService;