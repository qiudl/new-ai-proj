package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

type CalendarSyncRepository struct {
	db *sqlx.DB
}

func NewCalendarSyncRepository(db *sqlx.DB) *CalendarSyncRepository {
	return &CalendarSyncRepository{db: db}
}

// SyncQueueItem represents an item in the calendar sync queue
type SyncQueueItem struct {
	ID            int                    `json:"id" db:"id"`
	TaskID        int                    `json:"task_id" db:"task_id"`
	OperationType string                 `json:"operation_type" db:"operation_type"`
	Priority      int                    `json:"priority" db:"priority"`
	Payload       map[string]interface{} `json:"payload" db:"payload"`
	RetryCount    int                    `json:"retry_count" db:"retry_count"`
	MaxRetries    int                    `json:"max_retries" db:"max_retries"`
	Status        string                 `json:"status" db:"status"`
	ErrorMessage  sql.NullString         `json:"error_message" db:"error_message"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	ScheduledAt   time.Time              `json:"scheduled_at" db:"scheduled_at"`
	StartedAt     sql.NullTime           `json:"started_at" db:"started_at"`
	CompletedAt   sql.NullTime           `json:"completed_at" db:"completed_at"`
}

// CalendarSyncLog represents a sync operation log
type CalendarSyncLog struct {
	ID            int                    `json:"id" db:"id"`
	TaskID        int                    `json:"task_id" db:"task_id"`
	SyncDirection string                 `json:"sync_direction" db:"sync_direction"`
	OperationType string                 `json:"operation_type" db:"operation_type"`
	SyncStatus    string                 `json:"sync_status" db:"sync_status"`
	GoogleEventID sql.NullString         `json:"google_event_id" db:"google_event_id"`
	ErrorMessage  sql.NullString         `json:"error_message" db:"error_message"`
	SyncData      map[string]interface{} `json:"sync_data" db:"sync_data"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	CompletedAt   sql.NullTime           `json:"completed_at" db:"completed_at"`
}

// TaskSyncInfo represents task calendar sync information
type TaskSyncInfo struct {
	ID                    int            `json:"id" db:"id"`
	Title                 string         `json:"title" db:"title"`
	Description           sql.NullString `json:"description" db:"description"`
	DueDate               sql.NullTime   `json:"due_date" db:"due_date"`
	Status                string         `json:"status" db:"status"`
	Priority              sql.NullString `json:"priority" db:"priority"`
	SyncToCalendar        bool           `json:"sync_to_calendar" db:"sync_to_calendar"`
	CalendarSyncStatus    string         `json:"calendar_sync_status" db:"calendar_sync_status"`
	LastCalendarSync      sql.NullTime   `json:"last_calendar_sync" db:"last_calendar_sync"`
	CalendarEventURL      sql.NullString `json:"calendar_event_url" db:"calendar_event_url"`
	SyncDirection         string         `json:"sync_direction" db:"sync_direction"`
	CalendarReminderMins  int            `json:"calendar_reminder_minutes" db:"calendar_reminder_minutes"`
	GoogleCalendarEventID sql.NullString `json:"google_calendar_event_id" db:"google_calendar_event_id"`
	ProjectID             int            `json:"project_id" db:"project_id"`
	UserID                int            `json:"user_id" db:"user_id"`
}

// AddToSyncQueue adds a new item to the calendar sync queue
func (r *CalendarSyncRepository) AddToSyncQueue(operationType string, taskID int, priority int, payload map[string]interface{}) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("序列化payload失败: %v", err)
	}

	query := `
		INSERT INTO calendar_sync_queue (task_id, operation_type, priority, payload)
		VALUES ($1, $2, $3, $4)
	`

	_, err = r.db.Exec(query, taskID, operationType, priority, string(payloadJSON))
	if err != nil {
		return fmt.Errorf("添加同步队列项失败: %v", err)
	}

	log.Printf("已添加同步队列项: 任务ID=%d, 操作=%s, 优先级=%d", taskID, operationType, priority)
	return nil
}

