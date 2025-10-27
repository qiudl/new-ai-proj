package handlers

import (
	"ai-project-backend/middleware"
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// PermissionMonitoringHandler handles permission monitoring and analytics
type PermissionMonitoringHandler struct {
	permissionManager *middleware.UnifiedPermissionManager
	predictor         *middleware.PermissionPredictor
	cacheMiddleware   *middleware.PermissionCacheMiddleware
}

// NewPermissionMonitoringHandler creates a new permission monitoring handler
func NewPermissionMonitoringHandler(
	permissionManager *middleware.UnifiedPermissionManager,
	predictor *middleware.PermissionPredictor,
	cacheMiddleware *middleware.PermissionCacheMiddleware,
) *PermissionMonitoringHandler {
	return &PermissionMonitoringHandler{
		permissionManager: permissionManager,
		predictor:         predictor,
		cacheMiddleware:   cacheMiddleware,
	}
}

// GetPermissionStats returns overall permission system statistics
func (h *PermissionMonitoringHandler) GetPermissionStats(c *gin.Context) {
	ctx := c.Request.Context()

	// Get manager stats
	managerStats, err := h.permissionManager.GetManagerStats(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get permission manager stats",
			"details": err.Error(),
		})
		return
	}

	// Get predictor stats
	predictorStats := h.predictor.GetPredictorStats()

	// Get cache optimization recommendations
	cacheOptimizations := h.predictor.OptimizeCacheStrategy(ctx)

	// Get most used permissions
	mostUsedPermissions := h.predictor.GetMostUsedPermissions()

	response := gin.H{
		"timestamp":             time.Now(),
		"manager_stats":         managerStats,
		"predictor_stats":       predictorStats,
		"cache_optimizations":   cacheOptimizations,
		"most_used_permissions": mostUsedPermissions[:min(len(mostUsedPermissions), 10)],
	}

	c.JSON(http.StatusOK, response)
}

