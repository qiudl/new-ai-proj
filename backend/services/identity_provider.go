package services

import (
	"context"
	"fmt"
	"time"

	"ai-project-backend/database"
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
	identityRepo database.IdentityRepository
	cache        *redis.Client
	cacheTTL     time.Duration
}

// IdentityProviderConfig holds configuration for IdentityProvider
type IdentityProviderConfig struct {
	IdentityRepo database.IdentityRepository
	Cache        *redis.Client
	CacheTTL     time.Duration // Default: 15 minutes
}

// NewIdentityProvider creates a new identity provider
func NewIdentityProvider(config *IdentityProviderConfig) IdentityProvider {
	if config.CacheTTL == 0 {
		config.CacheTTL = 15 * time.Minute
	}

	return &identityProviderImpl{
		identityRepo: config.IdentityRepo,
		cache:        config.Cache,
		cacheTTL:     config.CacheTTL,
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

	// Delegate to repository to get user type
	userType, err := p.identityRepo.GetUserType(ctx, userID)
	if err != nil {
		return nil, err
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

	// Delegate to repository to check enterprise membership
	userType, isMember, err := p.identityRepo.CheckEnterpriseMembership(ctx, userID, enterpriseID)
	if err != nil {
		return nil, err
	}

	if userType != "enterprise" {
		return nil, fmt.Errorf("user %d is not an enterprise user (type: %s)", userID, userType)
	}

	if !isMember {
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

	// Delegate to repository to get user type and enterprise ID
	userType, enterpriseID, err := p.identityRepo.GetUserTypeAndEnterprise(ctx, userID)
	if err != nil {
		return nil, err
	}

	if userType == "system" {
		return interfaces.NewSystemUserIdentity(userID), nil
	}

	if userType == "enterprise" && enterpriseID != nil {
		return interfaces.NewEnterpriseUserIdentity(userID, *enterpriseID), nil
	}

	return nil, fmt.Errorf("unable to determine user identity for user %d (type: %s, enterprise: %v)",
		userID, userType, enterpriseID != nil)
}
