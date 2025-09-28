package routes

import (
	"ai-project-backend/handlers"
	"log"
	"github.com/gin-gonic/gin"
)

// RegisterAdminRoutes registers administrator-only routes
func RegisterAdminRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Create admin group (in the future, this should require admin permissions)
	admin := authorized.Group("/admin")
	// TODO: Add admin permission middleware
	// admin.Use(middleware.RequireAdminRole())

	// Timer cleanup management routes
	timerCleanupHandler := handlers.NewTimerCleanupHandler(app.GetDB(), log.Default())
	
	timerCleanup := admin.Group("/timer-cleanup")
	{
		timerCleanup.GET("/health", timerCleanupHandler.HealthCheck)
		timerCleanup.GET("/stats", timerCleanupHandler.GetCleanupStats)
		timerCleanup.GET("/long-running", timerCleanupHandler.GetLongRunningTimers)
		timerCleanup.POST("/manual", timerCleanupHandler.ManualCleanup)
	}
}