// GetPendingSyncItems retrieves pending sync items from the queue
func (r *CalendarSyncRepository) GetPendingSyncItems(limit int) ([]*SyncQueueItem, error) {
	query := `
		SELECT id, task_id, operation_type, priority, payload, retry_count, max_retries,
			   status, error_message, created_at, scheduled_at, started_at, completed_at
		FROM calendar_sync_queue
		WHERE status = 'pending' AND scheduled_at <= NOW()
		ORDER BY priority ASC, created_at ASC
		LIMIT $1
	`

	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("查询待处理同步项失败: %v", err)
	}
	defer rows.Close()

	var items []*SyncQueueItem
	for rows.Next() {
		item := &SyncQueueItem{}
		var payloadStr string

		err := rows.Scan(&item.ID, &item.TaskID, &item.OperationType, &item.Priority,
			&payloadStr, &item.RetryCount, &item.MaxRetries, &item.Status,
			&item.ErrorMessage, &item.CreatedAt, &item.ScheduledAt,
			&item.StartedAt, &item.CompletedAt)
		if err != nil {
			return nil, fmt.Errorf("扫描同步项失败: %v", err)
		}

		// Parse payload JSON
		if err := json.Unmarshal([]byte(payloadStr), &item.Payload); err != nil {
			log.Printf("解析payload JSON失败 (队列项ID=%d): %v", item.ID, err)
			item.Payload = make(map[string]interface{})
		}

		items = append(items, item)
	}

	return items, nil
}

// UpdateSyncItemStatus updates the status of a sync queue item
func (r *CalendarSyncRepository) UpdateSyncItemStatus(itemID int, status string, errorMessage *string) error {
	var query string
	var args []interface{}

	if status == "processing" {
		query = `
			UPDATE calendar_sync_queue 
			SET status = $1, started_at = NOW()
			WHERE id = $2
		`
		args = []interface{}{status, itemID}
	} else if status == "completed" {
		query = `
			UPDATE calendar_sync_queue 
			SET status = $1, completed_at = NOW()
			WHERE id = $2
		`
		args = []interface{}{status, itemID}
	} else if status == "failed" {
		query = `
			UPDATE calendar_sync_queue 
			SET status = $1, retry_count = retry_count + 1, error_message = $2, completed_at = NOW()
			WHERE id = $3
		`
		args = []interface{}{status, errorMessage, itemID}
	} else {
		query = `
			UPDATE calendar_sync_queue 
			SET status = $1
			WHERE id = $2
		`
		args = []interface{}{status, itemID}
	}

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("更新同步项状态失败: %v", err)
	}

	log.Printf("已更新同步项 %d 状态为: %s", itemID, status)
	return nil
}

// GetTaskSyncInfo retrieves task sync information
func (r *CalendarSyncRepository) GetTaskSyncInfo(taskID int) (*TaskSyncInfo, error) {
	query := `
		SELECT t.id, t.title, t.description, t.due_date, t.status, t.priority,
			   COALESCE(t.sync_to_calendar, false) as sync_to_calendar,
			   COALESCE(t.calendar_sync_status, 'disabled') as calendar_sync_status,
			   t.last_calendar_sync, t.calendar_event_url,
			   COALESCE(t.sync_direction, 'bidirectional') as sync_direction,
			   COALESCE(t.calendar_reminder_minutes, 15) as calendar_reminder_minutes,
			   t.google_calendar_event_id, t.project_id, t.user_id
		FROM tasks t
		WHERE t.id = $1 AND t.deleted_at IS NULL
	`

	taskInfo := &TaskSyncInfo{}
	err := r.db.Get(taskInfo, query, taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("任务 %d 不存在", taskID)
		}
		return nil, fmt.Errorf("获取任务同步信息失败: %v", err)
	}

	return taskInfo, nil
}

