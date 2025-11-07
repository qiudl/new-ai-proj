package database

import (
	"context"
	"time"
)

// SystemUserManagementRepository defines data access operations for system user management
// This interface follows the Repository pattern to separate data access logic from business logic
// It is specifically designed for system_user_handler.go to eliminate 13 SQL violations
type SystemUserManagementRepository interface {
	// User queries
	CountSystemUsers(ctx context.Context, filters SystemUserFilters) (int, error)
	ListSystemUsers(ctx context.Context, filters SystemUserFilters, pagination Pagination) ([]SystemUser, error)
	GetSystemUserByID(ctx context.Context, userID uint) (*SystemUser, error)

	// User existence checks
	UserExistsByUsername(ctx context.Context, username string) (bool, error)
	UserExistsByEmail(ctx context.Context, email string) (bool, error)

	// User creation and updates
	CreateSystemUser(ctx context.Context, user *CreateSystemUserParams) (*SystemUser, error)
	UpdateSystemUserStatus(ctx context.Context, userID uint, newStatus string) (time.Time, error)
	GetSystemUserStatus(ctx context.Context, userID uint) (username string, status string, err error)

	// Role management - Critical for solving N+1 query problem
	GetSystemUserRoles(ctx context.Context, userID uint) ([]uint, error)
	BatchRoleExists(ctx context.Context, roleIDs []uint) (map[uint]bool, error)
	SyncUserRoles(ctx context.Context, userID uint, roleIDs []uint, assignedBy uint) (added int, removed int, err error)
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

// SystemUser represents a system user entity
type SystemUser struct {
	ID          uint
	Username    string
	Email       string
	UserType    string
	Role        string
	Status      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	LastLoginAt *time.Time
}

// CreateSystemUserParams defines parameters for creating a system user
type CreateSystemUserParams struct {
	Username     string
	Email        string
	PasswordHash *string
	Role         string
	Status       string
}

// NewUserManagementRepository creates a UserService for enterprise user management (backwards compatibility)
// Deprecated: This function exists for backwards compatibility with existing factory code
// Returns UserService (not SystemUserManagementRepository) to maintain compatibility with UserManagementHandler
func NewUserManagementRepository(db interface{}) UserService {
	return NewUserServiceWithDB(db)
}
