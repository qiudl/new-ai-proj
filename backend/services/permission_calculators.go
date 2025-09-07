package services

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/go-redis/redis/v8"
)

// ============================================================================
// SYSTEM PERMISSION CALCULATOR
// ============================================================================

// SystemPermissionCalculator handles system-level permissions
type SystemPermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewSystemPermissionCalculator creates a new system permission calculator
func NewSystemPermissionCalculator(db *sql.DB, cache *redis.Client) *SystemPermissionCalculator {
	return &SystemPermissionCalculator{
		db:    db,
		cache: cache,
	}
}

// Calculate checks system-level permissions
func (c *SystemPermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	// System permissions are only for system users with admin roles
	if check.Subject.Type != SubjectSystemUser {
		return &PermissionResult{
			Granted:  false,
			Source:   LevelSystem,
			Reason:   "Not a system user",
			Evidence: []PermissionEvidence{},
		}, nil
	}
	
	// Check if user has system admin role
	hasSystemAdmin, err := c.checkSystemAdminRole(ctx, check.Subject.ID)
	if err != nil {
		return nil, err
	}
	
	evidence := []PermissionEvidence{
		{
			Level:    LevelSystem,
			Source:   "system_admin_role",
			Granted:  hasSystemAdmin,
			Priority: 1000,
		},
	}
	
	return &PermissionResult{
		Granted:  hasSystemAdmin,
		Source:   LevelSystem,
		Reason:   c.buildSystemReason(hasSystemAdmin),
		Evidence: evidence,
	}, nil
}

// GetPriority returns the priority of system permissions (highest)
func (c *SystemPermissionCalculator) GetPriority() int {
	return 1000
}

// GetLevel returns the permission level
func (c *SystemPermissionCalculator) GetLevel() PermissionLevel {
	return LevelSystem
}

// SupportsSubject checks if this calculator supports the subject type
func (c *SystemPermissionCalculator) SupportsSubject(subjectType SubjectType) bool {
	return subjectType == SubjectSystemUser
}

