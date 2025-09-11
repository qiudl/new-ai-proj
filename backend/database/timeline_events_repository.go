package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/lib/pq"
)

// TimelineEventsRepository 时间线事件仓库接口
type TimelineEventsRepository interface {
	CreateEvent(ctx context.Context, event *models.TaskTimelineEvent) error
	CreateEvents(ctx context.Context, events []*models.TaskTimelineEvent) error
	GetTaskTimeline(ctx context.Context, taskID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	GetTasksTimeline(ctx context.Context, taskIDs []int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	GetProjectTimeline(ctx context.Context, projectID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	GetUserActivity(ctx context.Context, userID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error)
	GetEventByID(ctx context.Context, eventID int64) (*models.TaskTimelineEvent, error)
	DeleteEvent(ctx context.Context, eventID int64) error
	GetTimelineStatistics(ctx context.Context, filter *models.TimelineEventFilter) (*models.TimelineStatistics, error)
	CleanupExpiredEvents(ctx context.Context, beforeDate time.Time) (int64, error)
}

// timelineEventsRepository PostgreSQL实现
type timelineEventsRepository struct {
	db interface{} // 兼容不同的DB接口
}

// NewTimelineEventsRepository 创建新的时间线事件仓库
func NewTimelineEventsRepository(db interface{}) TimelineEventsRepository {
	return &timelineEventsRepository{
		db: db,
	}
}

// execContext 执行上下文查询
func (r *timelineEventsRepository) execContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	switch db := r.db.(type) {
	case *sql.DB:
		return db.ExecContext(ctx, query, args...)
	case *sql.Tx:
		return db.ExecContext(ctx, query, args...)
	default:
		return nil, fmt.Errorf("unsupported database type")
	}
}

// queryContext 执行上下文查询
func (r *timelineEventsRepository) queryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	switch db := r.db.(type) {
	case *sql.DB:
		return db.QueryContext(ctx, query, args...)
	case *sql.Tx:
		return db.QueryContext(ctx, query, args...)
	default:
		return nil, fmt.Errorf("unsupported database type")
	}
}

// queryRowContext 执行单行查询
func (r *timelineEventsRepository) queryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	switch db := r.db.(type) {
	case *sql.DB:
		return db.QueryRowContext(ctx, query, args...)
	case *sql.Tx:
		return db.QueryRowContext(ctx, query, args...)
	default:
		// 这种情况下无法返回有意义的结果
		return nil
	}
}

