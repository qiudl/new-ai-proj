package database

import (
	"context"
	"database/sql"
	"fmt"
)

// PostgresPermissionServiceV2Repository implements PermissionServiceV2Repository for PostgreSQL
type PostgresPermissionServiceV2Repository struct {
	db execer
}

// NewPermissionServiceV2Repository creates a new PostgresPermissionServiceV2Repository
func NewPermissionServiceV2Repository(db execer) PermissionServiceV2Repository {
	return &PostgresPermissionServiceV2Repository{db: db}
}

// CheckSystemPermission checks if a user has a specific system permission
func (r *PostgresPermissionServiceV2Repository) CheckSystemPermission(ctx context.Context, userID uint, permission string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM users u
			JOIN system_role_permissions srp ON u.system_role_id = srp.role_id
			JOIN system_permissions sp ON srp.permission_id = sp.id
			WHERE u.id = $1
			AND sp.code = $2
			AND u.status = 'active'
			AND u.deleted_at IS NULL
		)
	`

	var hasPermission bool
	err := r.db.QueryRowContext(ctx, query, userID, permission).Scan(&hasPermission)
	if err != nil {
		return false, fmt.Errorf("failed to check system permission: %w", err)
	}

	return hasPermission, nil
}

// GetUserSystemPermissions returns all system permissions for a user
func (r *PostgresPermissionServiceV2Repository) GetUserSystemPermissions(ctx context.Context, userID uint) ([]string, error) {
	query := `
		SELECT DISTINCT sp.code
		FROM users u
		JOIN system_role_permissions srp ON u.system_role_id = srp.role_id
		JOIN system_permissions sp ON srp.permission_id = sp.id
		WHERE u.id = $1
		AND u.status = 'active'
		AND u.deleted_at IS NULL
		ORDER BY sp.code
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get system permissions: %w", err)
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var permission string
		if err := rows.Scan(&permission); err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, permission)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return permissions, nil
}

// GetUserEnterpriseRolePermissions returns all enterprise role-based permissions for a user
func (r *PostgresPermissionServiceV2Repository) GetUserEnterpriseRolePermissions(ctx context.Context, userID uint, enterpriseID uint) ([]string, error) {
	query := `
		SELECT DISTINCT ep.code
		FROM enterprise_user_roles eur
		JOIN enterprise_role_permissions erp ON eur.role_id = erp.role_id
		JOIN enterprise_permissions ep ON erp.permission_id = ep.id
		WHERE eur.user_id = $1
		AND eur.enterprise_id = $2
		AND eur.is_active = true
	`

	rows, err := r.db.QueryContext(ctx, query, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var permission string
		if err := rows.Scan(&permission); err != nil {
			return nil, fmt.Errorf("failed to scan role permission: %w", err)
		}
		permissions = append(permissions, permission)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("role permissions rows error: %w", err)
	}

	return permissions, nil
}

// CheckEnterpriseRolePermission checks if a user has a specific enterprise role permission
func (r *PostgresPermissionServiceV2Repository) CheckEnterpriseRolePermission(ctx context.Context, userID uint, enterpriseID uint, permission string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM enterprise_user_roles eur
			JOIN enterprise_role_permissions erp ON eur.role_id = erp.role_id
			JOIN enterprise_permissions ep ON erp.permission_id = ep.id
			WHERE eur.user_id = $1
			AND eur.enterprise_id = $2
			AND ep.code = $3
			AND eur.is_active = true
		)
	`

	var hasPermission bool
	err := r.db.QueryRowContext(ctx, query, userID, enterpriseID, permission).Scan(&hasPermission)
	if err != nil {
		return false, err
	}

	return hasPermission, nil
}

// GetUserEnterpriseCustomPermissions returns all custom permission overrides for a user
// Returns a map of permission code -> grant type ("grant" or "deny")
func (r *PostgresPermissionServiceV2Repository) GetUserEnterpriseCustomPermissions(ctx context.Context, userID uint, enterpriseID uint) (map[string]string, error) {
	query := `
		SELECT ep.code, eucp.grant_type
		FROM enterprise_user_custom_permissions eucp
		JOIN enterprise_permissions ep ON eucp.permission_id = ep.id
		WHERE eucp.user_id = $1
		AND eucp.enterprise_id = $2
		AND (eucp.expires_at IS NULL OR eucp.expires_at > NOW())
	`

	rows, err := r.db.QueryContext(ctx, query, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get custom permissions: %w", err)
	}
	defer rows.Close()

	permissions := make(map[string]string)
	for rows.Next() {
		var permission string
		var grantType string
		if err := rows.Scan(&permission, &grantType); err != nil {
			return nil, fmt.Errorf("failed to scan custom permission: %w", err)
		}
		permissions[permission] = grantType
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("custom permissions rows error: %w", err)
	}

	return permissions, nil
}

// CheckCustomPermissionOverride checks for explicit custom permission grants/denies
func (r *PostgresPermissionServiceV2Repository) CheckCustomPermissionOverride(ctx context.Context, userID uint, enterpriseID uint, permission string) (bool, bool, error) {
	query := `
		SELECT eucp.grant_type
		FROM enterprise_user_custom_permissions eucp
		JOIN enterprise_permissions ep ON eucp.permission_id = ep.id
		WHERE eucp.user_id = $1
		AND eucp.enterprise_id = $2
		AND ep.code = $3
		AND (eucp.expires_at IS NULL OR eucp.expires_at > NOW())
		ORDER BY eucp.created_at DESC
		LIMIT 1
	`

	var grantType string
	err := r.db.QueryRowContext(ctx, query, userID, enterpriseID, permission).Scan(&grantType)
	if err == sql.ErrNoRows {
		// No custom override exists
		return false, false, nil
	}
	if err != nil {
		return false, false, err
	}

	// Custom override exists
	isGranted := grantType == "grant"
	return true, isGranted, nil
}
