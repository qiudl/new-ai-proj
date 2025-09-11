package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
)

// TimelineEventsRepository 时间线事件仓库接口
type TimelineEventsRepository interface {
	// 创建时间线事件
	CreateEvent(ctx context.Context, event *models.TaskTimelineEvent) error
	
	// 批量创建时间线事件
	CreateEvents(ctx context.Context, events []*models.TaskTimelineEvent) error
	
	// 获取任务的时间线事件
	GetTaskTimeline(ctx context.Context, taskID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	
	// 获取多个任务的时间线事件
	GetTasksTimeline(ctx context.Context, taskIDs []int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	
	// 获取项目的时间线事件
	GetProjectTimeline(ctx context.Context, projectID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	
	// 获取用户的活动时间线
	GetUserActivity(ctx context.Context, userID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	
	// 获取事件详情
	GetEventByID(ctx context.Context, eventID int64) (*models.TaskTimelineEvent, error)
	
	// 删除事件
	DeleteEvent(ctx context.Context, eventID int64) error
	
	// 获取时间线统计信息
	GetTimelineStatistics(ctx context.Context, filter *models.TimelineEventFilter) (*models.TimelineStatistics, error)
	
	// 清理过期事件
	CleanupExpiredEvents(ctx context.Context, beforeDate time.Time) (int64, error)
}

// timelineEventsRepository 时间线事件仓库实现
type timelineEventsRepository struct {
	db interface{}
}

// NewTimelineEventsRepository 创建新的时间线事件仓库
func NewTimelineEventsRepository(db interface{}) TimelineEventsRepository {
	return &timelineEventsRepository{db: db}
}

// CreateEvent 创建时间线事件
func (r *timelineEventsRepository) CreateEvent(ctx context.Context, event *models.TaskTimelineEvent) error {
	if event == nil {
		return fmt.Errorf("event cannot be nil")
	}
	
	// 设置默认值
	if event.EventDate.IsZero() {
		event.EventDate = time.Now()
	}
	if event.Severity == "" {
		event.Severity = models.SeverityInfo
	}
	if event.Category == "" {
		event.Category = models.CategoryUser
	}
	
	// 处理不同的数据库类型
	if gormDB, ok := r.db.(*gorm.DB); ok {
		return gormDB.WithContext(ctx).Create(event).Error
	}
	
	// 使用原生SQL的简化实现
	if sqlDB, ok := r.db.(*sql.DB); ok {
		return r.createEventWithSQL(ctx, sqlDB, event)
	}
	
	if sqlTx, ok := r.db.(*sql.Tx); ok {
		return r.createEventWithSQLTx(ctx, sqlTx, event)
	}
	
	log.Printf("Timeline events repository: database type not supported, event logged: %+v", event)
	return nil // 不支持的数据库类型，仅记录日志
}

// CreateEvents 批量创建时间线事件
func (r *timelineEventsRepository) CreateEvents(ctx context.Context, events []*models.TaskTimelineEvent) error {
	if len(events) == 0 {
		return nil
	}
	
	// 设置默认值
	now := time.Now()
	for _, event := range events {
		if event.EventDate.IsZero() {
			event.EventDate = now
		}
		if event.Severity == "" {
			event.Severity = models.SeverityInfo
		}
		if event.Category == "" {
			event.Category = models.CategoryUser
		}
	}
	
	// 处理不同的数据库类型
	if gormDB, ok := r.db.(*gorm.DB); ok {
		return gormDB.WithContext(ctx).CreateInBatches(events, 100).Error
	}
	
	// 使用原生SQL逐个插入
	for _, event := range events {
		if err := r.CreateEvent(ctx, event); err != nil {
			return fmt.Errorf("failed to create event: %w", err)
		}
	}
	return nil
}

// GetTaskTimeline 获取任务的时间线事件
func (r *timelineEventsRepository) GetTaskTimeline(ctx context.Context, taskID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	if filter == nil {
		filter = &models.TimelineEventFilter{}
	}
	
	// 设置任务ID过滤
	filter.TaskID = &taskID
	
	return r.getTimelineWithFilter(ctx, filter)
}

// GetTasksTimeline 获取多个任务的时间线事件
func (r *timelineEventsRepository) GetTasksTimeline(ctx context.Context, taskIDs []int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	if len(taskIDs) == 0 {
		return []*models.TaskTimelineEvent{}, 0, nil
	}
	
	if filter == nil {
		filter = &models.TimelineEventFilter{}
	}
	
	// 设置任务IDs过滤
	filter.TaskIDs = taskIDs
	
	return r.getTimelineWithFilter(ctx, filter)
}

// GetProjectTimeline 获取项目的时间线事件
func (r *timelineEventsRepository) GetProjectTimeline(ctx context.Context, projectID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	if filter == nil {
		filter = &models.TimelineEventFilter{}
	}
	
	// 设置项目ID过滤
	filter.ProjectID = &projectID
	
	return r.getTimelineWithFilter(ctx, filter)
}

// GetUserActivity 获取用户的活动时间线
func (r *timelineEventsRepository) GetUserActivity(ctx context.Context, userID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	if filter == nil {
		filter = &models.TimelineEventFilter{}
	}
	
	// 设置用户ID过滤
	filter.UserIDs = []int64{userID}
	
	return r.getTimelineWithFilter(ctx, filter)
}

// getTimelineWithFilter 根据过滤器获取时间线事件
func (r *timelineEventsRepository) getTimelineWithFilter(ctx context.Context, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.TaskTimelineEvent{})
	
	// 应用过滤条件
	query = r.applyFilters(query, filter)
	
	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count timeline events: %w", err)
	}
	
	// 应用排序
	query = r.applySorting(query, filter)
	
	// 应用分页
	query = r.applyPagination(query, filter)
	
	// 执行查询
	var events []*models.TaskTimelineEvent
	if err := query.Find(&events).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch timeline events: %w", err)
	}
	
	return events, total, nil
}

// applyFilters 应用过滤条件
func (r *timelineEventsRepository) applyFilters(query *gorm.DB, filter *models.TimelineEventFilter) *gorm.DB {
	// 任务ID过滤
	if filter.TaskID != nil {
		query = query.Where("task_id = ?", *filter.TaskID)
	}
	
	// 多个任务ID过滤
	if len(filter.TaskIDs) > 0 {
		query = query.Where("task_id IN ?", filter.TaskIDs)
	}
	
	// 项目ID过滤
	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	
	// 事件类型过滤
	if len(filter.EventTypes) > 0 {
		types := make([]string, len(filter.EventTypes))
		for i, t := range filter.EventTypes {
			types[i] = string(t)
		}
		query = query.Where("event_type IN ?", types)
	}
	
	// 用户ID过滤
	if len(filter.UserIDs) > 0 {
		query = query.Where("user_id IN ?", filter.UserIDs)
	}
	
	// 事件分类过滤
	if len(filter.Categories) > 0 {
		categories := make([]string, len(filter.Categories))
		for i, c := range filter.Categories {
			categories[i] = string(c)
		}
		query = query.Where("category IN ?", categories)
	}
	
	// 严重性过滤
	if len(filter.Severities) > 0 {
		severities := make([]string, len(filter.Severities))
		for i, s := range filter.Severities {
			severities[i] = string(s)
		}
		query = query.Where("severity IN ?", severities)
	}
	
	// 时间范围过滤
	if filter.StartDate != nil {
		query = query.Where("event_date >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("event_date <= ?", *filter.EndDate)
	}
	
	// 批次ID过滤
	if filter.BatchID != "" {
		query = query.Where("metadata->>'batch_id' = ?", filter.BatchID)
	}
	
	// 是否包含系统事件
	if !filter.IncludeSystem {
		query = query.Where("category != ?", "system")
	}
	
	return query
}

// applySorting 应用排序
func (r *timelineEventsRepository) applySorting(query *gorm.DB, filter *models.TimelineEventFilter) *gorm.DB {
	sortBy := filter.SortBy
	if sortBy == "" {
		sortBy = "event_date"
	}
	
	sortOrder := filter.SortOrder
	if sortOrder == "" {
		sortOrder = "desc"
	}
	
	// 验证排序字段
	validSortFields := map[string]bool{
		"event_date": true,
		"created_at": true,
		"severity":   true,
		"event_type": true,
		"user_id":    true,
	}
	
	if !validSortFields[sortBy] {
		sortBy = "event_date"
	}
	
	// 验证排序方向
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}
	
	return query.Order(fmt.Sprintf("%s %s", sortBy, strings.ToUpper(sortOrder)))
}

// applyPagination 应用分页
func (r *timelineEventsRepository) applyPagination(query *gorm.DB, filter *models.TimelineEventFilter) *gorm.DB {
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	
	pageSize := filter.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > 200 {
		pageSize = 200
	}
	
	offset := (page - 1) * pageSize
	return query.Offset(offset).Limit(pageSize)
}

// GetEventByID 获取事件详情
func (r *timelineEventsRepository) GetEventByID(ctx context.Context, eventID int64) (*models.TaskTimelineEvent, error) {
	var event models.TaskTimelineEvent
	err := r.db.WithContext(ctx).First(&event, eventID).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("timeline event not found")
		}
		return nil, fmt.Errorf("failed to get timeline event: %w", err)
	}
	return &event, nil
}

