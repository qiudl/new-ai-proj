package database

import (
	"context"
	"database/sql"
	"fmt"
)

// PostgresIdentityRepository implements IdentityRepository for PostgreSQL
type PostgresIdentityRepository struct {
	db execer
}

// NewIdentityRepository creates a new PostgresIdentityRepository
func NewIdentityRepository(db execer) IdentityRepository {
	return &PostgresIdentityRepository{db: db}
}

// GetUserType retrieves the user type for a given user ID
func (r *PostgresIdentityRepository) GetUserType(ctx context.Context, userID uint) (string, error) {
	query := `
		SELECT user_type
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	var userType string
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&userType)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("user %d not found", userID)
		}
		return "", fmt.Errorf("failed to query user type: %w", err)
	}

	return userType, nil
}

// CheckEnterpriseMembership verifies if a user is a member of an enterprise
func (r *PostgresIdentityRepository) CheckEnterpriseMembership(ctx context.Context, userID uint, enterpriseID uint) (userType string, isMember bool, err error) {
	query := `
		SELECT u.user_type, COUNT(eu.id) as membership_count
		FROM users u
		LEFT JOIN enterprise_users eu ON u.id = eu.user_id AND eu.enterprise_id = $2 AND eu.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
		GROUP BY u.user_type
	`

	var membershipCount int
	err = r.db.QueryRowContext(ctx, query, userID, enterpriseID).Scan(&userType, &membershipCount)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", false, fmt.Errorf("user %d not found", userID)
		}
		return "", false, fmt.Errorf("failed to query enterprise membership: %w", err)
	}

	isMember = membershipCount > 0
	return userType, isMember, nil
}

// GetUserTypeAndEnterprise retrieves user type and their enterprise ID (if applicable)
func (r *PostgresIdentityRepository) GetUserTypeAndEnterprise(ctx context.Context, userID uint) (userType string, enterpriseID *uint, err error) {
	query := `
		SELECT u.user_type, eu.enterprise_id
		FROM users u
		LEFT JOIN enterprise_users eu ON u.id = eu.user_id AND eu.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
		LIMIT 1
	`

	var nullableEnterpriseID sql.NullInt64
	err = r.db.QueryRowContext(ctx, query, userID).Scan(&userType, &nullableEnterpriseID)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil, fmt.Errorf("user %d not found", userID)
		}
		return "", nil, fmt.Errorf("failed to query user type and enterprise: %w", err)
	}

	if nullableEnterpriseID.Valid {
		enterpriseIDValue := uint(nullableEnterpriseID.Int64)
		enterpriseID = &enterpriseIDValue
	}

	return userType, enterpriseID, nil
}
