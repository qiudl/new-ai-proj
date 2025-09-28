export interface WorkPattern {
  name: string;
  description: string;
  daily_hours: {
    min: number;
    max: number;
  };
  session_count: {
    min: number;
    max: number;
  };
  session_length: {
    min: number;
    max: number;
  };
  break_pattern: number[];
  efficiency_range: {
    min: number;
    max: number;
  };
}

export interface TaskTemplate {
  category: string;
  priority: string;
  title_pattern: string;
  duration: {
    min: number;
    max: number;
  };
  complexity: number;
}

export interface GenerateTimerDataRequest {
  start_date: string;
  end_date: string;
  work_pattern?: string;
  dry_run?: boolean;
  task_categories?: string[];
}

export interface GenerateTimerDataResponse {
  success: boolean;
  tasks_created: number;
  sessions_created: number;
  date_range: string;
  work_pattern: string;
  total_hours: number;
  metadata: {
    pattern_description: string;
    avg_session_length: number;
    tasks_by_category: Record<string, number>;
  };
  message: string;
}

export interface QuickGenerateRequest {
  days: number;
  work_pattern?: string;
}

export interface CleanupTestDataRequest {
  older_than_days: number;
  confirm: boolean;
}

export interface TestDataStats {
  total_timer_sessions: number;
  total_hours: number;
  date_range: string;
  last_generated?: string;
  sessions_by_pattern: Record<string, number>;
  daily_breakdown: Array<{
    date: string;
    sessions: number;
    hours: number;
  }>;
}

export interface TestDataApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string;
}