// checkSystemAdminRole checks if the user has system admin role
func (c *SystemPermissionCalculator) checkSystemAdminRole(ctx context.Context, userID int) (bool, error) {
	query := `
		SELECT role FROM system_users 
		WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL
	`
	
	var role string
	err := c.db.QueryRowContext(ctx, query, userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	
	return role == "super_admin" || role == "admin", nil
}

// buildSystemReason builds reason string for system permissions
func (c *SystemPermissionCalculator) buildSystemReason(granted bool) string {
	if granted {
		return "System administrator has full access"
	}
	return "System permissions require administrator role"
}

// ============================================================================
// ENTERPRISE PERMISSION CALCULATOR
// ============================================================================

// EnterprisePermissionCalculator handles enterprise-level permissions
type EnterprisePermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewEnterprisePermissionCalculator creates a new enterprise permission calculator
func NewEnterprisePermissionCalculator(db *sql.DB, cache *redis.Client) *EnterprisePermissionCalculator {
	return &EnterprisePermissionCalculator{
		db:    db,
		cache: cache,
	}
}

// Calculate checks enterprise-level permissions
func (c *EnterprisePermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	if check.Subject.Type != SubjectEnterpriseUser {
		return &PermissionResult{
			Granted:  false,
			Source:   LevelEnterprise,
			Evidence: []PermissionEvidence{},
		}, nil
	}
	
	evidence := []PermissionEvidence{}
	
	// Check enterprise admin override (access_level = 5)
	if check.Subject.AccessLevel != nil && *check.Subject.AccessLevel >= 5 {
		evidence = append(evidence, PermissionEvidence{
			Level:    LevelEnterprise,
			Source:   "enterprise_admin_override",
			Granted:  true,
			Priority: 900,
		})
		
		return &PermissionResult{
			Granted:  true,
			Source:   LevelEnterprise,
			Reason:   "Enterprise administrator has full access",
			Evidence: evidence,
		}, nil
	}
	
	// Check role-based permissions
	rolePermissions, err := c.checkRolePermissions(ctx, check)
	if err != nil {
		return nil, err
	}
	
	if rolePermissions {
		evidence = append(evidence, PermissionEvidence{
			Level:    LevelEnterprise,
			Source:   "enterprise_role",
			Granted:  true,
			Priority: 800,
		})
	}
	
	return &PermissionResult{
		Granted:  rolePermissions,
		Source:   LevelEnterprise,
		Reason:   c.buildEnterpriseReason(rolePermissions),
		Evidence: evidence,
	}, nil
}

// GetPriority returns the priority of enterprise permissions
func (c *EnterprisePermissionCalculator) GetPriority() int {
	return 900
}

// GetLevel returns the permission level
func (c *EnterprisePermissionCalculator) GetLevel() PermissionLevel {
	return LevelEnterprise
}

// SupportsSubject checks if this calculator supports the subject type
func (c *EnterprisePermissionCalculator) SupportsSubject(subjectType SubjectType) bool {
	return subjectType == SubjectEnterpriseUser
}

// checkRolePermissions checks role-based permissions for enterprise user
func (c *EnterprisePermissionCalculator) checkRolePermissions(ctx context.Context, check *PermissionCheck) (bool, error) {
	permissionCode := fmt.Sprintf("%s.%s", check.Object.Type, check.Action)
	
	query := `
		SELECT COUNT(*) FROM enterprise_users eu
		JOIN company_roles cr ON eu.role_id = cr.id
		JOIN role_permissions rp ON cr.id = rp.role_id
		JOIN permissions p ON rp.permission_id = p.id
		WHERE eu.id = $1 
			AND eu.enterprise_id = $2
			AND p.permission_code = $3
			AND rp.is_granted = TRUE
			AND eu.status = 'active'
			AND eu.deleted_at IS NULL
			AND cr.is_active = TRUE
			AND p.is_active = TRUE
	`
	
	var count int
	err := c.db.QueryRowContext(ctx, query, 
		check.Subject.ID, 
		check.Subject.EnterpriseID, 
		permissionCode,
	).Scan(&count)
	
	if err != nil {
		return false, err
	}
	
	return count > 0, nil
}

// buildEnterpriseReason builds reason string for enterprise permissions
func (c *EnterprisePermissionCalculator) buildEnterpriseReason(granted bool) string {
	if granted {
		return "Permission granted by enterprise role"
	}
	return "No matching enterprise role permissions"
}

// ============================================================================
// USER PERMISSION CALCULATOR
// ============================================================================

// UserPermissionCalculator handles user-specific permission overrides
type UserPermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewUserPermissionCalculator creates a new user permission calculator
func NewUserPermissionCalculator(db *sql.DB, cache *redis.Client) *UserPermissionCalculator {
	return &UserPermissionCalculator{
		db:    db,
		cache: cache,
	}
}

// Calculate checks user-specific permission overrides
func (c *UserPermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	if check.Subject.Type != SubjectEnterpriseUser {
		return &PermissionResult{
			Granted:  false,
			Source:   LevelUser,
			Evidence: []PermissionEvidence{},
		}, nil
	}
	
	// Check custom permissions for the user
	hasCustomPermission, granted, err := c.checkCustomPermissions(ctx, check)
	if err != nil {
		return nil, err
	}
	
	evidence := []PermissionEvidence{}
	
	if hasCustomPermission {
		evidence = append(evidence, PermissionEvidence{
			Level:    LevelUser,
			Source:   "custom_permission",
			Granted:  granted,
			Priority: 500,
		})
		
		return &PermissionResult{
			Granted:  granted,
			Source:   LevelUser,
			Reason:   c.buildUserReason(granted),
			Evidence: evidence,
		}, nil
	}
	
	return &PermissionResult{
		Granted:  false,
		Source:   LevelUser,
		Reason:   "No custom permissions found",
		Evidence: evidence,
	}, nil
}

// GetPriority returns the priority of user permissions
func (c *UserPermissionCalculator) GetPriority() int {
	return 500
}

// GetLevel returns the permission level
func (c *UserPermissionCalculator) GetLevel() PermissionLevel {
	return LevelUser
}

// SupportsSubject checks if this calculator supports the subject type
func (c *UserPermissionCalculator) SupportsSubject(subjectType SubjectType) bool {
	return subjectType == SubjectEnterpriseUser
}

// checkCustomPermissions checks if user has custom permission overrides
func (c *UserPermissionCalculator) checkCustomPermissions(ctx context.Context, check *PermissionCheck) (bool, bool, error) {
	// This would check a user_custom_permissions table
	// For now, return false as the table doesn't exist yet
	
	permissionCode := fmt.Sprintf("%s.%s", check.Object.Type, check.Action)
	
	query := `
		SELECT is_granted FROM user_custom_permissions
		WHERE user_id = $1 AND permission_code = $2 AND is_active = TRUE
	`
	
	var isGranted bool
	err := c.db.QueryRowContext(ctx, query, check.Subject.ID, permissionCode).Scan(&isGranted)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, false, nil // No custom permission found
		}
		return false, false, err
	}
	
	return true, isGranted, nil
}

