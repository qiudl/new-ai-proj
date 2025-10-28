package interfaces

// PermissionDomain represents the domain (context) in which permissions are checked
// This is a core concept of RBAC v2 dual-domain architecture
type PermissionDomain string

const (
	// SystemDomain represents system-level operations
	// System users operate in this domain with system_roles and system_role_permissions
	SystemDomain PermissionDomain = "system"

	// EnterpriseDomain represents enterprise-level operations
	// Enterprise users operate in this domain with enterprise_roles and enterprise_user_permissions
	EnterpriseDomain PermissionDomain = "enterprise"
)

// UserIdentity represents a unified interface for both system and enterprise users
// This abstraction allows permission checking logic to work uniformly across both domains
type UserIdentity interface {
	// GetUserID returns the unique user identifier
	// For system users: users.id
	// For enterprise users: enterprise_users.id
	GetUserID() uint

	// GetDomain returns the permission domain this user operates in
	// Determines which permission tables to query (system vs enterprise)
	GetDomain() PermissionDomain

	// GetEnterpriseID returns the enterprise ID if this is an enterprise user
	// Returns nil for system users
	// Used for enterprise data isolation checks
	GetEnterpriseID() *uint

	// IsSystemUser returns true if this is a system user
	// System users can access cross-enterprise data with proper permissions
	IsSystemUser() bool

	// IsEnterpriseUser returns true if this is an enterprise user
	// Enterprise users are restricted to their enterprise's data
	IsEnterpriseUser() bool
}

// SystemUserIdentity implements UserIdentity for system users
type SystemUserIdentity struct {
	userID uint
}

// NewSystemUserIdentity creates a new system user identity
func NewSystemUserIdentity(userID uint) UserIdentity {
	return &SystemUserIdentity{
		userID: userID,
	}
}

func (s *SystemUserIdentity) GetUserID() uint {
	return s.userID
}

func (s *SystemUserIdentity) GetDomain() PermissionDomain {
	return SystemDomain
}

func (s *SystemUserIdentity) GetEnterpriseID() *uint {
	return nil
}

func (s *SystemUserIdentity) IsSystemUser() bool {
	return true
}

func (s *SystemUserIdentity) IsEnterpriseUser() bool {
	return false
}

// EnterpriseUserIdentity implements UserIdentity for enterprise users
type EnterpriseUserIdentity struct {
	userID       uint
	enterpriseID uint
}

// NewEnterpriseUserIdentity creates a new enterprise user identity
func NewEnterpriseUserIdentity(userID uint, enterpriseID uint) UserIdentity {
	return &EnterpriseUserIdentity{
		userID:       userID,
		enterpriseID: enterpriseID,
	}
}

func (e *EnterpriseUserIdentity) GetUserID() uint {
	return e.userID
}

func (e *EnterpriseUserIdentity) GetDomain() PermissionDomain {
	return EnterpriseDomain
}

func (e *EnterpriseUserIdentity) GetEnterpriseID() *uint {
	return &e.enterpriseID
}

func (e *EnterpriseUserIdentity) IsSystemUser() bool {
	return false
}

func (e *EnterpriseUserIdentity) IsEnterpriseUser() bool {
	return true
}