// DeleteEvent 删除事件
func (r *timelineEventsRepository) DeleteEvent(ctx context.Context, eventID int64) error {
	result := r.db.WithContext(ctx).Delete(&models.TaskTimelineEvent{}, eventID)
	if result.Error != nil {
		return fmt.Errorf("failed to delete timeline event: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("timeline event not found")
	}
	return nil
}

// GetTimelineStatistics 获取时间线统计信息
func (r *timelineEventsRepository) GetTimelineStatistics(ctx context.Context, filter *models.TimelineEventFilter) (*models.TimelineStatistics, error) {
	stats := &models.TimelineStatistics{
		EventTypesDistribution: make(map[models.TaskTimelineEventType]int),
		UserActivity:           []models.UserActivityStat{},
		DailyActivity:          []models.DailyActivityStat{},
		SeverityDistribution:   make(map[models.EventSeverity]int),
		CategoryDistribution:   make(map[models.EventCategory]int),
	}
	
	query := r.db.WithContext(ctx).Model(&models.TaskTimelineEvent{})
	query = r.applyFilters(query, filter)
	
	// 总事件数
	if err := query.Count(&stats.TotalEvents).Error; err != nil {
		return nil, fmt.Errorf("failed to count total events: %w", err)
	}
	
	// 事件类型分布
	var eventTypeStats []struct {
		EventType string
		Count     int
	}
	err := r.db.WithContext(ctx).Model(&models.TaskTimelineEvent{}).
		Select("event_type, COUNT(*) as count").
		Group("event_type").
		Scan(&eventTypeStats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get event type distribution: %w", err)
	}
	
	for _, stat := range eventTypeStats {
		stats.EventTypesDistribution[models.TaskTimelineEventType(stat.EventType)] = stat.Count
	}
	
	// 用户活动统计
	var userStats []struct {
		UserID    int64
		Username  string
		Count     int
	}
	err = r.db.WithContext(ctx).Model(&models.TaskTimelineEvent{}).
		Select("user_id, username, COUNT(*) as count").
		Where("user_id IS NOT NULL").
		Group("user_id, username").
		Order("count DESC").
		Limit(10).
		Scan(&userStats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get user activity: %w", err)
	}
	
	for _, stat := range userStats {
		stats.UserActivity = append(stats.UserActivity, models.UserActivityStat{
			UserID:     stat.UserID,
			Username:   stat.Username,
			EventCount: stat.Count,
		})
	}
	
	// 每日活动统计
	var dailyStats []struct {
		Date  string
		Count int
	}
	err = r.db.WithContext(ctx).Model(&models.TaskTimelineEvent{}).
		Select("DATE(event_date) as date, COUNT(*) as count").
		Where("event_date >= ?", time.Now().AddDate(0, 0, -30)).
		Group("DATE(event_date)").
		Order("date DESC").
		Scan(&dailyStats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get daily activity: %w", err)
	}
	
	for _, stat := range dailyStats {
		stats.DailyActivity = append(stats.DailyActivity, models.DailyActivityStat{
			Date:       stat.Date,
			EventCount: stat.Count,
		})
	}
	
	// 严重性分布
	var severityStats []struct {
		Severity string
		Count    int
	}
	err = r.db.WithContext(ctx).Model(&models.TaskTimelineEvent{}).
		Select("severity, COUNT(*) as count").
		Group("severity").
		Scan(&severityStats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get severity distribution: %w", err)
	}
	
	for _, stat := range severityStats {
		stats.SeverityDistribution[models.EventSeverity(stat.Severity)] = stat.Count
	}
	
	// 分类分布
	var categoryStats []struct {
		Category string
		Count    int
	}
	err = r.db.WithContext(ctx).Model(&models.TaskTimelineEvent{}).
		Select("category, COUNT(*) as count").
		Group("category").
		Scan(&categoryStats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get category distribution: %w", err)
	}
	
	for _, stat := range categoryStats {
		stats.CategoryDistribution[models.EventCategory(stat.Category)] = stat.Count
	}
	
	return stats, nil
}

// CleanupExpiredEvents 清理过期事件
func (r *timelineEventsRepository) CleanupExpiredEvents(ctx context.Context, beforeDate time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("event_date < ?", beforeDate).
		Delete(&models.TaskTimelineEvent{})
	
	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup expired events: %w", result.Error)
	}
	
	return result.RowsAffected, nil
}

