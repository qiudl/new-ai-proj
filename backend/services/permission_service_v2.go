package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/interfaces"

	"github.com/go-redis/redis/v8"
)

// PermissionServiceV2 implements RBAC v2 dual-domain architecture
// This service handles permission checking for both system and enterprise users
type PermissionServiceV2 interface {
	// CheckSystemPermission checks if a user has a system-level permission
	// Used for: system administration, cross-enterprise operations
	// Example: CheckSystemPermission(identity, "system.enterprise.access_data")
	CheckSystemPermission(identity interfaces.UserIdentity, permission string) (bool, error)

	// CheckEnterprisePermission checks if a user has an enterprise-level permission
	// Used for: enterprise-specific operations within an enterprise
	// Example: CheckEnterprisePermission(identity, enterpriseID, "enterprise.project.create")
	CheckEnterprisePermission(identity interfaces.UserIdentity, enterpriseID uint, permission string) (bool, error)

	// CheckEnterpriseAccess checks if a user can access a specific enterprise's data
	// Enforces enterprise data isolation:
	// - Enterprise users: can only access their own enterprise
	// - System users: need "system.enterprise.access_data" permission
	CheckEnterpriseAccess(identity interfaces.UserIdentity, resourceEnterpriseID uint) (bool, error)

	// GetUserSystemPermissions returns all system permissions for a user
	// Returns empty array for enterprise users (they have no system permissions)
	GetUserSystemPermissions(userID uint) ([]string, error)

	// GetUserEnterprisePermissions returns all enterprise permissions for a user within an enterprise
	// Handles role-based permissions + custom permission overrides
	GetUserEnterprisePermissions(userID uint, enterpriseID uint) ([]string, error)
}

// permissionServiceV2Impl implements PermissionServiceV2
type permissionServiceV2Impl struct {
	repo            database.PermissionServiceV2Repository
	cache           *redis.Client
	cacheTTL        time.Duration
	systemRoleRepo  interfaces.SystemRoleRepository
	enterpriseRoleRepo interfaces.EnterpriseRoleRepository
}

// PermissionServiceV2Config holds configuration for PermissionServiceV2
type PermissionServiceV2Config struct {
	Repo            database.PermissionServiceV2Repository
	Cache           *redis.Client
	CacheTTL        time.Duration // Default: 15 minutes
	SystemRoleRepo  interfaces.SystemRoleRepository
	EnterpriseRoleRepo interfaces.EnterpriseRoleRepository
}

// NewPermissionServiceV2 creates a new RBAC v2 permission service
func NewPermissionServiceV2(config *PermissionServiceV2Config) PermissionServiceV2 {
	if config.CacheTTL == 0 {
		config.CacheTTL = 15 * time.Minute // Default 15 minutes
	}

	return &permissionServiceV2Impl{
		repo:            config.Repo,
		cache:           config.Cache,
		cacheTTL:        config.CacheTTL,
		systemRoleRepo:  config.SystemRoleRepo,
		enterpriseRoleRepo: config.EnterpriseRoleRepo,
	}
}

// CheckSystemPermission checks system-level permissions
func (s *permissionServiceV2Impl) CheckSystemPermission(identity interfaces.UserIdentity, permission string) (bool, error) {
	// Only system users can have system permissions
	if !identity.IsSystemUser() {
		return false, nil
	}

	ctx := context.Background()
	userID := identity.GetUserID()

	// Try cache first
	cacheKey := s.buildCacheKey(interfaces.SystemDomain, userID, permission, nil)
	if cached, found := s.getCachedPermission(ctx, cacheKey); found {
		return cached, nil
	}

	// Delegate to repository
	hasPermission, err := s.repo.CheckSystemPermission(ctx, userID, permission)
	if err != nil {
		return false, fmt.Errorf("failed to check system permission: %w", err)
	}

	// Cache the result
	s.cachePermission(ctx, cacheKey, hasPermission)

	return hasPermission, nil
}

