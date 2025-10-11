package models

import (
	"errors"
	"strings"
	"time"
)

// TaskComment 任务评论模型
type TaskComment struct {
	ID        int        `json:"id" db:"id"`
	TaskID    int        `json:"task_id" db:"task_id"`
	UserID    int        `json:"user_id" db:"user_id"`
	Content   string     `json:"content" db:"content"`
	Status    string     `json:"status" db:"status"` // active, deleted
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	DeletedBy *int       `json:"deleted_by,omitempty" db:"deleted_by"`

	// 关联字段（不存储在数据库）
	User      *CommentUser `json:"user,omitempty" db:"-"`
	CanDelete bool         `json:"can_delete" db:"-"`
}

// CommentUser 评论作者信息（轻量级）
type CommentUser struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

// TaskCommentStats 任务评论统计
type TaskCommentStats struct {
	TaskID        int        `json:"task_id" db:"task_id"`
	TotalComments int        `json:"total_comments" db:"total_comments"`
	Participants  int        `json:"participants" db:"participants"`
	LastCommentAt *time.Time `json:"last_comment_at,omitempty" db:"last_comment_at"`
}

// CreateTaskCommentRequest 创建评论请求
type CreateTaskCommentRequest struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// ListTaskCommentsRequest 查询评论请求
type ListTaskCommentsRequest struct {
	TaskID int `json:"task_id" form:"task_id" binding:"required"`
	Page   int `json:"page" form:"page" binding:"omitempty,min=1"`
	Limit  int `json:"limit" form:"limit" binding:"omitempty,min=1,max=100"`
}

// ListTaskCommentsResponse 查询评论响应
type ListTaskCommentsResponse struct {
	Comments []*TaskComment `json:"comments"`
	Total    int            `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
}

// 常量定义
const (
	CommentStatusActive  = "active"
	CommentStatusDeleted = "deleted"

	DefaultCommentsPerPage = 20
	MaxCommentsPerPage     = 100
)

// Validate 验证评论内容
func (req *CreateTaskCommentRequest) Validate() error {
	trimmed := strings.TrimSpace(req.Content)
	if len(trimmed) == 0 {
		return errors.New("评论内容不能为空")
	}
	if len(req.Content) > 2000 {
		return errors.New("评论内容不能超过2000字符")
	}
	return nil
}

// CanDeleteComment 检查用户是否可以删除评论
func CanDeleteComment(comment *TaskComment, userID int, hasAdminPermission bool) bool {
	// 管理员可删除任何评论
	if hasAdminPermission {
		return true
	}

	// 评论作者可删除自己的评论
	if comment.UserID == userID {
		return true
	}

	return false
}

// SetCanDeleteFlag 为评论列表设置删除权限标记
func SetCanDeleteFlag(comments []*TaskComment, currentUserID int, hasAdminPermission bool) {
	for _, comment := range comments {
		comment.CanDelete = CanDeleteComment(comment, currentUserID, hasAdminPermission)
	}
}
