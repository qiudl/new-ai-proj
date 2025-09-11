package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// TaskChangeTracker 任务变更跟踪器
type TaskChangeTracker struct {
	db         database.DB
	diffEngine *FieldDiffEngine
	logger     *log.Logger
}

// NewTaskChangeTracker 创建新的任务变更跟踪器
func NewTaskChangeTracker(db database.DB, logger *log.Logger) *TaskChangeTracker {
	return &TaskChangeTracker{
		db:         db,
		diffEngine: NewFieldDiffEngine(),
		logger:     logger,
	}
}

// ChangeContext 变更上下文
type ChangeContext struct {
	UserID        *int64
	Username      string
	UserEmail     string
	IPAddress     string
	UserAgent     string
	SessionID     string
	RequestID     string
	Reason        string
	Source        models.ChangeSource
	BatchID       string
	CorrelationID string
	WorkflowStep  string
	ProjectPhase  string
}

// TrackTaskChange 跟踪任务变更
func (t *TaskChangeTracker) TrackTaskChange(ctx context.Context, oldTask, newTask *models.Task, changeCtx *ChangeContext) error {
	// 计算详细的字段差异
	diff := t.diffEngine.ComputeDetailedDiff(oldTask, newTask)
	
	if diff.ChangeCount == 0 {
		t.logger.Printf("No changes detected for task %d, skipping timeline event creation", getTaskID(newTask))
		return nil
	}
	
	// 生成具体的变更事件
	events := t.generateSpecificEvents(diff, oldTask, newTask, changeCtx)
	
	// 批量记录时间线事件
	return t.batchLogEvents(ctx, events)
}

// TrackTaskCreation 跟踪任务创建
func (t *TaskChangeTracker) TrackTaskCreation(ctx context.Context, task *models.Task, changeCtx *ChangeContext) error {
	event := &models.TaskTimelineEvent{
		TaskID:        int64(task.ID),
		EventType:     models.EventTypeCreated,
		EventDate:     time.Now(),
		Description:   fmt.Sprintf("任务 \"%s\" 被创建", task.Title),
		UserID:        changeCtx.UserID,
		Username:      changeCtx.Username,
		TaskTitle:     task.Title,
		ProjectID:     func() *int64 { val := int64(task.ProjectID); return &val }(),
		CorrelationID: changeCtx.CorrelationID,
		Severity:      models.SeverityInfo,
		Category:      models.CategoryUser,
		Metadata: &models.TaskTimelineEventMetadata{
			ChangeReason: changeCtx.Reason,
			ChangeSource: changeCtx.Source,
			IPAddress:    changeCtx.IPAddress,
			UserAgent:    changeCtx.UserAgent,
			SessionID:    changeCtx.SessionID,
			WorkflowStep: changeCtx.WorkflowStep,
			ProjectPhase: changeCtx.ProjectPhase,
		},
	}
	
	return t.createTimelineEvent(ctx, event)
}

// TrackTaskDeletion 跟踪任务删除
func (t *TaskChangeTracker) TrackTaskDeletion(ctx context.Context, task *models.Task, changeCtx *ChangeContext) error {
	event := &models.TaskTimelineEvent{
		TaskID:        int64(task.ID),
		EventType:     models.EventTypeDeleted,
		EventDate:     time.Now(),
		Description:   fmt.Sprintf("任务 \"%s\" 被删除", task.Title),
		UserID:        changeCtx.UserID,
		Username:      changeCtx.Username,
		TaskTitle:     task.Title,
		ProjectID:     func() *int64 { val := int64(task.ProjectID); return &val }(),
		CorrelationID: changeCtx.CorrelationID,
		Severity:      models.SeverityWarning,
		Category:      models.CategoryUser,
		Metadata: &models.TaskTimelineEventMetadata{
			ChangeReason: changeCtx.Reason,
			ChangeSource: changeCtx.Source,
			IPAddress:    changeCtx.IPAddress,
			UserAgent:    changeCtx.UserAgent,
			SessionID:    changeCtx.SessionID,
			WorkflowStep: changeCtx.WorkflowStep,
			ProjectPhase: changeCtx.ProjectPhase,
		},
	}
	
	return t.createTimelineEvent(ctx, event)
}

