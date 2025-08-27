package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"time"
)

// PostgresUserRepository implements UserRepository using PostgreSQL
type PostgresUserRepository struct {
	db interface{}
}

// execer interface for both *sql.DB and *sql.Tx
type execer interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresUserRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new user
func (r *PostgresUserRepository) Create(ctx context.Context, user *models.User) (*models.User, error) {
	query := `
		INSERT INTO users (username, email, password_hash, user_type, company_id, company_user_id, role)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		user.Username, user.Email, user.PasswordHash, user.UserType, 
		user.CompanyID, user.CompanyUserID, user.Role)

	err := row.Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetByID gets a user by ID
func (r *PostgresUserRepository) GetByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, 
		       created_at, updated_at
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

// GetByUsername gets a user by username
func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at,
		       created_at, updated_at
		FROM users WHERE username = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, username)

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

// GetByEmail gets a user by email
func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, created_at, updated_at, deleted_at
		FROM users WHERE email = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, email)

	user := &models.User{}

	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.UserType, &user.CompanyID, &user.CompanyUserID,
		&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// Update updates a user
func (r *PostgresUserRepository) Update(ctx context.Context, user *models.User) (*models.User, error) {
	query := `
		UPDATE users 
		SET username = $2, email = $3, password_hash = $4, user_type = $5, 
		    company_id = $6, company_user_id = $7, role = $8, status = $9,
		    current_timing_task_id = $10, timing_start_time = $11, timing_status = $12,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		user.ID, user.Username, user.Email, user.PasswordHash, 
		user.UserType, user.CompanyID, user.CompanyUserID, user.Role, user.Status,
		user.CurrentTimingTaskID, user.TimingStartTime, user.TimingStatus)

	err := row.Scan(&user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

// Delete soft deletes a user (sets deleted_at timestamp)
func (r *PostgresUserRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`

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
		return fmt.Errorf("user not found or already deleted")
	}

	return nil
}

// Restore restores a soft deleted user
func (r *PostgresUserRepository) Restore(ctx context.Context, id int) error {
	query := `UPDATE users SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found in recycle bin")
	}

	return nil
}

// HardDelete permanently deletes a user (only for admin/system cleanup)
func (r *PostgresUserRepository) HardDelete(ctx context.Context, id int) error {
	query := `DELETE FROM users WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found in recycle bin")
	}

	return nil
}

// IsDeleted checks if a user is soft deleted
func (r *PostgresUserRepository) IsDeleted(ctx context.Context, id int) (bool, error) {
	query := `SELECT deleted_at FROM users WHERE id = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	var deletedAt *time.Time
	err := row.Scan(&deletedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("user not found")
		}
		return false, fmt.Errorf("failed to check deletion status: %w", err)
	}

	return deletedAt != nil, nil
}

// List gets users with pagination
func (r *PostgresUserRepository) List(ctx context.Context, limit, offset int) ([]*models.User, int, error) {
	// Get total count (only non-deleted users)
	countQuery := `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get user count: %w", err)
	}

	// Get users with pagination (only non-deleted users)
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, created_at, updated_at, deleted_at
		FROM users 
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
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
			&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
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

// UpdateProfile updates a user's profile (username and email only)
func (r *PostgresUserRepository) UpdateProfile(ctx context.Context, userID int, username, email string) (*models.User, error) {
	query := `
		UPDATE users 
		SET username = $2, email = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, username, email, password_hash, user_type, company_id, company_user_id,
		          role, status, profile, last_login_at, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, userID, username, email)

	user := &models.User{}
	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash, 
		&user.UserType, &user.CompanyID, &user.CompanyUserID,
		&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to update user profile: %w", err)
	}

	return user, nil
}

