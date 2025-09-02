package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

type CalendarSyncHandler struct {
	calendarSyncService *services.CalendarSyncService
	calendarSyncRepo    *database.CalendarSyncRepository
}

// EnableTaskSyncRequest represents request to enable calendar sync for a task
type EnableTaskSyncRequest struct {
	SyncDirection   string `json:"sync_direction" binding:"required,oneof=task_to_calendar calendar_to_task bidirectional"`
	ReminderMinutes int    `json:"reminder_minutes" binding:"min=0,max=10080"` // max 1 week
	AutoSync        bool   `json:"auto_sync"`                                  // whether to trigger immediate sync
}

// UpdateTaskSyncRequest represents request to update task sync settings
type UpdateTaskSyncRequest struct {
	SyncToCalendar  bool   `json:"sync_to_calendar"`
	SyncDirection   string `json:"sync_direction,omitempty" binding:"omitempty,oneof=task_to_calendar calendar_to_task bidirectional"`
	ReminderMinutes int    `json:"reminder_minutes,omitempty" binding:"min=0,max=10080"`
}

// SyncResponse represents the response for sync operations
type SyncResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	SyncStatus    string `json:"sync_status,omitempty"`
	GoogleEventID string `json:"google_event_id,omitempty"`
}

// TaskSyncStatusResponse represents task sync status information
type TaskSyncStatusResponse struct {
	TaskID                int        `json:"task_id"`
	SyncToCalendar        bool       `json:"sync_to_calendar"`
	CalendarSyncStatus    string     `json:"calendar_sync_status"`
	LastCalendarSync      *time.Time `json:"last_calendar_sync,omitempty"`
	CalendarEventURL      string     `json:"calendar_event_url,omitempty"`
	SyncDirection         string     `json:"sync_direction"`
	CalendarReminderMins  int        `json:"calendar_reminder_minutes"`
	GoogleCalendarEventID string     `json:"google_calendar_event_id,omitempty"`
}

func NewCalendarSyncHandler(calendarSyncService *services.CalendarSyncService, calendarSyncRepo *database.CalendarSyncRepository) *CalendarSyncHandler {
	return &CalendarSyncHandler{
		calendarSyncService: calendarSyncService,
		calendarSyncRepo:    calendarSyncRepo,
	}
}

// EnableTaskCalendarSync enables calendar sync for a specific task
// POST /api/v1/projects/{project_id}/tasks/{task_id}/calendar-sync/enable
func (h *CalendarSyncHandler) EnableTaskCalendarSync(c *gin.Context) {
	userID := GetUserIDFromContext(c)
	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的任务ID",
		})
		return
	}

	var req EnableTaskSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误: " + err.Error(),
		})
		return
	}

	// Enable sync for the task
	err = h.calendarSyncService.EnableTaskCalendarSync(
		context.Background(),
		taskID,
		userID,
		services.SyncDirection(req.SyncDirection),
		req.ReminderMinutes,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "启用日历同步失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SyncResponse{
		Success:    true,
		Message:    "日历同步已启用",
		SyncStatus: "pending",
	})
}

// DisableTaskCalendarSync disables calendar sync for a specific task
// POST /api/v1/projects/{project_id}/tasks/{task_id}/calendar-sync/disable
func (h *CalendarSyncHandler) DisableTaskCalendarSync(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的任务ID",
		})
		return
	}

	// Check if should delete calendar event
	deleteCalendarEvent := c.Query("delete_event") == "true"

	err = h.calendarSyncService.DisableTaskCalendarSync(
		context.Background(),
		taskID,
		deleteCalendarEvent,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "禁用日历同步失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SyncResponse{
		Success:    true,
		Message:    "日历同步已禁用",
		SyncStatus: "disabled",
	})
}

// UpdateTaskSyncSettings updates calendar sync settings for a task
// PUT /api/v1/projects/{project_id}/tasks/{task_id}/calendar-sync
func (h *CalendarSyncHandler) UpdateTaskSyncSettings(c *gin.Context) {
	userID := GetUserIDFromContext(c)
	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的任务ID",
		})
		return
	}

	var req UpdateTaskSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误: " + err.Error(),
		})
		return
	}

	// If enabling sync, use the full enable flow
	if req.SyncToCalendar {
		direction := req.SyncDirection
		if direction == "" {
			direction = "bidirectional"
		}

		err = h.calendarSyncService.EnableTaskCalendarSync(
			context.Background(),
			taskID,
			userID,
			services.SyncDirection(direction),
			req.ReminderMinutes,
		)
	} else {
		// Disable sync
		err = h.calendarSyncService.DisableTaskCalendarSync(
			context.Background(),
			taskID,
			false, // Don't delete event by default
		)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新同步设置失败: " + err.Error(),
		})
		return
	}

	status := "disabled"
	if req.SyncToCalendar {
		status = "pending"
	}

	c.JSON(http.StatusOK, SyncResponse{
		Success:    true,
		Message:    "同步设置已更新",
		SyncStatus: status,
	})
}

