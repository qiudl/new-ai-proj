/**
 * 日效率分析相关类型定义
 * 与后端 API /api/v1/timer/daily-comparison 响应结构对应
 */

// 任务分解项目
export interface TaskBreakdownItem {
  task_id: number;
  task_title: string;
  project_name: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  total_hours: number;
  total_seconds: number;
  sessions: number;
  formatted_time: string;
}

// 小时分布项目
export interface HourlyDistributionItem {
  hour: number;
  total_hours: number;
  total_seconds: number;
  sessions: number;
}

// 单日效率数据
export interface DayEfficiencyData {
  date: string;
  total_hours: number;
  total_seconds: number;
  completed_tasks: number;
  unique_tasks_worked: number;
  timer_sessions: number;
  avg_session_duration: number;
  efficiency_index: number; // 0-100 综合效率指数
  top_task_title: string;
  top_task_hours: number;
  task_breakdown: TaskBreakdownItem[];
  hourly_distribution: HourlyDistributionItem[];
  formatted_total_time: string;
  formatted_avg_session: string;
  calculation_details?: EfficiencyCalculationDetails; // 效率计算详情
}

// 效率趋势数据
export interface EfficiencyTrends {
  efficiency_index_change: number; // 效率指数变化百分比
  total_hours_change: number; // 工作时长变化百分比
  completed_tasks_change: number; // 完成任务变化百分比
  avg_session_change: number; // 平均专注时长变化百分比
  week_trend_direction: 'improving' | 'declining' | 'stable'; // 整体趋势方向
}

// 效率洞察
export interface EfficiencyInsight {
  type: 'positive' | 'warning' | 'suggestion' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact_level?: 'high' | 'medium' | 'low'; // 影响程度
  suggestion?: string; // 改进建议
}

// 效率计算详情类型定义
export interface ScoreDetail {
  score: number;
  max_score: number;
  description: string;
  factors: Record<string, any>;
}

export interface WeightDetails {
  base: number;
  time: number;
  task: number;
  quality: number;
  reason: string;
}

export interface EfficiencyCalculationDetails {
  base_score: ScoreDetail;
  time_efficiency: ScoreDetail;
  task_efficiency: ScoreDetail;
  quality_factor: ScoreDetail;
  dynamic_weights: WeightDetails;
  suggestions: string[];
}

// 三日对比响应数据
export interface DailyComparisonData {
  today: DayEfficiencyData;
  yesterday: DayEfficiencyData;
  day_before: DayEfficiencyData;
  trends: EfficiencyTrends;
  insights: EfficiencyInsight[];
  updated_at: string;
}

// API响应结构
export interface DailyComparisonResponse {
  data: DailyComparisonData;
  meta: {
    generated_at: string;
    timezone: string;
    algorithm_version: string;
  };
}

// 前端展示用的处理过的数据类型
export interface ProcessedDayData extends Omit<DayEfficiencyData, 'hourly_distribution'> {
  // 增强的小时分布数据，用于图表展示
  hourly_distribution: Array<HourlyDistributionItem & {
    label: string; // 格式化的时间标签，如 "08:00"
    percentage: number; // 在当日总时间中的占比
  }>;
  
  // 增强的任务分解数据
  task_breakdown: Array<TaskBreakdownItem & {
    percentage: number; // 在当日总时间中的占比
    color: string; // 用于图表展示的颜色
  }>;
  
  // 效率等级
  efficiency_level: 'excellent' | 'good' | 'average' | 'needs_improvement';
  
  // 工作节奏评估
  work_rhythm: 'focused' | 'scattered' | 'balanced' | 'inactive';
}

// 三日对比的处理数据
export interface ProcessedComparisonData {
  today: ProcessedDayData;
  yesterday: ProcessedDayData;
  day_before: ProcessedDayData;
  trends: EfficiencyTrends & {
    // 增强的趋势数据
    trend_indicators: {
      efficiency: 'up' | 'down' | 'stable';
      hours: 'up' | 'down' | 'stable';
      tasks: 'up' | 'down' | 'stable';
      focus: 'up' | 'down' | 'stable';
    };
  };
  insights: Array<EfficiencyInsight & {
    icon: string; // Ant Design 图标名称
    color: string; // 洞察卡片颜色
  }>;
  summary: {
    best_day: 'today' | 'yesterday' | 'day_before';
    biggest_improvement: string;
    main_challenge: string;
    recommendation: string;
  };
}

// 图表数据类型
export interface EfficiencyChartData {
  // 三日效率指数对比
  efficiency_comparison: {
    labels: string[];
    data: number[];
    colors: string[];
  };
  
  // 工作时长对比
  hours_comparison: {
    labels: string[];
    data: number[];
    colors: string[];
  };
  
  // 任务完成对比
  tasks_comparison: {
    labels: string[];
    data: number[];
    colors: string[];
  };
  
  // 小时分布热力图数据
  hourly_heatmap: {
    today: HourlyDistributionItem[];
    yesterday: HourlyDistributionItem[];
    day_before: HourlyDistributionItem[];
  };
  
  // 趋势线数据
  trend_lines: {
    efficiency: { x: string; y: number }[];
    hours: { x: string; y: number }[];
    tasks: { x: string; y: number }[];
  };
}

// 组件Props类型
export interface DailyComparisonCardProps {
  dayData: ProcessedDayData;
  dayLabel: string;
  isToday?: boolean;
  comparisonBase?: ProcessedDayData; // 用于对比的基准日数据
}

export interface EfficiencyTrendsCardProps {
  trends: EfficiencyTrends;
  chartData: EfficiencyChartData;
}

export interface InsightsCardProps {
  insights: Array<EfficiencyInsight & { icon: string; color: string }>;
}

export interface HourlyDistributionChartProps {
  data: EfficiencyChartData['hourly_heatmap'];
  height?: number;
}

export interface TaskBreakdownChartProps {
  data: Array<TaskBreakdownItem & { percentage: number; color: string }>;
  type: 'pie' | 'bar';
  height?: number;
}

// 缓存键类型
export const DAILY_EFFICIENCY_CACHE_KEYS = {
  DAILY_COMPARISON: (userId: number) => `daily_comparison_${userId}`,
  HOURLY_DISTRIBUTION: (userId: number, date: string) => `hourly_dist_${userId}_${date}`,
  TASK_BREAKDOWN: (userId: number, date: string) => `task_breakdown_${userId}_${date}`,
} as const;

// 缓存TTL设置
export const DAILY_EFFICIENCY_CACHE_TTL = {
  COMPARISON_DATA: 5 * 60 * 1000, // 5分钟
  CHART_DATA: 10 * 60 * 1000, // 10分钟
  INSIGHTS: 15 * 60 * 1000, // 15分钟
} as const;