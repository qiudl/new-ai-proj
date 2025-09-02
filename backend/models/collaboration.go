package models

import (
	"time"
)

// ====================
// 文档协作相关模型
// ====================

// DocumentCommentExt 扩展的文档评论模型（扩展原有DocumentComment）
type DocumentCommentExt struct {
	ID              int        `json:"id" db:"id"`
	DocumentID      int        `json:"document_id" db:"document_id"`
	ParentCommentID *int       `json:"parent_comment_id" db:"parent_comment_id"`
	UserID          int        `json:"user_id" db:"user_id"`
	Content         string     `json:"content" db:"content"`
	CommentType     string     `json:"comment_type" db:"comment_type"`
	PositionInfo    *string    `json:"position_info" db:"position_info"`
	IsResolved      bool       `json:"is_resolved" db:"is_resolved"`
	ResolvedBy      *int       `json:"resolved_by" db:"resolved_by"`
	ResolvedAt      *time.Time `json:"resolved_at" db:"resolved_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt       *time.Time `json:"deleted_at" db:"deleted_at"`

	// 关联字段
	UserName       string  `json:"user_name,omitempty" db:"user_name"`
	ResolvedByName *string `json:"resolved_by_name,omitempty" db:"resolved_by_name"`
}

// AddCommentRequest 添加评论请求
type AddCommentRequest struct {
	Content         string  `json:"content" validate:"required,min=1"`
	CommentType     string  `json:"comment_type" validate:"required,oneof=general suggestion approval question"`
	PositionInfo    *string `json:"position_info"`
	ParentCommentID *int    `json:"parent_comment_id"`
}

// UpdateCommentRequest 更新评论请求
type UpdateCommentRequest struct {
	Content string `json:"content" validate:"required,min=1"`
}

// CommentListResponse 评论列表响应
type CommentListResponse struct {
	Comments    []DocumentCommentExt `json:"comments"`
	Total       int                  `json:"total"`
	Page        int                  `json:"page"`
	Limit       int                  `json:"limit"`
	HasNextPage bool                 `json:"has_next_page"`
	HasPrevPage bool                 `json:"has_prev_page"`
}

// DocumentCollaboratorExt 扩展的文档协作者模型（扩展原有DocumentCollaborator）
type DocumentCollaboratorExt struct {
	ID              int        `json:"id" db:"id"`
	DocumentID      int        `json:"document_id" db:"document_id"`
	UserID          int        `json:"user_id" db:"user_id"`
	PermissionLevel string     `json:"permission_level" db:"permission_level"`
	GrantedBy       int        `json:"granted_by" db:"granted_by"`
	GrantedAt       time.Time  `json:"granted_at" db:"granted_at"`
	ExpiresAt       *time.Time `json:"expires_at" db:"expires_at"`
	LastAccessedAt  *time.Time `json:"last_accessed_at" db:"last_accessed_at"`

	// 关联字段
	UserName      *string `json:"user_name,omitempty" db:"user_name"`
	GrantedByName *string `json:"granted_by_name,omitempty" db:"granted_by_name"`
}

// AddCollaboratorExtRequest 添加协作者请求（扩展版）
type AddCollaboratorExtRequest struct {
	UserID          int        `json:"user_id" validate:"required"`
	PermissionLevel string     `json:"permission_level" validate:"required,oneof=read comment edit admin"`
	ExpiresAt       *time.Time `json:"expires_at"`
}

// UpdateCollaboratorExtRequest 更新协作者请求（扩展版）
type UpdateCollaboratorExtRequest struct {
	PermissionLevel *string    `json:"permission_level" validate:"omitempty,oneof=read comment edit admin"`
	ExpiresAt       *time.Time `json:"expires_at"`
}

// DocumentChangeRecord 文档变更记录
type DocumentChangeRecord struct {
	ID            int       `json:"id" db:"id"`
	DocumentID    int       `json:"document_id" db:"document_id"`
	UserID        int       `json:"user_id" db:"user_id"`
	ChangeType    string    `json:"change_type" db:"change_type"`
	FieldName     *string   `json:"field_name" db:"field_name"`
	OldValue      *string   `json:"old_value" db:"old_value"`
	NewValue      *string   `json:"new_value" db:"new_value"`
	ChangeSummary *string   `json:"change_summary" db:"change_summary"`
	IPAddress     *string   `json:"ip_address" db:"ip_address"`
	UserAgent     *string   `json:"user_agent" db:"user_agent"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`

	// 关联字段
	UserName string `json:"user_name,omitempty" db:"user_name"`
}

// ChangeHistoryResponse 变更历史响应
type ChangeHistoryResponse struct {
	Changes     []DocumentChangeRecord `json:"changes"`
	Total       int                    `json:"total"`
	Page        int                    `json:"page"`
	Limit       int                    `json:"limit"`
	HasNextPage bool                   `json:"has_next_page"`
	HasPrevPage bool                   `json:"has_prev_page"`
}

// CollaborationSession 协作会话
type CollaborationSession struct {
	DocumentID int       `json:"document_id"`
	UserID     int       `json:"user_id"`
	StartedAt  time.Time `json:"started_at"`
	IsActive   bool      `json:"is_active"`
}

// ActiveCollaborator 活跃协作者
type ActiveCollaborator struct {
	UserID          int       `json:"user_id"`
	Username        string    `json:"username"`
	PermissionLevel string    `json:"permission_level"`
	LastActiveAt    time.Time `json:"last_active_at"`
}

// DocumentCollaborationStats 文档协作统计
type DocumentCollaborationStats struct {
	DocumentID         int `json:"document_id"`
	CollaboratorCount  int `json:"collaborator_count"`
	CommentCount       int `json:"comment_count"`
	UnresolvedComments int `json:"unresolved_comments"`
	ChangeCount        int `json:"change_count"`
}

// UserCollaborationDashboard 用户协作仪表板
type UserCollaborationDashboard struct {
	UserID                int `json:"user_id"`
	CollaboratedDocuments int `json:"collaborated_documents"`
	CommentsMade          int `json:"comments_made"`
	CommentsResolved      int `json:"comments_resolved"`
	DocumentsEdited       int `json:"documents_edited"`
}

// Note: Document and DocumentRelation models are defined in other files
// This file only contains collaboration-specific models
