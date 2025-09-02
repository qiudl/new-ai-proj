package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// APIKeyHandler handles HTTP requests for API key management
type APIKeyHandler struct {
	apiKeyService *services.APIKeyService
	validator     *validator.Validate
}

// NewAPIKeyHandler creates a new API key handler
func NewAPIKeyHandler(db interface{}) *APIKeyHandler {
	apiKeyRepo := database.NewAPIKeyRepository(db)
	apiKeyService := services.NewAPIKeyService(apiKeyRepo)

	return &APIKeyHandler{
		apiKeyService: apiKeyService,
		validator:     validator.New(),
	}
}

// CreateAPIKey creates a new API key
// @Summary Create API key
// @Description Create a new API key with specified permissions and restrictions
// @Tags api-keys
// @Accept json
// @Produce json
// @Param request body models.APIKeyCreateRequest true "API key creation request"
// @Success 201 {object} models.APIKeyCreateResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys [post]
func (h *APIKeyHandler) CreateAPIKey(c *gin.Context) {
	var req models.APIKeyCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"details": err.Error(),
		})
		return
	}

	// Additional business validation
	if err := h.apiKeyService.ValidateAPIKeyRequest(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Request validation failed",
			"details": err.Error(),
		})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	// Create API key
	response, err := h.apiKeyService.CreateAPIKey(c.Request.Context(), &req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create API key",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// GetAPIKey retrieves an API key by ID
// @Summary Get API key
// @Description Get details of a specific API key
// @Tags api-keys
// @Produce json
// @Param id path int true "API key ID"
// @Success 200 {object} models.APIKeyResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/{id} [get]
func (h *APIKeyHandler) GetAPIKey(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid API key ID",
		})
		return
	}

	apiKey, err := h.apiKeyService.GetAPIKey(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "API key not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "API key not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get API key",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, apiKey)
}

// UpdateAPIKey updates an existing API key
// @Summary Update API key
// @Description Update an existing API key's properties
// @Tags api-keys
// @Accept json
// @Produce json
// @Param id path int true "API key ID"
// @Param request body models.APIKeyUpdateRequest true "API key update request"
// @Success 200 {object} models.APIKeyResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/{id} [put]
func (h *APIKeyHandler) UpdateAPIKey(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid API key ID",
		})
		return
	}

	var req models.APIKeyUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"details": err.Error(),
		})
		return
	}

	// Additional business validation
	if err := h.apiKeyService.ValidateAPIKeyRequest(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Request validation failed",
			"details": err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	// Update API key
	response, err := h.apiKeyService.UpdateAPIKey(c.Request.Context(), id, &req, userID.(int))
	if err != nil {
		if err.Error() == "API key not found or already deleted" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "API key not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to update API key",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

// DeleteAPIKey deletes an API key
// @Summary Delete API key
// @Description Soft delete an API key
// @Tags api-keys
// @Param id path int true "API key ID"
// @Success 204
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/{id} [delete]
func (h *APIKeyHandler) DeleteAPIKey(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid API key ID",
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	// Delete API key
	err = h.apiKeyService.DeleteAPIKey(c.Request.Context(), id, userID.(int))
	if err != nil {
		if err.Error() == "API key not found or already deleted" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "API key not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to delete API key",
				"details": err.Error(),
			})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// ListAPIKeys retrieves a paginated list of API keys
// @Summary List API keys
// @Description Get a paginated list of API keys with optional filtering
// @Tags api-keys
// @Produce json
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param search query string false "Search in name and description"
// @Param is_active query bool false "Filter by active status"
// @Param created_by query int false "Filter by creator user ID"
// @Param has_expired query bool false "Filter by expiration status"
// @Param sort_by query string false "Sort by field (name, created_at, last_used_at, usage_count)"
// @Param sort_order query string false "Sort order (asc, desc)"
// @Success 200 {object} models.APIKeyListResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys [get]
func (h *APIKeyHandler) ListAPIKeys(c *gin.Context) {
	params := &models.APIKeyListParams{
		Page:     1,
		PageSize: 20,
	}

	// Parse query parameters
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			params.Page = page
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 && pageSize <= 100 {
			params.PageSize = pageSize
		}
	}

	params.Search = c.Query("search")

	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			params.IsActive = &isActive
		}
	}

	if createdByStr := c.Query("created_by"); createdByStr != "" {
		if createdBy, err := strconv.Atoi(createdByStr); err == nil {
			params.CreatedBy = &createdBy
		}
	}

	if hasExpiredStr := c.Query("has_expired"); hasExpiredStr != "" {
		if hasExpired, err := strconv.ParseBool(hasExpiredStr); err == nil {
			params.HasExpired = &hasExpired
		}
	}

	params.SortBy = c.Query("sort_by")
	params.SortOrder = c.Query("sort_order")

	// Validate parameters
	if err := h.validator.Struct(params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid query parameters",
			"details": err.Error(),
		})
		return
	}

	// Get API keys
	response, err := h.apiKeyService.ListAPIKeys(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list API keys",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetAPIKeyUsageStats retrieves usage statistics for an API key
// @Summary Get API key usage statistics
// @Description Get usage statistics for a specific API key
// @Tags api-keys
// @Produce json
// @Param id path int true "API key ID"
// @Param days query int false "Number of days for statistics (default: 30)"
// @Success 200 {object} models.APIQuotaStats
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/{id}/stats [get]
func (h *APIKeyHandler) GetAPIKeyUsageStats(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid API key ID",
		})
		return
	}

	days := 30 // Default to 30 days
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}

	stats, err := h.apiKeyService.GetUsageStats(c.Request.Context(), id, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get usage statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// RotateAPIKey generates a new key for an existing API key
// @Summary Rotate API key
// @Description Generate a new key for an existing API key (invalidates the old one)
// @Tags api-keys
// @Produce json
// @Param id path int true "API key ID"
// @Success 200 {object} models.APIKeyCreateResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/{id}/rotate [post]
func (h *APIKeyHandler) RotateAPIKey(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid API key ID",
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	// Rotate API key
	response, err := h.apiKeyService.RotateAPIKey(c.Request.Context(), id, userID.(int))
	if err != nil {
		if err.Error() == "failed to get existing API key: API key not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "API key not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to rotate API key",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetActiveAPIKeys retrieves all active API keys
// @Summary Get active API keys
// @Description Get all currently active API keys
// @Tags api-keys
// @Produce json
// @Success 200 {array} models.APIKeyResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/active [get]
func (h *APIKeyHandler) GetActiveAPIKeys(c *gin.Context) {
	apiKeys, err := h.apiKeyService.GetActiveAPIKeys(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get active API keys",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": apiKeys,
	})
}

// ValidateAPIKey validates an API key and returns its information
// @Summary Validate API key
// @Description Validate an API key and return its information
// @Tags api-keys
// @Produce json
// @Param Authorization header string true "API Key (Bearer token)"
// @Success 200 {object} models.APIKeyResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/validate [post]
func (h *APIKeyHandler) ValidateAPIKey(c *gin.Context) {
	// Get API key from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Authorization header is required",
		})
		return
	}

	// Remove "Bearer " prefix if present
	apiKey := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		apiKey = authHeader[7:]
	}

	// Validate API key
	keyInfo, err := h.apiKeyService.AuthenticateAPIKey(c.Request.Context(), apiKey)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Invalid API key",
			"details": err.Error(),
		})
		return
	}

	// Update last used timestamp
	if err := h.apiKeyService.UpdateLastUsed(c.Request.Context(), keyInfo.ID); err != nil {
		// Log error but don't fail the validation
		// The validation is successful even if we can't update the timestamp
	}

	response := keyInfo.ToResponse()
	c.JSON(http.StatusOK, response)
}

