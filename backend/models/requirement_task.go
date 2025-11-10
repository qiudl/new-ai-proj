package models

import (
	"time"
)

// RequirementTaskLinkType represents the type of requirement-task link
type RequirementTaskLinkType string

const (
	RequirementTaskLinkManual    RequirementTaskLinkType = "manual"    // 手动关联
	RequirementTaskLinkConverted RequirementTaskLinkType = "converted" // 需求转任务
	RequirementTaskLinkRelated   RequirementTaskLinkType = "related"   // 相关联
)

// RequirementTask represents a many-to-many relationship between requirements and tasks
type RequirementTask struct {
	// 主键
	ID int `json:"id" db:"id"`

	// 关联字段
	RequirementID int `json:"requirement_id" db:"requirement_id" validate:"required"`
	TaskID        int `json:"task_id" db:"task_id" validate:"required"`

	// 关联类型
	LinkType string `json:"link_type" db:"link_type" validate:"required,oneof=manual converted related"`

	// 关联元数据
	LinkedBy    int     `json:"linked_by" db:"linked_by" validate:"required"`
	LinkComment *string `json:"link_comment,omitempty" db:"link_comment"`

	// 时间戳
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	// 关联对象（不存储在数据库，通过JOIN查询填充）
	RequirementTitle   *string `json:"requirement_title,omitempty" db:"requirement_title"`
	RequirementDisplayID *string `json:"requirement_display_id,omitempty" db:"requirement_display_id"`
	RequirementStatus  *string `json:"requirement_status,omitempty" db:"requirement_status"`
	TaskTitle          *string `json:"task_title,omitempty" db:"task_title"`
	TaskStatus         *string `json:"task_status,omitempty" db:"task_status"`
	LinkerUsername     *string `json:"linker_username,omitempty" db:"linker_username"`
}

// CreateRequirementTaskLinkRequest represents a request to link a requirement to a task
type CreateRequirementTaskLinkRequest struct {
	RequirementID int     `json:"requirement_id"` // Set from path parameter, not included in request body
	TaskID        int     `json:"task_id" validate:"required"`
	LinkType      string  `json:"link_type" validate:"omitempty,oneof=manual converted related"`
	LinkComment   *string `json:"link_comment,omitempty"`
}

// RequirementTaskResponse represents a requirement-task link response with additional info
type RequirementTaskResponse struct {
	ID               int       `json:"id"`
	RequirementID    int       `json:"requirement_id"`
	TaskID           int       `json:"task_id"`
	LinkType         string    `json:"link_type"`
	LinkedBy         int       `json:"linked_by"`
	LinkerUsername   *string   `json:"linker_username,omitempty"`
	LinkComment      *string   `json:"link_comment,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// Requirement details
	RequirementTitle     *string `json:"requirement_title,omitempty"`
	RequirementDisplayID *string `json:"requirement_display_id,omitempty"`
	RequirementStatus    *string `json:"requirement_status,omitempty"`

	// Task details
	TaskTitle  *string `json:"task_title,omitempty"`
	TaskStatus *string `json:"task_status,omitempty"`
}

// RequirementTaskListResponse represents a paginated list of requirement-task links
type RequirementTaskListResponse struct {
	Data     []RequirementTaskResponse `json:"data"`
	Total    int                       `json:"total"`
	Page     int                       `json:"page"`
	PageSize int                       `json:"page_size"`
}

// RequirementTaskFilters represents filtering options for requirement-task links
type RequirementTaskFilters struct {
	RequirementID *int     `form:"requirement_id"`
	TaskID        *int     `form:"task_id"`
	LinkType      []string `form:"link_type"`
	LinkedBy      *int     `form:"linked_by"`
	Page          int      `form:"page" validate:"min=1"`
	PageSize      int      `form:"page_size" validate:"min=1,max=100"`
	SortBy        string   `form:"sort_by"` // created_at, updated_at
	SortOrder     string   `form:"sort_order" validate:"oneof=asc desc"`
}

// ToResponse converts RequirementTask to RequirementTaskResponse
func (rt *RequirementTask) ToResponse() RequirementTaskResponse {
	return RequirementTaskResponse{
		ID:                   rt.ID,
		RequirementID:        rt.RequirementID,
		TaskID:               rt.TaskID,
		LinkType:             rt.LinkType,
		LinkedBy:             rt.LinkedBy,
		LinkerUsername:       rt.LinkerUsername,
		LinkComment:          rt.LinkComment,
		CreatedAt:            rt.CreatedAt,
		UpdatedAt:            rt.UpdatedAt,
		RequirementTitle:     rt.RequirementTitle,
		RequirementDisplayID: rt.RequirementDisplayID,
		RequirementStatus:    rt.RequirementStatus,
		TaskTitle:            rt.TaskTitle,
		TaskStatus:           rt.TaskStatus,
	}
}

// ValidateLinkType validates if the link type is valid
func ValidateRequirementTaskLinkType(linkType string) bool {
	validTypes := []string{
		string(RequirementTaskLinkManual),
		string(RequirementTaskLinkConverted),
		string(RequirementTaskLinkRelated),
	}
	for _, t := range validTypes {
		if t == linkType {
			return true
		}
	}
	return false
}

// IsConverted checks if this link represents a requirement-to-task conversion
func (rt *RequirementTask) IsConverted() bool {
	return rt.LinkType == string(RequirementTaskLinkConverted)
}

// IsManualLink checks if this is a manual user-created link
func (rt *RequirementTask) IsManualLink() bool {
	return rt.LinkType == string(RequirementTaskLinkManual)
}

// IsRelated checks if this link is a related/reference link
func (rt *RequirementTask) IsRelated() bool {
	return rt.LinkType == string(RequirementTaskLinkRelated)
}
