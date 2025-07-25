package models

import (
	"time"
)

// DocumentPermission represents a permission granted to a user for a document
type DocumentPermission struct {
	ID           int       `json:"id" db:"id"`
	DocumentID   int       `json:"document_id" db:"document_id"`
	UserID       int       `json:"user_id" db:"user_id"`
	PermissionType string  `json:"permission_type" db:"permission_type"` // read, write, admin, comment
	GrantedBy    int       `json:"granted_by" db:"granted_by"`
	GrantedAt    time.Time `json:"granted_at" db:"granted_at"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	
	// Related fields (populated by joins)
	DocumentTitle string `json:"document_title,omitempty" db:"document_title"`
	Username      string `json:"username,omitempty" db:"username"`
	UserEmail     string `json:"user_email,omitempty" db:"user_email"`
	GrantorName   string `json:"grantor_name,omitempty" db:"grantor_name"`
}

// DocumentShare represents a shareable link for a document
type DocumentShare struct {
	ID           int       `json:"id" db:"id"`
	DocumentID   int       `json:"document_id" db:"document_id"`
	ShareToken   string    `json:"share_token" db:"share_token"`
	ShareType    string    `json:"share_type" db:"share_type"` // link, email, team
	PermissionType string  `json:"permission_type" db:"permission_type"` // read, comment
	CreatedBy    int       `json:"created_by" db:"created_by"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	AccessCount  int       `json:"access_count" db:"access_count"`
	
	// Settings
	RequireAuth  bool `json:"require_auth" db:"require_auth"`
	AllowDownload bool `json:"allow_download" db:"allow_download"`
	
	// Related fields
	DocumentTitle string `json:"document_title,omitempty" db:"document_title"`
	CreatorName   string `json:"creator_name,omitempty" db:"creator_name"`
}

// DocumentComment represents a comment on a document
type DocumentComment struct {
	ID         int       `json:"id" db:"id"`
	DocumentID int       `json:"document_id" db:"document_id"`
	UserID     int       `json:"user_id" db:"user_id"`
	ParentID   *int      `json:"parent_id,omitempty" db:"parent_id"`
	Content    string    `json:"content" db:"content"`
	Position   *string   `json:"position,omitempty" db:"position"` // JSON for position info
	IsResolved bool      `json:"is_resolved" db:"is_resolved"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
	
	// Related fields
	Username      string               `json:"username,omitempty" db:"username"`
	UserAvatar    string               `json:"user_avatar,omitempty" db:"user_avatar"`
	Replies       []*DocumentComment   `json:"replies,omitempty"`
	ReplyCount    int                  `json:"reply_count,omitempty" db:"reply_count"`
}

// Request/Response models for permissions
type GrantDocumentPermissionRequest struct {
	DocumentID     int    `json:"document_id" binding:"required"`
	UserID         int    `json:"user_id" binding:"required"`
	PermissionType string `json:"permission_type" binding:"required,oneof=read write admin comment"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
}

type UpdateDocumentPermissionRequest struct {
	PermissionType string     `json:"permission_type" binding:"required,oneof=read write admin comment"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	IsActive       *bool      `json:"is_active,omitempty"`
}

type CreateDocumentShareRequest struct {
	DocumentID     int    `json:"document_id" binding:"required"`
	ShareType      string `json:"share_type" binding:"required,oneof=link email team"`
	PermissionType string `json:"permission_type" binding:"required,oneof=read comment"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	RequireAuth    bool   `json:"require_auth"`
	AllowDownload  bool   `json:"allow_download"`
}

type UpdateDocumentShareRequest struct {
	PermissionType *string    `json:"permission_type,omitempty"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	IsActive       *bool      `json:"is_active,omitempty"`
	RequireAuth    *bool      `json:"require_auth,omitempty"`
	AllowDownload  *bool      `json:"allow_download,omitempty"`
}

type AddDocumentCommentRequest struct {
	DocumentID int     `json:"document_id" binding:"required"`
	ParentID   *int    `json:"parent_id,omitempty"`
	Content    string  `json:"content" binding:"required,min=1,max=1000"`
	Position   *string `json:"position,omitempty"`
}

type UpdateDocumentCommentRequest struct {
	Content    *string `json:"content,omitempty"`
	IsResolved *bool   `json:"is_resolved,omitempty"`
}

type DocumentPermissionResponse struct {
	Permissions []*DocumentPermission `json:"permissions"`
	TotalCount  int                   `json:"total_count"`
}

type DocumentShareResponse struct {
	Shares     []*DocumentShare `json:"shares"`
	TotalCount int              `json:"total_count"`
}

type DocumentCommentsResponse struct {
	Comments   []*DocumentComment `json:"comments"`
	TotalCount int                `json:"total_count"`
}

type UserDocumentPermission struct {
	CanRead    bool `json:"can_read"`
	CanWrite   bool `json:"can_write"`
	CanAdmin   bool `json:"can_admin"`
	CanComment bool `json:"can_comment"`
	CanShare   bool `json:"can_share"`
	IsOwner    bool `json:"is_owner"`
}

// Permission validation functions
func ValidatePermissionType(permissionType string) bool {
	validTypes := []string{"read", "write", "admin", "comment"}
	for _, t := range validTypes {
		if t == permissionType {
			return true
		}
	}
	return false
}

func ValidateShareType(shareType string) bool {
	validTypes := []string{"link", "email", "team"}
	for _, t := range validTypes {
		if t == shareType {
			return true
		}
	}
	return false
}

// Check if user has specific permission for document
func (dp *DocumentPermission) HasPermission(permissionType string) bool {
	if !dp.IsActive {
		return false
	}
	
	if dp.ExpiresAt != nil && dp.ExpiresAt.Before(time.Now()) {
		return false
	}
	
	switch dp.PermissionType {
	case "admin":
		return true // Admin has all permissions
	case "write":
		return permissionType == "read" || permissionType == "write" || permissionType == "comment"
	case "comment":
		return permissionType == "read" || permissionType == "comment"
	case "read":
		return permissionType == "read"
	default:
		return false
	}
}

// Get effective permissions for user
func GetEffectivePermission(permissions []*DocumentPermission) *UserDocumentPermission {
	result := &UserDocumentPermission{}
	
	for _, perm := range permissions {
		if !perm.IsActive || (perm.ExpiresAt != nil && perm.ExpiresAt.Before(time.Now())) {
			continue
		}
		
		switch perm.PermissionType {
		case "admin":
			result.CanRead = true
			result.CanWrite = true
			result.CanAdmin = true
			result.CanComment = true
			result.CanShare = true
		case "write":
			result.CanRead = true
			result.CanWrite = true
			result.CanComment = true
		case "comment":
			result.CanRead = true
			result.CanComment = true
		case "read":
			result.CanRead = true
		}
	}
	
	return result
}