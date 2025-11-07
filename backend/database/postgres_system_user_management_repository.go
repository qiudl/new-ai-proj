package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// PostgresSystemUserManagementRepository implements SystemUserManagementRepository using PostgreSQL
// This implementation eliminates 13 SQL violations from system_user_handler.go
type PostgresSystemUserManagementRepository struct {
	db execer
}

// NewPostgresSystemUserManagementRepository creates a new PostgreSQL system user management repository
func NewPostgresSystemUserManagementRepository(db execer) SystemUserManagementRepository {
	return &PostgresSystemUserManagementRepository{db: db}
}

// CountSystemUsers counts system users matching the given filters
func (r *PostgresSystemUserManagementRepository) CountSystemUsers(
	ctx context.Context,
	filters SystemUserFilters,
) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM users
		WHERE user_type = 'system'
		AND deleted_at IS NULL
	`

	var args []interface{}
	argIndex := 1

	// Apply search filter
	if filters.Search != "" {
		query += fmt.Sprintf(" AND (username ILIKE $%d OR email ILIKE $%d)", argIndex, argIndex+1)
		searchPattern := "%" + filters.Search + "%"
		args = append(args, searchPattern, searchPattern)
		argIndex += 2
	}

	// Apply status filter
	if filters.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, filters.Status)
	}

	var total int
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to count system users: %w", err)
	}

	return total, nil
}

// ListSystemUsers retrieves a paginated list of system users with filters
func (r *PostgresSystemUserManagementRepository) ListSystemUsers(
	ctx context.Context,
	filters SystemUserFilters,
	pagination Pagination,
) ([]SystemUser, error) {
	query := `
		SELECT id, username, email, user_type, role, status, created_at, updated_at, last_login_at
		FROM users
		WHERE user_type = 'system'
		AND deleted_at IS NULL
	`

	var args []interface{}
	argIndex := 1

	// Apply search filter
	if filters.Search != "" {
		query += fmt.Sprintf(" AND (username ILIKE $%d OR email ILIKE $%d)", argIndex, argIndex+1)
		searchPattern := "%" + filters.Search + "%"
		args = append(args, searchPattern, searchPattern)
		argIndex += 2
	}

	// Apply status filter
	if filters.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, filters.Status)
		argIndex++
	}

	// Add pagination
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	offset := (pagination.Page - 1) * pagination.PageSize
	args = append(args, pagination.PageSize, offset)

	// Execute query
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list system users: %w", err)
	}
	defer rows.Close()

	var users []SystemUser
	for rows.Next() {
		var user SystemUser
		var lastLoginAt sql.NullTime

		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.UserType,
			&user.Role,
			&user.Status,
			&user.CreatedAt,
			&user.UpdatedAt,
			&lastLoginAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan system user: %w", err)
		}

		if lastLoginAt.Valid {
			user.LastLoginAt = &lastLoginAt.Time
		}

		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating system users: %w", err)
	}

	return users, nil
}

// GetSystemUserByID retrieves a system user by ID
func (r *PostgresSystemUserManagementRepository) GetSystemUserByID(
	ctx context.Context,
	userID uint,
) (*SystemUser, error) {
	query := `
		SELECT id, username, email, user_type, role, status, created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1 AND user_type = 'system' AND deleted_at IS NULL
	`

	var user SystemUser
	var lastLoginAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.UserType,
		&user.Role,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
		&lastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("system user with ID %d not found", userID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get system user: %w", err)
	}

	if lastLoginAt.Valid {
		user.LastLoginAt = &lastLoginAt.Time
	}

	return &user, nil
}

// UserExistsByUsername checks if a user with the given username exists
func (r *PostgresSystemUserManagementRepository) UserExistsByUsername(
	ctx context.Context,
	username string,
) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1 AND deleted_at IS NULL)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, username).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check username existence: %w", err)
	}

	return exists, nil
}

// UserExistsByEmail checks if a user with the given email exists
func (r *PostgresSystemUserManagementRepository) UserExistsByEmail(
	ctx context.Context,
	email string,
) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND deleted_at IS NULL)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}

	return exists, nil
}

// CreateSystemUser creates a new system user
func (r *PostgresSystemUserManagementRepository) CreateSystemUser(
	ctx context.Context,
	params *CreateSystemUserParams,
) (*SystemUser, error) {
	query := `
		INSERT INTO users (username, email, password_hash, user_type, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, 'system', $4, $5, NOW(), NOW())
		RETURNING id, username, email, user_type, role, status, created_at, updated_at
	`

	var user SystemUser
	err := r.db.QueryRowContext(
		ctx,
		query,
		params.Username,
		params.Email,
		params.PasswordHash,
		params.Role,
		params.Status,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.UserType,
		&user.Role,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create system user: %w", err)
	}

	return &user, nil
}

// GetSystemUserStatus gets the current status of a system user
func (r *PostgresSystemUserManagementRepository) GetSystemUserStatus(
	ctx context.Context,
	userID uint,
) (username string, status string, err error) {
	query := `
		SELECT username, status
		FROM users
		WHERE id = $1 AND user_type = 'system' AND deleted_at IS NULL
	`

	err = r.db.QueryRowContext(ctx, query, userID).Scan(&username, &status)
	if err == sql.ErrNoRows {
		return "", "", fmt.Errorf("system user with ID %d not found", userID)
	}
	if err != nil {
		return "", "", fmt.Errorf("failed to get system user status: %w", err)
	}

	return username, status, nil
}

// UpdateSystemUserStatus updates the status of a system user
func (r *PostgresSystemUserManagementRepository) UpdateSystemUserStatus(
	ctx context.Context,
	userID uint,
	newStatus string,
) (time.Time, error) {
	query := `
		UPDATE users
		SET status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	var updatedAt time.Time
	err := r.db.QueryRowContext(ctx, query, userID, newStatus).Scan(&updatedAt)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to update system user status: %w", err)
	}

	return updatedAt, nil
}

