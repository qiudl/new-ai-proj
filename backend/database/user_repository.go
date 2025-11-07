package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// PostgresUserRepository implements UserRepository using PostgreSQL with enterprise support
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
	// Route company users to enterprise_users table
	if user.UserType == "company" {
		return r.createEnterpriseUser(ctx, user)
	}
	
	// System users continue using users table
	query := `
		INSERT INTO users (username, email, password_hash, user_type, company_id, company_user_id, role, 
		                  contact_person_name, contact_phone, department_title, is_primary_contact, 
		                  account_expires_at, notes, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		user.Username, user.Email, user.PasswordHash, user.UserType,
		user.CompanyID, user.CompanyUserID, user.Role,
		user.ContactPersonName, user.ContactPhone, user.DepartmentTitle, user.IsPrimaryContact,
		user.AccountExpiresAt, user.Notes, user.Status)

	err := row.Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create system user: %w", err)
	}

	return user, nil
}

// createEnterpriseUser creates a company user in enterprise_users table
func (r *PostgresUserRepository) createEnterpriseUser(ctx context.Context, user *models.User) (*models.User, error) {
	// Determine enterprise_id from company_id (assuming they map 1:1)
	enterpriseID := user.CompanyID
	if enterpriseID == nil {
		return nil, fmt.Errorf("company_id is required for company users")
	}

	// Map User fields to enterprise_users fields
	query := `
		INSERT INTO enterprise_users (enterprise_id, username, email, name, phone, position, 
		                            is_primary_contact, access_level, status, last_login_at, bio)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	
	// Map fields appropriately
	name := ""
	if user.ContactPersonName != nil {
		name = *user.ContactPersonName
	}
	
	phone := ""
	if user.ContactPhone != nil {
		phone = *user.ContactPhone
	}
	
	position := ""
	if user.DepartmentTitle != nil {
		position = *user.DepartmentTitle
	}
	
	// Map role to access_level
	accessLevel := 1 // default
	switch user.Role {
	case "company_admin":
		accessLevel = 4
	case "company_user":
		accessLevel = 2
	}
	
	// Map notes to bio
	bio := ""
	if user.Notes != nil {
		bio = *user.Notes
	}

	var newID int
	var createdAt, updatedAt time.Time
	err := exec.QueryRowContext(ctx, query,
		enterpriseID, user.Username, user.Email, name, phone, position,
		user.IsPrimaryContact, accessLevel, user.Status, user.LastLoginAt, bio).Scan(&newID, &createdAt, &updatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise user: %w", err)
	}

	// Update user with new values
	user.ID = newID
	user.CreatedAt = createdAt
	user.UpdatedAt = updatedAt

	return user, nil
}

// GetByID gets a user by ID
func (r *PostgresUserRepository) GetByID(ctx context.Context, id int) (*models.User, error) {
	// First try to get from users table (system users)
	user, err := r.getSystemUserByID(ctx, id)
	if err == nil {
		return user, nil
	}
	
	// If not found, try enterprise_users table
	return r.getEnterpriseUserByID(ctx, id)
}

// getSystemUserByID gets a system user from users table
func (r *PostgresUserRepository) getSystemUserByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, 
		       created_at, updated_at
		FROM users WHERE id = $1 AND deleted_at IS NULL`

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
		return nil, fmt.Errorf("system user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get system user: %w", err)
	}

	return user, nil
}

// getEnterpriseUserByID gets an enterprise user and maps to User model
func (r *PostgresUserRepository) getEnterpriseUserByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT eu.id, eu.username, eu.email, eu.enterprise_id, eu.name, eu.phone, eu.position,
		       eu.is_primary_contact, eu.access_level, eu.status, eu.last_login_at, eu.bio,
		       eu.created_at, eu.updated_at
		FROM enterprise_users eu
		WHERE eu.id = $1 AND eu.deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	var euID int
	var username, email string
	var enterpriseID int
	var name, phone, position sql.NullString
	var isPrimaryContact bool
	var accessLevel int
	var status string
	var lastLoginAt *time.Time
	var bio sql.NullString
	var createdAt, updatedAt time.Time

	err := row.Scan(&euID, &username, &email, &enterpriseID, &name, &phone, &position,
		&isPrimaryContact, &accessLevel, &status, &lastLoginAt, &bio, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise user: %w", err)
	}

	// Map enterprise user to User model
	user := &models.User{
		ID:               euID,
		Username:         username,
		Email:            email,
		UserType:         "company",
		CompanyID:        &enterpriseID,
		Status:           status,
		LastLoginAt:      lastLoginAt,
		IsPrimaryContact: isPrimaryContact,
		CreatedAt:        createdAt,
		UpdatedAt:        updatedAt,
	}

	// Map string fields with null handling
	if name.Valid {
		user.ContactPersonName = &name.String
	}
	if phone.Valid {
		user.ContactPhone = &phone.String
	}
	if position.Valid {
		user.DepartmentTitle = &position.String
	}
	if bio.Valid {
		user.Notes = &bio.String
	}

	// Map access_level to role
	switch accessLevel {
	case 4, 5:
		user.Role = "company_admin"
	default:
		user.Role = "company_user"
	}

	return user, nil
}

// GetByUsername gets a user by username
func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	// First try system users
	user, err := r.getSystemUserByUsername(ctx, username)
	if err == nil {
		return user, nil
	}
	
	// Then try enterprise users
	return r.getEnterpriseUserByUsername(ctx, username)
}

// getSystemUserByUsername gets a system user by username
func (r *PostgresUserRepository) getSystemUserByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at,
		       created_at, updated_at
		FROM users WHERE username = $1 AND deleted_at IS NULL`

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
		return nil, fmt.Errorf("system user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get system user: %w", err)
	}

	return user, nil
}

