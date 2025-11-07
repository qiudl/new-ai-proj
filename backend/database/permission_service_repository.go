package database

import (
	"context"
	"database/sql"
	"fmt"
)

// PostgresPermissionServiceRepository implements PermissionServiceRepository for PostgreSQL
type PostgresPermissionServiceRepository struct {
	db execer
}

// NewPermissionServiceRepository creates a new PostgresPermissionServiceRepository
func NewPermissionServiceRepository(db execer) PermissionServiceRepository {
	return &PostgresPermissionServiceRepository{db: db}
}

// ============================================================================
// USER IDENTIFICATION AND ADMIN CHECKS
// ============================================================================

// IsSystemAdmin checks if a user is a system-level admin in users table
func (r *PostgresPermissionServiceRepository) IsSystemAdmin(ctx context.Context, userID int) (bool, error) {
	if userID == 0 {
		return false, nil
	}

	var role, status string
	query := `SELECT role, status FROM users WHERE id = $1 LIMIT 1`
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&role, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("failed to check system admin: %w", err)
	}

	if status != "active" {
		return false, nil
	}

	return role == "admin", nil
}

// GetCompanyUserID retrieves the company_user_id for a given user_id
func (r *PostgresPermissionServiceRepository) GetCompanyUserID(ctx context.Context, userID int) (int, error) {
	var companyUserID int
	query := `SELECT id FROM company_user WHERE user_id = $1 LIMIT 1`
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&companyUserID)
	if err != nil {
		return 0, fmt.Errorf("failed to get company user ID: %w", err)
	}
	return companyUserID, nil
}

// ============================================================================
// PROJECT ACCESS QUERIES
// ============================================================================

// GetUserAccessibleProjects returns all projects that user has access to
func (r *PostgresPermissionServiceRepository) GetUserAccessibleProjects(ctx context.Context, userID int) ([]int, error) {
	query := `
		SELECT DISTINCT p.id
		FROM project p
		LEFT JOIN company_user_project_permission cupp ON p.id = cupp.project_id
		LEFT JOIN company_user cu ON cupp.company_user_id = cu.id
		WHERE cu.user_id = $1 AND cupp.can_view_project = true
		OR p.id IN (
			SELECT DISTINCT project_id
			FROM task
			WHERE assignee_id = $1
		)
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query accessible projects: %w", err)
	}
	defer rows.Close()

	var projectIDs []int
	for rows.Next() {
		var projectID int
		if err := rows.Scan(&projectID); err != nil {
			return nil, fmt.Errorf("failed to scan project ID: %w", err)
		}
		projectIDs = append(projectIDs, projectID)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return projectIDs, nil
}

// GetProjectPermissions retrieves project-specific permissions for a user
func (r *PostgresPermissionServiceRepository) GetProjectPermissions(ctx context.Context, companyUserID int, projectID int) (*ProjectPermissionData, error) {
	query := `
		SELECT
			can_view_project, can_edit_project, can_delete_project,
			can_manage_tasks, can_view_financials, can_manage_members
		FROM company_user_project_permission
		WHERE company_user_id = $1 AND project_id = $2
		AND (permission_end_date IS NULL OR permission_end_date > NOW())
	`

	var permissions ProjectPermissionData
	err := r.db.QueryRowContext(ctx, query, companyUserID, projectID).Scan(
		&permissions.CanViewProject,
		&permissions.CanEditProject,
		&permissions.CanDeleteProject,
		&permissions.CanManageTasks,
		&permissions.CanViewFinancials,
		&permissions.CanManageMembers,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No permissions found
		}
		return nil, fmt.Errorf("failed to get project permissions: %w", err)
	}

	return &permissions, nil
}

// ============================================================================
// CUSTOM PERMISSION QUERIES
// ============================================================================

// CheckCustomPermission checks for user-specific permission overrides
func (r *PostgresPermissionServiceRepository) CheckCustomPermission(ctx context.Context, userID int, permissionCode string) (bool, bool, error) {
	query := `
		SELECT is_granted
		FROM user_custom_permission
		WHERE user_id = $1 AND permission_code = $2 AND is_active = true
		ORDER BY created_at DESC
		LIMIT 1
	`

	var isGranted bool
	err := r.db.QueryRowContext(ctx, query, userID, permissionCode).Scan(&isGranted)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, false, nil // No custom permission set
		}
		return false, false, fmt.Errorf("failed to check custom permission: %w", err)
	}

	return true, isGranted, nil
}

// ============================================================================
// ROLE PERMISSION QUERIES
// ============================================================================

// GetUserRolePermissions returns all role-based permissions for a user
func (r *PostgresPermissionServiceRepository) GetUserRolePermissions(ctx context.Context, userID int) (map[string]bool, error) {
	query := `
		SELECT DISTINCT p.permission_code, rp.is_granted
		FROM company_user cu
		JOIN company_role cr ON cu.role_id = cr.id
		JOIN role_permission rp ON cr.id = rp.role_id
		JOIN permission p ON rp.permission_id = p.id
		WHERE cu.user_id = $1 AND cr.is_active = true AND p.is_active = true
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query role permissions: %w", err)
	}
	defer rows.Close()

	permissions := make(map[string]bool)
	for rows.Next() {
		var permCode string
		var isGranted bool
		if err := rows.Scan(&permCode, &isGranted); err != nil {
			return nil, fmt.Errorf("failed to scan role permission: %w", err)
		}
		permissions[permCode] = isGranted
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("role permissions rows error: %w", err)
	}

	return permissions, nil
}

