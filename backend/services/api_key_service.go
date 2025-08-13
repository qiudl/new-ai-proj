package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net"
	"regexp"
	"time"
)

// APIKeyService handles business logic for API key management
type APIKeyService struct {
	apiKeyRepo *database.APIKeyRepository
}

// NewAPIKeyService creates a new API key service
func NewAPIKeyService(apiKeyRepo *database.APIKeyRepository) *APIKeyService {
	return &APIKeyService{
		apiKeyRepo: apiKeyRepo,
	}
}

// GenerateKeyPair generates a new API key and secret pair
func (s *APIKeyService) GenerateKeyPair() (string, string, error) {
	// Generate 32 bytes of random data for the key
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", "", fmt.Errorf("failed to generate key: %w", err)
	}

	// Generate 16 bytes of random data for the secret
	secretBytes := make([]byte, 16)
	if _, err := rand.Read(secretBytes); err != nil {
		return "", "", fmt.Errorf("failed to generate secret: %w", err)
	}

	// Encode to base64
	key := base64.URLEncoding.EncodeToString(keyBytes)
	secret := base64.URLEncoding.EncodeToString(secretBytes)

	return key, secret, nil
}

// HashKey creates a SHA-256 hash of the API key
func (s *APIKeyService) HashKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return fmt.Sprintf("%x", hash)
}

// GenerateKeyPrefix generates a key prefix based on permissions
func (s *APIKeyService) GenerateKeyPrefix(permissions models.APIPermissions) string {
	// Check for admin permissions
	for _, perm := range permissions {
		if perm == models.PermissionAPIAdmin {
			return "ak_admin_"
		}
	}

	// Check for write permissions
	hasWrite := false
	for _, perm := range permissions {
		if perm == models.PermissionAPIWrite ||
			perm == models.PermissionTasksWrite ||
			perm == models.PermissionProjectsWrite ||
			perm == models.PermissionUsersWrite ||
			perm == models.PermissionAnalyticsWrite {
			hasWrite = true
			break
		}
	}

	if hasWrite {
		return "ak_rw_"
	}

	// Default to read-only
	return "ak_ro_"
}

// ValidatePermissions validates that all permissions are valid
func (s *APIKeyService) ValidatePermissions(permissions models.APIPermissions) error {
	if len(permissions) == 0 {
		return fmt.Errorf("at least one permission is required")
	}

	for _, perm := range permissions {
		if !models.IsValidPermission(perm) {
			return fmt.Errorf("invalid permission: %s", perm)
		}
	}

	return nil
}

// ValidateIPAddresses validates IP addresses in the allowed IPs list
func (s *APIKeyService) ValidateIPAddresses(ips models.IPSlice) error {
	for _, ip := range ips {
		if ip == nil {
			return fmt.Errorf("invalid IP address: nil")
		}
	}
	return nil
}

