package database

import (
	"context"
	"database/sql"
	"fmt"
)

// PostgresEnterpriseUserManagementRepository is a PostgreSQL implementation
type PostgresEnterpriseUserManagementRepository struct {
	db *sql.DB
}

// NewPostgresEnterpriseUserManagementRepository creates a new repository instance
func NewPostgresEnterpriseUserManagementRepository(db *sql.DB) *PostgresEnterpriseUserManagementRepository {
	return &PostgresEnterpriseUserManagementRepository{db: db}
}

// CountEnterpriseUsers returns the total count of enterprise users matching filters
func (r *PostgresEnterpriseUserManagementRepository) CountEnterpriseUsers(ctx context.Context, filters EnterpriseUserFilters) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM (
			SELECT u.id
			FROM users u
			JOIN enterprise_users eu ON u.id = eu.user_id
			WHERE eu.enterprise_id = $1
			  AND eu.deleted_at IS NULL
			  AND u.deleted_at IS NULL
			  AND u.user_type = 'enterprise'
	`

	args := []interface{}{filters.EnterpriseID}
	argIndex := 2

	// Add search filter
	if filters.Search != nil && *filters.Search != "" {
		query += fmt.Sprintf(" AND (u.username LIKE $%d OR u.email LIKE $%d)", argIndex, argIndex)
		searchPattern := "%" + *filters.Search + "%"
		args = append(args, searchPattern)
		argIndex++
	}

	// Add status filter
	if filters.Status != nil && *filters.Status != "" {
		query += fmt.Sprintf(" AND u.status = $%d", argIndex)
		args = append(args, *filters.Status)
		argIndex++
	}

	// Add role filter
	if filters.RoleID != nil {
		query += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM enterprise_user_roles eur
			WHERE eur.enterprise_user_id = eu.id
			  AND eur.role_id = $%d
			  AND eur.deleted_at IS NULL
		)`, argIndex)
		args = append(args, *filters.RoleID)
		argIndex++
	}

	// Add department filter
	if filters.DepartmentID != nil {
		query += fmt.Sprintf(" AND eu.department_id = $%d", argIndex)
		args = append(args, *filters.DepartmentID)
		argIndex++
	}

	query += ") AS filtered_users"

	var total int
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to count enterprise users: %w", err)
	}

	return total, nil
}

