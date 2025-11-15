package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/interfaces"
)

// EnterpriseUserRole represents the assignment of an enterprise role to a user
type EnterpriseUserRole struct {
	ID                uint
	EnterpriseUserID  uint
	EnterpriseID      uint
	EnterpriseRoleID  uint
	IsActive          bool
	ExpiresAt         *time.Time
	AssignedBy        *uint
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// enterpriseRoleRepositoryImpl implements EnterpriseRoleRepository
type enterpriseRoleRepositoryImpl struct {
	db *sql.DB
}

// NewEnterpriseRoleRepository creates a new enterprise role repository
func NewEnterpriseRoleRepository(db *sql.DB) interfaces.EnterpriseRoleRepository {
	return &enterpriseRoleRepositoryImpl{
		db: db,
	}
}

// CreateRole creates a new enterprise role
func (r *enterpriseRoleRepositoryImpl) CreateRole(ctx context.Context, role *interfaces.EnterpriseRole) error {
	query := `
		INSERT INTO enterprise_roles (enterprise_id, role_code, role_name, description, is_active, is_built_in, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`

	now := time.Now()
	err := r.db.QueryRowContext(ctx, query,
		role.EnterpriseID,
		role.RoleCode,
		role.RoleName,
		role.Description,
		role.IsActive,
		role.IsBuiltIn,
		role.CreatedBy,
		now,
		now,
	).Scan(&role.ID)

	if err != nil {
		return fmt.Errorf("failed to create enterprise role: %w", err)
	}

	role.CreatedAt = now
	role.UpdatedAt = now
	return nil
}

// GetRoleByID retrieves an enterprise role by ID
func (r *enterpriseRoleRepositoryImpl) GetRoleByID(ctx context.Context, roleID uint) (*interfaces.EnterpriseRole, error) {
	query := `
		SELECT id, enterprise_id, role_code, role_name, description, is_active, is_built_in, created_by, created_at, updated_at
		FROM enterprise_roles
		WHERE id = $1
	`

	role := &interfaces.EnterpriseRole{}
	err := r.db.QueryRowContext(ctx, query, roleID).Scan(
		&role.ID,
		&role.EnterpriseID,
		&role.RoleCode,
		&role.RoleName,
		&role.Description,
		&role.IsActive,
		&role.IsBuiltIn,
		&role.CreatedBy,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("enterprise role not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise role: %w", err)
	}

	return role, nil
}

// GetRoleByCode retrieves an enterprise role by code within an enterprise
func (r *enterpriseRoleRepositoryImpl) GetRoleByCode(ctx context.Context, enterpriseID uint, roleCode string) (*interfaces.EnterpriseRole, error) {
	query := `
		SELECT id, enterprise_id, role_code, role_name, description, is_active, is_built_in, created_by, created_at, updated_at
		FROM enterprise_roles
		WHERE enterprise_id = $1 AND role_code = $2
	`

	role := &interfaces.EnterpriseRole{}
	err := r.db.QueryRowContext(ctx, query, enterpriseID, roleCode).Scan(
		&role.ID,
		&role.EnterpriseID,
		&role.RoleCode,
		&role.RoleName,
		&role.Description,
		&role.IsActive,
		&role.IsBuiltIn,
		&role.CreatedBy,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("enterprise role not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise role: %w", err)
	}

	return role, nil
}

// ListRoles lists all enterprise roles for an enterprise with pagination
func (r *enterpriseRoleRepositoryImpl) ListRoles(ctx context.Context, enterpriseID uint, limit, offset int) ([]*interfaces.EnterpriseRole, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM enterprise_roles WHERE enterprise_id = $1 AND is_active = true`
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, enterpriseID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count enterprise roles: %w", err)
	}

	// Get roles with pagination
	query := `
		SELECT id, enterprise_id, role_code, role_name, description, is_active, is_built_in, created_by, created_at, updated_at
		FROM enterprise_roles
		WHERE enterprise_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, enterpriseID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list enterprise roles: %w", err)
	}
	defer rows.Close()

	var roles []*interfaces.EnterpriseRole
	for rows.Next() {
		role := &interfaces.EnterpriseRole{}
		if err := rows.Scan(
			&role.ID,
			&role.EnterpriseID,
			&role.RoleCode,
			&role.RoleName,
			&role.Description,
			&role.IsActive,
			&role.IsBuiltIn,
			&role.CreatedBy,
			&role.CreatedAt,
			&role.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan enterprise role: %w", err)
		}
		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return roles, total, nil
}

// UpdateRole updates an enterprise role
func (r *enterpriseRoleRepositoryImpl) UpdateRole(ctx context.Context, role *interfaces.EnterpriseRole) error {
	query := `
		UPDATE enterprise_roles
		SET role_name = $2, description = $3, is_active = $4, updated_at = $5
		WHERE id = $1 AND is_built_in = false
	`

	result, err := r.db.ExecContext(ctx, query,
		role.ID,
		role.RoleName,
		role.Description,
		role.IsActive,
		time.Now(),
	)
	if err != nil {
		return fmt.Errorf("failed to update enterprise role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("enterprise role not found or is built-in")
	}

	return nil
}

// DeleteRole soft deletes an enterprise role (only if not built-in)
func (r *enterpriseRoleRepositoryImpl) DeleteRole(ctx context.Context, roleID uint) error {
	query := `
		UPDATE enterprise_roles
		SET is_active = false, updated_at = $2
		WHERE id = $1 AND is_built_in = false
	`

	result, err := r.db.ExecContext(ctx, query, roleID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to delete enterprise role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("enterprise role not found or is built-in")
	}

	return nil
}

// GetRolePermissions gets all permissions for an enterprise role
func (r *enterpriseRoleRepositoryImpl) GetRolePermissions(ctx context.Context, roleID uint) ([]*interfaces.EnterpriseRolePermission, error) {
	query := `
		SELECT id, enterprise_role_id, permission_code, is_granted, created_at
		FROM enterprise_role_permissions
		WHERE enterprise_role_id = $1
		ORDER BY permission_code
	`

	rows, err := r.db.QueryContext(ctx, query, roleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}
	defer rows.Close()

	var permissions []*interfaces.EnterpriseRolePermission
	for rows.Next() {
		perm := &interfaces.EnterpriseRolePermission{}
		if err := rows.Scan(
			&perm.ID,
			&perm.EnterpriseRoleID,
			&perm.PermissionCode,
			&perm.IsGranted,
			&perm.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, perm)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return permissions, nil
}

// AssignPermissionToRole assigns a permission to an enterprise role
func (r *enterpriseRoleRepositoryImpl) AssignPermissionToRole(ctx context.Context, roleID uint, permissionCode string, isGranted bool) error {
	query := `
		INSERT INTO enterprise_role_permissions (enterprise_role_id, permission_code, is_granted, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (enterprise_role_id, permission_code)
		DO UPDATE SET is_granted = EXCLUDED.is_granted
	`

	_, err := r.db.ExecContext(ctx, query, roleID, permissionCode, isGranted, time.Now())
	if err != nil {
		return fmt.Errorf("failed to assign permission to role: %w", err)
	}

	return nil
}

// RemovePermissionFromRole removes a permission from an enterprise role
func (r *enterpriseRoleRepositoryImpl) RemovePermissionFromRole(ctx context.Context, roleID uint, permissionCode string) error {
	query := `
		DELETE FROM enterprise_role_permissions
		WHERE enterprise_role_id = $1 AND permission_code = $2
	`

	_, err := r.db.ExecContext(ctx, query, roleID, permissionCode)
	if err != nil {
		return fmt.Errorf("failed to remove permission from role: %w", err)
	}

	return nil
}

// AssignRoleToUser assigns an enterprise role to a user (supports multiple roles)
func (r *enterpriseRoleRepositoryImpl) AssignRoleToUser(ctx context.Context, enterpriseUserID uint, enterpriseID uint, roleID uint, expiresAt *time.Time, assignedBy *uint) error {
	query := `
		INSERT INTO enterprise_user_roles (enterprise_user_id, enterprise_id, enterprise_role_id, is_active, expires_at, assigned_by, created_at, updated_at)
		VALUES ($1, $2, $3, true, $4, $5, $6, $7)
		ON CONFLICT (enterprise_user_id, enterprise_role_id)
		DO UPDATE SET is_active = true, expires_at = EXCLUDED.expires_at, updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, enterpriseUserID, enterpriseID, roleID, expiresAt, assignedBy, now, now)
	if err != nil {
		return fmt.Errorf("failed to assign role to user: %w", err)
	}

	return nil
}

// RemoveRoleFromUser removes an enterprise role from a user
func (r *enterpriseRoleRepositoryImpl) RemoveRoleFromUser(ctx context.Context, enterpriseUserID uint, roleID uint) error {
	query := `
		UPDATE enterprise_user_roles
		SET is_active = false, updated_at = $3
		WHERE enterprise_user_id = $1 AND enterprise_role_id = $2
	`

	_, err := r.db.ExecContext(ctx, query, enterpriseUserID, roleID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to remove role from user: %w", err)
	}

	return nil
}

// GetUserRoles gets all enterprise roles for a user within an enterprise
// Note: enterpriseUserID is actually the user_id from users table (not enterprise_users.id)
// This is because RBAC v2 uses user_id in enterprise_user_roles table
func (r *enterpriseRoleRepositoryImpl) GetUserRoles(ctx context.Context, userID uint, enterpriseID uint) ([]*interfaces.EnterpriseRole, error) {
	query := `
		SELECT er.id, er.enterprise_id, er.code, er.name, er.description, er.is_active, er.is_preset, er.created_by, er.created_at, er.updated_at
		FROM enterprise_roles er
		JOIN enterprise_user_roles eur ON er.id = eur.role_id
		WHERE eur.user_id = $1
		AND eur.enterprise_id = $2
		AND eur.is_active = true
		AND eur.deleted_at IS NULL
		ORDER BY er.created_at
	`

	rows, err := r.db.QueryContext(ctx, query, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}
	defer rows.Close()

	var roles []*interfaces.EnterpriseRole
	for rows.Next() {
		role := &interfaces.EnterpriseRole{}
		if err := rows.Scan(
			&role.ID,
			&role.EnterpriseID,
			&role.RoleCode,
			&role.RoleName,
			&role.Description,
			&role.IsActive,
			&role.IsBuiltIn,
			&role.CreatedBy,
			&role.CreatedAt,
			&role.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}
		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return roles, nil
}

// HasUserRole checks if a user has a specific enterprise role
func (r *enterpriseRoleRepositoryImpl) HasUserRole(ctx context.Context, enterpriseUserID uint, enterpriseID uint, roleCode string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM enterprise_user_roles eur
			JOIN enterprise_roles er ON eur.enterprise_role_id = er.id
			WHERE eur.enterprise_user_id = $1
			AND eur.enterprise_id = $2
			AND er.role_code = $3
			AND eur.is_active = true
			AND (eur.expires_at IS NULL OR eur.expires_at > NOW())
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, enterpriseUserID, enterpriseID, roleCode).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check user role: %w", err)
	}

	return exists, nil
}

// SetCustomPermission sets a custom permission override for a user
func (r *enterpriseRoleRepositoryImpl) SetCustomPermission(ctx context.Context, perm *interfaces.EnterpriseUserCustomPermission) error {
	query := `
		INSERT INTO enterprise_user_custom_permissions
		(enterprise_user_id, enterprise_id, permission_code, is_granted, is_active, expires_at, reason, granted_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (enterprise_user_id, enterprise_id, permission_code)
		DO UPDATE SET
			is_granted = EXCLUDED.is_granted,
			is_active = EXCLUDED.is_active,
			expires_at = EXCLUDED.expires_at,
			reason = EXCLUDED.reason,
			granted_by = EXCLUDED.granted_by,
			updated_at = EXCLUDED.updated_at
		RETURNING id
	`

	now := time.Now()
	err := r.db.QueryRowContext(ctx, query,
		perm.EnterpriseUserID,
		perm.EnterpriseID,
		perm.PermissionCode,
		perm.IsGranted,
		perm.IsActive,
		perm.ExpiresAt,
		perm.Reason,
		perm.GrantedBy,
		now,
		now,
	).Scan(&perm.ID)

	if err != nil {
		return fmt.Errorf("failed to set custom permission: %w", err)
	}

	perm.CreatedAt = now
	perm.UpdatedAt = now
	return nil
}

// RemoveCustomPermission removes a custom permission override
func (r *enterpriseRoleRepositoryImpl) RemoveCustomPermission(ctx context.Context, enterpriseUserID uint, enterpriseID uint, permissionCode string) error {
	query := `
		UPDATE enterprise_user_custom_permissions
		SET is_active = false, updated_at = $4
		WHERE enterprise_user_id = $1 AND enterprise_id = $2 AND permission_code = $3
	`

	_, err := r.db.ExecContext(ctx, query, enterpriseUserID, enterpriseID, permissionCode, time.Now())
	if err != nil {
		return fmt.Errorf("failed to remove custom permission: %w", err)
	}

	return nil
}

// GetUserCustomPermissions gets all custom permissions for a user
func (r *enterpriseRoleRepositoryImpl) GetUserCustomPermissions(ctx context.Context, enterpriseUserID uint, enterpriseID uint) ([]*interfaces.EnterpriseUserCustomPermission, error) {
	query := `
		SELECT id, enterprise_user_id, enterprise_id, permission_code, is_granted, is_active,
		       expires_at, reason, granted_by, created_at, updated_at
		FROM enterprise_user_custom_permissions
		WHERE enterprise_user_id = $1
		AND enterprise_id = $2
		AND is_active = true
		AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, enterpriseUserID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get custom permissions: %w", err)
	}
	defer rows.Close()

	var permissions []*interfaces.EnterpriseUserCustomPermission
	for rows.Next() {
		perm := &interfaces.EnterpriseUserCustomPermission{}
		if err := rows.Scan(
			&perm.ID,
			&perm.EnterpriseUserID,
			&perm.EnterpriseID,
			&perm.PermissionCode,
			&perm.IsGranted,
			&perm.IsActive,
			&perm.ExpiresAt,
			&perm.Reason,
			&perm.GrantedBy,
			&perm.CreatedAt,
			&perm.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan custom permission: %w", err)
		}
		permissions = append(permissions, perm)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return permissions, nil
}
