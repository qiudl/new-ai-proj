package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"ai-project-backend/database"
)

type CalendarSyncService struct {
	googleCalendarService *GoogleCalendarService
	calendarSyncRepo     *database.CalendarSyncRepository
	googleAuthRepo       database.GoogleAuthRepository
}

// SyncDirection represents the direction of synchronization
type SyncDirection string

const (
	SyncDirectionTaskToCalendar  SyncDirection = "task_to_calendar"
	SyncDirectionCalendarToTask  SyncDirection = "calendar_to_task" 
	SyncDirectionBidirectional   SyncDirection = "bidirectional"
)

// CalendarSyncStatus represents the current sync status
type CalendarSyncStatus string

const (
	SyncStatusPending   CalendarSyncStatus = "pending"
	SyncStatusSynced    CalendarSyncStatus = "synced"
	SyncStatusFailed    CalendarSyncStatus = "failed"
	SyncStatusDisabled  CalendarSyncStatus = "disabled"
	SyncStatusSyncing   CalendarSyncStatus = "syncing"
)

// SyncQueueItem represents an item in the sync queue
type SyncQueueItem struct {
	ID            int                    `json:"id" db:"id"`
	TaskID        int                    `json:"task_id" db:"task_id"`
	OperationType string                 `json:"operation_type" db:"operation_type"`
	Priority      int                    `json:"priority" db:"priority"`
	Payload       map[string]interface{} `json:"payload" db:"payload"`
	RetryCount    int                    `json:"retry_count" db:"retry_count"`
	MaxRetries    int                    `json:"max_retries" db:"max_retries"`
	Status        string                 `json:"status" db:"status"`
	ErrorMessage  string                 `json:"error_message" db:"error_message"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	ScheduledAt   time.Time              `json:"scheduled_at" db:"scheduled_at"`
	StartedAt     *time.Time             `json:"started_at" db:"started_at"`
	CompletedAt   *time.Time             `json:"completed_at" db:"completed_at"`
}

// SyncLog represents a calendar sync operation log
type SyncLog struct {
	ID            int                    `json:"id" db:"id"`
	TaskID        int                    `json:"task_id" db:"task_id"`
	SyncDirection string                 `json:"sync_direction" db:"sync_direction"`
	OperationType string                 `json:"operation_type" db:"operation_type"`
	SyncStatus    string                 `json:"sync_status" db:"sync_status"`
	GoogleEventID string                 `json:"google_event_id" db:"google_event_id"`
	ErrorMessage  string                 `json:"error_message" db:"error_message"`
	SyncData      map[string]interface{} `json:"sync_data" db:"sync_data"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	CompletedAt   *time.Time             `json:"completed_at" db:"completed_at"`
}

// TaskSyncData represents task data for calendar synchronization
type TaskSyncData struct {
	ID                   int                `json:"id"`
	Title                string             `json:"title"`
	Description          string             `json:"description"`
	DueDate             *time.Time         `json:"due_date"`
	Status               string             `json:"status"`
	Priority             string             `json:"priority"`
	SyncToCalendar       bool               `json:"sync_to_calendar"`
	CalendarSyncStatus   CalendarSyncStatus `json:"calendar_sync_status"`
	LastCalendarSync     *time.Time         `json:"last_calendar_sync"`
	CalendarEventURL     string             `json:"calendar_event_url"`
	SyncDirection        SyncDirection      `json:"sync_direction"`
	CalendarReminderMins int                `json:"calendar_reminder_minutes"`
	GoogleCalendarEventID string            `json:"google_calendar_event_id"`
	ProjectID            int                `json:"project_id"`
	UserID               int                `json:"user_id"`
}

func NewCalendarSyncService(googleCalendarService *GoogleCalendarService, calendarSyncRepo *database.CalendarSyncRepository, googleAuthRepo database.GoogleAuthRepository) *CalendarSyncService {
	return &CalendarSyncService{
		googleCalendarService: googleCalendarService,
		calendarSyncRepo:     calendarSyncRepo,
		googleAuthRepo:       googleAuthRepo,
	}
}

