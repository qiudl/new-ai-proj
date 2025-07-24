package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// CustomFields represents JSONB custom fields
type CustomFields map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (cf CustomFields) Value() (driver.Value, error) {
	if cf == nil {
		return nil, nil
	}
	return json.Marshal(cf)
}

// Scan implements the sql.Scanner interface for database retrieval
func (cf *CustomFields) Scan(value interface{}) error {
	if value == nil {
		*cf = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into CustomFields", value)
	}

	return json.Unmarshal(bytes, cf)
}

// Task represents a task in the system
type Task struct {
	ID                int          `json:"id" db:"id"`
	ProjectID         int          `json:"project_id" db:"project_id" validate:"required"`
	Title             string       `json:"title" db:"title" validate:"required,min=1,max=255"`
	Description       string       `json:"description" db:"description"`
	Status            string       `json:"status" db:"status" validate:"required,oneof=todo in_progress completed cancelled"`
	AssigneeID        *int         `json:"assignee_id" db:"assignee_id"`
	DueDate           *time.Time   `json:"due_date" db:"due_date"`
	CustomFields      CustomFields `json:"custom_fields" db:"custom_fields"`
	ParentID          *int         `json:"parent_id" db:"parent_id"`
	TaskLevel         int          `json:"task_level" db:"task_level"`
	SortOrder         int          `json:"sort_order" db:"sort_order"`
	TotalTimeSeconds  int          `json:"total_time_seconds" db:"total_time_seconds"`
	CreatedAt         time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt         *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
}

// TaskRequest represents a task creation/update request
type TaskRequest struct {
	Title        string       `json:"title" validate:"required,min=1,max=255"`
	Description  string       `json:"description"`
	Status       string       `json:"status" validate:"required,oneof=todo in_progress completed cancelled"`
	AssigneeID   *int         `json:"assignee_id"`
	DueDate      *time.Time   `json:"due_date"`
	CustomFields CustomFields `json:"custom_fields"`
	ParentID     *int         `json:"parent_id"`
	SortOrder    int          `json:"sort_order"`
	Priority       string       `json:"priority" db:"priority" validate:"oneof=low medium high"` 
	EstimatedHours *float64     `json:"estimated_hours" db:"estimated_hours" validate:"min=0"` 
	ActualHours    *float64     `json:"actual_hours" db:"actual_hours" validate:"min=0"` 
	Progress       *int         `json:"progress" db:"progress" validate:"min=0,max=100"` 
	Tags           []string     `json:"tags" db:"tags"` 
	Metadata       CustomFields `json:"metadata" db:"metadata"`
}

// TaskResponse represents a task response with additional info
type TaskResponse struct {
	ID             int          `json:"id"`
	ProjectID      int          `json:"project_id"`
	ProjectName    string       `json:"project_name,omitempty"`
	Title          string       `json:"title"`
	Description    string       `json:"description"`
	Status         string       `json:"status"`
	AssigneeID     *int         `json:"assignee_id"`
	AssigneeName   string       `json:"assignee_name,omitempty"`
	DueDate        *time.Time   `json:"due_date"`
	CustomFields   CustomFields `json:"custom_fields"`
	ParentID       *int         `json:"parent_id"`
	TaskLevel      int          `json:"task_level"`
	SortOrder      int          `json:"sort_order"`
	ParentTitle    string       `json:"parent_title,omitempty"`
	ChildrenCount  int          `json:"children_count"`
	Depth          int          `json:"depth"`
	HasChildren    bool         `json:"has_children"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

// BulkImportRequest represents a bulk task import request
type BulkImportRequest struct {
	Tasks []TaskRequest `json:"tasks" validate:"required,min=1,max=1000,dive"`
}

// BulkImportResponse represents a bulk import response
type BulkImportResponse struct {
	TotalTasks    int   `json:"total_tasks"`
	SuccessCount  int   `json:"success_count"`
	FailureCount  int   `json:"failure_count"`
	FailedTasks   []int `json:"failed_tasks,omitempty"`
	ImportedTasks []int `json:"imported_tasks"`
}

// TaskFilter represents task filtering options
type TaskFilter struct {
	Status     string `form:"status"`
	AssigneeID *int   `form:"assignee_id"`
	DueAfter   string `form:"due_after"`
	DueBefore  string `form:"due_before"`
	Search     string `form:"search"`
}


// TaskUpdate represents a task update history record
type TaskUpdate struct {
	ID          int       `json:"id" db:"id"`
	TaskID      int       `json:"task_id" db:"task_id"`
	UpdateType  string    `json:"update_type" db:"update_type"`
	OldValue    *string   `json:"old_value" db:"old_value"`
	NewValue    *string   `json:"new_value" db:"new_value"`
	UpdatedBy   *int      `json:"updated_by" db:"updated_by"`
	Notes       *string   `json:"notes" db:"notes"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedByUsername *string `json:"updated_by_username,omitempty" db:"updated_by_username"`
}

