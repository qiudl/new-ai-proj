import api from './api';
import { timerCache } from '../utils/cache';

// 个人计时任务相关类型定义
export interface UserTimerTaskRequest {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  color?: string;
  is_favorite?: boolean;
  target_time_seconds?: number;
  tags?: string[];
  metadata?: any;
}

export interface UserTimerTaskResponse {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  color: string;
  is_favorite: boolean;
  total_time_seconds: number;
  target_time_seconds: number;
  tags: string[];
  metadata: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  formatted_total_time: string;
  formatted_target_time: string;
  completion_percent: number;
  last_timed_at?: string;
  times_count: number;
  average_session_time: number;
  today_time_seconds: number;
  week_time_seconds: number;
}

export interface PersonalTimerCurrent {
  is_running: boolean;
  task_type?: string;
  task_id?: number;
  task_title?: string;
  task_color?: string;
  task_category?: string;
  start_time?: string;
  elapsed_seconds: number;
  formatted_time: string;
}

export interface PersonalTimerTodayStats {
  total_seconds: number;
  formatted_time: string;
  sessions_count: number;
  tasks_worked_on: number;
  most_worked_task: string;
  productive_hours: number[];
  efficiency_score: number;
  longest_session: number;
}

export interface PersonalTimerSession {
  id: number;
  task_type: string;
  task_id?: number;
  task_title: string;
  task_color: string;
  task_category: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  formatted_time: string;
  date: string;
  week_day: string;
}

export interface PersonalTimerSummary {
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  favorite_tasks: number;
  total_time_seconds: number;
  formatted_total_time: string;
  average_daily_seconds: number;
  most_productive_day: string;
  most_used_category: string;
}

export interface PersonalTimerDashboard {
  current_timer?: PersonalTimerCurrent;
  today_stats: PersonalTimerTodayStats;
  timer_tasks: UserTimerTaskResponse[];
  recent_sessions: PersonalTimerSession[];
  favorite_tasks: UserTimerTaskResponse[];
  summary: PersonalTimerSummary;
}

export interface PersonalTimerStartRequest {
  task_type: 'personal' | 'project';
  task_id: number;
  auto_stop_others?: boolean;
}

export interface UserTimerFilter {
  category?: string;
  status?: string;
  priority?: string;
  is_favorite?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface UserTimerTasksResponse {
  tasks: UserTimerTaskResponse[];
  total: number;
  limit: number;
  offset: number;
}

// 个人计时系统服务
export const personalTimerService = {
  // ========== 辅助方法 ==========
  
  // 获取当前用户ID（从localStorage或token中获取）
  getCurrentUserId(): number | null {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || null;
    } catch {
      return null;
    }
  },

  // ========== 个人计时任务管理 ==========
  
  // 创建个人计时任务
  async createUserTimerTask(data: UserTimerTaskRequest): Promise<{ message: string; task: UserTimerTaskResponse }> {
    const response = await api.post('/user/timer-tasks', data);
    
    // 清除相关缓存
    const userId = this.getCurrentUserId();
    if (userId) {
      timerCache.invalidateTasksCache(userId);
    }
    
    return response.data;
  },

  // 获取个人计时任务列表
  async getUserTimerTasks(params?: {
    limit?: number;
    offset?: number;
  } & UserTimerFilter): Promise<UserTimerTasksResponse> {
    // 尝试从缓存获取
    const userId = this.getCurrentUserId();
    if (userId) {
      const cached = timerCache.getTimerTasks(userId, params);
      if (cached) {
        return cached;
      }
    }

    const response = await api.get('/user/timer-tasks', { params });
    
    // 缓存结果
    if (userId) {
      timerCache.cacheTimerTasks(userId, response.data, params);
    }
    
    return response.data;
  },

  // 获取单个个人计时任务
  async getUserTimerTask(id: number): Promise<UserTimerTaskResponse> {
    const response = await api.get(`/user/timer-tasks/${id}`);
    return response.data;
  },

