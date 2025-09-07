package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/security"
	"ai-project-backend/services"
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

// EnterprisePermissionMiddleware provides enterprise-aware permission checking with caching
type EnterprisePermissionMiddleware struct {
	cache          *redis.Client
	permissionRepo database.PermissionRepository
	enterpriseRepo database.EnterpriseRepository
	rateLimiter    *security.RateLimiter
	ttl            time.Duration
	enabled        bool
	// New unified permission service adapter
	permissionAdapter *services.PermissionServiceAdapter
}

// EnterprisePermissionConfig configures the enterprise permission middleware
type EnterprisePermissionConfig struct {
	RedisClient       *redis.Client
	PermissionRepo    database.PermissionRepository
	EnterpriseRepo    database.EnterpriseRepository
	RateLimiter       *security.RateLimiter
	CacheTTL          time.Duration
	Enabled           bool
	PermissionAdapter *services.PermissionServiceAdapter
}

// NewEnterprisePermissionMiddleware creates a new enterprise permission middleware
func NewEnterprisePermissionMiddleware(config *EnterprisePermissionConfig) *EnterprisePermissionMiddleware {
	if config.CacheTTL == 0 {
		config.CacheTTL = 15 * time.Minute // Default TTL
	}

	return &EnterprisePermissionMiddleware{
		cache:             config.RedisClient,
		permissionRepo:    config.PermissionRepo,
		enterpriseRepo:    config.EnterpriseRepo,
		rateLimiter:       config.RateLimiter,
		ttl:               config.CacheTTL,
		enabled:           config.Enabled,
		permissionAdapter: config.PermissionAdapter,
	}
}

// EnterprisePermissionCacheKey generates a cache key for enterprise permission checks
func (m *EnterprisePermissionMiddleware) EnterprisePermissionCacheKey(enterpriseUserID int, permissionCode string, resourceID *int) string {
	key := fmt.Sprintf("enterprise_perm:%d:%s", enterpriseUserID, permissionCode)
	if resourceID != nil {
		key += fmt.Sprintf(":%d", *resourceID)
	}

	// Create MD5 hash for consistent key length
	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("enterprise_permission_cache:%x", hash)
}

// GetCachedEnterprisePermission retrieves permission result from cache
func (m *EnterprisePermissionMiddleware) GetCachedEnterprisePermission(ctx context.Context, enterpriseUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, bool) {
	if !m.enabled || m.cache == nil {
		return nil, false
	}

	key := m.EnterprisePermissionCacheKey(enterpriseUserID, permissionCode, resourceID)

	cachedResult, err := m.cache.Get(ctx, key).Result()
	if err != nil {
		if err != redis.Nil {
			log.Printf("[ENTERPRISE_PERMISSION_CACHE] Cache get error for key %s: %v", key, err)
		}
		return nil, false
	}

	var result models.PermissionResult
	if err := json.Unmarshal([]byte(cachedResult), &result); err != nil {
		log.Printf("[ENTERPRISE_PERMISSION_CACHE] Failed to unmarshal cached result: %v", err)
		return nil, false
	}

	return &result, true
}

// SetCachedEnterprisePermission stores permission result in cache
func (m *EnterprisePermissionMiddleware) SetCachedEnterprisePermission(ctx context.Context, enterpriseUserID int, permissionCode string, resourceID *int, result *models.PermissionResult) {
	if !m.enabled || m.cache == nil || result == nil {
		return
	}

	key := m.EnterprisePermissionCacheKey(enterpriseUserID, permissionCode, resourceID)

	resultJSON, err := json.Marshal(result)
	if err != nil {
		log.Printf("[ENTERPRISE_PERMISSION_CACHE] Failed to marshal permission result: %v", err)
		return
	}

	err = m.cache.Set(ctx, key, resultJSON, m.ttl).Err()
	if err != nil {
		log.Printf("[ENTERPRISE_PERMISSION_CACHE] Failed to set cache for key %s: %v", key, err)
	}
}