// TrackBulkChanges 跟踪批量变更
func (t *TaskChangeTracker) TrackBulkChanges(ctx context.Context, changes []TaskChange, changeCtx *ChangeContext) error {
	if len(changes) == 0 {
		return nil
	}
	
	// 生成批次ID
	batchID := uuid.New().String()
	changeCtx.BatchID = batchID
	
	var events []*models.TaskTimelineEvent
	
	// 为每个变更生成事件
	for _, change := range changes {
		diff := t.diffEngine.ComputeDetailedDiff(change.OldTask, change.NewTask)
		if diff.ChangeCount > 0 {
			changeEvents := t.generateSpecificEvents(diff, change.OldTask, change.NewTask, changeCtx)
			events = append(events, changeEvents...)
		}
	}
	
	// 添加批量操作总结事件
	summaryEvent := &models.TaskTimelineEvent{
		EventType:     models.EventTypeBulkUpdated,
		EventDate:     time.Now(),
		Description:   fmt.Sprintf("批量更新了 %d 个任务", len(changes)),
		UserID:        changeCtx.UserID,
		Username:      changeCtx.Username,
		CorrelationID: changeCtx.CorrelationID,
		Severity:      models.SeverityInfo,
		Category:      models.CategoryUser,
		Metadata: &models.TaskTimelineEventMetadata{
			ChangeReason:   changeCtx.Reason,
			ChangeSource:   changeCtx.Source,
			BatchID:        batchID,
			IPAddress:      changeCtx.IPAddress,
			UserAgent:      changeCtx.UserAgent,
			SessionID:      changeCtx.SessionID,
			WorkflowStep:   changeCtx.WorkflowStep,
			ProjectPhase:   changeCtx.ProjectPhase,
			AffectedTasks:  extractChangedTaskIDs(changes),
			CascadeChanges: true,
		},
	}
	events = append(events, summaryEvent)
	
	return t.batchLogEvents(ctx, events)
}

// TaskChange 任务变更
type TaskChange struct {
	OldTask *models.Task
	NewTask *models.Task
}

