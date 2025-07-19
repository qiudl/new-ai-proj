package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
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
		INSERT INTO users (username, password_hash, role)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		user.Username, user.PasswordHash, user.Role)

	err := row.Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetByID gets a user by ID
func (r *PostgresUserRepository) GetByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT id, username, password_hash, role, created_at, updated_at
		FROM users WHERE id = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	user := &models.User{}

	err := row.Scan(
		&user.ID, &user.Username, &user.PasswordHash,
		&user.Role, &user.CreatedAt, &user.UpdatedAt,
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
		SELECT id, username, password_hash, role, created_at, updated_at
		FROM users WHERE username = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, username)

	user := &models.User{}

	err := row.Scan(
		&user.ID, &user.Username, &user.PasswordHash,
		&user.Role, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// GetByEmail gets a user by email (placeholder - no email field in current schema)
func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	// Since the current schema doesn't have email field, this is a placeholder
	return nil, fmt.Errorf("email field not supported in current schema")
}

// Update updates a user
func (r *PostgresUserRepository) Update(ctx context.Context, user *models.User) (*models.User, error) {
	query := `
		UPDATE users 
		SET username = $2, password_hash = $3, role = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		user.ID, user.Username, user.PasswordHash, user.Role)

	err := row.Scan(&user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

// Delete deletes a user
func (r *PostgresUserRepository) Delete(ctx context.Context, id int) error {
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

// List gets users with pagination
func (r *PostgresUserRepository) List(ctx context.Context, limit, offset int) ([]*models.User, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM users`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get user count: %w", err)
	}

	// Get users with pagination
	query := `
		SELECT id, username, password_hash, role, created_at, updated_at
		FROM users 
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
			&user.ID, &user.Username, &user.PasswordHash,
			&user.Role, &user.CreatedAt, &user.UpdatedAt,
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