// getEnterpriseUserByUsername gets an enterprise user by username
func (r *PostgresUserRepository) getEnterpriseUserByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT eu.id, eu.username, eu.email, eu.enterprise_id, eu.name, eu.phone, eu.position,
		       eu.is_primary_contact, eu.access_level, eu.status, eu.last_login_at, eu.bio,
		       eu.created_at, eu.updated_at
		FROM enterprise_users eu
		WHERE eu.username = $1 AND eu.deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, username)

	var euID int
	var user_username, email string
	var enterpriseID int
	var name, phone, position sql.NullString
	var isPrimaryContact bool
	var accessLevel int
	var status string
	var lastLoginAt *time.Time
	var bio sql.NullString
	var createdAt, updatedAt time.Time

	err := row.Scan(&euID, &user_username, &email, &enterpriseID, &name, &phone, &position,
		&isPrimaryContact, &accessLevel, &status, &lastLoginAt, &bio, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise user: %w", err)
	}

	// Map to User model
	user := &models.User{
		ID:               euID,
		Username:         user_username,
		Email:            email,
		UserType:         "company",
		CompanyID:        &enterpriseID,
		Status:           status,
		LastLoginAt:      lastLoginAt,
		IsPrimaryContact: isPrimaryContact,
		CreatedAt:        createdAt,
		UpdatedAt:        updatedAt,
	}

	// Map optional fields
	if name.Valid {
		user.ContactPersonName = &name.String
	}
	if phone.Valid {
		user.ContactPhone = &phone.String
	}
	if position.Valid {
		user.DepartmentTitle = &position.String
	}
	if bio.Valid {
		user.Notes = &bio.String
	}

	// Map access_level to role
	switch accessLevel {
	case 4, 5:
		user.Role = "company_admin"
	default:
		user.Role = "company_user"
	}

	return user, nil
}

// GetByEmail gets a user by email
func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	// First try system users
	user, err := r.getSystemUserByEmail(ctx, email)
	if err == nil {
		return user, nil
	}
	
	// Then try enterprise users
	return r.getEnterpriseUserByEmail(ctx, email)
}

// getSystemUserByEmail gets a system user by email
func (r *PostgresUserRepository) getSystemUserByEmail(ctx context.Context, email string) (*models.User, error) {
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
		return nil, fmt.Errorf("system user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get system user: %w", err)
	}

	return user, nil
}

