package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/security"
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// UnifiedPermissionManager provides centralized permission management
type UnifiedPermissionManager struct {
	cacheMiddleware    *PermissionCacheMiddleware
	permissionRepo     database.PermissionRepository
	auditRepo          database.AuditRepository
	rateLimiter        *security.RateLimiter
	enableAuditLogging bool
	enableRateLimit    bool
}

// UnifiedPermissionConfig configures the unified permission manager
type UnifiedPermissionConfig struct {
	RedisClient        *redis.Client
	PermissionRepo     database.PermissionRepository
	AuditRepo          database.AuditRepository
	RateLimiter        *security.RateLimiter
	CacheTTL           time.Duration
	EnableCache        bool
	EnableAuditLogging bool
	EnableRateLimit    bool
}

// PermissionCheckRequest represents a permission check request
type PermissionCheckRequest struct {
	CompanyUserID   int                    `json:"company_user_id"`
	PermissionCode  string                 `json:"permission_code"`
	ResourceID      *int                   `json:"resource_id,omitempty"`
	ResourceType    string                 `json:"resource_type,omitempty"`
	RequestContext  map[string]interface{} `json:"request_context,omitempty"`
	CheckAncestry   bool                   `json:"check_ancestry,omitempty"`
	EnableOverrides bool                   `json:"enable_overrides"`
}

