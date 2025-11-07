import dayjs, { Dayjs } from 'dayjs';
import { TaskTimelineEvent, TaskTimelineEventType } from '../types/timeline';
import { AdvancedSearchFilter } from '../components/timeline/AdvancedSearch';

/**
 * 高级时间线搜索和过滤工具类
 */
export class TimelineSearchUtils {
  
  /**
   * 应用高级搜索过滤器
   */
  static applyAdvancedFilter(events: TaskTimelineEvent[], filter: AdvancedSearchFilter): TaskTimelineEvent[] {
    let filtered = [...events];

    // 文本搜索
    if (filter.searchTerm) {
      filtered = this.applyTextSearch(filtered, filter);
    }

    // 时间范围过滤
    if (filter.dateRange || filter.relativeDateRange || filter.timeRange) {
      filtered = this.applyTimeFilter(filtered, filter);
    }

    // 用户过滤
    if (filter.userIds || filter.excludeUsers || filter.includeSystemEvents !== undefined) {
      filtered = this.applyUserFilter(filtered, filter);
    }

    // 内容过滤
    if (filter.hasMetadata !== undefined || filter.metadataKeys || filter.metadataSearch) {
      filtered = this.applyContentFilter(filtered, filter);
    }

    // 模式识别过滤
    if (filter.patternType || filter.eventFrequency || filter.impactLevel) {
      filtered = this.applyPatternFilter(filtered, filter);
    }

    // 基础过滤器 (事件类型、严重性、分类等)
    filtered = this.applyBasicFilters(filtered, filter);

    return filtered;
  }

  /**
   * 应用文本搜索
   */
  private static applyTextSearch(events: TaskTimelineEvent[], filter: AdvancedSearchFilter): TaskTimelineEvent[] {
    const { searchTerm, searchFields = ['description', 'username', 'task_title', 'metadata'], 
            searchMode = 'contains', caseSensitive = false } = filter;

    if (!searchTerm) return events;

    const processSearchTerm = (term: string) => caseSensitive ? term : term.toLowerCase();
    const processedSearchTerm = processSearchTerm(searchTerm);

    return events.filter(event => {
      return searchFields.some(field => {
        let fieldValue = '';
        
        switch (field) {
          case 'description':
            fieldValue = event.description || '';
            break;
          case 'username':
            fieldValue = event.username || '';
            break;
          case 'task_title':
            fieldValue = event.task_title || '';
            break;
          case 'metadata':
            fieldValue = event.metadata ? JSON.stringify(event.metadata) : '';
            break;
          default:
            return false;
        }

        if (!caseSensitive) {
          fieldValue = fieldValue.toLowerCase();
        }

        switch (searchMode) {
          case 'exact':
            return fieldValue === processedSearchTerm;
          case 'regex':
            try {
              const regex = new RegExp(processedSearchTerm, caseSensitive ? 'g' : 'gi');
              return regex.test(fieldValue);
            } catch {
              return false; // 无效的正则表达式
            }
          case 'contains':
          default:
            return fieldValue.includes(processedSearchTerm);
        }
      });
    });
  }

