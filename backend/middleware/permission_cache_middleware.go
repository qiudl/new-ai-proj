package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/security"
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// PermissionCacheMiddleware provides cached permission checking
type PermissionCacheMiddleware struct {
	cache          *redis.Client
	permissionRepo database.PermissionRepository
	rateLimiter    *security.RateLimiter
	ttl            time.Duration
	enabled        bool
}

// PermissionCacheConfig configures the permission cache middleware
type PermissionCacheConfig struct {
	RedisClient    *redis.Client
	PermissionRepo database.PermissionRepository
	RateLimiter    *security.RateLimiter
	CacheTTL       time.Duration
	Enabled        bool
}

// NewPermissionCacheMiddleware creates a new permission cache middleware
func NewPermissionCacheMiddleware(config *PermissionCacheConfig) *PermissionCacheMiddleware {
	if config.CacheTTL == 0 {
		config.CacheTTL = 15 * time.Minute // Default TTL
	}

	return &PermissionCacheMiddleware{
		cache:          config.RedisClient,
		permissionRepo: config.PermissionRepo,
		rateLimiter:    config.RateLimiter,
		ttl:            config.CacheTTL,
		enabled:        config.Enabled,
	}
}

// PermissionCacheKey generates a cache key for permission checks
func (m *PermissionCacheMiddleware) PermissionCacheKey(companyUserID int, permissionCode string, resourceID *int) string {
	key := fmt.Sprintf("perm:%d:%s", companyUserID, permissionCode)
	if resourceID != nil {
		key += fmt.Sprintf(":%d", *resourceID)
	}

	// Create MD5 hash for consistent key length
	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("permission_cache:%x", hash)
}

// GetCachedPermission retrieves permission result from cache
func (m *PermissionCacheMiddleware) GetCachedPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, bool) {
	if !m.enabled || m.cache == nil {
		return nil, false
	}

	key := m.PermissionCacheKey(companyUserID, permissionCode, resourceID)

	cachedResult, err := m.cache.Get(ctx, key).Result()
	if err != nil {
		if err != redis.Nil {
			log.Printf("[PERMISSION_CACHE] Cache get error for key %s: %v", key, err)
		}
		return nil, false
	}

	var result models.PermissionResult
	if err := json.Unmarshal([]byte(cachedResult), &result); err != nil {
		log.Printf("[PERMISSION_CACHE] Failed to unmarshal cached result: %v", err)
		return nil, false
	}

	return &result, true
}

// SetCachedPermission stores permission result in cache
func (m *PermissionCacheMiddleware) SetCachedPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int, result *models.PermissionResult) {
	if !m.enabled || m.cache == nil || result == nil {
		return
	}

	key := m.PermissionCacheKey(companyUserID, permissionCode, resourceID)

	resultJSON, err := json.Marshal(result)
	if err != nil {
		log.Printf("[PERMISSION_CACHE] Failed to marshal permission result: %v", err)
		return
	}

	err = m.cache.Set(ctx, key, resultJSON, m.ttl).Err()
	if err != nil {
		log.Printf("[PERMISSION_CACHE] Failed to set cache for key %s: %v", key, err)
	}
}

// InvalidateUserPermissions invalidates all cached permissions for a user
func (m *PermissionCacheMiddleware) InvalidateUserPermissions(ctx context.Context, companyUserID int) error {
	if !m.enabled || m.cache == nil {
		return nil
	}

	pattern := fmt.Sprintf("permission_cache:*%d*", companyUserID)
	keys, err := m.cache.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get cache keys for user %d: %w", companyUserID, err)
	}

	if len(keys) > 0 {
		err = m.cache.Del(ctx, keys...).Err()
		if err != nil {
			return fmt.Errorf("failed to delete cache keys for user %d: %w", companyUserID, err)
		}
		log.Printf("[PERMISSION_CACHE] Invalidated %d cached permissions for user %d", len(keys), companyUserID)
	}

	return nil
}

// CheckCachedPermission checks permission with caching
func (m *PermissionCacheMiddleware) CheckCachedPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	// Try cache first
	if cachedResult, found := m.GetCachedPermission(ctx, companyUserID, permissionCode, resourceID); found {
		log.Printf("[PERMISSION_CACHE] Cache hit for user %d, permission %s", companyUserID, permissionCode)
		return cachedResult, nil
	}

	// Cache miss - check database
	log.Printf("[PERMISSION_CACHE] Cache miss for user %d, permission %s", companyUserID, permissionCode)
	result, err := m.permissionRepo.CheckUserPermission(ctx, companyUserID, permissionCode, resourceID)
	if err != nil {
		return nil, err
	}

	// Cache the result
	m.SetCachedPermission(ctx, companyUserID, permissionCode, resourceID, result)

	return result, nil
}