// getEnterpriseUserByEmail gets an enterprise user by email
func (r *PostgresUserRepository) getEnterpriseUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT eu.id, eu.username, eu.email, eu.enterprise_id, eu.name, eu.phone, eu.position,
		       eu.is_primary_contact, eu.access_level, eu.status, eu.last_login_at, eu.bio,
		       eu.created_at, eu.updated_at, eu.deleted_at
		FROM enterprise_users eu
		WHERE eu.email = $1 AND eu.deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, email)

	var euID int
	var username, user_email string
	var enterpriseID int
	var name, phone, position sql.NullString
	var isPrimaryContact bool
	var accessLevel int
	var status string
	var lastLoginAt *time.Time
	var bio sql.NullString
	var createdAt, updatedAt time.Time
	var deletedAt *time.Time

	err := row.Scan(&euID, &username, &user_email, &enterpriseID, &name, &phone, &position,
		&isPrimaryContact, &accessLevel, &status, &lastLoginAt, &bio, &createdAt, &updatedAt, &deletedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise user: %w", err)
	}

	// Map to User model
	user := &models.User{
		ID:               euID,
		Username:         username,
		Email:            user_email,
		UserType:         "company",
		CompanyID:        &enterpriseID,
		Status:           status,
		LastLoginAt:      lastLoginAt,
		IsPrimaryContact: isPrimaryContact,
		CreatedAt:        createdAt,
		UpdatedAt:        updatedAt,
		DeletedAt:        deletedAt,
	}

	// Map optional fields
	if name.Valid {
		user.ContactPersonName = &name.String
	}
	if phone.Valid {
		user.ContactPhone = &phone.String
	}
	if position.Valid {
		user.DepartmentTitle = &position.String
	}
	if bio.Valid {
		user.Notes = &bio.String
	}

	// Map access_level to role
	switch accessLevel {
	case 4, 5:
		user.Role = "company_admin"
	default:
		user.Role = "company_user"
	}

	return user, nil
}

// Update updates a user
func (r *PostgresUserRepository) Update(ctx context.Context, user *models.User) (*models.User, error) {
	// Route company users to enterprise_users table
	if user.UserType == "company" {
		return r.updateEnterpriseUser(ctx, user)
	}
	
	// System users continue using users table
	query := `
		UPDATE users 
		SET username = $2, email = $3, password_hash = $4, user_type = $5, 
		    company_id = $6, company_user_id = $7, role = $8, status = $9,
		    current_timing_task_id = $10, timing_start_time = $11, 
		    timing_status = COALESCE($12, timing_status),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at`

	exec := r.getExecer()
	
	// Handle timing_status - provide NULL for empty string to avoid enum constraint error
	var timingStatus interface{}
	if user.TimingStatus == "" {
		timingStatus = nil
	} else {
		timingStatus = user.TimingStatus
	}
	
	row := exec.QueryRowContext(ctx, query,
		user.ID, user.Username, user.Email, user.PasswordHash,
		user.UserType, user.CompanyID, user.CompanyUserID, user.Role, user.Status,
		user.CurrentTimingTaskID, user.TimingStartTime, timingStatus)

	err := row.Scan(&user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update system user: %w", err)
	}

	return user, nil
}

// updateEnterpriseUser updates an enterprise user
func (r *PostgresUserRepository) updateEnterpriseUser(ctx context.Context, user *models.User) (*models.User, error) {
	// Map User fields to enterprise_users fields
	query := `
		UPDATE enterprise_users 
		SET username = $2, email = $3, name = $4, phone = $5, position = $6,
		    is_primary_contact = $7, access_level = $8, status = $9, bio = $10,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	
	// Map fields appropriately
	name := ""
	if user.ContactPersonName != nil {
		name = *user.ContactPersonName
	}
	
	phone := ""
	if user.ContactPhone != nil {
		phone = *user.ContactPhone
	}
	
	position := ""
	if user.DepartmentTitle != nil {
		position = *user.DepartmentTitle
	}
	
	// Map role to access_level
	accessLevel := 1 // default
	switch user.Role {
	case "company_admin":
		accessLevel = 4
	case "company_user":
		accessLevel = 2
	}
	
	// Map notes to bio
	bio := ""
	if user.Notes != nil {
		bio = *user.Notes
	}

	row := exec.QueryRowContext(ctx, query,
		user.ID, user.Username, user.Email, name, phone, position,
		user.IsPrimaryContact, accessLevel, user.Status, bio)

	err := row.Scan(&user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise user: %w", err)
	}

	return user, nil
}

// Delete soft deletes a user (sets deleted_at timestamp)
func (r *PostgresUserRepository) Delete(ctx context.Context, id int) error {
	// Try to delete from both tables
	systemErr := r.deleteSystemUser(ctx, id)
	enterpriseErr := r.deleteEnterpriseUser(ctx, id)
	
	// If both failed, return error
	if systemErr != nil && enterpriseErr != nil {
		return fmt.Errorf("user not found in either table")
	}
	
	return nil
}

// deleteSystemUser deletes from users table
func (r *PostgresUserRepository) deleteSystemUser(ctx context.Context, id int) error {
	query := `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete system user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("system user not found or already deleted")
	}

	return nil
}

