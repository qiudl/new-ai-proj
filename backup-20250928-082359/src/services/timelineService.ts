import api from './api';
import { timerCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

// 时间轴事件类型
export interface TimelineEvent {
  id: number;
  taskId: number;
  eventType: string;
  eventDate: string;
  description: string;
  username: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  category: 'user' | 'system' | 'timer' | 'status';
  metadata?: Record<string, any>;
}

// 任务时间轴数据
export interface TaskTimeline {
  taskId: number;
  taskTitle: string;
  events: TimelineEvent[];
  totalEvents: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 时间轴统计信息
export interface TimelineStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  recentActivityCount: number;
  topUsers: Array<{
    username: string;
    eventCount: number;
  }>;
}

// 时间轴过滤参数
export interface TimelineFilter {
  eventTypes?: string[];
  categories?: string[];
  severities?: string[];
  userIds?: number[];
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class TimelineService {
  /**
   * 获取任务时间轴
   */
  async getTaskTimeline(
    taskId: number, 
    projectId: number = 1, 
    filter?: TimelineFilter
  ): Promise<TaskTimeline> {
    const cacheKey = CACHE_KEYS.TASK_TIMELINE(taskId, filter);
    const cached = timerCache.get<TaskTimeline>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();
      if (filter?.eventTypes?.length) params.append('event_types', filter.eventTypes.join(','));
      if (filter?.categories?.length) params.append('categories', filter.categories.join(','));
      if (filter?.severities?.length) params.append('severities', filter.severities.join(','));
      if (filter?.startDate) params.append('start_date', filter.startDate);
      if (filter?.endDate) params.append('end_date', filter.endDate);
      if (filter?.page) params.append('page', filter.page.toString());
      if (filter?.pageSize) params.append('page_size', filter.pageSize.toString());
      if (filter?.sortBy) params.append('sort_by', filter.sortBy);
      if (filter?.sortOrder) params.append('sort_order', filter.sortOrder);

      const queryString = params.toString();
      const url = `/tasks/${taskId}/timeline${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url);

      if (!response?.success || !response?.data) {
        throw new Error('Invalid API response');
      }

      const timeline: TaskTimeline = {
        taskId: response.data.task_id || taskId,
        taskTitle: response.data.task_title || `任务 #${taskId}`,
        events: (response.data.events || []).map((event: any) => ({
          id: event.id,
          taskId: event.task_id || taskId,
          eventType: event.event_type,
          eventDate: event.event_date,
          description: event.description,
          username: event.username || '系统',
          severity: event.severity || 'info',
          category: event.category || 'user',
          metadata: event.metadata
        })),
        totalEvents: response.data.total || 0,
        pagination: response.data.pagination
      };

      // 缓存结果
      timerCache.set(cacheKey, timeline, CACHE_TTL.STABLE);

      return timeline;
    } catch (error) {
      console.error('获取任务时间轴失败:', error);
      
      // 返回空的时间轴数据
      return {
        taskId,
        taskTitle: `任务 #${taskId}`,
        events: [],
        totalEvents: 0
      };
    }
  }

  /**
   * 获取批量任务时间轴
   */
  async getTasksTimeline(
    taskIds: number[], 
    filter?: TimelineFilter
  ): Promise<TimelineEvent[]> {
    if (taskIds.length === 0) return [];
    if (taskIds.length > 50) {
      throw new Error('最多支持50个任务的批量查询');
    }

    const cacheKey = CACHE_KEYS.TASKS_TIMELINE(taskIds, filter);
    const cached = timerCache.get<TimelineEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();
      params.append('task_ids', taskIds.join(','));
      if (filter?.eventTypes?.length) params.append('event_types', filter.eventTypes.join(','));
      if (filter?.categories?.length) params.append('categories', filter.categories.join(','));
      if (filter?.severities?.length) params.append('severities', filter.severities.join(','));
      if (filter?.startDate) params.append('start_date', filter.startDate);
      if (filter?.endDate) params.append('end_date', filter.endDate);
      if (filter?.page) params.append('page', filter.page.toString());
      if (filter?.pageSize) params.append('page_size', filter.pageSize.toString());
      if (filter?.sortBy) params.append('sort_by', filter.sortBy);
      if (filter?.sortOrder) params.append('sort_order', filter.sortOrder);

      const queryString = params.toString();
      const url = `/tasks/timeline/batch?${queryString}`;

      const response = await api.get(url);

      if (!response?.success || !response?.data) {
        throw new Error('Invalid API response');
      }

      const events = (response.data || []).map((event: any) => ({
        id: event.id,
        taskId: event.task_id,
        eventType: event.event_type,
        eventDate: event.event_date,
        description: event.description,
        username: event.username || '系统',
        severity: event.severity || 'info',
        category: event.category || 'user',
        metadata: event.metadata
      }));

      // 缓存结果
      timerCache.set(cacheKey, events, CACHE_TTL.STABLE);

      return events;
    } catch (error) {
      console.error('获取批量任务时间轴失败:', error);
      return [];
    }
  }

  /**
   * 获取项目时间轴
   */
  async getProjectTimeline(
    projectId: number, 
    filter?: TimelineFilter
  ): Promise<TimelineEvent[]> {
    const cacheKey = CACHE_KEYS.PROJECT_TIMELINE(projectId, filter);
    const cached = timerCache.get<TimelineEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();
      if (filter?.eventTypes?.length) params.append('event_types', filter.eventTypes.join(','));
      if (filter?.categories?.length) params.append('categories', filter.categories.join(','));
      if (filter?.severities?.length) params.append('severities', filter.severities.join(','));
      if (filter?.startDate) params.append('start_date', filter.startDate);
      if (filter?.endDate) params.append('end_date', filter.endDate);
      if (filter?.page) params.append('page', filter.page.toString());
      if (filter?.pageSize) params.append('page_size', filter.pageSize.toString());
      if (filter?.sortBy) params.append('sort_by', filter.sortBy);
      if (filter?.sortOrder) params.append('sort_order', filter.sortOrder);

      const queryString = params.toString();
      const url = `/projects/${projectId}/tasks/timeline${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url);

      if (!response?.success || !response?.data) {
        throw new Error('Invalid API response');
      }

      const events = (response.data || []).map((event: any) => ({
        id: event.id,
        taskId: event.task_id,
        eventType: event.event_type,
        eventDate: event.event_date,
        description: event.description,
        username: event.username || '系统',
        severity: event.severity || 'info',
        category: event.category || 'user',
        metadata: event.metadata
      }));

      // 缓存结果
      timerCache.set(cacheKey, events, CACHE_TTL.STABLE);

      return events;
    } catch (error) {
      console.error('获取项目时间轴失败:', error);
      return [];
    }
  }

  /**
   * 获取时间轴统计信息
   */
  async getTimelineStatistics(
    taskId?: number,
    filter?: TimelineFilter
  ): Promise<TimelineStatistics> {
    try {
      const params = new URLSearchParams();
      if (filter?.eventTypes?.length) params.append('event_types', filter.eventTypes.join(','));
      if (filter?.categories?.length) params.append('categories', filter.categories.join(','));
      if (filter?.startDate) params.append('start_date', filter.startDate);
      if (filter?.endDate) params.append('end_date', filter.endDate);

      const queryString = params.toString();
      const taskParam = taskId ? taskId.toString() : 'all';
      const url = `/tasks/${taskParam}/timeline/stats${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url);

      if (!response?.success || !response?.data) {
        throw new Error('Invalid API response');
      }

      return {
        totalEvents: response.data.total_events || 0,
        eventsByType: response.data.events_by_type || {},
        eventsByCategory: response.data.events_by_category || {},
        recentActivityCount: response.data.recent_activity_count || 0,
        topUsers: response.data.top_users || []
      };
    } catch (error) {
      console.error('获取时间轴统计信息失败:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsByCategory: {},
        recentActivityCount: 0,
        topUsers: []
      };
    }
  }

  /**
   * 创建时间轴事件
   */
  async createTimelineEvent(
    taskId: number,
    eventType: string,
    description: string,
    options?: {
      metadata?: Record<string, any>;
      severity?: 'info' | 'warning' | 'error' | 'success';
      category?: 'user' | 'system' | 'timer' | 'status';
    }
  ): Promise<TimelineEvent> {
    try {
      const payload = {
        event_type: eventType,
        description,
        metadata: options?.metadata,
        severity: options?.severity || 'info',
        category: options?.category || 'user'
      };

      const response = await api.post(`/tasks/${taskId}/timeline`, payload);

      if (!response?.success || !response?.data) {
        throw new Error('Failed to create timeline event');
      }

      // 清除相关缓存
      timerCache.delete(CACHE_KEYS.TASK_TIMELINE(taskId));
      timerCache.deletePattern(`task_timeline_${taskId}_*`);

      return {
        id: response.data.id,
        taskId: response.data.task_id,
        eventType: response.data.event_type,
        eventDate: response.data.event_date,
        description: response.data.description,
        username: response.data.username || '当前用户',
        severity: response.data.severity,
        category: response.data.category,
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error('创建时间轴事件失败:', error);
      throw new Error('创建时间轴事件失败');
    }
  }

  /**
   * 获取事件类型映射
   */
  getEventTypeLabel(eventType: string): string {
    const eventTypeMap: Record<string, string> = {
      'task_created': '任务创建',
      'task_updated': '任务更新',
      'task_status_changed': '状态变更',
      'task_assigned': '任务分配',
      'task_commented': '添加评论',
      'task_completed': '任务完成',
      'timer_started': '开始计时',
      'timer_stopped': '停止计时',
      'timer_paused': '暂停计时',
      'timer_resumed': '恢复计时',
      'subtask_created': '创建子任务',
      'subtask_completed': '完成子任务',
      'priority_changed': '优先级变更',
      'deadline_changed': '截止日期变更',
      'attachment_added': '添加附件',
      'attachment_removed': '移除附件'
    };
    return eventTypeMap[eventType] || eventType;
  }

  /**
   * 获取严重性颜色
   */
  getSeverityColor(severity: string): string {
    const colorMap: Record<string, string> = {
      'info': '#1890ff',
      'success': '#52c41a',
      'warning': '#faad14',
      'error': '#ff4d4f'
    };
    return colorMap[severity] || '#1890ff';
  }

  /**
   * 获取事件类型图标
   */
  getEventTypeIcon(eventType: string): string {
    const iconMap: Record<string, string> = {
      'task_created': '📝',
      'task_updated': '✏️',
      'task_status_changed': '🔄',
      'task_assigned': '👤',
      'task_commented': '💬',
      'task_completed': '✅',
      'timer_started': '▶️',
      'timer_stopped': '⏹️',
      'timer_paused': '⏸️',
      'timer_resumed': '▶️',
      'subtask_created': '➕',
      'subtask_completed': '✅',
      'priority_changed': '🏷️',
      'deadline_changed': '📅',
      'attachment_added': '📎',
      'attachment_removed': '🗑️'
    };
    return iconMap[eventType] || '📋';
  }
}

export const timelineService = new TimelineService();
export default timelineService;