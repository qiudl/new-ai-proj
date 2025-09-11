package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// TaskTimelineEventType 任务时间线事件类型
type TaskTimelineEventType string

const (
	// 基础操作
	EventTypeCreated  TaskTimelineEventType = "created"
	EventTypeUpdated  TaskTimelineEventType = "updated"
	EventTypeDeleted  TaskTimelineEventType = "deleted"
	EventTypeRestored TaskTimelineEventType = "restored"

	// 状态变更
	EventTypeStatusChanged TaskTimelineEventType = "status_changed"
	EventTypeCompleted     TaskTimelineEventType = "completed"
	EventTypeStarted       TaskTimelineEventType = "started"
	EventTypePaused        TaskTimelineEventType = "paused"
	EventTypeCancelled     TaskTimelineEventType = "cancelled"

	// 分配和权限
	EventTypeAssigned          TaskTimelineEventType = "assigned"
	EventTypeUnassigned        TaskTimelineEventType = "unassigned"
	EventTypeReassigned        TaskTimelineEventType = "reassigned"
	EventTypePermissionChanged TaskTimelineEventType = "permission_changed"

	// 时间管理
	EventTypeDeadlineChanged  TaskTimelineEventType = "deadline_changed"
	EventTypeDueDateExtended  TaskTimelineEventType = "due_date_extended"
	EventTypeScheduleUpdated  TaskTimelineEventType = "schedule_updated"
	EventTypeTimeLogged       TaskTimelineEventType = "time_logged"
	EventTypeEstimateUpdated  TaskTimelineEventType = "estimate_updated"

	// 内容变更
	EventTypeTitleChanged       TaskTimelineEventType = "title_changed"
	EventTypeDescriptionUpdated TaskTimelineEventType = "description_updated"
	EventTypePriorityChanged    TaskTimelineEventType = "priority_changed"
	EventTypeTagsUpdated        TaskTimelineEventType = "tags_updated"
	EventTypeAttachmentAdded    TaskTimelineEventType = "attachment_added"
	EventTypeAttachmentRemoved  TaskTimelineEventType = "attachment_removed"

	// 关系变更
	EventTypeDependencyAdded   TaskTimelineEventType = "dependency_added"
	EventTypeDependencyRemoved TaskTimelineEventType = "dependency_removed"
	EventTypeParentChanged     TaskTimelineEventType = "parent_changed"
	EventTypeChildAdded        TaskTimelineEventType = "child_added"
	EventTypeChildRemoved      TaskTimelineEventType = "child_removed"

	// 协作和沟通
	EventTypeCommentAdded    TaskTimelineEventType = "comment_added"
	EventTypeCommentUpdated  TaskTimelineEventType = "comment_updated"
	EventTypeCommentDeleted  TaskTimelineEventType = "comment_deleted"
	EventTypeMentionAdded    TaskTimelineEventType = "mention_added"
	EventTypeReviewRequested TaskTimelineEventType = "review_requested"
	EventTypeApprovalGiven   TaskTimelineEventType = "approval_given"

	// 系统操作
	EventTypeBulkUpdated        TaskTimelineEventType = "bulk_updated"
	EventTypeImported           TaskTimelineEventType = "imported"
	EventTypeExported           TaskTimelineEventType = "exported"
	EventTypeArchived           TaskTimelineEventType = "archived"
	EventTypeTemplateApplied    TaskTimelineEventType = "template_applied"
	EventTypeAutomationTriggered TaskTimelineEventType = "automation_triggered"
)

// ChangeSource 变更来源
type ChangeSource string

const (
	ChangeSourceManual      ChangeSource = "manual"
	ChangeSourceAPI         ChangeSource = "api"
	ChangeSourceBulk        ChangeSource = "bulk"
	ChangeSourceAutomation  ChangeSource = "automation"
	ChangeSourceIntegration ChangeSource = "integration"
)

// EventSeverity 事件严重性
type EventSeverity string

const (
	SeverityInfo     EventSeverity = "info"
	SeverityWarning  EventSeverity = "warning"
	SeverityError    EventSeverity = "error"
	SeverityCritical EventSeverity = "critical"
)

// EventCategory 事件分类
type EventCategory string

const (
	CategorySystem      EventCategory = "system"
	CategoryUser        EventCategory = "user"
	CategoryAutomation  EventCategory = "automation"
	CategoryIntegration EventCategory = "integration"
)

