package interfaces

import (
	"context"
	"time"
)

// SystemRole represents a system-level role (for system users)
type SystemRole struct {
	ID          uint
	RoleCode    string
	RoleName    string
	Description *string
	IsActive    bool
	IsBuiltIn   bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// SystemRolePermission represents a permission assigned to a system role
type SystemRolePermission struct {
	ID             uint
	SystemRoleID   uint
	PermissionCode string
	IsGranted      bool
	CreatedAt      time.Time
}

// EnterpriseRole represents an enterprise-level role (for enterprise users)
type EnterpriseRole struct {
	ID           uint
	EnterpriseID uint
	RoleCode     string
	RoleName     string
	Description  *string
	IsActive     bool
	IsBuiltIn    bool
	CreatedBy    *uint
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// EnterpriseRolePermission represents a permission assigned to an enterprise role
type EnterpriseRolePermission struct {
	ID                uint
	EnterpriseRoleID  uint
	PermissionCode    string
	IsGranted         bool
	CreatedAt         time.Time
}

// EnterpriseUserCustomPermission represents custom permission overrides for an enterprise user
type EnterpriseUserCustomPermission struct {
	ID               uint
	EnterpriseUserID uint
	EnterpriseID     uint
	PermissionCode   string
	IsGranted        bool
	IsActive         bool
	ExpiresAt        *time.Time
	Reason           *string
	GrantedBy        *uint
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// SystemRoleRepository handles system role operations
type SystemRoleRepository interface {
	// CreateRole creates a new system role
	CreateRole(ctx context.Context, role *SystemRole) error

	// GetRoleByID retrieves a system role by ID
	GetRoleByID(ctx context.Context, roleID uint) (*SystemRole, error)

	// GetRoleByCode retrieves a system role by code
	GetRoleByCode(ctx context.Context, roleCode string) (*SystemRole, error)

	// ListRoles lists all system roles with pagination
	ListRoles(ctx context.Context, limit, offset int) ([]*SystemRole, int, error)

	// UpdateRole updates a system role
	UpdateRole(ctx context.Context, role *SystemRole) error

	// DeleteRole soft deletes a system role (only if not built-in)
	DeleteRole(ctx context.Context, roleID uint) error

	// GetRolePermissions gets all permissions for a role
	GetRolePermissions(ctx context.Context, roleID uint) ([]*SystemRolePermission, error)

	// AssignPermissionToRole assigns a permission to a role
	AssignPermissionToRole(ctx context.Context, roleID uint, permissionCode string, isGranted bool) error

	// RemovePermissionFromRole removes a permission from a role
	RemovePermissionFromRole(ctx context.Context, roleID uint, permissionCode string) error

	// AssignRoleToUser assigns a system role to a user
	AssignRoleToUser(ctx context.Context, userID uint, roleID uint, expiresAt *time.Time, assignedBy *uint) error

	// RemoveRoleFromUser removes a system role from a user
	RemoveRoleFromUser(ctx context.Context, userID uint, roleID uint) error

	// GetUserRoles gets all system roles for a user
	GetUserRoles(ctx context.Context, userID uint) ([]*SystemRole, error)

	// HasUserRole checks if a user has a specific system role
	HasUserRole(ctx context.Context, userID uint, roleCode string) (bool, error)
}

// EnterpriseRoleRepository handles enterprise role operations
type EnterpriseRoleRepository interface {
	// CreateRole creates a new enterprise role
	CreateRole(ctx context.Context, role *EnterpriseRole) error

	// GetRoleByID retrieves an enterprise role by ID
	GetRoleByID(ctx context.Context, roleID uint) (*EnterpriseRole, error)

	// GetRoleByCode retrieves an enterprise role by code within an enterprise
	GetRoleByCode(ctx context.Context, enterpriseID uint, roleCode string) (*EnterpriseRole, error)

	// ListRoles lists all enterprise roles for an enterprise with pagination
	ListRoles(ctx context.Context, enterpriseID uint, limit, offset int) ([]*EnterpriseRole, int, error)

	// UpdateRole updates an enterprise role
	UpdateRole(ctx context.Context, role *EnterpriseRole) error

	// DeleteRole soft deletes an enterprise role (only if not built-in)
	DeleteRole(ctx context.Context, roleID uint) error

	// GetRolePermissions gets all permissions for an enterprise role
	GetRolePermissions(ctx context.Context, roleID uint) ([]*EnterpriseRolePermission, error)

	// AssignPermissionToRole assigns a permission to an enterprise role
	AssignPermissionToRole(ctx context.Context, roleID uint, permissionCode string, isGranted bool) error

	// RemovePermissionFromRole removes a permission from an enterprise role
	RemovePermissionFromRole(ctx context.Context, roleID uint, permissionCode string) error

	// AssignRoleToUser assigns an enterprise role to a user (supports multiple roles)
	AssignRoleToUser(ctx context.Context, enterpriseUserID uint, enterpriseID uint, roleID uint, expiresAt *time.Time, assignedBy *uint) error

	// RemoveRoleFromUser removes an enterprise role from a user
	RemoveRoleFromUser(ctx context.Context, enterpriseUserID uint, roleID uint) error

	// GetUserRoles gets all enterprise roles for a user within an enterprise
	GetUserRoles(ctx context.Context, enterpriseUserID uint, enterpriseID uint) ([]*EnterpriseRole, error)

	// HasUserRole checks if a user has a specific enterprise role
	HasUserRole(ctx context.Context, enterpriseUserID uint, enterpriseID uint, roleCode string) (bool, error)

	// Custom Permission Methods

	// SetCustomPermission sets a custom permission override for a user
	SetCustomPermission(ctx context.Context, perm *EnterpriseUserCustomPermission) error

	// RemoveCustomPermission removes a custom permission override
	RemoveCustomPermission(ctx context.Context, enterpriseUserID uint, enterpriseID uint, permissionCode string) error

	// GetUserCustomPermissions gets all custom permissions for a user
	GetUserCustomPermissions(ctx context.Context, enterpriseUserID uint, enterpriseID uint) ([]*EnterpriseUserCustomPermission, error)
}
