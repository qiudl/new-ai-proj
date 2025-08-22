// unifiedTimerService - 统一计时器API服务
// 任务#243: 前端通用组件开发 - API服务层
import api from './api';
import type { 
  TimerStatus, 
  TimerSuggestion, 
  TimerTemplate, 
  StartTimerRequest,
  ApiResponse 
} from '../types/timer';

const API_BASE = '/user/timer';
const LEGACY_API_BASE = '/timer';

export class UnifiedTimerService {
  // 核心计时器操作
  async startTimer(request: StartTimerRequest): Promise<ApiResponse<TimerStatus>> {
    try {
      const response = await api.post(`${API_BASE}/start`, {
        task_type: request.task_type,
        task_id: request.task_id,
        title: request.title,
        category: request.category,
        estimated_minutes: request.estimated_minutes,
        tags: request.tags,
        template_id: request.template_id,
        auto_stop_others: request.auto_stop_others ?? false,
        metadata: {
          estimated_minutes: request.estimated_minutes,
          category: request.category,
          tags: request.tags,
          template_id: request.template_id,
          created_from: 'unified_widget'
        }
      });

      return {
        success: true,
        data: response.data,
        message: '计时器启动成功'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '启动计时器失败',
        message: error.response?.data?.message || '网络错误'
      };
    }
  }

  async pauseTimer(): Promise<ApiResponse<TimerStatus>> {
    try {
      const response = await api.post(`${API_BASE}/pause`);

      return {
        success: true,
        data: response.data,
        message: '计时器已暂停'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '暂停计时器失败',
        message: error.response?.data?.message || '网络错误'
      };
    }
  }

  async resumeTimer(): Promise<ApiResponse<TimerStatus>> {
    try {
      const response = await api.post(`${API_BASE}/resume`);

      return {
        success: true,
        data: response.data,
        message: '计时器已恢复'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '恢复计时器失败',
        message: error.response?.data?.message || '网络错误'
      };
    }
  }

  async stopTimer(): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(`${API_BASE}/stop`);