// SyncTaskToCalendar syncs a task to Google Calendar
func (s *CalendarSyncService) SyncTaskToCalendar(ctx context.Context, taskID int, userID int) error {
	log.Printf("开始同步任务 %d 到Google日历", taskID)

	// Add to sync queue for async processing
	return s.addToSyncQueue("sync_task_to_calendar", taskID, 1, map[string]interface{}{
		"task_id": taskID,
		"user_id": userID,
		"timestamp": time.Now().Unix(),
	})
}

// SyncCalendarToTask syncs Google Calendar event changes back to task
func (s *CalendarSyncService) SyncCalendarToTask(ctx context.Context, eventID string, userID int) error {
	log.Printf("开始同步Google日历事件 %s 到任务", eventID)

	// Find task by Google event ID
	taskID, err := s.findTaskByGoogleEventID(eventID)
	if err != nil {
		return fmt.Errorf("找不到对应任务: %v", err)
	}

	return s.addToSyncQueue("sync_calendar_to_task", taskID, 1, map[string]interface{}{
		"google_event_id": eventID,
		"user_id": userID,
		"timestamp": time.Now().Unix(),
	})
}

// ProcessSyncQueue processes pending sync operations
func (s *CalendarSyncService) ProcessSyncQueue(ctx context.Context) error {
	log.Println("开始处理日历同步队列")

	// Get pending sync items
	items, err := s.getPendingSyncItems(10) // Process up to 10 items at a time
	if err != nil {
		return fmt.Errorf("获取待处理同步项失败: %v", err)
	}

	for _, item := range items {
		if err := s.processSyncItem(ctx, item); err != nil {
			log.Printf("处理同步项失败 (ID: %d): %v", item.ID, err)
			s.markSyncItemFailed(item.ID, err.Error())
		} else {
			s.markSyncItemCompleted(item.ID)
		}
	}

	return nil
}

// processSyncItem processes a single sync queue item
func (s *CalendarSyncService) processSyncItem(ctx context.Context, item *SyncQueueItem) error {
	// Mark as processing
	if err := s.markSyncItemProcessing(item.ID); err != nil {
		return fmt.Errorf("标记处理状态失败: %v", err)
	}

	switch item.OperationType {
	case "sync_task_to_calendar":
		return s.executeTaskToCalendarSync(ctx, item)
	case "sync_calendar_to_task":
		return s.executeCalendarToTaskSync(ctx, item)
	default:
		return fmt.Errorf("未知的同步操作类型: %s", item.OperationType)
	}
}

// executeTaskToCalendarSync executes task to calendar synchronization
func (s *CalendarSyncService) executeTaskToCalendarSync(ctx context.Context, item *SyncQueueItem) error {
	taskID := int(item.Payload["task_id"].(float64))
	userID := int(item.Payload["user_id"].(float64))

	// Get task data
	taskData, err := s.getTaskSyncData(taskID)
	if err != nil {
		return fmt.Errorf("获取任务数据失败: %v", err)
	}

	// Check if task should be synced
	if !taskData.SyncToCalendar {
		log.Printf("任务 %d 不需要同步到日历", taskID)
		return nil
	}

	// Update task sync status to syncing
	if err := s.updateTaskSyncStatus(taskID, SyncStatusSyncing); err != nil {
		return fmt.Errorf("更新同步状态失败: %v", err)
	}

	// Create or update Google Calendar event
	var eventID string
	if taskData.GoogleCalendarEventID != "" {
		// Update existing event
		eventID, err = s.updateGoogleCalendarEvent(ctx, userID, taskData)
	} else {
		// Create new event
		eventID, err = s.createGoogleCalendarEvent(ctx, userID, taskData)
	}

	if err != nil {
		s.updateTaskSyncStatus(taskID, SyncStatusFailed)
		s.logSyncOperation(taskID, string(SyncDirectionTaskToCalendar), "update", "failed", "", err.Error(), item.Payload)
		return fmt.Errorf("Google日历操作失败: %v", err)
	}

	// Update task with event ID and sync status
	if err := s.updateTaskAfterSync(taskID, eventID, SyncStatusSynced); err != nil {
		return fmt.Errorf("更新任务同步信息失败: %v", err)
	}

	// Log successful sync
	s.logSyncOperation(taskID, string(SyncDirectionTaskToCalendar), "update", "success", eventID, "", item.Payload)

	log.Printf("任务 %d 同步到Google日历成功，事件ID: %s", taskID, eventID)
	return nil
}