// CheckEnterprisePermission checks enterprise-level permissions
func (s *permissionServiceV2Impl) CheckEnterprisePermission(identity interfaces.UserIdentity, enterpriseID uint, permission string) (bool, error) {
	ctx := context.Background()
	userID := identity.GetUserID()

	// Check enterprise access first
	hasAccess, err := s.CheckEnterpriseAccess(identity, enterpriseID)
	if err != nil {
		return false, err
	}
	if !hasAccess {
		return false, nil
	}

	// Try cache first
	cacheKey := s.buildCacheKey(interfaces.EnterpriseDomain, userID, permission, &enterpriseID)
	if cached, found := s.getCachedPermission(ctx, cacheKey); found {
		return cached, nil
	}

	// Check custom permission overrides first (highest priority)
	hasCustomOverride, customValue, err := s.checkCustomPermissionOverride(ctx, userID, enterpriseID, permission)
	if err != nil {
		return false, fmt.Errorf("failed to check custom permission: %w", err)
	}
	if hasCustomOverride {
		s.cachePermission(ctx, cacheKey, customValue)
		return customValue, nil
	}

	// Check role-based permissions with multi-role support
	hasRolePermission, err := s.checkEnterpriseRolePermissions(ctx, userID, enterpriseID, permission)
	if err != nil {
		return false, fmt.Errorf("failed to check role permissions: %w", err)
	}

	// Cache the result
	s.cachePermission(ctx, cacheKey, hasRolePermission)

	return hasRolePermission, nil
}

// CheckEnterpriseAccess enforces enterprise data isolation
func (s *permissionServiceV2Impl) CheckEnterpriseAccess(identity interfaces.UserIdentity, resourceEnterpriseID uint) (bool, error) {
	// Enterprise users can only access their own enterprise
	if identity.IsEnterpriseUser() {
		userEnterpriseID := identity.GetEnterpriseID()
		if userEnterpriseID == nil {
			return false, fmt.Errorf("enterprise user without enterprise ID")
		}
		return *userEnterpriseID == resourceEnterpriseID, nil
	}

	// System users need specific permission to access enterprise data
	if identity.IsSystemUser() {
		// Check for system.enterprise.access_data permission
		hasPermission, err := s.CheckSystemPermission(identity, "system.enterprise.access_data")
		if err != nil {
			return false, fmt.Errorf("failed to check enterprise access permission: %w", err)
		}
		return hasPermission, nil
	}

	return false, fmt.Errorf("unknown user identity type")
}

// GetUserSystemPermissions returns all system permissions for a user
func (s *permissionServiceV2Impl) GetUserSystemPermissions(userID uint) ([]string, error) {
	ctx := context.Background()

	// Delegate to repository
	permissions, err := s.repo.GetUserSystemPermissions(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get system permissions: %w", err)
	}

	return permissions, nil
}

// GetUserEnterprisePermissions returns all enterprise permissions with custom overrides
func (s *permissionServiceV2Impl) GetUserEnterprisePermissions(userID uint, enterpriseID uint) ([]string, error) {
	ctx := context.Background()

	// Get role-based permissions from repository
	rolePermissions, err := s.repo.GetUserEnterpriseRolePermissions(ctx, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}

	// Build permission map from role permissions
	permissionMap := make(map[string]bool)
	for _, permission := range rolePermissions {
		permissionMap[permission] = true
	}

	// Get custom permission overrides from repository
	customPermissions, err := s.repo.GetUserEnterpriseCustomPermissions(ctx, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get custom permissions: %w", err)
	}

	// Apply custom permission overrides
	for permission, grantType := range customPermissions {
		if grantType == "grant" {
			permissionMap[permission] = true
		} else if grantType == "deny" {
			// Explicit deny removes permission
			delete(permissionMap, permission)
		}
	}

	// Convert map to slice
	permissions := make([]string, 0, len(permissionMap))
	for permission := range permissionMap {
		permissions = append(permissions, permission)
	}

	return permissions, nil
}

// checkCustomPermissionOverride checks for explicit custom permission grants/denies
func (s *permissionServiceV2Impl) checkCustomPermissionOverride(ctx context.Context, userID uint, enterpriseID uint, permission string) (bool, bool, error) {
	// Delegate to repository
	return s.repo.CheckCustomPermissionOverride(ctx, userID, enterpriseID, permission)
}