// UpdateTaskSyncStatus updates the calendar sync status of a task
func (r *CalendarSyncRepository) UpdateTaskSyncStatus(taskID int, status string) error {
	query := `
		UPDATE tasks 
		SET calendar_sync_status = $1,
			last_calendar_sync = CASE WHEN $1 = 'synced' THEN NOW() ELSE last_calendar_sync END
		WHERE id = $2
	`

	_, err := r.db.Exec(query, status, taskID)
	if err != nil {
		return fmt.Errorf("更新任务同步状态失败: %v", err)
	}

	log.Printf("已更新任务 %d 同步状态为: %s", taskID, status)
	return nil
}

// UpdateTaskAfterSync updates task information after successful sync
func (r *CalendarSyncRepository) UpdateTaskAfterSync(taskID int, eventID string, status string) error {
	query := `
		UPDATE tasks 
		SET google_calendar_event_id = $1,
			calendar_sync_status = $2,
			last_calendar_sync = NOW()
		WHERE id = $3
	`

	_, err := r.db.Exec(query, eventID, status, taskID)
	if err != nil {
		return fmt.Errorf("更新任务同步信息失败: %v", err)
	}

	log.Printf("已更新任务 %d 同步信息: 事件ID=%s, 状态=%s", taskID, eventID, status)
	return nil
}

// UpdateTaskSyncSettings updates task calendar sync settings
func (r *CalendarSyncRepository) UpdateTaskSyncSettings(taskID int, syncEnabled bool, direction string, reminderMins int) error {
	status := "disabled"
	if syncEnabled {
		status = "pending"
	}

	query := `
		UPDATE tasks 
		SET sync_to_calendar = $1,
			calendar_sync_status = $2,
			sync_direction = $3,
			calendar_reminder_minutes = $4
		WHERE id = $5
	`

	_, err := r.db.Exec(query, syncEnabled, status, direction, reminderMins, taskID)
	if err != nil {
		return fmt.Errorf("更新任务同步设置失败: %v", err)
	}

	log.Printf("已更新任务 %d 同步设置: 启用=%v, 方向=%s, 提醒=%d分钟", taskID, syncEnabled, direction, reminderMins)
	return nil
}

// FindTaskByGoogleEventID finds a task by its Google Calendar event ID
func (r *CalendarSyncRepository) FindTaskByGoogleEventID(eventID string) (int, error) {
	query := `
		SELECT id 
		FROM tasks 
		WHERE google_calendar_event_id = $1 AND deleted_at IS NULL
	`

	var taskID int
	err := r.db.Get(&taskID, query, eventID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("找不到对应的任务")
		}
		return 0, fmt.Errorf("查询任务失败: %v", err)
	}

	return taskID, nil
}

// LogSyncOperation records a sync operation in the log
func (r *CalendarSyncRepository) LogSyncOperation(taskID int, direction, operation, status, eventID, errorMsg string, syncData map[string]interface{}) error {
	syncDataJSON, err := json.Marshal(syncData)
	if err != nil {
		return fmt.Errorf("序列化同步数据失败: %v", err)
	}

	query := `
		INSERT INTO calendar_sync_logs (task_id, sync_direction, operation_type, sync_status, 
										google_event_id, error_message, sync_data, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 
				CASE WHEN $4 IN ('success', 'failed') THEN NOW() ELSE NULL END)
	`

	var eventIDVal, errorMsgVal interface{}
	if eventID != "" {
		eventIDVal = eventID
	}
	if errorMsg != "" {
		errorMsgVal = errorMsg
	}

	_, err = r.db.Exec(query, taskID, direction, operation, status, eventIDVal, errorMsgVal, string(syncDataJSON))
	if err != nil {
		return fmt.Errorf("记录同步操作失败: %v", err)
	}

	log.Printf("已记录同步操作: 任务=%d, 方向=%s, 操作=%s, 状态=%s", taskID, direction, operation, status)
	return nil
}

