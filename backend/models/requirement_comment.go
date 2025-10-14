package models

import (
	"time"
)

// RequirementCommentType represents the type of requirement comment
type RequirementCommentType string

const (
	RequirementCommentTypeGeneral  RequirementCommentType = "general"  // 一般评论
	RequirementCommentTypeQuestion RequirementCommentType = "question" // 提问
	RequirementCommentTypeSuggestion RequirementCommentType = "suggestion" // 建议
	RequirementCommentTypeApproval RequirementCommentType = "approval" // 批准
)

// RequirementCommentStatus represents the status of a requirement comment
type RequirementCommentStatus string

const (
	RequirementCommentStatusActive  RequirementCommentStatus = "active"  // 活跃
	RequirementCommentStatusDeleted RequirementCommentStatus = "deleted" // 已删除
)

// RequirementComment represents a comment on a requirement
type RequirementComment struct {
	// 主键
	ID int `json:"id" db:"id"`

	// 关联字段
	RequirementID     int  `json:"requirement_id" db:"requirement_id" validate:"required"`
	UserID            int  `json:"user_id" db:"user_id" validate:"required"`
	ParentCommentID   *int `json:"parent_comment_id,omitempty" db:"parent_comment_id"`

	// 内容字段
	Content     string      `json:"content" db:"content" validate:"required,min=1,max=2000"`
	CommentType string      `json:"comment_type" db:"comment_type"`
	Attachments Attachments `json:"attachments" db:"attachments"`

	// 特殊标记
	IsInternal bool `json:"is_internal" db:"is_internal"` // 内部评论（客户不可见）
	IsPinned   bool `json:"is_pinned" db:"is_pinned"`     // 置顶评论

	// 状态管理
	Status string `json:"status" db:"status"`

	// 审计字段
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	DeletedBy *int       `json:"deleted_by,omitempty" db:"deleted_by"`

	// 关联对象（不存储在数据库，通过JOIN查询填充）
	Username      *string `json:"username,omitempty" db:"username"`
	UserAvatar    *string `json:"user_avatar,omitempty" db:"user_avatar"`
	UserType      *string `json:"user_type,omitempty" db:"user_type"`
	RepliesCount  *int    `json:"replies_count,omitempty" db:"-"`
	Replies       []RequirementComment `json:"replies,omitempty" db:"-"`
}

// CreateRequirementCommentRequest represents a request to create a requirement comment
type CreateRequirementCommentRequest struct {
	RequirementID   int         `json:"requirement_id" validate:"required"`
	ParentCommentID *int        `json:"parent_comment_id,omitempty"`
	Content         string      `json:"content" validate:"required,min=1,max=2000"`
	CommentType     string      `json:"comment_type" validate:"omitempty,oneof=general question suggestion approval"`
	Attachments     Attachments `json:"attachments,omitempty"`
	IsInternal      bool        `json:"is_internal,omitempty"`
}

// UpdateRequirementCommentRequest represents a request to update a requirement comment
type UpdateRequirementCommentRequest struct {
	Content     *string      `json:"content,omitempty" validate:"omitempty,min=1,max=2000"`
	CommentType *string      `json:"comment_type,omitempty" validate:"omitempty,oneof=general question suggestion approval"`
	Attachments *Attachments `json:"attachments,omitempty"`
	IsInternal  *bool        `json:"is_internal,omitempty"`
	IsPinned    *bool        `json:"is_pinned,omitempty"`
}

