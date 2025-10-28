package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/interfaces"
)

// SystemUserRole represents the assignment of a system role to a user
type SystemUserRole struct {
	ID           uint
	UserID       uint
	SystemRoleID uint
	IsActive     bool
	ExpiresAt    *time.Time
	AssignedBy   *uint
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// systemRoleRepositoryImpl implements SystemRoleRepository
type systemRoleRepositoryImpl struct {
	db *sql.DB
}

// NewSystemRoleRepository creates a new system role repository
func NewSystemRoleRepository(db *sql.DB) interfaces.SystemRoleRepository {
	return &systemRoleRepositoryImpl{
		db: db,
	}
}

// CreateRole creates a new system role
func (r *systemRoleRepositoryImpl) CreateRole(ctx context.Context, role *interfaces.SystemRole) error {
	query := `
		INSERT INTO system_roles (role_code, role_name, description, is_active, is_built_in, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	now := time.Now()
	err := r.db.QueryRowContext(ctx, query,
		role.RoleCode,
		role.RoleName,
		role.Description,
		role.IsActive,
		role.IsBuiltIn,
		now,
		now,
	).Scan(&role.ID)

	if err != nil {
		return fmt.Errorf("failed to create system role: %w", err)
	}

	role.CreatedAt = now
	role.UpdatedAt = now
	return nil
}

// GetRoleByID retrieves a system role by ID
func (r *systemRoleRepositoryImpl) GetRoleByID(ctx context.Context, roleID uint) (*interfaces.SystemRole, error) {
	query := `
		SELECT id, role_code, role_name, description, is_active, is_built_in, created_at, updated_at
		FROM system_roles
		WHERE id = $1
	`

	role := &interfaces.SystemRole{}
	err := r.db.QueryRowContext(ctx, query, roleID).Scan(
		&role.ID,
		&role.RoleCode,
		&role.RoleName,
		&role.Description,
		&role.IsActive,
		&role.IsBuiltIn,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("system role not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get system role: %w", err)
	}

	return role, nil
}

// GetRoleByCode retrieves a system role by code
func (r *systemRoleRepositoryImpl) GetRoleByCode(ctx context.Context, roleCode string) (*interfaces.SystemRole, error) {
	query := `
		SELECT id, role_code, role_name, description, is_active, is_built_in, created_at, updated_at
		FROM system_roles
		WHERE role_code = $1
	`

	role := &interfaces.SystemRole{}
	err := r.db.QueryRowContext(ctx, query, roleCode).Scan(
		&role.ID,
		&role.RoleCode,
		&role.RoleName,
		&role.Description,
		&role.IsActive,
		&role.IsBuiltIn,
		&role.CreatedAt,
		&role.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("system role not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get system role: %w", err)
	}

	return role, nil
}

// ListRoles lists all system roles with pagination
func (r *systemRoleRepositoryImpl) ListRoles(ctx context.Context, limit, offset int) ([]*interfaces.SystemRole, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM system_roles WHERE is_active = true`
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count system roles: %w", err)
	}

	// Get roles with pagination
	query := `
		SELECT id, role_code, role_name, description, is_active, is_built_in, created_at, updated_at
		FROM system_roles
		WHERE is_active = true
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list system roles: %w", err)
	}
	defer rows.Close()

	var roles []*interfaces.SystemRole
	for rows.Next() {
		role := &interfaces.SystemRole{}
		if err := rows.Scan(
			&role.ID,
			&role.RoleCode,
			&role.RoleName,
			&role.Description,
			&role.IsActive,
			&role.IsBuiltIn,
			&role.CreatedAt,
			&role.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan system role: %w", err)
		}
		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return roles, total, nil
}

// UpdateRole updates a system role
func (r *systemRoleRepositoryImpl) UpdateRole(ctx context.Context, role *interfaces.SystemRole) error {
	query := `
		UPDATE system_roles
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
		return fmt.Errorf("failed to update system role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("system role not found or is built-in")
	}

	return nil
}

// DeleteRole soft deletes a system role (only if not built-in)
func (r *systemRoleRepositoryImpl) DeleteRole(ctx context.Context, roleID uint) error {
	query := `
		UPDATE system_roles
		SET is_active = false, updated_at = $2
		WHERE id = $1 AND is_built_in = false
	`

	result, err := r.db.ExecContext(ctx, query, roleID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to delete system role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("system role not found or is built-in")
	}

	return nil
}

