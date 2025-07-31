// 历史任务数据接口
export interface HistoryTask {
  id: number;
  task_id: number;
  task_title: string;
  project_name: string;
  total_seconds: number;
  formatted_time: string;
  last_updated: string;
  status: 'completed' | 'in_progress' | 'paused';
  session_count?: number; // 总计时次数
}