// RequirementCommentResponse represents a requirement comment response with additional info
type RequirementCommentResponse struct {
	ID              int         `json:"id"`
	RequirementID   int         `json:"requirement_id"`
	UserID          int         `json:"user_id"`
	Username        *string     `json:"username,omitempty"`
	UserAvatar      *string     `json:"user_avatar,omitempty"`
	UserType        *string     `json:"user_type,omitempty"`
	ParentCommentID *int        `json:"parent_comment_id,omitempty"`
	Content         string      `json:"content"`
	CommentType     string      `json:"comment_type"`
	Attachments     Attachments `json:"attachments"`
	IsInternal      bool        `json:"is_internal"`
	IsPinned        bool        `json:"is_pinned"`
	Status          string      `json:"status"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	DeletedAt       *time.Time  `json:"deleted_at,omitempty"`
	DeletedBy       *int        `json:"deleted_by,omitempty"`
	RepliesCount    int         `json:"replies_count"`
	Replies         []RequirementCommentResponse `json:"replies,omitempty"`
}

// RequirementCommentListResponse represents a paginated list of requirement comments
type RequirementCommentListResponse struct {
	Data     []RequirementCommentResponse `json:"data"`
	Total    int                          `json:"total"`
	Page     int                          `json:"page"`
	PageSize int                          `json:"page_size"`
}

// RequirementCommentFilters represents filtering options for requirement comments
type RequirementCommentFilters struct {
	RequirementID   *int       `form:"requirement_id"`
	UserID          *int       `form:"user_id"`
	CommentType     []string   `form:"comment_type"`
	Status          string     `form:"status"`
	IsInternal      *bool      `form:"is_internal"`
	IsPinned        *bool      `form:"is_pinned"`
	ParentCommentID *int       `form:"parent_comment_id"` // null for top-level comments
	CreatedAfter    *time.Time `form:"created_after"`
	CreatedBefore   *time.Time `form:"created_before"`
	Page            int        `form:"page" validate:"min=1"`
	PageSize        int        `form:"page_size" validate:"min=1,max=100"`
	SortBy          string     `form:"sort_by"` // created_at, updated_at
	SortOrder       string     `form:"sort_order" validate:"oneof=asc desc"`
}

// RequirementCommentStats represents requirement comment statistics
type RequirementCommentStats struct {
	TotalComments      int            `json:"total_comments"`
	ByCommentType      map[string]int `json:"by_comment_type"`
	ActiveComments     int            `json:"active_comments"`
	DeletedComments    int            `json:"deleted_comments"`
	InternalComments   int            `json:"internal_comments"`
	PinnedComments     int            `json:"pinned_comments"`
	TopLevelComments   int            `json:"top_level_comments"`
	ReplyComments      int            `json:"reply_comments"`
	TodaysComments     int            `json:"todays_comments"`
	ThisWeeksComments  int            `json:"this_weeks_comments"`
}

// ToResponse converts RequirementComment to RequirementCommentResponse
func (c *RequirementComment) ToResponse() RequirementCommentResponse {
	resp := RequirementCommentResponse{
		ID:              c.ID,
		RequirementID:   c.RequirementID,
		UserID:          c.UserID,
		Username:        c.Username,
		UserAvatar:      c.UserAvatar,
		UserType:        c.UserType,
		ParentCommentID: c.ParentCommentID,
		Content:         c.Content,
		CommentType:     c.CommentType,
		Attachments:     c.Attachments,
		IsInternal:      c.IsInternal,
		IsPinned:        c.IsPinned,
		Status:          c.Status,
		CreatedAt:       c.CreatedAt,
		UpdatedAt:       c.UpdatedAt,
		DeletedAt:       c.DeletedAt,
		DeletedBy:       c.DeletedBy,
		RepliesCount:    0,
		Replies:         []RequirementCommentResponse{},
	}

	if c.RepliesCount != nil {
		resp.RepliesCount = *c.RepliesCount
	}

	if c.Replies != nil && len(c.Replies) > 0 {
		replies := make([]RequirementCommentResponse, 0, len(c.Replies))
		for _, reply := range c.Replies {
			replies = append(replies, reply.ToResponse())
		}
		resp.Replies = replies
	}

	return resp
}

// ValidateCommentType validates if the comment type is valid
func ValidateRequirementCommentType(commentType string) bool {
	validTypes := []string{
		string(RequirementCommentTypeGeneral),
		string(RequirementCommentTypeQuestion),
		string(RequirementCommentTypeSuggestion),
		string(RequirementCommentTypeApproval),
	}
	for _, t := range validTypes {
		if t == commentType {
			return true
		}
	}
	return false
}

// ValidateCommentStatus validates if the comment status is valid
func ValidateRequirementCommentStatus(status string) bool {
	return status == string(RequirementCommentStatusActive) ||
	       status == string(RequirementCommentStatusDeleted)
}

// CanDeleteComment checks if a user can delete a requirement comment
// Returns true if:
// 1. User is the comment author
// 2. User is system admin
// 3. User is project manager (system user with appropriate role)
func (c *RequirementComment) CanDeleteComment(userID int, userType string, role string) bool {
	// Comment author can always delete their own comment
	if c.UserID == userID {
		return true
	}

	// System admins can delete any comment
	if userType == "system" && role == "admin" {
		return true
	}

	// Project managers (system users) can delete any comment
	if userType == "system" && role == "project_manager" {
		return true
	}

	return false
}

// CanUpdateComment checks if a user can update a requirement comment
func (c *RequirementComment) CanUpdateComment(userID int, userType string, role string) bool {
	// Only comment author can update content
	if c.UserID == userID {
		return true
	}

	// System admins and project managers can pin/unpin comments
	if userType == "system" && (role == "admin" || role == "project_manager") {
		return true
	}

	return false
}

// CanViewComment checks if a user can view a requirement comment
// Internal comments are only visible to system users
func (c *RequirementComment) CanViewComment(userType string) bool {
	// Non-internal comments are visible to everyone
	if !c.IsInternal {
		return true
	}

	// Internal comments are only visible to system users
	return userType == "system"
}

// IsDeleted checks if the comment is soft deleted
func (c *RequirementComment) IsDeleted() bool {
	return c.Status == string(RequirementCommentStatusDeleted) || c.DeletedAt != nil
}

// IsTopLevel checks if the comment is a top-level comment (not a reply)
func (c *RequirementComment) IsTopLevel() bool {
	return c.ParentCommentID == nil
}
