package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// UserTimerHandler handles personal timer task operations
type UserTimerHandler struct {
	db              database.DB
	documentService *services.TaskDocumentFileService
}

// NewUserTimerHandler creates a new UserTimerHandler
func NewUserTimerHandler(db database.DB, documentService *services.TaskDocumentFileService) *UserTimerHandler {
	return &UserTimerHandler{
		db:              db,
		documentService: documentService,
	}
}

// CreateUserTimerTask handles POST /api/v1/user/timer-tasks
func (h *UserTimerHandler) CreateUserTimerTask(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.UserTimerTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Check if title already exists for this user
	exists, err := h.db.UserTimer().CheckTitleExists(ctx, uid, req.Title, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to validate task title",
			"details": err.Error(),
		})
		return
	}

	if exists {
		c.JSON(http.StatusConflict, gin.H{
			"error":   "Task title already exists",
			"message": "您已经有一个同名的计时任务，请使用不同的标题",
		})
		return
	}

	// Set default values
	if req.Category == "" {
		req.Category = "personal"
	}
	if req.Priority == "" {
		req.Priority = "medium"
	}
	if req.Color == "" {
		req.Color = models.GetDefaultColorForCategory(req.Category)
	}

	// Create task
	task := &models.UserTimerTask{
		UserID:            uid,
		Title:             req.Title,
		Description:       req.Description,
		Category:          req.Category,
		Priority:          req.Priority,
		Status:            "active",
		Color:             req.Color,
		IsFavorite:        req.IsFavorite,
		TargetTimeSeconds: req.TargetTimeSeconds,
		Tags:              req.Tags,
		Metadata:          req.Metadata,
	}

	createdTask, err := h.db.UserTimer().Create(ctx, task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create task",
			"details": err.Error(),
		})
		return
	}

	// 自动创建个人任务文档
	if h.documentService != nil {
		if err := h.documentService.CreatePersonalTaskDocument(ctx, createdTask); err != nil {
			// Log error but don't fail the request
			// Note: Implement proper logging here
			// app.logger.Printf("Error creating personal task document: %v", err)
		}
	}

	response := createdTask.ToResponse()
	c.JSON(http.StatusCreated, gin.H{
		"message": "Personal timer task created successfully",
		"task":    response,
	})
}

// GetUserTimerTasks handles GET /api/v1/user/timer-tasks
func (h *UserTimerHandler) GetUserTimerTasks(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Parse query parameters
	var filter models.UserTimerFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid query parameters",
			"details": err.Error(),
		})
		return
	}

	// Parse pagination parameters
	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get tasks
	tasks, total, err := h.db.UserTimer().GetByUserID(ctx, uid, &filter, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get tasks",
			"details": err.Error(),
		})
		return
	}

	// Convert to response format
	var responses []models.UserTimerTaskResponse
	for _, task := range tasks {
		responses = append(responses, task.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks":  responses,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetUserTimerTask handles GET /api/v1/user/timer-tasks/:id
func (h *UserTimerHandler) GetUserTimerTask(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Check ownership
	owned, err := h.db.UserTimer().CheckUserOwnership(ctx, taskID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to verify task ownership",
			"details": err.Error(),
		})
		return
	}

	if !owned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this task"})
		return
	}

	// Get task
	task, err := h.db.UserTimer().GetByID(ctx, taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	response := task.ToResponse()
	c.JSON(http.StatusOK, response)
}

// UpdateUserTimerTask handles PUT /api/v1/user/timer-tasks/:id
func (h *UserTimerHandler) UpdateUserTimerTask(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req models.UserTimerTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Check ownership
	owned, err := h.db.UserTimer().CheckUserOwnership(ctx, taskID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to verify task ownership",
			"details": err.Error(),
		})
		return
	}

	if !owned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this task"})
		return
	}

	// Get existing task
	existingTask, err := h.db.UserTimer().GetByID(ctx, taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Check if title already exists (exclude current task)
	if req.Title != existingTask.Title {
		exists, err := h.db.UserTimer().CheckTitleExists(ctx, uid, req.Title, &taskID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to validate task title",
				"details": err.Error(),
			})
			return
		}

		if exists {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Task title already exists",
				"message": "您已经有一个同名的计时任务，请使用不同的标题",
			})
			return
		}
	}

	// Update task fields
	existingTask.Title = req.Title
	existingTask.Description = req.Description
	existingTask.Category = req.Category
	existingTask.Priority = req.Priority
	existingTask.Color = req.Color
	existingTask.IsFavorite = req.IsFavorite
	existingTask.TargetTimeSeconds = req.TargetTimeSeconds
	existingTask.Tags = req.Tags
	existingTask.Metadata = req.Metadata

	// Update task
	updatedTask, err := h.db.UserTimer().Update(ctx, existingTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update task",
			"details": err.Error(),
		})
		return
	}

	response := updatedTask.ToResponse()
	c.JSON(http.StatusOK, gin.H{
		"message": "Task updated successfully",
		"task":    response,
	})
}