// generateSpecificEvents 生成具体的变更事件
func (t *TaskChangeTracker) generateSpecificEvents(diff *TaskDiff, oldTask, newTask *models.Task, changeCtx *ChangeContext) []*models.TaskTimelineEvent {
	var events []*models.TaskTimelineEvent
	
	taskID := getTaskID(newTask)
	projectID := getProjectID(newTask)
	taskTitle := getTaskTitle(newTask)
	
	// 标题变更事件
	if diff.TitleChanged {
		event := &models.TaskTimelineEvent{
			TaskID:        taskID,
			EventType:     models.EventTypeTitleChanged,
			EventDate:     time.Now(),
			Description:   fmt.Sprintf("任务标题从 \"%s\" 变更为 \"%s\"", diff.OldTitle, diff.NewTitle),
			UserID:        changeCtx.UserID,
			Username:      changeCtx.Username,
			TaskTitle:     taskTitle,
			ProjectID:     projectID,
			CorrelationID: changeCtx.CorrelationID,
			Severity:      models.SeverityInfo,
			Category:      models.CategoryUser,
			Metadata: &models.TaskTimelineEventMetadata{
				OldValue:     diff.OldTitle,
				NewValue:     diff.NewTitle,
				ChangeReason: changeCtx.Reason,
				ChangeSource: changeCtx.Source,
				BatchID:      changeCtx.BatchID,
				IPAddress:    changeCtx.IPAddress,
				UserAgent:    changeCtx.UserAgent,
				SessionID:    changeCtx.SessionID,
				WorkflowStep: changeCtx.WorkflowStep,
				ProjectPhase: changeCtx.ProjectPhase,
			},
		}
		events = append(events, event)
	}
	
	// 状态变更事件
	if diff.StatusChanged {
		severity := models.SeverityInfo
		if diff.NewStatus == "completed" {
			severity = models.SeverityInfo
		} else if diff.NewStatus == "cancelled" {
			severity = models.SeverityWarning
		}
		
		event := &models.TaskTimelineEvent{
			TaskID:        taskID,
			EventType:     models.EventTypeStatusChanged,
			EventDate:     time.Now(),
			Description:   fmt.Sprintf("任务状态从 \"%s\" 变更为 \"%s\"", diff.OldStatus, diff.NewStatus),
			UserID:        changeCtx.UserID,
			Username:      changeCtx.Username,
			TaskTitle:     taskTitle,
			ProjectID:     projectID,
			CorrelationID: changeCtx.CorrelationID,
			Severity:      severity,
			Category:      models.CategoryUser,
			Metadata: &models.TaskTimelineEventMetadata{
				OldValue:     diff.OldStatus,
				NewValue:     diff.NewStatus,
				OldStatus:    diff.OldStatus,
				NewStatus:    diff.NewStatus,
				ChangeReason: changeCtx.Reason,
				ChangeSource: changeCtx.Source,
				BatchID:      changeCtx.BatchID,
				IPAddress:    changeCtx.IPAddress,
				UserAgent:    changeCtx.UserAgent,
				SessionID:    changeCtx.SessionID,
				WorkflowStep: changeCtx.WorkflowStep,
				ProjectPhase: changeCtx.ProjectPhase,
			},
		}
		events = append(events, event)
		
		// 特殊状态的特定事件
		if diff.NewStatus == "completed" {
			completedEvent := &models.TaskTimelineEvent{
				TaskID:        taskID,
				EventType:     models.EventTypeCompleted,
				EventDate:     time.Now(),
				Description:   fmt.Sprintf("任务 \"%s\" 已完成", taskTitle),
				UserID:        changeCtx.UserID,
				Username:      changeCtx.Username,
				TaskTitle:     taskTitle,
				ProjectID:     projectID,
				CorrelationID: changeCtx.CorrelationID,
				Severity:      models.SeverityInfo,
				Category:      models.CategoryUser,
				Metadata: &models.TaskTimelineEventMetadata{
					ChangeReason: changeCtx.Reason,
					ChangeSource: changeCtx.Source,
					BatchID:      changeCtx.BatchID,
					IPAddress:    changeCtx.IPAddress,
					UserAgent:    changeCtx.UserAgent,
					SessionID:    changeCtx.SessionID,
					WorkflowStep: changeCtx.WorkflowStep,
					ProjectPhase: changeCtx.ProjectPhase,
				},
			}
			events = append(events, completedEvent)
		}
		
		if diff.NewStatus == "in_progress" && diff.OldStatus != "in_progress" {
			startedEvent := &models.TaskTimelineEvent{
				TaskID:        taskID,
				EventType:     models.EventTypeStarted,
				EventDate:     time.Now(),
				Description:   fmt.Sprintf("开始执行任务 \"%s\"", taskTitle),
				UserID:        changeCtx.UserID,
				Username:      changeCtx.Username,
				TaskTitle:     taskTitle,
				ProjectID:     projectID,
				CorrelationID: changeCtx.CorrelationID,
				Severity:      models.SeverityInfo,
				Category:      models.CategoryUser,
				Metadata: &models.TaskTimelineEventMetadata{
					ChangeReason: changeCtx.Reason,
					ChangeSource: changeCtx.Source,
					BatchID:      changeCtx.BatchID,
					IPAddress:    changeCtx.IPAddress,
					UserAgent:    changeCtx.UserAgent,
					SessionID:    changeCtx.SessionID,
					WorkflowStep: changeCtx.WorkflowStep,
					ProjectPhase: changeCtx.ProjectPhase,
				},
			}
			events = append(events, startedEvent)
		}
	}
	
	// 优先级变更事件
	if diff.PriorityChanged {
		event := &models.TaskTimelineEvent{
			TaskID:        taskID,
			EventType:     models.EventTypePriorityChanged,
			EventDate:     time.Now(),
			Description:   fmt.Sprintf("任务优先级从 \"%s\" 变更为 \"%s\"", diff.OldPriority, diff.NewPriority),
			UserID:        changeCtx.UserID,
			Username:      changeCtx.Username,
			TaskTitle:     taskTitle,
			ProjectID:     projectID,
			CorrelationID: changeCtx.CorrelationID,
			Severity:      models.SeverityInfo,
			Category:      models.CategoryUser,
			Metadata: &models.TaskTimelineEventMetadata{
				OldValue:     diff.OldPriority,
				NewValue:     diff.NewPriority,
				Priority:     diff.NewPriority,
				ChangeReason: changeCtx.Reason,
				ChangeSource: changeCtx.Source,
				BatchID:      changeCtx.BatchID,
				IPAddress:    changeCtx.IPAddress,
				UserAgent:    changeCtx.UserAgent,
				SessionID:    changeCtx.SessionID,
				WorkflowStep: changeCtx.WorkflowStep,
				ProjectPhase: changeCtx.ProjectPhase,
			},
		}
		events = append(events, event)
	}
	
	// 分配人变更事件
	if diff.AssigneeChanged {
		var eventType models.TaskTimelineEventType
		var description string
		
		if diff.OldAssigneeID == nil && diff.NewAssigneeID != nil {
			eventType = models.EventTypeAssigned
			description = fmt.Sprintf("任务分配给了用户 %d", *diff.NewAssigneeID)
		} else if diff.OldAssigneeID != nil && diff.NewAssigneeID == nil {
			eventType = models.EventTypeUnassigned
			description = fmt.Sprintf("取消了任务的分配（原分配给用户 %d）", *diff.OldAssigneeID)
		} else if diff.OldAssigneeID != nil && diff.NewAssigneeID != nil {
			eventType = models.EventTypeReassigned
			description = fmt.Sprintf("任务从用户 %d 重新分配给用户 %d", *diff.OldAssigneeID, *diff.NewAssigneeID)
		}
		
		event := &models.TaskTimelineEvent{
			TaskID:        taskID,
			EventType:     eventType,
			EventDate:     time.Now(),
			Description:   description,
			UserID:        changeCtx.UserID,
			Username:      changeCtx.Username,
			TaskTitle:     taskTitle,
			ProjectID:     projectID,
			CorrelationID: changeCtx.CorrelationID,
			Severity:      models.SeverityInfo,
			Category:      models.CategoryUser,
			Metadata: &models.TaskTimelineEventMetadata{
				OldValue:     diff.OldAssigneeID,
				NewValue:     diff.NewAssigneeID,
				ChangeReason: changeCtx.Reason,
				ChangeSource: changeCtx.Source,
				BatchID:      changeCtx.BatchID,
				IPAddress:    changeCtx.IPAddress,
				UserAgent:    changeCtx.UserAgent,
				SessionID:    changeCtx.SessionID,
				WorkflowStep: changeCtx.WorkflowStep,
				ProjectPhase: changeCtx.ProjectPhase,
			},
		}
		events = append(events, event)
	}
	
	// 截止时间变更事件
	if diff.DueDateChanged {
		var description string
		if diff.OldDueDate == nil && diff.NewDueDate != nil {
			description = fmt.Sprintf("设置任务截止时间为 %s", diff.NewDueDate.Format("2006-01-02"))
		} else if diff.OldDueDate != nil && diff.NewDueDate == nil {
			description = fmt.Sprintf("移除了任务截止时间（原为 %s）", diff.OldDueDate.Format("2006-01-02"))
		} else if diff.OldDueDate != nil && diff.NewDueDate != nil {
			description = fmt.Sprintf("任务截止时间从 %s 变更为 %s", diff.OldDueDate.Format("2006-01-02"), diff.NewDueDate.Format("2006-01-02"))
		}
		
		event := &models.TaskTimelineEvent{
			TaskID:        taskID,
			EventType:     models.EventTypeDeadlineChanged,
			EventDate:     time.Now(),
			Description:   description,
			UserID:        changeCtx.UserID,
			Username:      changeCtx.Username,
			TaskTitle:     taskTitle,
			ProjectID:     projectID,
			CorrelationID: changeCtx.CorrelationID,
			Severity:      models.SeverityInfo,
			Category:      models.CategoryUser,
			Metadata: &models.TaskTimelineEventMetadata{
				OldValue:     diff.OldDueDate,
				NewValue:     diff.NewDueDate,
				ChangeReason: changeCtx.Reason,
				ChangeSource: changeCtx.Source,
				BatchID:      changeCtx.BatchID,
				IPAddress:    changeCtx.IPAddress,
				UserAgent:    changeCtx.UserAgent,
				SessionID:    changeCtx.SessionID,
				WorkflowStep: changeCtx.WorkflowStep,
				ProjectPhase: changeCtx.ProjectPhase,
			},
		}
		events = append(events, event)
	}
	
	// 描述变更事件
	if diff.DescriptionChanged {
		event := &models.TaskTimelineEvent{
			TaskID:        taskID,
			EventType:     models.EventTypeDescriptionUpdated,
			EventDate:     time.Now(),
			Description:   "任务描述已更新",
			UserID:        changeCtx.UserID,
			Username:      changeCtx.Username,
			TaskTitle:     taskTitle,
			ProjectID:     projectID,
			CorrelationID: changeCtx.CorrelationID,
			Severity:      models.SeverityInfo,
			Category:      models.CategoryUser,
			Metadata: &models.TaskTimelineEventMetadata{
				OldValue:     diff.OldDescription,
				NewValue:     diff.NewDescription,
				ChangeReason: changeCtx.Reason,
				ChangeSource: changeCtx.Source,
				BatchID:      changeCtx.BatchID,
				IPAddress:    changeCtx.IPAddress,
				UserAgent:    changeCtx.UserAgent,
				SessionID:    changeCtx.SessionID,
				WorkflowStep: changeCtx.WorkflowStep,
				ProjectPhase: changeCtx.ProjectPhase,
			},
		}
		events = append(events, event)
	}
	
	// 如果有多个变更，添加一个通用的更新事件
	if diff.ChangeCount > 1 {
		event := &models.TaskTimelineEvent{
			TaskID:        taskID,
			EventType:     models.EventTypeUpdated,
			EventDate:     time.Now(),
			Description:   t.diffEngine.GetChangeDescription(diff),
			UserID:        changeCtx.UserID,
			Username:      changeCtx.Username,
			TaskTitle:     taskTitle,
			ProjectID:     projectID,
			CorrelationID: changeCtx.CorrelationID,
			Severity:      models.SeverityInfo,
			Category:      models.CategoryUser,
			Metadata: &models.TaskTimelineEventMetadata{
				ChangedFields: diff.ChangedFields,
				ChangeReason:  changeCtx.Reason,
				ChangeSource:  changeCtx.Source,
				BatchID:       changeCtx.BatchID,
				IPAddress:     changeCtx.IPAddress,
				UserAgent:     changeCtx.UserAgent,
				SessionID:     changeCtx.SessionID,
				WorkflowStep:  changeCtx.WorkflowStep,
				ProjectPhase:  changeCtx.ProjectPhase,
			},
		}
		events = append(events, event)
	}
	
	return events
}