// CreateEvent 创建单个时间线事件
func (r *timelineEventsRepository) CreateEvent(ctx context.Context, event *models.TaskTimelineEvent) error {
	query := `
		INSERT INTO timeline_events (
			task_id, event_type, event_date, description, user_id, metadata
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	var metadataJSON []byte
	var err error
	if event.Metadata != nil {
		metadataJSON, err = json.Marshal(event.Metadata)
		if err != nil {
			return fmt.Errorf("failed to marshal metadata: %w", err)
		}
	}

	err = r.queryRowContext(ctx, query,
		event.TaskID,
		string(event.EventType),
		event.EventDate,
		event.Description,
		event.UserID,
		metadataJSON,
	).Scan(&event.ID)

	if err != nil {
		return fmt.Errorf("failed to create timeline event: %w", err)
	}

	return nil
}

// CreateEvents 批量创建时间线事件
func (r *timelineEventsRepository) CreateEvents(ctx context.Context, events []*models.TaskTimelineEvent) error {
	if len(events) == 0 {
		return nil
	}

	// 对于批量操作，先简单循环实现
	for _, event := range events {
		if err := r.CreateEvent(ctx, event); err != nil {
			return err
		}
	}

	return nil
}

// GetTaskTimeline 获取任务时间线
func (r *timelineEventsRepository) GetTaskTimeline(ctx context.Context, taskID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	// 构建基础查询
	baseQuery := `
		SELECT 
			te.id, te.task_id, te.event_type, te.event_date, te.description, 
			te.user_id, te.metadata,
			COALESCE(u.username, '') as username,
			COALESCE(t.title, '') as task_title
		FROM timeline_events te
		LEFT JOIN users u ON te.user_id = u.id
		LEFT JOIN tasks t ON te.task_id = t.id
		WHERE te.task_id = $1
	`

	// 添加排序
	orderClause := " ORDER BY te.event_date DESC"
	
	// 添加分页
	limitClause := ""
	args := []interface{}{taskID}
	
	if filter != nil {
		if filter.PageSize > 0 {
			offset := (filter.Page - 1) * filter.PageSize
			limitClause = fmt.Sprintf(" LIMIT $2 OFFSET $3")
			args = append(args, filter.PageSize, offset)
		}
	} else {
		// 默认分页
		limitClause = " LIMIT 100 OFFSET 0"
	}

	query := baseQuery + orderClause + limitClause

	rows, err := r.queryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query task timeline: %w", err)
	}
	defer rows.Close()

	events, err := r.scanTimelineEvents(rows)
	if err != nil {
		return nil, 0, err
	}

	// 查询总数
	countQuery := `SELECT COUNT(*) FROM timeline_events WHERE task_id = $1`
	var total int64
	err = r.queryRowContext(ctx, countQuery, taskID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count task timeline: %w", err)
	}

	return events, total, nil
}

// GetTasksTimeline 获取多个任务的时间线
func (r *timelineEventsRepository) GetTasksTimeline(ctx context.Context, taskIDs []int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	if len(taskIDs) == 0 {
		return []*models.TaskTimelineEvent{}, 0, nil
	}

	query := `
		SELECT 
			te.id, te.task_id, te.event_type, te.event_date, te.description, 
			te.user_id, te.metadata,
			COALESCE(u.username, '') as username,
			COALESCE(t.title, '') as task_title
		FROM timeline_events te
		LEFT JOIN users u ON te.user_id = u.id
		LEFT JOIN tasks t ON te.task_id = t.id
		WHERE te.task_id = ANY($1)
		ORDER BY te.event_date DESC
		LIMIT 1000
	`

	rows, err := r.queryContext(ctx, query, pq.Array(taskIDs))
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query tasks timeline: %w", err)
	}
	defer rows.Close()

	events, err := r.scanTimelineEvents(rows)
	if err != nil {
		return nil, 0, err
	}

	return events, int64(len(events)), nil
}

// GetProjectTimeline 获取项目时间线
func (r *timelineEventsRepository) GetProjectTimeline(ctx context.Context, projectID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	query := `
		SELECT 
			te.id, te.task_id, te.event_type, te.event_date, te.description, 
			te.user_id, te.metadata,
			COALESCE(u.username, '') as username,
			COALESCE(t.title, '') as task_title
		FROM timeline_events te
		LEFT JOIN users u ON te.user_id = u.id
		INNER JOIN tasks t ON te.task_id = t.id
		WHERE t.project_id = $1
		ORDER BY te.event_date DESC
		LIMIT 1000
	`

	rows, err := r.queryContext(ctx, query, projectID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query project timeline: %w", err)
	}
	defer rows.Close()

	events, err := r.scanTimelineEvents(rows)
	if err != nil {
		return nil, 0, err
	}

	return events, int64(len(events)), nil
}

// GetUserActivity 获取用户活动时间线
func (r *timelineEventsRepository) GetUserActivity(ctx context.Context, userID int64, filter *models.TimelineEventFilter) ([]*models.TaskTimelineEvent, int64, error) {
	query := `
		SELECT 
			te.id, te.task_id, te.event_type, te.event_date, te.description, 
			te.user_id, te.metadata,
			COALESCE(u.username, '') as username,
			COALESCE(t.title, '') as task_title
		FROM timeline_events te
		LEFT JOIN users u ON te.user_id = u.id
		LEFT JOIN tasks t ON te.task_id = t.id
		WHERE te.user_id = $1
		ORDER BY te.event_date DESC
		LIMIT 1000
	`

	rows, err := r.queryContext(ctx, query, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query user activity: %w", err)
	}
	defer rows.Close()

	events, err := r.scanTimelineEvents(rows)
	if err != nil {
		return nil, 0, err
	}

	return events, int64(len(events)), nil
}

// GetEventByID 根据ID获取事件
func (r *timelineEventsRepository) GetEventByID(ctx context.Context, eventID int64) (*models.TaskTimelineEvent, error) {
	query := `
		SELECT 
			te.id, te.task_id, te.event_type, te.event_date, te.description, 
			te.user_id, te.metadata,
			COALESCE(u.username, '') as username,
			COALESCE(t.title, '') as task_title
		FROM timeline_events te
		LEFT JOIN users u ON te.user_id = u.id
		LEFT JOIN tasks t ON te.task_id = t.id
		WHERE te.id = $1
	`

	rows, err := r.queryContext(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query event: %w", err)
	}
	defer rows.Close()

	events, err := r.scanTimelineEvents(rows)
	if err != nil {
		return nil, err
	}

	if len(events) == 0 {
		return nil, fmt.Errorf("event not found")
	}

	return events[0], nil
}

// DeleteEvent 删除事件
func (r *timelineEventsRepository) DeleteEvent(ctx context.Context, eventID int64) error {
	query := `DELETE FROM timeline_events WHERE id = $1`
	
	result, err := r.execContext(ctx, query, eventID)
	if err != nil {
		return fmt.Errorf("failed to delete timeline event: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("event not found")
	}

	return nil
}

// GetTimelineStatistics 获取时间线统计信息
func (r *timelineEventsRepository) GetTimelineStatistics(ctx context.Context, filter *models.TimelineEventFilter) (*models.TimelineStatistics, error) {
	// 返回基础统计信息
	query := `
		SELECT 
			COUNT(*) as total_events
		FROM timeline_events
	`

	var stats models.TimelineStatistics
	err := r.queryRowContext(ctx, query).Scan(
		&stats.TotalEvents,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query timeline statistics: %w", err)
	}

	// 初始化分布映射
	stats.EventTypesDistribution = make(map[models.TaskTimelineEventType]int)
	stats.SeverityDistribution = make(map[models.EventSeverity]int)
	stats.CategoryDistribution = make(map[models.EventCategory]int)

	return &stats, nil
}

// CleanupExpiredEvents 清理过期事件
func (r *timelineEventsRepository) CleanupExpiredEvents(ctx context.Context, beforeDate time.Time) (int64, error) {
	query := `DELETE FROM timeline_events WHERE event_date < $1`
	
	result, err := r.execContext(ctx, query, beforeDate)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup expired events: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

// scanTimelineEvents 扫描时间线事件结果
func (r *timelineEventsRepository) scanTimelineEvents(rows *sql.Rows) ([]*models.TaskTimelineEvent, error) {
	events := []*models.TaskTimelineEvent{}

	for rows.Next() {
		event := &models.TaskTimelineEvent{}
		var metadataJSON sql.NullString
		var username sql.NullString
		var taskTitle sql.NullString

		err := rows.Scan(
			&event.ID,
			&event.TaskID,
			&event.EventType,
			&event.EventDate,
			&event.Description,
			&event.UserID,
			&metadataJSON,
			&username,
			&taskTitle,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan timeline event: %w", err)
		}

		if username.Valid {
			event.Username = username.String
		}
		if taskTitle.Valid {
			event.TaskTitle = taskTitle.String
		}

		// 解析元数据
		if metadataJSON.Valid && metadataJSON.String != "" {
			var metadata models.TaskTimelineEventMetadata
			if err := json.Unmarshal([]byte(metadataJSON.String), &metadata); err != nil {
				log.Printf("Warning: failed to unmarshal metadata for event %d: %v", event.ID, err)
			} else {
				event.Metadata = &metadata
			}
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating timeline events: %w", err)
	}

	return events, nil
}