// GetSystemUserRoles retrieves all active roles for a system user
func (r *PostgresSystemUserManagementRepository) GetSystemUserRoles(
	ctx context.Context,
	userID uint,
) ([]uint, error) {
	query := `
		SELECT system_role_id
		FROM system_user_roles
		WHERE user_id = $1 AND is_active = true
		ORDER BY system_role_id
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get system user roles: %w", err)
	}
	defer rows.Close()

	var roleIDs []uint
	for rows.Next() {
		var roleID uint
		if err := rows.Scan(&roleID); err != nil {
			return nil, fmt.Errorf("failed to scan role ID: %w", err)
		}
		roleIDs = append(roleIDs, roleID)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating roles: %w", err)
	}

	return roleIDs, nil
}

// BatchRoleExists checks which roles exist in the system_roles table
// Returns a map of roleID -> exists
func (r *PostgresSystemUserManagementRepository) BatchRoleExists(
	ctx context.Context,
	roleIDs []uint,
) (map[uint]bool, error) {
	if len(roleIDs) == 0 {
		return make(map[uint]bool), nil
	}

	// Build query with IN clause
	query := `SELECT id FROM system_roles WHERE id = ANY($1)`

	// PostgreSQL array parameter
	rows, err := r.db.QueryContext(ctx, query, roleIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to batch check role existence: %w", err)
	}
	defer rows.Close()

	// Initialize result map with all false
	result := make(map[uint]bool)
	for _, roleID := range roleIDs {
		result[roleID] = false
	}

	// Mark existing roles as true
	for rows.Next() {
		var roleID uint
		if err := rows.Scan(&roleID); err != nil {
			return nil, fmt.Errorf("failed to scan role ID: %w", err)
		}
		result[roleID] = true
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating roles: %w", err)
	}

	return result, nil
}

// SyncUserRoles synchronizes user roles in a single transaction
// This method solves the N+1 query problem by performing batch operations
// Returns the number of roles added and removed
func (r *PostgresSystemUserManagementRepository) SyncUserRoles(
	ctx context.Context,
	userID uint,
	roleIDs []uint,
	assignedBy uint,
) (added int, removed int, err error) {
	// Check if we're already in a transaction
	tx, isTransaction := r.db.(*sql.Tx)

	// If not in transaction, create one
	var shouldCommit bool
	if !isTransaction {
		db, ok := r.db.(*sql.DB)
		if !ok {
			return 0, 0, fmt.Errorf("invalid database connection type")
		}

		tx, err = db.BeginTx(ctx, nil)
		if err != nil {
			return 0, 0, fmt.Errorf("failed to begin transaction: %w", err)
		}
		shouldCommit = true
		defer func() {
			if err != nil {
				tx.Rollback()
			}
		}()
	}

	// Get current roles
	currentRoles, err := r.GetSystemUserRoles(ctx, userID)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get current roles: %w", err)
	}

	// Build maps for efficient lookup
	currentRoleMap := make(map[uint]bool)
	for _, roleID := range currentRoles {
		currentRoleMap[roleID] = true
	}

	newRoleMap := make(map[uint]bool)
	for _, roleID := range roleIDs {
		newRoleMap[roleID] = true
	}

	// Calculate roles to add and remove
	var rolesToAdd []uint
	var rolesToRemove []uint

	for roleID := range newRoleMap {
		if !currentRoleMap[roleID] {
			rolesToAdd = append(rolesToAdd, roleID)
		}
	}

	for roleID := range currentRoleMap {
		if !newRoleMap[roleID] {
			rolesToRemove = append(rolesToRemove, roleID)
		}
	}

	// Batch validate new roles exist
	if len(rolesToAdd) > 0 {
		roleExistsMap, err := r.BatchRoleExists(ctx, rolesToAdd)
		if err != nil {
			return 0, 0, fmt.Errorf("failed to validate roles: %w", err)
		}

		// Filter out non-existent roles
		var validRolesToAdd []uint
		for _, roleID := range rolesToAdd {
			if roleExistsMap[roleID] {
				validRolesToAdd = append(validRolesToAdd, roleID)
			}
		}
		rolesToAdd = validRolesToAdd
	}

	// Batch add new roles
	if len(rolesToAdd) > 0 {
		addQuery := `
			INSERT INTO system_user_roles (user_id, system_role_id, is_active, assigned_by, created_at, updated_at)
			VALUES ($1, $2, true, $3, NOW(), NOW())
			ON CONFLICT (user_id, system_role_id)
			DO UPDATE SET is_active = true, updated_at = NOW()
		`

		for _, roleID := range rolesToAdd {
			_, err = tx.ExecContext(ctx, addQuery, userID, roleID, assignedBy)
			if err != nil {
				return added, removed, fmt.Errorf("failed to add role %d: %w", roleID, err)
			}
			added++
		}
	}

	// Batch remove old roles
	if len(rolesToRemove) > 0 {
		removeQuery := `
			UPDATE system_user_roles
			SET is_active = false, updated_at = NOW()
			WHERE user_id = $1 AND system_role_id = ANY($2)
		`

		_, err = tx.ExecContext(ctx, removeQuery, userID, rolesToRemove)
		if err != nil {
			return added, removed, fmt.Errorf("failed to remove roles: %w", err)
		}
		removed = len(rolesToRemove)
	}

	// Commit transaction if we created it
	if shouldCommit {
		if err = tx.Commit(); err != nil {
			return added, removed, fmt.Errorf("failed to commit transaction: %w", err)
		}
	}

	return added, removed, nil
}