// TaskTimelineEventMetadata 任务时间线事件元数据
type TaskTimelineEventMetadata struct {
	// 变更内容
	OldValue      interface{} `json:"old_value,omitempty"`
	NewValue      interface{} `json:"new_value,omitempty"`
	ChangedFields []string    `json:"changed_fields,omitempty"`

	// 变更上下文
	ChangeReason string       `json:"change_reason,omitempty"`
	ChangeSource ChangeSource `json:"change_source,omitempty"`
	BatchID      string       `json:"batch_id,omitempty"`

	// 用户上下文
	IPAddress string `json:"ip_address,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
	SessionID string `json:"session_id,omitempty"`

	// 业务上下文
	ProjectPhase   string        `json:"project_phase,omitempty"`
	WorkflowStep   string        `json:"workflow_step,omitempty"`
	ApprovalChain  []interface{} `json:"approval_chain,omitempty"`

	// 影响范围
	AffectedTasks  []int `json:"affected_tasks,omitempty"`
	CascadeChanges bool  `json:"cascade_changes,omitempty"`

	// 时间相关
	DurationMs  int64  `json:"duration_ms,omitempty"`
	ScheduledAt string `json:"scheduled_at,omitempty"`

	// 优先级和状态信息
	Priority  string `json:"priority,omitempty"`
	NewStatus string `json:"new_status,omitempty"`
	OldStatus string `json:"old_status,omitempty"`

	// 额外信息
	CustomData map[string]interface{} `json:"custom_data,omitempty"`
}

// Value implements the driver.Valuer interface for database storage
func (m TaskTimelineEventMetadata) Value() (driver.Value, error) {
	return json.Marshal(m)
}

// Scan implements the sql.Scanner interface for database retrieval
func (m *TaskTimelineEventMetadata) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into TaskTimelineEventMetadata", value)
	}

	return json.Unmarshal(bytes, m)
}

// TaskTimelineEvent 任务时间线事件
type TaskTimelineEvent struct {
	ID            int64                      `json:"id" gorm:"primaryKey;autoIncrement"`
	TaskID        int64                      `json:"task_id" gorm:"not null;index"`
	EventType     TaskTimelineEventType      `json:"event_type" gorm:"not null;size:50;index"`
	EventDate     time.Time                  `json:"event_date" gorm:"not null;index"`
	Description   string                     `json:"description" gorm:"type:text"`
	UserID        *int64                     `json:"user_id,omitempty" gorm:"index"`
	Metadata      *TaskTimelineEventMetadata `json:"metadata,omitempty" gorm:"type:jsonb"`
	Username      string                     `json:"username,omitempty" gorm:"size:100"`
	TaskTitle     string                     `json:"task_title,omitempty" gorm:"size:500"`
	
	// 新增字段
	ProjectID      *int64        `json:"project_id,omitempty" gorm:"index"`
	CorrelationID  string        `json:"correlation_id,omitempty" gorm:"size:100;index"`
	ParentEventID  *int64        `json:"parent_event_id,omitempty" gorm:"index"`
	Severity       EventSeverity `json:"severity" gorm:"size:20;default:'info'"`
	Category       EventCategory `json:"category" gorm:"size:20;default:'user'"`
	
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName returns the table name for TaskTimelineEvent
func (TaskTimelineEvent) TableName() string {
	return "task_timeline_events"
}

// IsValidEventType 检查事件类型是否有效
func IsValidEventType(eventType string) bool {
	validTypes := []TaskTimelineEventType{
		EventTypeCreated, EventTypeUpdated, EventTypeDeleted, EventTypeRestored,
		EventTypeStatusChanged, EventTypeCompleted, EventTypeStarted, EventTypePaused, EventTypeCancelled,
		EventTypeAssigned, EventTypeUnassigned, EventTypeReassigned, EventTypePermissionChanged,
		EventTypeDeadlineChanged, EventTypeDueDateExtended, EventTypeScheduleUpdated, EventTypeTimeLogged, EventTypeEstimateUpdated,
		EventTypeTitleChanged, EventTypeDescriptionUpdated, EventTypePriorityChanged, EventTypeTagsUpdated, 
		EventTypeAttachmentAdded, EventTypeAttachmentRemoved,
		EventTypeDependencyAdded, EventTypeDependencyRemoved, EventTypeParentChanged, EventTypeChildAdded, EventTypeChildRemoved,
		EventTypeCommentAdded, EventTypeCommentUpdated, EventTypeCommentDeleted, EventTypeMentionAdded, 
		EventTypeReviewRequested, EventTypeApprovalGiven,
		EventTypeBulkUpdated, EventTypeImported, EventTypeExported, EventTypeArchived, 
		EventTypeTemplateApplied, EventTypeAutomationTriggered,
	}

	for _, validType := range validTypes {
		if TaskTimelineEventType(eventType) == validType {
			return true
		}
	}
	return false
}

// GetEventTypeDescription 获取事件类型的中文描述
func GetEventTypeDescription(eventType TaskTimelineEventType) string {
	descriptions := map[TaskTimelineEventType]string{
		EventTypeCreated:  "创建",
		EventTypeUpdated:  "更新",
		EventTypeDeleted:  "删除",
		EventTypeRestored: "恢复",

		EventTypeStatusChanged: "状态变更",
		EventTypeCompleted:     "完成",
		EventTypeStarted:       "开始",
		EventTypePaused:        "暂停",
		EventTypeCancelled:     "取消",

		EventTypeAssigned:          "分配任务",
		EventTypeUnassigned:        "取消分配",
		EventTypeReassigned:        "重新分配",
		EventTypePermissionChanged: "权限变更",

		EventTypeDeadlineChanged:  "截止时间变更",
		EventTypeDueDateExtended:  "截止时间延期",
		EventTypeScheduleUpdated:  "计划更新",
		EventTypeTimeLogged:       "记录工时",
		EventTypeEstimateUpdated:  "预估时间更新",

		EventTypeTitleChanged:       "标题变更",
		EventTypeDescriptionUpdated: "描述更新",
		EventTypePriorityChanged:    "优先级变更",
		EventTypeTagsUpdated:        "标签更新",
		EventTypeAttachmentAdded:    "添加附件",
		EventTypeAttachmentRemoved:  "移除附件",

		EventTypeDependencyAdded:   "添加依赖",
		EventTypeDependencyRemoved: "移除依赖",
		EventTypeParentChanged:     "父任务变更",
		EventTypeChildAdded:        "添加子任务",
		EventTypeChildRemoved:      "移除子任务",

		EventTypeCommentAdded:    "添加评论",
		EventTypeCommentUpdated:  "更新评论",
		EventTypeCommentDeleted:  "删除评论",
		EventTypeMentionAdded:    "添加提及",
		EventTypeReviewRequested: "请求审核",
		EventTypeApprovalGiven:   "给予批准",

		EventTypeBulkUpdated:        "批量更新",
		EventTypeImported:           "导入",
		EventTypeExported:           "导出",
		EventTypeArchived:           "归档",
		EventTypeTemplateApplied:    "应用模板",
		EventTypeAutomationTriggered: "触发自动化",
	}

	if desc, exists := descriptions[eventType]; exists {
		return desc
	}
	return string(eventType)
}

// TimelineEventFilter 时间线事件过滤器
type TimelineEventFilter struct {
	TaskID       *int64                  `json:"task_id,omitempty"`
	TaskIDs      []int64                 `json:"task_ids,omitempty"`
	ProjectID    *int64                  `json:"project_id,omitempty"`
	EventTypes   []TaskTimelineEventType `json:"event_types,omitempty"`
	UserIDs      []int64                 `json:"user_ids,omitempty"`
	Categories   []EventCategory         `json:"categories,omitempty"`
	Severities   []EventSeverity         `json:"severities,omitempty"`
	StartDate    *time.Time              `json:"start_date,omitempty"`
	EndDate      *time.Time              `json:"end_date,omitempty"`
	BatchID      string                  `json:"batch_id,omitempty"`
	IncludeSystem bool                   `json:"include_system"`
	
	// 分页参数
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	
	// 排序参数
	SortBy    string `json:"sort_by"`    // event_date, created_at, severity
	SortOrder string `json:"sort_order"` // asc, desc
}

// TimelineEventGroup 时间线事件分组
type TimelineEventGroup struct {
	ID           string               `json:"id"`
	GroupType    string               `json:"group_type"` // single, batch, session
	TimeRange    TimeRange            `json:"time_range"`
	Events       []*TaskTimelineEvent `json:"events"`
	Summary      string               `json:"summary"`
	AffectedFields []string           `json:"affected_fields"`
	BatchID      string               `json:"batch_id,omitempty"`
	EventCount   int                  `json:"event_count"`
}

// TimeRange 时间范围
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// TimelineStatistics 时间线统计信息
type TimelineStatistics struct {
	TotalEvents            int64                                   `json:"total_events"`
	EventTypesDistribution map[TaskTimelineEventType]int          `json:"event_types_distribution"`
	UserActivity           []UserActivityStat                     `json:"user_activity"`
	DailyActivity          []DailyActivityStat                    `json:"daily_activity"`
	SeverityDistribution   map[EventSeverity]int                  `json:"severity_distribution"`
	CategoryDistribution   map[EventCategory]int                  `json:"category_distribution"`
	MostActiveDays         []string                               `json:"most_active_days"`
	PeakHours              []int                                  `json:"peak_hours"`
}

// UserActivityStat 用户活动统计
type UserActivityStat struct {
	UserID     int64  `json:"user_id"`
	Username   string `json:"username"`
	EventCount int    `json:"event_count"`
}

// DailyActivityStat 每日活动统计
type DailyActivityStat struct {
	Date       string `json:"date"`
	EventCount int    `json:"event_count"`
}