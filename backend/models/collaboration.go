package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
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

// ============================================================================
// Yjs实时协作编辑系统模型 (2025-11-08)
// ============================================================================

// CollaborationDocument 协作文档表 - 存储Yjs CRDT文档状态
type CollaborationDocument struct {
	ID             int            `gorm:"primaryKey;autoIncrement" json:"id"`
	RequirementID  int            `gorm:"not null;index" json:"requirement_id"`
	FieldName      string         `gorm:"type:varchar(50);not null;index" json:"field_name"`
	YjsDocument    []byte         `gorm:"type:bytea" json:"yjs_document,omitempty"`
	StateVector    []byte         `gorm:"type:bytea" json:"state_vector,omitempty"`
	Version        int            `gorm:"default:0" json:"version"`
	LastModifiedBy *int           `json:"last_modified_by,omitempty"`
	LastModifiedAt time.Time      `json:"last_modified_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// 关联
	Updates  []CollaborationUpdate  `gorm:"foreignKey:DocumentID" json:"updates,omitempty"`
	Sessions []CollaborationSession2 `gorm:"foreignKey:DocumentID" json:"sessions,omitempty"`
}

// TableName 指定表名
func (CollaborationDocument) TableName() string {
	return "collaboration_documents"
}

// CollaborationUpdate 协作更新表 - 存储Yjs增量更新历史
type CollaborationUpdate struct {
	ID         int64          `gorm:"primaryKey;autoIncrement" json:"id"`
	DocumentID int            `gorm:"not null;index" json:"document_id"`
	UpdateData []byte         `gorm:"type:bytea;not null" json:"update_data,omitempty"`
	UserID     *int           `gorm:"index" json:"user_id,omitempty"`
	Timestamp  time.Time      `gorm:"index" json:"timestamp"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// 关联
	Document *CollaborationDocument `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
}

// TableName 指定表名
func (CollaborationUpdate) TableName() string {
	return "collaboration_updates"
}

// BeforeCreate GORM钩子 - 设置时间戳
func (u *CollaborationUpdate) BeforeCreate(tx *gorm.DB) error {
	if u.Timestamp.IsZero() {
		u.Timestamp = time.Now()
	}
	return nil
}

// CursorPosition 光标位置（JSON存储）
type CursorPosition struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// Value 实现 driver.Valuer 接口
func (c CursorPosition) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// Scan 实现 sql.Scanner 接口
func (c *CursorPosition) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, c)
}

// SelectionRange 选中范围（JSON存储）
type SelectionRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// Value 实现 driver.Valuer 接口
func (s SelectionRange) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// Scan 实现 sql.Scanner 接口
func (s *SelectionRange) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, s)
}

// CollaborationSession2 协作会话表 - Yjs协作会话（重命名避免与旧模型冲突）
type CollaborationSession2 struct {
	ID             int64           `gorm:"primaryKey;autoIncrement" json:"id"`
	DocumentID     int             `gorm:"not null;index" json:"document_id"`
	UserID         int             `gorm:"not null;index" json:"user_id"`
	SessionID      string          `gorm:"type:varchar(100);not null" json:"session_id"`
	UserName       string          `gorm:"type:varchar(255)" json:"user_name"`
	UserColor      string          `gorm:"type:varchar(20)" json:"user_color"`
	CursorPosition *CursorPosition `gorm:"type:jsonb" json:"cursor_position,omitempty"`
	SelectionRange *SelectionRange `gorm:"type:jsonb" json:"selection_range,omitempty"`
	IsActive       bool            `gorm:"default:true;index" json:"is_active"`
	LastHeartbeat  time.Time       `gorm:"index" json:"last_heartbeat"`
	JoinedAt       time.Time       `json:"joined_at"`
	LeftAt         *time.Time      `json:"left_at,omitempty"`
	DeletedAt      gorm.DeletedAt  `gorm:"index" json:"deleted_at,omitempty"`

	// 关联
	Document *CollaborationDocument `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
}

// TableName 指定表名
func (CollaborationSession2) TableName() string {
	return "collaboration_sessions"
}

// BeforeCreate GORM钩子 - 设置默认值
func (s *CollaborationSession2) BeforeCreate(tx *gorm.DB) error {
	if s.JoinedAt.IsZero() {
		s.JoinedAt = time.Now()
	}
	if s.LastHeartbeat.IsZero() {
		s.LastHeartbeat = time.Now()
	}
	return nil
}

// UpdateHeartbeat 更新心跳时间
func (s *CollaborationSession2) UpdateHeartbeat(db *gorm.DB) error {
	return db.Model(s).Update("last_heartbeat", time.Now()).Error
}

// MarkInactive 标记会话为不活跃
func (s *CollaborationSession2) MarkInactive(db *gorm.DB) error {
	now := time.Now()
	return db.Model(s).Updates(map[string]interface{}{
		"is_active": false,
		"left_at":   now,
	}).Error
}
