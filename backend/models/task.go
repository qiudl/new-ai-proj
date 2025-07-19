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
	ID           int          `json:"id" db:"id"`
	ProjectID    int          `json:"project_id" db:"project_id" validate:"required"`
	Title        string       `json:"title" db:"title" validate:"required,min=1,max=255"`
	Description  string       `json:"description" db:"description"`
	Status       string       `json:"status" db:"status" validate:"required,oneof=todo in_progress completed cancelled"`
	AssigneeID   *int         `json:"assignee_id" db:"assignee_id"`
	DueDate      *time.Time   `json:"due_date" db:"due_date"`
	CustomFields CustomFields `json:"custom_fields" db:"custom_fields"`
	Priority       string       `json:"priority" db:"priority" validate:"oneof=low medium high"` 
	EstimatedHours *float64     `json:"estimated_hours" db:"estimated_hours" validate:"min=0"` 
	ActualHours    *float64     `json:"actual_hours" db:"actual_hours" validate:"min=0"` 
	Progress       *int         `json:"progress" db:"progress" validate:"min=0,max=100"` 
	Tags           []string     `json:"tags" db:"tags"` 
	Metadata       CustomFields `json:"metadata" db:"metadata"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at" db:"updated_at"`
}

// TaskRequest represents a task creation/update request
type TaskRequest struct {
	Title        string       `json:"title" validate:"required,min=1,max=255"`
	Description  string       `json:"description"`
	Status       string       `json:"status" validate:"required,oneof=todo in_progress completed cancelled"`
	AssigneeID   *int         `json:"assignee_id"`
	DueDate      *time.Time   `json:"due_date"`
	CustomFields CustomFields `json:"custom_fields"`
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

// PaginationParams represents pagination parameters
type PaginationParams struct {
	Page     int `form:"page,default=1" validate:"min=1"`
	PageSize int `form:"page_size,default=20" validate:"min=1,max=100"`
}

// PaginatedResponse represents a paginated response
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

// Pagination represents pagination metadata
type Pagination struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
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
		CreatedAt:    t.CreatedAt,
		UpdatedAt:    t.UpdatedAt,
	}
}