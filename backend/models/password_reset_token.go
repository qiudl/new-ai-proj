package models

import (
	"time"
)

// PasswordResetToken represents a password reset token
type PasswordResetToken struct {
	ID     int    `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	UserID int    `gorm:"column:user_id;not null;index" json:"user_id"`
	Token  string `gorm:"column:token;type:varchar(255);not null;unique" json:"-"` // Never expose in JSON
	TokenHash string `gorm:"column:token_hash;type:text;not null;index" json:"-"` // SHA-256 hash
	Email  string `gorm:"column:email;type:varchar(255);not null;index" json:"email"`

	// Token lifecycle
	CreatedAt time.Time  `gorm:"column:created_at;not null;default:now()" json:"created_at"`
	ExpiresAt time.Time  `gorm:"column:expires_at;not null" json:"expires_at"`
	UsedAt    *time.Time `gorm:"column:used_at" json:"used_at,omitempty"`

	// Security tracking
	IPAddress        string `gorm:"column:ip_address;type:varchar(45)" json:"ip_address,omitempty"`
	UserAgent        string `gorm:"column:user_agent;type:text" json:"user_agent,omitempty"`
	ResetIPAddress   string `gorm:"column:reset_ip_address;type:varchar(45)" json:"reset_ip_address,omitempty"`
	ResetUserAgent   string `gorm:"column:reset_user_agent;type:text" json:"reset_user_agent,omitempty"`

	// Status
	Status string `gorm:"column:status;type:varchar(20);not null;default:'pending'" json:"status"`

	// Associations
	User *User `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
}

// TableName specifies the table name for PasswordResetToken model
func (PasswordResetToken) TableName() string {
	return "password_reset_tokens"
}

// PasswordResetToken status constants
const (
	ResetTokenStatusPending = "pending"
	ResetTokenStatusUsed    = "used"
	ResetTokenStatusExpired = "expired"
	ResetTokenStatusRevoked = "revoked"
)

// IsValid checks if the token is still valid
func (t *PasswordResetToken) IsValid() bool {
	now := time.Now()
	return t.Status == ResetTokenStatusPending &&
		t.UsedAt == nil &&
		t.ExpiresAt.After(now)
}

// IsExpired checks if the token has expired
func (t *PasswordResetToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token           string `json:"token" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
}

// VerifyResetTokenRequest represents a token verification request
type VerifyResetTokenRequest struct {
	Token string `json:"token" binding:"required"`
}
