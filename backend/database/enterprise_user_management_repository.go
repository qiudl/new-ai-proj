package database

import (
	"context"
)

// EnterpriseUserFilters contains filters for listing enterprise users
type EnterpriseUserFilters struct {
	EnterpriseID uint
	Search       *string // Search in username, email
	Status       *string // User status filter
	RoleID       *uint   // Filter by role
	DepartmentID *uint   // Filter by department
}

// EnterpriseUserPagination contains pagination parameters
type EnterpriseUserPagination struct {
	Page     int
	PageSize int
}

// EnterpriseUser represents a user in an enterprise with full details
type EnterpriseUser struct {
	UserID             uint
	Username           string
	Email              string
	UserType           string
	UserStatus         string
	EnterpriseUserID   uint
	EnterpriseID       uint
	EnterpriseStatus   string
	CreatedAt          string
	UpdatedAt          string
	LastLoginAt        *string
}

// EnterpriseUserCreateParams contains parameters for creating enterprise user
type EnterpriseUserCreateParams struct {
	EnterpriseID uint
	UserID       uint
	Username     string
	Email        string
	DefaultRoleID *uint
	CreatedBy    uint
}

// EnterpriseUserManagementRepository defines the interface for enterprise user data access
type EnterpriseUserManagementRepository interface {
	// CountEnterpriseUsers returns the total count of enterprise users matching filters
	CountEnterpriseUsers(ctx context.Context, filters EnterpriseUserFilters) (int, error)

	// ListEnterpriseUsers retrieves a paginated list of enterprise users
	ListEnterpriseUsers(ctx context.Context, filters EnterpriseUserFilters, pagination EnterpriseUserPagination) ([]EnterpriseUser, error)

	// CheckUserExists checks if a user exists in the system
	// Returns username, email, userType, and error
	CheckUserExists(ctx context.Context, userID uint) (username string, email string, userType string, err error)

	// CheckUserMembership checks if user is already member of enterprise
	// Returns enterprise_user.id if exists, or 0 if not found
	CheckUserMembership(ctx context.Context, enterpriseID uint, userID uint) (enterpriseUserID uint, err error)

	// GetDefaultRole retrieves the default member role ID for an enterprise
	// Returns role ID or 0 if not found
	GetDefaultRole(ctx context.Context, enterpriseID uint) (roleID uint, err error)

	// CreateEnterpriseUser adds a user to an enterprise
	// Returns the new enterprise_user.id
	CreateEnterpriseUser(ctx context.Context, params EnterpriseUserCreateParams) (enterpriseUserID uint, err error)

	// GetEnterpriseUser retrieves detailed information about an enterprise user
	GetEnterpriseUser(ctx context.Context, enterpriseID uint, userID uint) (*EnterpriseUser, error)

	// GetEnterpriseUserID retrieves the enterprise_users.id for a user in an enterprise
	GetEnterpriseUserID(ctx context.Context, enterpriseID uint, userID uint) (enterpriseUserID uint, err error)

	// RemoveEnterpriseUser soft deletes an enterprise user
	// Returns username for logging purposes
	RemoveEnterpriseUser(ctx context.Context, enterpriseUserID uint) (username string, err error)

	// GetEnterpriseUserWithUsername gets enterprise_user.id and username
	GetEnterpriseUserWithUsername(ctx context.Context, enterpriseID uint, userID uint) (enterpriseUserID uint, username string, err error)
}
