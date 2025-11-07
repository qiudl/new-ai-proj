import React from 'react';
import { Badge, Tag, Typography, Space, Card, Tooltip, Progress } from 'antd';
import {
  ClusterOutlined,
  CalendarOutlined,
  UserOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  GroupOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BugOutlined,
  RocketOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  TaskTimelineEvent,
  TaskTimelineEventType,
  EventCategory,
  EventSeverity,
  TimeRange,
  TimelineUtils
} from '../../types/timeline';

const { Text, Title } = Typography;

// 分组策略枚举
export enum GroupingStrategy {
  BY_DATE = 'date',
  BY_USER = 'user', 
  BY_EVENT_TYPE = 'event_type',
  BY_CATEGORY = 'category',
  BY_SEVERITY = 'severity',
  BY_SESSION = 'session',
  BY_BATCH = 'batch',
  BY_TASK = 'task',
  INTELLIGENT = 'intelligent',
  NONE = 'none'
}

// 事件组接口
export interface EventGroup {
  id: string;
  title: string;
  description?: string;
  events: TaskTimelineEvent[];
  metadata: {
    groupType: GroupingStrategy;
    startTime: string;
    endTime: string;
    eventCount: number;
    userCount: number;
    severityDistribution: Record<EventSeverity, number>;
    categoryDistribution: Record<EventCategory, number>;
    dominantEventType?: TaskTimelineEventType;
    isCollapsible: boolean;
    priority: number; // 用于排序
    color?: string;
    icon?: React.ReactNode;
    tags?: string[];
  };
}

// 智能事件分组器
export class IntelligentEventGrouper {
  
  /**
   * 主分组方法
   */
  static groupEvents(
    events: TaskTimelineEvent[], 
    strategy: GroupingStrategy = GroupingStrategy.INTELLIGENT
  ): EventGroup[] {
    if (events.length === 0) return [];

    switch (strategy) {
      case GroupingStrategy.BY_DATE:
        return this.groupByDate(events);
      case GroupingStrategy.BY_USER:
        return this.groupByUser(events);
      case GroupingStrategy.BY_EVENT_TYPE:
        return this.groupByEventType(events);
      case GroupingStrategy.BY_CATEGORY:
        return this.groupByCategory(events);
      case GroupingStrategy.BY_SEVERITY:
        return this.groupBySeverity(events);
      case GroupingStrategy.BY_SESSION:
        return this.groupBySession(events);
      case GroupingStrategy.BY_BATCH:
        return this.groupByBatch(events);
      case GroupingStrategy.BY_TASK:
        return this.groupByTask(events);
      case GroupingStrategy.INTELLIGENT:
        return this.intelligentGrouping(events);
      default:
        return this.createSingleGroup(events);
    }
  }

