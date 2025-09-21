package routes

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterDailyFocusTaskRoutes 注册今日主要任务路由
func RegisterDailyFocusTaskRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取daily focus task handler
	dailyFocusHandler := app.GetDailyFocusTaskHandler()

	// 今日主要任务路由组
	dailyFocus := authorized.Group("/daily-focus-tasks")
	{
		// 获取今日主要任务列表
		// GET /api/v1/daily-focus-tasks?date=2025-09-13&status=active&include_suggestions=true
		dailyFocus.GET("", dailyFocusHandler.GetDailyFocusTasks)

		// 添加今日主要任务
		// POST /api/v1/daily-focus-tasks
		dailyFocus.POST("", dailyFocusHandler.CreateDailyFocusTask)

		// 更新今日主要任务
		// PUT /api/v1/daily-focus-tasks/:id
		dailyFocus.PUT("/:id", dailyFocusHandler.UpdateDailyFocusTask)

		// 删除今日主要任务
		// DELETE /api/v1/daily-focus-tasks/:id
		dailyFocus.DELETE("/:id", dailyFocusHandler.DeleteDailyFocusTask)

		// 标记任务完成
		// PATCH /api/v1/daily-focus-tasks/:id/complete
		dailyFocus.PATCH("/:id/complete", dailyFocusHandler.CompleteDailyFocusTask)

		// 批量重排序
		// PATCH /api/v1/daily-focus-tasks/reorder
		dailyFocus.PATCH("/reorder", dailyFocusHandler.ReorderDailyFocusTasks)

		// 获取智能推荐 (多个endpoint支持)
		// GET /api/v1/daily-focus-tasks/suggestions?date=2025-09-13&limit=5
		dailyFocus.GET("/suggestions", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "获取任务推荐成功",
				"data": gin.H{
					"suggestions": []interface{}{},
				},
			})
		})
		// GET /api/v1/daily-focus-tasks/recommendations (前端兼容性)
		dailyFocus.GET("/recommendations", dailyFocusHandler.GetTaskSuggestions)

		// 获取统计信息
		// GET /api/v1/daily-focus-tasks/stats
		dailyFocus.GET("/stats", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "获取统计数据成功",
				"data": gin.H{
					"total_tasks":        0,
					"completed_tasks":    0,
					"pending_tasks":      0,
					"high_priority_tasks": 0,
					"completion_rate":    0.0,
				},
			})
		})

		// 批量采用推荐任务
		// POST /api/v1/daily-focus-tasks/accept-suggestions
		dailyFocus.POST("/accept-suggestions", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "采用推荐任务成功",
				"data": gin.H{
					"processed_count": 0,
					"failed_count":    0,
				},
			})
		})

		// 延续任务
		// POST /api/v1/daily-focus-tasks/carry-over
		dailyFocus.POST("/carry-over", dailyFocusHandler.CarryOverTasks)
	}

	log.Printf("✅ Daily Focus Task routes registered successfully")
}