// GetSyncLogs retrieves sync logs for a task
func (r *CalendarSyncRepository) GetSyncLogs(taskID int, limit int) ([]*CalendarSyncLog, error) {
	query := `
		SELECT id, task_id, sync_direction, operation_type, sync_status,
			   google_event_id, error_message, sync_data, created_at, completed_at
		FROM calendar_sync_logs
		WHERE task_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, taskID, limit)
	if err != nil {
		return nil, fmt.Errorf("查询同步日志失败: %v", err)
	}
	defer rows.Close()

	var logs []*CalendarSyncLog
	for rows.Next() {
		syncLog := &CalendarSyncLog{}
		var syncDataStr string

		err := rows.Scan(&syncLog.ID, &syncLog.TaskID, &syncLog.SyncDirection, &syncLog.OperationType,
			&syncLog.SyncStatus, &syncLog.GoogleEventID, &syncLog.ErrorMessage, &syncDataStr,
			&syncLog.CreatedAt, &syncLog.CompletedAt)
		if err != nil {
			return nil, fmt.Errorf("扫描同步日志失败: %v", err)
		}

		// Parse sync data JSON
		if err := json.Unmarshal([]byte(syncDataStr), &syncLog.SyncData); err != nil {
			log.Printf("解析同步数据JSON失败 (日志ID=%d): %v", syncLog.ID, err)
			syncLog.SyncData = make(map[string]interface{})
		}

		logs = append(logs, syncLog)
	}

	return logs, nil
}

// GetTasksRequiringSync retrieves tasks that need calendar synchronization
func (r *CalendarSyncRepository) GetTasksRequiringSync(limit int) ([]*TaskSyncInfo, error) {
	query := `
		SELECT t.id, t.title, t.description, t.due_date, t.status, t.priority,
			   t.sync_to_calendar, t.calendar_sync_status, t.last_calendar_sync,
			   t.calendar_event_url, t.sync_direction, t.calendar_reminder_minutes,
			   t.google_calendar_event_id, t.project_id, t.user_id
		FROM tasks t
		WHERE t.sync_to_calendar = true 
		  AND t.calendar_sync_status IN ('pending', 'failed')
		  AND t.deleted_at IS NULL
		ORDER BY t.updated_at DESC
		LIMIT $1
	`

	var tasks []*TaskSyncInfo
	err := r.db.Select(&tasks, query, limit)
	if err != nil {
		return nil, fmt.Errorf("查询需要同步的任务失败: %v", err)
	}

	return tasks, nil
}

// UpdateTaskFromCalendarSync updates task fields based on calendar event changes
func (r *CalendarSyncRepository) UpdateTaskFromCalendarSync(taskID int, updateFields map[string]interface{}) error {
	if len(updateFields) == 0 {
		return nil // 无需更新
	}

	// 构建动态SQL更新语句
	setParts := make([]string, 0, len(updateFields))
	args := make([]interface{}, 0, len(updateFields)+1)
	argIndex := 1

	for field, value := range updateFields {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", field, argIndex))
		args = append(args, value)
		argIndex++
	}

	// 构建完整的更新查询
	query := fmt.Sprintf(`
		UPDATE tasks 
		SET %s, updated_at = NOW()
		WHERE id = $%d AND deleted_at IS NULL
	`, strings.Join(setParts, ", "), argIndex)

	args = append(args, taskID)

	result, err := r.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("更新任务字段失败: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("任务 %d 不存在或已被删除", taskID)
	}

	// 记录更新的字段
	updatedFields := make([]string, 0, len(updateFields))
	for field := range updateFields {
		updatedFields = append(updatedFields, field)
	}

	log.Printf("已更新任务 %d 的字段: %s", taskID, strings.Join(updatedFields, ", "))
	return nil
}

// CleanupCompletedSyncItems removes old completed sync queue items
func (r *CalendarSyncRepository) CleanupCompletedSyncItems(olderThanDays int) error {
	query := `
		DELETE FROM calendar_sync_queue
		WHERE status IN ('completed', 'failed')
		  AND completed_at < NOW() - INTERVAL '%d days'
	`

	result, err := r.db.Exec(fmt.Sprintf(query, olderThanDays))
	if err != nil {
		return fmt.Errorf("清理已完成同步项失败: %v", err)
	}

	affected, _ := result.RowsAffected()
	log.Printf("已清理 %d 个超过 %d 天的同步项", affected, olderThanDays)
	return nil
}
