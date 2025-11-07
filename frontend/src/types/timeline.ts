// 时间线相关类型定义
// 与后端 models/timeline_event.go 保持完全一致

// 任务时间线事件类型 - 与后端 TaskTimelineEventType 一致
export type TaskTimelineEventType = 
  // 基础操作
  | 'created' | 'updated' | 'deleted' | 'restored'
  // 状态变更
  | 'status_changed' | 'completed' | 'started' | 'paused' | 'cancelled'
  // 分配和权限
  | 'assigned' | 'unassigned' | 'reassigned' | 'permission_changed'
  // 时间管理
  | 'deadline_changed' | 'due_date_extended' | 'schedule_updated'
  | 'time_logged' | 'estimate_updated'
  // 内容变更
  | 'title_changed' | 'description_updated' | 'priority_changed'
  // ✅ FIXED - 添加细粒度标签事件类型
  | 'tags_updated' | 'tag_added' | 'tag_removed'
  | 'attachment_added' | 'attachment_removed'
  // 关系变更
  | 'dependency_added' | 'dependency_removed' | 'parent_changed'
  | 'child_added' | 'child_removed'
  // 协作和沟通
  | 'comment_added' | 'comment_updated' | 'comment_deleted'
  | 'mention_added' | 'review_requested' | 'approval_given'
  // 系统操作
  | 'bulk_updated' | 'imported' | 'exported' | 'archived'
  // ✅ FIXED - 添加错误事件类型
  | 'template_applied' | 'automation_triggered' | 'error_occurred';

// 变更来源类型 - 与后端 ChangeSource 一致
export type ChangeSource = 'manual' | 'api' | 'bulk' | 'automation' | 'integration';

// 事件严重性 - 与后端 EventSeverity 一致
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

// 事件分类 - 与后端 EventCategory 一致
export type EventCategory = 'system' | 'user' | 'automation' | 'integration';

// 任务状态类型（从 task.ts 引用）
export type TaskStatus = 'draft' | 'planning' | 'todo' | 'in_progress' | 'testing' | 'completed' | 'cancelled' | 'on_hold' | 'suspended' | 'blocked' | 'archived';

// 任务时间线事件元数据 - 与后端 TaskTimelineEventMetadata 一致
export interface TaskTimelineEventMetadata {
  // 变更内容
  old_value?: any;
  new_value?: any;
  changed_fields?: string[];

  // 变更上下文
  change_reason?: string;
  change_source?: ChangeSource;
  batch_id?: string;  // 批量操作标识

  // 用户上下文
  ip_address?: string;
  user_agent?: string;
  session_id?: string;

  // 业务上下文
  project_phase?: string;
  workflow_step?: string;
  approval_chain?: any[];

  // 影响范围
  affected_tasks?: number[];
  cascade_changes?: boolean;

  // 时间相关
  duration_ms?: number;
  scheduled_at?: string;

  // 优先级和状态信息
  priority?: 'low' | 'medium' | 'high';
  new_status?: TaskStatus;
  old_status?: TaskStatus;

  // 关联实体信息
  assignee_name?: string;  // 分配对象名称
  comment_content?: string;  // 评论内容
  dependency_task_title?: string;  // 依赖任务标题
  child_task_title?: string;  // 子任务标题

  // 额外信息
  custom_data?: Record<string, any>;
}

// 任务时间线事件 - 与后端 TaskTimelineEvent 一致
export interface TaskTimelineEvent {
  id: number;
  task_id: number;
  event_type: TaskTimelineEventType;
  event_date: string;
  description: string;
  user_id?: number;
  metadata?: TaskTimelineEventMetadata;
  username?: string;
  task_title?: string;
  
  // 新增字段
  project_id?: number;
  correlation_id?: string;  // 关联ID，用于追踪相关事件
  parent_event_id?: number; // 父事件ID，用于事件层级关系
  severity?: EventSeverity; // 事件严重性
  category?: EventCategory; // 事件分类
  
  created_at?: string;
  updated_at?: string;
}

// 时间线事件过滤器 - 与后端 TimelineEventFilter 一致
export interface TimelineEventFilter {
  task_id?: number;
  task_ids?: number[];
  project_id?: number;
  event_types?: TaskTimelineEventType[];
  user_ids?: number[];
  categories?: EventCategory[];
  severities?: EventSeverity[];
  start_date?: string;
  end_date?: string;
  batch_id?: string;
  include_system?: boolean;
  
  // 分页参数
  page?: number;
  page_size?: number;
  limit?: number; // 兼容性别名
  offset?: number; // 兼容性别名
  
  // 排序参数
  sort_by?: 'event_date' | 'created_at' | 'severity';
  sort_order?: 'asc' | 'desc';
}

// 时间范围
export interface TimeRange {
  start: string;
  end: string;
}

// 时间线事件分组 - 与后端 TimelineEventGroup 一致
export interface TimelineEventGroup {
  id: string;
  group_type: 'single' | 'batch' | 'session';
  time_range: TimeRange;
  events: TaskTimelineEvent[];
  summary: string;
  affected_fields: string[];
  batch_id?: string;
  event_count: number;
}

// 用户活动统计
export interface UserActivityStat {
  user_id: number;
  username: string;
  event_count: number;
}

// 日活动统计
export interface DailyActivityStat {
  date: string;
  event_count: number;
}

// 时间线统计信息 - 与后端 TimelineStatistics 一致
export interface TimelineStatistics {
  total_events: number;
  event_types_distribution: { [key in TaskTimelineEventType]?: number };
  user_activity: UserActivityStat[];
  daily_activity: DailyActivityStat[];
  severity_distribution: { [key in EventSeverity]?: number };
  category_distribution: { [key in EventCategory]?: number };
  most_active_days: string[];
  peak_hours: number[];
}