// CheckEnterprisePermission checks permission with enterprise context and caching
func (m *EnterprisePermissionMiddleware) CheckEnterprisePermission(ctx context.Context, enterpriseUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	// Try cache first
	if cachedResult, found := m.GetCachedEnterprisePermission(ctx, enterpriseUserID, permissionCode, resourceID); found {
		log.Printf("[ENTERPRISE_PERMISSION_CACHE] Cache hit for enterprise user %d, permission %s", enterpriseUserID, permissionCode)
		return cachedResult, nil
	}

	// Cache miss - check database
	log.Printf("[ENTERPRISE_PERMISSION_CACHE] Cache miss for enterprise user %d, permission %s", enterpriseUserID, permissionCode)
	
	var result *models.PermissionResult
	var err error

	// Use the new permission adapter if available
	if m.permissionAdapter != nil {
		result, err = m.permissionAdapter.CheckEnterpriseUserPermission(ctx, enterpriseUserID, permissionCode, resourceID)
	} else {
		// Fallback to legacy permission repo
		result, err = m.permissionRepo.CheckUserPermission(ctx, enterpriseUserID, permissionCode, resourceID)
	}
	
	if err != nil {
		return nil, err
	}

	// Cache the result
	m.SetCachedEnterprisePermission(ctx, enterpriseUserID, permissionCode, resourceID, result)

	return result, nil
}

// RequireEnterprisePermission creates middleware that requires specific permission for enterprise users
func (m *EnterprisePermissionMiddleware) RequireEnterprisePermission(permissionCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Rate limiting check
		if m.rateLimiter != nil {
			// Get enterprise user ID for rate limiting
			enterpriseUserIDInterface, exists := c.Get("enterprise_user_id")
			if exists {
				if enterpriseUserID, ok := enterpriseUserIDInterface.(int); ok {
					result := m.rateLimiter.CheckRateLimitByUser(enterpriseUserID, 100, security.WindowPerMinute)
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

		// Get enterprise user ID from context (should be set by authentication middleware)
		enterpriseUserIDInterface, exists := c.Get("enterprise_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Enterprise user ID not found"})
			c.Abort()
			return
		}

		enterpriseUserID, ok := enterpriseUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid enterprise user ID"})
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
		// Also check for enterprise_id parameter
		if resourceID == nil {
			if idStr := c.Param("enterprise_id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					resourceID = &id
				}
			}
		}

		// Check permission with caching
		result, err := m.CheckEnterprisePermission(ctx, enterpriseUserID, permissionCode, resourceID)
		if err != nil {
			log.Printf("[ENTERPRISE_PERMISSION_CACHE] Permission check error for enterprise user %d, permission %s: %v",
				enterpriseUserID, permissionCode, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permission"})
			c.Abort()
			return
		}

		if !result.HasPermission {
			log.Printf("[ENTERPRISE_PERMISSION_CACHE] Permission denied for enterprise user %d, permission %s: %s",
				enterpriseUserID, permissionCode, result.Reason)
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Permission denied",
				"reason": result.Reason,
				"source": result.Source,
			})
			c.Abort()
			return
		}

		// Log successful permission check
		log.Printf("[ENTERPRISE_PERMISSION_CACHE] Permission granted for enterprise user %d, permission %s (source: %s)",
			enterpriseUserID, permissionCode, result.Source)

		// Store permission result in context for potential use in handlers
		c.Set("enterprise_permission_result", result)
		c.Next()
	}
}

// InvalidateEnterpriseUserPermissions invalidates all cached permissions for an enterprise user
func (m *EnterprisePermissionMiddleware) InvalidateEnterpriseUserPermissions(ctx context.Context, enterpriseUserID int) error {
	if !m.enabled || m.cache == nil {
		return nil
	}

	pattern := fmt.Sprintf("enterprise_permission_cache:*%d*", enterpriseUserID)
	keys, err := m.cache.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get cache keys for enterprise user %d: %w", enterpriseUserID, err)
	}

	if len(keys) > 0 {
		err = m.cache.Del(ctx, keys...).Err()
		if err != nil {
			return fmt.Errorf("failed to delete cache keys for enterprise user %d: %w", enterpriseUserID, err)
		}
		log.Printf("[ENTERPRISE_PERMISSION_CACHE] Invalidated %d cached permissions for enterprise user %d", len(keys), enterpriseUserID)
	}

	return nil
}