// GetRolePermissions gets all permissions for a role
func (r *systemRoleRepositoryImpl) GetRolePermissions(ctx context.Context, roleID uint) ([]*interfaces.SystemRolePermission, error) {
	query := `
		SELECT id, system_role_id, permission_code, is_granted, created_at
		FROM system_role_permissions
		WHERE system_role_id = $1
		ORDER BY permission_code
	`

	rows, err := r.db.QueryContext(ctx, query, roleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}
	defer rows.Close()

	var permissions []*interfaces.SystemRolePermission
	for rows.Next() {
		perm := &interfaces.SystemRolePermission{}
		if err := rows.Scan(
			&perm.ID,
			&perm.SystemRoleID,
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

// AssignPermissionToRole assigns a permission to a role
func (r *systemRoleRepositoryImpl) AssignPermissionToRole(ctx context.Context, roleID uint, permissionCode string, isGranted bool) error {
	query := `
		INSERT INTO system_role_permissions (system_role_id, permission_code, is_granted, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (system_role_id, permission_code)
		DO UPDATE SET is_granted = EXCLUDED.is_granted
	`

	_, err := r.db.ExecContext(ctx, query, roleID, permissionCode, isGranted, time.Now())
	if err != nil {
		return fmt.Errorf("failed to assign permission to role: %w", err)
	}

	return nil
}

// RemovePermissionFromRole removes a permission from a role
func (r *systemRoleRepositoryImpl) RemovePermissionFromRole(ctx context.Context, roleID uint, permissionCode string) error {
	query := `
		DELETE FROM system_role_permissions
		WHERE system_role_id = $1 AND permission_code = $2
	`

	_, err := r.db.ExecContext(ctx, query, roleID, permissionCode)
	if err != nil {
		return fmt.Errorf("failed to remove permission from role: %w", err)
	}

	return nil
}

// AssignRoleToUser assigns a system role to a user
func (r *systemRoleRepositoryImpl) AssignRoleToUser(ctx context.Context, userID uint, roleID uint, expiresAt *time.Time, assignedBy *uint) error {
	query := `
		INSERT INTO system_user_roles (user_id, system_role_id, is_active, expires_at, assigned_by, created_at, updated_at)
		VALUES ($1, $2, true, $3, $4, $5, $6)
		ON CONFLICT (user_id, system_role_id)
		DO UPDATE SET is_active = true, expires_at = EXCLUDED.expires_at, updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, userID, roleID, expiresAt, assignedBy, now, now)
	if err != nil {
		return fmt.Errorf("failed to assign role to user: %w", err)
	}

	return nil
}

// RemoveRoleFromUser removes a system role from a user
func (r *systemRoleRepositoryImpl) RemoveRoleFromUser(ctx context.Context, userID uint, roleID uint) error {
	query := `
		UPDATE system_user_roles
		SET is_active = false, updated_at = $3
		WHERE user_id = $1 AND system_role_id = $2
	`

	_, err := r.db.ExecContext(ctx, query, userID, roleID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to remove role from user: %w", err)
	}

	return nil
}

// GetUserRoles gets all system roles for a user
func (r *systemRoleRepositoryImpl) GetUserRoles(ctx context.Context, userID uint) ([]*interfaces.SystemRole, error) {
	query := `
		SELECT sr.id, sr.role_code, sr.role_name, sr.description, sr.is_active, sr.is_built_in, sr.created_at, sr.updated_at
		FROM system_roles sr
		JOIN system_user_roles sur ON sr.id = sur.system_role_id
		WHERE sur.user_id = $1
		AND sur.is_active = true
		AND (sur.expires_at IS NULL OR sur.expires_at > NOW())
		ORDER BY sr.created_at
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}
	defer rows.Close()

	var roles []*interfaces.SystemRole
	for rows.Next() {
		role := &interfaces.SystemRole{}
		if err := rows.Scan(
			&role.ID,
			&role.RoleCode,
			&role.RoleName,
			&role.Description,
			&role.IsActive,
			&role.IsBuiltIn,
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

// HasUserRole checks if a user has a specific system role
func (r *systemRoleRepositoryImpl) HasUserRole(ctx context.Context, userID uint, roleCode string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM system_user_roles sur
			JOIN system_roles sr ON sur.system_role_id = sr.id
			WHERE sur.user_id = $1
			AND sr.role_code = $2
			AND sur.is_active = true
			AND (sur.expires_at IS NULL OR sur.expires_at > NOW())
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, userID, roleCode).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check user role: %w", err)
	}

	return exists, nil
}