// ListEnterpriseUsers retrieves a paginated list of enterprise users
func (r *PostgresEnterpriseUserManagementRepository) ListEnterpriseUsers(ctx context.Context, filters EnterpriseUserFilters, pagination EnterpriseUserPagination) ([]EnterpriseUser, error) {
	fmt.Printf("===== [UNIQUE_LOG_12345] REPOSITORY CODE IS RUNNING - EnterpriseID: %d =====\n", filters.EnterpriseID)
	fmt.Printf("===== [UNIQUE_LOG_12345] Using user_type='enterprise' filter =====\n")
	query := `
		SELECT
			u.id AS user_id,
			u.username,
			u.email,
			u.user_type,
			u.status AS user_status,
			eu.id AS enterprise_user_id,
			eu.enterprise_id,
			eu.status AS enterprise_status,
			TO_CHAR(eu.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
			TO_CHAR(eu.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
			TO_CHAR(u.last_login_at, 'YYYY-MM-DD HH24:MI:SS') AS last_login_at,
			eu.name,
			eu.phone,
			eu.position,
			eu.department_id,
			ed.name AS department_name,
			COALESCE(eu.access_level, 1) AS access_level,
			COALESCE(eu.is_primary_contact, FALSE) AS is_primary_contact,
			eu.bio
		FROM users u
		JOIN enterprise_users eu ON u.id = eu.user_id
		LEFT JOIN enterprise_departments ed ON eu.department_id = ed.id AND ed.deleted_at IS NULL
		WHERE eu.enterprise_id = $1
		  AND eu.deleted_at IS NULL
		  AND u.deleted_at IS NULL
		  AND u.user_type = 'enterprise'
	`

	args := []interface{}{filters.EnterpriseID}
	argIndex := 2

	// Add search filter
	if filters.Search != nil && *filters.Search != "" {
		query += fmt.Sprintf(" AND (u.username LIKE $%d OR u.email LIKE $%d)", argIndex, argIndex)
		searchPattern := "%" + *filters.Search + "%"
		args = append(args, searchPattern)
		argIndex++
	}

	// Add status filter
	if filters.Status != nil && *filters.Status != "" {
		query += fmt.Sprintf(" AND u.status = $%d", argIndex)
		args = append(args, *filters.Status)
		argIndex++
	}

	// Add role filter
	if filters.RoleID != nil {
		query += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM enterprise_user_roles eur
			WHERE eur.enterprise_user_id = eu.id
			  AND eur.role_id = $%d
			  AND eur.deleted_at IS NULL
		)`, argIndex)
		args = append(args, *filters.RoleID)
		argIndex++
	}

	// Add department filter
	if filters.DepartmentID != nil {
		query += fmt.Sprintf(" AND eu.department_id = $%d", argIndex)
		args = append(args, *filters.DepartmentID)
		argIndex++
	}

	// Add pagination
	query += fmt.Sprintf(" ORDER BY eu.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, pagination.PageSize, (pagination.Page-1)*pagination.PageSize)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list enterprise users: %w", err)
	}
	defer rows.Close()

	users := make([]EnterpriseUser, 0)
	for rows.Next() {
		var user EnterpriseUser
		var lastLoginAt sql.NullString
		var name, phone, position, departmentName, bio sql.NullString
		var departmentID sql.NullInt64

		err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.UserType,
			&user.UserStatus,
			&user.EnterpriseUserID,
			&user.EnterpriseID,
			&user.EnterpriseStatus,
			&user.CreatedAt,
			&user.UpdatedAt,
			&lastLoginAt,
			&name,
			&phone,
			&position,
			&departmentID,
			&departmentName,
			&user.AccessLevel,
			&user.IsPrimaryContact,
			&bio,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan enterprise user: %w", err)
		}

		if lastLoginAt.Valid {
			user.LastLoginAt = &lastLoginAt.String
		}
		if name.Valid {
			user.Name = &name.String
		}
		if phone.Valid {
			user.Phone = &phone.String
		}
		if position.Valid {
			user.Position = &position.String
		}
		if departmentID.Valid {
			deptID := uint(departmentID.Int64)
			user.DepartmentID = &deptID
		}
		if departmentName.Valid {
			user.DepartmentName = &departmentName.String
		}
		if bio.Valid {
			user.Bio = &bio.String
		}

		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating enterprise users: %w", err)
	}

	return users, nil
}

// CheckUserExists checks if a user exists in the system
func (r *PostgresEnterpriseUserManagementRepository) CheckUserExists(ctx context.Context, userID uint) (username string, email string, userType string, err error) {
	query := `
		SELECT COALESCE(username, ''), COALESCE(email, ''), user_type
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	err = r.db.QueryRowContext(ctx, query, userID).Scan(&username, &email, &userType)
	if err == sql.ErrNoRows {
		return "", "", "", fmt.Errorf("user not found")
	}
	if err != nil {
		return "", "", "", fmt.Errorf("failed to check user existence: %w", err)
	}

	return username, email, userType, nil
}

