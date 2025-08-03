/**
 * 文档分析服务
 * 收集和分析文档使用数据，提供洞察和统计信息
 */

import { Document } from '../types/document';

export interface DocumentAnalyticsEvent {
  id: string;
  eventType: 'view' | 'edit' | 'download' | 'share' | 'comment' | 'delete' | 'restore' | 'export' | 'print';
  documentId: number;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId: string;
  timestamp: number;
  duration?: number; // 持续时间（毫秒）
  metadata?: {
    previousVersion?: number;
    exportFormat?: string;
    shareType?: string;
    referrer?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    location?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  };
}

export interface DocumentUsageStats {
  documentId: number;
  totalViews: number;
  uniqueViewers: number;
  totalEdits: number;
  uniqueEditors: number;
  downloads: number;
  shares: number;
  comments: number;
  averageViewDuration: number; // 平均查看时长（毫秒）
  lastAccessed: number;
  firstAccessed: number;
  peakAccessTime: string; // 高峰访问时段
  popularActions: Array<{
    action: string;
    count: number;
  }>;
  viewsByDay: Array<{
    date: string;
    views: number;
    uniqueUsers: number;
  }>;
  topViewers: Array<{
    userId: string;
    userName: string;
    viewCount: number;
    lastViewed: number;
  }>;
}

export interface UserActivityStats {
  userId: string;
  documentsViewed: number;
  documentsEdited: number;
  documentsCreated: number;
  documentsShared: number;
  totalViewTime: number;
  averageSessionDuration: number;
  mostActiveHours: Array<{
    hour: number;
    activityCount: number;
  }>;
  favoriteDocumentTypes: Array<{
    type: string;
    count: number;
  }>;
  recentActivity: DocumentAnalyticsEvent[];
}

export interface SystemAnalytics {
  totalDocuments: number;
  totalUsers: number;
  totalViews: number;
  totalEdits: number;
  averageDocumentSize: number;
  storageUsed: number;
  bandwidthUsed: number;
  popularDocumentTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  userEngagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionsPerUser: number;
    userRetentionRate: number;
  };
  performanceMetrics: {
    averageLoadTime: number;
    averageSearchTime: number;
    errorRate: number;
    uptime: number;
  };
  growthMetrics: {
    documentsGrowthRate: number;
    usersGrowthRate: number;
    storageGrowthRate: number;
  };
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  documentIds?: number[];
  userIds?: string[];
  eventTypes?: string[];
  documentTypes?: string[];
}

