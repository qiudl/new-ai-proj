package models

import (
	"time"
)

// Project represents a project in the system
type Project struct {
	ID          int        `json:"id" db:"id"`
	Name        string     `json:"name" db:"name" validate:"required,min=1,max=100"`
	Description string     `json:"description" db:"description"`
	OwnerID     int        `json:"owner_id" db:"owner_id"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// ProjectRequest represents a project creation/update request
type ProjectRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description"`
}

// ProjectResponse represents a project response with additional info
type ProjectResponse struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	OwnerID     int       `json:"owner_id"`
	OwnerName   string    `json:"owner_name,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	TaskStats   *TaskStats `json:"task_stats,omitempty"`
}

// TaskStats represents task statistics for a project
type TaskStats struct {
	TotalTasks      int     `json:"total_tasks"`
	CompletedTasks  int     `json:"completed_tasks"`
	InProgressTasks int     `json:"in_progress_tasks"`
	TodoTasks       int     `json:"todo_tasks"`
	CompletionRate  float64 `json:"completion_rate"`
}

// RecycledProject represents a deleted project in the recycle bin
type RecycledProject struct {
	ID                 int        `json:"id" db:"id"`
	Name               string     `json:"name" db:"name"`
	Description        string     `json:"description" db:"description"`
	OwnerID            int        `json:"owner_id" db:"owner_id"`
	OwnerUsername      string     `json:"owner_username" db:"owner_username"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt          time.Time  `json:"deleted_at" db:"deleted_at"`
	DeletedTasksCount  int        `json:"deleted_tasks_count" db:"deleted_tasks_count"`
}

// AuditLog represents a system audit log entry
type AuditLog struct {
	ID         int                    `json:"id" db:"id"`
	UserID     *int                   `json:"user_id" db:"user_id"`
	Action     string                 `json:"action" db:"action"`
	EntityType string                 `json:"entity_type" db:"entity_type"`
	EntityID   int                    `json:"entity_id" db:"entity_id"`
	EntityData map[string]interface{} `json:"entity_data" db:"entity_data"`
	IPAddress  *string                `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent  *string                `json:"user_agent,omitempty" db:"user_agent"`
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
}

// ToResponse converts Project to ProjectResponse
func (p *Project) ToResponse() ProjectResponse {
	return ProjectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		OwnerID:     p.OwnerID,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}