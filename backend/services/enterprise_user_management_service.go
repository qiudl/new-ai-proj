package services

import (
	"context"

	"ai-project-backend/database"
)

// EnterpriseUserListResult contains paginated list of enterprise users
type EnterpriseUserListResult struct {
	Users      []database.EnterpriseUser
	Total      int
	Page       int
	PageSize   int
	EnterpriseID uint
}

// EnterpriseUserDetail contains detailed information about an enterprise user including roles
type EnterpriseUserDetail struct {
	UserID           uint
	Username         string
	Email            string
	UserType         string
	Status           string
	EnterpriseUserID uint
	EnterpriseID     uint
	EnterpriseStatus string
	Roles            []EnterpriseRole
	CreatedAt        string
	UpdatedAt        string
	LastLoginAt      *string
}

// EnterpriseRole represents a role assigned to an enterprise user
type EnterpriseRole struct {
	ID          uint
	RoleCode    string
	RoleName    string
	Description *string
	IsActive    bool
	IsBuiltIn   bool
}

// InviteUserRequest contains parameters for inviting a user to enterprise
type InviteUserRequest struct {
	UserID uint
}

// InviteUserResult contains the result of inviting a user
type InviteUserResult struct {
	EnterpriseUserID uint
	UserID           uint
	Username         string
	Email            string
	DefaultRoleID    *uint
}

// EnterpriseRoleUpdateResult contains the result of updating enterprise user roles
type EnterpriseRoleUpdateResult struct {
	RolesAdded   int
	RolesRemoved int
	CurrentRoles []EnterpriseRole
}

// RemoveUserResult contains the result of removing a user from enterprise
type RemoveUserResult struct {
	EnterpriseUserID uint
	UserID           uint
	Username         string
	RemovedRoles     int
}

// EnterpriseUserManagementService defines business logic for enterprise user management
type EnterpriseUserManagementService interface {
	// ListEnterpriseUsers retrieves a paginated list of enterprise users with filters
	ListEnterpriseUsers(ctx context.Context, filters database.EnterpriseUserFilters, pagination database.EnterpriseUserPagination) (*EnterpriseUserListResult, error)

	// InviteUserToEnterprise adds a user to an enterprise with default role
	InviteUserToEnterprise(ctx context.Context, enterpriseID uint, req InviteUserRequest, operatorID uint) (*InviteUserResult, error)

	// GetEnterpriseUser retrieves detailed information about an enterprise user
	GetEnterpriseUser(ctx context.Context, enterpriseID uint, userID uint) (*EnterpriseUserDetail, error)

	// UpdateEnterpriseUserRoles updates the roles assigned to an enterprise user
	UpdateEnterpriseUserRoles(ctx context.Context, enterpriseID uint, userID uint, roleIDs []uint, operatorID uint) (*EnterpriseRoleUpdateResult, error)

	// RemoveEnterpriseUser removes a user from an enterprise
	RemoveEnterpriseUser(ctx context.Context, enterpriseID uint, userID uint, operatorID uint) (*RemoveUserResult, error)
}