// ============================================================================
// DYNAMIC PERMISSION QUERIES
// ============================================================================

// CheckPermissionDelegationWithProject checks for active delegations with project context
func (r *PostgresPermissionServiceRepository) CheckPermissionDelegationWithProject(ctx context.Context, userID int, permissionCode string, projectID int) (bool, string, string, error) {
	query := `
		SELECT delegator_name, reason
		FROM permission_delegation pd
		WHERE pd.delegate_id = $1
		AND pd.is_active = true
		AND pd.valid_from <= NOW()
		AND pd.valid_until > NOW()
		AND $2 = ANY(pd.permission_codes)
		AND (pd.resource_type = 'project' AND pd.resource_id = $3)
	`

	var delegatorName, reason string
	err := r.db.QueryRowContext(ctx, query, userID, permissionCode, projectID).Scan(&delegatorName, &reason)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, "", "", nil
		}
		return false, "", "", fmt.Errorf("failed to check delegation: %w", err)
	}

	return true, delegatorName, reason, nil
}

// CheckPermissionDelegationWithoutProject checks for active delegations without project context
func (r *PostgresPermissionServiceRepository) CheckPermissionDelegationWithoutProject(ctx context.Context, userID int, permissionCode string) (bool, string, string, error) {
	query := `
		SELECT delegator_name, reason
		FROM permission_delegation pd
		WHERE pd.delegate_id = $1
		AND pd.is_active = true
		AND pd.valid_from <= NOW()
		AND pd.valid_until > NOW()
		AND $2 = ANY(pd.permission_codes)
	`

	var delegatorName, reason string
	err := r.db.QueryRowContext(ctx, query, userID, permissionCode).Scan(&delegatorName, &reason)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, "", "", nil
		}
		return false, "", "", fmt.Errorf("failed to check delegation: %w", err)
	}

	return true, delegatorName, reason, nil
}

// CheckTemporaryPermission checks for temporary permissions from approved requests
func (r *PostgresPermissionServiceRepository) CheckTemporaryPermission(ctx context.Context, userID int, permissionCode string) (bool, string, error) {
	query := `
		SELECT pr.justification
		FROM permission_request pr
		WHERE pr.requester_id = $1
		AND pr.permission_code = $2
		AND pr.status = 'approved'
		AND pr.expires_at > NOW()
	`

	var justification string
	err := r.db.QueryRowContext(ctx, query, userID, permissionCode).Scan(&justification)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, "", nil
		}
		return false, "", fmt.Errorf("failed to check temporary permission: %w", err)
	}

	return true, justification, nil
}

// ============================================================================
// ADMINISTRATIVE OPERATIONS
// ============================================================================

