package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterTimerRoutes 注册计时器相关路由
func RegisterTimerRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取计时器处理器
	timerHandler := app.GetUnifiedTimerHandler()
	userTimerHandler := app.GetUserTimerHandler()

	// 用户计时器路由
	user := authorized.Group("/user")
	{
		timer := user.Group("/timer")
		{
			timer.GET("/current", timerHandler.GetCurrentTimer)
			timer.GET("/active", timerHandler.GetActiveTimers) // 添加活跃定时器接口
			timer.POST("/start", timerHandler.StartTimer)
			timer.POST("/stop", timerHandler.StopTimer)
			timer.POST("/pause", timerHandler.PauseTimer)
			timer.POST("/resume", timerHandler.ResumeTimer)
			timer.GET("/history", timerHandler.GetUserTimerHistory)
			timer.GET("/preferences", timerHandler.GetUserTimerPreferences)
			timer.PUT("/preferences", timerHandler.UpdateUserTimerPreferences)

			// 具体定时器ID操作
			timer.POST("/:id/pause", timerHandler.PauseTimerByID)
			timer.POST("/:id/resume", timerHandler.ResumeTimerByID)
			timer.POST("/:id/stop", timerHandler.StopTimerByID)

			// 用户计时器扩展功能 - 从UserTimerHandler
			timer.GET("/dashboard", userTimerHandler.GetUserTimerDashboard)
			timer.GET("/stats", userTimerHandler.GetUserTimerStats)
			timer.GET("/analytics", userTimerHandler.GetUserTimerAnalytics)
		}

		// 用户计时任务管理路由 - 这是缺失的部分
		timerTasks := user.Group("/timer-tasks")
		{
			timerTasks.POST("", userTimerHandler.CreateUserTimerTask)          // POST /api/v1/user/timer-tasks
			timerTasks.GET("", userTimerHandler.GetUserTimerTasks)             // GET /api/v1/user/timer-tasks
			timerTasks.GET("/:id", userTimerHandler.GetUserTimerTask)          // GET /api/v1/user/timer-tasks/:id
			timerTasks.PUT("/:id", userTimerHandler.UpdateUserTimerTask)       // PUT /api/v1/user/timer-tasks/:id
			timerTasks.DELETE("/:id", userTimerHandler.DeleteUserTimerTask)    // DELETE /api/v1/user/timer-tasks/:id
			timerTasks.POST("/:id/favorite", userTimerHandler.ToggleFavoriteUserTimerTask) // POST /api/v1/user/timer-tasks/:id/favorite
		}
	}

	// 全局定时器路由（用于兼容前端现有调用）
	timer := authorized.Group("/timer")
	{
		timer.GET("/recent-tasks", timerHandler.GetRecentTasks) // 添加最近任务接口
		timer.GET("/weekly", userTimerHandler.GetWeeklyReport)  // 添加周报功能
	}
}
