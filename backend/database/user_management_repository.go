package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// UserManagementRepository extends user repository with management functions
type UserManagementRepository struct {
	db interface{}
}

// NewUserManagementRepository creates a new user management repository
func NewUserManagementRepository(db interface{}) *UserManagementRepository {
	return &UserManagementRepository{db: db}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *UserManagementRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// CreateUser creates a new user with enhanced fields
func (r *UserManagementRepository) CreateUser(ctx context.Context, user *models.User) (*models.User, error) {
	query := `
		INSERT INTO users (username, email, password_hash, user_type, company_id, company_user_id, role, status, profile)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		user.Username, user.Email, user.PasswordHash, user.UserType,
		user.CompanyID, user.CompanyUserID, user.Role, user.Status, user.Profile)

	err := row.Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetUserByID gets a user by ID with all fields
func (r *UserManagementRepository) GetUserByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id, 
		       role, status, profile, last_login_at, created_at, updated_at
		FROM users WHERE id = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	user := &models.User{}
	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.UserType, &user.CompanyID, &user.CompanyUserID,
		&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// UpdateUser updates a user with partial updates
func (r *UserManagementRepository) UpdateUser(ctx context.Context, id int, req *models.UserUpdateRequest) (*models.User, error) {
	// Build dynamic query based on provided fields
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Username != nil {
		setParts = append(setParts, fmt.Sprintf("username = $%d", argIndex))
		args = append(args, *req.Username)
		argIndex++
	}
	if req.Email != nil {
		setParts = append(setParts, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, *req.Email)
		argIndex++
	}
	if req.UserType != nil {
		setParts = append(setParts, fmt.Sprintf("user_type = $%d", argIndex))
		args = append(args, *req.UserType)
		argIndex++
	}
	if req.CompanyID != nil {
		setParts = append(setParts, fmt.Sprintf("company_id = $%d", argIndex))
		args = append(args, *req.CompanyID)
		argIndex++
	}
	if req.Role != nil {
		setParts = append(setParts, fmt.Sprintf("role = $%d", argIndex))
		args = append(args, *req.Role)
		argIndex++
	}
	if req.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++
	}
	if req.Profile != nil {
		setParts = append(setParts, fmt.Sprintf("profile = $%d", argIndex))
		args = append(args, *req.Profile)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetUserByID(ctx, id)
	}

	// Add updated_at
	setParts = append(setParts, "updated_at = NOW()")

	// Add WHERE clause
	args = append(args, id)
	whereClause := fmt.Sprintf("id = $%d", argIndex)

	query := fmt.Sprintf(`
		UPDATE users 
		SET %s
		WHERE %s
		RETURNING id, username, email, password_hash, user_type, company_id, company_user_id,
		          role, status, profile, last_login_at, created_at, updated_at`,
		strings.Join(setParts, ", "), whereClause)

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, args...)

	user := &models.User{}
	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.UserType, &user.CompanyID, &user.CompanyUserID,
		&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

// DeleteUser soft deletes a user (or hard delete based on preference)
func (r *UserManagementRepository) DeleteUser(ctx context.Context, id int) error {
	// For now, we'll do hard delete. You can implement soft delete by adding deleted_at field
	query := `DELETE FROM users WHERE id = $1`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// ListUsers gets users with advanced filtering and pagination
func (r *UserManagementRepository) ListUsers(ctx context.Context, params *models.UserListParams) ([]*models.User, int, error) {
	// Build WHERE clause
	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if params.Role != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("role = $%d", argIndex))
		args = append(args, params.Role)
		argIndex++
	}

	if params.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, params.Status)
		argIndex++
	}

	if params.UserType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("user_type = $%d", argIndex))
		args = append(args, params.UserType)
		argIndex++
	}

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR profile->>'name' ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, searchPattern)
		argIndex++
	}

	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause)
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, args...)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get user count: %w", err)
	}

	// Calculate offset
	offset := (params.Page - 1) * params.PageSize

	// Get users with pagination
	query := fmt.Sprintf(`
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, created_at, updated_at
		FROM users 
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, argIndex, argIndex+1)

	args = append(args, params.PageSize, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}

		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.PasswordHash,
			&user.UserType, &user.CompanyID, &user.CompanyUserID,
			&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return users, total, nil
}