// 时间线事件API响应
export interface TimelineEventsResponse {
  success: boolean;
  data: {
    events: TaskTimelineEvent[];
    total: number;
    pagination?: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
  message?: string;
}

// 时间线统计API响应
export interface TimelineStatisticsResponse {
  success: boolean;
  data: TimelineStatistics;
  message?: string;
}

// 事件类型描述映射
export const EventTypeDescriptions: Record<TaskTimelineEventType, string> = {
  // 基础操作
  created: '创建',
  updated: '更新',
  deleted: '删除',
  restored: '恢复',
  
  // 状态变更
  status_changed: '状态变更',
  completed: '完成',
  started: '开始',
  paused: '暂停',
  cancelled: '取消',
  
  // 分配和权限
  assigned: '分配',
  unassigned: '取消分配',
  reassigned: '重新分配',
  permission_changed: '权限变更',
  
  // 时间管理
  deadline_changed: '截止日期变更',
  due_date_extended: '截止日期延期',
  schedule_updated: '日程更新',
  time_logged: '时间记录',
  estimate_updated: '预估时间更新',
  
  // 内容变更
  title_changed: '标题变更',
  description_updated: '描述更新',
  priority_changed: '优先级变更',
  tags_updated: '标签更新',
  // ✅ FIXED - Add missing tag event descriptions (TS2739)
  tag_added: '添加标签',
  tag_removed: '删除标签',
  attachment_added: '添加附件',
  attachment_removed: '删除附件',
  
  // 关系变更
  dependency_added: '添加依赖',
  dependency_removed: '删除依赖',
  parent_changed: '父任务变更',
  child_added: '添加子任务',
  child_removed: '删除子任务',
  
  // 协作和沟通
  comment_added: '添加评论',
  comment_updated: '更新评论',
  comment_deleted: '删除评论',
  mention_added: '提及用户',
  review_requested: '请求审核',
  approval_given: '批准',
  
  // 系统操作
  bulk_updated: '批量更新',
  imported: '导入',
  exported: '导出',
  archived: '归档',
  template_applied: '应用模板',
  automation_triggered: '自动化触发',
  // ✅ FIXED - Add missing error event description (TS2739)
  error_occurred: '发生错误'
};

// 事件分类描述映射
export const EventCategoryDescriptions: Record<EventCategory, string> = {
  system: '系统',
  user: '用户',
  automation: '自动化',
  integration: '集成'
};

// 事件严重性描述映射
export const EventSeverityDescriptions: Record<EventSeverity, string> = {
  info: '信息',
  warning: '警告',
  error: '错误',
  critical: '严重'
};

// 时间线工具函数
export class TimelineUtils {
  /**
   * 检查事件类型是否有效
   */
  static isValidEventType(eventType: string): eventType is TaskTimelineEventType {
    return Object.keys(EventTypeDescriptions).includes(eventType as TaskTimelineEventType);
  }

  /**
   * 获取事件类型的中文描述
   */
  static getEventTypeDescription(eventType: TaskTimelineEventType): string {
    return EventTypeDescriptions[eventType] || eventType;
  }

  /**
   * 获取事件分类的中文描述
   */
  static getCategoryDescription(category: EventCategory): string {
    return EventCategoryDescriptions[category] || category;
  }

  /**
   * 获取事件严重性的中文描述
   */
  static getSeverityDescription(severity: EventSeverity): string {
    return EventSeverityDescriptions[severity] || severity;
  }

  /**
   * 获取事件严重性对应的颜色
   */
  static getSeverityColor(severity: EventSeverity): string {
    const colors = {
      info: '#1890ff',     // 蓝色
      warning: '#fa8c16',  // 橙色
      error: '#f5222d',    // 红色
      critical: '#722ed1'  // 紫色
    };
    return colors[severity] || colors.info;
  }

  /**
   * 格式化时间线事件显示文本
   */
  static formatEventDescription(event: TaskTimelineEvent): string {
    const typeDesc = this.getEventTypeDescription(event.event_type);
    const username = event.username || '未知用户';
    
    if (event.metadata?.old_value && event.metadata?.new_value) {
      return `${username} 将 ${typeDesc} 从 "${event.metadata.old_value}" 更改为 "${event.metadata.new_value}"`;
    }
    
    return `${username} ${typeDesc}了任务`;
  }

  /**
   * 按日期分组时间线事件
   */
  static groupEventsByDate(events: TaskTimelineEvent[]): Record<string, TaskTimelineEvent[]> {
    return events.reduce((groups, event) => {
      const date = new Date(event.event_date).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, TaskTimelineEvent[]>);
  }

  /**
   * 过滤时间线事件
   */
  static filterEvents(events: TaskTimelineEvent[], filter: Partial<TimelineEventFilter>): TaskTimelineEvent[] {
    return events.filter(event => {
      if (filter.event_types && !filter.event_types.includes(event.event_type)) {
        return false;
      }
      if (filter.user_ids && event.user_id && !filter.user_ids.includes(event.user_id)) {
        return false;
      }
      if (filter.categories && event.category && !filter.categories.includes(event.category)) {
        return false;
      }
      if (filter.severities && event.severity && !filter.severities.includes(event.severity)) {
        return false;
      }
      if (filter.start_date && new Date(event.event_date) < new Date(filter.start_date)) {
        return false;
      }
      if (filter.end_date && new Date(event.event_date) > new Date(filter.end_date)) {
        return false;
      }
      return true;
    });
  }
}