package models

import (
	"time"
)

// PasswordHistory represents a historical password record
// Used to prevent password reuse and maintain audit trail
type PasswordHistory struct {
	ID           int       `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	UserID       int       `gorm:"column:user_id;not null;index" json:"user_id"`
	PasswordHash string    `gorm:"column:password_hash;type:text;not null" json:"-"` // Never expose in JSON
	CreatedAt    time.Time `gorm:"column:created_at;not null;default:now()" json:"created_at"`
	CreatedBy    *int      `gorm:"column:created_by" json:"created_by,omitempty"`

	// Metadata
	IPAddress    string `gorm:"column:ip_address;type:varchar(45)" json:"ip_address,omitempty"`
	UserAgent    string `gorm:"column:user_agent;type:text" json:"user_agent,omitempty"`
	ChangeReason string `gorm:"column:change_reason;type:varchar(50)" json:"change_reason,omitempty"`

	// Associations
	User      *User `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	ChangedBy *User `gorm:"foreignKey:CreatedBy;references:ID" json:"changed_by,omitempty"`
}

// TableName specifies the table name for PasswordHistory model
func (PasswordHistory) TableName() string {
	return "password_history"
}

// PasswordChangeReason constants
const (
	PasswordChangeReasonUserInitiated  = "user_initiated"
	PasswordChangeReasonAdminReset     = "admin_reset"
	PasswordChangeReasonForcedExpiry   = "forced_expiry"
	PasswordChangeReasonSecurityPolicy = "security_policy"
	PasswordChangeReasonInitialMigration = "initial_migration"
)

// PasswordExpirationStatus represents the password expiration status for a user
type PasswordExpirationStatus struct {
	IsExpired                bool `json:"is_expired"`
	DaysUntilExpiry          *int `json:"days_until_expiry,omitempty"`
	MustChange               bool `json:"must_change"`
	WarningThresholdReached  bool `json:"warning_threshold_reached"`
}

// PasswordExpiryStatus constants
const (
	PasswordExpiryStatusNoExpiry     = "no_expiry"
	PasswordExpiryStatusExpired      = "expired"
	PasswordExpiryStatusExpiringSoon = "expiring_soon"
	PasswordExpiryStatusActive       = "active"
)