// createEventWithSQL 使用原生SQL创建事件
func (r *timelineEventsRepository) createEventWithSQL(ctx context.Context, db *sql.DB, event *models.TaskTimelineEvent) error {
	query := `
		INSERT INTO task_timeline_events (
			task_id, event_type, event_date, description, user_id, 
			metadata, username, task_title, project_id, correlation_id, 
			parent_event_id, severity, category, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	
	metadataJSON, _ := json.Marshal(event.Metadata)
	now := time.Now()
	
	_, err := db.ExecContext(ctx, query,
		event.TaskID, event.EventType, event.EventDate, event.Description,
		event.UserID, metadataJSON, event.Username, event.TaskTitle,
		event.ProjectID, event.CorrelationID, event.ParentEventID,
		event.Severity, event.Category, now, now,
	)
	return err
}

// createEventWithSQLTx 使用事务创建事件
func (r *timelineEventsRepository) createEventWithSQLTx(ctx context.Context, tx *sql.Tx, event *models.TaskTimelineEvent) error {
	query := `
		INSERT INTO task_timeline_events (
			task_id, event_type, event_date, description, user_id, 
			metadata, username, task_title, project_id, correlation_id, 
			parent_event_id, severity, category, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	
	metadataJSON, _ := json.Marshal(event.Metadata)
	now := time.Now()
	
	_, err := tx.ExecContext(ctx, query,
		event.TaskID, event.EventType, event.EventDate, event.Description,
		event.UserID, metadataJSON, event.Username, event.TaskTitle,
		event.ProjectID, event.CorrelationID, event.ParentEventID,
		event.Severity, event.Category, now, now,
	)
	return err
}