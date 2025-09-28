package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/services"
	"database/sql"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// TimerCleanupHandler handles timer cleanup operations
type TimerCleanupHandler struct {
	cleanupService *services.TimerCleanupService
	logger         *log.Logger
}

// NewTimerCleanupHandler creates a new timer cleanup handler
func NewTimerCleanupHandler(db database.DB, logger *log.Logger) *TimerCleanupHandler {
	sqlDB, ok := db.GetDB().(*sql.DB)
	if !ok {
		logger.Printf("Warning: Could not get SQL DB for timer cleanup handler")
		return &TimerCleanupHandler{
			cleanupService: nil,
			logger:         logger,
		}
	}

	return &TimerCleanupHandler{
		cleanupService: services.NewTimerCleanupService(sqlDB, logger),
		logger:         logger,
	}
}

// GetLongRunningTimers returns timers that have been running for too long
// GET /api/v1/admin/timer-cleanup/long-running?hours=1
func (h *TimerCleanupHandler) GetLongRunningTimers(c *gin.Context) {
	if h.cleanupService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Timer cleanup service not available",
		})
		return
	}

	// Parse hours parameter (default: 1 hour)
	hoursStr := c.DefaultQuery("hours", "1")
	hours, err := strconv.Atoi(hoursStr)
	if err != nil || hours < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid hours parameter",
		})
		return
	}

	timers, err := h.cleanupService.GetLongRunningTimers(c.Request.Context(), hours)
	if err != nil {
		h.logger.Printf("Error getting long-running timers: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get long-running timers",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"max_duration_hours": hours,
		"long_running_timers": timers,
		"count":             len(timers),
	})
}

// ManualCleanup performs manual cleanup of long-running timers
// POST /api/v1/admin/timer-cleanup/manual
func (h *TimerCleanupHandler) ManualCleanup(c *gin.Context) {
	if h.cleanupService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Timer cleanup service not available",
		})
		return
	}

	var req struct {
		MaxDurationHours  int   `json:"max_duration_hours" binding:"required,min=1"`
		PauseInsteadOfStop bool  `json:"pause_instead_of_stop"`
		UserIDs           []int `json:"user_ids,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	result, err := h.cleanupService.ManualCleanup(
		c.Request.Context(),
		req.MaxDurationHours,
		req.PauseInsteadOfStop,
		req.UserIDs,
	)

	if err != nil {
		h.logger.Printf("Error during manual cleanup: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Manual cleanup failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
		"message": "Manual cleanup completed successfully",
	})
}

// GetCleanupStats returns statistics about timer cleanup operations
// GET /api/v1/admin/timer-cleanup/stats
func (h *TimerCleanupHandler) GetCleanupStats(c *gin.Context) {
	// For now, return a simple status
	// In the future, this could query the audit logs for cleanup statistics
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"status":  "Timer cleanup service is running",
		"config": gin.H{
			"max_duration_hours":   1,
			"check_interval_minutes": 5,
			"pause_instead_of_stop":  true,
		},
		"message": "Automatic cleanup is active. Timers running longer than 1 hour will be automatically paused.",
	})
}

// HealthCheck returns the health status of the timer cleanup service
// GET /api/v1/admin/timer-cleanup/health
func (h *TimerCleanupHandler) HealthCheck(c *gin.Context) {
	if h.cleanupService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"status":  "unavailable",
			"message": "Timer cleanup service is not available",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"status":  "healthy",
		"service": "timer_cleanup",
		"features": []string{
			"automatic_cleanup",
			"manual_cleanup", 
			"audit_logging",
			"long_running_detection",
		},
		"message": "Timer cleanup service is operational",
	})
}