class DocumentAnalyticsService {
  private events: DocumentAnalyticsEvent[] = [];
  private sessionId: string;
  private currentUserId: string = 'anonymous';
  private batchSize: number = 100;
  private flushInterval: number = 30000; // 30秒
  private pendingEvents: DocumentAnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
    this.startBatchFlush();
    this.loadStoredEvents();
  }

  /**
   * 初始化追踪
   */
  private initializeTracking(): void {
    // 检测设备类型
    this.detectDeviceType();
    
    // 页面离开时保存数据
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });

    // 页面隐藏时保存数据
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushEvents();
      }
    });
  }

  /**
   * 设置当前用户
   */
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * 记录分析事件
   */
  trackEvent(
    eventType: DocumentAnalyticsEvent['eventType'],
    documentId: number,
    metadata?: DocumentAnalyticsEvent['metadata'],
    duration?: number
  ): void {
    const event: DocumentAnalyticsEvent = {
      id: this.generateEventId(),
      eventType,
      documentId,
      userId: this.currentUserId,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      duration,
      metadata: {
        ...metadata,
        deviceType: this.getDeviceType(),
        referrer: document.referrer,
        ...this.getLocationData()
      }
    };

    this.pendingEvents.push(event);
    this.events.push(event);

    // 达到批次大小时立即发送
    if (this.pendingEvents.length >= this.batchSize) {
      this.flushEvents();
    }

    // 保存到本地存储
    this.saveEventsToStorage();
  }

  /**
   * 开始追踪文档查看
   */
  startViewTracking(documentId: number): () => void {
    const startTime = Date.now();
    
    // 记录查看开始事件
    this.trackEvent('view', documentId, {
      referrer: document.referrer
    });

    // 返回结束追踪的函数
    return () => {
      const duration = Date.now() - startTime;
      if (duration > 1000) { // 只记录超过1秒的查看
        this.trackEvent('view', documentId, {
          referrer: document.referrer
        }, duration);
      }
    };
  }

  /**
   * 追踪文档编辑
   */
  trackEdit(documentId: number, metadata?: { previousVersion?: number }): void {
    this.trackEvent('edit', documentId, metadata);
  }

  /**
   * 追踪文档下载
   */
  trackDownload(documentId: number, format?: string): void {
    this.trackEvent('download', documentId, {
      exportFormat: format
    });
  }

  /**
   * 追踪文档分享
   */
  trackShare(documentId: number, shareType: string): void {
    this.trackEvent('share', documentId, {
      shareType
    });
  }

  /**
   * 追踪文档导出
   */
  trackExport(documentId: number, format: string): void {
    this.trackEvent('export', documentId, {
      exportFormat: format
    });
  }

  /**
   * 获取文档使用统计
   */
  async getDocumentStats(documentId: number, filter?: AnalyticsFilter): Promise<DocumentUsageStats> {
    const documentEvents = this.getFilteredEvents({
      ...filter,
      documentIds: [documentId]
    });

    const views = documentEvents.filter(e => e.eventType === 'view');
    const edits = documentEvents.filter(e => e.eventType === 'edit');
    const downloads = documentEvents.filter(e => e.eventType === 'download');
    const shares = documentEvents.filter(e => e.eventType === 'share');
    const comments = documentEvents.filter(e => e.eventType === 'comment');

    const uniqueViewers = new Set(views.map(e => e.userId)).size;
    const uniqueEditors = new Set(edits.map(e => e.userId)).size;

    const viewDurations = views.filter(e => e.duration).map(e => e.duration!);
    const averageViewDuration = viewDurations.length > 0 
      ? viewDurations.reduce((sum, duration) => sum + duration, 0) / viewDurations.length 
      : 0;

    const timestamps = documentEvents.map(e => e.timestamp);
    const firstAccessed = Math.min(...timestamps);
    const lastAccessed = Math.max(...timestamps);

    // 按小时分组计算高峰时段
    const hourCounts = new Array(24).fill(0);
    documentEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakAccessTime = `${peakHour}:00-${peakHour + 1}:00`;

    // 统计流行操作
    const actionCounts = new Map<string, number>();
    documentEvents.forEach(event => {
      actionCounts.set(event.eventType, (actionCounts.get(event.eventType) || 0) + 1);
    });
    const popularActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    // 按天统计查看量
    const viewsByDay = this.groupEventsByDay(views);

    // 顶级查看者
    const viewerCounts = new Map<string, { count: number; lastViewed: number }>();
    views.forEach(event => {
      const existing = viewerCounts.get(event.userId);
      viewerCounts.set(event.userId, {
        count: (existing?.count || 0) + 1,
        lastViewed: Math.max(existing?.lastViewed || 0, event.timestamp)
      });
    });

    const topViewers = Array.from(viewerCounts.entries())
      .map(([userId, stats]) => ({
        userId,
        userName: this.getUserName(userId),
        viewCount: stats.count,
        lastViewed: stats.lastViewed
      }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10);

    return {
      documentId,
      totalViews: views.length,
      uniqueViewers,
      totalEdits: edits.length,
      uniqueEditors,
      downloads: downloads.length,
      shares: shares.length,
      comments: comments.length,
      averageViewDuration,
      lastAccessed,
      firstAccessed,
      peakAccessTime,
      popularActions,
      viewsByDay,
      topViewers
    };
  }

  /**
   * 获取用户活动统计
   */
  async getUserActivityStats(userId: string, filter?: AnalyticsFilter): Promise<UserActivityStats> {
    const userEvents = this.getFilteredEvents({
      ...filter,
      userIds: [userId]
    });

    const documentsViewed = new Set(
      userEvents.filter(e => e.eventType === 'view').map(e => e.documentId)
    ).size;

    const documentsEdited = new Set(
      userEvents.filter(e => e.eventType === 'edit').map(e => e.documentId)
    ).size;

    const documentsCreated = userEvents.filter(e => e.eventType === 'edit' && e.metadata?.previousVersion === undefined).length;
    const documentsShared = userEvents.filter(e => e.eventType === 'share').length;

    const viewEvents = userEvents.filter(e => e.eventType === 'view' && e.duration);
    const totalViewTime = viewEvents.reduce((sum, e) => sum + (e.duration || 0), 0);

    // 按会话计算平均会话时长
    const sessions = new Map<string, number[]>();
    userEvents.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId)!.push(event.timestamp);
    });

    const sessionDurations: number[] = [];
    sessions.forEach(timestamps => {
      if (timestamps.length > 1) {
        const duration = Math.max(...timestamps) - Math.min(...timestamps);
        sessionDurations.push(duration);
      }
    });

    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0;

    // 最活跃时段
    const hourCounts = new Array(24).fill(0);
    userEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });

    const mostActiveHours = hourCounts
      .map((count, hour) => ({ hour, activityCount: count }))
      .filter(item => item.activityCount > 0)
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 5);

    // 获取最近活动
    const recentActivity = userEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    return {
      userId,
      documentsViewed,
      documentsEdited,
      documentsCreated,
      documentsShared,
      totalViewTime,
      averageSessionDuration,
      mostActiveHours,
      favoriteDocumentTypes: [], // TODO: 需要文档类型数据
      recentActivity
    };
  }

  /**
   * 获取系统分析数据
   */
  async getSystemAnalytics(filter?: AnalyticsFilter): Promise<SystemAnalytics> {
    const allEvents = this.getFilteredEvents(filter);
    
    const uniqueDocuments = new Set(allEvents.map(e => e.documentId)).size;
    const uniqueUsers = new Set(allEvents.map(e => e.userId)).size;
    const totalViews = allEvents.filter(e => e.eventType === 'view').length;
    const totalEdits = allEvents.filter(e => e.eventType === 'edit').length;

    // 计算活跃用户
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const dailyActiveUsers = new Set(
      allEvents.filter(e => e.timestamp >= oneDayAgo).map(e => e.userId)
    ).size;

    const weeklyActiveUsers = new Set(
      allEvents.filter(e => e.timestamp >= oneWeekAgo).map(e => e.userId)
    ).size;

    const monthlyActiveUsers = new Set(
      allEvents.filter(e => e.timestamp >= oneMonthAgo).map(e => e.userId)
    ).size;

    // 计算平均每用户会话数
    const sessionCounts = new Map<string, Set<string>>();
    allEvents.forEach(event => {
      if (!sessionCounts.has(event.userId)) {
        sessionCounts.set(event.userId, new Set());
      }
      sessionCounts.get(event.userId)!.add(event.sessionId);
    });

    const totalSessions = Array.from(sessionCounts.values())
      .reduce((sum, sessions) => sum + sessions.size, 0);
    const averageSessionsPerUser = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0;

    return {
      totalDocuments: uniqueDocuments,
      totalUsers: uniqueUsers,
      totalViews,
      totalEdits,
      averageDocumentSize: 0, // TODO: 需要实际文档大小数据
      storageUsed: 0, // TODO: 需要存储数据
      bandwidthUsed: 0, // TODO: 需要带宽数据
      popularDocumentTypes: [], // TODO: 需要文档类型数据
      userEngagementMetrics: {
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        averageSessionsPerUser,
        userRetentionRate: 0 // TODO: 需要用户保留率计算
      },
      performanceMetrics: {
        averageLoadTime: 0, // TODO: 需要性能数据
        averageSearchTime: 0,
        errorRate: 0,
        uptime: 100
      },
      growthMetrics: {
        documentsGrowthRate: 0, // TODO: 需要历史增长数据
        usersGrowthRate: 0,
        storageGrowthRate: 0
      }
    };
  }

  /**
   * 生成分析报告
   */
  async generateReport(filter?: AnalyticsFilter): Promise<{
    summary: SystemAnalytics;
    topDocuments: Array<{ documentId: number; stats: DocumentUsageStats }>;
    topUsers: Array<{ userId: string; stats: UserActivityStats }>;
    trends: Array<{
      date: string;
      views: number;
      edits: number;
      users: number;
    }>;
  }> {
    const summary = await this.getSystemAnalytics(filter);
    const events = this.getFilteredEvents(filter);

    // 获取热门文档
    const documentCounts = new Map<number, number>();
    events.forEach(event => {
      documentCounts.set(event.documentId, (documentCounts.get(event.documentId) || 0) + 1);
    });

    const topDocumentIds = Array.from(documentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const topDocuments = await Promise.all(
      topDocumentIds.map(async id => ({
        documentId: id,
        stats: await this.getDocumentStats(id, filter)
      }))
    );

    // 获取活跃用户
    const userCounts = new Map<string, number>();
    events.forEach(event => {
      userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1);
    });

    const topUserIds = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const topUsers = await Promise.all(
      topUserIds.map(async id => ({
        userId: id,
        stats: await this.getUserActivityStats(id, filter)
      }))
    );

    // 生成趋势数据
    const trends = this.generateTrendData(events);

    return {
      summary,
      topDocuments,
      topUsers,
      trends
    };
  }

  /**
   * 过滤事件
   */
  private getFilteredEvents(filter?: AnalyticsFilter): DocumentAnalyticsEvent[] {
    let filteredEvents = this.events;

    if (filter) {
      if (filter.startDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filter.startDate!.getTime());
      }
      if (filter.endDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filter.endDate!.getTime());
      }
      if (filter.documentIds && filter.documentIds.length > 0) {
        filteredEvents = filteredEvents.filter(e => filter.documentIds!.includes(e.documentId));
      }
      if (filter.userIds && filter.userIds.length > 0) {
        filteredEvents = filteredEvents.filter(e => filter.userIds!.includes(e.userId));
      }
      if (filter.eventTypes && filter.eventTypes.length > 0) {
        filteredEvents = filteredEvents.filter(e => filter.eventTypes!.includes(e.eventType));
      }
    }

    return filteredEvents;
  }

  /**
   * 按天分组事件
   */
  private groupEventsByDay(events: DocumentAnalyticsEvent[]): Array<{
    date: string;
    views: number;
    uniqueUsers: number;
  }> {
    const dayGroups = new Map<string, Set<string>>();

    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!dayGroups.has(date)) {
        dayGroups.set(date, new Set());
      }
      dayGroups.get(date)!.add(event.userId);
    });

    return Array.from(dayGroups.entries())
      .map(([date, users]) => ({
        date,
        views: events.filter(e => 
          new Date(e.timestamp).toISOString().split('T')[0] === date
        ).length,
        uniqueUsers: users.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 生成趋势数据
   */
  private generateTrendData(events: DocumentAnalyticsEvent[]): Array<{
    date: string;
    views: number;
    edits: number;
    users: number;
  }> {
    const dayGroups = new Map<string, {
      views: number;
      edits: number;
      users: Set<string>;
    }>();

    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!dayGroups.has(date)) {
        dayGroups.set(date, { views: 0, edits: 0, users: new Set() });
      }
      
      const group = dayGroups.get(date)!;
      if (event.eventType === 'view') group.views++;
      if (event.eventType === 'edit') group.edits++;
      group.users.add(event.userId);
    });

    return Array.from(dayGroups.entries())
      .map(([date, stats]) => ({
        date,
        views: stats.views,
        edits: stats.edits,
        users: stats.users.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 工具方法
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectDeviceType(): void {
    // 检测设备类型逻辑
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/Mobi|Android/i.test(userAgent)) return 'mobile';
    if (/Tablet|iPad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private getLocationData(): { location?: { timezone: string } } {
    return {
      location: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  }

  private getUserName(userId: string): string {
    // TODO: 实现用户名获取逻辑
    return userId === 'anonymous' ? '匿名用户' : `用户${userId}`;
  }

  /**
   * 数据持久化
   */
  private saveEventsToStorage(): void {
    try {
      const recentEvents = this.events.slice(-1000); // 只保存最近1000个事件
      localStorage.setItem('documentAnalyticsEvents', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to save analytics events to storage:', error);
    }
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('documentAnalyticsEvents');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load analytics events from storage:', error);
    }
  }

  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.pendingEvents.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }

  private flushEvents(): void {
    if (this.pendingEvents.length === 0) return;

    try {
      // TODO: 发送到服务器
      this.pendingEvents = [];
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushEvents();
  }
}

// 导出单例实例
export const documentAnalyticsService = new DocumentAnalyticsService();
export default documentAnalyticsService;