// batchLogEvents 批量记录时间线事件
func (t *TaskChangeTracker) batchLogEvents(ctx context.Context, events []*models.TaskTimelineEvent) error {
	if len(events) == 0 {
		return nil
	}
	
	// 批量插入时间线事件
	timelineRepo := t.db.TimelineEvents()
	return timelineRepo.CreateEvents(ctx, events)
}

// createTimelineEvent 创建时间线事件
func (t *TaskChangeTracker) createTimelineEvent(ctx context.Context, event *models.TaskTimelineEvent) error {
	t.logger.Printf("Creating timeline event: TaskID=%d, Type=%s, Description=%s",
		event.TaskID, event.EventType, event.Description)
	
	// 获取时间线事件仓库
	timelineRepo := t.db.TimelineEvents()
	if timelineRepo == nil {
		// 如果没有时间线仓库，暂时记录日志
		t.logger.Printf("Timeline events repository not available, event logged: %+v", event)
		return nil
	}
	
	return timelineRepo.CreateEvent(ctx, event)
}

// Helper functions

func getTaskID(task *models.Task) int64 {
	if task == nil {
		return 0
	}
	return int64(task.ID)
}

func getProjectID(task *models.Task) *int64 {
	if task == nil {
		return nil
	}
	val := int64(task.ProjectID)
	return &val
}

func getTaskTitle(task *models.Task) string {
	if task == nil {
		return ""
	}
	return task.Title
}

func extractChangedTaskIDs(changes []TaskChange) []int {
	var ids []int
	for _, change := range changes {
		if change.NewTask != nil {
			ids = append(ids, int(change.NewTask.ID))
		} else if change.OldTask != nil {
			ids = append(ids, int(change.OldTask.ID))
		}
	}
	return ids
}