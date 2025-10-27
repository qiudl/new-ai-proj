package routes

import (
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"log"

	"github.com/gin-gonic/gin"
)

// RegisterAdminRoutes registers administrator-only routes
func RegisterAdminRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Println("[ROUTES] 🚀 Starting admin routes registration...")

	// Create admin group with SystemAdminOnly middleware
	admin := authorized.Group("/admin")
	admin.Use(middleware.SystemAdminOnly()) // Apply system admin permission check
	log.Println("[ROUTES] ✅ SystemAdminOnly middleware applied to /admin routes")

	// Get SystemAdminHandler
	systemAdminHandler := app.GetSystemAdminHandler()
	if systemAdminHandler != nil {
		// Set database interface for handler (needed for UpdateTaskProject)
		systemAdminHandler.SetDB(app.GetDB())
		log.Println("[ROUTES] ✅ Database interface set for SystemAdminHandler")

		// System Admin Task Management Routes
		taskAdmin := admin.Group("/tasks")
		{
			// Update task project (move task to different project)
			taskAdmin.PUT("/:taskId/project", systemAdminHandler.UpdateTaskProject)
			log.Println("[ROUTES] ✅ Registered PUT /admin/tasks/:taskId/project")
		}
	} else {
		log.Println("[ROUTES] ⚠️  SystemAdminHandler is nil, task management routes not registered")
	}

	// Timer cleanup management routes (also require system admin)
	timerCleanupHandler := handlers.NewTimerCleanupHandler(app.GetDB(), log.Default())

	timerCleanup := admin.Group("/timer-cleanup")
	{
		timerCleanup.GET("/health", timerCleanupHandler.HealthCheck)
		timerCleanup.GET("/stats", timerCleanupHandler.GetCleanupStats)
		timerCleanup.GET("/long-running", timerCleanupHandler.GetLongRunningTimers)
		timerCleanup.POST("/manual", timerCleanupHandler.ManualCleanup)
		log.Println("[ROUTES] ✅ Registered timer cleanup routes")
	}

	log.Println("[ROUTES] ✅ Admin routes registration completed!")
}