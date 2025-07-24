package handlers

import (
	"context"
	"ai-project-backend/database"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
)

type TimerHandler struct {
	db database.DB
}

func NewTimerHandler(db database.DB) *TimerHandler {
	return &TimerHandler{db: db}
}

// StartTimer handles POST /api/timer/start
func (h *TimerHandler) StartTimer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.TimerStartRequest  
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Get current user
	user, err := h.db.Users().GetByID(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user", "details": err.Error()})
		return
	}

	// Get task to verify it exists
	task, err := h.db.Tasks().GetByID(ctx, req.TaskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task not found", "details": err.Error()})
		return
	}

	// Stop current timer if running
	if user.TimingStatus == string(models.TimingStatusRunning) && user.CurrentTimingTaskID != nil {
		if err := h.stopCurrentTimer(ctx, user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop current timer", "details": err.Error()})
			return
		}
	}

	// Start new timer
	now := time.Now()
	user.CurrentTimingTaskID = &req.TaskID
	user.TimingStartTime = &now
	user.TimingStatus = string(models.TimingStatusRunning)

	_, err = h.db.Users().Update(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start timer", "details": err.Error()})
		return
	}

	response := models.TimerStartResponse{
		TaskID:    req.TaskID,
		TaskTitle: task.Title,
		StartTime: now,
		Status:    "running",
		Message:   "Timer started successfully",
	}

	c.JSON(http.StatusOK, response)
}

// StopTimer handles POST /api/timer/stop
func (h *TimerHandler) StopTimer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Get current user
	user, err := h.db.Users().GetByID(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user", "details": err.Error()})
		return
	}

	// Check if timer is running
	if user.TimingStatus != string(models.TimingStatusRunning) || user.CurrentTimingTaskID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No timer is currently running"})
		return
	}

	// Get task info
	task, err := h.db.Tasks().GetByID(ctx, *user.CurrentTimingTaskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get task", "details": err.Error()})
		return
	}

	// Calculate duration
	endTime := time.Now()
	durationSeconds := int(endTime.Sub(*user.TimingStartTime).Seconds())

	// Create time log entry
	timeLog := &models.TaskTimeLog{
		TaskID:          *user.CurrentTimingTaskID,
		UserID:          uid,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	if err := h.db.Timer().Create(ctx, timeLog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create time log", "details": err.Error()})
		return
	}

	// Update task total time
	task.TotalTimeSeconds += durationSeconds
	_, err = h.db.Tasks().Update(ctx, task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task time", "details": err.Error()})
		return
	}

	// Clear user timer state
	user.CurrentTimingTaskID = nil
	user.TimingStartTime = nil
	user.TimingStatus = string(models.TimingStatusStopped)

	_, err = h.db.Users().Update(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop timer", "details": err.Error()})
		return
	}

	response := models.TimerStopResponse{
		TaskID:          task.ID,
		TaskTitle:       task.Title,
		DurationSeconds: durationSeconds,
		FormattedTime:   models.FormatDuration(durationSeconds),
		Status:          "stopped",
		Message:         "Timer stopped successfully",
	}

	c.JSON(http.StatusOK, response)
}

// GetCurrentTimer handles GET /api/timer/current
func (h *TimerHandler) GetCurrentTimer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Get current user
	user, err := h.db.Users().GetByID(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user", "details": err.Error()})
		return
	}

	response := models.TimerCurrentResponse{
		IsRunning:     user.TimingStatus == string(models.TimingStatusRunning),
		ElapsedSeconds: 0,
		FormattedTime: "00:00:00",
	}

	// If timer is running, get task details and calculate elapsed time
	if response.IsRunning && user.CurrentTimingTaskID != nil && user.TimingStartTime != nil {
		task, err := h.db.Tasks().GetByID(ctx, *user.CurrentTimingTaskID)
		if err == nil {
			response.TaskID = user.CurrentTimingTaskID
			response.TaskTitle = &task.Title
			response.StartTime = user.TimingStartTime
			response.ElapsedSeconds = models.GetElapsedSeconds(*user.TimingStartTime)
			response.FormattedTime = models.FormatDuration(response.ElapsedSeconds)
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetTimerStats handles GET /api/timer/stats
func (h *TimerHandler) GetTimerStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Get comprehensive timer stats
	stats, err := h.db.Timer().GetUserTimerStats(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get timer stats", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// stopCurrentTimer is a helper function to stop the current timer
func (h *TimerHandler) stopCurrentTimer(ctx context.Context, user *models.User) error {
	if user.TimingStatus != string(models.TimingStatusRunning) || user.CurrentTimingTaskID == nil {
		return nil // No timer running
	}

	// Calculate duration
	endTime := time.Now()
	durationSeconds := int(endTime.Sub(*user.TimingStartTime).Seconds())

	// Create time log entry
	timeLog := &models.TaskTimeLog{
		TaskID:          *user.CurrentTimingTaskID,
		UserID:          user.ID,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	if err := h.db.Timer().Create(ctx, timeLog); err != nil {
		return err
	}

	// Update task total time
	task, err := h.db.Tasks().GetByID(ctx, *user.CurrentTimingTaskID)
	if err != nil {
		return err
	}

	task.TotalTimeSeconds += durationSeconds
	_, err = h.db.Tasks().Update(ctx, task)
	if err != nil {
		return err
	}

	return nil
}