// UpsertPermission inserts or updates a permission in the database
func (r *PostgresPermissionServiceRepository) UpsertPermission(ctx context.Context, code, name, description, module, resource, action string, isActive bool) error {
	query := `
		INSERT INTO permission (
			permission_code, permission_name, permission_description,
			module, resource, action, is_active, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (permission_code) DO UPDATE SET
			permission_name = EXCLUDED.permission_name,
			permission_description = EXCLUDED.permission_description,
			module = EXCLUDED.module,
			resource = EXCLUDED.resource,
			action = EXCLUDED.action,
			is_active = EXCLUDED.is_active
	`

	_, err := r.db.ExecContext(ctx, query, code, name, description, module, resource, action, isActive)
	if err != nil {
		return fmt.Errorf("failed to upsert permission %s: %w", code, err)
	}

	return nil
}

// CreateRoleRecord creates a new role record and returns its ID
func (r *PostgresPermissionServiceRepository) CreateRoleRecord(ctx context.Context, roleCode, roleName, description string) (int, error) {
	var roleID int
	query := `
		INSERT INTO company_role (role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, false, true, NOW(), NOW())
		RETURNING id
	`

	err := r.db.QueryRowContext(ctx, query, roleCode, roleName, description).Scan(&roleID)
	if err != nil {
		return 0, fmt.Errorf("failed to create role: %w", err)
	}

	return roleID, nil
}

// GetPermissionIDByCode retrieves the permission ID for a given permission code
func (r *PostgresPermissionServiceRepository) GetPermissionIDByCode(ctx context.Context, permissionCode string) (int, error) {
	var permID int
	query := `SELECT id FROM permission WHERE permission_code = $1`
	err := r.db.QueryRowContext(ctx, query, permissionCode).Scan(&permID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, nil // Permission not found
		}
		return 0, fmt.Errorf("failed to get permission ID: %w", err)
	}
	return permID, nil
}

// AssignPermissionToRole assigns a permission to a role
func (r *PostgresPermissionServiceRepository) AssignPermissionToRole(ctx context.Context, roleID int, permissionID int) error {
	query := `
		INSERT INTO role_permission (role_id, permission_id, is_granted, created_at)
		VALUES ($1, $2, true, NOW())
	`

	_, err := r.db.ExecContext(ctx, query, roleID, permissionID)
	if err != nil {
		return fmt.Errorf("failed to assign permission to role: %w", err)
	}

	return nil
}

// UpdateUserRole updates a user's role assignment
func (r *PostgresPermissionServiceRepository) UpdateUserRole(ctx context.Context, userID int, roleID int) error {
	query := `
		UPDATE company_user
		SET role_id = $1, updated_at = NOW()
		WHERE user_id = $2
	`

	_, err := r.db.ExecContext(ctx, query, roleID, userID)
	if err != nil {
		return fmt.Errorf("failed to assign role to user: %w", err)
	}

	return nil
}

// UpsertProjectPermissions inserts or updates project permissions for a user
func (r *PostgresPermissionServiceRepository) UpsertProjectPermissions(ctx context.Context, companyUserID int, projectID int, permissions *ProjectPermissionData) error {
	query := `
		INSERT INTO company_user_project_permission (
			company_user_id, project_id, can_view_project, can_edit_project,
			can_delete_project, can_manage_tasks, can_view_financials,
			can_manage_members, permission_start_date, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
		ON CONFLICT (company_user_id, project_id) DO UPDATE SET
			can_view_project = EXCLUDED.can_view_project,
			can_edit_project = EXCLUDED.can_edit_project,
			can_delete_project = EXCLUDED.can_delete_project,
			can_manage_tasks = EXCLUDED.can_manage_tasks,
			can_view_financials = EXCLUDED.can_view_financials,
			can_manage_members = EXCLUDED.can_manage_members,
			updated_at = NOW()
	`

	_, err := r.db.ExecContext(ctx, query,
		companyUserID,
		projectID,
		permissions.CanViewProject,
		permissions.CanEditProject,
		permissions.CanDeleteProject,
		permissions.CanManageTasks,
		permissions.CanViewFinancials,
		permissions.CanManageMembers,
	)
	if err != nil {
		return fmt.Errorf("failed to upsert project permissions: %w", err)
	}

	return nil
}
