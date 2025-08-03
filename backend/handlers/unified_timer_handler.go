package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/services"
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

// UnifiedTimerHandler provides unified timer operations for both personal and project tasks
type UnifiedTimerHandler struct {
	db           database.DB
	timerService services.UnifiedTimerService
}

// NewUnifiedTimerHandler creates a new UnifiedTimerHandler
func NewUnifiedTimerHandler(db database.DB) *UnifiedTimerHandler {
	// Get database connection
	sqlDB := db.GetDB().(*sql.DB)
	
	// Create dependencies
	typeInferenceEngine := services.NewTypeInferenceEngine(sqlDB)
	notificationService := services.NewNotificationService()
	
	return &UnifiedTimerHandler{
		db:           db,
		timerService: services.NewUnifiedTimerService(sqlDB, typeInferenceEngine, notificationService),
	}
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

	ctx := c.Request.Context()

	response, err := h.timerService.StartTimer(ctx, &req)
	if err != nil {
		// Handle specific error types
		if err.Error() == "no timer is currently running" {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Timer conflict",
				"message": err.Error(),
			})
			return
		}
		if err.Error() == "another timer is already running" {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Timer conflict", 
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start timer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
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
		if err.Error() == "no timer is currently running" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "No active timer",
				"message": "No timer is currently running",
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
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	response, err := h.timerService.GetCurrentTimer(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get current timer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
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
		},
	})
}