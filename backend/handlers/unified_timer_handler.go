package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/services"
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// UnifiedTimerHandler provides unified timer operations for both personal and project tasks
type UnifiedTimerHandler struct {
	db           database.DB
	timerService services.UnifiedTimerService
	sseManager   *SSEManager
}

// UserTimerPreferences minimal struct for response
type UserTimerPreferences struct {
	DefaultCategory       string  `json:"default_category"`
	AutoPauseOnIdle       *bool   `json:"auto_pause_on_idle,omitempty"`
	PomodoroWorkMinutes   *int    `json:"pomodoro_work_minutes,omitempty"`
	NotificationEnabled   *bool   `json:"notification_enabled,omitempty"`
	PreferredTimerView    *string `json:"preferred_timer_view,omitempty"`
	ShowProgressBar       *bool   `json:"show_progress_bar,omitempty"`
	EnableAutoInference   *bool   `json:"enable_auto_inference,omitempty"`
	AutoStopOthersDefault *bool   `json:"auto_stop_others_default,omitempty"`
}

// NewUnifiedTimerHandler creates a new UnifiedTimerHandler
func NewUnifiedTimerHandler(db database.DB) *UnifiedTimerHandler {
	// Get database connection
	sqlDB := db.GetDB().(*sql.DB)

	// Create dependencies
	typeInferenceEngine := services.NewTypeInferenceEngine(sqlDB)
	// notificationService := services.NewNotificationService() // Temporarily disabled

	return &UnifiedTimerHandler{
		db:           db,
		timerService: services.NewUnifiedTimerService(sqlDB, typeInferenceEngine),
		sseManager:   NewSSEManager(),
	}
}

// validateJWTToken validates a JWT token and returns the user ID
func (h *UnifiedTimerHandler) validateJWTToken(tokenString string) (int, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return 0, fmt.Errorf("JWT_SECRET not configured")
	}

	// Parse and validate token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return 0, fmt.Errorf("invalid token: %v", err)
	}

	// Extract claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Get user ID from claims
		if userID, exists := claims["user_id"]; exists {
			if uid, ok := userID.(float64); ok {
				return int(uid), nil
			}
		}
		return 0, fmt.Errorf("user_id not found in token claims")
	}

	return 0, fmt.Errorf("invalid token claims")
}

// StartTimer handles POST /api/v1/user/timer/start
// Unified endpoint for starting both personal and project timers
func (h *UnifiedTimerHandler) StartTimer(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req services.UnifiedStartTimerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Set user ID in request
	req.UserID = userID.(int)

	// Validate task ID if provided
	if req.TaskID != nil && *req.TaskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid task ID",
			"details": "task_id must be a positive integer",
		})
		return
	}

	// If auto_stop_others not provided, read from user preferences
	if req.AutoStopOthers == nil {
		if pref, ok := h.getAutoStopOthersDefault(c.Request.Context(), req.UserID); ok {
			req.AutoStopOthers = &pref
		}
	}

	ctx := c.Request.Context()

	response, err := h.timerService.StartTimer(ctx, &req)
	if err != nil {
		// Handle specific error types
		if err.Error() == "no timer is currently running" {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "Timer conflict",
				"message": err.Error(),
			})
			return
		}
		if err.Error() == "another timer is already running" {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "Timer conflict",
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to start timer",
			"details": err.Error(),
		})
		return
	}

	// 返回标准的ApiResponse格式以兼容Android端
	c.JSON(http.StatusOK, gin.H{
		"success": response.Success,
		"data":    response.Data, // Data字段现在包含完整的TimerStatus对象
		"message": response.Message,
	})
}