  // 更新个人计时任务
  async updateUserTimerTask(id: number, data: UserTimerTaskRequest): Promise<{ message: string; task: UserTimerTaskResponse }> {
    const response = await api.put(`/user/timer-tasks/${id}`, data);
    return response.data;
  },

  // 删除个人计时任务
  async deleteUserTimerTask(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/user/timer-tasks/${id}`);
    return response.data;
  },

  // 切换收藏状态
  async toggleFavoriteUserTimerTask(id: number, isFavorite: boolean): Promise<{ message: string; is_favorite: boolean }> {
    const response = await api.post(`/user/timer-tasks/${id}/favorite`, { is_favorite: isFavorite });
    return response.data;
  },

  // ========== 个人计时操作 ==========
  
  // 开始个人计时
  async startPersonalTimer(data: PersonalTimerStartRequest): Promise<any> {
    const response = await api.post('/user/timer/start-personal', data);
    return response.data;
  },

  // 开始项目计时
  async startProjectTimer(data: PersonalTimerStartRequest): Promise<any> {
    const response = await api.post('/user/timer/start-project', data);
    return response.data;
  },

  // 停止计时
  async stopTimer(): Promise<any> {
    const response = await api.post('/user/timer/stop');
    return response.data;
  },

  // 获取当前计时状态
  async getCurrentTimer(): Promise<PersonalTimerCurrent> {
    const response = await api.get('/user/timer/current');
    return response.data;
  },

  // ========== 仪表板和统计 ==========
  
  // 获取个人计时仪表板数据
  async getDashboard(): Promise<PersonalTimerDashboard> {
    // 尝试从缓存获取
    const userId = this.getCurrentUserId();
    if (userId) {
      const cached = timerCache.getDashboard(userId);
      if (cached) {
        return cached;
      }
    }

    const response = await api.get('/user/timer/dashboard');
    
    // 缓存结果
    if (userId) {
      timerCache.cacheDashboard(userId, response.data);
    }
    
    return response.data;
  },

  // 获取个人计时统计
  async getStats(): Promise<PersonalTimerSummary> {
    const response = await api.get('/user/timer/stats');
    return response.data;
  },

  // 获取计时历史
  async getHistory(params?: { limit?: number; offset?: number }): Promise<{ sessions: PersonalTimerSession[]; limit: number; offset: number }> {
    const response = await api.get('/user/timer/history', { params });
    return response.data;
  },

  // 获取分析报告
  async getAnalytics(params?: { range?: string }): Promise<any> {
    const response = await api.get('/user/timer/analytics', { params });
    return response.data;
  },

  // ========== 辅助方法 ==========
  
  // 格式化时长（秒转换为 HH:MM:SS）
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  // 解析时长（HH:MM:SS 转换为秒）
  parseDuration(duration: string): number {
    const parts = duration.split(':').map(part => parseInt(part, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  },

  // 获取默认任务颜色
  getDefaultColorForCategory(category: string): string {
    const colors = {
      personal: '#1890ff',
      work: '#52c41a',
      study: '#722ed1',
      fitness: '#fa8c16',
      hobby: '#eb2f96'
    };
    return colors[category as keyof typeof colors] || '#1890ff';
  },

  // 获取分类选项
  getCategories(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: '个人', value: 'personal', color: '#1890ff' },
      { label: '工作', value: 'work', color: '#52c41a' },
      { label: '学习', value: 'study', color: '#722ed1' },
      { label: '健身', value: 'fitness', color: '#fa8c16' },
      { label: '爱好', value: 'hobby', color: '#eb2f96' }
    ];
  },

  // 获取优先级选项
  getPriorities(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: '低', value: 'low', color: '#52c41a' },
      { label: '中', value: 'medium', color: '#faad14' },
      { label: '高', value: 'high', color: '#f5222d' }
    ];
  },

  // 获取状态选项
  getStatuses(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: '活跃', value: 'active', color: '#52c41a' },
      { label: '暂停', value: 'paused', color: '#faad14' },
      { label: '完成', value: 'completed', color: '#1890ff' },
      { label: '归档', value: 'archived', color: '#8c8c8c' }
    ];
  }
};

export default personalTimerService;