package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterTimerRoutes 注册计时器相关路由
func RegisterTimerRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Timer routes (Phase 4: Legacy - kept for backward compatibility)
	// NOTE: These routes use the old TimerHandler and will be deprecated in Phase 5
	timer := authorized.Group("/timer")
	{
		timer.POST("/start", app.GetTimerHandler().StartTimer)         // Legacy project timer
		timer.POST("/stop", app.GetTimerHandler().StopTimer)           // Legacy project timer
		timer.GET("/weekly", app.GetUserTimerHandler().GetWeeklyReport) // Weekly report endpoint
		// timer.GET("/status", app.GetTimerHandler().GetTimerStatus)     // Legacy project timer
		// timer.GET("/recent-tasks", app.GetTimerHandler().GetRecentTasks) // Legacy recent tasks
	}

	// User Timer routes (Phase 4: Personal timers - will be deprecated in Phase 5) 
	// NOTE: These routes use the UserTimerHandler for personal timers
	// TODO: Implement UserTimerHandler methods
	// userTimer := authorized.Group("/user-timer")
	// {
	//     userTimer.POST("/start-personal", app.GetUserTimerHandler().StartPersonalTimer)
	//     userTimer.POST("/stop-personal", app.GetUserTimerHandler().StopPersonalTimer)
	//     userTimer.GET("/current-personal", app.GetUserTimerHandler().GetCurrentPersonalTimer)
	//     userTimer.GET("/personal-tasks", app.GetUserTimerHandler().GetPersonalTasks)
	//     userTimer.POST("/create-personal-task", app.GetUserTimerHandler().CreatePersonalTask)
	//     userTimer.PUT("/personal-tasks/:id", app.GetUserTimerHandler().UpdatePersonalTask)
	//     userTimer.DELETE("/personal-tasks/:id", app.GetUserTimerHandler().DeletePersonalTask)
	// }

	// Unified Timer routes (Phase 5: Current unified architecture)
	// NOTE: These are the primary timer routes that handle both project and personal timers
	unifiedTimer := authorized.Group("/user/timer")
	{
		// Core timer operations
		unifiedTimer.POST("/start", app.GetUnifiedTimerHandler().StartTimer)           // Unified start (project/personal)
		unifiedTimer.POST("/pause", app.GetUnifiedTimerHandler().PauseTimer)          // Pause current timer
		unifiedTimer.POST("/resume", app.GetUnifiedTimerHandler().ResumeTimer)        // Resume paused timer
		unifiedTimer.POST("/stop", app.GetUnifiedTimerHandler().StopTimer)            // Stop current timer
		
		// Timer status and information  
		unifiedTimer.GET("/current", app.GetUnifiedTimerHandler().GetCurrentTimer)    // Get current timer state
		unifiedTimer.GET("/health", app.GetUnifiedTimerHandler().HealthCheck)         // Health check
		
		// User timer analytics and history (using UserTimerHandler)
		unifiedTimer.GET("/dashboard", app.GetUserTimerHandler().GetUserTimerDashboard) // Dashboard data
		unifiedTimer.GET("/stats", app.GetUserTimerHandler().GetUserTimerStats)         // Statistics
		unifiedTimer.GET("/history", app.GetUserTimerHandler().GetUserTimerHistory)     // History
		unifiedTimer.GET("/analytics", app.GetUserTimerHandler().GetUserTimerAnalytics) // Analytics
	}

	// User Timer Tasks management
	userTimerTasks := authorized.Group("/user/timer-tasks")
	{
		userTimerTasks.POST("", app.GetUserTimerHandler().CreateUserTimerTask)               // Create task
		userTimerTasks.GET("", app.GetUserTimerHandler().GetUserTimerTasks)                 // List tasks
		userTimerTasks.GET("/:id", app.GetUserTimerHandler().GetUserTimerTask)              // Get task
		userTimerTasks.PUT("/:id", app.GetUserTimerHandler().UpdateUserTimerTask)           // Update task
		userTimerTasks.DELETE("/:id", app.GetUserTimerHandler().DeleteUserTimerTask)        // Delete task
		userTimerTasks.POST("/:id/favorite", app.GetUserTimerHandler().ToggleFavoriteUserTimerTask) // Toggle favorite
	}
	
	// Recent tasks and history (unified endpoint)
	// TODO: Implement GetRecentTasks method
	// authorized.GET("/timer/recent-tasks", app.GetUnifiedTimerHandler().GetRecentTasks)
}