// PermissionCheckResponse represents a permission check response
type PermissionCheckResponse struct {
	HasPermission   bool                   `json:"has_permission"`
	Source          string                 `json:"source"`
	Reason          string                 `json:"reason"`
	CheckedAt       time.Time             `json:"checked_at"`
	CacheHit        bool                   `json:"cache_hit"`
	ResponseTime    time.Duration          `json:"response_time"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// BatchPermissionRequest represents a batch permission check request
type BatchPermissionRequest struct {
	CompanyUserID   int               `json:"company_user_id"`
	Permissions     []PermissionCheck `json:"permissions"`
	ResourceContext map[string]interface{} `json:"resource_context,omitempty"`
	EnableOverrides bool              `json:"enable_overrides"`
}

// PermissionCheck represents a single permission in a batch request
type PermissionCheck struct {
	PermissionCode string `json:"permission_code"`
	ResourceID     *int   `json:"resource_id,omitempty"`
	ResourceType   string `json:"resource_type,omitempty"`
}

// BatchPermissionResponse represents a batch permission check response
type BatchPermissionResponse struct {
	Results      map[string]*PermissionCheckResponse `json:"results"`
	CheckedAt    time.Time                          `json:"checked_at"`
	ResponseTime time.Duration                      `json:"response_time"`
	CacheHits    int                                `json:"cache_hits"`
	DatabaseHits int                                `json:"database_hits"`
}

// NewUnifiedPermissionManager creates a new unified permission manager
func NewUnifiedPermissionManager(config *UnifiedPermissionConfig) *UnifiedPermissionManager {
	var cacheMiddleware *PermissionCacheMiddleware
	
	if config.EnableCache && config.RedisClient != nil {
		cacheMiddleware = NewPermissionCacheMiddleware(&PermissionCacheConfig{
			RedisClient:    config.RedisClient,
			PermissionRepo: config.PermissionRepo,
			RateLimiter:    config.RateLimiter,
			CacheTTL:       config.CacheTTL,
			Enabled:        true,
		})
	}

	return &UnifiedPermissionManager{
		cacheMiddleware:    cacheMiddleware,
		permissionRepo:     config.PermissionRepo,
		auditRepo:          config.AuditRepo,
		rateLimiter:        config.RateLimiter,
		enableAuditLogging: config.EnableAuditLogging,
		enableRateLimit:    config.EnableRateLimit,
	}
}

// CheckPermission performs a single permission check
func (m *UnifiedPermissionManager) CheckPermission(ctx context.Context, request *PermissionCheckRequest) (*PermissionCheckResponse, error) {
	startTime := time.Now()
	
	response := &PermissionCheckResponse{
		CheckedAt: startTime,
		CacheHit:  false,
	}

	// Rate limiting check
	if m.enableRateLimit && m.rateLimiter != nil {
		rateLimitResult := m.rateLimiter.CheckRateLimitByUser(
			request.CompanyUserID, 
			1000, // 1000 requests per minute per user
			security.WindowPerMinute,
		)
		if !rateLimitResult.Allowed {
			response.HasPermission = false
			response.Reason = "Rate limit exceeded"
			response.Source = "rate_limiter"
			response.ResponseTime = time.Since(startTime)
			return response, nil
		}
	}

	var result *models.PermissionResult
	var err error

	// Use cache if available
	if m.cacheMiddleware != nil {
		result, err = m.cacheMiddleware.CheckCachedPermission(
			ctx, 
			request.CompanyUserID, 
			request.PermissionCode, 
			request.ResourceID,
		)
		response.CacheHit = true
	} else {
		// Direct database check
		result, err = m.permissionRepo.CheckUserPermission(
			ctx, 
			request.CompanyUserID, 
			request.PermissionCode, 
			request.ResourceID,
		)
	}

	if err != nil {
		response.HasPermission = false
		response.Reason = fmt.Sprintf("Permission check failed: %v", err)
		response.Source = "error"
		response.ResponseTime = time.Since(startTime)
		
		// Log error
		log.Printf("[UNIFIED_PERM] Permission check error for user %d, permission %s: %v", 
			request.CompanyUserID, request.PermissionCode, err)
		
		return response, err
	}

	// Build response
	response.HasPermission = result.HasPermission
	response.Reason = result.Reason
	response.Source = result.Source
	response.ResponseTime = time.Since(startTime)

	// Add metadata
	response.Metadata = map[string]interface{}{
		"permission_code": request.PermissionCode,
		"resource_id":     request.ResourceID,
		"resource_type":   request.ResourceType,
	}

	// Audit logging
	if m.enableAuditLogging && m.auditRepo != nil {
		go m.logPermissionCheck(ctx, request, response)
	}

	return response, nil
}

// CheckBatchPermissions performs batch permission checks
func (m *UnifiedPermissionManager) CheckBatchPermissions(ctx context.Context, request *BatchPermissionRequest) (*BatchPermissionResponse, error) {
	startTime := time.Now()
	
	response := &BatchPermissionResponse{
		Results:   make(map[string]*PermissionCheckResponse),
		CheckedAt: startTime,
		CacheHits: 0,
		DatabaseHits: 0,
	}

	// Rate limiting check for batch operations
	if m.enableRateLimit && m.rateLimiter != nil {
		rateLimitResult := m.rateLimiter.CheckRateLimitByUser(
			request.CompanyUserID, 
			100, // Lower limit for batch operations
			security.WindowPerMinute,
		)
		if !rateLimitResult.Allowed {
			for _, perm := range request.Permissions {
				response.Results[perm.PermissionCode] = &PermissionCheckResponse{
					HasPermission: false,
					Reason:        "Rate limit exceeded for batch operation",
					Source:        "rate_limiter",
					CheckedAt:     startTime,
				}
			}
			response.ResponseTime = time.Since(startTime)
			return response, nil
		}
	}

	// Extract permission codes
	permissionCodes := make([]string, len(request.Permissions))
	for i, perm := range request.Permissions {
		permissionCodes[i] = perm.PermissionCode
	}

	// Use batch cache check if available
	if m.cacheMiddleware != nil {
		// For batch operations, we'll use the first resource ID or nil
		var resourceID *int
		if len(request.Permissions) > 0 && request.Permissions[0].ResourceID != nil {
			resourceID = request.Permissions[0].ResourceID
		}

		results, err := m.cacheMiddleware.BatchCheckCachedPermissions(
			ctx, 
			request.CompanyUserID, 
			permissionCodes, 
			resourceID,
		)
		
		if err != nil {
			return nil, err
		}

		// Convert results to response format
		for permissionCode, result := range results {
			response.Results[permissionCode] = &PermissionCheckResponse{
				HasPermission: result.HasPermission,
				Reason:        result.Reason,
				Source:        result.Source,
				CheckedAt:     startTime,
				CacheHit:      true,
				Metadata: map[string]interface{}{
					"permission_code": permissionCode,
					"resource_id":     resourceID,
				},
			}
			response.CacheHits++
		}
	} else {
		// Direct database batch check
		// For simplicity, we'll check each permission individually
		// In a production system, you might want to optimize this further
		for _, perm := range request.Permissions {
			result, err := m.permissionRepo.CheckUserPermission(
				ctx, 
				request.CompanyUserID, 
				perm.PermissionCode, 
				perm.ResourceID,
			)
			
			if err != nil {
				response.Results[perm.PermissionCode] = &PermissionCheckResponse{
					HasPermission: false,
					Reason:        fmt.Sprintf("Permission check failed: %v", err),
					Source:        "error",
					CheckedAt:     startTime,
				}
				continue
			}

			response.Results[perm.PermissionCode] = &PermissionCheckResponse{
				HasPermission: result.HasPermission,
				Reason:        result.Reason,
				Source:        result.Source,
				CheckedAt:     startTime,
				CacheHit:      false,
				Metadata: map[string]interface{}{
					"permission_code": perm.PermissionCode,
					"resource_id":     perm.ResourceID,
					"resource_type":   perm.ResourceType,
				},
			}
			response.DatabaseHits++
		}
	}

	response.ResponseTime = time.Since(startTime)

	// Batch audit logging
	if m.enableAuditLogging && m.auditRepo != nil {
		go m.logBatchPermissionCheck(ctx, request, response)
	}

	return response, nil
}

// CreatePermissionMiddleware creates a gin middleware using the unified permission manager
func (m *UnifiedPermissionManager) CreatePermissionMiddleware(permissionCode string) gin.HandlerFunc {
	if m.cacheMiddleware != nil {
		return m.cacheMiddleware.RequireCachedPermission(permissionCode)
	}
	
	// Fallback to traditional permission middleware if cache is not available
	return func(c *gin.Context) {
		request := &PermissionCheckRequest{
			PermissionCode:  permissionCode,
			EnableOverrides: true,
		}

		// Get company user ID from context
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(403, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(500, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}
		request.CompanyUserID = companyUserID

		// Get resource ID if available
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.ParseInt(idStr, 10, 32); err == nil {
				resourceID := int(id)
				request.ResourceID = &resourceID
			}
		}
		if request.ResourceID == nil {
			if idStr := c.Param("project_id"); idStr != "" {
				if id, err := strconv.ParseInt(idStr, 10, 32); err == nil {
					resourceID := int(id)
					request.ResourceID = &resourceID
				}
			}
		}

		// Check permission
		response, err := m.CheckPermission(c.Request.Context(), request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Permission check failed"})
			c.Abort()
			return
		}

		if !response.HasPermission {
			c.JSON(403, gin.H{
				"error":  "Permission denied",
				"reason": response.Reason,
				"source": response.Source,
			})
			c.Abort()
			return
		}

		// Store permission result in context
		c.Set("permission_result", response)
		c.Next()
	}
}

// InvalidateUserCache invalidates cached permissions for a user
func (m *UnifiedPermissionManager) InvalidateUserCache(ctx context.Context, companyUserID int) error {
	if m.cacheMiddleware != nil {
		return m.cacheMiddleware.InvalidateUserPermissions(ctx, companyUserID)
	}
	return nil
}

// GetManagerStats returns statistics about the permission manager
func (m *UnifiedPermissionManager) GetManagerStats(ctx context.Context) (map[string]interface{}, error) {
	stats := map[string]interface{}{
		"cache_enabled":        m.cacheMiddleware != nil,
		"audit_logging_enabled": m.enableAuditLogging,
		"rate_limit_enabled":   m.enableRateLimit,
	}

	// Get cache stats if available
	if m.cacheMiddleware != nil {
		cacheStats, err := m.cacheMiddleware.GetCacheStats(ctx)
		if err != nil {
			return nil, err
		}
		stats["cache_stats"] = cacheStats
	}

	// Get rate limiter stats if available
	if m.rateLimiter != nil {
		rateLimiterStats := m.rateLimiter.GetStats()
		stats["rate_limiter_stats"] = rateLimiterStats
	}

	return stats, nil
}

// logPermissionCheck logs a permission check for audit purposes
func (m *UnifiedPermissionManager) logPermissionCheck(ctx context.Context, request *PermissionCheckRequest, response *PermissionCheckResponse) {
	if m.auditRepo == nil {
		return
	}

	auditLog := &models.AuditLog{
		UserID:      &request.CompanyUserID,
		Action:      "permission_check",
		EntityType:  request.PermissionCode,
		EntityData:  map[string]interface{}{
			"permission_code": request.PermissionCode,
			"resource_type":   request.ResourceType,
			"result_source":   response.Source,
			"result_reason":   response.Reason,
			"cache_hit":       response.CacheHit,
			"response_time_ms": response.ResponseTime.Milliseconds(),
		},
	}

	// Convert ResourceID to string if present
	if request.ResourceID != nil {
		auditLog.EntityID = strconv.Itoa(*request.ResourceID)
	}

	// Log asynchronously to avoid blocking the request
	if err := m.auditRepo.CreateAuditLog(ctx, auditLog); err != nil {
		log.Printf("[UNIFIED_PERM] Failed to log permission check audit: %v", err)
	}
}

// logBatchPermissionCheck logs a batch permission check for audit purposes
func (m *UnifiedPermissionManager) logBatchPermissionCheck(ctx context.Context, request *BatchPermissionRequest, response *BatchPermissionResponse) {
	if m.auditRepo == nil {
		return
	}

	auditLog := &models.AuditLog{
		UserID:     &request.CompanyUserID,
		Action:     "batch_permission_check",
		EntityType: "batch_permissions",
		EntityData: map[string]interface{}{
			"permissions_count": len(request.Permissions),
			"cache_hits":        response.CacheHits,
			"database_hits":     response.DatabaseHits,
			"response_time_ms":  response.ResponseTime.Milliseconds(),
			"permissions_checked": func() []string {
				codes := make([]string, len(request.Permissions))
				for i, perm := range request.Permissions {
					codes[i] = perm.PermissionCode
				}
				return codes
			}(),
		},
	}

	// Log asynchronously
	if err := m.auditRepo.CreateAuditLog(ctx, auditLog); err != nil {
		log.Printf("[UNIFIED_PERM] Failed to log batch permission check audit: %v", err)
	}
}