// TimelineEvent represents a task timeline event
type TimelineEvent struct {
	ID          int             `json:"id" db:"id"`
	TaskID      int             `json:"task_id" db:"task_id"`
	EventType   string          `json:"event_type" db:"event_type"`
	EventDate   time.Time       `json:"event_date" db:"event_date"`
	Description string          `json:"description" db:"description"`
	UserID      *int            `json:"user_id" db:"user_id"`
	Metadata    CustomFields    `json:"metadata" db:"metadata"`
	Username    *string         `json:"username,omitempty" db:"username"`
	TaskTitle   string          `json:"task_title,omitempty" db:"task_title"`
}

// HierarchicalTask represents a task with its children
type HierarchicalTask struct {
	*Task
	Children []*HierarchicalTask `json:"children,omitempty"`
}

// RecycledTask represents a deleted task in the recycle bin
type RecycledTask struct {
	ID               int          `json:"id" db:"id"`
	ProjectID        int          `json:"project_id" db:"project_id"`
	Title            string       `json:"title" db:"title"`
	Description      string       `json:"description" db:"description"`
	Status           string       `json:"status" db:"status"`
	AssigneeID       *int         `json:"assignee_id" db:"assignee_id"`
	DueDate          *time.Time   `json:"due_date" db:"due_date"`
	CustomFields     CustomFields `json:"custom_fields" db:"custom_fields"`
	ParentID         *int         `json:"parent_id" db:"parent_id"`
	TaskLevel        int          `json:"task_level" db:"task_level"`
	CreatedAt        time.Time    `json:"created_at" db:"created_at"`
	DeletedAt        time.Time    `json:"deleted_at" db:"deleted_at"`
	ProjectName      string       `json:"project_name" db:"project_name"`
	AssigneeUsername *string      `json:"assignee_username" db:"assignee_username"`
	ParentTaskTitle  *string      `json:"parent_task_title" db:"parent_task_title"`
}

// ToResponse converts Task to TaskResponse
func (t *Task) ToResponse() TaskResponse {
	return TaskResponse{
		ID:           t.ID,
		ProjectID:    t.ProjectID,
		Title:        t.Title,
		Description:  t.Description,
		Status:       t.Status,
		AssigneeID:   t.AssigneeID,
		DueDate:      t.DueDate,
		CustomFields: t.CustomFields,
		ParentID:     t.ParentID,
		TaskLevel:    t.TaskLevel,
		SortOrder:    t.SortOrder,
		Depth:        t.TaskLevel, // 默认使用 TaskLevel 作为 Depth
		HasChildren:  false,       // 默认值，需要在查询时设置
		CreatedAt:    t.CreatedAt,
		UpdatedAt:    t.UpdatedAt,
	}
}

// ToResponseWithRelations converts Task to TaskResponse with additional relation info
func (t *Task) ToResponseWithRelations(projectName, assigneeName, parentTitle string, childrenCount int, depth int) TaskResponse {
	response := t.ToResponse()
	response.ProjectName = projectName
	response.AssigneeName = assigneeName
	response.ParentTitle = parentTitle
	response.ChildrenCount = childrenCount
	response.Depth = depth
	response.HasChildren = childrenCount > 0
	return response
}