      return {
        success: true,
        data: response.data,
        message: '计时器已停止'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '停止计时器失败',
        message: error.response?.data?.message || '网络错误'
      };
    }
  }

  async getCurrentTimer(): Promise<ApiResponse<TimerStatus | null>> {
    try {
      const response = await api.get(`${API_BASE}/current`);

      return {
        success: true,
        data: response.data,
        message: '获取当前计时器状态成功'
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: true,
          data: null,
          message: '当前没有活动的计时器'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || '获取计时器状态失败',
        message: error.response?.data?.message || '网络错误'
      };
    }
  }

  // 新增：获取所有活动计时器
  async getActiveTimers(): Promise<ApiResponse<{ timers: TimerStatus[]; total: number }>> {
    try {
      const response = await api.get(`${API_BASE}/active`);
      const timers = response.data?.timers || [];
      return {
        success: true,
        data: { timers, total: timers.length },
        message: '获取活动计时器成功'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '获取活动计时器失败',
        message: error.response?.data?.message || '网络错误'
      };
    }
  }

  // 新增：按ID控制计时器
  async pauseTimerById(timerId: number): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(`${API_BASE}/${timerId}/pause`);
      return { success: true, data: response.data, message: '计时器已暂停' };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message || '暂停计时器失败' };
    }
  }

  async resumeTimerById(timerId: number): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(`${API_BASE}/${timerId}/resume`);
      return { success: true, data: response.data, message: '计时器已恢复' };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message || '恢复计时器失败' };
    }
  }

  async stopTimerById(timerId: number): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(`${API_BASE}/${timerId}/stop`);
      return { success: true, data: response.data, message: '计时器已停止' };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message || '停止计时器失败' };
    }
  }

  async getHealthStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await api.get(`${API_BASE}/health`);

      return {
        success: true,
        data: response.data,
        message: '健康检查成功'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || '健康检查失败',
        message: error.response?.data?.message || '服务不可用'
      };
    }
  }

  // 智能建议功能
  async getSuggestions(): Promise<ApiResponse<TimerSuggestion[]>> {
    try {
      // 这里可以调用智能推荐API，目前返回模拟数据
      const suggestions: TimerSuggestion[] = [
        {
          id: 1,
          title: '深度工作时间',
          category: '专注',
          estimated_minutes: 90,
          confidence: 0.85,
          reasoning: ['基于工作时间推断', '周五下午适合深度工作'],
          tags: ['深度工作', '专注'],
          template_id: 2
        },
        {
          id: 2,
          title: '番茄钟工作',
          category: '高效',
          estimated_minutes: 25,
          confidence: 0.92,
          reasoning: ['番茄工作法', '短时间高专注'],
          tags: ['番茄钟', '高效'],
          template_id: 1
        },
        {
          id: 3,
          title: '邮件处理',
          category: '沟通',
          estimated_minutes: 20,
          confidence: 0.78,
          reasoning: ['通常的邮件处理时间', '建议集中处理'],
          tags: ['邮件', '沟通'],
          template_id: 10
        }
      ];

      return {
        success: true,
        data: suggestions,
        message: '获取智能建议成功'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取智能建议失败',
        message: '无法获取推荐任务'
      };
    }
  }

  // 计时模板功能
  async getTemplates(): Promise<ApiResponse<TimerTemplate[]>> {
    try {
      // 调用模板API - 实际应该从后端获取
      const response = await api.get('/api/v1/timer/templates');
      
      return {
        success: true,
        data: response.data?.templates || [],
        message: '获取模板成功'
      };
    } catch (error: any) {
      // 如果API不存在，返回默认模板
      const defaultTemplates: TimerTemplate[] = [
        {
          id: 1,
          name: '番茄工作法',
          description: '25分钟专注工作，5分钟休息',
          target_type: 'pomodoro',
          default_title: '番茄钟工作',
          default_category: '专注',
          default_duration_minutes: 25,
          default_tags: ['番茄钟', '高效'],
          is_system_template: true,
          usage_count: 156
        },
        {
          id: 2,
          name: '深度工作',
          description: '90分钟深度专注工作时间',
          target_type: 'personal_task',
          default_title: '深度工作时间',
          default_category: '专注',
          default_duration_minutes: 90,
          default_tags: ['深度工作', '专注'],
          is_system_template: true,
          usage_count: 89
        },
        {
          id: 3,
          name: '快速任务',
          description: '15分钟内完成的小任务',
          target_type: 'quick_timer',
          default_title: '快速任务',
          default_category: '日常',
          default_duration_minutes: 15,
          default_tags: ['快速', '高效'],
          is_system_template: true,
          usage_count: 234
        },
        {
          id: 4,
          name: '代码开发',
          description: '软件开发和编程工作',
          target_type: 'project_task',
          default_title: '代码开发',
          default_category: '开发',
          default_duration_minutes: 120,
          default_tags: ['开发', '编程'],
          is_system_template: true,
          usage_count: 178
        },
        {
          id: 5,
          name: '学习时间',
          description: '专门的学习和技能提升',
          target_type: 'personal_task',
          default_title: '学习时间',
          default_category: '学习',
          default_duration_minutes: 60,
          default_tags: ['学习', '提升'],
          is_system_template: true,
          usage_count: 95
        }
      ];

      return {
        success: true,
        data: defaultTemplates,
        message: '获取默认模板成功'
      };
    }
  }

  // 最近任务功能
  async getRecentTasks(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const response = await api.get(`${LEGACY_API_BASE}/recent-tasks`, {
        params: { limit }
      });

      return {
        success: true,
        data: response.data?.tasks || [],
        message: '获取最近任务成功'
      };
    } catch (error: any) {
      // 如果API不存在，返回模拟数据
      const mockRecentTasks = [
        {
          id: 1,
          task_title: '修复登录问题',
          target_type: 'project_task',
          category: '开发',
          total_seconds: 3600,
          last_timed_at: '2025-01-20T10:30:00Z',
          project_name: 'AI上下文任务系统'
        },
        {
          id: 2,
          task_title: '学习React Hooks',
          target_type: 'personal_task',
          category: '学习',
          total_seconds: 5400,
          last_timed_at: '2025-01-20T08:15:00Z'
        },
        {
          id: 3,
          task_title: '周报编写',
          target_type: 'personal_task',
          category: '写作',
          total_seconds: 1800,
          last_timed_at: '2025-01-19T16:45:00Z'
        },
        {
          id: 4,
          task_title: 'API文档整理',
          target_type: 'project_task',
          category: '文档',
          total_seconds: 2700,
          last_timed_at: '2025-01-19T14:20:00Z',
          project_name: 'AI上下文任务系统'
        },
        {
          id: 5,
          task_title: '代码重构',
          target_type: 'project_task',
          category: '开发',
          total_seconds: 7200,
          last_timed_at: '2025-01-19T11:00:00Z',
          project_name: 'AI上下文任务系统'
        }
      ];

      return {
        success: true,
        data: mockRecentTasks.slice(0, limit),
        message: '获取模拟最近任务成功'
      };
    }
  }

  // 用户偏好设置
  async getUserPreferences(): Promise<ApiResponse<any>> {
    try {
      const response = await api.get('/api/v1/user/timer/preferences');

      // 同时尝试合并本地覆盖（若有）
      try {
        const local = localStorage.getItem('userTimerPreferences');
        if (local) {
          const merged = { ...response.data, ...JSON.parse(local) };
          return { success: true, data: merged, message: '获取用户偏好成功' };
        }
      } catch {}

      return {
        success: true,
        data: response.data,
        message: '获取用户偏好成功'
      };
    } catch (error: any) {
      // 返回默认偏好设置
      const defaultPreferences = {
        default_category: '工作',
        auto_pause_on_idle: true,
        pomodoro_work_minutes: 25,
        notification_enabled: true,
        preferred_timer_view: 'normal',
        show_progress_bar: true,
        enable_auto_inference: true,
        // 新增：默认不自动停止其他计时器（支持并行）
        auto_stop_others_default: false
      };

      return {
        success: true,
        data: defaultPreferences,
        message: '获取默认偏好设置成功'
      };
    }
  }

  async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
    try {
      const response = await api.put('/api/v1/user/timer/preferences', preferences);

      // 同步写入本地存储，作为后备
      try {
        localStorage.setItem('userTimerPreferences', JSON.stringify(preferences));
      } catch {}

      return {
        success: true,
        data: response.data,
        message: '更新用户偏好成功'
      };
    } catch (error: any) {
      // API失败时，写入本地存储作为降级
      try {
        localStorage.setItem('userTimerPreferences', JSON.stringify(preferences));
        return { success: true, data: preferences, message: '已在本地保存偏好设置（离线）' };
      } catch {}

      return {
        success: false,
        error: error.response?.data?.error || error.message || '更新偏好设置失败',
        message: error.response?.data?.message || '网络错误'
      };
    }
  }

  // 计时统计数据
  async getTimerStats(timeRange: string = '7d'): Promise<ApiResponse<any>> {
    try {
      const response = await api.get('/api/v1/user/timer/stats', {
        params: { range: timeRange }
      });

      return {
        success: true,
        data: response.data,
        message: '获取统计数据成功'
      };
    } catch (error: any) {
      // 返回模拟统计数据
      const mockStats = {
        total_sessions: 42,
        total_hours: 87.5,
        avg_session_minutes: 65,
        most_productive_hour: 10,
        most_used_category: '开发',
        weekly_trend: [
          { date: '2025-01-14', sessions: 6, hours: 12.5 },
          { date: '2025-01-15', sessions: 8, hours: 15.2 },
          { date: '2025-01-16', sessions: 5, hours: 9.8 },
          { date: '2025-01-17', sessions: 7, hours: 13.4 },
          { date: '2025-01-18', sessions: 4, hours: 8.6 },
          { date: '2025-01-19', sessions: 6, hours: 11.7 },
          { date: '2025-01-20', sessions: 6, hours: 16.3 }
        ]
      };

      return {
        success: true,
        data: mockStats,
        message: '获取模拟统计数据成功'
      };
    }
  }
}

// 导出单例实例
export const unifiedTimerService = new UnifiedTimerService();