// ResetPassword resets a user's password
func (r *UserManagementRepository) ResetPassword(ctx context.Context, userID int, passwordHash string) error {
	query := `
		UPDATE users 
		SET password_hash = $2, updated_at = NOW()
		WHERE id = $1`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, userID, passwordHash)
	if err != nil {
		return fmt.Errorf("failed to reset password: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// UpdateUserStatus updates a user's status
func (r *UserManagementRepository) UpdateUserStatus(ctx context.Context, userID int, status string) (*models.User, error) {
	query := `
		UPDATE users 
		SET status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, username, email, password_hash, user_type, company_id, company_user_id,
		          role, status, profile, last_login_at, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, userID, status)

	user := &models.User{}
	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.UserType, &user.CompanyID, &user.CompanyUserID,
		&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update user status: %w", err)
	}

	return user, nil
}

// BatchUpdateUsers performs batch operations on users
func (r *UserManagementRepository) BatchUpdateUsers(ctx context.Context, userIDs []int, action string) error {
	if len(userIDs) == 0 {
		return fmt.Errorf("no user IDs provided")
	}

	placeholders := make([]string, len(userIDs))
	args := make([]interface{}, len(userIDs))
	for i, id := range userIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	var query string
	switch action {
	case "activate":
		query = fmt.Sprintf("UPDATE users SET status = 'active', updated_at = NOW() WHERE id IN (%s)", strings.Join(placeholders, ","))
	case "suspend":
		query = fmt.Sprintf("UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id IN (%s)", strings.Join(placeholders, ","))
	case "delete":
		query = fmt.Sprintf("DELETE FROM users WHERE id IN (%s)", strings.Join(placeholders, ","))
	default:
		return fmt.Errorf("invalid action: %s", action)
	}

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to perform batch operation: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no users were affected")
	}

	return nil
}

// GetUserStats gets user statistics
func (r *UserManagementRepository) GetUserStats(ctx context.Context) (*models.UserStats, error) {
	query := `
		SELECT 
			total_users,
			active_users,
			admin_count,
			project_manager_count,
			developer_count,
			client_count,
			recent_registrations
		FROM user_stats`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query)

	var total, active, adminCount, pmCount, devCount, clientCount, recent int
	err := row.Scan(&total, &active, &adminCount, &pmCount, &devCount, &clientCount, &recent)
	if err != nil {
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}

	// Get status breakdown
	statusQuery := `
		SELECT 
			COUNT(*) FILTER (WHERE status = 'active') as active,
			COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
			COUNT(*) FILTER (WHERE status = 'suspended') as suspended
		FROM users`

	var activeStatus, inactiveStatus, suspendedStatus int
	statusRow := exec.QueryRowContext(ctx, statusQuery)
	err = statusRow.Scan(&activeStatus, &inactiveStatus, &suspendedStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to get status stats: %w", err)
	}

	return &models.UserStats{
		Total: total,
		ByRole: map[string]int{
			"admin":           adminCount,
			"project_manager": pmCount,
			"developer":       devCount,
			"company_admin":   0, // TODO: Add company_admin count from view
			"company_user":    0, // TODO: Add company_user count from view
		},
		ByStatus: map[string]int{
			"active":    activeStatus,
			"inactive":  inactiveStatus,
			"suspended": suspendedStatus,
		},
		RecentRegistrations: recent,
	}, nil
}

// UpdateLastLogin updates the last login timestamp
func (r *UserManagementRepository) UpdateLastLogin(ctx context.Context, userID int) error {
	query := `UPDATE users SET last_login_at = NOW() WHERE id = $1`

	exec := r.getExecer()
	_, err := exec.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	return nil
}