// StopTimer handles POST /api/v1/user/timer/stop
// Unified endpoint for stopping any running timer
func (h *UnifiedTimerHandler) StopTimer(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	response, err := h.timerService.StopTimer(ctx, uid, "User requested stop")
	if err != nil {
		// Check for "no active timer" error (matches service layer error message)
		errMsg := err.Error()
		if strings.Contains(errMsg, "no active timer found") || errMsg == "no timer is currently running" {
			// Return success response with informative message instead of error
			c.JSON(http.StatusOK, gin.H{
				"success":  true,
				"message":  "没有运行中的计时器，无需停止",
				"timer_id": 0,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to stop timer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetCurrentTimer handles GET /api/v1/user/timer/current
// Returns current timer status
func (h *UnifiedTimerHandler) GetCurrentTimer(c *gin.Context) {
	// 添加CORS头部

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	timerStatus, err := h.timerService.GetCurrentTimer(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get current timer",
			"details": err.Error(),
		})
		return
	}

	// 返回标准的ApiResponse格式
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    timerStatus, // 可能为nil表示无活动计时器
	})
}

// GetActiveTimers handles GET /api/v1/user/timer/active
// Returns all active (running/paused) timers for the user
func (h *UnifiedTimerHandler) GetActiveTimers(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	ctx := c.Request.Context()
	uid := userID.(int)
	timers, err := h.timerService.GetActiveTimers(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active timers", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"timers": timers, "total": len(timers)})
}

// PauseTimerByID handles POST /api/v1/user/timer/:id/pause
func (h *UnifiedTimerHandler) PauseTimerByID(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(int)
	idStr := c.Param("id")
	var timerID int
	if _, err := fmt.Sscanf(idStr, "%d", &timerID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid timer id"})
		return
	}
	ctx := c.Request.Context()
	resp, err := h.timerService.PauseTimerByID(ctx, uid, timerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to pause timer", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ResumeTimerByID handles POST /api/v1/user/timer/:id/resume
func (h *UnifiedTimerHandler) ResumeTimerByID(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(int)
	idStr := c.Param("id")
	var timerID int
	if _, err := fmt.Sscanf(idStr, "%d", &timerID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid timer id"})
		return
	}
	ctx := c.Request.Context()
	resp, err := h.timerService.ResumeTimerByID(ctx, uid, timerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to resume timer", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// StopTimerByID handles POST /api/v1/user/timer/:id/stop
func (h *UnifiedTimerHandler) StopTimerByID(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(int)
	idStr := c.Param("id")
	var timerID int
	if _, err := fmt.Sscanf(idStr, "%d", &timerID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid timer id"})
		return
	}
	ctx := c.Request.Context()
	resp, err := h.timerService.StopTimerByID(ctx, uid, timerID, "User requested stop")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to stop timer", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// PauseTimer handles POST /api/v1/user/timer/pause
// Pauses the current running timer
func (h *UnifiedTimerHandler) PauseTimer(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	response, err := h.timerService.PauseTimer(ctx, uid)
	if err != nil {
		if err.Error() == "no timer is currently running" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "No active timer",
				"message": "No timer is currently running to pause",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to pause timer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ResumeTimer handles POST /api/v1/user/timer/resume
// Resumes a paused timer
func (h *UnifiedTimerHandler) ResumeTimer(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	response, err := h.timerService.ResumeTimer(ctx, uid)
	if err != nil {
		if err.Error() == "no timer is currently paused" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "No paused timer",
				"message": "No timer is currently paused to resume",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to resume timer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetUserTimerPreferences handles GET /api/v1/user/timer/preferences
func (h *UnifiedTimerHandler) GetUserTimerPreferences(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(int)
	ctx := c.Request.Context()

	sqlDB := h.db.GetDB().(*sql.DB)
	var prefs UserTimerPreferences
	prefs.DefaultCategory = "工作"
	var autoStop *bool
	// Read existing preferences if any
	row := sqlDB.QueryRowContext(ctx, `
		SELECT default_category,
		       auto_pause_on_idle,
		       pomodoro_work_minutes,
		       notification_enabled,
		       preferred_timer_view,
		       show_progress_bar,
		       enable_auto_inference,
		       auto_stop_others_default
		FROM user_timer_preferences WHERE user_id = $1`, uid)
	var preferredView sql.NullString
	var autoPause, notif, showBar, autoInfer sql.NullBool
	var pomodoro sql.NullInt64
	var autoStopVal sql.NullBool
	if err := row.Scan(&prefs.DefaultCategory, &autoPause, &pomodoro, &notif, &preferredView, &showBar, &autoInfer, &autoStopVal); err == nil {
		if autoPause.Valid {
			prefs.AutoPauseOnIdle = &autoPause.Bool
		}
		if pomodoro.Valid {
			v := int(pomodoro.Int64)
			prefs.PomodoroWorkMinutes = &v
		}
		if notif.Valid {
			prefs.NotificationEnabled = &notif.Bool
		}
		if preferredView.Valid {
			v := preferredView.String
			prefs.PreferredTimerView = &v
		}
		if showBar.Valid {
			prefs.ShowProgressBar = &showBar.Bool
		}
		if autoInfer.Valid {
			prefs.EnableAutoInference = &autoInfer.Bool
		}
		if autoStopVal.Valid {
			v := autoStopVal.Bool
			autoStop = &v
		}
	} else {
		// No row, use defaults
		defaultFalse := false
		autoStop = &defaultFalse
	}
	prefs.AutoStopOthersDefault = autoStop
	c.JSON(http.StatusOK, prefs)
}

// UpdateUserTimerPreferences handles PUT /api/v1/user/timer/preferences
func (h *UnifiedTimerHandler) UpdateUserTimerPreferences(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(int)
	ctx := c.Request.Context()

	var req UserTimerPreferences
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	// Upsert minimal set of fields
	_, err := sqlDB.ExecContext(ctx, `
		INSERT INTO user_timer_preferences (
			user_id, default_category, auto_pause_on_idle, pomodoro_work_minutes,
			notification_enabled, preferred_timer_view, show_progress_bar,
			enable_auto_inference, auto_stop_others_default, created_at, updated_at
		) VALUES (
			$1, COALESCE($2,'工作'), $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
		) ON CONFLICT (user_id) DO UPDATE SET
			default_category = COALESCE(EXCLUDED.default_category, user_timer_preferences.default_category),
			auto_pause_on_idle = COALESCE(EXCLUDED.auto_pause_on_idle, user_timer_preferences.auto_pause_on_idle),
			pomodoro_work_minutes = COALESCE(EXCLUDED.pomodoro_work_minutes, user_timer_preferences.pomodoro_work_minutes),
			notification_enabled = COALESCE(EXCLUDED.notification_enabled, user_timer_preferences.notification_enabled),
			preferred_timer_view = COALESCE(EXCLUDED.preferred_timer_view, user_timer_preferences.preferred_timer_view),
			show_progress_bar = COALESCE(EXCLUDED.show_progress_bar, user_timer_preferences.show_progress_bar),
			enable_auto_inference = COALESCE(EXCLUDED.enable_auto_inference, user_timer_preferences.enable_auto_inference),
			auto_stop_others_default = COALESCE(EXCLUDED.auto_stop_others_default, user_timer_preferences.auto_stop_others_default),
			updated_at = NOW()
	`, uid,
		req.DefaultCategory,
		req.AutoPauseOnIdle,
		req.PomodoroWorkMinutes,
		req.NotificationEnabled,
		req.PreferredTimerView,
		req.ShowProgressBar,
		req.EnableAutoInference,
		req.AutoStopOthersDefault,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// internal helper
func (h *UnifiedTimerHandler) getAutoStopOthersDefault(ctx context.Context, userID int) (bool, bool) {
	sqlDB := h.db.GetDB().(*sql.DB)
	var val sql.NullBool
	if err := sqlDB.QueryRowContext(ctx, `SELECT auto_stop_others_default FROM user_timer_preferences WHERE user_id=$1`, userID).Scan(&val); err == nil {
		if val.Valid {
			return val.Bool, true
		}
	}
	return false, false
}

// Health check endpoint
func (h *UnifiedTimerHandler) HealthCheck(c *gin.Context) {

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "unified_timer",
		"version": "1.0.0",
		"features": []string{
			"start_timer",
			"stop_timer",
			"get_current",
			"pause_timer",
			"resume_timer",
			"history",
		},
	})
}

// GetUserTimerHistory handles GET /api/v1/user/timer/history
func (h *UnifiedTimerHandler) GetUserTimerHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Parse pagination parameters
	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		var parsedLimit int
		if _, err := fmt.Sscanf(limitStr, "%d", &parsedLimit); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		var parsedOffset int
		if _, err := fmt.Sscanf(offsetStr, "%d", &parsedOffset); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get timer sessions through the service
	sessions, err := h.timerService.GetUserTimerHistory(ctx, uid, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get timer history",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessions": sessions,
		"limit":    limit,
		"offset":   offset,
	})
}

// GetRecentTasks handles GET /api/v1/timer/recent-tasks with pagination
// Compatible with the existing UniversalTimerWidget frontend expectations
func (h *UnifiedTimerHandler) GetRecentTasks(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	baseCtx := c.Request.Context()

	// Parse pagination parameters
	limit := 8 // Default page size
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		var parsedLimit int
		if _, err := fmt.Sscanf(limitStr, "%d", &parsedLimit); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		var parsedOffset int
		if _, err := fmt.Sscanf(offsetStr, "%d", &parsedOffset); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Add a short timeout to avoid hanging requests (server-side protection)
	ctx, cancel := context.WithTimeout(baseCtx, 2*time.Second)
	defer cancel()

	// Use existing repository method instead of raw SQL to avoid type assertion issues
	recentTasks, err := h.db.Timer().GetRecentTasksByUserWithPagination(ctx, uid, limit, offset)
	if err != nil {
		// Graceful fallback: return empty list instead of 504/500 if context deadline exceeded
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusOK, gin.H{"tasks": []interface{}{}, "limit": limit, "offset": offset, "count": 0, "note": "timeout"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recent tasks", "details": err.Error()})
		return
	}

	// Convert to frontend-expected format
	var tasks []map[string]interface{}
	for _, task := range recentTasks {
		taskMap := map[string]interface{}{
			"id":            task.TaskID,
			"title":         task.TaskTitle,
			"project_name":  task.ProjectName,
			"status":        task.Status,
			"total_seconds": task.TotalSeconds,
			"last_timed_at": task.LastTimedAt,
			"is_deleted":    task.IsDeleted,
		}
		tasks = append(tasks, taskMap)
	}

	if tasks == nil {
		tasks = []map[string]interface{}{}
	}

	response := gin.H{
		"tasks":  tasks,
		"limit":  limit,
		"offset": offset,
		"count":  len(tasks),
	}

	c.JSON(http.StatusOK, response)
}

// GetDailyComparison handles GET /api/v1/timer/daily-comparison
func (h *UnifiedTimerHandler) GetDailyComparison(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Add timeout to prevent hanging requests
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Get comprehensive 3-day comparison data
	comparisonData, err := h.db.Timer().GetDailyComparisonData(ctx, uid)
	if err != nil {
		// Handle context timeout gracefully
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error": "Request timeout",
				"details": "分析数据量较大，请稍后重试",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get daily comparison data",
			"details": err.Error(),
		})
		return
	}

	// Add response metadata
	response := gin.H{
		"data": comparisonData,
		"meta": gin.H{
			"generated_at": time.Now().Format(time.RFC3339),
			"timezone": "Asia/Shanghai",
			"algorithm_version": "2.0",
		},
	}

	c.JSON(http.StatusOK, response)
}

// ===== SSE Endpoints =====

// TimerSSE handles Server-Sent Events for timer updates (with header auth)
func (h *UnifiedTimerHandler) TimerSSE(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	uid := userID.(int)
	
	// Handle SSE connection
	h.sseManager.HandleSSEConnection(c, uid)
}

// TimerSSEWithToken handles Server-Sent Events for timer updates using URL token
func (h *UnifiedTimerHandler) TimerSSEWithToken(c *gin.Context) {
	// Get token from query parameter
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Missing token parameter",
			"details": "Token must be provided as query parameter: ?token=your_jwt_token",
		})
		return
	}
	
	// Validate token and extract user ID
	// This mimics the JWT validation from the auth middleware
	userID, err := h.validateJWTToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token",
			"details": err.Error(),
		})
		return
	}
	
	// Handle SSE connection
	h.sseManager.HandleSSEConnection(c, userID)
}

// SSEConnectionTest handles SSE connection testing
func (h *UnifiedTimerHandler) SSEConnectionTest(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
	
	// Send test message
	testData := fmt.Sprintf(`{"type": "test", "message": "SSE connection successful", "timestamp": %d}`, time.Now().Unix())
	c.Writer.WriteString(fmt.Sprintf("data: %s\n\n", testData))
	c.Writer.Flush()
	
	// Wait a second then close
	time.Sleep(1 * time.Second)
	
	closeData := `{"type": "close", "message": "Test completed"}`
	c.Writer.WriteString(fmt.Sprintf("data: %s\n\n", closeData))
	c.Writer.Flush()
}

// SSEHealthCheck provides health check for SSE functionality
func (h *UnifiedTimerHandler) SSEHealthCheck(c *gin.Context) {
	metrics := h.sseManager.GetMetrics()
	
	health := gin.H{
		"status":             "ok",
		"timestamp":          time.Now().Unix(),
		"active_connections": metrics.ActiveConnections,
		"total_connections":  metrics.TotalConnections,
		"messages_sent":      metrics.MessagesSent,
		"connection_errors":  metrics.ConnectionErrors,
		"message_errors":     metrics.MessageErrors,
		"last_update":        metrics.LastUpdate.Unix(),
	}
	
	// Determine health status
	if metrics.ConnectionErrors > 0 && metrics.TotalConnections > 0 {
		errorRate := float64(metrics.ConnectionErrors) / float64(metrics.TotalConnections)
		if errorRate > 0.1 { // 10% error rate
			health["status"] = "warning"
		}
	}
	
	if metrics.ActiveConnections > 1000 {
		health["status"] = "warning"
	}
	
	c.JSON(http.StatusOK, health)
}