// VerifyPermission verifies if an API key has a specific permission
// @Summary Verify API key permission
// @Description Check if an API key has a specific permission
// @Tags api-keys
// @Produce json
// @Param Authorization header string true "API Key (Bearer token)"
// @Param permission query string true "Permission to check"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/verify-permission [post]
func (h *APIKeyHandler) VerifyPermission(c *gin.Context) {
	// Get API key from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Authorization header is required",
		})
		return
	}

	// Get permission parameter
	permissionStr := c.Query("permission")
	if permissionStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Permission parameter is required",
		})
		return
	}

	permission := models.APIPermissionType(permissionStr)
	if !models.IsValidPermission(permission) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid permission",
		})
		return
	}

	// Remove "Bearer " prefix if present
	apiKey := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		apiKey = authHeader[7:]
	}

	// Authenticate API key
	keyInfo, err := h.apiKeyService.AuthenticateAPIKey(c.Request.Context(), apiKey)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Invalid API key",
			"details": err.Error(),
		})
		return
	}

	// Check permission
	hasPermission := h.apiKeyService.CheckPermission(keyInfo, permission)
	if !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{
			"error":      "Insufficient permissions",
			"permission": permission,
			"has_access": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"permission": permission,
		"has_access": true,
		"api_key_id": keyInfo.ID,
	})
}

// GetAPIKeyLogs retrieves usage logs for an API key
// @Summary Get API key usage logs
// @Description Get usage logs for a specific API key
// @Tags api-keys
// @Produce json
// @Param id path int true "API key ID"
// @Param limit query int false "Number of logs to return (default: 100)"
// @Param offset query int false "Offset for pagination (default: 0)"
// @Success 200 {array} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/api-keys/{id}/logs [get]
func (h *APIKeyHandler) GetAPIKeyLogs(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid API key ID",
		})
		return
	}

	// Parse pagination parameters
	limit := 100 // Default limit
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 1000 {
			limit = l
		}
	}

	offset := 0 // Default offset
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// Check if API key exists
	_, err = h.apiKeyService.GetAPIKey(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "API key not found",
		})
		return
	}

	// For now, return mock data since we don't have audit logs table yet
	// In a real implementation, this would query the audit_logs or api_usage_logs table
	mockLogs := []map[string]interface{}{
		{
			"id":              "1",
			"timestamp":       "2025-08-17T15:30:00Z",
			"method":          "GET",
			"endpoint":        "/api/v1/projects",
			"response_status": 200,
			"ip_address":      "192.168.1.100",
			"user_agent":      "MyApp/1.0",
		},
		{
			"id":              "2",
			"timestamp":       "2025-08-17T15:25:00Z",
			"method":          "POST",
			"endpoint":        "/api/v1/tasks",
			"response_status": 201,
			"ip_address":      "192.168.1.100",
			"user_agent":      "MyApp/1.0",
		},
		{
			"id":              "3",
			"timestamp":       "2025-08-17T15:20:00Z",
			"method":          "GET",
			"endpoint":        "/api/v1/tasks/123",
			"response_status": 404,
			"ip_address":      "192.168.1.100",
			"user_agent":      "MyApp/1.0",
		},
	}

	// Apply pagination to mock data
	start := offset
	end := offset + limit
	if start >= len(mockLogs) {
		c.JSON(http.StatusOK, []map[string]interface{}{})
		return
	}
	if end > len(mockLogs) {
		end = len(mockLogs)
	}

	paginatedLogs := mockLogs[start:end]

	c.JSON(http.StatusOK, paginatedLogs)
}
