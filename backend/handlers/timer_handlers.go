package handlers

import (
	"context"
	"fmt"
	"ai-project-backend/database"
	"net/http"
	"strconv"
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

// StartTimer handles POST /api/timer/start with improved error handling and validation
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

	// Enhanced validation
	if req.TaskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"details": "Task ID must be a positive integer",
		})
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

	// Check if user already has this task running (prevent duplicate starts)
	if user.TimingStatus == string(models.TimingStatusRunning) && 
	   user.CurrentTimingTaskID != nil && *user.CurrentTimingTaskID == req.TaskID {
		// Same task is already running, return current state instead of error
		c.JSON(http.StatusOK, models.TimerStartResponse{
			TaskID:    req.TaskID,
			TaskTitle: "Task already running",
			StartTime: *user.TimingStartTime,
			Status:    "already_running",
			Message:   "Timer is already running for this task",
		})
		return
	}

	// Get task to verify it exists and user has access
	task, err := h.db.Tasks().GetByID(ctx, req.TaskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found", "details": "Task does not exist or you don't have access to it"})
		return
	}

	// Stop current timer if running a different task
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
		TaskID:          user.CurrentTimingTaskID,
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

// GetTimerRecentTasks handles GET /api/timer/recent-tasks with pagination
func (h *TimerHandler) GetTimerRecentTasks(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Parse pagination parameters
	limit := 8 // Default page size
	offset := 0
	
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}
	}
	
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get recent tasks with pagination
	tasks, err := h.db.Timer().GetRecentTasksByUserWithPagination(ctx, uid, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recent tasks", "details": err.Error()})
		return
	}

	response := gin.H{
		"tasks":  tasks,
		"limit":  limit,
		"offset": offset,
		"count":  len(tasks),
	}

	c.JSON(http.StatusOK, response)
}

// GetWeeklyReport handles GET /api/v1/timer/weekly
func (h *TimerHandler) GetWeeklyReport(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Parse query parameters for date range
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	
	if startDate == "" || endDate == "" {
		// Default to current week
		now := time.Now()
		startOfWeek := now.AddDate(0, 0, -int(now.Weekday()))
		endOfWeek := startOfWeek.AddDate(0, 0, 6)
		startDate = startOfWeek.Format("2006-01-02")
		endDate = endOfWeek.Format("2006-01-02")
	}

	// Get weekly report data
	report, err := h.db.Timer().GetWeeklyReport(ctx, uid, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get weekly report", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
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
		TaskID:          user.CurrentTimingTaskID,
		UserID:          user.ID,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	if err := h.db.Timer().Create(ctx, timeLog); err != nil {
		return err
	}

	// Update task total time (skip if task has been deleted)
	task, err := h.db.Tasks().GetByID(ctx, *user.CurrentTimingTaskID)
	if err != nil {
		// If task not found (e.g., deleted), just log the error and continue
		// The time log entry has already been created, which is the important part
		fmt.Printf("Warning: Could not update total time for task %d: %v\n", *user.CurrentTimingTaskID, err)
	} else {
		// Task exists, update its total time
		task.TotalTimeSeconds += durationSeconds
		_, err = h.db.Tasks().Update(ctx, task)
		if err != nil {
			return err
		}
	}

	return nil
}