// CheckUserPermission checks a single permission for a user
func (h *PermissionMonitoringHandler) CheckUserPermission(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from path parameter
	userIDStr := c.Param("user_id")
	companyUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get permission code from query parameter
	permissionCode := c.Query("permission_code")
	if permissionCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Permission code is required",
		})
		return
	}

	// Get optional resource ID
	var resourceID *int
	if resourceIDStr := c.Query("resource_id"); resourceIDStr != "" {
		if id, err := strconv.Atoi(resourceIDStr); err == nil {
			resourceID = &id
		}
	}

	// Create permission check request
	request := &middleware.PermissionCheckRequest{
		CompanyUserID:   companyUserID,
		PermissionCode:  permissionCode,
		ResourceID:      resourceID,
		ResourceType:    c.Query("resource_type"),
		EnableOverrides: true,
	}

	// Check permission
	response, err := h.permissionManager.CheckPermission(ctx, request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Permission check failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CheckBatchPermissions checks multiple permissions for a user
func (h *PermissionMonitoringHandler) CheckBatchPermissions(c *gin.Context) {
	ctx := c.Request.Context()

	var request middleware.BatchPermissionRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if request.CompanyUserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Company user ID is required",
		})
		return
	}

	if len(request.Permissions) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least one permission must be specified",
		})
		return
	}

	// Check batch permissions
	response, err := h.permissionManager.CheckBatchPermissions(ctx, &request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Batch permission check failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetUserPermissionProfile returns a user's permission profile with predictions
func (h *PermissionMonitoringHandler) GetUserPermissionProfile(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from path parameter
	userIDStr := c.Param("user_id")
	companyUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get user permission profile
	profile, err := h.predictor.GetUserPermissionProfile(ctx, companyUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user permission profile",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// GetPermissionRecommendations returns permission recommendations for a user
func (h *PermissionMonitoringHandler) GetPermissionRecommendations(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from path parameter
	userIDStr := c.Param("user_id")
	companyUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get recommendations
	recommendations, err := h.predictor.GetPermissionRecommendations(ctx, companyUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get permission recommendations",
			"details": err.Error(),
		})
		return
	}

	response := gin.H{
		"user_id":         companyUserID,
		"recommendations": recommendations,
		"generated_at":    time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// PrewarmUserCache preloads predicted permissions for a user into cache
func (h *PermissionMonitoringHandler) PrewarmUserCache(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from path parameter
	userIDStr := c.Param("user_id")
	companyUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Prewarm cache
	err = h.predictor.PrewarmPermissionCache(ctx, h.cacheMiddleware, companyUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to prewarm user cache",
			"details": err.Error(),
		})
		return
	}

	response := gin.H{
		"message":      "Cache prewarming completed",
		"user_id":      companyUserID,
		"prewarmed_at": time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// InvalidateUserCache invalidates cached permissions for a user
func (h *PermissionMonitoringHandler) InvalidateUserCache(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from path parameter
	userIDStr := c.Param("user_id")
	companyUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Invalidate cache
	err = h.permissionManager.InvalidateUserCache(ctx, companyUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to invalidate user cache",
			"details": err.Error(),
		})
		return
	}

	response := gin.H{
		"message":        "User cache invalidated",
		"user_id":        companyUserID,
		"invalidated_at": time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// GetCacheStats returns cache statistics and health
func (h *PermissionMonitoringHandler) GetCacheStats(c *gin.Context) {
	ctx := c.Request.Context()

	if h.cacheMiddleware == nil {
		c.JSON(http.StatusOK, gin.H{
			"cache_enabled": false,
			"message":       "Cache is not enabled",
		})
		return
	}

	// Get cache stats
	cacheStats, err := h.cacheMiddleware.GetCacheStats(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get cache stats",
			"details": err.Error(),
		})
		return
	}

	response := gin.H{
		"cache_enabled": true,
		"stats":         cacheStats,
		"retrieved_at":  time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// ValidatePredictionAccuracy validates prediction accuracy for a user
func (h *PermissionMonitoringHandler) ValidatePredictionAccuracy(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from path parameter
	userIDStr := c.Param("user_id")
	companyUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get actual permissions from request body
	var request struct {
		ActualPermissions []string `json:"actual_permissions" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate prediction accuracy
	accuracy := h.predictor.ValidatePredictionAccuracy(ctx, companyUserID, request.ActualPermissions)

	response := gin.H{
		"user_id":                  companyUserID,
		"accuracy_score":           accuracy,
		"actual_permissions_count": len(request.ActualPermissions),
		"validated_at":             time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// GetPermissionAnalytics returns detailed permission usage analytics
func (h *PermissionMonitoringHandler) GetPermissionAnalytics(c *gin.Context) {
	ctx := c.Request.Context()

	// Get analytics period from query parameter
	period := c.DefaultQuery("period", "7d") // Default to 7 days

	// Get most used permissions
	mostUsed := h.predictor.GetMostUsedPermissions()

	// Get cache optimization recommendations
	cacheOptimizations := h.predictor.OptimizeCacheStrategy(ctx)

	// Get manager statistics
	managerStats, err := h.permissionManager.GetManagerStats(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get manager stats",
			"details": err.Error(),
		})
		return
	}

	response := gin.H{
		"period": period,
		"analytics": gin.H{
			"most_used_permissions": mostUsed,
			"cache_optimization":    cacheOptimizations,
			"system_performance":    managerStats,
			"total_permissions":     len(mostUsed),
		},
		"generated_at": time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// TestPermissionMiddleware tests permission middleware configuration
func (h *PermissionMonitoringHandler) TestPermissionMiddleware(c *gin.Context) {
	// This endpoint can be used to test various permission scenarios
	var request struct {
		CompanyUserID   int                    `json:"company_user_id" binding:"required"`
		TestScenarios   []TestScenario         `json:"test_scenarios" binding:"required"`
		ResourceContext map[string]interface{} `json:"resource_context,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	ctx := c.Request.Context()
	results := make([]TestResult, 0)

	// Run test scenarios
	for _, scenario := range request.TestScenarios {
		result := h.runTestScenario(ctx, request.CompanyUserID, scenario)
		results = append(results, result)
	}

	response := gin.H{
		"user_id":      request.CompanyUserID,
		"test_results": results,
		"tested_at":    time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// TestScenario represents a permission test scenario
type TestScenario struct {
	Name           string `json:"name"`
	PermissionCode string `json:"permission_code"`
	ResourceID     *int   `json:"resource_id,omitempty"`
	ResourceType   string `json:"resource_type,omitempty"`
	ExpectedResult bool   `json:"expected_result"`
}

// TestResult represents the result of a permission test
type TestResult struct {
	Scenario     TestScenario  `json:"scenario"`
	ActualResult bool          `json:"actual_result"`
	Passed       bool          `json:"passed"`
	ResponseTime time.Duration `json:"response_time"`
	Source       string        `json:"source"`
	Reason       string        `json:"reason"`
	Error        string        `json:"error,omitempty"`
}

// runTestScenario runs a single test scenario
func (h *PermissionMonitoringHandler) runTestScenario(ctx context.Context, companyUserID int, scenario TestScenario) TestResult {
	startTime := time.Now()

	request := &middleware.PermissionCheckRequest{
		CompanyUserID:   companyUserID,
		PermissionCode:  scenario.PermissionCode,
		ResourceID:      scenario.ResourceID,
		ResourceType:    scenario.ResourceType,
		EnableOverrides: true,
	}

	response, err := h.permissionManager.CheckPermission(ctx, request)
	responseTime := time.Since(startTime)

	result := TestResult{
		Scenario:     scenario,
		ResponseTime: responseTime,
	}

	if err != nil {
		result.Error = err.Error()
		result.ActualResult = false
	} else {
		result.ActualResult = response.HasPermission
		result.Source = response.Source
		result.Reason = response.Reason
	}

	result.Passed = (result.ActualResult == scenario.ExpectedResult) && (err == nil)

	return result
}

// GetPermissionHealth returns health check information for the permission system
func (h *PermissionMonitoringHandler) GetPermissionHealth(c *gin.Context) {
	ctx := c.Request.Context()
	health := gin.H{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"components": gin.H{},
	}

	// Check manager health
	managerStats, err := h.permissionManager.GetManagerStats(ctx)
	if err != nil {
		health["components"].(gin.H)["manager"] = gin.H{
			"status": "unhealthy",
			"error":  err.Error(),
		}
		health["status"] = "degraded"
	} else {
		health["components"].(gin.H)["manager"] = gin.H{
			"status": "healthy",
			"stats":  managerStats,
		}
	}

	// Check cache health
	if h.cacheMiddleware != nil {
		cacheStats, err := h.cacheMiddleware.GetCacheStats(ctx)
		if err != nil {
			health["components"].(gin.H)["cache"] = gin.H{
				"status": "unhealthy",
				"error":  err.Error(),
			}
			health["status"] = "degraded"
		} else {
			health["components"].(gin.H)["cache"] = gin.H{
				"status": "healthy",
				"stats":  cacheStats,
			}
		}
	} else {
		health["components"].(gin.H)["cache"] = gin.H{
			"status": "disabled",
		}
	}

	// Check predictor health
	predictorStats := h.predictor.GetPredictorStats()
	health["components"].(gin.H)["predictor"] = gin.H{
		"status": "healthy",
		"stats":  predictorStats,
	}

	// Set overall status
	if health["status"] == "healthy" {
		c.JSON(http.StatusOK, health)
	} else {
		c.JSON(http.StatusServiceUnavailable, health)
	}
}

// min helper function is defined in ai_task_generator_handler.go
