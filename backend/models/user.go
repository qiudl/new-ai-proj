// Model Version: v1.0.0-frozen
// Architecture Freeze: 2024-08-24
// DO NOT make breaking changes to this model without version bump
// See ARCHITECTURE-BLUEPRINT-V1.md for change policies
package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// UserProfile represents user profile information
type UserProfile struct {
	Name       *string `json:"name,omitempty"`
	Phone      *string `json:"phone,omitempty"`
	Department *string `json:"department,omitempty"`
	Avatar     *string `json:"avatar,omitempty"`
}

// Value implements the driver.Valuer interface for database storage
func (p UserProfile) Value() (driver.Value, error) {
	return json.Marshal(p)
}

// Scan implements the sql.Scanner interface for database retrieval
func (p *UserProfile) Scan(value interface{}) error {
	if value == nil {
		*p = UserProfile{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into UserProfile", value)
	}

	return json.Unmarshal(bytes, p)
}

// User represents a user in the system
type User struct {
	ID            int         `json:"id" db:"id"`
	Username      string      `json:"username" db:"username" validate:"required,min=3,max=50"`
	Email         string      `json:"email" db:"email" validate:"required,email"`
	PasswordHash  string      `json:"-" db:"password_hash"`
	UserType      string      `json:"user_type" db:"user_type" validate:"required,oneof=system company"`
	// Enterprise association - v1.5: New field with clear semantics
	EnterpriseID  *int        `json:"enterprise_id,omitempty" db:"enterprise_id"`
	// DEPRECATED: Use EnterpriseID instead. Will be removed in v2.0
	CompanyID     *int        `json:"company_id,omitempty" db:"company_id"`
	CompanyUserID *int        `json:"company_user_id,omitempty" db:"company_user_id"`
	Role          string      `json:"role" db:"role" validate:"required"`
	Status        string      `json:"status" db:"status" validate:"required,oneof=active inactive suspended"`
	Profile       UserProfile `json:"profile" db:"profile"`
	LastLoginAt   *time.Time  `json:"last_login_at,omitempty" db:"last_login_at"`
	// Enterprise user fields
	ContactPersonName *string    `json:"contact_person_name,omitempty" db:"contact_person_name"`
	ContactPhone      *string    `json:"contact_phone,omitempty" db:"contact_phone"`
	DepartmentTitle   *string    `json:"department_title,omitempty" db:"department_title"`
	IsPrimaryContact  bool       `json:"is_primary_contact" db:"is_primary_contact"`
	AccountExpiresAt  *time.Time `json:"account_expires_at,omitempty" db:"account_expires_at"`
	LastProjectAccess *time.Time `json:"last_project_access,omitempty" db:"last_project_access"`
	Notes             *string    `json:"notes,omitempty" db:"notes"`
	// Timer fields
	CurrentTimingTaskID    *int       `json:"current_timing_task_id,omitempty" db:"current_timing_task_id"`
	CurrentUserTimerTaskID *int       `json:"current_user_timer_task_id,omitempty" db:"current_user_timer_task_id"`
	TimingStartTime        *time.Time `json:"timing_start_time,omitempty" db:"timing_start_time"`
	TimingStatus           string     `json:"timing_status" db:"timing_status"`
	// Pause/Resume fields for Phase 3
	TimingPausedTime         *time.Time `json:"timing_paused_time,omitempty" db:"timing_paused_time"`       // When the timer was paused
	TimingAccumulatedSeconds int        `json:"timing_accumulated_seconds" db:"timing_accumulated_seconds"` // Seconds accumulated before pause
	// Password expiration fields
	PasswordChangedAt  *time.Time `json:"password_changed_at,omitempty" db:"password_changed_at"`
	PasswordExpiresAt  *time.Time `json:"password_expires_at,omitempty" db:"password_expires_at"`
	MustChangePassword bool       `json:"must_change_password" db:"must_change_password"`
	PasswordExpiryDays *int       `json:"password_expiry_days,omitempty" db:"password_expiry_days"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt          *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// UserCreateRequest represents a user creation request
type UserCreateRequest struct {
	Username  string      `json:"username" validate:"required,min=3,max=50"`
	Email        string      `json:"email" validate:"required,email"`
	Password     string      `json:"password" validate:"required,min=6"`
	UserType     string      `json:"user_type" validate:"required,oneof=system company"`
	EnterpriseID *int        `json:"enterprise_id,omitempty"`
	CompanyID    *int        `json:"company_id,omitempty"` // DEPRECATED: use enterprise_id
	Role         string      `json:"role" validate:"required"`
	Profile   UserProfile `json:"profile"`
}

// UserUpdateRequest represents a user update request
type UserUpdateRequest struct {
	Username          *string      `json:"username,omitempty" validate:"omitempty,min=3,max=50"`
	Email             *string      `json:"email,omitempty" validate:"omitempty,email"`
	UserType          *string      `json:"user_type,omitempty" validate:"omitempty,oneof=system company"`
	EnterpriseID      *int         `json:"enterprise_id,omitempty"`
	CompanyID         *int         `json:"company_id,omitempty"` // DEPRECATED: use enterprise_id
	Role              *string      `json:"role,omitempty" validate:"omitempty"`
	Status            *string      `json:"status,omitempty" validate:"omitempty,oneof=active inactive suspended"`
	Profile           *UserProfile `json:"profile,omitempty"`
	// Enterprise user fields
	ContactPersonName *string `json:"contact_person_name,omitempty"`
	ContactPhone      *string `json:"contact_phone,omitempty"`
	DepartmentTitle   *string `json:"department_title,omitempty"`
	Notes             *string `json:"notes,omitempty"`
}

// UserListParams represents parameters for listing users
type UserListParams struct {
	Page     int    `json:"page" validate:"min=1"`
	PageSize int    `json:"page_size" validate:"min=1,max=100"`
	UserType string `json:"user_type,omitempty" validate:"omitempty,oneof=system company"`
	Role     string `json:"role,omitempty"`
	Status   string `json:"status,omitempty" validate:"omitempty,oneof=active inactive suspended"`
	Search   string `json:"search,omitempty"`
}

// UserResponse represents a user response (without sensitive data)
type UserResponse struct {
	ID            int         `json:"id"`
	Username      string      `json:"username"`
	Email         string      `json:"email"`
	UserType      string      `json:"user_type"`
	EnterpriseID  *int        `json:"enterprise_id,omitempty"`
	CompanyID     *int        `json:"company_id,omitempty"` // DEPRECATED: use enterprise_id
	CompanyUserID *int        `json:"company_user_id,omitempty"`
	Role          string      `json:"role"`
	Status        string      `json:"status"`
	Profile       UserProfile `json:"profile"`
	LastLoginAt   *time.Time  `json:"last_login_at,omitempty"`
	// Enterprise user fields
	ContactPersonName *string    `json:"contact_person_name,omitempty"`
	ContactPhone      *string    `json:"contact_phone,omitempty"`
	DepartmentTitle   *string    `json:"department_title,omitempty"`
	IsPrimaryContact  bool       `json:"is_primary_contact"`
	AccountExpiresAt  *time.Time `json:"account_expires_at,omitempty"`
	LastProjectAccess *time.Time `json:"last_project_access,omitempty"`
	Notes             *string    `json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// UserListResponse represents a paginated list of users
type UserListResponse struct {
	Data     []UserResponse `json:"data"`
	Total    int            `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
}

// UserStats represents user statistics
type UserStats struct {
	Total               int            `json:"total"`
	ByRole              map[string]int `json:"by_role"`
	ByStatus            map[string]int `json:"by_status"`
	RecentRegistrations int            `json:"recent_registrations"`
}

// PasswordResetRequest represents a password reset request
type PasswordResetRequest struct {
	NewPassword string `json:"new_password" validate:"required,min=6"`
}

// UserStatusUpdateRequest represents a user status update request
type UserStatusUpdateRequest struct {
	Status string `json:"status" validate:"required,oneof=active inactive suspended"`
}

// BatchUserRequest represents a batch operation request
type BatchUserRequest struct {
	UserIDs []int  `json:"user_ids" validate:"required,min=1"`
	Action  string `json:"action" validate:"required,oneof=activate suspend delete"`
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:                u.ID,
		Username:          u.Username,
		Email:             u.Email,
		UserType:          u.UserType,
		CompanyID:         u.CompanyID,
		CompanyUserID:     u.CompanyUserID,
		Role:              u.Role,
		Status:            u.Status,
		Profile:           u.Profile,
		LastLoginAt:       u.LastLoginAt,
		ContactPersonName: u.ContactPersonName,
		ContactPhone:      u.ContactPhone,
		DepartmentTitle:   u.DepartmentTitle,
		IsPrimaryContact:  u.IsPrimaryContact,
		AccountExpiresAt:  u.AccountExpiresAt,
		LastProjectAccess: u.LastProjectAccess,
		Notes:             u.Notes,
		CreatedAt:         u.CreatedAt,
		UpdatedAt:         u.UpdatedAt,
	}
}

// ValidateUserRole validates if the role is valid for the given user type
func ValidateUserRole(userType, role string) error {
	systemRoles := []string{"admin", "project_manager", "developer"}
	companyRoles := []string{"company_admin", "company_user"}

	switch userType {
	case "system":
		for _, r := range systemRoles {
			if r == role {
				return nil
			}
		}
		return fmt.Errorf("invalid role '%s' for system user. Valid roles: %v", role, systemRoles)
	case "company":
		for _, r := range companyRoles {
			if r == role {
				return nil
			}
		}
		return fmt.Errorf("invalid role '%s' for company user. Valid roles: %v", role, companyRoles)
	default:
		return fmt.Errorf("invalid user type: %s", userType)
	}
}

// GetValidRolesForUserType returns the valid roles for a given user type
func GetValidRolesForUserType(userType string) []string {
	switch userType {
	case "system":
		return []string{"admin", "project_manager", "developer"}
	case "company":
		return []string{"company_admin", "company_user"}
	default:
		return []string{}
	}
}

// ValidateCompanyUserFields validates that company users have required company_id
// DEPRECATED: Use ValidateEnterpriseUserFields instead
func ValidateCompanyUserFields(userType string, companyID *int) error {
	if userType == "company" && companyID == nil {
		return fmt.Errorf("company_id is required for company users")
	}
	if userType == "system" && companyID != nil {
		return fmt.Errorf("company_id should not be set for system users")
	}
	return nil
}

// ValidateEnterpriseUserFields validates that company users have required enterprise_id
// v1.5: Accepts either enterprise_id or company_id for backward compatibility
func ValidateEnterpriseUserFields(userType string, enterpriseID *int, companyID *int) error {
	if userType == "company" {
		// v1.5: Accept either field during transition period
		if enterpriseID == nil && companyID == nil {
			return fmt.Errorf("enterprise_id or company_id is required for company users")
		}
	}
	if userType == "system" {
		if enterpriseID != nil || companyID != nil {
			return fmt.Errorf("enterprise_id/company_id should not be set for system users")
		}
	}
	return nil
}

// ===================================
// v1.5: Enterprise ID Helper Methods
// ===================================

// GetEnterpriseID returns the enterprise ID with backward compatibility
// Priority: EnterpriseID > CompanyID
func (u *User) GetEnterpriseID() *int {
	if u.EnterpriseID != nil {
		return u.EnterpriseID
	}
	// Fallback to CompanyID for backward compatibility
	return u.CompanyID
}

// SetEnterpriseID sets both EnterpriseID and CompanyID for backward compatibility
func (u *User) SetEnterpriseID(id *int) {
	u.EnterpriseID = id
	u.CompanyID = id // Keep in sync during transition period
}

// HasEnterpriseAccess checks if user belongs to an enterprise
func (u *User) HasEnterpriseAccess() bool {
	return u.GetEnterpriseID() != nil
}

// IsEnterpriseUser checks if user is a company type user with enterprise access
func (u *User) IsEnterpriseUser() bool {
	return u.UserType == "company" && u.HasEnterpriseAccess()
}

// BelongsToEnterprise checks if user belongs to specific enterprise
func (u *User) BelongsToEnterprise(enterpriseID int) bool {
	eid := u.GetEnterpriseID()
	return eid != nil && *eid == enterpriseID
}