// buildUserReason builds reason string for user permissions
func (c *UserPermissionCalculator) buildUserReason(granted bool) string {
	if granted {
		return "Permission explicitly granted by custom override"
	}
	return "Permission explicitly denied by custom override"
}

// ============================================================================
// PROJECT PERMISSION CALCULATOR
// ============================================================================

// ProjectPermissionCalculator handles project-specific permissions
type ProjectPermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewProjectPermissionCalculator creates a new project permission calculator
func NewProjectPermissionCalculator(db *sql.DB, cache *redis.Client) *ProjectPermissionCalculator {
	return &ProjectPermissionCalculator{
		db:    db,
		cache: cache,
	}
}

// Calculate checks project-specific permissions
func (c *ProjectPermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	if check.Subject.Type != SubjectEnterpriseUser {
		return &PermissionResult{
			Granted:  false,
			Source:   LevelProject,
			Evidence: []PermissionEvidence{},
		}, nil
	}
	
	// Only check project permissions if we're dealing with project resources
	if check.Object.Type != UnifiedResourceProject && check.Object.Type != UnifiedResourceTask && check.Object.Type != UnifiedResourceDocument {
		return &PermissionResult{
			Granted:  false,
			Source:   LevelProject,
			Evidence: []PermissionEvidence{},
		}, nil
	}
	
	projectID := check.Object.ID
	if check.Object.Type != UnifiedResourceProject {
		// For non-project resources, we need to find the project ID
		var err error
		projectID, err = c.getProjectIDForResource(ctx, check.Object)
		if err != nil {
			return nil, err
		}
	}
	
	if projectID == nil {
		return &PermissionResult{
			Granted:  false,
			Source:   LevelProject,
			Evidence: []PermissionEvidence{},
		}, nil
	}
	
	// Check project-specific permissions
	hasPermission, err := c.checkProjectPermissions(ctx, check.Subject.ID, *projectID, PermissionAction(check.Action))
	if err != nil {
		return nil, err
	}
	
	evidence := []PermissionEvidence{}
	if hasPermission {
		evidence = append(evidence, PermissionEvidence{
			Level:    LevelProject,
			Source:   "project_permission",
			Granted:  true,
			Priority: 600,
		})
	}
	
	return &PermissionResult{
		Granted:  hasPermission,
		Source:   LevelProject,
		Reason:   c.buildProjectReason(hasPermission),
		Evidence: evidence,
	}, nil
}

// GetPriority returns the priority of project permissions
func (c *ProjectPermissionCalculator) GetPriority() int {
	return 600
}

// GetLevel returns the permission level
func (c *ProjectPermissionCalculator) GetLevel() PermissionLevel {
	return LevelProject
}

// SupportsSubject checks if this calculator supports the subject type
func (c *ProjectPermissionCalculator) SupportsSubject(subjectType SubjectType) bool {
	return subjectType == SubjectEnterpriseUser
}

