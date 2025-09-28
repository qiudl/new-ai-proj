package handlers

import (
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"ai-project-backend/services"
)

// DataValidationHandler handles data validation endpoints
type DataValidationHandler struct {
	validator *services.TimerDataValidator
}

// NewDataValidationHandler creates a new data validation handler
func NewDataValidationHandler(validator *services.TimerDataValidator) *DataValidationHandler {
	return &DataValidationHandler{
		validator: validator,
	}
}

// ValidateUserDataRequest represents the request for user data validation
type ValidateUserDataRequest struct {
	UserID int  `json:"user_id,omitempty"`
	Quick  bool `json:"quick,omitempty"`
}

// GetDataValidationReport handles GET /api/v1/data-validation/report
func (h *DataValidationHandler) GetDataValidationReport(c *gin.Context) {
	// Only allow in development environment for full reports
	if !h.isDevelopmentEnvironment() && c.Query("force") != "true" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Data validation reports only available in development environment",
			"message": "数据验证报告仅在开发环境中可用",
		})
		return
	}

	// Get user ID from context or query parameter
	userID, exists := c.Get("user_id")
	if !exists {
		if userIDStr := c.Query("user_id"); userIDStr != "" {
			if id, err := strconv.Atoi(userIDStr); err == nil {
				userID = id
			} else {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid user_id parameter",
					"message": "用户ID参数无效",
				})
				return
			}
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "User not authenticated",
				"message": "用户未认证",
			})
			return
		}
	}

	// Check if quick validation is requested
	quick := c.Query("quick") == "true"

	if quick {
		// Perform quick validation
		result, err := h.validator.QuickValidation(c.Request.Context(), userID.(int))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Quick validation failed",
				"message": "快速验证失败",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"type":    "quick_validation",
			"result":  result,
			"message": "快速验证完成",
		})
		return
	}

	// Perform comprehensive validation
	report, err := h.validator.ValidateUserTimerData(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Data validation failed",
			"message": "数据验证失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"type":    "comprehensive_validation",
		"report":  report,
		"message": "数据验证报告生成成功",
	})
}

// GetValidationStatus handles GET /api/v1/data-validation/status
func (h *DataValidationHandler) GetValidationStatus(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "用户未认证",
		})
		return
	}

	// Perform quick validation for status
	result, err := h.validator.QuickValidation(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Status check failed",
			"message": "状态检查失败",
			"details": err.Error(),
		})
		return
	}

	// Return simplified status
	status := map[string]interface{}{
		"status":           result.Status,
		"message":          result.Message,
		"severity":         result.Severity,
		"last_checked":     result.Timestamp,
		"data_available":   result.Details["recent_sessions"].(int) > 0,
		"efficiency_ready": result.Details["valid_sessions"].(int) >= 2,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"status":  status,
		"message": "数据状态获取成功",
	})
}

// RunDataValidation handles POST /api/v1/data-validation/run
func (h *DataValidationHandler) RunDataValidation(c *gin.Context) {
	// Only allow in development environment
	if !h.isDevelopmentEnvironment() {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Data validation only available in development environment",
			"message": "数据验证功能仅在开发环境中可用",
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "用户未认证",
		})
		return
	}

	var req ValidateUserDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// Use authenticated user's ID if not specified
	targetUserID := userID.(int)
	if req.UserID != 0 {
		targetUserID = req.UserID
	}

	if req.Quick {
		// Quick validation
		result, err := h.validator.QuickValidation(c.Request.Context(), targetUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Quick validation failed",
				"message": "快速验证失败",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"type":    "quick",
			"result":  result,
			"message": "快速验证完成",
		})
	} else {
		// Comprehensive validation
		report, err := h.validator.ValidateUserTimerData(c.Request.Context(), targetUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Comprehensive validation failed",
				"message": "全面验证失败",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"type":    "comprehensive",
			"report":  report,
			"message": "全面验证完成",
		})
	}
}

