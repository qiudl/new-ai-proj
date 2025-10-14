package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// RequirementStatus represents the status of a requirement
type RequirementStatus string

const (
	RequirementStatusDraft     RequirementStatus = "draft"      // 草稿
	RequirementStatusPending   RequirementStatus = "pending"    // 待评审
	RequirementStatusReviewing RequirementStatus = "reviewing"  // 评审中
	RequirementStatusNeedMore  RequirementStatus = "need_more"  // 待补充
	RequirementStatusApproved  RequirementStatus = "approved"   // 已通过
	RequirementStatusRejected  RequirementStatus = "rejected"   // 已拒绝
	RequirementStatusConverted RequirementStatus = "converted"  // 已转任务
	RequirementStatusArchived  RequirementStatus = "archived"   // 已归档
)

// RequirementPriority represents the priority level
type RequirementPriority string

const (
	RequirementPriorityLow    RequirementPriority = "low"    // 低
	RequirementPriorityMedium RequirementPriority = "medium" // 中
	RequirementPriorityHigh   RequirementPriority = "high"   // 高
	RequirementPriorityUrgent RequirementPriority = "urgent" // 紧急
)

// RequirementComplexity represents the complexity level
type RequirementComplexity string

const (
	RequirementComplexitySimple      RequirementComplexity = "simple"       // 简单
	RequirementComplexityMedium      RequirementComplexity = "medium"       // 中等
	RequirementComplexityComplex     RequirementComplexity = "complex"      // 复杂
	RequirementComplexityVeryComplex RequirementComplexity = "very_complex" // 非常复杂
)

// Attachments represents a list of file attachments (JSONB)
type Attachments []Attachment

// Attachment represents a single file attachment
type Attachment struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Size int64  `json:"size"`
	Type string `json:"type"`
}