// checkEnterpriseRolePermissions checks permissions from enterprise roles (supports multiple roles)
func (s *permissionServiceV2Impl) checkEnterpriseRolePermissions(ctx context.Context, userID uint, enterpriseID uint, permission string) (bool, error) {
	// Delegate to repository
	return s.repo.CheckEnterpriseRolePermission(ctx, userID, enterpriseID, permission)
}

// buildCacheKey generates a Redis cache key for permissions
// Format: perm:v2:{domain}:{userID}:{permission}:{enterpriseID?}
func (s *permissionServiceV2Impl) buildCacheKey(domain interfaces.PermissionDomain, userID uint, permission string, enterpriseID *uint) string {
	parts := []string{
		"perm:v2",
		string(domain),
		fmt.Sprintf("%d", userID),
		permission,
	}

	if enterpriseID != nil {
		parts = append(parts, fmt.Sprintf("%d", *enterpriseID))
	}

	return strings.Join(parts, ":")
}

// getCachedPermission retrieves a cached permission check result
func (s *permissionServiceV2Impl) getCachedPermission(ctx context.Context, key string) (bool, bool) {
	if s.cache == nil {
		return false, false
	}

	val, err := s.cache.Get(ctx, key).Result()
	if err == redis.Nil {
		// Cache miss
		return false, false
	}
	if err != nil {
		// Cache error, log and continue without cache
		log.Printf("[PERM_V2] Cache get error for key %s: %v", key, err)
		return false, false
	}

	// Cache hit
	result := val == "1"
	return result, true
}

// cachePermission stores a permission check result in cache
func (s *permissionServiceV2Impl) cachePermission(ctx context.Context, key string, value bool) {
	if s.cache == nil {
		return
	}

	cacheValue := "0"
	if value {
		cacheValue = "1"
	}

	err := s.cache.Set(ctx, key, cacheValue, s.cacheTTL).Err()
	if err != nil {
		// Log cache error but don't fail the operation
		log.Printf("[PERM_V2] Cache set error for key %s: %v", key, err)
	}
}

// InvalidateUserPermissions invalidates all cached permissions for a user
func (s *permissionServiceV2Impl) InvalidateUserPermissions(userID uint) error {
	if s.cache == nil {
		return nil
	}

	ctx := context.Background()
	pattern := fmt.Sprintf("perm:v2:*:%d:*", userID)

	iter := s.cache.Scan(ctx, 0, pattern, 100).Iterator()
	deleted := 0

	for iter.Next(ctx) {
		key := iter.Val()
		if err := s.cache.Del(ctx, key).Err(); err != nil {
			log.Printf("[PERM_V2] Failed to delete cache key %s: %v", key, err)
		} else {
			deleted++
		}
	}

	if err := iter.Err(); err != nil {
		return fmt.Errorf("cache scan error: %w", err)
	}

	log.Printf("[PERM_V2] Invalidated %d permission cache keys for user %d", deleted, userID)
	return nil
}

// InvalidateEnterprisePermissions invalidates all cached enterprise permissions
func (s *permissionServiceV2Impl) InvalidateEnterprisePermissions(enterpriseID uint) error {
	if s.cache == nil {
		return nil
	}

	ctx := context.Background()
	pattern := fmt.Sprintf("perm:v2:%s:*:%d", interfaces.EnterpriseDomain, enterpriseID)

	iter := s.cache.Scan(ctx, 0, pattern, 100).Iterator()
	deleted := 0

	for iter.Next(ctx) {
		key := iter.Val()
		if err := s.cache.Del(ctx, key).Err(); err != nil {
			log.Printf("[PERM_V2] Failed to delete cache key %s: %v", key, err)
		} else {
			deleted++
		}
	}

	if err := iter.Err(); err != nil {
		return fmt.Errorf("cache scan error: %w", err)
	}

	log.Printf("[PERM_V2] Invalidated %d permission cache keys for enterprise %d", deleted, enterpriseID)
	return nil
}