// GetValidationSummary handles GET /api/v1/data-validation/summary
func (h *DataValidationHandler) GetValidationSummary(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "用户未认证",
		})
		return
	}

	// Get comprehensive validation report
	report, err := h.validator.ValidateUserTimerData(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Validation summary failed",
			"message": "验证摘要生成失败",
			"details": err.Error(),
		})
		return
	}

	// Return only summary information
	summary := map[string]interface{}{
		"overall_score":       report.OverallScore,
		"overall_status":      report.OverallStatus,
		"total_checks":        report.TotalChecks,
		"passed_checks":       report.PassedChecks,
		"warning_checks":      report.WarningChecks,
		"error_checks":        report.ErrorChecks,
		"data_quality_score":  report.Summary.DataQualityScore,
		"efficiency_ready":    report.Summary.EfficiencyCalculatable,
		"recommended_actions": report.Summary.RecommendedActions,
		"last_updated":        report.GeneratedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"summary": summary,
		"message": "验证摘要获取成功",
	})
}

// GetHealthMetrics handles GET /api/v1/data-validation/health
func (h *DataValidationHandler) GetHealthMetrics(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "用户未认证",
		})
		return
	}

	// Quick health check
	result, err := h.validator.QuickValidation(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Health check failed",
			"message": "健康检查失败",
			"details": err.Error(),
		})
		return
	}

	// Build health metrics
	health := map[string]interface{}{
		"status":               result.Status,
		"score":                calculateHealthScore(result),
		"recent_sessions":      result.Details["recent_sessions"],
		"active_days":          result.Details["active_days"],
		"valid_sessions":       result.Details["valid_sessions"],
		"efficiency_available": result.Details["valid_sessions"].(int) >= 2,
		"last_checked":         result.Timestamp,
		"recommendations":      generateHealthRecommendations(result),
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"health":  health,
		"message": "健康指标获取成功",
	})
}

// calculateHealthScore calculates a health score from validation result
func calculateHealthScore(result *services.ValidationResult) float64 {
	recentSessions := result.Details["recent_sessions"].(int)
	activeDays := result.Details["active_days"].(int)
	validSessions := result.Details["valid_sessions"].(int)

	score := 0.0

	// Base score from status
	switch result.Status {
	case "pass":
		score += 70
	case "warning":
		score += 40
	case "error":
		score += 10
	}

	// Bonus points for activity
	if recentSessions >= 10 {
		score += 15
	} else if recentSessions >= 5 {
		score += 10
	} else if recentSessions >= 1 {
		score += 5
	}

	if activeDays >= 5 {
		score += 10
	} else if activeDays >= 3 {
		score += 7
	} else if activeDays >= 1 {
		score += 3
	}

	if validSessions >= 5 {
		score += 5
	} else if validSessions >= 2 {
		score += 3
	}

	if score > 100 {
		score = 100
	}

	return score
}

// generateHealthRecommendations generates health recommendations
func generateHealthRecommendations(result *services.ValidationResult) []string {
	recommendations := make([]string, 0)

	recentSessions := result.Details["recent_sessions"].(int)
	activeDays := result.Details["active_days"].(int)
	validSessions := result.Details["valid_sessions"].(int)

	if recentSessions < 3 {
		recommendations = append(recommendations, "建议增加计时记录的数量")
	}

	if activeDays < 2 {
		recommendations = append(recommendations, "建议提高使用频率，保持连续记录")
	}

	if validSessions < 2 {
		recommendations = append(recommendations, "建议完成更多有效的计时会话")
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, "数据状态良好，继续保持")
	}

	return recommendations
}

// isDevelopmentEnvironment checks if we're in development environment
func (h *DataValidationHandler) isDevelopmentEnvironment() bool {
	env := os.Getenv("APP_ENV")
	return env == "development" || env == "dev" || env == "local"
}