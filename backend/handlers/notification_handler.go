package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// NotificationHandler handles notification-related operations
type NotificationHandler struct {
	notificationService services.NotificationService
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(notificationService services.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// GetNotifications godoc
// @Summary Get user notifications
// @Description Get paginated list of notifications for the current user
// @Tags notifications
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Param is_read query bool false "Filter by read status"
// @Param type query string false "Filter by notification type"
// @Success 200 {object} models.APIResponse{data=models.NotificationListResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/notifications [get]
// @Security BearerAuth
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID := c.GetInt("user_id")

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	// Parse filters
	filters := &models.NotificationFilters{
		Page:      page,
		PageSize:  pageSize,
		SortBy:    c.DefaultQuery("sort_by", "created_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}

	// Filter by read status
	if isReadStr := c.Query("is_read"); isReadStr != "" {
		isRead, err := strconv.ParseBool(isReadStr)
		if err == nil {
			filters.IsRead = &isRead
		}
	}

	// Filter by type
	if typeStr := c.Query("type"); typeStr != "" {
		filters.Type = []string{typeStr}
	}

	// Get notifications
	response, err := h.notificationService.GetUserNotifications(c.Request.Context(), userID, filters)
	if err != nil {
		log.Printf("Error getting notifications: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取通知失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "获取通知成功"))
}

// GetUnreadCount godoc
// @Summary Get unread notifications count
// @Description Get the count of unread notifications for the current user
// @Tags notifications
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse{data=int}
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/notifications/unread/count [get]
// @Security BearerAuth
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID := c.GetInt("user_id")

	count, err := h.notificationService.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		log.Printf("Error getting unread count: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取未读数量失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"count": count,
	}, "获取未读数量成功"))
}

// MarkAsRead godoc
// @Summary Mark notification as read
// @Description Mark a specific notification as read
// @Tags notifications
// @Accept json
// @Produce json
// @Param id path int true "Notification ID"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/notifications/{id}/read [put]
// @Security BearerAuth
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID := c.GetInt("user_id")
	idStr := c.Param("id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的通知ID", nil))
		return
	}

	if err := h.notificationService.MarkAsRead(c.Request.Context(), id, userID); err != nil {
		log.Printf("Error marking notification as read: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "标记已读失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "标记已读成功"))
}

// BatchMarkAsRead godoc
// @Summary Batch mark notifications as read
// @Description Mark multiple notifications as read
// @Tags notifications
// @Accept json
// @Produce json
// @Param request body models.MarkAsReadRequest true "Notification IDs"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/notifications/read [put]
// @Security BearerAuth
func (h *NotificationHandler) BatchMarkAsRead(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req models.MarkAsReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", nil))
		return
	}

	if len(req.NotificationIDs) == 0 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "通知ID列表不能为空", nil))
		return
	}

	if err := h.notificationService.BatchMarkAsRead(c.Request.Context(), req.NotificationIDs, userID); err != nil {
		log.Printf("Error batch marking notifications as read: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "批量标记已读失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "批量标记已读成功"))
}

// MarkAllAsRead godoc
// @Summary Mark all notifications as read
// @Description Mark all notifications as read for the current user
// @Tags notifications
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/notifications/read/all [put]
// @Security BearerAuth
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID := c.GetInt("user_id")

	if err := h.notificationService.MarkAllAsRead(c.Request.Context(), userID); err != nil {
		log.Printf("Error marking all notifications as read: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "全部标记已读失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "全部标记已读成功"))
}

// DeleteNotification godoc
// @Summary Delete notification
// @Description Soft delete a notification
// @Tags notifications
// @Accept json
// @Produce json
// @Param id path int true "Notification ID"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/notifications/{id} [delete]
// @Security BearerAuth
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	userID := c.GetInt("user_id")
	idStr := c.Param("id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的通知ID", nil))
		return
	}

	if err := h.notificationService.Delete(c.Request.Context(), id, userID); err != nil {
		log.Printf("Error deleting notification: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "删除通知失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "删除通知成功"))
}