// deleteEnterpriseUser deletes from enterprise_users table
func (r *PostgresUserRepository) deleteEnterpriseUser(ctx context.Context, id int) error {
	query := `UPDATE enterprise_users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete enterprise user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("enterprise user not found or already deleted")
	}

	return nil
}

// Restore restores a soft deleted user
func (r *PostgresUserRepository) Restore(ctx context.Context, id int) error {
	// Try to restore from both tables
	systemErr := r.restoreSystemUser(ctx, id)
	enterpriseErr := r.restoreEnterpriseUser(ctx, id)
	
	// If both failed, return error
	if systemErr != nil && enterpriseErr != nil {
		return fmt.Errorf("user not found in recycle bin")
	}
	
	return nil
}

// restoreSystemUser restores from users table
func (r *PostgresUserRepository) restoreSystemUser(ctx context.Context, id int) error {
	query := `UPDATE users SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore system user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("system user not found in recycle bin")
	}

	return nil
}

// restoreEnterpriseUser restores from enterprise_users table
func (r *PostgresUserRepository) restoreEnterpriseUser(ctx context.Context, id int) error {
	query := `UPDATE enterprise_users SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore enterprise user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("enterprise user not found in recycle bin")
	}

	return nil
}

// HardDelete permanently deletes a user (only for admin/system cleanup)
func (r *PostgresUserRepository) HardDelete(ctx context.Context, id int) error {
	// Try to hard delete from both tables
	systemErr := r.hardDeleteSystemUser(ctx, id)
	enterpriseErr := r.hardDeleteEnterpriseUser(ctx, id)
	
	// If both failed, return error
	if systemErr != nil && enterpriseErr != nil {
		return fmt.Errorf("user not found in recycle bin")
	}
	
	return nil
}

// hardDeleteSystemUser permanently deletes from users table
func (r *PostgresUserRepository) hardDeleteSystemUser(ctx context.Context, id int) error {
	query := `DELETE FROM users WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete system user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("system user not found in recycle bin")
	}

	return nil
}

// hardDeleteEnterpriseUser permanently deletes from enterprise_users table
func (r *PostgresUserRepository) hardDeleteEnterpriseUser(ctx context.Context, id int) error {
	query := `DELETE FROM enterprise_users WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete enterprise user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("enterprise user not found in recycle bin")
	}

	return nil
}

// IsDeleted checks if a user is soft deleted
func (r *PostgresUserRepository) IsDeleted(ctx context.Context, id int) (bool, error) {
	// Check both tables
	systemDeleted, systemErr := r.isSystemUserDeleted(ctx, id)
	if systemErr == nil {
		return systemDeleted, nil
	}
	
	enterpriseDeleted, enterpriseErr := r.isEnterpriseUserDeleted(ctx, id)
	if enterpriseErr == nil {
		return enterpriseDeleted, nil
	}
	
	return false, fmt.Errorf("user not found")
}

// isSystemUserDeleted checks if system user is deleted
func (r *PostgresUserRepository) isSystemUserDeleted(ctx context.Context, id int) (bool, error) {
	query := `SELECT deleted_at FROM users WHERE id = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	var deletedAt *time.Time
	err := row.Scan(&deletedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("system user not found")
		}
		return false, fmt.Errorf("failed to check deletion status: %w", err)
	}

	return deletedAt != nil, nil
}