// getProjectIDForResource finds the project ID for a given resource
func (c *ProjectPermissionCalculator) getProjectIDForResource(ctx context.Context, object PermissionObject) (*int, error) {
	if object.ID == nil {
		return nil, nil
	}
	
	var query string
	var projectID int
	
	switch object.Type {
	case UnifiedResourceTask:
		query = "SELECT project_id FROM tasks WHERE id = $1"
	case UnifiedResourceDocument:
		query = "SELECT project_id FROM documents WHERE id = $1"
	default:
		return nil, nil
	}
	
	err := c.db.QueryRowContext(ctx, query, *object.ID).Scan(&projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	
	return &projectID, nil
}

// checkProjectPermissions checks if user has specific permissions for the project
func (c *ProjectPermissionCalculator) checkProjectPermissions(ctx context.Context, userID, projectID int, action PermissionAction) (bool, error) {
	// Check company_user_project_permissions table
	query := `
		SELECT 
			CASE 
				WHEN $3 = 'read' THEN can_view_project
				WHEN $3 = 'update' THEN can_edit_project
				WHEN $3 = 'delete' THEN can_delete_project
				WHEN $3 = 'manage' THEN can_manage_members
				ELSE FALSE
			END as has_permission
		FROM company_user_project_permissions
		WHERE company_user_id = $1 AND project_id = $2
			AND (permission_end_date IS NULL OR permission_end_date > CURRENT_TIMESTAMP)
	`
	
	var hasPermission bool
	err := c.db.QueryRowContext(ctx, query, userID, projectID, string(action)).Scan(&hasPermission)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	
	return hasPermission, nil
}

// buildProjectReason builds reason string for project permissions
func (c *ProjectPermissionCalculator) buildProjectReason(granted bool) string {
	if granted {
		return "Permission granted by project-specific assignment"
	}
	return "No project-specific permissions found"
}

// ============================================================================
// DEPARTMENT PERMISSION CALCULATOR (Placeholder)
// ============================================================================

// DepartmentPermissionCalculator handles department-level permissions
type DepartmentPermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewDepartmentPermissionCalculator creates a new department permission calculator
func NewDepartmentPermissionCalculator(db *sql.DB, cache *redis.Client) *DepartmentPermissionCalculator {
	return &DepartmentPermissionCalculator{db: db, cache: cache}
}

func (c *DepartmentPermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	// Placeholder implementation - department permissions not fully implemented yet
	return &PermissionResult{
		Granted:  false,
		Source:   LevelDepartment,
		Reason:   "Department permissions not implemented",
		Evidence: []PermissionEvidence{},
	}, nil
}

func (c *DepartmentPermissionCalculator) GetPriority() int { return 800 }
func (c *DepartmentPermissionCalculator) GetLevel() PermissionLevel { return LevelDepartment }
func (c *DepartmentPermissionCalculator) SupportsSubject(subjectType SubjectType) bool {
	return subjectType == SubjectEnterpriseUser
}

// ============================================================================
// POSITION PERMISSION CALCULATOR (Placeholder)
// ============================================================================

// PositionPermissionCalculator handles position/role-level permissions
type PositionPermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewPositionPermissionCalculator creates a new position permission calculator
func NewPositionPermissionCalculator(db *sql.DB, cache *redis.Client) *PositionPermissionCalculator {
	return &PositionPermissionCalculator{db: db, cache: cache}
}

func (c *PositionPermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	// Placeholder implementation - position permissions not fully implemented yet
	return &PermissionResult{
		Granted:  false,
		Source:   LevelPosition,
		Reason:   "Position permissions not implemented",
		Evidence: []PermissionEvidence{},
	}, nil
}

func (c *PositionPermissionCalculator) GetPriority() int { return 700 }
func (c *PositionPermissionCalculator) GetLevel() PermissionLevel { return LevelPosition }
func (c *PositionPermissionCalculator) SupportsSubject(subjectType SubjectType) bool {
	return subjectType == SubjectEnterpriseUser
}

// ============================================================================
// DELEGATED PERMISSION CALCULATOR (Placeholder)
// ============================================================================

// DelegatedPermissionCalculator handles delegated permissions
type DelegatedPermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewDelegatedPermissionCalculator creates a new delegated permission calculator
func NewDelegatedPermissionCalculator(db *sql.DB, cache *redis.Client) *DelegatedPermissionCalculator {
	return &DelegatedPermissionCalculator{db: db, cache: cache}
}

func (c *DelegatedPermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	// Placeholder implementation - delegated permissions not implemented yet
	return &PermissionResult{
		Granted:  false,
		Source:   LevelDelegated,
		Reason:   "Delegated permissions not implemented",
		Evidence: []PermissionEvidence{},
	}, nil
}

func (c *DelegatedPermissionCalculator) GetPriority() int { return 400 }
func (c *DelegatedPermissionCalculator) GetLevel() PermissionLevel { return LevelDelegated }
func (c *DelegatedPermissionCalculator) SupportsSubject(subjectType SubjectType) bool {
	return subjectType == SubjectEnterpriseUser
}

// ============================================================================
// POLICY PERMISSION CALCULATOR (Placeholder)
// ============================================================================

// PolicyPermissionCalculator handles policy-based permissions
type PolicyPermissionCalculator struct {
	db    *sql.DB
	cache *redis.Client
}

// NewPolicyPermissionCalculator creates a new policy permission calculator
func NewPolicyPermissionCalculator(db *sql.DB, cache *redis.Client) *PolicyPermissionCalculator {
	return &PolicyPermissionCalculator{db: db, cache: cache}
}

func (c *PolicyPermissionCalculator) Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	// Placeholder implementation - policy permissions not implemented yet
	return &PermissionResult{
		Granted:  false,
		Source:   LevelPolicy,
		Reason:   "Policy permissions not implemented",
		Evidence: []PermissionEvidence{},
	}, nil
}

func (c *PolicyPermissionCalculator) GetPriority() int { return 300 }
func (c *PolicyPermissionCalculator) GetLevel() PermissionLevel { return LevelPolicy }
func (c *PolicyPermissionCalculator) SupportsSubject(subjectType SubjectType) bool { return true }