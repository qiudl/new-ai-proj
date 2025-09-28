import api from './api';

export interface TaskStatistics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  other_tasks: number;
  completion_rate: number;
  priority_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface TimeStatistics {
  total_seconds: number;
  session_count: number;
  avg_session_seconds: number;
  max_session_seconds: number;
  min_session_seconds: number;
  formatted_total_time: string;
  formatted_avg_time: string;
}

export interface DailyWorkReport {
  task_statistics: TaskStatistics;
  time_statistics: TimeStatistics;
  completed_tasks: any[];
  active_tasks: any[];
  time_distribution: any[];
  efficiency_analysis: any;
  generated_at: string;
  date: string;
  user_id: number;
  project_id: number;
}

export interface DailyWorkReportResponse {
  success: boolean;
  project_id: number;
  report: DailyWorkReport;
  date: string;
  message: string;
}

/**
 * 获取今日工作报告
 * @param projectId 项目ID，默认为1
 * @returns 今日工作报告数据
 */
export const getDailyWorkReport = async (projectId: number = 1): Promise<DailyWorkReportResponse> => {
  try {
    console.log(`准备调用API: /mcp/get-daily-work-report?projectId=${projectId}`);
    
    const response = await api.get(`/mcp/get-daily-work-report?projectId=${projectId}`);
    console.log('完整API响应:', response);
    
    // 根据日志，API响应直接就是数据，不是标准的axios响应格式
    // 直接使用response作为响应数据
    const responseData = response;
    
    console.log('处理后的响应数据:', responseData);
    
    // 检查响应数据结构
    if (!responseData) {
      throw new Error('API返回空数据');
    }
    
    // 如果返回的是错误响应
    if (responseData.success === false) {
      throw new Error(responseData.error || responseData.message || 'API返回错误');
    }
    
    // 检查是否有成功标志和报告数据
    if (responseData.success && responseData.report) {
      return responseData as DailyWorkReportResponse;
    }
    
    throw new Error('API返回数据格式不正确');
  } catch (error) {
    console.error('获取今日工作报告详细错误:', error);
    throw new Error(`获取任务报告失败: ${error.message || '请稍后重试'}`);
  }
};

/**
 * 格式化时间（秒转换为时分秒格式）
 */
export const formatSeconds = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0分钟';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (remainingSeconds > 0 && hours === 0) parts.push(`${remainingSeconds}秒`);
  
  return parts.join('') || '0分钟';
};

export default {
  getDailyWorkReport,
  formatSeconds
};