// isEnterpriseUserDeleted checks if enterprise user is deleted
func (r *PostgresUserRepository) isEnterpriseUserDeleted(ctx context.Context, id int) (bool, error) {
	query := `SELECT deleted_at FROM enterprise_users WHERE id = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	var deletedAt *time.Time
	err := row.Scan(&deletedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("enterprise user not found")
		}
		return false, fmt.Errorf("failed to check deletion status: %w", err)
	}

	return deletedAt != nil, nil
}

// List gets users with pagination
func (r *PostgresUserRepository) List(ctx context.Context, limit, offset int) ([]*models.User, int, error) {
	// Get users from both tables and combine
	systemUsers, systemTotal, _ := r.listSystemUsers(ctx, limit, offset)
	enterpriseUsers, enterpriseTotal, _ := r.listEnterpriseUsers(ctx, limit, offset)
	
	// Combine results
	allUsers := make([]*models.User, 0, len(systemUsers)+len(enterpriseUsers))
	allUsers = append(allUsers, systemUsers...)
	allUsers = append(allUsers, enterpriseUsers...)
	
	totalCount := systemTotal + enterpriseTotal
	
	// Apply pagination to combined results
	if offset >= len(allUsers) {
		return []*models.User{}, totalCount, nil
	}
	
	end := offset + limit
	if end > len(allUsers) {
		end = len(allUsers)
	}
	
	return allUsers[offset:end], totalCount, nil
}

// listSystemUsers gets system users from users table
func (r *PostgresUserRepository) listSystemUsers(ctx context.Context, limit, offset int) ([]*models.User, int, error) {
	// Get total count (only non-deleted users)
	countQuery := `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND user_type = 'system'`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get system user count: %w", err)
	}

	// Get users with pagination (only non-deleted users)
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, created_at, updated_at, deleted_at
		FROM users 
		WHERE deleted_at IS NULL AND user_type = 'system'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list system users: %w", err)
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
			return nil, 0, fmt.Errorf("failed to scan system user: %w", err)
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return users, total, nil
}

// listEnterpriseUsers gets enterprise users and maps to User models
func (r *PostgresUserRepository) listEnterpriseUsers(ctx context.Context, limit, offset int) ([]*models.User, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get enterprise user count: %w", err)
	}

	// Get enterprise users
	query := `
		SELECT id, username, email, enterprise_id, name, phone, position,
		       is_primary_contact, access_level, status, last_login_at, bio,
		       created_at, updated_at
		FROM enterprise_users 
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list enterprise users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var euID int
		var username, email string
		var enterpriseID int
		var name, phone, position sql.NullString
		var isPrimaryContact bool
		var accessLevel int
		var status string
		var lastLoginAt *time.Time
		var bio sql.NullString
		var createdAt, updatedAt time.Time

		err := rows.Scan(&euID, &username, &email, &enterpriseID, &name, &phone, &position,
			&isPrimaryContact, &accessLevel, &status, &lastLoginAt, &bio, &createdAt, &updatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan enterprise user: %w", err)
		}

		// Map to User model
		user := &models.User{
			ID:               euID,
			Username:         username,
			Email:            email,
			UserType:         "company",
			CompanyID:        &enterpriseID,
			Status:           status,
			LastLoginAt:      lastLoginAt,
			IsPrimaryContact: isPrimaryContact,
			CreatedAt:        createdAt,
			UpdatedAt:        updatedAt,
		}

		// Map optional fields
		if name.Valid {
			user.ContactPersonName = &name.String
		}
		if phone.Valid {
			user.ContactPhone = &phone.String
		}
		if position.Valid {
			user.DepartmentTitle = &position.String
		}
		if bio.Valid {
			user.Notes = &bio.String
		}

		// Map access_level to role
		switch accessLevel {
		case 4, 5:
			user.Role = "company_admin"
		default:
			user.Role = "company_user"
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
	// First try to get user to determine which table to update
	user, err := r.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	
	if user.UserType == "company" {
		return r.updateEnterpriseUserProfile(ctx, userID, username, email)
	}
	
	return r.updateSystemUserProfile(ctx, userID, username, email)
}

// updateSystemUserProfile updates system user profile
func (r *PostgresUserRepository) updateSystemUserProfile(ctx context.Context, userID int, username, email string) (*models.User, error) {
	query := `
		UPDATE users 
		SET username = $2, email = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
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
			return nil, fmt.Errorf("system user not found")
		}
		return nil, fmt.Errorf("failed to update system user profile: %w", err)
	}

	return user, nil
}

// updateEnterpriseUserProfile updates enterprise user profile
func (r *PostgresUserRepository) updateEnterpriseUserProfile(ctx context.Context, userID int, username, email string) (*models.User, error) {
	query := `
		UPDATE enterprise_users 
		SET username = $2, email = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING id, username, email, enterprise_id, name, phone, position,
		          is_primary_contact, access_level, status, last_login_at, bio,
		          created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, userID, username, email)

	var euID int
	var user_username, user_email string
	var enterpriseID int
	var name, phone, position sql.NullString
	var isPrimaryContact bool
	var accessLevel int
	var status string
	var lastLoginAt *time.Time
	var bio sql.NullString
	var createdAt, updatedAt time.Time

	err := row.Scan(&euID, &user_username, &user_email, &enterpriseID, &name, &phone, &position,
		&isPrimaryContact, &accessLevel, &status, &lastLoginAt, &bio, &createdAt, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("enterprise user not found")
		}
		return nil, fmt.Errorf("failed to update enterprise user profile: %w", err)
	}

	// Map to User model
	user := &models.User{
		ID:               euID,
		Username:         user_username,
		Email:            user_email,
		UserType:         "company",
		CompanyID:        &enterpriseID,
		Status:           status,
		LastLoginAt:      lastLoginAt,
		IsPrimaryContact: isPrimaryContact,
		CreatedAt:        createdAt,
		UpdatedAt:        updatedAt,
	}

	// Map optional fields
	if name.Valid {
		user.ContactPersonName = &name.String
	}
	if phone.Valid {
		user.ContactPhone = &phone.String
	}
	if position.Valid {
		user.DepartmentTitle = &position.String
	}
	if bio.Valid {
		user.Notes = &bio.String
	}

	// Map access_level to role
	switch accessLevel {
	case 4, 5:
		user.Role = "company_admin"
	default:
		user.Role = "company_user"
	}

	return user, nil
}