// DeleteUserTimerTask handles DELETE /api/v1/user/timer-tasks/:id
func (h *UserTimerHandler) DeleteUserTimerTask(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Check ownership
	owned, err := h.db.UserTimer().CheckUserOwnership(ctx, taskID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to verify task ownership",
			"details": err.Error(),
		})
		return
	}

	if !owned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this task"})
		return
	}

	// Soft delete the task
	err = h.db.UserTimer().SoftDelete(ctx, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete task",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Task deleted successfully",
	})
}

// ToggleFavoriteUserTimerTask handles POST /api/v1/user/timer-tasks/:id/favorite
func (h *UserTimerHandler) ToggleFavoriteUserTimerTask(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req struct {
		IsFavorite bool `json:"is_favorite"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Check ownership
	owned, err := h.db.UserTimer().CheckUserOwnership(ctx, taskID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to verify task ownership",
			"details": err.Error(),
		})
		return
	}

	if !owned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this task"})
		return
	}

	// Toggle favorite
	err = h.db.UserTimer().ToggleFavorite(ctx, taskID, req.IsFavorite)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to toggle favorite status",
			"details": err.Error(),
		})
		return
	}

	message := "Task removed from favorites"
	if req.IsFavorite {
		message = "Task added to favorites"
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     message,
		"is_favorite": req.IsFavorite,
	})
}

// GetUserTimerDashboard handles GET /api/v1/user/timer/dashboard
func (h *UserTimerHandler) GetUserTimerDashboard(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Timezone parameter (IANA name), default to Asia/Shanghai for local usage
	tz := c.DefaultQuery("tz", "Asia/Shanghai")
	// Get dashboard data
	dashboard, err := h.db.UserTimer().GetDashboardData(ctx, uid, tz)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get dashboard data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dashboard)
}

// GetUserTimerStats handles GET /api/v1/user/timer/stats
func (h *UserTimerHandler) GetUserTimerStats(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Get timer stats
	stats, err := h.db.UserTimer().GetUserTimerStats(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get timer stats",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetUserTimerHistory handles GET /api/v1/user/timer/history
func (h *UserTimerHandler) GetUserTimerHistory(c *gin.Context) {

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
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get timer sessions
	sessions, err := h.db.UserTimer().GetTimerSessions(ctx, uid, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get timer history",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessions": *sessions,
		"limit":    limit,
		"offset":   offset,
	})
}

// GetUserTimerAnalytics handles GET /api/v1/user/timer/analytics
func (h *UserTimerHandler) GetUserTimerAnalytics(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Parse date range parameter
	dateRange := c.DefaultQuery("range", "30days")

	// Timezone parameter (IANA name), default to UTC if missing/invalid
	tz := c.DefaultQuery("tz", "UTC")
	// Get analytics data
	analytics, err := h.db.UserTimer().GetAnalytics(ctx, uid, dateRange, tz)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get analytics data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// GetWeeklyReport handles GET /api/v1/timer/weekly
func (h *UserTimerHandler) GetWeeklyReport(c *gin.Context) {

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Parse date parameters
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Set default dates if not provided (current week)
	if startDate == "" || endDate == "" {
		now := time.Now()
		weekday := now.Weekday()

		// Calculate Monday (start of week)
		mondayOffset := int(time.Monday - weekday)
		if weekday == time.Sunday {
			mondayOffset = -6
		}
		monday := now.AddDate(0, 0, mondayOffset)
		startDate = monday.Format("2006-01-02")

		// Calculate Sunday (end of week)
		sunday := monday.AddDate(0, 0, 6)
		endDate = sunday.Format("2006-01-02")

		// Log the calculated date range for debugging
		fmt.Printf("DEBUG: Weekly report for user %d, date range: %s to %s (today: %s)\n", 
			uid, startDate, endDate, now.Format("2006-01-02"))
	}

	// Get weekly report data
	weeklyReport, err := h.db.Timer().GetWeeklyReport(ctx, uid, startDate, endDate)
	if err != nil {
		fmt.Printf("ERROR: Failed to get weekly report for user %d: %v\n", uid, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get weekly report",
			"details": err.Error(),
		})
		return
	}

	// Log successful response for debugging
	fmt.Printf("DEBUG: Weekly report retrieved for user %d - TotalHours: %.2f, TotalTasks: %d\n", 
		uid, weeklyReport.WeeklyStats.TotalHours, weeklyReport.WeeklyStats.TotalTasks)

	// Check if report has no data and provide helpful message
	if weeklyReport.WeeklyStats.TotalHours == 0 && weeklyReport.WeeklyStats.TotalTasks == 0 {
		fmt.Printf("WARNING: No time logs found for user %d in date range %s to %s\n", 
			uid, startDate, endDate)
		
		// Still return the empty report but with debug info in response
		response := gin.H{
			"weekly_stats": weeklyReport.WeeklyStats,
			"daily_stats": weeklyReport.DailyStats,
			"task_time_entries": weeklyReport.TaskTimeEntries,
			"project_stats": weeklyReport.ProjectStats,
			"debug_info": gin.H{
				"user_id": uid,
				"date_range": fmt.Sprintf("%s to %s", startDate, endDate),
				"query_time": time.Now().Format("2006-01-02 15:04:05"),
				"message": "No time logs found in this date range",
			},
		}
		c.JSON(http.StatusOK, response)
		return
	}

	c.JSON(http.StatusOK, weeklyReport)
}