  /**
   * 应用时间过滤
   */
  private static applyTimeFilter(events: TaskTimelineEvent[], filter: AdvancedSearchFilter): TaskTimelineEvent[] {
    let filtered = events;

    // 相对时间范围
    if (filter.relativeDateRange) {
      const now = dayjs();
      let startTime: Dayjs;

      switch (filter.relativeDateRange) {
        case 'last_hour':
          startTime = now.subtract(1, 'hour');
          break;
        case 'last_day':
          startTime = now.subtract(1, 'day');
          break;
        case 'last_week':
          startTime = now.subtract(1, 'week');
          break;
        case 'last_month':
          startTime = now.subtract(1, 'month');
          break;
        case 'last_year':
          startTime = now.subtract(1, 'year');
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(event => {
        const eventTime = dayjs(event.event_date);
        return eventTime.isAfter(startTime);
      });
    }

    // 绝对日期范围
    if (filter.dateRange) {
      const [startDate, endDate] = filter.dateRange;
      filtered = filtered.filter(event => {
        const eventDate = dayjs(event.event_date);
        return eventDate.isAfter(startDate.startOf('day')) && 
               eventDate.isBefore(endDate.endOf('day'));
      });
    }

    // 时间段过滤 (一天中的小时)
    if (filter.timeRange) {
      const [startHour, endHour] = filter.timeRange;
      filtered = filtered.filter(event => {
        const eventHour = dayjs(event.event_date).hour();
        return eventHour >= startHour && eventHour <= endHour;
      });
    }

    return filtered;
  }

  /**
   * 应用用户过滤
   */
  private static applyUserFilter(events: TaskTimelineEvent[], filter: AdvancedSearchFilter): TaskTimelineEvent[] {
    let filtered = events;

    // 指定用户ID
    if (filter.userIds && filter.userIds.length > 0) {
      filtered = filtered.filter(event => 
        event.user_id && filter.userIds!.includes(event.user_id)
      );
    }

    // 排除用户
    if (filter.excludeUsers && filter.excludeUsers.length > 0) {
      filtered = filtered.filter(event => 
        !event.username || !filter.excludeUsers!.includes(event.username)
      );
    }

    // 系统事件过滤
    if (filter.includeSystemEvents === false) {
      filtered = filtered.filter(event => event.category !== 'system');
    }

    return filtered;
  }

  /**
   * 应用内容过滤
   */
  private static applyContentFilter(events: TaskTimelineEvent[], filter: AdvancedSearchFilter): TaskTimelineEvent[] {
    let filtered = events;

    // 元数据存在性过滤
    if (filter.hasMetadata !== undefined) {
      if (filter.hasMetadata) {
        filtered = filtered.filter(event => event.metadata && Object.keys(event.metadata).length > 0);
      } else {
        filtered = filtered.filter(event => !event.metadata || Object.keys(event.metadata).length === 0);
      }
    }

    // 特定元数据键过滤
    if (filter.metadataKeys && filter.metadataKeys.length > 0) {
      filtered = filtered.filter(event => {
        if (!event.metadata) return false;
        return filter.metadataKeys!.some(key => key in event.metadata!);
      });
    }

    // 元数据内容搜索
    if (filter.metadataSearch) {
      const searchTerm = filter.metadataSearch.toLowerCase();
      filtered = filtered.filter(event => {
        if (!event.metadata) return false;
        const metadataStr = JSON.stringify(event.metadata).toLowerCase();
        return metadataStr.includes(searchTerm);
      });
    }

    return filtered;
  }

  /**
   * 应用模式识别过滤
   */
  private static applyPatternFilter(events: TaskTimelineEvent[], filter: AdvancedSearchFilter): TaskTimelineEvent[] {
    let filtered = events;

    // 事件频率过滤
    if (filter.eventFrequency) {
      const eventFrequencies = this.calculateEventFrequencies(events);
      filtered = filtered.filter(event => {
        const frequency = eventFrequencies.get(event.event_type) || 0;
        
        switch (filter.eventFrequency) {
          case 'rare':
            return frequency < 0.1; // 少于10%
          case 'common':
            return frequency >= 0.1 && frequency <= 0.3; // 10%-30%
          case 'frequent':
            return frequency > 0.3; // 超过30%
          default:
            return true;
        }
      });
    }

    // 影响级别过滤
    if (filter.impactLevel) {
      filtered = filtered.filter(event => {
        const impact = this.calculateEventImpact(event);
        
        switch (filter.impactLevel) {
          case 'low':
            return impact < 3;
          case 'medium':
            return impact >= 3 && impact <= 6;
          case 'high':
            return impact > 6;
          default:
            return true;
        }
      });
    }

    // 特定模式过滤
    if (filter.patternType) {
      switch (filter.patternType) {
        case 'error_clusters':
          filtered = this.findErrorClusters(events);
          break;
        case 'completion_streaks':
          filtered = this.findCompletionStreaks(events);
          break;
        case 'activity_bursts':
          filtered = this.findActivityBursts(events);
          break;
        case 'automation_patterns':
          filtered = this.findAutomationPatterns(events);
          break;
      }
    }

    return filtered;
  }

  /**
   * 应用基础过滤器
   */
  private static applyBasicFilters(events: TaskTimelineEvent[], filter: AdvancedSearchFilter): TaskTimelineEvent[] {
    let filtered = events;

    // 事件类型过滤
    // ✅ FIXED - Use snake_case property name event_types (TS2551)
    if (filter.event_types && filter.event_types.length > 0) {
      filtered = filtered.filter(event => filter.event_types!.includes(event.event_type));
    }

    // 严重性过滤
    if (filter.severities && filter.severities.length > 0) {
      filtered = filtered.filter(event => 
        event.severity && filter.severities!.includes(event.severity)
      );
    }

    // 分类过滤
    if (filter.categories && filter.categories.length > 0) {
      filtered = filtered.filter(event => 
        event.category && filter.categories!.includes(event.category)
      );
    }

    // 用户名过滤
    // ✅ FIXED - Use user_id (number) instead of username (string) for userIds filter (TS2345)
    if (filter.userIds && filter.userIds.length > 0) {
      filtered = filtered.filter(event =>
        event.user_id && filter.userIds!.includes(event.user_id)
      );
    }

    return filtered;
  }

  /**
   * 计算事件频率
   */
  private static calculateEventFrequencies(events: TaskTimelineEvent[]): Map<TaskTimelineEventType, number> {
    const frequencies = new Map<TaskTimelineEventType, number>();
    const total = events.length;

    if (total === 0) return frequencies;

    const counts = new Map<TaskTimelineEventType, number>();
    
    events.forEach(event => {
      const count = counts.get(event.event_type) || 0;
      counts.set(event.event_type, count + 1);
    });

    counts.forEach((count, eventType) => {
      frequencies.set(eventType, count / total);
    });

    return frequencies;
  }

  /**
   * 计算事件影响级别 (1-10分)
   */
  private static calculateEventImpact(event: TaskTimelineEvent): number {
    let impact = 1;

    // 基于严重性
    switch (event.severity) {
      case 'error':
        impact += 4;
        break;
      case 'warning':
        impact += 2;
        break;
      case 'info':
        impact += 1;
        break;
    }

    // 基于事件类型
    const highImpactEvents = ['deleted', 'cancelled', 'error_occurred', 'deadline_missed'];
    const mediumImpactEvents = ['completed', 'assigned', 'priority_changed'];
    
    if (highImpactEvents.includes(event.event_type)) {
      impact += 3;
    } else if (mediumImpactEvents.includes(event.event_type)) {
      impact += 2;
    }

    // 基于元数据
    if (event.metadata) {
      if (event.metadata.change_source === 'automation') {
        impact -= 1; // 自动化事件影响较小
      }
      if (event.metadata.batch_id) {
        impact -= 1; // 批量操作影响较小
      }
    }

    return Math.max(1, Math.min(10, impact));
  }

  /**
   * 查找错误集群
   */
  private static findErrorClusters(events: TaskTimelineEvent[]): TaskTimelineEvent[] {
    const errorEvents = events.filter(event => 
      event.severity === 'error' || event.event_type === 'error_occurred'
    );

    // 按时间排序并查找时间集群
    const sortedErrors = errorEvents.sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    const clusters = [];
    let currentCluster = [];
    const clusterThreshold = 30 * 60 * 1000; // 30分钟内的错误被认为是集群

    for (let i = 0; i < sortedErrors.length; i++) {
      const event = sortedErrors[i];
      
      if (currentCluster.length === 0) {
        currentCluster.push(event);
      } else {
        const lastEvent = currentCluster[currentCluster.length - 1];
        const timeDiff = new Date(event.event_date).getTime() - new Date(lastEvent.event_date).getTime();
        
        if (timeDiff <= clusterThreshold) {
          currentCluster.push(event);
        } else {
          if (currentCluster.length >= 2) {
            clusters.push(...currentCluster);
          }
          currentCluster = [event];
        }
      }
    }

    if (currentCluster.length >= 2) {
      clusters.push(...currentCluster);
    }

    return clusters;
  }

  /**
   * 查找完成连击
   */
  private static findCompletionStreaks(events: TaskTimelineEvent[]): TaskTimelineEvent[] {
    const completionEvents = events.filter(event => 
      event.event_type === 'completed'
    ).sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    const streaks = [];
    let currentStreak = [];
    const streakThreshold = 24 * 60 * 60 * 1000; // 24小时内的完成被认为是连击

    for (const event of completionEvents) {
      if (currentStreak.length === 0) {
        currentStreak.push(event);
      } else {
        const lastEvent = currentStreak[currentStreak.length - 1];
        const timeDiff = new Date(event.event_date).getTime() - new Date(lastEvent.event_date).getTime();
        
        if (timeDiff <= streakThreshold) {
          currentStreak.push(event);
        } else {
          if (currentStreak.length >= 3) {
            streaks.push(...currentStreak);
          }
          currentStreak = [event];
        }
      }
    }

    if (currentStreak.length >= 3) {
      streaks.push(...currentStreak);
    }

    return streaks;
  }

  /**
   * 查找活动激增
   */
  private static findActivityBursts(events: TaskTimelineEvent[]): TaskTimelineEvent[] {
    const timeWindows = new Map<string, TaskTimelineEvent[]>();
    const windowSize = 60 * 60 * 1000; // 1小时窗口

    // 按小时窗口分组事件
    events.forEach(event => {
      const eventTime = new Date(event.event_date);
      const windowKey = Math.floor(eventTime.getTime() / windowSize).toString();
      
      if (!timeWindows.has(windowKey)) {
        timeWindows.set(windowKey, []);
      }
      timeWindows.get(windowKey)!.push(event);
    });

    // 计算平均每小时事件数
    const totalEvents = events.length;
    const totalWindows = timeWindows.size;
    const averageEventsPerWindow = totalEvents / totalWindows;

    // 找出事件数超过平均值2倍的时间窗口
    const burstEvents = [];
    timeWindows.forEach(windowEvents => {
      if (windowEvents.length > averageEventsPerWindow * 2) {
        burstEvents.push(...windowEvents);
      }
    });

    return burstEvents;
  }

  /**
   * 查找自动化模式
   */
  private static findAutomationPatterns(events: TaskTimelineEvent[]): TaskTimelineEvent[] {
    return events.filter(event => {
      // 系统事件
      if (event.category === 'system') return true;
      
      // 有自动化标识的元数据
      if (event.metadata?.change_source === 'automation') return true;
      if (event.metadata?.batch_id) return true;
      
      // 无用户关联的事件
      if (!event.user_id && !event.username) return true;
      
      // 批量操作事件
      if (event.event_type === 'bulk_updated') return true;
      
      return false;
    });
  }

  /**
   * 获取搜索建议
   */
  static getSearchSuggestions(events: TaskTimelineEvent[]): string[] {
    const suggestions = new Set<string>();

    events.forEach(event => {
      // 用户名
      if (event.username) {
        suggestions.add(event.username);
      }

      // 关键词提取
      const text = `${event.description} ${event.task_title || ''}`;
      // ✅ FIXED - 显式类型标注避免类型收窄为never
      const words: string[] = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];

      words.forEach(word => {
        if (word.length > 1) {
          suggestions.add(word);
        }
      });

      // 元数据值
      if (event.metadata) {
        Object.values(event.metadata).forEach(value => {
          if (typeof value === 'string' && value.length > 1) {
            suggestions.add(value);
          }
        });
      }
    });

    return Array.from(suggestions).slice(0, 100);
  }
}