// RequireCachedPermission creates middleware that requires specific permission with caching
func (m *PermissionCacheMiddleware) RequireCachedPermission(permissionCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Rate limiting check
		if m.rateLimiter != nil {
			// Get user ID for rate limiting
			companyUserIDInterface, exists := c.Get("company_user_id")
			if exists {
				if companyUserID, ok := companyUserIDInterface.(int); ok {
					result := m.rateLimiter.CheckRateLimitByUser(companyUserID, 100, security.WindowPerMinute)
					if !result.Allowed {
						c.JSON(http.StatusTooManyRequests, gin.H{
							"error":              "Rate limit exceeded",
							"retry_after":        result.RetryAfter.Seconds(),
							"remaining_requests": result.RemainingCount,
						})
						c.Abort()
						return
					}
				}
			}
		}

		// Get company user ID from context (should be set by authentication middleware)
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}

		// Get resource ID from URL parameters if available
		var resourceID *int
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.Atoi(idStr); err == nil {
				resourceID = &id
			}
		}
		// Also check for project_id parameter
		if resourceID == nil {
			if idStr := c.Param("project_id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					resourceID = &id
				}
			}
		}

		// Check permission with caching
		result, err := m.CheckCachedPermission(ctx, companyUserID, permissionCode, resourceID)
		if err != nil {
			log.Printf("[PERMISSION_CACHE] Permission check error for user %d, permission %s: %v",
				companyUserID, permissionCode, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permission"})
			c.Abort()
			return
		}

		if !result.HasPermission {
			log.Printf("[PERMISSION_CACHE] Permission denied for user %d, permission %s: %s",
				companyUserID, permissionCode, result.Reason)
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Permission denied",
				"reason": result.Reason,
				"source": result.Source,
			})
			c.Abort()
			return
		}

		// Log successful permission check
		log.Printf("[PERMISSION_CACHE] Permission granted for user %d, permission %s (source: %s)",
			companyUserID, permissionCode, result.Source)

		// Store permission result in context for potential use in handlers
		c.Set("permission_result", result)
		c.Next()
	}
}

// BatchCheckCachedPermissions checks multiple permissions with caching
func (m *PermissionCacheMiddleware) BatchCheckCachedPermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	results := make(map[string]*models.PermissionResult)
	uncachedPermissions := make([]string, 0)

	// Check cache for each permission
	for _, permissionCode := range permissionCodes {
		if cachedResult, found := m.GetCachedPermission(ctx, companyUserID, permissionCode, resourceID); found {
			results[permissionCode] = cachedResult
		} else {
			uncachedPermissions = append(uncachedPermissions, permissionCode)
		}
	}

	// Fetch uncached permissions from database
	if len(uncachedPermissions) > 0 {
		dbResults, err := m.permissionRepo.CheckMultiplePermissions(ctx, companyUserID, uncachedPermissions, resourceID)
		if err != nil {
			return nil, err
		}

		// Cache and merge results
		for permissionCode, result := range dbResults {
			results[permissionCode] = result
			m.SetCachedPermission(ctx, companyUserID, permissionCode, resourceID, result)
		}
	}

	log.Printf("[PERMISSION_CACHE] Batch permission check for user %d: %d cached, %d from DB",
		companyUserID, len(permissionCodes)-len(uncachedPermissions), len(uncachedPermissions))

	return results, nil
}

// RequireCachedAnyPermission creates middleware that requires any of the specified permissions with caching
func (m *PermissionCacheMiddleware) RequireCachedAnyPermission(permissionCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Get company user ID from context
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}

		// Get resource ID from URL parameters if available
		var resourceID *int
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.Atoi(idStr); err == nil {
				resourceID = &id
			}
		}
		if resourceID == nil {
			if idStr := c.Param("project_id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					resourceID = &id
				}
			}
		}

		// Check if user has any of the required permissions using batch check
		results, err := m.BatchCheckCachedPermissions(ctx, companyUserID, permissionCodes, resourceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permissions"})
			c.Abort()
			return
		}

		hasPermission := false
		var grantedPermissions []string
		for permissionCode, result := range results {
			if result.HasPermission {
				hasPermission = true
				grantedPermissions = append(grantedPermissions, permissionCode)
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Permission denied",
				"reason": "User does not have any of the required permissions",
			})
			c.Abort()
			return
		}

		// Store permission results in context
		c.Set("permission_results", results)
		c.Set("granted_permissions", grantedPermissions)
		c.Next()
	}
}

// GetCacheStats returns cache statistics
func (m *PermissionCacheMiddleware) GetCacheStats(ctx context.Context) (map[string]interface{}, error) {
	if !m.enabled || m.cache == nil {
		return map[string]interface{}{
			"enabled": false,
		}, nil
	}

	// Get cache info
	info := m.cache.Info(ctx, "memory").Val()

	// Get permission cache key count
	keys, err := m.cache.Keys(ctx, "permission_cache:*").Result()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"enabled":            true,
		"cached_permissions": len(keys),
		"ttl_minutes":        m.ttl.Minutes(),
		"redis_info":         info,
	}, nil
}
