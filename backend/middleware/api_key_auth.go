package middleware

import (
	"context"
	"crypto/sha256"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/security"

	"github.com/gin-gonic/gin"
)

// APIKeyAuthConfig contains configuration for API key authentication middleware
type APIKeyAuthConfig struct {
	DB                   database.DB
	EnableHMACValidation bool
	EnableTimestamp      bool
	EnableRateLimit      bool
	EnableIPWhitelist    bool
	RequireHTTPS         bool

	// Security validators
	HMACValidator        *security.HMACValidator
	TimestampValidator   *security.TimestampValidator
	RateLimiter          *security.RateLimiter
	IPWhitelistValidator *security.IPWhitelistValidator

	// Headers
	APIKeyHeader        string
	AuthorizationHeader string

	// Rate limiting defaults
	DefaultRateLimit  int
	DefaultRateWindow security.RateLimitWindow

	// Error responses
	UnauthorizedMessage string
	ForbiddenMessage    string
	RateLimitMessage    string
}

// APIKeyAuthMiddleware handles API key authentication and security validation
type APIKeyAuthMiddleware struct {
	config *APIKeyAuthConfig
}

// NewAPIKeyAuthMiddleware creates a new API key authentication middleware
func NewAPIKeyAuthMiddleware(config *APIKeyAuthConfig) *APIKeyAuthMiddleware {
	// Set defaults if not provided
	if config.APIKeyHeader == "" {
		config.APIKeyHeader = "X-API-Key"
	}
	if config.AuthorizationHeader == "" {
		config.AuthorizationHeader = "Authorization"
	}
	if config.DefaultRateLimit == 0 {
		config.DefaultRateLimit = 1000
	}
	if config.DefaultRateWindow == "" {
		config.DefaultRateWindow = security.WindowPerHour
	}
	if config.UnauthorizedMessage == "" {
		config.UnauthorizedMessage = "Invalid or missing API key"
	}
	if config.ForbiddenMessage == "" {
		config.ForbiddenMessage = "Access denied"
	}
	if config.RateLimitMessage == "" {
		config.RateLimitMessage = "Rate limit exceeded"
	}

	// Initialize security validators if enabled but not provided
	if config.EnableHMACValidation && config.HMACValidator == nil {
		config.HMACValidator = security.NewHMACValidator()
	}
	if config.EnableTimestamp && config.TimestampValidator == nil {
		config.TimestampValidator = security.NewTimestampValidator()
	}
	if config.EnableRateLimit && config.RateLimiter == nil {
		config.RateLimiter = security.NewRateLimiter()
	}
	if config.EnableIPWhitelist && config.IPWhitelistValidator == nil {
		config.IPWhitelistValidator = security.NewIPWhitelistValidator()
	}

	return &APIKeyAuthMiddleware{
		config: config,
	}
}

// Middleware returns the Gin middleware function
func (am *APIKeyAuthMiddleware) Middleware() gin.HandlerFunc {
	return gin.HandlerFunc(am.authenticate)
}