// UpdatePassword updates a user's password
func (r *PostgresUserRepository) UpdatePassword(ctx context.Context, userID int, passwordHash string) error {
	query := `
		UPDATE users 
		SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, userID, passwordHash)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
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

// ListCompanyUsersWithPagination lists company users with pagination and filtering
func (r *PostgresUserRepository) ListCompanyUsersWithPagination(ctx context.Context, params *models.CompanyUserListParams) ([]*models.EnterpriseUserResponse, int, error) {
	// Build WHERE clause based on filters
	whereConditions := []string{"u.user_type = 'company'", "u.deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	if params.CompanyID != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("u.company_id = $%d", argIndex))
		args = append(args, *params.CompanyID)
		argIndex++
	}

	if params.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("u.status = $%d", argIndex))
		args = append(args, params.Status)
		argIndex++
	}

	if params.Search != "" {
		searchCondition := fmt.Sprintf("(u.username ILIKE $%d OR u.email ILIKE $%d OR u.contact_person_name ILIKE $%d)", argIndex, argIndex+1, argIndex+2)
		whereConditions = append(whereConditions, searchCondition)
		searchPattern := "%" + params.Search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
		argIndex += 3
	}

	whereClause := "WHERE " + fmt.Sprintf("%s", whereConditions[0])
	for i := 1; i < len(whereConditions); i++ {
		whereClause += " AND " + whereConditions[i]
	}

	// Get total count
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM users u 
		LEFT JOIN companies c ON u.company_id = c.id 
		%s`, whereClause)

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, args...)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get company user count: %w", err)
	}

	// Get users with pagination
	offset := (params.Page - 1) * params.PageSize
	query := fmt.Sprintf(`
		SELECT u.id, u.username, u.email, u.contact_person_name, u.contact_phone, 
		       u.department_title, u.is_primary_contact, u.status, u.company_id, 
		       c.company_name, u.last_login_at, u.account_expires_at, 
		       u.last_project_access, u.notes, u.created_at, u.updated_at
		FROM users u 
		LEFT JOIN companies c ON u.company_id = c.id 
		%s
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, argIndex, argIndex+1)

	args = append(args, params.PageSize, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list company users: %w", err)
	}
	defer rows.Close()

	var users []*models.EnterpriseUserResponse
	for rows.Next() {
		user := &models.EnterpriseUserResponse{}

		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.ContactPersonName,
			&user.ContactPhone, &user.DepartmentTitle, &user.IsPrimaryContact,
			&user.Status, &user.CompanyID, &user.CompanyName, &user.LastLoginAt,
			&user.AccountExpiresAt, &user.LastProjectAccess, &user.Notes,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan company user: %w", err)
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return users, total, nil
}

// GetPrimaryContactByCompanyID gets the primary contact for a company
func (r *PostgresUserRepository) GetPrimaryContactByCompanyID(ctx context.Context, companyID int) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, contact_person_name, contact_phone,
		       department_title, is_primary_contact, account_expires_at, last_project_access,
		       notes, current_timing_task_id, timing_start_time, created_at, updated_at, deleted_at
		FROM users 
		WHERE company_id = $1 AND user_type = 'company' AND is_primary_contact = true AND deleted_at IS NULL
		LIMIT 1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, companyID)

	user := &models.User{}
	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.UserType, &user.CompanyID, &user.CompanyUserID,
		&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
		&user.ContactPersonName, &user.ContactPhone, &user.DepartmentTitle,
		&user.IsPrimaryContact, &user.AccountExpiresAt, &user.LastProjectAccess,
		&user.Notes, &user.CurrentTimingTaskID, &user.TimingStartTime,
		&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No primary contact found (this is not an error)
		}
		return nil, fmt.Errorf("failed to get primary contact: %w", err)
	}

	return user, nil
}

// GetCompanyUserStatistics returns statistics about company users
func (r *PostgresUserRepository) GetCompanyUserStatistics(ctx context.Context) (*models.CompanyUserStats, error) {
	exec := r.getExecer()

	// Get total count and count by status
	statusQuery := `
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
			COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
			COUNT(CASE WHEN is_primary_contact = true THEN 1 END) as primary_contacts,
			COUNT(CASE WHEN account_expires_at IS NOT NULL AND account_expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' AND account_expires_at > CURRENT_TIMESTAMP THEN 1 END) as expiring_accounts,
			COUNT(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as recent_registrations
		FROM users 
		WHERE user_type = 'company' AND deleted_at IS NULL`

	row := exec.QueryRowContext(ctx, statusQuery)

	var total, active, inactive, primaryContacts, expiringAccounts, recentRegistrations int
	err := row.Scan(&total, &active, &inactive, &primaryContacts, &expiringAccounts, &recentRegistrations)
	if err != nil {
		return nil, fmt.Errorf("failed to get company user statistics: %w", err)
	}

	// Get count by company
	companyQuery := `
		SELECT c.company_name, COUNT(u.id) as user_count
		FROM users u
		LEFT JOIN companies c ON u.company_id = c.id
		WHERE u.user_type = 'company' AND u.deleted_at IS NULL
		GROUP BY c.id, c.company_name
		ORDER BY user_count DESC`

	rows, err := exec.QueryContext(ctx, companyQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get company user stats by company: %w", err)
	}
	defer rows.Close()

	byCompany := make(map[string]int)
	for rows.Next() {
		var companyName string
		var count int
		if err := rows.Scan(&companyName, &count); err != nil {
			return nil, fmt.Errorf("failed to scan company stats: %w", err)
		}
		byCompany[companyName] = count
	}

	byStatus := map[string]int{
		"active":   active,
		"inactive": inactive,
	}

	stats := &models.CompanyUserStats{
		Total:               total,
		ByStatus:            byStatus,
		ByCompany:           byCompany,
		PrimaryContacts:     primaryContacts,
		ExpiringAccounts:    expiringAccounts,
		RecentRegistrations: recentRegistrations,
	}

	return stats, nil
}

// GetExpiringAccounts gets company users whose accounts are expiring soon
func (r *PostgresUserRepository) GetExpiringAccounts(ctx context.Context, days int) ([]*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, contact_person_name, contact_phone,
		       department_title, is_primary_contact, account_expires_at, last_project_access,
		       notes, current_timing_task_id, timing_start_time, created_at, updated_at, deleted_at
		FROM users 
		WHERE user_type = 'company' 
		  AND account_expires_at IS NOT NULL 
		  AND account_expires_at <= CURRENT_TIMESTAMP + INTERVAL '%d days'
		  AND account_expires_at > CURRENT_TIMESTAMP
		  AND deleted_at IS NULL
		ORDER BY account_expires_at ASC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, fmt.Sprintf(query, days))
	if err != nil {
		return nil, fmt.Errorf("failed to get expiring accounts: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}

		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.PasswordHash,
			&user.UserType, &user.CompanyID, &user.CompanyUserID,
			&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
			&user.ContactPersonName, &user.ContactPhone, &user.DepartmentTitle,
			&user.IsPrimaryContact, &user.AccountExpiresAt, &user.LastProjectAccess,
			&user.Notes, &user.CurrentTimingTaskID, &user.TimingStartTime,
			&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan expiring user: %w", err)
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return users, nil
}

// GetUsersTimingTask retrieves all users currently timing the specified task
func (r *PostgresUserRepository) GetUsersTimingTask(ctx context.Context, taskID int) ([]models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id, 
		       role, status, profile, last_login_at, is_primary_contact, notes,
		       current_timing_task_id, current_user_timer_task_id, timing_start_time, 
		       timing_status, timing_paused_time, timing_accumulated_seconds,
		       created_at, updated_at, deleted_at
		FROM users 
		WHERE timing_status = 'running' 
		AND current_timing_task_id = $1
		AND deleted_at IS NULL`

	rows, err := r.getExecer().QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query users timing task: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.UserType,
			&user.CompanyID,
			&user.CompanyUserID,
			&user.Role,
			&user.Status,
			&user.Profile,
			&user.LastLoginAt,
			&user.IsPrimaryContact,
			&user.Notes,
			&user.CurrentTimingTaskID,
			&user.CurrentUserTimerTaskID,
			&user.TimingStartTime,
			&user.TimingStatus,
			&user.TimingPausedTime,
			&user.TimingAccumulatedSeconds,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user timing task: %w", err)
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return users, nil
}

// GetFirstAdminUser gets the first available admin user (fallback for task assignment)
func (r *PostgresUserRepository) GetFirstAdminUser(ctx context.Context) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at,
		       current_timing_task_id, current_user_timer_task_id, timing_start_time, timing_status,
		       created_at, updated_at
		FROM users 
		WHERE role = 'admin' AND status = 'active'
		ORDER BY created_at ASC
		LIMIT 1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query)

	user := &models.User{}

	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.UserType, &user.CompanyID, &user.CompanyUserID,
		&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
		&user.CurrentTimingTaskID, &user.CurrentUserTimerTaskID, &user.TimingStartTime, &user.TimingStatus,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no admin users found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get first admin user: %w", err)
	}

	return user, nil
}
