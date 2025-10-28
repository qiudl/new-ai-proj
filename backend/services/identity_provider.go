package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/interfaces"

	"github.com/go-redis/redis/v8"
)

// IdentityProvider provides user identity objects for permission checking
// It loads user information from database and creates appropriate UserIdentity instances
type IdentityProvider interface {
	// GetSystemUserIdentity creates a SystemUserIdentity for a user
	// Returns error if user is not a system user or doesn't exist
	GetSystemUserIdentity(userID uint) (interfaces.UserIdentity, error)

	// GetEnterpriseUserIdentity creates an EnterpriseUserIdentity for a user
	// Returns error if user is not a member of the specified enterprise
	GetEnterpriseUserIdentity(userID uint, enterpriseID uint) (interfaces.UserIdentity, error)

	// GetUserIdentityAuto automatically determines user type and creates appropriate identity
	// This is useful when user type is unknown
	GetUserIdentityAuto(userID uint) (interfaces.UserIdentity, error)
}

// identityProviderImpl implements IdentityProvider
type identityProviderImpl struct {
	db       *sql.DB
	cache    *redis.Client
	cacheTTL time.Duration
}

// IdentityProviderConfig holds configuration for IdentityProvider
type IdentityProviderConfig struct {
	DB       *sql.DB
	Cache    *redis.Client
	CacheTTL time.Duration // Default: 15 minutes
}

// NewIdentityProvider creates a new identity provider
func NewIdentityProvider(config *IdentityProviderConfig) IdentityProvider {
	if config.CacheTTL == 0 {
		config.CacheTTL = 15 * time.Minute
	}

	return &identityProviderImpl{
		db:       config.DB,
		cache:    config.Cache,
		cacheTTL: config.CacheTTL,
	}
}

// GetSystemUserIdentity creates a SystemUserIdentity
func (p *identityProviderImpl) GetSystemUserIdentity(userID uint) (interfaces.UserIdentity, error) {
	ctx := context.Background()

	// Try cache first
	cacheKey := fmt.Sprintf("identity:system:%d", userID)
	if p.cache != nil {
		result := p.cache.Get(ctx, cacheKey)
		if result.Err() == nil {
			// User exists in cache, return identity
			return interfaces.NewSystemUserIdentity(userID), nil
		}
	}

	// Query database to verify user is a system user
	query := `
		SELECT user_type
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	var userType string
	err := p.db.QueryRowContext(ctx, query, userID).Scan(&userType)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user %d not found", userID)
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	if userType != "system" {
		return nil, fmt.Errorf("user %d is not a system user (type: %s)", userID, userType)
	}

	// Cache the result
	if p.cache != nil {
		p.cache.Set(ctx, cacheKey, "1", p.cacheTTL)
	}

	return interfaces.NewSystemUserIdentity(userID), nil
}

// GetEnterpriseUserIdentity creates an EnterpriseUserIdentity
func (p *identityProviderImpl) GetEnterpriseUserIdentity(userID uint, enterpriseID uint) (interfaces.UserIdentity, error) {
	ctx := context.Background()

	// Try cache first
	cacheKey := fmt.Sprintf("identity:enterprise:%d:%d", userID, enterpriseID)
	if p.cache != nil {
		result := p.cache.Get(ctx, cacheKey)
		if result.Err() == nil {
			// User-enterprise relationship exists in cache
			return interfaces.NewEnterpriseUserIdentity(userID, enterpriseID), nil
		}
	}

	// Query database to verify:
	// 1. User exists and is enterprise type
	// 2. User is a member of the specified enterprise
	query := `
		SELECT u.user_type, COUNT(eu.id) as membership_count
		FROM users u
		LEFT JOIN enterprise_users eu ON u.id = eu.user_id AND eu.enterprise_id = $2 AND eu.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
		GROUP BY u.user_type
	`

	var userType string
	var membershipCount int
	err := p.db.QueryRowContext(ctx, query, userID, enterpriseID).Scan(&userType, &membershipCount)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user %d not found", userID)
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	if userType != "enterprise" {
		return nil, fmt.Errorf("user %d is not an enterprise user (type: %s)", userID, userType)
	}

	if membershipCount == 0 {
		return nil, fmt.Errorf("user %d is not a member of enterprise %d", userID, enterpriseID)
	}

	// Cache the result
	if p.cache != nil {
		p.cache.Set(ctx, cacheKey, "1", p.cacheTTL)
	}

	return interfaces.NewEnterpriseUserIdentity(userID, enterpriseID), nil
}

// GetUserIdentityAuto automatically determines user type and creates appropriate identity
func (p *identityProviderImpl) GetUserIdentityAuto(userID uint) (interfaces.UserIdentity, error) {
	ctx := context.Background()

	// Query user type and enterprise membership
	query := `
		SELECT u.user_type, eu.enterprise_id
		FROM users u
		LEFT JOIN enterprise_users eu ON u.id = eu.user_id AND eu.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
		LIMIT 1
	`

	var userType string
	var enterpriseID sql.NullInt64
	err := p.db.QueryRowContext(ctx, query, userID).Scan(&userType, &enterpriseID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user %d not found", userID)
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	if userType == "system" {
		return interfaces.NewSystemUserIdentity(userID), nil
	}

	if userType == "enterprise" && enterpriseID.Valid {
		return interfaces.NewEnterpriseUserIdentity(userID, uint(enterpriseID.Int64)), nil
	}

	return nil, fmt.Errorf("unable to determine user identity for user %d (type: %s, enterprise: %v)",
		userID, userType, enterpriseID.Valid)
}