// GetTaskSyncStatus gets calendar sync status for a task
// GET /api/v1/projects/{project_id}/tasks/{task_id}/calendar-sync/status
func (h *CalendarSyncHandler) GetTaskSyncStatus(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的任务ID",
		})
		return
	}

	// Get task sync information
	taskInfo, err := h.calendarSyncRepo.GetTaskSyncInfo(taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "任务不存在或获取同步状态失败: " + err.Error(),
		})
		return
	}

	response := TaskSyncStatusResponse{
		TaskID:               taskInfo.ID,
		SyncToCalendar:       taskInfo.SyncToCalendar,
		CalendarSyncStatus:   taskInfo.CalendarSyncStatus,
		SyncDirection:        taskInfo.SyncDirection,
		CalendarReminderMins: taskInfo.CalendarReminderMins,
	}

	// Add optional fields if they exist
	if taskInfo.LastCalendarSync.Valid {
		response.LastCalendarSync = &taskInfo.LastCalendarSync.Time
	}
	if taskInfo.CalendarEventURL.Valid {
		response.CalendarEventURL = taskInfo.CalendarEventURL.String
	}
	if taskInfo.GoogleCalendarEventID.Valid {
		response.GoogleCalendarEventID = taskInfo.GoogleCalendarEventID.String
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// TriggerTaskSync manually triggers sync for a specific task
// POST /api/v1/projects/{project_id}/tasks/{task_id}/calendar-sync/trigger
func (h *CalendarSyncHandler) TriggerTaskSync(c *gin.Context) {
	userID := GetUserIDFromContext(c)
	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的任务ID",
		})
		return
	}

	// Get sync direction from query parameter
	direction := c.DefaultQuery("direction", "task_to_calendar")

	var syncErr error
	switch direction {
	case "task_to_calendar":
		syncErr = h.calendarSyncService.SyncTaskToCalendar(context.Background(), taskID, userID)
	case "calendar_to_task":
		// This would require event ID, typically triggered by webhook
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "从日历到任务的同步需要事件ID，通常由Webhook触发",
		})
		return
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的同步方向",
		})
		return
	}

	if syncErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "触发同步失败: " + syncErr.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SyncResponse{
		Success:    true,
		Message:    "同步已触发，正在后台处理",
		SyncStatus: "pending",
	})
}

// GetSyncLogs gets sync operation logs for a task
// GET /api/v1/projects/{project_id}/tasks/{task_id}/calendar-sync/logs
func (h *CalendarSyncHandler) GetSyncLogs(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的任务ID",
		})
		return
	}

	// Get limit from query parameter
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	logs, err := h.calendarSyncRepo.GetSyncLogs(taskID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取同步日志失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"logs":  logs,
			"count": len(logs),
		},
	})
}

// ProcessSyncQueue manually triggers sync queue processing (admin only)
// POST /api/v1/admin/calendar-sync/process-queue
func (h *CalendarSyncHandler) ProcessSyncQueue(c *gin.Context) {
	// Check if user is admin
	userRole := GetUserRoleFromContext(c)
	if userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	err := h.calendarSyncService.ProcessSyncQueue(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "处理同步队列失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "同步队列处理完成",
	})
}

// GetSyncQueueStatus gets current sync queue status (admin only)
// GET /api/v1/admin/calendar-sync/queue-status
func (h *CalendarSyncHandler) GetSyncQueueStatus(c *gin.Context) {
	// Check if user is admin
	userRole := GetUserRoleFromContext(c)
	if userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	// Get pending items (limited for status check)
	pendingItems, err := h.calendarSyncRepo.GetPendingSyncItems(50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取队列状态失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"pending_count": len(pendingItems),
			"pending_items": pendingItems,
		},
	})
}

// Helper functions to get user info from context
func GetUserIDFromContext(c *gin.Context) int {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(int); ok {
			return id
		}
	}
	return 0
}

func GetUserRoleFromContext(c *gin.Context) string {
	if role, exists := c.Get("user_role"); exists {
		if roleStr, ok := role.(string); ok {
			return roleStr
		}
	}
	return ""
}

// GoogleCalendarWebhook handles Google Calendar webhook notifications
// POST /api/v1/webhooks/google-calendar
func (h *CalendarSyncHandler) GoogleCalendarWebhook(c *gin.Context) {
	// Verify the webhook signature (implementation needed)
	// Process the calendar event change
	// Trigger reverse sync if needed

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Webhook处理完成",
	})
}
