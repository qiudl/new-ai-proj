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
		*cf = CustomFields{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into CustomFields", value)
	}

	// First try to unmarshal as normal map
	var temp map[string]interface{}
	if err := json.Unmarshal(bytes, &temp); err == nil {
		*cf = CustomFields(temp)
		return nil
	}

	// If that fails, try to handle as array (for backward compatibility)
	var arr []interface{}
	if err := json.Unmarshal(bytes, &arr); err == nil {
		// Convert array to map by merging non-nil map elements
		result := make(CustomFields)
		for _, item := range arr {
			if itemMap, ok := item.(map[string]interface{}); ok {
				for k, v := range itemMap {
					if v != nil && k != "" {
						result[k] = v
					}
				}
			}
		}
		*cf = result
		return nil
	}

	// If both fail, try to unmarshal directly to CustomFields
	return json.Unmarshal(bytes, cf)
}

// Dependencies represents a list of task IDs that this task depends on
type Dependencies []int

// Value implements the driver.Valuer interface for database storage
func (d Dependencies) Value() (driver.Value, error) {
	if d == nil {
		return "[]", nil
	}
	return json.Marshal(d)
}

// Scan implements the sql.Scanner interface for database retrieval
func (d *Dependencies) Scan(value interface{}) error {
	if value == nil {
		*d = Dependencies{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into Dependencies", value)
	}

	return json.Unmarshal(bytes, d)
}

// Tags represents a list of tags for task categorization
type Tags []string

// Value implements the driver.Valuer interface for database storage
func (t Tags) Value() (driver.Value, error) {
	if t == nil {
		return "[]", nil
	}
	return json.Marshal(t)
}

// Scan implements the sql.Scanner interface for database retrieval
func (t *Tags) Scan(value interface{}) error {
	if value == nil {
		*t = Tags{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into Tags", value)
	}

	return json.Unmarshal(bytes, t)
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
	// AI-enhanced fields
	Dependencies      Dependencies `json:"dependencies" db:"dependencies"`
	EstimatedHours    *float64     `json:"estimated_hours" db:"estimated_hours"`
	Priority          string       `json:"priority" db:"priority" validate:"oneof=low medium high"`
	Tags              Tags         `json:"tags" db:"tags"`
	CreatedAt         time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt         *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
}

// TaskRequest represents a task creation/update request
type TaskRequest struct {
	Title          string       `json:"title" validate:"required,min=1,max=255"`
	Description    string       `json:"description"`
	Status         string       `json:"status" validate:"required,oneof=todo in_progress completed cancelled"`
	AssigneeID     *int         `json:"assignee_id"`
	DueDate        *time.Time   `json:"due_date"`
	CustomFields   CustomFields `json:"custom_fields"`
	ParentID       *int         `json:"parent_id"`
	SortOrder      int          `json:"sort_order"`
	// AI-enhanced fields
	Dependencies   Dependencies `json:"dependencies"`
	EstimatedHours *float64     `json:"estimated_hours" validate:"min=0"` 
	Priority       string       `json:"priority" validate:"oneof=low medium high"` 
	Tags           Tags         `json:"tags"` 
	// Legacy fields (keeping for backward compatibility)
	ActualHours    *float64     `json:"actual_hours" validate:"min=0"` 
	Progress       *int         `json:"progress" validate:"min=0,max=100"` 
	Metadata       CustomFields `json:"metadata"`
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
	// AI-enhanced fields
	Dependencies   Dependencies `json:"dependencies"`
	EstimatedHours *float64     `json:"estimated_hours"`
	Priority       string       `json:"priority"`
	Tags           Tags         `json:"tags"`
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

// BatchUpdateTasksRequest represents a batch update request for multiple tasks
type BatchUpdateTasksRequest struct {
	TaskIDs   []int   `json:"task_ids" validate:"required,min=1"`
	Status    *string `json:"status,omitempty" validate:"omitempty,oneof=todo in_progress completed cancelled"`
	ParentID  *int    `json:"parent_id,omitempty"`
	UpdatedBy *int    `json:"updated_by,omitempty"`
}

// BatchUpdateTasksResponse represents the response for batch update operation
type BatchUpdateTasksResponse struct {
	UpdatedCount int              `json:"updated_count"`
	FailedTasks  []BatchTaskError `json:"failed_tasks,omitempty"`
	Message      string           `json:"message"`
}

// BatchTaskError represents an error for a specific task during batch operation
type BatchTaskError struct {
	TaskID int    `json:"task_id"`
	Error  string `json:"error"`
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

// TaskDocument 任务文档统一模型
type TaskDocument struct {
	ID           int                  `json:"id" db:"id"`
	TaskID       int                  `json:"task_id" db:"task_id"`
	ProjectID    int                  `json:"project_id" db:"project_id"`
	DocumentID   int                  `json:"document_id" db:"document_id"`
	Title        string               `json:"title" db:"title"`
	Content      *string              `json:"content" db:"content"`
	Type         string               `json:"type" db:"type"`
	Status       string               `json:"status" db:"status"`
	Version      int                  `json:"version" db:"version"`
	Metadata     CustomFields         `json:"metadata" db:"metadata"`
	OwnerID      int                  `json:"owner_id" db:"owner_id"`
	CreatedBy    int                  `json:"created_by" db:"created_by"`
	CreatedAt    time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time            `json:"updated_at" db:"updated_at"`
	
	// 关联字段
	TaskTitle    string               `json:"task_title,omitempty" db:"task_title"`
	ProjectName  string               `json:"project_name,omitempty" db:"project_name"`
	OwnerName    *string              `json:"owner_name,omitempty" db:"owner_name"`
	CreatorName  *string              `json:"creator_name,omitempty" db:"creator_name"`
	DocumentExists bool               `json:"document_exists,omitempty"`
}

// CreateTaskDocumentRequest 创建任务文档请求
type CreateTaskDocumentRequest struct {
	Content     *string              `json:"content"`
	Title       *string              `json:"title"`
	Metadata    CustomFields         `json:"metadata"`
	IsTemplate  bool                 `json:"is_template"`
}

// UpdateTaskDocumentRequest 更新任务文档请求
type UpdateTaskDocumentRequest struct {
	Content     *string              `json:"content"`
	Title       *string              `json:"title"`
	Status      *string              `json:"status"`
	Metadata    *CustomFields        `json:"metadata"`
}

// TaskDocumentResponse 任务文档响应
type TaskDocumentResponse struct {
	TaskDocument
	CanEdit      bool                 `json:"can_edit"`
	CanDelete    bool                 `json:"can_delete"`
	Relations    []DocumentRelation   `json:"relations,omitempty"`
	LastModified *time.Time           `json:"last_modified,omitempty"`
}

// TaskDocumentListItem 任务文档列表项
type TaskDocumentListItem struct {
	TaskID       int       `json:"task_id"`
	ProjectID    int       `json:"project_id"`
	TaskTitle    string    `json:"task_title"`
	ProjectName  string    `json:"project_name"`
	TaskStatus   string    `json:"task_status"`
	DocumentID   *int      `json:"document_id"`
	DocumentExists bool    `json:"document_exists"`
	LastModified *time.Time `json:"last_modified"`
	ContentSize  *int64    `json:"content_size"`
	CreatedAt    time.Time `json:"created_at"`
}

// TaskDocumentStats 任务文档统计
type TaskDocumentStats struct {
	TotalTasks      int `json:"total_tasks"`
	WithDocument    int `json:"with_document"`
	WithoutDocument int `json:"without_document"`
	RecentlyUpdated int `json:"recently_updated"`
}

// 删除任务文档默认模板功能 - 防止意外覆盖用户数据
// GetTaskDocumentDefaultTemplate 功能已删除，避免模板覆盖用户内容