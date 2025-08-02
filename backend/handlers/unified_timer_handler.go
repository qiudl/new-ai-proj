package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UnifiedTimerHandler provides unified timer operations for both personal and project tasks
type UnifiedTimerHandler struct {
	db           database.DB
	timerService *services.TimerService
}

// NewUnifiedTimerHandler creates a new UnifiedTimerHandler
func NewUnifiedTimerHandler(db database.DB) *UnifiedTimerHandler {
	return &UnifiedTimerHandler{
		db:           db,
		timerService: services.NewTimerService(db),
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

	var req services.StartTimerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate task type
	if req.TaskType != services.TaskTypePersonal && req.TaskType != services.TaskTypeProject {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid task type",
			"details": "task_type must be either 'personal' or 'project'",
		})
		return
	}

	// Validate task ID
	if req.TaskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid task ID",
			"details": "task_id must be a positive integer",
		})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	response, err := h.timerService.StartTimer(ctx, uid, req)
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

	response, err := h.timerService.StopTimer(ctx, uid)
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
// Pauses the current timer (placeholder for Phase 3)
func (h *UnifiedTimerHandler) PauseTimer(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":   "Not implemented",
		"message": "Pause functionality will be implemented in Phase 3",
	})
}

// ResumeTimer handles POST /api/v1/user/timer/resume  
// Resumes a paused timer (placeholder for Phase 3)
func (h *UnifiedTimerHandler) ResumeTimer(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":   "Not implemented",
		"message": "Resume functionality will be implemented in Phase 3",
	})
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
			"pause_resume_placeholder",
		},
	})
}

// Legacy compatibility methods - these will redirect to the unified methods

// StartPersonalTimer provides backward compatibility for personal timer start
func (h *UnifiedTimerHandler) StartPersonalTimer(c *gin.Context) {
	var legacyReq struct {
		TaskID         int  `json:"task_id"`
		AutoStopOthers bool `json:"auto_stop_others"`
	}
	
	if err := c.ShouldBindJSON(&legacyReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Convert to unified request
	req := services.StartTimerRequest{
		TaskType:       services.TaskTypePersonal,
		TaskID:         legacyReq.TaskID,
		AutoStopOthers: legacyReq.AutoStopOthers,
	}

	// Set request body for unified handler
	c.Set("unified_request", req)
	
	// Call unified handler
	h.StartTimer(c)
}

// StartProjectTimer provides backward compatibility for project timer start
func (h *UnifiedTimerHandler) StartProjectTimer(c *gin.Context) {
	var legacyReq struct {
		TaskID         int  `json:"task_id"`
		AutoStopOthers bool `json:"auto_stop_others"`
	}
	
	if err := c.ShouldBindJSON(&legacyReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format", 
			"details": err.Error(),
		})
		return
	}

	// Convert to unified request
	req := services.StartTimerRequest{
		TaskType:       services.TaskTypeProject,
		TaskID:         legacyReq.TaskID,
		AutoStopOthers: legacyReq.AutoStopOthers,
	}

	// Set request body for unified handler
	c.Set("unified_request", req)
	
	// Call unified handler  
	h.StartTimer(c)
}

// Helper method to handle unified requests from legacy endpoints
func (h *UnifiedTimerHandler) handleUnifiedRequest(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	req, exists := c.Get("unified_request")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error: missing unified request"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)
	
	response, err := h.timerService.StartTimer(ctx, uid, req.(services.StartTimerRequest))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start timer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}