import api from './api';
import { timerCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';
import {
  DailyComparisonResponse,
  DailyComparisonData,
  ProcessedComparisonData,
  ProcessedDayData,
  EfficiencyChartData,
  TaskBreakdownItem,
  HourlyDistributionItem,
  DAILY_EFFICIENCY_CACHE_KEYS,
  DAILY_EFFICIENCY_CACHE_TTL
} from '../types/dailyEfficiency';

/**
 * 日效率分析数据服务
 * 负责获取、处理和缓存日效率对比数据
 */
class DailyEfficiencyService {
  
  /**
   * 获取当前用户ID（从token中解析）
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
   * 获取原始的三日对比数据
   * @param options 请求选项
   */
  async getDailyComparisonData(options?: { force?: boolean }): Promise<DailyComparisonData> {
    const userId = this.getCurrentUserId();
    const cacheKey = DAILY_EFFICIENCY_CACHE_KEYS.DAILY_COMPARISON(userId);
    
    // 检查缓存（允许通过 options.force 跳过缓存）
    if (!options?.force) {
      const cached = timerCache.get<DailyComparisonData>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await api.get<DailyComparisonResponse>('/timer/daily-comparison');
      
      // 验证响应结构
      if (!response) {
        console.warn('Invalid daily comparison API response:', response);
        throw new Error('Invalid response format');
      }

      // 检查是否有嵌套的data字段（拦截器已解包response.data）
      const responseData = response.data || response;
      
      // 缓存结果
      timerCache.set(cacheKey, responseData, DAILY_EFFICIENCY_CACHE_TTL.COMPARISON_DATA);
      
      return responseData;
    } catch (error) {
      console.error('Failed to fetch daily comparison data:', error);
      throw new Error('获取日效率对比数据失败');
    }
  }

  /**
   * 获取处理后的三日对比数据
   * @param options 请求选项
   */
  async getProcessedComparisonData(options?: { force?: boolean }): Promise<ProcessedComparisonData> {
    const rawData = await this.getDailyComparisonData(options);
    return this.processComparisonData(rawData);
  }

  /**
   * 处理原始数据为前端展示格式
   * @param rawData 原始API数据
   */
  private processComparisonData(rawData: DailyComparisonData): ProcessedComparisonData {
    // 处理三日数据
    const today = this.processDayData(rawData.today);
    const yesterday = this.processDayData(rawData.yesterday);
    const dayBefore = this.processDayData(rawData.day_before);

    // 增强趋势数据
    const enhancedTrends = {
      ...rawData.trends,
      trend_indicators: {
        efficiency: this.getTrendDirection(rawData.trends.efficiency_index_change),
        hours: this.getTrendDirection(rawData.trends.total_hours_change),
        tasks: this.getTrendDirection(rawData.trends.completed_tasks_change),
        focus: this.getTrendDirection(rawData.trends.avg_session_change),
      }
    };

    // 增强洞察数据 - 添加空值检查
    const enhancedInsights = (rawData.insights || []).map(insight => ({
      ...insight,
      icon: this.getInsightIcon(insight.type),
      color: this.getInsightColor(insight.type)
    }));

    // 生成综合总结
    const summary = this.generateSummary(today, yesterday, dayBefore, rawData.trends);

    return {
      today,
      yesterday,
      day_before: dayBefore,
      trends: enhancedTrends,
      insights: enhancedInsights,
      summary
    };
  }

  /**
   * 处理单日数据
   * @param dayData 原始单日数据
   */
  private processDayData(dayData: any): ProcessedDayData {
    // 处理小时分布数据 - 添加空值检查
    const hourlyDistribution = (dayData.hourly_distribution || []).map((item: HourlyDistributionItem) => ({
      ...item,
      label: `${String(item.hour).padStart(2, '0')}:00`,
      percentage: dayData.total_seconds > 0 ? (item.total_seconds / dayData.total_seconds) * 100 : 0
    }));

    // 处理任务分解数据 - 添加空值检查
    const taskBreakdown = (dayData.task_breakdown || []).map((item: TaskBreakdownItem, index: number) => ({
      ...item,
      percentage: dayData.total_seconds > 0 ? (item.total_seconds / dayData.total_seconds) * 100 : 0,
      color: this.getTaskColor(index)
    }));

    // 评估效率等级
    const efficiency_level = this.getEfficiencyLevel(dayData.efficiency_index);
    
    // 评估工作节奏
    const work_rhythm = this.getWorkRhythm(dayData);

    return {
      ...dayData,
      hourly_distribution: hourlyDistribution,
      task_breakdown: taskBreakdown,
      efficiency_level,
      work_rhythm
    };
  }

  /**
   * 获取趋势方向指示器
   * @param change 变化百分比
   */
  private getTrendDirection(change: number): 'up' | 'down' | 'stable' {
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  /**
   * 获取洞察图标
   * @param type 洞察类型
   */
  private getInsightIcon(type: string): string {
    const iconMap = {
      positive: 'CheckCircleOutlined',
      warning: 'WarningOutlined',
      suggestion: 'BulbOutlined',
      info: 'InfoCircleOutlined'
    };
    return iconMap[type as keyof typeof iconMap] || 'InfoCircleOutlined';
  }

  /**
   * 获取洞察颜色
   * @param type 洞察类型
   */
  private getInsightColor(type: string): string {
    const colorMap = {
      positive: '#52c41a',
      warning: '#faad14',
      suggestion: '#1890ff',
      info: '#722ed1'
    };
    return colorMap[type as keyof typeof colorMap] || '#1890ff';
  }

  /**
   * 获取任务颜色
   * @param index 任务索引
   */
  private getTaskColor(index: number): string {
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
      '#13c2c2', '#fa8c16', '#eb2f96', '#a0d911', '#2f54eb'
    ];
    return colors[index % colors.length];
  }

  /**
   * 获取效率等级
   * @param efficiencyIndex 效率指数
   */
  private getEfficiencyLevel(efficiencyIndex: number): 'excellent' | 'good' | 'average' | 'needs_improvement' {
    if (efficiencyIndex >= 80) return 'excellent';
    if (efficiencyIndex >= 60) return 'good';
    if (efficiencyIndex >= 40) return 'average';
    return 'needs_improvement';
  }

  /**
   * 获取工作节奏评估
   * @param dayData 单日数据
   */
  private getWorkRhythm(dayData: any): 'focused' | 'scattered' | 'balanced' | 'inactive' {
    if (dayData.total_hours < 1) return 'inactive';
    
    const avgSessionHours = dayData.avg_session_duration / 3600;
    const sessionsPerHour = dayData.timer_sessions / dayData.total_hours;
    
    if (avgSessionHours >= 1.5 && sessionsPerHour <= 2) return 'focused';
    if (avgSessionHours < 0.5 && sessionsPerHour > 4) return 'scattered';
    return 'balanced';
  }

  /**
   * 生成综合总结
   * @param today 今日数据
   * @param yesterday 昨日数据
   * @param dayBefore 前日数据
   * @param trends 趋势数据
   */
  private generateSummary(
    today: ProcessedDayData,
    yesterday: ProcessedDayData,
    dayBefore: ProcessedDayData,
    trends: any
  ) {
    // 找出效率最高的一天
    const efficiencies = {
      today: today.efficiency_index,
      yesterday: yesterday.efficiency_index,
      day_before: dayBefore.efficiency_index
    };
    const bestDay = Object.entries(efficiencies).reduce((a, b) => 
      efficiencies[a[0] as keyof typeof efficiencies] > efficiencies[b[0] as keyof typeof efficiencies] ? a : b
    )[0] as 'today' | 'yesterday' | 'day_before';

    // 分析最大改进点
    const improvements = [];
    if (trends.efficiency_index_change > 10) improvements.push('效率指数显著提升');
    if (trends.total_hours_change > 20) improvements.push('工作时长大幅增加');
    if (trends.completed_tasks_change > 30) improvements.push('任务完成率明显提高');
    const biggestImprovement = improvements[0] || '保持稳定状态';

    // 分析主要挑战
    const challenges = [];
    if (trends.efficiency_index_change < -10) challenges.push('效率指数下降');
    if (trends.total_hours_change < -20) challenges.push('工作时长不足');
    if (trends.avg_session_change < -30) challenges.push('专注时长下降');
    const mainChallenge = challenges[0] || '无明显问题';

    // 生成建议
    let recommendation = '继续保持当前工作节奏';
    if (today.efficiency_level === 'needs_improvement') {
      recommendation = '建议增加专注时间，减少任务切换频率';
    } else if (today.work_rhythm === 'scattered') {
      recommendation = '建议延长单次专注时长，提高工作深度';
    } else if (today.total_hours < 4) {
      recommendation = '建议适当增加每日工作时间';
    }

    return {
      best_day: bestDay,
      biggest_improvement: biggestImprovement,
      main_challenge: mainChallenge,
      recommendation
    };
  }

  /**
   * 获取图表数据
   * @param processedData 处理后的对比数据
   */
  getChartData(processedData: ProcessedComparisonData): EfficiencyChartData {
    const labels = ['前日', '昨日', '今日'];
    const days = [processedData.day_before, processedData.yesterday, processedData.today];

    return {
      efficiency_comparison: {
        labels,
        data: days.map(d => d.efficiency_index),
        colors: ['#faad14', '#1890ff', '#52c41a']
      },
      hours_comparison: {
        labels,
        data: days.map(d => d.total_hours),
        colors: ['#722ed1', '#13c2c2', '#fa8c16']
      },
      tasks_comparison: {
        labels,
        data: days.map(d => d.completed_tasks),
        colors: ['#eb2f96', '#f5222d', '#a0d911']
      },
      hourly_heatmap: {
        today: processedData.today.hourly_distribution,
        yesterday: processedData.yesterday.hourly_distribution,
        day_before: processedData.day_before.hourly_distribution
      },
      trend_lines: {
        efficiency: days.map((d, i) => ({ x: labels[i], y: d.efficiency_index })),
        hours: days.map((d, i) => ({ x: labels[i], y: d.total_hours })),
        tasks: days.map((d, i) => ({ x: labels[i], y: d.completed_tasks }))
      }
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    const userId = this.getCurrentUserId();
    const cacheKey = DAILY_EFFICIENCY_CACHE_KEYS.DAILY_COMPARISON(userId);
    timerCache.delete(cacheKey);
  }

  /**
   * 预热缓存（后台获取数据）
   */
  async warmupCache(): Promise<void> {
    try {
      await this.getDailyComparisonData({ force: true });
    } catch (error) {
      console.warn('Failed to warmup daily efficiency cache:', error);
    }
  }
}

// 导出单例实例
export const dailyEfficiencyService = new DailyEfficiencyService();
export default dailyEfficiencyService;