// executeCalendarToTaskSync executes calendar to task synchronization
func (s *CalendarSyncService) executeCalendarToTaskSync(ctx context.Context, item *SyncQueueItem) error {
	eventID := item.Payload["google_event_id"].(string)
	userID := int(item.Payload["user_id"].(float64))

	// Get Google Calendar event
	event, err := s.getGoogleCalendarEvent(ctx, userID, eventID)
	if err != nil {
		return fmt.Errorf("获取Google日历事件失败: %v", err)
	}

	// Find corresponding task
	taskID, err := s.findTaskByGoogleEventID(eventID)
	if err != nil {
		return fmt.Errorf("找不到对应任务: %v", err)
	}

	// Update task based on calendar event
	if err := s.updateTaskFromCalendarEvent(taskID, event); err != nil {
		s.logSyncOperation(taskID, string(SyncDirectionCalendarToTask), "update", "failed", eventID, err.Error(), item.Payload)
		return fmt.Errorf("更新任务失败: %v", err)
	}

	// Log successful sync
	s.logSyncOperation(taskID, string(SyncDirectionCalendarToTask), "update", "success", eventID, "", item.Payload)

	log.Printf("Google日历事件 %s 同步到任务 %d 成功", eventID, taskID)
	return nil
}

// createGoogleCalendarEvent creates a new Google Calendar event
func (s *CalendarSyncService) createGoogleCalendarEvent(ctx context.Context, userID int, taskData *TaskSyncData) (string, error) {
	// Convert task to GoogleCalendarEvent format
	event := &GoogleCalendarEvent{
		Summary:     taskData.Title,
		Description: taskData.Description,
	}

	// Set event time based on due date
	if taskData.DueDate != nil {
		event.StartTime = *taskData.DueDate
		event.EndTime = taskData.DueDate.Add(time.Hour) // 1 hour duration
		event.IsAllDay = false
	}

	// Set status and visibility
	event.Status = "confirmed"
	event.Visibility = "default"

	// Get user's Google access token
	accessToken, err := s.getUserAccessToken(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("获取用户访问令牌失败: %v", err)
	}
	
	// Create event via Google Calendar service
	createdEvent, err := s.googleCalendarService.CreateEvent(ctx, accessToken, "primary", event)
	if err != nil {
		return "", err
	}

	return createdEvent.ID, nil
}

// updateGoogleCalendarEvent updates an existing Google Calendar event
func (s *CalendarSyncService) updateGoogleCalendarEvent(ctx context.Context, userID int, taskData *TaskSyncData) (string, error) {
	// Convert task to GoogleCalendarEvent format
	event := &GoogleCalendarEvent{
		Summary:     taskData.Title,
		Description: taskData.Description,
	}

	// Set event time based on due date
	if taskData.DueDate != nil {
		event.StartTime = *taskData.DueDate
		event.EndTime = taskData.DueDate.Add(time.Hour)
		event.IsAllDay = false
	}

	// Set status and visibility
	event.Status = "confirmed"
	event.Visibility = "default"

	// Get user's Google access token
	accessToken, err := s.getUserAccessToken(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("获取用户访问令牌失败: %v", err)
	}

	updatedEvent, err := s.googleCalendarService.UpdateEvent(ctx, accessToken, "primary", taskData.GoogleCalendarEventID, event)
	if err != nil {
		return "", err
	}

	return updatedEvent.ID, nil
}

// Helper methods for database operations

func (s *CalendarSyncService) addToSyncQueue(operationType string, taskID int, priority int, payload map[string]interface{}) error {
	return s.calendarSyncRepo.AddToSyncQueue(operationType, taskID, priority, payload)
}

