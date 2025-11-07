package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationTypeMention         NotificationType = "mention"          // @用户提及
	NotificationTypeTaskAssigned    NotificationType = "task_assigned"    // 任务分配
	NotificationTypeTaskCompleted   NotificationType = "task_completed"   // 任务完成
	NotificationTypeTaskOverdue     NotificationType = "task_overdue"     // 任务逾期
	NotificationTypeCommentAdded    NotificationType = "comment_added"    // 评论添加
	NotificationTypeProjectUpdate   NotificationType = "project_update"   // 项目更新
	NotificationTypeRequirementReview NotificationType = "requirement_review" // 需求评审
)

// NotificationMetadata represents the metadata stored in JSONB
type NotificationMetadata map[string]interface{}

// Value implements driver.Valuer for JSONB storage
func (m NotificationMetadata) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	return json.Marshal(m)
}

// Scan implements sql.Scanner for JSONB retrieval
func (m *NotificationMetadata) Scan(value interface{}) error {
	if value == nil {
		*m = NotificationMetadata{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into NotificationMetadata", value)
	}

	return json.Unmarshal(bytes, m)
}

// Notification represents a user notification
type Notification struct {
	ID               int                  `json:"id" db:"id"`
	UserID           int                  `json:"user_id" db:"user_id"`
	Type             string               `json:"type" db:"type"`
	Title            string               `json:"title" db:"title"`
	Message          *string              `json:"message,omitempty" db:"message"`
	IsRead           bool                 `json:"is_read" db:"is_read"`
	RelatedTaskID    *int                 `json:"related_task_id,omitempty" db:"related_task_id"`
	RelatedProjectID *int                 `json:"related_project_id,omitempty" db:"related_project_id"`
	CreatedAt        time.Time            `json:"created_at" db:"created_at"`
	ReadAt           *time.Time           `json:"read_at,omitempty" db:"read_at"`
	Metadata         NotificationMetadata `json:"metadata" db:"metadata"`
	DeletedAt        *time.Time           `json:"deleted_at,omitempty" db:"deleted_at"`

	// Additional fields (not stored in DB, populated by joins)
	Username     *string `json:"username,omitempty" db:"username"`
	TaskTitle    *string `json:"task_title,omitempty" db:"task_title"`
	ProjectTitle *string `json:"project_title,omitempty" db:"project_title"`
}

// CreateNotificationRequest represents a request to create a notification
type CreateNotificationRequest struct {
	UserID           int                  `json:"user_id" validate:"required"`
	Type             string               `json:"type" validate:"required"`
	Title            string               `json:"title" validate:"required,max=255"`
	Message          *string              `json:"message,omitempty"`
	RelatedTaskID    *int                 `json:"related_task_id,omitempty"`
	RelatedProjectID *int                 `json:"related_project_id,omitempty"`
	Metadata         NotificationMetadata `json:"metadata,omitempty"`
}

// NotificationResponse represents a notification response
type NotificationResponse struct {
	ID               int                  `json:"id"`
	UserID           int                  `json:"user_id"`
	Type             string               `json:"type"`
	Title            string               `json:"title"`
	Message          *string              `json:"message,omitempty"`
	IsRead           bool                 `json:"is_read"`
	RelatedTaskID    *int                 `json:"related_task_id,omitempty"`
	RelatedProjectID *int                 `json:"related_project_id,omitempty"`
	CreatedAt        time.Time            `json:"created_at"`
	ReadAt           *time.Time           `json:"read_at,omitempty"`
	Metadata         NotificationMetadata `json:"metadata"`

	// Additional populated fields
	Username     *string `json:"username,omitempty"`
	TaskTitle    *string `json:"task_title,omitempty"`
	ProjectTitle *string `json:"project_title,omitempty"`
}

// NotificationListResponse represents a paginated list of notifications
type NotificationListResponse struct {
	Data     []NotificationResponse `json:"data"`
	Total    int                    `json:"total"`
	Page     int                    `json:"page"`
	PageSize int                    `json:"page_size"`
}

// NotificationFilters represents filtering options for notifications
type NotificationFilters struct {
	UserID   *int     `form:"user_id"`
	Type     []string `form:"type"`
	IsRead   *bool    `form:"is_read"`
	Page     int      `form:"page" validate:"min=1"`
	PageSize int      `form:"page_size" validate:"min=1,max=100"`
	SortBy   string   `form:"sort_by"` // created_at, read_at
	SortOrder string  `form:"sort_order" validate:"oneof=asc desc"`
}

// MarkAsReadRequest represents a request to mark notifications as read
type MarkAsReadRequest struct {
	NotificationIDs []int `json:"notification_ids" validate:"required,min=1"`
}

// ToResponse converts Notification to NotificationResponse
func (n *Notification) ToResponse() NotificationResponse {
	return NotificationResponse{
		ID:               n.ID,
		UserID:           n.UserID,
		Type:             n.Type,
		Title:            n.Title,
		Message:          n.Message,
		IsRead:           n.IsRead,
		RelatedTaskID:    n.RelatedTaskID,
		RelatedProjectID: n.RelatedProjectID,
		CreatedAt:        n.CreatedAt,
		ReadAt:           n.ReadAt,
		Metadata:         n.Metadata,
		Username:         n.Username,
		TaskTitle:        n.TaskTitle,
		ProjectTitle:     n.ProjectTitle,
	}
}

// ValidateNotificationType validates if the notification type is valid
func ValidateNotificationType(notifType string) bool {
	validTypes := []string{
		string(NotificationTypeMention),
		string(NotificationTypeTaskAssigned),
		string(NotificationTypeTaskCompleted),
		string(NotificationTypeTaskOverdue),
		string(NotificationTypeCommentAdded),
		string(NotificationTypeProjectUpdate),
		string(NotificationTypeRequirementReview),
	}
	for _, t := range validTypes {
		if t == notifType {
			return true
		}
	}
	return false
}

// MentionNotificationData represents metadata for @mention notifications
type MentionNotificationData struct {
	RequirementID int    `json:"requirement_id"`
	CommentID     int    `json:"comment_id"`
	MentionedBy   int    `json:"mentioned_by"`
	MentionedByUsername string `json:"mentioned_by_username"`
	CommentContent string `json:"comment_content,omitempty"` // First 100 chars
}

// ToMetadata converts MentionNotificationData to NotificationMetadata
func (m *MentionNotificationData) ToMetadata() NotificationMetadata {
	return NotificationMetadata{
		"requirement_id":        m.RequirementID,
		"comment_id":            m.CommentID,
		"mentioned_by":          m.MentionedBy,
		"mentioned_by_username": m.MentionedByUsername,
		"comment_content":       m.CommentContent,
	}
}
