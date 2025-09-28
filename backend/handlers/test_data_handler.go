package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/services"
)

// TestDataHandler handles test data generation endpoints
type TestDataHandler struct {
	generator *services.TestDataGeneratorService
}

// NewTestDataHandler creates a new test data handler
func NewTestDataHandler(generator *services.TestDataGeneratorService) *TestDataHandler {
	return &TestDataHandler{
		generator: generator,
	}
}

// GenerateTimerDataRequest represents the request to generate timer data
type GenerateTimerDataRequest struct {
	StartDate      string   `json:"start_date" binding:"required"`
	EndDate        string   `json:"end_date" binding:"required"`
	WorkPattern    string   `json:"work_pattern"`
	DryRun         bool     `json:"dry_run"`
	TaskCategories []string `json:"task_categories"`
}

// GenerateTimerDataResponse represents the response from timer data generation
type GenerateTimerDataResponse struct {
	Success         bool                   `json:"success"`
	TasksCreated    int                    `json:"tasks_created"`
	SessionsCreated int                    `json:"sessions_created"`
	DateRange       string                 `json:"date_range"`
	WorkPattern     string                 `json:"work_pattern"`
	TotalHours      float64                `json:"total_hours"`
	Metadata        map[string]interface{} `json:"metadata"`
	Message         string                 `json:"message"`
}

// GenerateTimerData handles POST /api/v1/test-data/timer
func (h *TestDataHandler) GenerateTimerData(c *gin.Context) {
	// Only allow in development environment
	if !h.isDevelopmentEnvironment() {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Test data generation only available in development environment",
			"message": "此功能仅在开发环境中可用",
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

	var req GenerateTimerDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid start date format",
			"message": "开始日期格式无效，请使用 YYYY-MM-DD 格式",
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid end date format",
			"message": "结束日期格式无效，请使用 YYYY-MM-DD 格式",
		})
		return
	}

	// Default work pattern if not specified
	if req.WorkPattern == "" {
		req.WorkPattern = "balanced_worker"
	}

	// Create generator config
	config := services.GeneratorConfig{
		StartDate:      startDate,
		EndDate:        endDate,
		UserID:         userID.(int),
		WorkPattern:    req.WorkPattern,
		DryRun:         req.DryRun,
		TaskCategories: req.TaskCategories,
	}

	// Generate test data
	result, err := h.generator.GenerateTimerData(c.Request.Context(), config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate test data",
			"message": "生成测试数据失败",
			"details": err.Error(),
		})
		return
	}

	// Build response message
	message := "测试数据生成成功"
	if req.DryRun {
		message = "测试数据预览生成成功（未实际保存）"
	}

	c.JSON(http.StatusOK, GenerateTimerDataResponse{
		Success:         true,
		TasksCreated:    result.TasksCreated,
		SessionsCreated: result.SessionsCreated,
		DateRange:       result.DateRange,
		WorkPattern:     result.WorkPattern,
		TotalHours:      result.TotalHours,
		Metadata:        result.Metadata,
		Message:         message,
	})
}

// GetWorkPatterns handles GET /api/v1/test-data/work-patterns
func (h *TestDataHandler) GetWorkPatterns(c *gin.Context) {
	if !h.isDevelopmentEnvironment() {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Test data features only available in development environment",
			"message": "此功能仅在开发环境中可用",
		})
		return
	}

	patterns := h.generator.GetAvailablePatterns()
	
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"patterns": patterns,
		"message":  "工作模式列表获取成功",
	})
}

// GetTaskTemplates handles GET /api/v1/test-data/task-templates
func (h *TestDataHandler) GetTaskTemplates(c *gin.Context) {
	if !h.isDevelopmentEnvironment() {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Test data features only available in development environment",
			"message": "此功能仅在开发环境中可用",
		})
		return
	}

	templates := h.generator.GetTaskTemplates()
	
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"templates": templates,
		"message":   "任务模板列表获取成功",
	})
}

// CleanupTestDataRequest represents the cleanup request
type CleanupTestDataRequest struct {
	OlderThanDays int  `json:"older_than_days" binding:"required,min=1"`
	Confirm       bool `json:"confirm" binding:"required"`
}

// CleanupTestData handles POST /api/v1/test-data/cleanup
func (h *TestDataHandler) CleanupTestData(c *gin.Context) {
	if !h.isDevelopmentEnvironment() {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Test data features only available in development environment",
			"message": "此功能仅在开发环境中可用",
		})
		return
	}

	var req CleanupTestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	if !req.Confirm {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Cleanup not confirmed",
			"message": "请确认删除操作",
		})
		return
	}

	err := h.generator.CleanupTestData(c.Request.Context(), req.OlderThanDays)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to cleanup test data",
			"message": "清理测试数据失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("已清理 %d 天前的测试数据", req.OlderThanDays),
	})
}