func (s *CalendarSyncService) getPendingSyncItems(limit int) ([]*SyncQueueItem, error) {
	repoItems, err := s.calendarSyncRepo.GetPendingSyncItems(limit)
	if err != nil {
		return nil, err
	}
	
	// Convert repository types to service types
	var items []*SyncQueueItem
	for _, repoItem := range repoItems {
		item := &SyncQueueItem{
			ID:            repoItem.ID,
			TaskID:        repoItem.TaskID,
			OperationType: repoItem.OperationType,
			Priority:      repoItem.Priority,
			Payload:       repoItem.Payload,
			RetryCount:    repoItem.RetryCount,
			MaxRetries:    repoItem.MaxRetries,
			Status:        repoItem.Status,
			CreatedAt:     repoItem.CreatedAt,
			ScheduledAt:   repoItem.ScheduledAt,
		}
		
		if repoItem.ErrorMessage.Valid {
			item.ErrorMessage = repoItem.ErrorMessage.String
		}
		if repoItem.StartedAt.Valid {
			item.StartedAt = &repoItem.StartedAt.Time
		}
		if repoItem.CompletedAt.Valid {
			item.CompletedAt = &repoItem.CompletedAt.Time
		}
		
		items = append(items, item)
	}
	
	return items, nil
}

func (s *CalendarSyncService) markSyncItemProcessing(itemID int) error {
	return s.calendarSyncRepo.UpdateSyncItemStatus(itemID, "processing", nil)
}

func (s *CalendarSyncService) markSyncItemCompleted(itemID int) error {
	return s.calendarSyncRepo.UpdateSyncItemStatus(itemID, "completed", nil)
}

func (s *CalendarSyncService) markSyncItemFailed(itemID int, errorMsg string) error {
	return s.calendarSyncRepo.UpdateSyncItemStatus(itemID, "failed", &errorMsg)
}

func (s *CalendarSyncService) getTaskSyncData(taskID int) (*TaskSyncData, error) {
	taskInfo, err := s.calendarSyncRepo.GetTaskSyncInfo(taskID)
	if err != nil {
		return nil, err
	}
	
	// Convert repository type to service type
	syncData := &TaskSyncData{
		ID:                   taskInfo.ID,
		Title:                taskInfo.Title,
		Status:               taskInfo.Status,
		SyncToCalendar:       taskInfo.SyncToCalendar,
		CalendarSyncStatus:   CalendarSyncStatus(taskInfo.CalendarSyncStatus),
		SyncDirection:        SyncDirection(taskInfo.SyncDirection),
		CalendarReminderMins: taskInfo.CalendarReminderMins,
		ProjectID:            taskInfo.ProjectID,
		UserID:               taskInfo.UserID,
	}
	
	if taskInfo.Description.Valid {
		syncData.Description = taskInfo.Description.String
	}
	if taskInfo.DueDate.Valid {
		syncData.DueDate = &taskInfo.DueDate.Time
	}
	if taskInfo.Priority.Valid {
		syncData.Priority = taskInfo.Priority.String
	}
	if taskInfo.LastCalendarSync.Valid {
		syncData.LastCalendarSync = &taskInfo.LastCalendarSync.Time
	}
	if taskInfo.CalendarEventURL.Valid {
		syncData.CalendarEventURL = taskInfo.CalendarEventURL.String
	}
	if taskInfo.GoogleCalendarEventID.Valid {
		syncData.GoogleCalendarEventID = taskInfo.GoogleCalendarEventID.String
	}
	
	return syncData, nil
}

func (s *CalendarSyncService) updateTaskSyncStatus(taskID int, status CalendarSyncStatus) error {
	return s.calendarSyncRepo.UpdateTaskSyncStatus(taskID, string(status))
}

func (s *CalendarSyncService) updateTaskAfterSync(taskID int, eventID string, status CalendarSyncStatus) error {
	return s.calendarSyncRepo.UpdateTaskAfterSync(taskID, eventID, string(status))
}

func (s *CalendarSyncService) logSyncOperation(taskID int, direction, operation, status, eventID, errorMsg string, syncData map[string]interface{}) error {
	return s.calendarSyncRepo.LogSyncOperation(taskID, direction, operation, status, eventID, errorMsg, syncData)
}

func (s *CalendarSyncService) findTaskByGoogleEventID(eventID string) (int, error) {
	return s.calendarSyncRepo.FindTaskByGoogleEventID(eventID)
}

func (s *CalendarSyncService) getGoogleCalendarEvent(ctx context.Context, userID int, eventID string) (*GoogleCalendarEvent, error) {
	// Get user's Google access token
	accessToken, err := s.getUserAccessToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("获取用户访问令牌失败: %v", err)
	}
	
	return s.googleCalendarService.GetEvent(ctx, accessToken, "primary", eventID)
}

