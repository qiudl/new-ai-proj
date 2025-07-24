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
	ID                  int          `json:"id" db:"id"`
	Username            string       `json:"username" db:"username" validate:"required,min=3,max=50"`
	Email               string       `json:"email" db:"email" validate:"required,email"`
	PasswordHash        string       `json:"-" db:"password_hash"`
	UserType            string       `json:"user_type" db:"user_type" validate:"required,oneof=system company"`
	CompanyID           *int         `json:"company_id,omitempty" db:"company_id"`
	CompanyUserID       *int         `json:"company_user_id,omitempty" db:"company_user_id"`
	Role                string       `json:"role" db:"role" validate:"required"`
	Status              string       `json:"status" db:"status" validate:"required,oneof=active inactive suspended"`
	Profile             UserProfile  `json:"profile" db:"profile"`
	LastLoginAt         *time.Time   `json:"last_login_at,omitempty" db:"last_login_at"`
	// Timer fields
	CurrentTimingTaskID *int         `json:"current_timing_task_id,omitempty" db:"current_timing_task_id"`
	TimingStartTime     *time.Time   `json:"timing_start_time,omitempty" db:"timing_start_time"`
	TimingStatus        string       `json:"timing_status" db:"timing_status"`
	CreatedAt           time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time    `json:"updated_at" db:"updated_at"`
}

// UserCreateRequest represents a user creation request
type UserCreateRequest struct {
	Username  string      `json:"username" validate:"required,min=3,max=50"`
	Email     string      `json:"email" validate:"required,email"`
	Password  string      `json:"password" validate:"required,min=6"`
	UserType  string      `json:"user_type" validate:"required,oneof=system company"`
	CompanyID *int        `json:"company_id,omitempty"`
	Role      string      `json:"role" validate:"required"`
	Profile   UserProfile `json:"profile"`
}

// UserUpdateRequest represents a user update request
type UserUpdateRequest struct {
	Username  *string      `json:"username,omitempty" validate:"omitempty,min=3,max=50"`
	Email     *string      `json:"email,omitempty" validate:"omitempty,email"`
	UserType  *string      `json:"user_type,omitempty" validate:"omitempty,oneof=system company"`
	CompanyID *int         `json:"company_id,omitempty"`
	Role      *string      `json:"role,omitempty" validate:"omitempty"`
	Status    *string      `json:"status,omitempty" validate:"omitempty,oneof=active inactive suspended"`
	Profile   *UserProfile `json:"profile,omitempty"`
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
	ID            int          `json:"id"`
	Username      string       `json:"username"`
	Email         string       `json:"email"`
	UserType      string       `json:"user_type"`
	CompanyID     *int         `json:"company_id,omitempty"`
	CompanyUserID *int         `json:"company_user_id,omitempty"`
	Role          string       `json:"role"`
	Status        string       `json:"status"`
	Profile       UserProfile  `json:"profile"`
	LastLoginAt   *time.Time   `json:"last_login_at,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
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
	Total                int                    `json:"total"`
	ByRole               map[string]int         `json:"by_role"`
	ByStatus             map[string]int         `json:"by_status"`
	RecentRegistrations  int                    `json:"recent_registrations"`
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
		ID:            u.ID,
		Username:      u.Username,
		Email:         u.Email,
		UserType:      u.UserType,
		CompanyID:     u.CompanyID,
		CompanyUserID: u.CompanyUserID,
		Role:          u.Role,
		Status:        u.Status,
		Profile:       u.Profile,
		LastLoginAt:   u.LastLoginAt,
		CreatedAt:     u.CreatedAt,
		UpdatedAt:     u.UpdatedAt,
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
func ValidateCompanyUserFields(userType string, companyID *int) error {
	if userType == "company" && companyID == nil {
		return fmt.Errorf("company_id is required for company users")
	}
	if userType == "system" && companyID != nil {
		return fmt.Errorf("company_id should not be set for system users")
	}
	return nil
}