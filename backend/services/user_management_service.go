package services

import (
	"context"
	"time"
)

// UserManagementService defines business logic operations for system user management
// This service layer sits between handlers and repositories, providing:
// - Business validation and rules
// - Password hashing and security
// - Error translation to user-friendly messages
// - Transaction coordination (if needed)
type UserManagementService interface {
	// ListSystemUsers retrieves a paginated list of system users with filters
	ListSystemUsers(ctx context.Context, filters SystemUserFilters, pagination Pagination) (*SystemUserListResult, error)

	// GetSystemUser retrieves detailed information about a system user
	GetSystemUser(ctx context.Context, userID uint) (*SystemUserDetail, error)

	// CreateSystemUser creates a new system user with password hashing
	CreateSystemUser(ctx context.Context, req *CreateSystemUserRequest) (*SystemUserDetail, error)

	// UpdateSystemUserRoles updates the roles assigned to a system user
	// This method handles role synchronization and returns the number of roles added/removed
	UpdateSystemUserRoles(ctx context.Context, userID uint, roleIDs []uint, operatorID uint) (*RoleUpdateResult, error)

	// UpdateSystemUserStatus updates the status of a system user (active, inactive, suspended, locked)
	UpdateSystemUserStatus(ctx context.Context, userID uint, newStatus string, operatorID uint) (*StatusUpdateResult, error)
}

// SystemUserFilters defines filtering options for listing system users
type SystemUserFilters struct {
	Search string // Search by username or email (ILIKE pattern matching)
	Status string // Filter by status (active/inactive/suspended/locked)
}

// Pagination defines pagination parameters
type Pagination struct {
	Page     int // Page number (1-based)
	PageSize int // Number of items per page
}

// SystemUserListResult represents the result of listing system users
type SystemUserListResult struct {
	Users      []SystemUserSummary `json:"users"`
	Total      int                 `json:"total"`
	Page       int                 `json:"page"`
	PageSize   int                 `json:"page_size"`
	TotalPages int                 `json:"total_pages"`
}

// SystemUserSummary represents a summary of a system user (for list views)
type SystemUserSummary struct {
	ID          uint       `json:"id"`
	Username    string     `json:"username"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

// SystemUserDetail represents detailed information about a system user
type SystemUserDetail struct {
	ID          uint       `json:"id"`
	Username    string     `json:"username"`
	Email       string     `json:"email"`
	UserType    string     `json:"user_type"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	RoleIDs     []uint     `json:"role_ids"`     // System role IDs assigned to the user
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

// CreateSystemUserRequest represents a request to create a system user
type CreateSystemUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required"`
	Status   string `json:"status"` // Optional, defaults to "active"
}

// RoleUpdateResult represents the result of updating user roles
type RoleUpdateResult struct {
	UserID       uint      `json:"user_id"`
	Username     string    `json:"username"`
	RolesAdded   int       `json:"roles_added"`
	RolesRemoved int       `json:"roles_removed"`
	CurrentRoles []uint    `json:"current_roles"`
	UpdatedAt    time.Time `json:"updated_at"`
	Message      string    `json:"message"`
}

// StatusUpdateResult represents the result of updating user status
type StatusUpdateResult struct {
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username"`
	OldStatus string    `json:"old_status"`
	NewStatus string    `json:"new_status"`
	UpdatedAt time.Time `json:"updated_at"`
	Message   string    `json:"message"`
}