// UpdatePassword updates a user's password
func (r *PostgresUserRepository) UpdatePassword(ctx context.Context, userID int, passwordHash string) error {
	// First try to get user to determine which table to update
	user, err := r.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}
	
	if user.UserType == "company" {
		// Enterprise users don't have passwords in enterprise_users table
		// For now, return an error or handle differently
		return fmt.Errorf("password update not supported for enterprise users")
	}
	
	// Update system user password
	query := `
		UPDATE users 
		SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL`

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

// UpdateLastLogin updates the last login timestamp for a user
func (r *PostgresUserRepository) UpdateLastLogin(ctx context.Context, userID int) error {
	// First get the user to determine if it's a system or enterprise user
	user, err := r.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	exec := r.getExecer()
	var query string

	// Route to appropriate table based on user type
	if user.UserType == "system" {
		query = `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	} else {
		query = `UPDATE enterprise_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	}

	result, err := exec.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
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

// GetUsersTimingTask retrieves all users currently timing the specified task
func (r *PostgresUserRepository) GetUsersTimingTask(ctx context.Context, taskID int) ([]models.User, error) {
	// Only system users have timing functionality in users table
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
	// Only system users can be admins
	query := `
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at,
		       current_timing_task_id, current_user_timer_task_id, timing_start_time, timing_status,
		       created_at, updated_at
		FROM users 
		WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL
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

// ListUsers retrieves users from both users and enterprise_users tables
// This method handles the complex logic of querying hybrid user storage
func (r *PostgresUserRepository) ListUsers(ctx context.Context, params *models.UserListParams) ([]*models.User, int, error) {
	// Query both tables separately and merge results
	exec := r.getExecer()

	// Query 1: System users from users table
	systemUsers, systemTotal, err := r.querySystemUsers(ctx, exec, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query system users: %w", err)
	}

	// Query 2: Enterprise users from enterprise_users table
	enterpriseUsers, enterpriseTotal, err := r.queryEnterpriseUsers(ctx, exec, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query enterprise users: %w", err)
	}

	// Merge results
	allUsers := append(systemUsers, enterpriseUsers...)
	totalCount := systemTotal + enterpriseTotal

	// Apply client-side pagination and sorting since we merged two queries
	if len(allUsers) > 0 {
		// Sort by created_at DESC (newest first)
		for i := 0; i < len(allUsers)-1; i++ {
			for j := i + 1; j < len(allUsers); j++ {
				if allUsers[i].CreatedAt.Before(allUsers[j].CreatedAt) {
					allUsers[i], allUsers[j] = allUsers[j], allUsers[i]
				}
			}
		}

		// Apply pagination
		start := (params.Page - 1) * params.PageSize
		end := start + params.PageSize

		if start >= len(allUsers) {
			return []*models.User{}, totalCount, nil
		}

		if end > len(allUsers) {
			end = len(allUsers)
		}

		allUsers = allUsers[start:end]
	}

	return allUsers, totalCount, nil
}

// querySystemUsers queries users from the users table
func (r *PostgresUserRepository) querySystemUsers(ctx context.Context, exec execer, params *models.UserListParams) ([]*models.User, int, error) {
	whereConditions := []string{"user_type = 'system'", "deleted_at IS NULL"}
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

	if params.UserType != "" && params.UserType != "system" {
		// If filtering for non-system users, return empty
		return []*models.User{}, 0, nil
	}

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR profile->>'name' ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, searchPattern)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(whereConditions, " AND ")

	// Get count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause)
	row := exec.QueryRowContext(ctx, countQuery, args...)
	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get system user count: %w", err)
	}

	// Get users
	query := fmt.Sprintf(`
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, created_at, updated_at
		FROM users %s
		ORDER BY created_at DESC`, whereClause)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query system users: %w", err)
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
			return nil, 0, fmt.Errorf("failed to scan system user: %w", err)
		}
		users = append(users, user)
	}

	return users, total, nil
}

// queryEnterpriseUsers queries users from the enterprise_users table
func (r *PostgresUserRepository) queryEnterpriseUsers(ctx context.Context, exec execer, params *models.UserListParams) ([]*models.User, int, error) {
	whereConditions := []string{"eu.deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	// Convert role to access_level for enterprise users
	if params.Role != "" {
		var accessLevel int
		switch params.Role {
		case "company_admin":
			accessLevel = 4
		case "company_user":
			accessLevel = 2
		default:
			// If filtering for system roles, return empty
			return []*models.User{}, 0, nil
		}
		whereConditions = append(whereConditions, fmt.Sprintf("eu.access_level = $%d", argIndex))
		args = append(args, accessLevel)
		argIndex++
	}

	if params.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("eu.status = $%d", argIndex))
		args = append(args, params.Status)
		argIndex++
	}

	if params.UserType != "" && params.UserType != "company" {
		// If filtering for non-company users, return empty
		return []*models.User{}, 0, nil
	}

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(eu.username ILIKE $%d OR eu.email ILIKE $%d OR eu.name ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, searchPattern)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(whereConditions, " AND ")

	// Get count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM enterprise_users eu %s", whereClause)
	row := exec.QueryRowContext(ctx, countQuery, args...)
	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get enterprise user count: %w", err)
	}

	// Get users with enterprise join
	query := fmt.Sprintf(`
		SELECT eu.id, eu.username, eu.email, '', 'company', eu.enterprise_id, NULL,
		       CASE
		           WHEN eu.access_level = 4 THEN 'company_admin'
		           WHEN eu.access_level = 2 THEN 'company_user'
		           ELSE 'company_user'
		       END as role,
		       eu.status, '{}'::jsonb, eu.last_login_at, eu.created_at, eu.updated_at,
		       eu.name, eu.phone, eu.position, eu.is_primary_contact
		FROM enterprise_users eu %s
		ORDER BY eu.created_at DESC`, whereClause)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query enterprise users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		var name, phone, position *string
		var isPrimary bool

		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.PasswordHash,
			&user.UserType, &user.CompanyID, &user.CompanyUserID,
			&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
			&user.CreatedAt, &user.UpdatedAt,
			&name, &phone, &position, &isPrimary,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan enterprise user: %w", err)
		}

		// Map enterprise fields to user fields
		user.ContactPersonName = name
		user.ContactPhone = phone
		user.DepartmentTitle = position
		user.IsPrimaryContact = isPrimary

		users = append(users, user)
	}

	return users, total, nil
}
// GetUserStats aggregates statistics from both users and enterprise_users tables
func (r *PostgresUserRepository) GetUserStats(ctx context.Context) (*models.UserStats, error) {
	exec := r.getExecer()

	// Get stats from users table (system users)
	systemStats, err := r.getSystemUserStats(ctx, exec)
	if err != nil {
		return nil, fmt.Errorf("failed to get system user stats: %w", err)
	}

	// Get stats from enterprise_users table
	enterpriseStats, err := r.getEnterpriseUserStats(ctx, exec)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise user stats: %w", err)
	}

	// Merge the stats
	totalStats := &models.UserStats{
		Total: systemStats.Total + enterpriseStats.Total,
		ByRole: map[string]int{
			"admin":           systemStats.ByRole["admin"],
			"project_manager": systemStats.ByRole["project_manager"],
			"developer":       systemStats.ByRole["developer"],
			"company_admin":   systemStats.ByRole["company_admin"] + enterpriseStats.ByRole["company_admin"],
			"company_user":    systemStats.ByRole["company_user"] + enterpriseStats.ByRole["company_user"],
		},
		ByStatus: map[string]int{
			"active":    systemStats.ByStatus["active"] + enterpriseStats.ByStatus["active"],
			"inactive":  systemStats.ByStatus["inactive"] + enterpriseStats.ByStatus["inactive"],
			"suspended": systemStats.ByStatus["suspended"] + enterpriseStats.ByStatus["suspended"],
		},
		RecentRegistrations: systemStats.RecentRegistrations + enterpriseStats.RecentRegistrations,
	}

	return totalStats, nil
}

// getSystemUserStats gets statistics from users table
func (r *PostgresUserRepository) getSystemUserStats(ctx context.Context, exec execer) (*models.UserStats, error) {
	// Get total count
	var total int
	totalQuery := `SELECT COUNT(*) FROM users WHERE user_type = 'system' AND deleted_at IS NULL`
	row := exec.QueryRowContext(ctx, totalQuery)
	if err := row.Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to get total system user count: %w", err)
	}

	// Get role counts
	roleQuery := `
		SELECT
			SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
			SUM(CASE WHEN role = 'project_manager' THEN 1 ELSE 0 END) as pm_count,
			SUM(CASE WHEN role = 'developer' THEN 1 ELSE 0 END) as dev_count,
			SUM(CASE WHEN role = 'company_admin' THEN 1 ELSE 0 END) as company_admin_count,
			SUM(CASE WHEN role = 'company_user' THEN 1 ELSE 0 END) as company_user_count
		FROM users WHERE user_type = 'system' AND deleted_at IS NULL`

	var adminCount, pmCount, devCount, companyAdminCount, companyUserCount int
	roleRow := exec.QueryRowContext(ctx, roleQuery)
	err := roleRow.Scan(&adminCount, &pmCount, &devCount, &companyAdminCount, &companyUserCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get system role stats: %w", err)
	}

	// Get status breakdown
	statusQuery := `
		SELECT
			SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
			SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
		FROM users WHERE user_type = 'system' AND deleted_at IS NULL`

	var activeStatus, inactiveStatus, suspendedStatus int
	statusRow := exec.QueryRowContext(ctx, statusQuery)
	err = statusRow.Scan(&activeStatus, &inactiveStatus, &suspendedStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to get system status stats: %w", err)
	}

	// Get recent registrations
	recentQuery := `
		SELECT COUNT(*)
		FROM users
		WHERE user_type = 'system' AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'`

	var recent int
	recentRow := exec.QueryRowContext(ctx, recentQuery)
	err = recentRow.Scan(&recent)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent system registrations: %w", err)
	}

	return &models.UserStats{
		Total: total,
		ByRole: map[string]int{
			"admin":           adminCount,
			"project_manager": pmCount,
			"developer":       devCount,
			"company_admin":   companyAdminCount,
			"company_user":    companyUserCount,
		},
		ByStatus: map[string]int{
			"active":    activeStatus,
			"inactive":  inactiveStatus,
			"suspended": suspendedStatus,
		},
		RecentRegistrations: recent,
	}, nil
}

