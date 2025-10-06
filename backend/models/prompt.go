package models

import (
	"time"
)

// PromptTemplate 提示词模板结构
type PromptTemplate struct {
	ID                int       `json:"id"`
	Name              string    `json:"name"`
	Description       *string   `json:"description,omitempty"`
	Content           string    `json:"content"`
	Category          string    `json:"category"`
	Tags              []string  `json:"tags"`
	UsageCount        int       `json:"usage_count"`
	SuccessRate       float64   `json:"success_rate"`
	RecommendedModels []string  `json:"recommended_models"`
	IsSystem          bool      `json:"is_system"`
	IsActive          bool      `json:"is_active"`
	CreatedBy         *int      `json:"created_by,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// UserPromptHistory 用户提示词历史结构
type UserPromptHistory struct {
	ID                  int       `json:"id"`
	UserID              int       `json:"user_id"`
	ParentTaskID        int       `json:"parent_task_id"`
	PromptText          string    `json:"prompt_text"`
	TemplateID          *int      `json:"template_id,omitempty"`
	AIProvider          string    `json:"ai_provider"`
	AIModel             string    `json:"ai_model"`
	SubtasksGenerated   int       `json:"subtasks_generated"`
	SubtasksAccepted    int       `json:"subtasks_accepted"`
	TotalEstimatedHours *float64  `json:"total_estimated_hours,omitempty"`
	IsSuccessful        *bool     `json:"is_successful,omitempty"`
	UserRating          *int      `json:"user_rating,omitempty"`
	UserFeedback        *string   `json:"user_feedback,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

// 注意: StringArray类型已在audit_log.go中定义，此处无需重复定义