// authenticate performs the API key authentication process
func (am *APIKeyAuthMiddleware) authenticate(c *gin.Context) {
	// Check HTTPS requirement
	if am.config.RequireHTTPS && !am.isHTTPS(c.Request) {
		am.respondWithError(c, http.StatusUpgradeRequired, "HTTPS required for API key authentication", nil)
		return
	}

	// Extract API key from request
	apiKey, err := am.extractAPIKey(c.Request)
	if err != nil {
		am.respondWithError(c, http.StatusUnauthorized, am.config.UnauthorizedMessage, map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Validate and load API key from database
	apiKeyModel, err := am.validateAndLoadAPIKey(c.Request.Context(), apiKey)
	if err != nil {
		am.respondWithError(c, http.StatusUnauthorized, am.config.UnauthorizedMessage, map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Perform security validations
	if err := am.performSecurityValidations(c.Request, apiKeyModel); err != nil {
		statusCode := http.StatusForbidden
		message := am.config.ForbiddenMessage

		// Handle specific error types
		if strings.Contains(err.Error(), "rate limit") {
			statusCode = http.StatusTooManyRequests
			message = am.config.RateLimitMessage
		}

		am.respondWithError(c, statusCode, message, map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Update API key usage statistics
	go am.updateAPIKeyUsage(apiKeyModel.ID, c.Request)

	// Set context values for downstream handlers
	am.setContextValues(c, apiKeyModel)

	// Continue to next handler
	c.Next()
}

// extractAPIKey extracts the API key from the request
func (am *APIKeyAuthMiddleware) extractAPIKey(r *http.Request) (string, error) {
	// Try X-API-Key header first
	if apiKey := r.Header.Get(am.config.APIKeyHeader); apiKey != "" {
		return apiKey, nil
	}

	// Try Authorization header (Bearer token format)
	if auth := r.Header.Get(am.config.AuthorizationHeader); auth != "" {
		if strings.HasPrefix(auth, "Bearer ") {
			return strings.TrimPrefix(auth, "Bearer "), nil
		}
		if strings.HasPrefix(auth, "ApiKey ") {
			return strings.TrimPrefix(auth, "ApiKey "), nil
		}
	}

	// Try query parameter
	if apiKey := r.URL.Query().Get("api_key"); apiKey != "" {
		return apiKey, nil
	}

	return "", fmt.Errorf("API key not found in headers or query parameters")
}

// validateAndLoadAPIKey validates the API key format and loads it from database
func (am *APIKeyAuthMiddleware) validateAndLoadAPIKey(ctx context.Context, apiKey string) (*models.APIKey, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key cannot be empty")
	}

	// Basic format validation
	if len(apiKey) < 20 {
		return nil, fmt.Errorf("API key too short")
	}

	// Extract key prefix for lookup
	keyPrefix := am.extractKeyPrefix(apiKey)
	if keyPrefix == "" {
		return nil, fmt.Errorf("invalid API key format")
	}

	// Load API key from database by prefix
	apiKeyModel, err := am.config.DB.APIKeys().GetAPIKeyByPrefix(ctx, keyPrefix)
	if err != nil {
		return nil, fmt.Errorf("API key not found: %w", err)
	}

	// Validate API key hash
	if !am.validateAPIKeyHash(apiKey, apiKeyModel.KeyHash) {
		return nil, fmt.Errorf("invalid API key")
	}

	// Check if API key is active and not expired
	if !apiKeyModel.IsValid() {
		if apiKeyModel.IsExpired() {
			return nil, fmt.Errorf("API key has expired")
		}
		if !apiKeyModel.IsActive {
			return nil, fmt.Errorf("API key is disabled")
		}
		if apiKeyModel.DeletedAt != nil {
			return nil, fmt.Errorf("API key has been deleted")
		}
	}

	return apiKeyModel, nil
}

// extractKeyPrefix extracts the known static prefix from an API key
func (am *APIKeyAuthMiddleware) extractKeyPrefix(apiKey string) string {
	// The system uses fixed prefixes returned by APIKeyService.GenerateKeyPrefix
	// Recognize only known prefixes to avoid ambiguity with base64 characters
	for _, p := range []string{"ak_admin_", "ak_rw_", "ak_ro_"} {
		if strings.HasPrefix(apiKey, p) {
			return p
		}
	}
	return ""
}

// validateAPIKeyHash validates the presented API key against the stored hash
func (am *APIKeyAuthMiddleware) validateAPIKeyHash(apiKey, storedHash string) bool {
	// The stored hash is a SHA-256 of the random key part (without the prefix)
	prefix := am.extractKeyPrefix(apiKey)
	if prefix == "" {
		return false
	}
	keyPart := strings.TrimPrefix(apiKey, prefix)
	h := sha256.Sum256([]byte(keyPart))
	presented := fmt.Sprintf("%x", h)
	return presented == storedHash
}

// performSecurityValidations performs various security validations
func (am *APIKeyAuthMiddleware) performSecurityValidations(r *http.Request, apiKey *models.APIKey) error {
	// IP whitelist validation
	if am.config.EnableIPWhitelist {
		if err := am.config.IPWhitelistValidator.ValidateRequest(r, []net.IP(apiKey.AllowedIPs)); err != nil {
			return fmt.Errorf("IP validation failed: %w", err)
		}
	}

	// Rate limiting
	if am.config.EnableRateLimit {
		limit := apiKey.RateLimitCount
		if limit == 0 {
			limit = am.config.DefaultRateLimit
		}

		window := security.RateLimitWindow(apiKey.RateLimitWindow)
		if window == "" {
			window = am.config.DefaultRateWindow
		}

		result := am.config.RateLimiter.CheckRateLimitByAPIKey(apiKey.ID, limit, window)
		if !result.Allowed {
			// Set rate limit headers
			am.setRateLimitHeaders(r, result)
			return fmt.Errorf("rate limit exceeded: %d/%d requests", result.CurrentCount, result.Limit)
		}

		// Set rate limit headers for successful requests too
		am.setRateLimitHeaders(r, result)
	}

	// Timestamp validation
	if am.config.EnableTimestamp {
		if err := am.config.TimestampValidator.ValidateRequest(r); err != nil {
			return fmt.Errorf("timestamp validation failed: %w", err)
		}
	}

	// HMAC signature validation
	if am.config.EnableHMACValidation {
		secret := ""
		if apiKey.SecretHash != nil {
			secret = *apiKey.SecretHash // In production, this should be decrypted
		}

		if secret == "" {
			return fmt.Errorf("HMAC validation enabled but no secret configured for API key")
		}

		if err := am.config.HMACValidator.ValidateSignature(r, secret); err != nil {
			return fmt.Errorf("HMAC validation failed: %w", err)
		}
	}

	return nil
}

// setRateLimitHeaders sets rate limiting headers in the response
func (am *APIKeyAuthMiddleware) setRateLimitHeaders(r *http.Request, result security.RateLimitResult) {
	// Note: We can't set response headers here directly, but we can store them in context
	// for the response to be set later in the handler

	headers := map[string]string{
		"X-RateLimit-Limit":     strconv.Itoa(result.Limit),
		"X-RateLimit-Remaining": strconv.Itoa(result.RemainingCount),
		"X-RateLimit-Reset":     strconv.FormatInt(result.ResetTime.Unix(), 10),
		"X-RateLimit-Window":    string(result.Window),
	}

	if !result.Allowed {
		headers["Retry-After"] = strconv.Itoa(int(result.RetryAfter.Seconds()))
	}

	// Store headers in request context for later use
	ctx := context.WithValue(r.Context(), "rate_limit_headers", headers)
	*r = *r.WithContext(ctx)
}

// updateAPIKeyUsage updates API key usage statistics asynchronously
func (am *APIKeyAuthMiddleware) updateAPIKeyUsage(apiKeyID int64, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Update last used timestamp and increment usage count
	if err := am.config.DB.APIKeys().UpdateAPIKeyUsage(ctx, apiKeyID); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Failed to update API key usage: %v\n", err)
	}

	// Log API usage for analytics
	am.logAPIUsage(ctx, apiKeyID, r)
}

// logAPIUsage logs API usage for analytics and monitoring
func (am *APIKeyAuthMiddleware) logAPIUsage(ctx context.Context, apiKeyID int64, r *http.Request) {
	clientIP, _ := am.config.IPWhitelistValidator.GetClientIP(r)

	userAgent := truncateUserAgent(r.UserAgent(), 500)
	usageLog := &models.APIUsageLog{
		APIKeyID:         apiKeyID,
		Endpoint:         r.URL.Path,
		Method:           r.Method,
		IPAddress:        clientIP,
		UserAgent:        &userAgent, // Use pointer to string
		RequestTimestamp: time.Now(),
		ResponseStatus:   200, // Will be updated by response middleware
	}

	if referer := r.Referer(); referer != "" {
		usageLog.Referer = &referer
	}

	// Store usage log
	if err := am.config.DB.APIKeys().CreateAPIUsageLog(ctx, usageLog); err != nil {
		fmt.Printf("Failed to log API usage: %v\n", err)
	}
}

// setContextValues sets values in the Gin context for downstream handlers
func (am *APIKeyAuthMiddleware) setContextValues(c *gin.Context, apiKey *models.APIKey) {
	c.Set("api_key_id", apiKey.ID)
	c.Set("api_key_name", apiKey.Name)
	c.Set("api_key_permissions", apiKey.Permissions)
	c.Set("api_key_scope_projects", apiKey.ScopeProjects)
	c.Set("api_key_scope_users", apiKey.ScopeUsers)
	c.Set("api_key", apiKey) // Full API key object
	c.Set("auth_type", "api_key")

	// Set user context if API key is associated with a user
	if apiKey.CreatedBy > 0 {
		c.Set("user_id", apiKey.CreatedBy)
	}
}

// isHTTPS checks if the request is made over HTTPS
func (am *APIKeyAuthMiddleware) isHTTPS(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}

	// Check proxy headers
	if proto := r.Header.Get("X-Forwarded-Proto"); proto == "https" {
		return true
	}
	if scheme := r.Header.Get("X-Forwarded-Scheme"); scheme == "https" {
		return true
	}
	if r.Header.Get("X-Forwarded-Ssl") == "on" {
		return true
	}

	return false
}

// respondWithError sends an error response and aborts the request
func (am *APIKeyAuthMiddleware) respondWithError(c *gin.Context, statusCode int, message string, details map[string]interface{}) {
	response := models.APIResponse{
		Success: false,
		Message: message,
		Data:    details,
	}

	c.JSON(statusCode, response)
	c.Abort()
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// truncateUserAgent safely truncates a User-Agent string to a maximum length
func truncateUserAgent(userAgent string, maxLen int) string {
	if len(userAgent) <= maxLen {
		return userAgent
	}
	return userAgent[:maxLen]
}

// APIKeyAuthRequired creates a middleware that requires API key authentication
func APIKeyAuthRequired(config *APIKeyAuthConfig) gin.HandlerFunc {
	middleware := NewAPIKeyAuthMiddleware(config)
	return middleware.Middleware()
}

// APIKeyAuthOptional creates a middleware that optionally validates API keys if present
func APIKeyAuthOptional(config *APIKeyAuthConfig) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		middleware := NewAPIKeyAuthMiddleware(config)

		// Try to extract API key
		apiKey, err := middleware.extractAPIKey(c.Request)
		if err != nil || apiKey == "" {
			// No API key provided, continue without authentication
			c.Set("auth_type", "none")
			c.Next()
			return
		}

		// API key provided, validate it
		middleware.authenticate(c)
	})
}

// RequirePermission creates a middleware that requires specific API permissions
func RequirePermission(permissions ...models.APIPermissionType) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Get API key permissions from context
		apiKeyPermissions, exists := c.Get("api_key_permissions")
		if !exists {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Message: "API key authentication required",
			})
			c.Abort()
			return
		}

		perms, ok := apiKeyPermissions.(models.APIPermissions)
		if !ok {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Message: "Invalid API key permissions",
			})
			c.Abort()
			return
		}

		// Check if API key has required permissions
		for _, requiredPerm := range permissions {
			hasPermission := false
			for _, keyPerm := range perms {
				if keyPerm == requiredPerm || keyPerm == models.PermissionAPIAdmin {
					hasPermission = true
					break
				}
			}

			if !hasPermission {
				c.JSON(http.StatusForbidden, models.APIResponse{
					Success: false,
					Message: fmt.Sprintf("Required permission not granted: %s", requiredPerm),
				})
				c.Abort()
				return
			}
		}

		c.Next()
	})
}

// RequireProjectAccess creates a middleware that requires access to a specific project
func RequireProjectAccess() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Get project ID from URL parameter
		projectIDStr := c.Param("projectId")
		if projectIDStr == "" {
			projectIDStr = c.Param("id") // Alternative parameter name
		}

		if projectIDStr == "" {
			c.JSON(http.StatusBadRequest, models.APIResponse{
				Success: false,
				Message: "Project ID required",
			})
			c.Abort()
			return
		}

		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.APIResponse{
				Success: false,
				Message: "Invalid project ID",
			})
			c.Abort()
			return
		}

		// Get API key from context
		apiKey, exists := c.Get("api_key")
		if !exists {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Message: "API key authentication required",
			})
			c.Abort()
			return
		}

		key, ok := apiKey.(*models.APIKey)
		if !ok {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Message: "Invalid API key",
			})
			c.Abort()
			return
		}

		// Check project access
		if !key.HasProjectAccess(projectID) {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Message: "Access denied to this project",
			})
			c.Abort()
			return
		}

		c.Set("project_id", projectID)
		c.Next()
	})
}
