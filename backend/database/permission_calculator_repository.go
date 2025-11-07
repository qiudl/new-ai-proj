package database

import (
	"context"
	"database/sql"
)

// PostgresPermissionCalculatorRepository implements PermissionCalculatorRepository for PostgreSQL
type PostgresPermissionCalculatorRepository struct {
	db execer
}

// NewPermissionCalculatorRepository creates a new PostgresPermissionCalculatorRepository
func NewPermissionCalculatorRepository(db execer) PermissionCalculatorRepository {
	return &PostgresPermissionCalculatorRepository{db: db}
}

// CheckSystemAdminRole checks if the user has system admin role
func (r *PostgresPermissionCalculatorRepository) CheckSystemAdminRole(ctx context.Context, userID int) (bool, error) {
	query := `
		SELECT role FROM system_users
		WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL
	`

	var role string
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	return role == "super_admin" || role == "admin", nil
}

// CheckEnterpriseRolePermissions checks role-based permissions for enterprise user
func (r *PostgresPermissionCalculatorRepository) CheckEnterpriseRolePermissions(ctx context.Context, userID int, enterpriseID int, permissionCode string) (bool, error) {
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
	err := r.db.QueryRowContext(ctx, query, userID, enterpriseID, permissionCode).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// CheckCustomPermission checks if user has custom permission override
func (r *PostgresPermissionCalculatorRepository) CheckCustomPermission(ctx context.Context, userID int, permissionCode string) (isSet bool, isGranted bool, err error) {
	query := `
		SELECT is_granted
		FROM company_user_permissions
		WHERE company_user_id = $1 AND permission_code = $2
	`

	var granted bool
	err = r.db.QueryRowContext(ctx, query, userID, permissionCode).Scan(&granted)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, false, nil // No custom permission found
		}
		return false, false, err
	}

	return true, granted, nil
}

// GetProjectIDForResource finds the project ID for a given resource
func (r *PostgresPermissionCalculatorRepository) GetProjectIDForResource(ctx context.Context, resourceType string, resourceID int) (*int, error) {
	var query string

	switch resourceType {
	case "task":
		query = "SELECT project_id FROM tasks WHERE id = $1"
	case "document":
		query = "SELECT project_id FROM documents WHERE id = $1"
	default:
		return nil, nil
	}

	var projectID int
	err := r.db.QueryRowContext(ctx, query, resourceID).Scan(&projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &projectID, nil
}

// CheckProjectPermission checks if user has specific permissions for the project
func (r *PostgresPermissionCalculatorRepository) CheckProjectPermission(ctx context.Context, userID int, projectID int, action string) (bool, error) {
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
	err := r.db.QueryRowContext(ctx, query, userID, projectID, action).Scan(&hasPermission)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	return hasPermission, nil
}