// getEnterpriseUserStats gets statistics from enterprise_users table
func (r *PostgresUserRepository) getEnterpriseUserStats(ctx context.Context, exec execer) (*models.UserStats, error) {
	// Get total count
	var total int
	totalQuery := `SELECT COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL`
	row := exec.QueryRowContext(ctx, totalQuery)
	if err := row.Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to get total enterprise user count: %w", err)
	}

	// Get role counts (map access_level to roles)
	roleQuery := `
		SELECT
			SUM(CASE WHEN access_level = 4 THEN 1 ELSE 0 END) as company_admin_count,
			SUM(CASE WHEN access_level = 2 THEN 1 ELSE 0 END) as company_user_count
		FROM enterprise_users WHERE deleted_at IS NULL`

	var companyAdminCount, companyUserCount int
	roleRow := exec.QueryRowContext(ctx, roleQuery)
	err := roleRow.Scan(&companyAdminCount, &companyUserCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise role stats: %w", err)
	}

	// Get status breakdown
	statusQuery := `
		SELECT
			SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
			SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
		FROM enterprise_users WHERE deleted_at IS NULL`

	var activeStatus, inactiveStatus, suspendedStatus int
	statusRow := exec.QueryRowContext(ctx, statusQuery)
	err = statusRow.Scan(&activeStatus, &inactiveStatus, &suspendedStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise status stats: %w", err)
	}

	// Get recent registrations
	recentQuery := `
		SELECT COUNT(*)
		FROM enterprise_users
		WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'`

	var recent int
	recentRow := exec.QueryRowContext(ctx, recentQuery)
	err = recentRow.Scan(&recent)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent enterprise registrations: %w", err)
	}

	return &models.UserStats{
		Total: total,
		ByRole: map[string]int{
			"admin":           0,
			"project_manager": 0,
			"developer":       0,
			"company_admin":   companyAdminCount,
			"company_user":    companyUserCount,
		},
		ByStatus: map[string]int{
			"active":    activeStatus,
			"inactive":  inactiveStatus,
			"suspended": suspendedStatus,
		},
		RecentRegistrations: recent,
	}, nil
}