  /**
   * 按日期分组
   */
  private static groupByDate(events: TaskTimelineEvent[]): EventGroup[] {
    const grouped = TimelineUtils.groupEventsByDate(events);
    
    return Object.entries(grouped).map(([date, dateEvents]) => {
      const isToday = date === new Date().toISOString().split('T')[0];
      const isYesterday = date === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let title = date;
      if (isToday) title = '今天';
      else if (isYesterday) title = '昨天';
      else title = new Date(date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

      return {
        id: `date-${date}`,
        title,
        description: `${dateEvents.length} 个事件`,
        events: dateEvents,
        metadata: {
          ...this.calculateGroupMetadata(dateEvents, GroupingStrategy.BY_DATE),
          priority: isToday ? 10 : isYesterday ? 9 : 5,
          color: isToday ? '#52c41a' : isYesterday ? '#faad14' : '#1890ff',
          icon: <CalendarOutlined />,
          tags: isToday ? ['今天'] : isYesterday ? ['昨天'] : []
        }
      };
    }).sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 按用户分组
   */
  private static groupByUser(events: TaskTimelineEvent[]): EventGroup[] {
    const userGroups = new Map<string, TaskTimelineEvent[]>();
    
    events.forEach(event => {
      const user = event.username || '系统';
      if (!userGroups.has(user)) {
        userGroups.set(user, []);
      }
      userGroups.get(user)!.push(event);
    });

    return Array.from(userGroups.entries()).map(([user, userEvents]) => {
      const isSystem = user === '系统';
      return {
        id: `user-${user}`,
        title: user,
        description: `${userEvents.length} 个操作`,
        events: userEvents,
        metadata: {
          ...this.calculateGroupMetadata(userEvents, GroupingStrategy.BY_USER),
          priority: isSystem ? 3 : 7,
          color: isSystem ? '#8c8c8c' : '#1890ff',
          icon: isSystem ? <RobotOutlined /> : <UserOutlined />,
          tags: isSystem ? ['系统'] : ['用户操作']
        }
      };
    }).sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 按事件类型分组
   */
  private static groupByEventType(events: TaskTimelineEvent[]): EventGroup[] {
    const typeGroups = new Map<TaskTimelineEventType, TaskTimelineEvent[]>();
    
    events.forEach(event => {
      if (!typeGroups.has(event.event_type)) {
        typeGroups.set(event.event_type, []);
      }
      typeGroups.get(event.event_type)!.push(event);
    });

    return Array.from(typeGroups.entries()).map(([eventType, typeEvents]) => {
      const typeInfo = this.getEventTypeInfo(eventType);
      
      return {
        id: `type-${eventType}`,
        title: TimelineUtils.getEventTypeDescription(eventType),
        description: `${typeEvents.length} 个${typeInfo.category}事件`,
        events: typeEvents,
        metadata: {
          ...this.calculateGroupMetadata(typeEvents, GroupingStrategy.BY_EVENT_TYPE),
          dominantEventType: eventType,
          priority: typeInfo.priority,
          color: typeInfo.color,
          icon: typeInfo.icon,
          tags: [typeInfo.category]
        }
      };
    }).sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 按分类分组
   */
  private static groupByCategory(events: TaskTimelineEvent[]): EventGroup[] {
    const categoryGroups = new Map<EventCategory, TaskTimelineEvent[]>();
    
    events.forEach(event => {
      const category = event.category || 'user';
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(event);
    });

    return Array.from(categoryGroups.entries()).map(([category, categoryEvents]) => {
      const categoryInfo = this.getCategoryInfo(category);
      
      return {
        id: `category-${category}`,
        title: categoryInfo.title,
        description: `${categoryEvents.length} 个事件`,
        events: categoryEvents,
        metadata: {
          ...this.calculateGroupMetadata(categoryEvents, GroupingStrategy.BY_CATEGORY),
          priority: categoryInfo.priority,
          color: categoryInfo.color,
          icon: categoryInfo.icon,
          tags: [categoryInfo.title]
        }
      };
    }).sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 按严重性分组
   */
  private static groupBySeverity(events: TaskTimelineEvent[]): EventGroup[] {
    const severityGroups = new Map<EventSeverity, TaskTimelineEvent[]>();
    
    events.forEach(event => {
      const severity = event.severity || 'info';
      if (!severityGroups.has(severity)) {
        severityGroups.set(severity, []);
      }
      severityGroups.get(severity)!.push(event);
    });

    const severityOrder: EventSeverity[] = ['critical', 'error', 'warning', 'info'];
    
    return severityOrder
      .filter(severity => severityGroups.has(severity))
      .map(severity => {
        const severityEvents = severityGroups.get(severity)!;
        const severityInfo = this.getSeverityInfo(severity);
        
        return {
          id: `severity-${severity}`,
          title: severityInfo.title,
          description: `${severityEvents.length} 个事件`,
          events: severityEvents,
          metadata: {
            ...this.calculateGroupMetadata(severityEvents, GroupingStrategy.BY_SEVERITY),
            priority: severityInfo.priority,
            color: severityInfo.color,
            icon: severityInfo.icon,
            tags: [severityInfo.title]
          }
        };
      });
  }

  /**
   * 按会话分组（基于时间间隔和用户活动）
   */
  private static groupBySession(events: TaskTimelineEvent[]): EventGroup[] {
    const sessions: TaskTimelineEvent[][] = [];
    const sessionTimeout = 30 * 60 * 1000; // 30分钟超时
    
    // 按时间排序
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    let currentSession: TaskTimelineEvent[] = [];
    let lastEventTime: number = 0;
    let lastUser: string = '';

    sortedEvents.forEach(event => {
      const eventTime = new Date(event.event_date).getTime();
      const user = event.username || 'system';
      
      // 如果时间间隔超过阈值或用户发生变化，开始新会话
      if (currentSession.length === 0 || 
          eventTime - lastEventTime > sessionTimeout || 
          user !== lastUser) {
        if (currentSession.length > 0) {
          sessions.push([...currentSession]);
        }
        currentSession = [event];
      } else {
        currentSession.push(event);
      }
      
      lastEventTime = eventTime;
      lastUser = user;
    });
    
    // 添加最后一个会话
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    return sessions.map((sessionEvents, index) => {
      const startTime = sessionEvents[0].event_date;
      const endTime = sessionEvents[sessionEvents.length - 1].event_date;
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
      const user = sessionEvents[0].username || '系统';
      
      return {
        id: `session-${index}`,
        title: `${user}的工作会话`,
        description: `${sessionEvents.length} 个操作，持续 ${Math.round(duration / 1000 / 60)} 分钟`,
        events: sessionEvents,
        metadata: {
          ...this.calculateGroupMetadata(sessionEvents, GroupingStrategy.BY_SESSION),
          priority: sessionEvents.length > 5 ? 8 : 5,
          color: '#722ed1',
          icon: <ClockCircleOutlined />,
          tags: ['工作会话', `${Math.round(duration / 1000 / 60)}分钟`]
        }
      };
    }).sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 按批次分组
   */
  private static groupByBatch(events: TaskTimelineEvent[]): EventGroup[] {
    const batchGroups = new Map<string, TaskTimelineEvent[]>();
    
    events.forEach(event => {
      const batchId = event.metadata?.batch_id;
      if (batchId) {
        if (!batchGroups.has(batchId)) {
          batchGroups.set(batchId, []);
        }
        batchGroups.get(batchId)!.push(event);
      }
    });

    const groups = Array.from(batchGroups.entries()).map(([batchId, batchEvents]) => ({
      id: `batch-${batchId}`,
      title: `批次操作 ${batchId}`,
      description: `${batchEvents.length} 个批量操作`,
      events: batchEvents,
      metadata: {
        ...this.calculateGroupMetadata(batchEvents, GroupingStrategy.BY_BATCH),
        priority: 6,
        color: '#13c2c2',
        icon: <GroupOutlined />,
        tags: ['批量操作']
      }
    }));

    // 添加非批次事件组
    const nonBatchEvents = events.filter(event => !event.metadata?.batch_id);
    if (nonBatchEvents.length > 0) {
      groups.push({
        id: 'non-batch',
        title: '单个操作',
        description: `${nonBatchEvents.length} 个单独操作`,
        events: nonBatchEvents,
        metadata: {
          ...this.calculateGroupMetadata(nonBatchEvents, GroupingStrategy.BY_BATCH),
          priority: 4,
          color: '#1890ff',
          icon: <UserOutlined />,
          tags: ['单个操作']
        }
      });
    }

    return groups.sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 按任务分组
   */
  private static groupByTask(events: TaskTimelineEvent[]): EventGroup[] {
    const taskGroups = new Map<number, TaskTimelineEvent[]>();
    
    events.forEach(event => {
      const taskId = event.task_id;
      if (!taskGroups.has(taskId)) {
        taskGroups.set(taskId, []);
      }
      taskGroups.get(taskId)!.push(event);
    });

    return Array.from(taskGroups.entries()).map(([taskId, taskEvents]) => {
      const taskTitle = taskEvents[0].task_title || `任务 #${taskId}`;
      
      return {
        id: `task-${taskId}`,
        title: taskTitle,
        description: `${taskEvents.length} 个相关事件`,
        events: taskEvents,
        metadata: {
          ...this.calculateGroupMetadata(taskEvents, GroupingStrategy.BY_TASK),
          priority: 7,
          color: '#fa8c16',
          icon: <TrophyOutlined />,
          tags: ['任务事件']
        }
      };
    }).sort((a, b) => b.metadata.eventCount - a.metadata.eventCount);
  }

  /**
   * 智能分组（综合多种策略）
   */
  private static intelligentGrouping(events: TaskTimelineEvent[]): EventGroup[] {
    // 按时间段智能分析
    const timeGroups = this.analyzeTimePatterns(events);
    
    // 识别重要事件集群
    const clusters = this.identifyEventClusters(events);
    
    // 合并和优化分组
    return this.optimizeGroups([...timeGroups, ...clusters]);
  }

  /**
   * 分析时间模式
   */
  private static analyzeTimePatterns(events: TaskTimelineEvent[]): EventGroup[] {
    const groups: EventGroup[] = [];
    const now = new Date();
    
    // 最近1小时的高频事件
    const recentEvents = events.filter(event => 
      now.getTime() - new Date(event.event_date).getTime() < 60 * 60 * 1000
    );
    
    if (recentEvents.length >= 3) {
      groups.push({
        id: 'recent-activity',
        title: '最近活动',
        description: `过去1小时内的${recentEvents.length}个事件`,
        events: recentEvents,
        metadata: {
          ...this.calculateGroupMetadata(recentEvents, GroupingStrategy.INTELLIGENT),
          priority: 10,
          color: '#52c41a',
          icon: <ThunderboltOutlined />,
          tags: ['最近活动', '高频']
        }
      });
    }

    // 识别工作时间段
    const workHourEvents = events.filter(event => {
      const hour = new Date(event.event_date).getHours();
      return hour >= 9 && hour <= 18;
    });

    if (workHourEvents.length > events.length * 0.6) {
      groups.push({
        id: 'work-hours',
        title: '工作时间',
        description: `工作时间内的${workHourEvents.length}个事件`,
        events: workHourEvents,
        metadata: {
          ...this.calculateGroupMetadata(workHourEvents, GroupingStrategy.INTELLIGENT),
          priority: 7,
          color: '#1890ff',
          icon: <TeamOutlined />,
          tags: ['工作时间']
        }
      });
    }

    return groups;
  }

  /**
   * 识别事件集群
   */
  private static identifyEventClusters(events: TaskTimelineEvent[]): EventGroup[] {
    const clusters: EventGroup[] = [];
    
    // 错误事件集群
    const errorEvents = events.filter(event => 
      event.severity === 'error' || event.severity === 'critical' || 
      event.event_type.includes('error') || event.event_type.includes('fail')
    );
    
    if (errorEvents.length >= 2) {
      clusters.push({
        id: 'error-cluster',
        title: '问题事件',
        description: `${errorEvents.length}个错误或异常事件`,
        events: errorEvents,
        metadata: {
          ...this.calculateGroupMetadata(errorEvents, GroupingStrategy.INTELLIGENT),
          priority: 9,
          color: '#f5222d',
          icon: <BugOutlined />,
          tags: ['错误', '需要关注']
        }
      });
    }

    // 完成事件集群
    const completionEvents = events.filter(event => 
      event.event_type === 'completed' || event.event_type === 'approved'
    );
    
    if (completionEvents.length >= 2) {
      clusters.push({
        id: 'completion-cluster',
        title: '完成事件',
        description: `${completionEvents.length}个任务完成事件`,
        events: completionEvents,
        metadata: {
          ...this.calculateGroupMetadata(completionEvents, GroupingStrategy.INTELLIGENT),
          priority: 8,
          color: '#52c41a',
          icon: <TrophyOutlined />,
          tags: ['完成', '成就']
        }
      });
    }

    // 系统自动化事件
    const automationEvents = events.filter(event => 
      event.category === 'automation' || event.category === 'system' ||
      event.event_type === 'automation_triggered'
    );
    
    if (automationEvents.length >= 3) {
      clusters.push({
        id: 'automation-cluster',
        title: '自动化操作',
        description: `${automationEvents.length}个系统自动化事件`,
        events: automationEvents,
        metadata: {
          ...this.calculateGroupMetadata(automationEvents, GroupingStrategy.INTELLIGENT),
          priority: 5,
          color: '#722ed1',
          icon: <RocketOutlined />,
          tags: ['自动化', '系统']
        }
      });
    }

    return clusters;
  }

  /**
   * 优化分组结果
   */
  private static optimizeGroups(groups: EventGroup[]): EventGroup[] {
    // 移除重复事件
    const seenEvents = new Set<number>();
    const optimizedGroups: EventGroup[] = [];
    
    groups
      .sort((a, b) => b.metadata.priority - a.metadata.priority)
      .forEach(group => {
        const uniqueEvents = group.events.filter(event => {
          if (seenEvents.has(event.id)) return false;
          seenEvents.add(event.id);
          return true;
        });
        
        if (uniqueEvents.length > 0) {
          optimizedGroups.push({
            ...group,
            events: uniqueEvents,
            metadata: {
              ...group.metadata,
              eventCount: uniqueEvents.length
            }
          });
        }
      });
    
    return optimizedGroups;
  }

  /**
   * 创建单个组
   */
  private static createSingleGroup(events: TaskTimelineEvent[]): EventGroup[] {
    return [{
      id: 'all-events',
      title: '所有事件',
      description: `${events.length} 个时间线事件`,
      events,
      metadata: {
        ...this.calculateGroupMetadata(events, GroupingStrategy.NONE),
        priority: 5,
        color: '#1890ff',
        icon: <ClusterOutlined />,
        tags: ['全部']
      }
    }];
  }

  /**
   * 计算分组元数据
   */
  private static calculateGroupMetadata(
    events: TaskTimelineEvent[], 
    groupType: GroupingStrategy
  ): Omit<EventGroup['metadata'], 'priority' | 'color' | 'icon' | 'tags'> {
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    
    const users = new Set(events.map(e => e.username).filter(Boolean));
    
    const severityDist = events.reduce((acc, event) => {
      const severity = event.severity || 'info';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<EventSeverity, number>);
    
    const categoryDist = events.reduce((acc, event) => {
      const category = event.category || 'user';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<EventCategory, number>);
    
    // 找出主导事件类型
    const typeCount = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<TaskTimelineEventType, number>);
    
    const dominantEventType = Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as TaskTimelineEventType;
    
    return {
      groupType,
      startTime: sortedEvents[0]?.event_date || new Date().toISOString(),
      endTime: sortedEvents[sortedEvents.length - 1]?.event_date || new Date().toISOString(),
      eventCount: events.length,
      userCount: users.size,
      severityDistribution: severityDist,
      categoryDistribution: categoryDist,
      dominantEventType,
      isCollapsible: events.length > 3
    };
  }

  /**
   * 获取事件类型信息
   */
  private static getEventTypeInfo(eventType: TaskTimelineEventType) {
    const typeInfoMap: Record<TaskTimelineEventType, { category: string; priority: number; color: string; icon: React.ReactNode }> = {
      'created': { category: '创建', priority: 8, color: '#52c41a', icon: <TrophyOutlined /> },
      'completed': { category: '完成', priority: 9, color: '#52c41a', icon: <TrophyOutlined /> },
      'status_changed': { category: '状态', priority: 7, color: '#fa8c16', icon: <ThunderboltOutlined /> },
      'assigned': { category: '分配', priority: 6, color: '#1890ff', icon: <TeamOutlined /> },
      'priority_changed': { category: '优先级', priority: 6, color: '#eb2f96', icon: <ThunderboltOutlined /> },
      'comment_added': { category: '协作', priority: 5, color: '#722ed1', icon: <TeamOutlined /> },
      // 默认映射
      'updated': { category: '更新', priority: 4, color: '#1890ff', icon: <ClusterOutlined /> },
      'deleted': { category: '删除', priority: 7, color: '#f5222d', icon: <BugOutlined /> },
      'restored': { category: '恢复', priority: 6, color: '#722ed1', icon: <ClusterOutlined /> },
      'started': { category: '开始', priority: 6, color: '#52c41a', icon: <ClusterOutlined /> },
      'paused': { category: '暂停', priority: 5, color: '#faad14', icon: <ClusterOutlined /> },
      'cancelled': { category: '取消', priority: 6, color: '#f5222d', icon: <ClusterOutlined /> },
      'unassigned': { category: '取消分配', priority: 5, color: '#8c8c8c', icon: <ClusterOutlined /> },
      'reassigned': { category: '重新分配', priority: 6, color: '#1890ff', icon: <TeamOutlined /> },
      'permission_changed': { category: '权限', priority: 5, color: '#fa541c', icon: <ClusterOutlined /> },
      'deadline_changed': { category: '时间', priority: 6, color: '#fa541c', icon: <CalendarOutlined /> },
      'due_date_extended': { category: '时间', priority: 5, color: '#faad14', icon: <CalendarOutlined /> },
      'schedule_updated': { category: '时间', priority: 5, color: '#1890ff', icon: <CalendarOutlined /> },
      'time_logged': { category: '时间', priority: 4, color: '#13c2c2', icon: <ClockCircleOutlined /> },
      'estimate_updated': { category: '时间', priority: 4, color: '#1890ff', icon: <ClockCircleOutlined /> },
      'title_changed': { category: '内容', priority: 5, color: '#1890ff', icon: <ClusterOutlined /> },
      'description_updated': { category: '内容', priority: 4, color: '#1890ff', icon: <ClusterOutlined /> },
      'tags_updated': { category: '内容', priority: 4, color: '#2f54eb', icon: <ClusterOutlined /> },
      'attachment_added': { category: '附件', priority: 4, color: '#13c2c2', icon: <LinkOutlined /> },
      'attachment_removed': { category: '附件', priority: 4, color: '#f5222d', icon: <LinkOutlined /> },
      'dependency_added': { category: '关系', priority: 5, color: '#2f54eb', icon: <LinkOutlined /> },
      'dependency_removed': { category: '关系', priority: 5, color: '#f5222d', icon: <LinkOutlined /> },
      'parent_changed': { category: '关系', priority: 6, color: '#722ed1', icon: <LinkOutlined /> },
      'child_added': { category: '关系', priority: 5, color: '#52c41a', icon: <LinkOutlined /> },
      'child_removed': { category: '关系', priority: 5, color: '#f5222d', icon: <LinkOutlined /> },
      'comment_updated': { category: '协作', priority: 4, color: '#722ed1', icon: <TeamOutlined /> },
      'comment_deleted': { category: '协作', priority: 4, color: '#f5222d', icon: <TeamOutlined /> },
      'mention_added': { category: '协作', priority: 5, color: '#eb2f96', icon: <TeamOutlined /> },
      'review_requested': { category: '协作', priority: 6, color: '#fa8c16', icon: <TeamOutlined /> },
      'approval_given': { category: '协作', priority: 7, color: '#52c41a', icon: <TrophyOutlined /> },
      'bulk_updated': { category: '系统', priority: 5, color: '#8c8c8c', icon: <GroupOutlined /> },
      'imported': { category: '系统', priority: 5, color: '#1890ff', icon: <RocketOutlined /> },
      'exported': { category: '系统', priority: 4, color: '#13c2c2', icon: <RocketOutlined /> },
      'archived': { category: '系统', priority: 5, color: '#8c8c8c', icon: <ClusterOutlined /> },
      'template_applied': { category: '系统', priority: 5, color: '#722ed1', icon: <RocketOutlined /> },
      'automation_triggered': { category: '系统', priority: 6, color: '#52c41a', icon: <RocketOutlined /> },
      // ✅ FIXED - Add missing event types (TS2739)
      'tag_added': { category: '内容', priority: 4, color: '#2f54eb', icon: <ClusterOutlined /> },
      'tag_removed': { category: '内容', priority: 4, color: '#f5222d', icon: <ClusterOutlined /> },
      'error_occurred': { category: '系统', priority: 7, color: '#f5222d', icon: <BugOutlined /> },
    };

    return typeInfoMap[eventType] || { category: '其他', priority: 3, color: '#d9d9d9', icon: <ClusterOutlined /> };
  }

  /**
   * 获取分类信息
   */
  private static getCategoryInfo(category: EventCategory) {
    const categoryInfoMap: Record<EventCategory, { title: string; priority: number; color: string; icon: React.ReactNode }> = {
      'system': { title: '系统事件', priority: 5, color: '#8c8c8c', icon: <RobotOutlined /> },
      'user': { title: '用户操作', priority: 7, color: '#1890ff', icon: <UserOutlined /> },
      'automation': { title: '自动化', priority: 6, color: '#52c41a', icon: <RocketOutlined /> },
      'integration': { title: '集成', priority: 5, color: '#722ed1', icon: <LinkOutlined /> },
    };

    return categoryInfoMap[category] || { title: '未知', priority: 3, color: '#d9d9d9', icon: <ClusterOutlined /> };
  }

  /**
   * 获取严重性信息
   */
  private static getSeverityInfo(severity: EventSeverity) {
    const severityInfoMap: Record<EventSeverity, { title: string; priority: number; color: string; icon: React.ReactNode }> = {
      'critical': { title: '严重', priority: 10, color: '#722ed1', icon: <BugOutlined /> },
      'error': { title: '错误', priority: 9, color: '#f5222d', icon: <BugOutlined /> },
      'warning': { title: '警告', priority: 7, color: '#fa8c16', icon: <ThunderboltOutlined /> },
      'info': { title: '信息', priority: 5, color: '#1890ff', icon: <ClusterOutlined /> },
    };

    return severityInfoMap[severity] || { title: '未知', priority: 3, color: '#d9d9d9', icon: <ClusterOutlined /> };
  }
}

export default IntelligentEventGrouper;