// Value implements the driver.Valuer interface for database storage
func (a Attachments) Value() (driver.Value, error) {
	if a == nil {
		return "[]", nil
	}
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface for database retrieval
func (a *Attachments) Scan(value interface{}) error {
	if value == nil {
		*a = Attachments{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into Attachments", value)
	}

	return json.Unmarshal(bytes, a)
}

// Requirement represents a requirement in the system
type Requirement struct {
	// 主键和编号
	ID        int    `json:"id" db:"id"`
	DisplayID string `json:"display_id" db:"display_id"`

	// 基础信息
	Title       string  `json:"title" db:"title" validate:"required,min=1,max=500"`
	Description *string `json:"description" db:"description"`

	// 关联信息（复用现有表）
	ProjectID    *int `json:"project_id" db:"project_id"`
	EnterpriseID int  `json:"enterprise_id" db:"enterprise_id" validate:"required"`
	SubmitterID  int  `json:"submitter_id" db:"submitter_id" validate:"required"`
	ReviewerID   *int `json:"reviewer_id" db:"reviewer_id"`

	// 状态和优先级
	Status   string  `json:"status" db:"status" validate:"required"`
	Priority string  `json:"priority" db:"priority"`
	Category *string `json:"category" db:"category"`

	// 业务信息
	BusinessValue      *string     `json:"business_value" db:"business_value"`
	ExpectedOutcome    *string     `json:"expected_outcome" db:"expected_outcome"`
	AcceptanceCriteria *string     `json:"acceptance_criteria" db:"acceptance_criteria"`
	Attachments        Attachments `json:"attachments" db:"attachments"`

	// 评审信息
	ReviewStatus  *string    `json:"review_status" db:"review_status"`
	ReviewComment *string    `json:"review_comment" db:"review_comment"`
	ReviewScore   *int       `json:"review_score" db:"review_score"`
	ReviewedAt    *time.Time `json:"reviewed_at" db:"reviewed_at"`

	// 估算信息
	EstimatedHours *float64 `json:"estimated_hours" db:"estimated_hours"`
	EstimatedCost  *float64 `json:"estimated_cost" db:"estimated_cost"`
	Complexity     *string  `json:"complexity" db:"complexity"`

	// 转化信息（关联到tasks表）
	ConvertedTaskID *int       `json:"converted_task_id" db:"converted_task_id"`
	ConvertedAt     *time.Time `json:"converted_at" db:"converted_at"`
	ConvertedBy     *int       `json:"converted_by" db:"converted_by"`

	// 时间戳
	SubmittedAt *time.Time `json:"submitted_at" db:"submitted_at"`
	DueDate     *time.Time `json:"due_date" db:"due_date"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`

	// 关联对象（不存储在数据库，通过JOIN查询填充）
	ProjectName    *string `json:"project_name,omitempty" db:"project_name"`
	EnterpriseName *string `json:"enterprise_name,omitempty" db:"enterprise_name"`
	SubmitterName  *string `json:"submitter_name,omitempty" db:"submitter_name"`
	ReviewerName   *string `json:"reviewer_name,omitempty" db:"reviewer_name"`
	ConvertedTask  *Task   `json:"converted_task,omitempty" db:"-"`
}

// CreateRequirementRequest represents a request to create a requirement
type CreateRequirementRequest struct {
	Title              string      `json:"title" validate:"required,min=1,max=500"`
	Description        *string     `json:"description"`
	ProjectID          *int        `json:"project_id"`
	EnterpriseID       *int        `json:"enterprise_id"` // system用户创建时需要指定
	Priority           string      `json:"priority" validate:"omitempty,oneof=low medium high urgent"`
	Category           *string     `json:"category"`
	BusinessValue      *string     `json:"business_value"`
	ExpectedOutcome    *string     `json:"expected_outcome"`
	AcceptanceCriteria *string     `json:"acceptance_criteria"`
	Attachments        Attachments `json:"attachments"`
	DueDate            *time.Time  `json:"due_date"`
}

// UpdateRequirementRequest represents a request to update a requirement
type UpdateRequirementRequest struct {
	Title              *string      `json:"title" validate:"omitempty,min=1,max=500"`
	Description        *string      `json:"description"`
	ProjectID          *int         `json:"project_id"`
	Priority           *string      `json:"priority" validate:"omitempty,oneof=low medium high urgent"`
	Category           *string      `json:"category"`
	BusinessValue      *string      `json:"business_value"`
	ExpectedOutcome    *string      `json:"expected_outcome"`
	AcceptanceCriteria *string      `json:"acceptance_criteria"`
	Attachments        *Attachments `json:"attachments"`
	DueDate            *time.Time   `json:"due_date"`
}

// ReviewRequirementRequest represents a request to review a requirement
type ReviewRequirementRequest struct {
	Action         string   `json:"action" validate:"required,oneof=approve reject need_more_info"` // approve, reject, need_more_info
	Comment        *string  `json:"comment"`
	Score          *int     `json:"score" validate:"omitempty,min=1,max=10"`
	EstimatedHours *float64 `json:"estimated_hours" validate:"omitempty,min=0"`
	EstimatedCost  *float64 `json:"estimated_cost" validate:"omitempty,min=0"`
	Complexity     *string  `json:"complexity" validate:"omitempty,oneof=simple medium complex very_complex"`
}

// ConvertToTaskRequest represents a request to convert a requirement to a task
type ConvertToTaskRequest struct {
	ProjectID      *int       `json:"project_id"`
	TaskTitle      *string    `json:"task_title"`
	AssigneeID     *int       `json:"assignee_id"`
	DueDate        *time.Time `json:"due_date"`
	Priority       *string    `json:"priority" validate:"omitempty,oneof=low medium high"`
	Description    *string    `json:"description"`
	CreateSubtasks bool       `json:"create_subtasks"`
	LinkRequirement bool       `json:"link_requirement"`
}

// RequirementResponse represents a requirement response with additional info
type RequirementResponse struct {
	ID        int    `json:"id"`
	DisplayID string `json:"display_id"`

	// 基础信息
	Title       string  `json:"title"`
	Description *string `json:"description"`

	// 关联信息
	ProjectID      *int    `json:"project_id"`
	ProjectName    *string `json:"project_name,omitempty"`
	EnterpriseID   int     `json:"enterprise_id"`
	EnterpriseName *string `json:"enterprise_name,omitempty"`

	// 提交人信息
	SubmitterID   int     `json:"submitter_id"`
	SubmitterName *string `json:"submitter_name,omitempty"`

	// 评审人信息
	ReviewerID   *int    `json:"reviewer_id"`
	ReviewerName *string `json:"reviewer_name,omitempty"`

	// 状态和优先级
	Status   string  `json:"status"`
	Priority string  `json:"priority"`
	Category *string `json:"category,omitempty"`

	// 业务信息
	BusinessValue      *string     `json:"business_value,omitempty"`
	ExpectedOutcome    *string     `json:"expected_outcome,omitempty"`
	AcceptanceCriteria *string     `json:"acceptance_criteria,omitempty"`
	Attachments        Attachments `json:"attachments"`

	// 评审信息
	ReviewStatus  *string    `json:"review_status,omitempty"`
	ReviewComment *string    `json:"review_comment,omitempty"`
	ReviewScore   *int       `json:"review_score,omitempty"`
	ReviewedAt    *time.Time `json:"reviewed_at,omitempty"`

	// 估算信息
	EstimatedHours *float64 `json:"estimated_hours,omitempty"`
	EstimatedCost  *float64 `json:"estimated_cost,omitempty"`
	Complexity     *string  `json:"complexity,omitempty"`

	// 转化信息
	ConvertedTaskID *int       `json:"converted_task_id,omitempty"`
	ConvertedAt     *time.Time `json:"converted_at,omitempty"`
	ConvertedBy     *int       `json:"converted_by,omitempty"`

	// 时间戳
	SubmittedAt *time.Time `json:"submitted_at,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// 统计信息
	CommentsCount int `json:"comments_count,omitempty"`
	ViewsCount    int `json:"views_count,omitempty"`
}

// RequirementListResponse represents a paginated list of requirements
type RequirementListResponse struct {
	Data     []RequirementResponse `json:"data"`
	Total    int                   `json:"total"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"page_size"`
}

// RequirementFilters represents filtering options for requirements
type RequirementFilters struct {
	Status       []string   `form:"status"`
	Priority     []string   `form:"priority"`
	Category     []string   `form:"category"`
	SubmitterID  *int       `form:"submitter_id"`
	ReviewerID   *int       `form:"reviewer_id"`
	EnterpriseID *int       `form:"enterprise_id"`
	ProjectID    *int       `form:"project_id"`
	Search       string     `form:"search"`
	DueAfter     *time.Time `form:"due_after"`
	DueBefore    *time.Time `form:"due_before"`
	Page         int        `form:"page" validate:"min=1"`
	PageSize     int        `form:"page_size" validate:"min=1,max=100"`
	SortBy       string     `form:"sort_by"` // created_at, updated_at, due_date, priority
	SortOrder    string     `form:"sort_order" validate:"oneof=asc desc"`
}

// RequirementStats represents requirement statistics
type RequirementStats struct {
	TotalRequirements    int            `json:"total_requirements"`
	ByStatus             map[string]int `json:"by_status"`
	ByPriority           map[string]int `json:"by_priority"`
	PendingReview        int            `json:"pending_review"`
	ApprovedThisMonth    int            `json:"approved_this_month"`
	ConvertedThisMonth   int            `json:"converted_this_month"`
	AverageReviewTime    float64        `json:"average_review_time_hours"`
	ConversionRate       float64        `json:"conversion_rate"`
}

// ToResponse converts Requirement to RequirementResponse
func (r *Requirement) ToResponse() RequirementResponse {
	return RequirementResponse{
		ID:                 r.ID,
		DisplayID:          r.DisplayID,
		Title:              r.Title,
		Description:        r.Description,
		ProjectID:          r.ProjectID,
		ProjectName:        r.ProjectName,
		EnterpriseID:       r.EnterpriseID,
		EnterpriseName:     r.EnterpriseName,
		SubmitterID:        r.SubmitterID,
		SubmitterName:      r.SubmitterName,
		ReviewerID:         r.ReviewerID,
		ReviewerName:       r.ReviewerName,
		Status:             r.Status,
		Priority:           r.Priority,
		Category:           r.Category,
		BusinessValue:      r.BusinessValue,
		ExpectedOutcome:    r.ExpectedOutcome,
		AcceptanceCriteria: r.AcceptanceCriteria,
		Attachments:        r.Attachments,
		ReviewStatus:       r.ReviewStatus,
		ReviewComment:      r.ReviewComment,
		ReviewScore:        r.ReviewScore,
		ReviewedAt:         r.ReviewedAt,
		EstimatedHours:     r.EstimatedHours,
		EstimatedCost:      r.EstimatedCost,
		Complexity:         r.Complexity,
		ConvertedTaskID:    r.ConvertedTaskID,
		ConvertedAt:        r.ConvertedAt,
		ConvertedBy:        r.ConvertedBy,
		SubmittedAt:        r.SubmittedAt,
		DueDate:            r.DueDate,
		CreatedAt:          r.CreatedAt,
		UpdatedAt:          r.UpdatedAt,
	}
}

// ValidateStatus validates if the status is valid
func ValidateRequirementStatus(status string) bool {
	validStatuses := []string{
		string(RequirementStatusDraft),
		string(RequirementStatusPending),
		string(RequirementStatusReviewing),
		string(RequirementStatusNeedMore),
		string(RequirementStatusApproved),
		string(RequirementStatusRejected),
		string(RequirementStatusConverted),
		string(RequirementStatusArchived),
	}
	for _, s := range validStatuses {
		if s == status {
			return true
		}
	}
	return false
}

// CanTransitionTo checks if the requirement can transition to the target status
func (r *Requirement) CanTransitionTo(targetStatus string) bool {
	currentStatus := RequirementStatus(r.Status)
	target := RequirementStatus(targetStatus)

	transitions := map[RequirementStatus][]RequirementStatus{
		RequirementStatusDraft: {
			RequirementStatusPending,
		},
		RequirementStatusPending: {
			RequirementStatusReviewing,
			RequirementStatusDraft, // 退回修改
		},
		RequirementStatusReviewing: {
			RequirementStatusNeedMore,
			RequirementStatusRejected,
			RequirementStatusApproved,
		},
		RequirementStatusNeedMore: {
			RequirementStatusReviewing,
			RequirementStatusDraft, // 退回草稿
		},
		RequirementStatusApproved: {
			RequirementStatusConverted,
			RequirementStatusArchived,
		},
		RequirementStatusRejected: {
			RequirementStatusArchived,
		},
		RequirementStatusConverted: {},
		RequirementStatusArchived:  {},
	}

	allowed, exists := transitions[currentStatus]
	if !exists {
		return false
	}

	for _, s := range allowed {
		if s == target {
			return true
		}
	}
	return false
}