// BatchCheckEnterprisePermissions checks multiple permissions with caching for enterprise users
func (m *EnterprisePermissionMiddleware) BatchCheckEnterprisePermissions(ctx context.Context, enterpriseUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	results := make(map[string]*models.PermissionResult)
	uncachedPermissions := make([]string, 0)

	// Check cache for each permission
	for _, permissionCode := range permissionCodes {
		if cachedResult, found := m.GetCachedEnterprisePermission(ctx, enterpriseUserID, permissionCode, resourceID); found {
			results[permissionCode] = cachedResult
		} else {
			uncachedPermissions = append(uncachedPermissions, permissionCode)
		}
	}

	// Fetch uncached permissions from database
	if len(uncachedPermissions) > 0 {
		var dbResults map[string]*models.PermissionResult
		var err error

		// Use the new permission adapter if available
		if m.permissionAdapter != nil {
			dbResults, err = m.permissionAdapter.CheckMultiplePermissions(ctx, enterpriseUserID, uncachedPermissions, resourceID)
		} else {
			// Fallback to legacy permission repo
			dbResults, err = m.permissionRepo.CheckMultiplePermissions(ctx, enterpriseUserID, uncachedPermissions, resourceID)
		}
		
		if err != nil {
			return nil, err
		}

		// Cache and merge results
		for permissionCode, result := range dbResults {
			results[permissionCode] = result
			m.SetCachedEnterprisePermission(ctx, enterpriseUserID, permissionCode, resourceID, result)
		}
	}

	log.Printf("[ENTERPRISE_PERMISSION_CACHE] Batch permission check for enterprise user %d: %d cached, %d from DB",
		enterpriseUserID, len(permissionCodes)-len(uncachedPermissions), len(uncachedPermissions))

	return results, nil
}

// RequireEnterpriseAnyPermission creates middleware that requires any of the specified permissions for enterprise users
func (m *EnterprisePermissionMiddleware) RequireEnterpriseAnyPermission(permissionCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Get enterprise user ID from context
		enterpriseUserIDInterface, exists := c.Get("enterprise_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Enterprise user ID not found"})
			c.Abort()
			return
		}

		enterpriseUserID, ok := enterpriseUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid enterprise user ID"})
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
			if idStr := c.Param("enterprise_id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					resourceID = &id
				}
			}
		}

		// Check if user has any of the required permissions using batch check
		results, err := m.BatchCheckEnterprisePermissions(ctx, enterpriseUserID, permissionCodes, resourceID)
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
				"reason": "Enterprise user does not have any of the required permissions",
			})
			c.Abort()
			return
		}

		// Store permission results in context
		c.Set("enterprise_permission_results", results)
		c.Set("enterprise_granted_permissions", grantedPermissions)
		c.Next()
	}
}

// GetEnterprisePermissionCacheStats returns cache statistics for enterprise permissions
func (m *EnterprisePermissionMiddleware) GetEnterprisePermissionCacheStats(ctx context.Context) (map[string]interface{}, error) {
	if !m.enabled || m.cache == nil {
		return map[string]interface{}{
			"enabled": false,
		}, nil
	}

	// Get cache info
	info := m.cache.Info(ctx, "memory").Val()

	// Get enterprise permission cache key count
	keys, err := m.cache.Keys(ctx, "enterprise_permission_cache:*").Result()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"enabled":                        true,
		"cached_enterprise_permissions":  len(keys),
		"ttl_minutes":                    m.ttl.Minutes(),
		"redis_info":                     info,
	}, nil
}

// EnterprisePermissionContext provides enterprise-aware permission context
type EnterprisePermissionContext struct {
	EnterpriseUserID int
	EnterpriseID     int
	AccessLevel      int
	Permissions      []string
}

// GetEnterprisePermissionContext extracts enterprise permission context from gin.Context
func GetEnterprisePermissionContext(c *gin.Context) (*EnterprisePermissionContext, error) {
	enterpriseUserID, exists := c.Get("enterprise_user_id")
	if !exists {
		return nil, fmt.Errorf("enterprise user ID not found in context")
	}

	userID, ok := enterpriseUserID.(int)
	if !ok {
		return nil, fmt.Errorf("invalid enterprise user ID type")
	}

	context := &EnterprisePermissionContext{
		EnterpriseUserID: userID,
	}

	// Get enterprise ID if available
	if enterpriseID, exists := c.Get("enterprise_id"); exists {
		if id, ok := enterpriseID.(int); ok {
			context.EnterpriseID = id
		}
	}

	// Get access level if available
	if accessLevel, exists := c.Get("access_level"); exists {
		if level, ok := accessLevel.(int); ok {
			context.AccessLevel = level
		}
	}

	// Get granted permissions if available
	if permissions, exists := c.Get("enterprise_granted_permissions"); exists {
		if perms, ok := permissions.([]string); ok {
			context.Permissions = perms
		}
	}

	return context, nil
}

// HasEnterprisePermission checks if the current context has a specific permission
func (ctx *EnterprisePermissionContext) HasEnterprisePermission(permission string) bool {
	for _, p := range ctx.Permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// HasEnterpriseAccessLevel checks if the current context has sufficient access level
func (ctx *EnterprisePermissionContext) HasEnterpriseAccessLevel(requiredLevel int) bool {
	return ctx.AccessLevel >= requiredLevel
}