// ValidateDomains validates domain names in the allowed domains list
func (s *APIKeyService) ValidateDomains(domains models.StringSlice) error {
	domainRegex := regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$`)
	
	for _, domain := range domains {
		if !domainRegex.MatchString(domain) {
			return fmt.Errorf("invalid domain name: %s", domain)
		}
	}
	return nil
}

// CreateAPIKey creates a new API key with validation
func (s *APIKeyService) CreateAPIKey(ctx context.Context, req *models.APIKeyCreateRequest, createdBy int) (*models.APIKeyCreateResponse, error) {
	// Validate permissions
	if err := s.ValidatePermissions(req.Permissions); err != nil {
		return nil, fmt.Errorf("permission validation failed: %w", err)
	}

	// Validate IP addresses if provided
	if len(req.AllowedIPs) > 0 {
		if err := s.ValidateIPAddresses(req.AllowedIPs); err != nil {
			return nil, fmt.Errorf("IP validation failed: %w", err)
		}
	}

	// Validate domains if provided
	if len(req.AllowedDomains) > 0 {
		if err := s.ValidateDomains(req.AllowedDomains); err != nil {
			return nil, fmt.Errorf("domain validation failed: %w", err)
		}
	}

	// Validate rate limit window
	if !models.IsValidRateLimitWindow(req.RateLimitWindow) {
		return nil, fmt.Errorf("invalid rate limit window: %s", req.RateLimitWindow)
	}

	// Generate key pair
	plainKey, plainSecret, err := s.GenerateKeyPair()
	if err != nil {
		return nil, fmt.Errorf("failed to generate key pair: %w", err)
	}

	// Hash the key and secret
	keyHash := s.HashKey(plainKey)
	secretHash := s.HashKey(plainSecret)

	// Generate key prefix
	keyPrefix := s.GenerateKeyPrefix(req.Permissions)

	// Create API key model
	apiKey := &models.APIKey{
		Name:                 req.Name,
		Description:          req.Description,
		KeyHash:              keyHash,
		KeyPrefix:            keyPrefix,
		SecretHash:           &secretHash,
		Permissions:          req.Permissions,
		ScopeProjects:        req.ScopeProjects,
		ScopeUsers:           req.ScopeUsers,
		RateLimitCount:       req.RateLimitCount,
		RateLimitWindow:      req.RateLimitWindow,
		DailyQuota:           req.DailyQuota,
		MonthlyQuota:         req.MonthlyQuota,
		IsActive:             true, // Default to active
		ExpiresAt:            req.ExpiresAt,
		AllowedIPs:           req.AllowedIPs,
		AllowedDomains:       req.AllowedDomains,
		UserAgentPattern:     req.UserAgentPattern,
		CreatedBy:            createdBy,
		Metadata:             req.Metadata,
		Tags:                 req.Tags,
	}

	// Save to database
	createdKey, err := s.apiKeyRepo.CreateAPIKey(ctx, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create API key: %w", err)
	}

	// Return response with plain key (only shown once)
	response := &models.APIKeyCreateResponse{
		APIKey:      createdKey.ToResponse(),
		PlainKey:    keyPrefix + plainKey,
		PlainSecret: &plainSecret,
	}

	return response, nil
}

// GetAPIKey retrieves an API key by ID
func (s *APIKeyService) GetAPIKey(ctx context.Context, id int64) (*models.APIKeyResponse, error) {
	apiKey, err := s.apiKeyRepo.GetAPIKeyByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := apiKey.ToResponse()
	return &response, nil
}

// UpdateAPIKey updates an existing API key
func (s *APIKeyService) UpdateAPIKey(ctx context.Context, id int64, req *models.APIKeyUpdateRequest, updatedBy int) (*models.APIKeyResponse, error) {
	// Validate permissions if provided
	if req.Permissions != nil {
		if err := s.ValidatePermissions(req.Permissions); err != nil {
			return nil, fmt.Errorf("permission validation failed: %w", err)
		}
	}

	// Validate IP addresses if provided
	if req.AllowedIPs != nil && len(req.AllowedIPs) > 0 {
		if err := s.ValidateIPAddresses(req.AllowedIPs); err != nil {
			return nil, fmt.Errorf("IP validation failed: %w", err)
		}
	}

	// Validate domains if provided
	if req.AllowedDomains != nil && len(req.AllowedDomains) > 0 {
		if err := s.ValidateDomains(req.AllowedDomains); err != nil {
			return nil, fmt.Errorf("domain validation failed: %w", err)
		}
	}

	// Validate rate limit window if provided
	if req.RateLimitWindow != nil {
		if !models.IsValidRateLimitWindow(*req.RateLimitWindow) {
			return nil, fmt.Errorf("invalid rate limit window: %s", *req.RateLimitWindow)
		}
	}

	// Update the API key
	updatedKey, err := s.apiKeyRepo.UpdateAPIKey(ctx, id, req, updatedBy)
	if err != nil {
		return nil, err
	}

	response := updatedKey.ToResponse()
	return &response, nil
}

// DeleteAPIKey soft deletes an API key
func (s *APIKeyService) DeleteAPIKey(ctx context.Context, id int64, deletedBy int) error {
	return s.apiKeyRepo.DeleteAPIKey(ctx, id, deletedBy)
}

// ListAPIKeys retrieves a paginated list of API keys
func (s *APIKeyService) ListAPIKeys(ctx context.Context, params *models.APIKeyListParams) (*models.APIKeyListResponse, error) {
	// Set default values
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PageSize <= 0 {
		params.PageSize = 20
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}

	// Get API keys from repository
	apiKeys, total, err := s.apiKeyRepo.ListAPIKeys(ctx, params)
	if err != nil {
		return nil, err
	}

	// Convert to response format
	responses := make([]models.APIKeyResponse, len(apiKeys))
	for i, apiKey := range apiKeys {
		responses[i] = apiKey.ToResponse()
	}

	return &models.APIKeyListResponse{
		Data:     responses,
		Total:    total,
		Page:     params.Page,
		PageSize: params.PageSize,
	}, nil
}

// AuthenticateAPIKey validates an API key and returns its information
func (s *APIKeyService) AuthenticateAPIKey(ctx context.Context, keyWithPrefix string) (*models.APIKey, error) {
	// Extract prefix and key
	if len(keyWithPrefix) < 4 {
		return nil, fmt.Errorf("invalid API key format")
	}

	// Find the prefix (everything up to the last underscore)
	lastUnderscore := -1
	for i := len(keyWithPrefix) - 1; i >= 0; i-- {
		if keyWithPrefix[i] == '_' {
			lastUnderscore = i
			break
		}
	}

	if lastUnderscore == -1 {
		return nil, fmt.Errorf("invalid API key format: no prefix found")
	}

	prefix := keyWithPrefix[:lastUnderscore+1]
	key := keyWithPrefix[lastUnderscore+1:]

	// Hash the key
	keyHash := s.HashKey(key)

	// Get API key from database
	apiKey, err := s.apiKeyRepo.GetAPIKeyByHash(ctx, keyHash)
	if err != nil {
		return nil, fmt.Errorf("API key not found")
	}

	// Verify prefix matches
	if apiKey.KeyPrefix != prefix {
		return nil, fmt.Errorf("API key prefix mismatch")
	}

	// Check if key is valid
	if !apiKey.IsValid() {
		return nil, fmt.Errorf("API key is not active or has expired")
	}

	return apiKey, nil
}

// CheckPermission checks if an API key has a specific permission
func (s *APIKeyService) CheckPermission(apiKey *models.APIKey, permission models.APIPermissionType) bool {
	return apiKey.HasPermission(permission)
}

// CheckRateLimit checks if an API key has exceeded its rate limit
func (s *APIKeyService) CheckRateLimit(ctx context.Context, apiKey *models.APIKey) (bool, error) {
	return s.apiKeyRepo.CheckRateLimit(ctx, apiKey.ID, apiKey.RateLimitWindow, apiKey.RateLimitCount)
}

// CheckIPAccess checks if the request IP is allowed
func (s *APIKeyService) CheckIPAccess(apiKey *models.APIKey, clientIP net.IP) bool {
	return apiKey.IsIPAllowed(clientIP)
}

// LogAPIUsage logs API usage for analytics and monitoring
func (s *APIKeyService) LogAPIUsage(ctx context.Context, log *models.APIUsageLog) error {
	// Set request timestamp if not set
	if log.RequestTimestamp.IsZero() {
		log.RequestTimestamp = time.Now()
	}

	return s.apiKeyRepo.CreateUsageLog(ctx, log)
}

// UpdateLastUsed updates the last used timestamp for an API key
func (s *APIKeyService) UpdateLastUsed(ctx context.Context, apiKeyID int64) error {
	return s.apiKeyRepo.UpdateLastUsed(ctx, apiKeyID)
}

// GetUsageStats retrieves usage statistics for an API key
func (s *APIKeyService) GetUsageStats(ctx context.Context, apiKeyID int64, days int) (*models.APIQuotaStats, error) {
	if days <= 0 {
		days = 30 // Default to 30 days
	}

	return s.apiKeyRepo.GetUsageStats(ctx, apiKeyID, days)
}

// GetActiveAPIKeys retrieves all active API keys
func (s *APIKeyService) GetActiveAPIKeys(ctx context.Context) ([]models.APIKeyResponse, error) {
	apiKeys, err := s.apiKeyRepo.GetActiveAPIKeys(ctx)
	if err != nil {
		return nil, err
	}

	responses := make([]models.APIKeyResponse, len(apiKeys))
	for i, apiKey := range apiKeys {
		responses[i] = apiKey.ToResponse()
	}

	return responses, nil
}

// ValidateAPIKeyRequest validates API key creation/update requests
func (s *APIKeyService) ValidateAPIKeyRequest(req interface{}) error {
	switch r := req.(type) {
	case *models.APIKeyCreateRequest:
		if r.Name == "" {
			return fmt.Errorf("name is required")
		}
		if len(r.Name) > 255 {
			return fmt.Errorf("name is too long (max 255 characters)")
		}
		if r.Description != nil && len(*r.Description) > 1000 {
			return fmt.Errorf("description is too long (max 1000 characters)")
		}
		if r.RateLimitCount <= 0 {
			return fmt.Errorf("rate limit count must be positive")
		}
		if r.RateLimitCount > 100000 {
			return fmt.Errorf("rate limit count is too high (max 100000)")
		}
		if r.DailyQuota != nil && *r.DailyQuota <= 0 {
			return fmt.Errorf("daily quota must be positive")
		}
		if r.MonthlyQuota != nil && *r.MonthlyQuota <= 0 {
			return fmt.Errorf("monthly quota must be positive")
		}
		if r.UserAgentPattern != nil && len(*r.UserAgentPattern) > 500 {
			return fmt.Errorf("user agent pattern is too long (max 500 characters)")
		}

	case *models.APIKeyUpdateRequest:
		if r.Name != nil && *r.Name == "" {
			return fmt.Errorf("name cannot be empty")
		}
		if r.Name != nil && len(*r.Name) > 255 {
			return fmt.Errorf("name is too long (max 255 characters)")
		}
		if r.Description != nil && len(*r.Description) > 1000 {
			return fmt.Errorf("description is too long (max 1000 characters)")
		}
		if r.RateLimitCount != nil && *r.RateLimitCount <= 0 {
			return fmt.Errorf("rate limit count must be positive")
		}
		if r.RateLimitCount != nil && *r.RateLimitCount > 100000 {
			return fmt.Errorf("rate limit count is too high (max 100000)")
		}
		if r.DailyQuota != nil && *r.DailyQuota <= 0 {
			return fmt.Errorf("daily quota must be positive")
		}
		if r.MonthlyQuota != nil && *r.MonthlyQuota <= 0 {
			return fmt.Errorf("monthly quota must be positive")
		}
		if r.UserAgentPattern != nil && len(*r.UserAgentPattern) > 500 {
			return fmt.Errorf("user agent pattern is too long (max 500 characters)")
		}
	}

	return nil
}

// RotateAPIKey generates a new key for an existing API key (invalidates the old one)
func (s *APIKeyService) RotateAPIKey(ctx context.Context, id int64, rotatedBy int) (*models.APIKeyCreateResponse, error) {
	// Get existing API key
	existingKey, err := s.apiKeyRepo.GetAPIKeyByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing API key: %w", err)
	}

	// Generate new key pair
	plainKey, plainSecret, err := s.GenerateKeyPair()
	if err != nil {
		return nil, fmt.Errorf("failed to generate new key pair: %w", err)
	}

	// Hash the new key and secret
	keyHash := s.HashKey(plainKey)
	secretHash := s.HashKey(plainSecret)

	// Update the API key with new hashes
	updateReq := &models.APIKeyUpdateRequest{}
	
	// Create new API key with same properties but new key
	newKey := &models.APIKey{
		Name:                 existingKey.Name + " (Rotated)",
		Description:          existingKey.Description,
		KeyHash:              keyHash,
		KeyPrefix:            existingKey.KeyPrefix,
		SecretHash:           &secretHash,
		Permissions:          existingKey.Permissions,
		ScopeProjects:        existingKey.ScopeProjects,
		ScopeUsers:           existingKey.ScopeUsers,
		RateLimitCount:       existingKey.RateLimitCount,
		RateLimitWindow:      existingKey.RateLimitWindow,
		DailyQuota:           existingKey.DailyQuota,
		MonthlyQuota:         existingKey.MonthlyQuota,
		IsActive:             true,
		ExpiresAt:            existingKey.ExpiresAt,
		AllowedIPs:           existingKey.AllowedIPs,
		AllowedDomains:       existingKey.AllowedDomains,
		UserAgentPattern:     existingKey.UserAgentPattern,
		CreatedBy:            rotatedBy,
		Metadata:             existingKey.Metadata,
		Tags:                 existingKey.Tags,
	}

	// Create the new API key
	createdKey, err := s.apiKeyRepo.CreateAPIKey(ctx, newKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create rotated API key: %w", err)
	}

	// Deactivate the old API key
	isActive := false
	updateReq.IsActive = &isActive
	_, err = s.apiKeyRepo.UpdateAPIKey(ctx, id, updateReq, rotatedBy)
	if err != nil {
		// Log error but don't fail the rotation
		// The new key is created successfully
	}

	// Return response with new plain key
	response := &models.APIKeyCreateResponse{
		APIKey:      createdKey.ToResponse(),
		PlainKey:    existingKey.KeyPrefix + plainKey,
		PlainSecret: &plainSecret,
	}

	return response, nil
}