// GetGenerationStatus handles GET /api/v1/test-data/status
func (h *TestDataHandler) GetGenerationStatus(c *gin.Context) {
	if !h.isDevelopmentEnvironment() {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Test data features only available in development environment",
			"message": "此功能仅在开发环境中可用",
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

	// Get test data statistics from database
	stats, err := h.getTestDataStats(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get test data statistics",
			"message": "获取测试数据统计失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
		"message": "测试数据状态获取成功",
	})
}

// TestDataStats represents test data statistics
type TestDataStats struct {
	TotalTimerSessions int                    `json:"total_timer_sessions"`
	TotalHours         float64                `json:"total_hours"`
	DateRange          string                 `json:"date_range"`
	LastGenerated      *time.Time             `json:"last_generated,omitempty"`
	SessionsByPattern  map[string]int         `json:"sessions_by_pattern"`
	DailyBreakdown     []DailyStats           `json:"daily_breakdown"`
}

// DailyStats represents daily statistics
type DailyStats struct {
	Date     string  `json:"date"`
	Sessions int     `json:"sessions"`
	Hours    float64 `json:"hours"`
}

// getTestDataStats retrieves test data statistics for a user
func (h *TestDataHandler) getTestDataStats(ctx context.Context, userID int) (*TestDataStats, error) {
	// This is a simplified implementation
	// In a real implementation, you would query the database for actual statistics
	
	stats := &TestDataStats{
		TotalTimerSessions: 0,
		TotalHours:         0,
		DateRange:          "No test data",
		SessionsByPattern:  make(map[string]int),
		DailyBreakdown:     make([]DailyStats, 0),
	}

	// Query test data from database (identify test data by description pattern)
	rows, err := h.generator.GetDB().QueryContext(ctx, `
		SELECT 
			COUNT(*) as session_count,
			COALESCE(SUM(duration_seconds), 0) / 3600.0 as total_hours,
			MIN(start_time) as earliest_date,
			MAX(start_time) as latest_date,
			MAX(created_at) as last_generated
		FROM unified_timer_logs 
		WHERE user_id = $1 AND target_title LIKE '工作于:%'
	`, userID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if rows.Next() {
		var sessionCount int
		var totalHours float64
		var earliestDate, latestDate, lastGenerated sql.NullTime
		
		err := rows.Scan(&sessionCount, &totalHours, &earliestDate, &latestDate, &lastGenerated)
		if err != nil {
			return nil, err
		}

		stats.TotalTimerSessions = sessionCount
		stats.TotalHours = totalHours
		
		if earliestDate.Valid && latestDate.Valid {
			stats.DateRange = fmt.Sprintf("%s to %s", 
				earliestDate.Time.Format("2006-01-02"),
				latestDate.Time.Format("2006-01-02"))
		}
		
		if lastGenerated.Valid {
			stats.LastGenerated = &lastGenerated.Time
		}
	}

	return stats, nil
}

// isDevelopmentEnvironment checks if we're in development environment
func (h *TestDataHandler) isDevelopmentEnvironment() bool {
	env := os.Getenv("APP_ENV")
	return env == "development" || env == "dev" || env == "local"
}

// Quick generate endpoint for common scenarios
type QuickGenerateRequest struct {
	Days        int    `json:"days" binding:"required,min=1,max=30"`
	WorkPattern string `json:"work_pattern"`
}

// QuickGenerate handles POST /api/v1/test-data/quick-generate
func (h *TestDataHandler) QuickGenerate(c *gin.Context) {
	if !h.isDevelopmentEnvironment() {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Test data generation only available in development environment",
			"message": "此功能仅在开发环境中可用",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "User not authenticated",
			"message": "用户未认证",
		})
		return
	}

	var req QuickGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// Default work pattern
	if req.WorkPattern == "" {
		req.WorkPattern = "balanced_worker"
	}

	// Generate dates (ending today, going back N days)
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -req.Days)

	config := services.GeneratorConfig{
		StartDate:      startDate,
		EndDate:        endDate,
		UserID:         userID.(int),
		WorkPattern:    req.WorkPattern,
		DryRun:         false,
		TaskCategories: []string{}, // Use all categories
	}

	result, err := h.generator.GenerateTimerData(c.Request.Context(), config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate test data",
			"message": "生成测试数据失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"tasks_created":    result.TasksCreated,
		"sessions_created": result.SessionsCreated,
		"total_hours":      result.TotalHours,
		"work_pattern":     result.WorkPattern,
		"message":          "快速生成测试数据成功",
	})
}