package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// PostgresPermissionRepository implements PermissionRepository for PostgreSQL
type PostgresPermissionRepository struct {
	db interface{}
	// super admin feature via env
	superAdminEnabled bool
	superAdminIDs     map[int]struct{}
	superAdminEmails  map[string]struct{}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresPermissionRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// NewPermissionRepository creates a new permission repository
func NewPermissionRepository(db interface{}) PermissionRepository {
	repo := &PostgresPermissionRepository{db: db}
	repo.initSuperadminFromEnv()
	return repo
}

// GetRoles retrieves all company roles
func (r *PostgresPermissionRepository) GetRoles(ctx context.Context, companyID *int) ([]*models.CompanyRole, error) {
	query := `
		SELECT id, role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at
		FROM company_roles 
		WHERE is_active = true
		ORDER BY is_system_role DESC, role_name ASC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}
	defer rows.Close()

	var roles []*models.CompanyRole
	for rows.Next() {
		role := &models.CompanyRole{}
		err := rows.Scan(
			&role.ID, &role.RoleCode, &role.RoleName, &role.RoleDescription,
			&role.IsSystemRole, &role.IsActive, &role.CreatedAt, &role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}
		roles = append(roles, role)
	}

	return roles, nil
}

// GetRoleByID retrieves a role by ID
func (r *PostgresPermissionRepository) GetRoleByID(ctx context.Context, roleID int) (*models.CompanyRole, error) {
	query := `
		SELECT id, role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at
		FROM company_roles 
		WHERE id = $1`

	exec := r.getExecer()
	role := &models.CompanyRole{}
	err := exec.QueryRowContext(ctx, query, roleID).Scan(
		&role.ID, &role.RoleCode, &role.RoleName, &role.RoleDescription,
		&role.IsSystemRole, &role.IsActive, &role.CreatedAt, &role.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	return role, nil
}

// GetRoleByCode retrieves a role by code
func (r *PostgresPermissionRepository) GetRoleByCode(ctx context.Context, roleCode string) (*models.CompanyRole, error) {
	query := `
		SELECT id, role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at
		FROM company_roles 
		WHERE role_code = $1`

	exec := r.getExecer()
	role := &models.CompanyRole{}
	err := exec.QueryRowContext(ctx, query, roleCode).Scan(
		&role.ID, &role.RoleCode, &role.RoleName, &role.RoleDescription,
		&role.IsSystemRole, &role.IsActive, &role.CreatedAt, &role.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	return role, nil
}

// CreateRole creates a new company role
func (r *PostgresPermissionRepository) CreateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error) {
	query := `
		INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		role.RoleCode, role.RoleName, role.RoleDescription, role.IsSystemRole, role.IsActive,
	).Scan(&role.ID, &role.CreatedAt, &role.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	return role, nil
}

// UpdateRole updates a company role
func (r *PostgresPermissionRepository) UpdateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error) {
	query := `
		UPDATE company_roles SET
			role_name = $2, role_description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND is_system_role = false
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		role.ID, role.RoleName, role.RoleDescription, role.IsActive,
	).Scan(&role.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role not found or is system role")
		}
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	return role, nil
}

// DeleteRole soft deletes a company role
func (r *PostgresPermissionRepository) DeleteRole(ctx context.Context, roleID int) error {
	// Check if role is system role or has users
	checkQuery := `
		SELECT is_system_role, 
			(SELECT COUNT(*) FROM company_users WHERE role_id = $1) as user_count
		FROM company_roles WHERE id = $1`

	exec := r.getExecer()
	var isSystemRole bool
	var userCount int
	err := exec.QueryRowContext(ctx, checkQuery, roleID).Scan(&isSystemRole, &userCount)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("role not found")
		}
		return fmt.Errorf("failed to check role: %w", err)
	}

	if isSystemRole {
		return fmt.Errorf("cannot delete system role")
	}

	if userCount > 0 {
		return fmt.Errorf("cannot delete role with assigned users")
	}

	// Soft delete by setting inactive
	updateQuery := `UPDATE company_roles SET is_active = false WHERE id = $1`
	_, err = exec.ExecContext(ctx, updateQuery, roleID)
	if err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}

	return nil
}

// GetPermissions retrieves all system permissions
func (r *PostgresPermissionRepository) GetPermissions(ctx context.Context) ([]*models.Permission, error) {
	query := `
		SELECT id, permission_code, permission_name, permission_description, 
			   module, resource, action, is_active, created_at
		FROM permissions 
		WHERE is_active = true
		ORDER BY module, resource, action`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}
	defer rows.Close()

	var permissions []*models.Permission
	for rows.Next() {
		permission := &models.Permission{}
		err := rows.Scan(
			&permission.ID, &permission.PermissionCode, &permission.PermissionName,
			&permission.PermissionDescription, &permission.Module, &permission.Resource,
			&permission.Action, &permission.IsActive, &permission.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, permission)
	}

	return permissions, nil
}

// GetPermissionsByModule retrieves permissions by module
func (r *PostgresPermissionRepository) GetPermissionsByModule(ctx context.Context, module string) ([]*models.Permission, error) {
	query := `
		SELECT id, permission_code, permission_name, permission_description, 
			   module, resource, action, is_active, created_at
		FROM permissions 
		WHERE module = $1 AND is_active = true
		ORDER BY resource, action`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, module)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions by module: %w", err)
	}
	defer rows.Close()

	var permissions []*models.Permission
	for rows.Next() {
		permission := &models.Permission{}
		err := rows.Scan(
			&permission.ID, &permission.PermissionCode, &permission.PermissionName,
			&permission.PermissionDescription, &permission.Module, &permission.Resource,
			&permission.Action, &permission.IsActive, &permission.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, permission)
	}

	return permissions, nil
}

// GetRolePermissions retrieves all permissions for a role
func (r *PostgresPermissionRepository) GetRolePermissions(ctx context.Context, roleID int) ([]*models.Permission, error) {
	query := `
		SELECT p.id, p.permission_code, p.permission_name, p.permission_description, 
			   p.module, p.resource, p.action, p.is_active, p.created_at
		FROM permissions p
		JOIN role_permissions rp ON p.id = rp.permission_id
		WHERE rp.role_id = $1 AND rp.is_granted = true AND p.is_active = true
		ORDER BY p.module, p.resource, p.action`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, roleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}
	defer rows.Close()

	var permissions []*models.Permission
	for rows.Next() {
		permission := &models.Permission{}
		err := rows.Scan(
			&permission.ID, &permission.PermissionCode, &permission.PermissionName,
			&permission.PermissionDescription, &permission.Module, &permission.Resource,
			&permission.Action, &permission.IsActive, &permission.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, permission)
	}

	return permissions, nil
}

// SetRolePermissions sets permissions for a role
func (r *PostgresPermissionRepository) SetRolePermissions(ctx context.Context, roleID int, permissionIDs []int) error {
	exec := r.getExecer()

	// First, remove all existing permissions
	deleteQuery := `DELETE FROM role_permissions WHERE role_id = $1`
	_, err := exec.ExecContext(ctx, deleteQuery, roleID)
	if err != nil {
		return fmt.Errorf("failed to clear role permissions: %w", err)
	}

	// Then, add new permissions
	if len(permissionIDs) > 0 {
		valueStrings := make([]string, 0, len(permissionIDs))
		valueArgs := make([]interface{}, 0, len(permissionIDs)*2)

		for i, permissionID := range permissionIDs {
			valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, true)", i*2+1, i*2+2))
			valueArgs = append(valueArgs, roleID, permissionID)
		}

		insertQuery := fmt.Sprintf(
			"INSERT INTO role_permissions (role_id, permission_id, is_granted) VALUES %s",
			strings.Join(valueStrings, ", "),
		)

		_, err = exec.ExecContext(ctx, insertQuery, valueArgs...)
		if err != nil {
			return fmt.Errorf("failed to set role permissions: %w", err)
		}
	}

	return nil
}

// CheckUserPermission checks if a user has a specific permission with inheritance and override logic
func (r *PostgresPermissionRepository) CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	return r.checkUserPermissionWithInheritance(ctx, companyUserID, permissionCode, resourceID, true)
}

// checkUserPermissionWithInheritance implements hierarchical permission checking
func (r *PostgresPermissionRepository) checkUserPermissionWithInheritance(ctx context.Context, companyUserID int, permissionCode string, resourceID *int, enableOverrides bool) (*models.PermissionResult, error) {
	result := &models.PermissionResult{
		HasPermission: false,
		Reason:        "",
		Source:        "",
	}

	exec := r.getExecer()

	// Get user status first
	var userStatus string
	statusQuery := `SELECT status FROM company_users WHERE id = $1`
	err := exec.QueryRowContext(ctx, statusQuery, companyUserID).Scan(&userStatus)
	if err != nil {
		result.Reason = "User not found"
		return result, nil
	}

	if userStatus != "active" {
		result.Reason = "User is not active"
		return result, nil
	}

	// Admin override: treat admin/super_admin as having all permissions
	if isAdmin, adminDesc := r.isAdminUser(ctx, exec, companyUserID); isAdmin {
		result.HasPermission = true
		result.Source = "admin_override"
		if adminDesc == "" {
			result.Reason = "Admin user has all permissions"
		} else {
			result.Reason = fmt.Sprintf("Admin override (%s)", adminDesc)
		}
		return result, nil
	}

	// Permission resolution hierarchy (highest to lowest priority):
	// 1. Custom permissions (explicit overrides)
	// 2. Project-specific permissions (resource-level)
	// 3. Role-based permissions (inherited)

	// Step 1: Check custom permissions (highest priority - can grant or deny)
	if enableOverrides {
		customPermResult := r.checkCustomPermissions(ctx, exec, companyUserID, permissionCode)
		if customPermResult != nil {
			// Custom permission explicitly set (either true or false)
			result.HasPermission = customPermResult.HasPermission
			result.Source = "custom_override"
			result.Reason = customPermResult.Reason
			return result, nil
		}
	}

	// Step 2: Check project-specific permissions
	if resourceID != nil {
		projectPermResult := r.checkProjectPermissions(ctx, exec, companyUserID, permissionCode, *resourceID)
		if projectPermResult != nil && projectPermResult.HasPermission {
			result.HasPermission = true
			result.Source = "project_specific"
			result.Reason = "Permission granted through project-specific assignment"
			return result, nil
		}
	}

	// Step 3: Check role-based permissions (inherited)
	rolePermResult := r.checkRolePermissions(ctx, exec, companyUserID, permissionCode)
	if rolePermResult != nil && rolePermResult.HasPermission {
		result.HasPermission = true
		result.Source = "role_inherited"
		result.Reason = fmt.Sprintf("Permission inherited from role: %s", rolePermResult.Source)
		return result, nil
	}

	// No permission found at any level
	result.Reason = "Permission denied - not granted at any level"
	return result, nil
}

// checkCustomPermissions checks explicit custom permission overrides
func (r *PostgresPermissionRepository) checkCustomPermissions(ctx context.Context, exec execer, companyUserID int, permissionCode string) *models.PermissionResult {
	customPermQuery := `
		SELECT custom_permissions->$2
		FROM company_users 
		WHERE id = $1 AND status = 'active'`

	var customPermValue sql.NullString
	err := exec.QueryRowContext(ctx, customPermQuery, companyUserID, permissionCode).Scan(&customPermValue)

	if err != nil || !customPermValue.Valid {
		return nil // No custom permission set
	}

	result := &models.PermissionResult{}

	switch customPermValue.String {
	case "true":
		result.HasPermission = true
		result.Reason = "Explicitly granted by custom permission"
	case "false":
		result.HasPermission = false
		result.Reason = "Explicitly denied by custom permission"
	default:
		return nil // No explicit permission set
	}

	result.Source = "custom"
	return result
}

// checkProjectPermissions checks project-specific permissions
func (r *PostgresPermissionRepository) checkProjectPermissions(ctx context.Context, exec execer, companyUserID int, permissionCode string, projectID int) *models.PermissionResult {
	projectPermQuery := `
		SELECT can_view_project, can_edit_project, can_delete_project, 
			   can_manage_tasks, can_view_financials, can_manage_members
		FROM company_user_project_permissions 
		WHERE company_user_id = $1 AND project_id = $2
		  AND (permission_end_date IS NULL OR permission_end_date > CURRENT_TIMESTAMP)`

	var canView, canEdit, canDelete, canManageTasks, canViewFinancials, canManageMembers bool
	err := exec.QueryRowContext(ctx, projectPermQuery, companyUserID, projectID).Scan(
		&canView, &canEdit, &canDelete, &canManageTasks, &canViewFinancials, &canManageMembers,
	)

	if err != nil {
		return nil // No project permissions found
	}

	result := &models.PermissionResult{Source: "project"}

	// Map permission codes to project capabilities
	switch permissionCode {
	case "project.detail.read", "project.read":
		result.HasPermission = canView
	case "project.update", "project.write":
		result.HasPermission = canEdit
	case "project.delete":
		result.HasPermission = canDelete
	case "task.create", "task.update", "task.delete", "task.assign", "task.manage":
		result.HasPermission = canManageTasks
	case "finance.contracts.read", "finance.read":
		result.HasPermission = canViewFinancials
	case "project.members.manage", "members.manage":
		result.HasPermission = canManageMembers
	default:
		return nil // Permission not applicable to project level
	}

	if result.HasPermission {
		result.Reason = "Permission granted through project assignment"
	}

	return result
}

// checkRolePermissions checks role-based permissions
func (r *PostgresPermissionRepository) checkRolePermissions(ctx context.Context, exec execer, companyUserID int, permissionCode string) *models.PermissionResult {
	roleQuery := `
		SELECT p.permission_code, r.role_name, r.role_code
		FROM company_users cu
		JOIN company_roles r ON cu.role_id = r.id
		JOIN role_permissions rp ON r.id = rp.role_id
		JOIN permissions p ON rp.permission_id = p.id
		WHERE cu.id = $1 AND p.permission_code = $2 AND rp.is_granted = true 
		  AND cu.status = 'active' AND r.is_active = true AND p.is_active = true`

	var foundPermission, roleName, roleCode string
	err := exec.QueryRowContext(ctx, roleQuery, companyUserID, permissionCode).Scan(&foundPermission, &roleName, &roleCode)

	if err != nil {
		return nil // No role permission found
	}

	return &models.PermissionResult{
		HasPermission: true,
		Source:        fmt.Sprintf("role:%s", roleCode),
		Reason:        fmt.Sprintf("Permission inherited from role '%s'", roleName),
	}
}

// isAdminUser checks whether the given company user is an admin/super_admin or system admin
func (r *PostgresPermissionRepository) isAdminUser(ctx context.Context, exec execer, companyUserID int) (bool, string) {
	query := `
		SELECT r.role_code, u.role, u.id, u.email
		FROM company_users cu
		LEFT JOIN company_roles r ON cu.role_id = r.id
		LEFT JOIN users u ON cu.user_id = u.id
		WHERE cu.id = $1`

	var roleCode sql.NullString
	var userRole sql.NullString
	var userID sql.NullInt32
	var userEmail sql.NullString
	if err := exec.QueryRowContext(ctx, query, companyUserID).Scan(&roleCode, &userRole, &userID, &userEmail); err != nil {
		return false, ""
	}

	// Env-based superadmin override
	if r.superAdminEnabled {
		if userID.Valid {
			if _, ok := r.superAdminIDs[int(userID.Int32)]; ok {
				return true, "env_superadmin:user_id"
			}
		}
		if userEmail.Valid {
			email := strings.ToLower(strings.TrimSpace(userEmail.String))
			if _, ok := r.superAdminEmails[email]; ok && email != "" {
				return true, "env_superadmin:email"
			}
		}
	}

	if roleCode.Valid && (roleCode.String == "super_admin" || roleCode.String == "admin") {
		return true, fmt.Sprintf("company_role:%s", roleCode.String)
	}
	if userRole.Valid && userRole.String == "admin" {
		return true, "user_role:admin"
	}
	return false, ""
}

// CheckMultiplePermissions checks multiple permissions at once
func (r *PostgresPermissionRepository) CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	results := make(map[string]*models.PermissionResult)

	for _, permissionCode := range permissionCodes {
		result, err := r.CheckUserPermission(ctx, companyUserID, permissionCode, resourceID)
		if err != nil {
			return nil, fmt.Errorf("failed to check permission %s: %w", permissionCode, err)
		}
		results[permissionCode] = result
	}

	return results, nil
}

// GetUserPermissions retrieves comprehensive permission summary for a user
func (r *PostgresPermissionRepository) GetUserPermissions(ctx context.Context, companyUserID int) (*models.UserPermissionSummary, error) {
	exec := r.getExecer()

	summary := &models.UserPermissionSummary{
		CompanyUserID:        companyUserID,
		CustomPermissions:    make(map[string]bool),
		ProjectPermissions:   []models.CompanyUserProjectPermission{},
		EffectivePermissions: []models.PermissionResponse{},
	}

	// Get user's basic info and role
	userQuery := `
		SELECT cu.name, cu.role_id, cu.custom_permissions, cu.updated_at,
			   r.role_code, r.role_name, r.role_description, r.is_system_role, r.is_active
		FROM company_users cu
		LEFT JOIN company_roles r ON cu.role_id = r.id
		WHERE cu.id = $1`

	var roleID sql.NullInt32
	var customPermissionsJSON sql.NullString
	var roleCode, roleName sql.NullString
	var roleDescription sql.NullString
	var isSystemRole, isActive sql.NullBool

	err := exec.QueryRowContext(ctx, userQuery, companyUserID).Scan(
		&summary.UserName, &roleID, &customPermissionsJSON, &summary.LastUpdated,
		&roleCode, &roleName, &roleDescription, &isSystemRole, &isActive,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("company user not found")
		}
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}

	// Set role information if user has a role
	if roleID.Valid && roleCode.Valid {
		summary.Role = &models.CompanyRoleResponse{
			ID:              int(roleID.Int32),
			RoleCode:        roleCode.String,
			RoleName:        roleName.String,
			RoleDescription: &roleDescription.String,
			IsSystemRole:    isSystemRole.Bool,
			IsActive:        isActive.Bool,
		}
	}

	// Parse custom permissions
	if customPermissionsJSON.Valid && customPermissionsJSON.String != "" {
		err = json.Unmarshal([]byte(customPermissionsJSON.String), &summary.CustomPermissions)
		if err != nil {
			// If parsing fails, initialize with empty map
			summary.CustomPermissions = make(map[string]bool)
		}
	}

	// Get project permissions
	projectPermQuery := `
		SELECT id, project_id, can_view_project, can_edit_project, can_delete_project,
			   can_manage_tasks, can_view_financials, can_manage_members,
			   permission_start_date, permission_end_date, created_by, created_at, updated_at
		FROM company_user_project_permissions
		WHERE company_user_id = $1 
		  AND (permission_end_date IS NULL OR permission_end_date > CURRENT_TIMESTAMP)
		ORDER BY project_id`

	projectRows, err := exec.QueryContext(ctx, projectPermQuery, companyUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get project permissions: %w", err)
	}
	defer projectRows.Close()

	for projectRows.Next() {
		projectPerm := models.CompanyUserProjectPermission{
			CompanyUserID: companyUserID,
		}
		err := projectRows.Scan(
			&projectPerm.ID, &projectPerm.ProjectID,
			&projectPerm.CanViewProject, &projectPerm.CanEditProject, &projectPerm.CanDeleteProject,
			&projectPerm.CanManageTasks, &projectPerm.CanViewFinancials, &projectPerm.CanManageMembers,
			&projectPerm.PermissionStartDate, &projectPerm.PermissionEndDate,
			&projectPerm.CreatedBy, &projectPerm.CreatedAt, &projectPerm.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project permission: %w", err)
		}
		summary.ProjectPermissions = append(summary.ProjectPermissions, projectPerm)
	}

	// Get effective permissions (role permissions + custom permissions)
	var effectivePermissions []models.PermissionResponse

	// Get role permissions if user has a role
	if roleID.Valid {
		rolePermissions, err := r.GetRolePermissions(ctx, int(roleID.Int32))
		if err == nil {
			for _, perm := range rolePermissions {
				permResponse := perm.ToResponse()
				permResponse.IsGranted = true // Role permissions are granted
				effectivePermissions = append(effectivePermissions, permResponse)
			}
		}
	}

	// Add custom permissions (these can override role permissions)
	allPermissions, err := r.GetPermissions(ctx)
	if err == nil {
		for _, perm := range allPermissions {
			// Check if this permission is overridden by custom permissions
			if customGranted, exists := summary.CustomPermissions[perm.PermissionCode]; exists {
				permResponse := perm.ToResponse()
				permResponse.IsGranted = customGranted

				// Check if this permission is already in effective permissions (from role)
				found := false
				for i, existing := range effectivePermissions {
					if existing.PermissionCode == perm.PermissionCode {
						effectivePermissions[i].IsGranted = customGranted // Override with custom permission
						found = true
						break
					}
				}
				if !found && customGranted {
					// Add custom permission that's not from role
					effectivePermissions = append(effectivePermissions, permResponse)
				}
			}
		}
	}

	summary.EffectivePermissions = effectivePermissions

	return summary, nil
}

// UpdateUserRole updates a user's role
func (r *PostgresPermissionRepository) UpdateUserRole(ctx context.Context, companyUserID int, roleID *int) error {
	query := `UPDATE company_users SET role_id = $2 WHERE id = $1`
	exec := r.getExecer()
	_, err := exec.ExecContext(ctx, query, companyUserID, roleID)
	return err
}

// UpdateUserCustomPermissions updates user's custom permissions
func (r *PostgresPermissionRepository) UpdateUserCustomPermissions(ctx context.Context, companyUserID int, permissions map[string]bool) error {
	// Convert map to JSON
	permissionsJSON, err := marshalCustomFields(permissions)
	if err != nil {
		return fmt.Errorf("failed to marshal permissions: %w", err)
	}

	query := `UPDATE company_users SET custom_permissions = $2 WHERE id = $1`
	exec := r.getExecer()
	_, err = exec.ExecContext(ctx, query, companyUserID, permissionsJSON)
	return err
}

// Additional methods would be implemented similarly...
// For brevity, I'm including placeholder implementations

func (r *PostgresPermissionRepository) GetUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) (*models.CompanyUserProjectPermission, error) {
	query := `
		SELECT id, company_user_id, project_id, can_view_project, can_edit_project, can_delete_project,
			   can_manage_tasks, can_view_financials, can_manage_members,
			   permission_start_date, permission_end_date, created_by, created_at, updated_at
		FROM company_user_project_permissions
		WHERE company_user_id = $1 AND project_id = $2
		  AND (permission_end_date IS NULL OR permission_end_date > CURRENT_TIMESTAMP)`

	exec := r.getExecer()
	permission := &models.CompanyUserProjectPermission{}
	err := exec.QueryRowContext(ctx, query, companyUserID, projectID).Scan(
		&permission.ID, &permission.CompanyUserID, &permission.ProjectID,
		&permission.CanViewProject, &permission.CanEditProject, &permission.CanDeleteProject,
		&permission.CanManageTasks, &permission.CanViewFinancials, &permission.CanManageMembers,
		&permission.PermissionStartDate, &permission.PermissionEndDate,
		&permission.CreatedBy, &permission.CreatedAt, &permission.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No specific permissions found
		}
		return nil, fmt.Errorf("failed to get user project permissions: %w", err)
	}

	return permission, nil
}

func (r *PostgresPermissionRepository) SetUserProjectPermissions(ctx context.Context, permission *models.CompanyUserProjectPermission) error {
	exec := r.getExecer()

	// Upsert the permission record
	query := `
		INSERT INTO company_user_project_permissions (
			company_user_id, project_id, can_view_project, can_edit_project, can_delete_project,
			can_manage_tasks, can_view_financials, can_manage_members,
			permission_start_date, permission_end_date, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (company_user_id, project_id)
		DO UPDATE SET
			can_view_project = EXCLUDED.can_view_project,
			can_edit_project = EXCLUDED.can_edit_project,
			can_delete_project = EXCLUDED.can_delete_project,
			can_manage_tasks = EXCLUDED.can_manage_tasks,
			can_view_financials = EXCLUDED.can_view_financials,
			can_manage_members = EXCLUDED.can_manage_members,
			permission_start_date = EXCLUDED.permission_start_date,
			permission_end_date = EXCLUDED.permission_end_date,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, created_at, updated_at`

	err := exec.QueryRowContext(ctx, query,
		permission.CompanyUserID, permission.ProjectID,
		permission.CanViewProject, permission.CanEditProject, permission.CanDeleteProject,
		permission.CanManageTasks, permission.CanViewFinancials, permission.CanManageMembers,
		permission.PermissionStartDate, permission.PermissionEndDate, permission.CreatedBy,
	).Scan(&permission.ID, &permission.CreatedAt, &permission.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to set user project permissions: %w", err)
	}

	return nil
}

func (r *PostgresPermissionRepository) RemoveUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) error {
	query := `DELETE FROM company_user_project_permissions WHERE company_user_id = $1 AND project_id = $2`
	exec := r.getExecer()
	_, err := exec.ExecContext(ctx, query, companyUserID, projectID)
	if err != nil {
		return fmt.Errorf("failed to remove user project permissions: %w", err)
	}
	return nil
}

func (r *PostgresPermissionRepository) LogPermissionChange(ctx context.Context, log *models.PermissionAuditLog) error {
	oldValueJSON, err := json.Marshal(log.OldValue)
	if err != nil {
		return fmt.Errorf("failed to marshal old value: %w", err)
	}

	newValueJSON, err := json.Marshal(log.NewValue)
	if err != nil {
		return fmt.Errorf("failed to marshal new value: %w", err)
	}

	query := `
		INSERT INTO permission_audit_logs (
			company_user_id, target_user_id, action_type, permission_code,
			resource_type, resource_id, old_value, new_value, reason,
			performed_by, ip_address, user_agent
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, performed_at`

	exec := r.getExecer()
	err = exec.QueryRowContext(ctx, query,
		log.CompanyUserID, log.TargetUserID, log.ActionType, log.PermissionCode,
		log.ResourceType, log.ResourceID, oldValueJSON, newValueJSON, log.Reason,
		log.PerformedBy, log.IPAddress, log.UserAgent,
	).Scan(&log.ID, &log.PerformedAt)

	if err != nil {
		return fmt.Errorf("failed to log permission change: %w", err)
	}

	return nil
}

func (r *PostgresPermissionRepository) GetPermissionAuditLogs(ctx context.Context, companyUserID *int, limit, offset int) ([]*models.PermissionAuditLog, int, error) {
	exec := r.getExecer()

	// Build query conditions
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIndex := 1

	if companyUserID != nil {
		whereClause += fmt.Sprintf(" AND (company_user_id = $%d OR target_user_id = $%d)", argIndex, argIndex+1)
		args = append(args, *companyUserID, *companyUserID)
		argIndex += 2
	}

	// Count total records
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM permission_audit_logs %s", whereClause)
	var totalCount int
	err := exec.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	// Get paginated results
	query := fmt.Sprintf(`
		SELECT id, company_user_id, target_user_id, action_type, permission_code,
			   resource_type, resource_id, old_value, new_value, reason,
			   performed_by, performed_at, ip_address, user_agent
		FROM permission_audit_logs
		%s
		ORDER BY performed_at DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*models.PermissionAuditLog
	for rows.Next() {
		log := &models.PermissionAuditLog{}
		var oldValueJSON, newValueJSON []byte

		err := rows.Scan(
			&log.ID, &log.CompanyUserID, &log.TargetUserID, &log.ActionType,
			&log.PermissionCode, &log.ResourceType, &log.ResourceID,
			&oldValueJSON, &newValueJSON, &log.Reason,
			&log.PerformedBy, &log.PerformedAt, &log.IPAddress, &log.UserAgent,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit log: %w", err)
		}

		// Parse JSON fields
		if err := json.Unmarshal(oldValueJSON, &log.OldValue); err != nil {
			log.OldValue = nil // Set to nil if parsing fails
		}
		if err := json.Unmarshal(newValueJSON, &log.NewValue); err != nil {
			log.NewValue = nil // Set to nil if parsing fails
		}

		logs = append(logs, log)
	}

	return logs, totalCount, nil
}

// GetPermissionInheritanceTrace returns detailed trace of how a permission is resolved
func (r *PostgresPermissionRepository) GetPermissionInheritanceTrace(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionInheritanceTrace, error) {
	exec := r.getExecer()

	trace := &models.PermissionInheritanceTrace{
		CompanyUserID:  companyUserID,
		PermissionCode: permissionCode,
		ResourceID:     resourceID,
		Steps:          []models.PermissionStep{},
	}

	// Step 1: Check custom permissions
	customResult := r.checkCustomPermissions(ctx, exec, companyUserID, permissionCode)
	if customResult != nil {
		trace.Steps = append(trace.Steps, models.PermissionStep{
			Level:         "custom",
			Source:        "custom_override",
			HasPermission: customResult.HasPermission,
			Reason:        customResult.Reason,
			IsOverride:    true,
		})
		trace.FinalResult = customResult.HasPermission
		trace.FinalSource = "custom"
		return trace, nil
	}

	// Step 2: Check project permissions
	if resourceID != nil {
		projectResult := r.checkProjectPermissions(ctx, exec, companyUserID, permissionCode, *resourceID)
		trace.Steps = append(trace.Steps, models.PermissionStep{
			Level:         "project",
			Source:        "project_specific",
			HasPermission: projectResult != nil && projectResult.HasPermission,
			Reason:        "Checked project-specific permissions",
			IsOverride:    false,
		})

		if projectResult != nil && projectResult.HasPermission {
			trace.FinalResult = true
			trace.FinalSource = "project"
			return trace, nil
		}
	}

	// Step 3: Check role permissions
	roleResult := r.checkRolePermissions(ctx, exec, companyUserID, permissionCode)
	trace.Steps = append(trace.Steps, models.PermissionStep{
		Level:         "role",
		Source:        "role_inherited",
		HasPermission: roleResult != nil && roleResult.HasPermission,
		Reason:        "Checked role-based permissions",
		IsOverride:    false,
	})

	if roleResult != nil && roleResult.HasPermission {
		trace.FinalResult = true
		trace.FinalSource = "role"
	} else {
		trace.FinalResult = false
		trace.FinalSource = "none"
	}

	return trace, nil
}

// SetUserPermissionOverride sets a custom permission override for a user
func (r *PostgresPermissionRepository) SetUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string, isGranted bool, reason string) error {
	exec := r.getExecer()

	// Get current custom permissions
	var currentPermissionsJSON sql.NullString
	getQuery := `SELECT custom_permissions FROM company_users WHERE id = $1`
	err := exec.QueryRowContext(ctx, getQuery, companyUserID).Scan(&currentPermissionsJSON)
	if err != nil {
		return fmt.Errorf("failed to get current permissions: %w", err)
	}

	// Parse existing permissions
	currentPermissions := make(map[string]bool)
	if currentPermissionsJSON.Valid && currentPermissionsJSON.String != "" {
		err = json.Unmarshal([]byte(currentPermissionsJSON.String), &currentPermissions)
		if err != nil {
			// If parsing fails, start with empty map
			currentPermissions = make(map[string]bool)
		}
	}

	// Update the specific permission
	currentPermissions[permissionCode] = isGranted

	// Marshal back to JSON
	updatedJSON, err := json.Marshal(currentPermissions)
	if err != nil {
		return fmt.Errorf("failed to marshal updated permissions: %w", err)
	}

	// Update the database
	updateQuery := `UPDATE company_users SET custom_permissions = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err = exec.ExecContext(ctx, updateQuery, companyUserID, updatedJSON)
	if err != nil {
		return fmt.Errorf("failed to update permissions: %w", err)
	}

	// Create pointers for audit log
	targetUserID := companyUserID
	performedBy := companyUserID

	// Log the permission change
	auditLog := &models.PermissionAuditLog{
		CompanyUserID:  &companyUserID,
		TargetUserID:   &targetUserID,
		ActionType:     "permission_override",
		PermissionCode: &permissionCode,
		ResourceType:   nil,
		ResourceID:     nil,
		OldValue:       map[string]interface{}{"granted": !isGranted},
		NewValue:       map[string]interface{}{"granted": isGranted},
		Reason:         &reason,
		PerformedBy:    &performedBy,
	}

	return r.LogPermissionChange(ctx, auditLog)
}

// RemoveUserPermissionOverride removes a custom permission override
func (r *PostgresPermissionRepository) RemoveUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string) error {
	exec := r.getExecer()

	// Get current custom permissions
	var currentPermissionsJSON sql.NullString
	getQuery := `SELECT custom_permissions FROM company_users WHERE id = $1`
	err := exec.QueryRowContext(ctx, getQuery, companyUserID).Scan(&currentPermissionsJSON)
	if err != nil {
		return fmt.Errorf("failed to get current permissions: %w", err)
	}

	// Parse existing permissions
	currentPermissions := make(map[string]bool)
	if currentPermissionsJSON.Valid && currentPermissionsJSON.String != "" {
		err = json.Unmarshal([]byte(currentPermissionsJSON.String), &currentPermissions)
		if err != nil {
			return fmt.Errorf("failed to parse permissions: %w", err)
		}
	}

	// Remove the specific permission override
	delete(currentPermissions, permissionCode)

	// Marshal back to JSON
	updatedJSON, err := json.Marshal(currentPermissions)
	if err != nil {
		return fmt.Errorf("failed to marshal updated permissions: %w", err)
	}

	// Update the database
	updateQuery := `UPDATE company_users SET custom_permissions = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err = exec.ExecContext(ctx, updateQuery, companyUserID, updatedJSON)
	if err != nil {
		return fmt.Errorf("failed to update permissions: %w", err)
	}

	return nil
}

// GetUserPermissionOverrides gets all custom permission overrides for a user
func (r *PostgresPermissionRepository) GetUserPermissionOverrides(ctx context.Context, companyUserID int) (map[string]bool, error) {
	exec := r.getExecer()

	var permissionsJSON sql.NullString
	query := `SELECT custom_permissions FROM company_users WHERE id = $1`
	err := exec.QueryRowContext(ctx, query, companyUserID).Scan(&permissionsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}

	permissions := make(map[string]bool)
	if permissionsJSON.Valid && permissionsJSON.String != "" {
		err = json.Unmarshal([]byte(permissionsJSON.String), &permissions)
		if err != nil {
			return nil, fmt.Errorf("failed to parse permissions: %w", err)
		}
	}

	return permissions, nil
}

// AnalyzePermissionConflicts identifies potential permission conflicts and inheritance issues
func (r *PostgresPermissionRepository) AnalyzePermissionConflicts(ctx context.Context, companyUserID int) (*models.PermissionAnalysis, error) {
	analysis := &models.PermissionAnalysis{
		CompanyUserID: companyUserID,
		Conflicts:     []models.PermissionConflict{},
		Redundancies:  []models.PermissionRedundancy{},
		Gaps:          []models.PermissionGap{},
	}

	// Get all permissions to analyze
	allPermissions, err := r.GetPermissions(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}

	// Get user's current state
	userPermissions, err := r.GetUserPermissions(ctx, companyUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}

	customOverrides, err := r.GetUserPermissionOverrides(ctx, companyUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get custom overrides: %w", err)
	}

	// Analyze each permission
	for _, perm := range allPermissions {
		// Check for conflicts between role and custom permissions
		var roleGrants bool
		if userPermissions.Role != nil {
			rolePerms, err := r.GetRolePermissions(ctx, userPermissions.Role.ID)
			if err == nil {
				for _, rolePerm := range rolePerms {
					if rolePerm.PermissionCode == perm.PermissionCode {
						roleGrants = true
						break
					}
				}
			}
		}

		// Check for custom override
		if customGranted, hasOverride := customOverrides[perm.PermissionCode]; hasOverride {
			if roleGrants && !customGranted {
				// Role grants but custom denies - conflict
				analysis.Conflicts = append(analysis.Conflicts, models.PermissionConflict{
					PermissionCode: perm.PermissionCode,
					RoleGrants:     roleGrants,
					CustomOverride: &customGranted,
					Description:    "Role grants permission but custom override denies it",
				})
			} else if !roleGrants && customGranted {
				// Role doesn't grant but custom does - potential redundancy or intentional override
				analysis.Redundancies = append(analysis.Redundancies, models.PermissionRedundancy{
					PermissionCode: perm.PermissionCode,
					GrantedBy:      []string{"custom"},
					Description:    "Custom permission grants access that role doesn't provide",
				})
			}
		}
	}

	return analysis, nil
}

// Helper function to marshal custom fields - this should be shared utility
func marshalCustomFields(data interface{}) ([]byte, error) {
	return json.Marshal(data)
}

// initSuperadminFromEnv initializes superadmin feature from environment variables
// Supported env vars:
// - FEATURE_SUPERADMIN_ENABLE: "true"/"false" (default: false)
// - SUPER_ADMIN_IDS: comma-separated numeric user IDs
// - SUPER_ADMIN_EMAILS: comma-separated emails
// - SUPER_ADMINS: comma-separated list of emails and/or numeric IDs
func (r *PostgresPermissionRepository) initSuperadminFromEnv() {
	enabledVal := strings.ToLower(strings.TrimSpace(os.Getenv("FEATURE_SUPERADMIN_ENABLE")))
	switch enabledVal {
	case "1", "true", "yes", "y", "on":
		r.superAdminEnabled = true
	default:
		r.superAdminEnabled = false
	}

	r.superAdminIDs = make(map[int]struct{})
	r.superAdminEmails = make(map[string]struct{})

	// Helper to parse CSV list
	parseCSV := func(val string) []string {
		if val == "" {
			return nil
		}
		parts := strings.Split(val, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				out = append(out, p)
			}
		}
		return out
	}

	// SUPER_ADMIN_IDS
	for _, idStr := range parseCSV(os.Getenv("SUPER_ADMIN_IDS")) {
		if id, err := strconv.Atoi(idStr); err == nil {
			r.superAdminIDs[id] = struct{}{}
		}
	}

	// SUPER_ADMIN_EMAILS
	for _, email := range parseCSV(os.Getenv("SUPER_ADMIN_EMAILS")) {
		email = strings.ToLower(strings.TrimSpace(email))
		if email != "" {
			r.superAdminEmails[email] = struct{}{}
		}
	}

	// SUPER_ADMINS (mixed list)
	for _, token := range parseCSV(os.Getenv("SUPER_ADMINS")) {
		if id, err := strconv.Atoi(token); err == nil {
			r.superAdminIDs[id] = struct{}{}
			continue
		}
		email := strings.ToLower(strings.TrimSpace(token))
		if email != "" {
			r.superAdminEmails[email] = struct{}{}
		}
	}
}