// CheckUserMembership checks if user is already member of enterprise
func (r *PostgresEnterpriseUserManagementRepository) CheckUserMembership(ctx context.Context, enterpriseID uint, userID uint) (enterpriseUserID uint, err error) {
	query := `
		SELECT id FROM enterprise_users
		WHERE enterprise_id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	err = r.db.QueryRowContext(ctx, query, enterpriseID, userID).Scan(&enterpriseUserID)
	if err == sql.ErrNoRows {
		return 0, nil // Not found is not an error
	}
	if err != nil {
		return 0, fmt.Errorf("failed to check user membership: %w", err)
	}

	return enterpriseUserID, nil
}

// GetDefaultRole retrieves the default member role ID for an enterprise
func (r *PostgresEnterpriseUserManagementRepository) GetDefaultRole(ctx context.Context, enterpriseID uint) (roleID uint, err error) {
	query := `
		SELECT id FROM enterprise_roles
		WHERE enterprise_id = $1 AND code = 'member' AND is_active = TRUE AND deleted_at IS NULL
		LIMIT 1
	`

	var nullableID sql.NullInt64
	err = r.db.QueryRowContext(ctx, query, enterpriseID).Scan(&nullableID)
	if err == sql.ErrNoRows {
		return 0, nil // No default role found is OK
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get default role: %w", err)
	}

	if nullableID.Valid {
		return uint(nullableID.Int64), nil
	}

	return 0, nil
}

// CreateEnterpriseUser adds a user to an enterprise
func (r *PostgresEnterpriseUserManagementRepository) CreateEnterpriseUser(ctx context.Context, params EnterpriseUserCreateParams) (enterpriseUserID uint, err error) {
	query := `
		INSERT INTO enterprise_users (
			enterprise_id, user_id, username, email, role_id, status, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, 'active', $6, NOW(), NOW()
		) RETURNING id
	`

	err = r.db.QueryRowContext(ctx, query,
		params.EnterpriseID,
		params.UserID,
		params.Username,
		params.Email,
		params.DefaultRoleID,
		params.CreatedBy,
	).Scan(&enterpriseUserID)

	if err != nil {
		return 0, fmt.Errorf("failed to create enterprise user: %w", err)
	}

	return enterpriseUserID, nil
}

// GetEnterpriseUser retrieves detailed information about an enterprise user
func (r *PostgresEnterpriseUserManagementRepository) GetEnterpriseUser(ctx context.Context, enterpriseID uint, userID uint) (*EnterpriseUser, error) {
	query := `
		SELECT
			u.id AS user_id,
			u.username,
			u.email,
			u.user_type,
			u.status AS user_status,
			eu.id AS enterprise_user_id,
			eu.enterprise_id,
			eu.status AS enterprise_status,
			TO_CHAR(eu.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
			TO_CHAR(eu.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
			TO_CHAR(u.last_login_at, 'YYYY-MM-DD HH24:MI:SS') AS last_login_at
		FROM users u
		JOIN enterprise_users eu ON u.id = eu.user_id
		WHERE eu.enterprise_id = $1
		  AND eu.user_id = $2
		  AND eu.deleted_at IS NULL
		  AND u.deleted_at IS NULL
		  AND u.user_type = 'enterprise'
	`

	var user EnterpriseUser
	var lastLoginAt sql.NullString

	err := r.db.QueryRowContext(ctx, query, enterpriseID, userID).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.UserType,
		&user.UserStatus,
		&user.EnterpriseUserID,
		&user.EnterpriseID,
		&user.EnterpriseStatus,
		&user.CreatedAt,
		&user.UpdatedAt,
		&lastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found in enterprise")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise user: %w", err)
	}

	if lastLoginAt.Valid {
		user.LastLoginAt = &lastLoginAt.String
	}

	return &user, nil
}

// GetEnterpriseUserID retrieves the enterprise_users.id for a user in an enterprise
func (r *PostgresEnterpriseUserManagementRepository) GetEnterpriseUserID(ctx context.Context, enterpriseID uint, userID uint) (enterpriseUserID uint, err error) {
	query := `
		SELECT id FROM enterprise_users
		WHERE enterprise_id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	err = r.db.QueryRowContext(ctx, query, enterpriseID, userID).Scan(&enterpriseUserID)
	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("user not found in enterprise")
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get enterprise user ID: %w", err)
	}

	return enterpriseUserID, nil
}

// RemoveEnterpriseUser soft deletes an enterprise user
func (r *PostgresEnterpriseUserManagementRepository) RemoveEnterpriseUser(ctx context.Context, enterpriseUserID uint) (username string, err error) {
	// First get the username for logging
	getUserQuery := `
		SELECT COALESCE(u.username, '') as username
		FROM enterprise_users eu
		JOIN users u ON eu.user_id = u.id
		WHERE eu.id = $1 AND eu.deleted_at IS NULL
	`

	err = r.db.QueryRowContext(ctx, getUserQuery, enterpriseUserID).Scan(&username)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("enterprise user not found")
	}
	if err != nil {
		return "", fmt.Errorf("failed to get user info: %w", err)
	}

	// Soft delete the enterprise_users record
	deleteQuery := `
		UPDATE enterprise_users
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`

	_, err = r.db.ExecContext(ctx, deleteQuery, enterpriseUserID)
	if err != nil {
		return "", fmt.Errorf("failed to remove enterprise user: %w", err)
	}

	return username, nil
}

// GetEnterpriseUserWithUsername gets enterprise_user.id and username
func (r *PostgresEnterpriseUserManagementRepository) GetEnterpriseUserWithUsername(ctx context.Context, enterpriseID uint, userID uint) (enterpriseUserID uint, username string, err error) {
	query := `
		SELECT eu.id, COALESCE(u.username, '') as username
		FROM enterprise_users eu
		JOIN users u ON eu.user_id = u.id
		WHERE eu.enterprise_id = $1 AND eu.user_id = $2 AND eu.deleted_at IS NULL
	`

	err = r.db.QueryRowContext(ctx, query, enterpriseID, userID).Scan(&enterpriseUserID, &username)
	if err == sql.ErrNoRows {
		return 0, "", fmt.Errorf("user not found in enterprise")
	}
	if err != nil {
		return 0, "", fmt.Errorf("failed to get enterprise user: %w", err)
	}

	return enterpriseUserID, username, nil
}