func (s *CalendarSyncService) updateTaskFromCalendarEvent(taskID int, event *GoogleCalendarEvent) error {
	log.Printf("从日历事件更新任务 %d: %s", taskID, event.Summary)
	
	// Get current task data
	taskData, err := s.getTaskSyncData(taskID)
	if err != nil {
		return fmt.Errorf("获取任务数据失败: %v", err)
	}
	
	// Prepare update fields based on calendar event changes
	updateFields := make(map[string]interface{})
	
	// Update title if different
	if event.Summary != "" && event.Summary != taskData.Title {
		updateFields["title"] = event.Summary
		log.Printf("更新任务标题: %s -> %s", taskData.Title, event.Summary)
	}
	
	// Update description if different
	if event.Description != "" && event.Description != taskData.Description {
		updateFields["description"] = event.Description
		log.Printf("更新任务描述")
	}
	
	// Update due date based on event start time
	if !event.StartTime.IsZero() {
		newDueDate := event.StartTime
		if taskData.DueDate == nil || !taskData.DueDate.Equal(newDueDate) {
			updateFields["due_date"] = newDueDate
			log.Printf("更新任务截止时间: %v", newDueDate)
		}
	}
	
	// Update task status based on event status
	if event.Status != "" {
		var newStatus string
		switch event.Status {
		case "confirmed":
			if taskData.Status == "completed" {
				// Keep completed status
				newStatus = "completed"
			} else {
				newStatus = "in_progress"
			}
		case "cancelled":
			newStatus = "cancelled"
		case "tentative":
			newStatus = "todo"
		default:
			newStatus = taskData.Status // Keep current status
		}
		
		if newStatus != taskData.Status {
			updateFields["status"] = newStatus
			log.Printf("更新任务状态: %s -> %s", taskData.Status, newStatus)
		}
	}
	
	// Only update if there are changes
	if len(updateFields) == 0 {
		log.Printf("任务 %d 无需更新", taskID)
		return nil
	}
	
	// Update last calendar sync timestamp
	updateFields["last_calendar_sync"] = time.Now()
	
	// Perform the database update
	err = s.calendarSyncRepo.UpdateTaskFromCalendarSync(taskID, updateFields)
	if err != nil {
		return fmt.Errorf("更新任务失败: %v", err)
	}
	
	log.Printf("任务 %d 已根据日历事件成功更新", taskID)
	return nil
}

// EnableTaskCalendarSync enables calendar sync for a task
func (s *CalendarSyncService) EnableTaskCalendarSync(ctx context.Context, taskID int, userID int, syncDirection SyncDirection, reminderMins int) error {
	// Update task sync settings
	if err := s.updateTaskSyncSettings(taskID, true, syncDirection, reminderMins); err != nil {
		return fmt.Errorf("更新任务同步设置失败: %v", err)
	}

	// Trigger initial sync
	return s.SyncTaskToCalendar(ctx, taskID, userID)
}

// DisableTaskCalendarSync disables calendar sync for a task
func (s *CalendarSyncService) DisableTaskCalendarSync(ctx context.Context, taskID int, deleteCalendarEvent bool) error {
	taskData, err := s.getTaskSyncData(taskID)
	if err != nil {
		return fmt.Errorf("获取任务数据失败: %v", err)
	}

	// Delete calendar event if requested
	if deleteCalendarEvent && taskData.GoogleCalendarEventID != "" {
		// This would delete the event from Google Calendar
		log.Printf("删除Google日历事件: %s", taskData.GoogleCalendarEventID)
	}

	// Update task sync settings
	return s.updateTaskSyncSettings(taskID, false, SyncDirectionBidirectional, 0)
}

func (s *CalendarSyncService) updateTaskSyncSettings(taskID int, syncEnabled bool, direction SyncDirection, reminderMins int) error {
	return s.calendarSyncRepo.UpdateTaskSyncSettings(taskID, syncEnabled, string(direction), reminderMins)
}

// getUserAccessToken retrieves and decrypts user's Google access token
func (s *CalendarSyncService) getUserAccessToken(ctx context.Context, userID int) (string, error) {
	token, err := s.googleAuthRepo.GetGoogleToken(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("failed to get google token: %v", err)
	}
	
	// The GoogleAuthRepository.GetGoogleToken method already decrypts the token
	// and populates the AccessToken field, so we can directly return it
	return token.AccessToken, nil
}