package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterNotificationRoutes registers notification-related routes
func RegisterNotificationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Get notification handler
	notificationHandler := app.GetNotificationHandler()
	if notificationHandler == nil {
		return
	}

	// Notification routes
	notifications := authorized.Group("/notifications")
	{
		// Get user notifications
		notifications.GET("", notificationHandler.GetNotifications)

		// Get unread count
		notifications.GET("/unread/count", notificationHandler.GetUnreadCount)

		// Mark as read
		notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
		notifications.PUT("/read", notificationHandler.BatchMarkAsRead)
		notifications.PUT("/read/all", notificationHandler.MarkAllAsRead)

		// Delete notification
		notifications.DELETE("/:id", notificationHandler.DeleteNotification)
	}
}
