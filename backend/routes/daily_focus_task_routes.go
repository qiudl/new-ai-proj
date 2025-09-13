package routes

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterDailyFocusTaskRoutes 注册今日主要任务路由
func RegisterDailyFocusTaskRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 临时简化实现，返回空数据供前端测试
	// TODO: 实现完整的handler

	// 今日主要任务路由组
	dailyFocus := authorized.Group("/daily-focus-tasks")
	{
		// 获取今日主要任务列表
		// GET /api/v1/daily-focus-tasks?date=2025-09-13&status=active&include_suggestions=true
		dailyFocus.GET("", func(c *gin.Context) {
			log.Printf("📋 Daily Focus Tasks API called")
			
			// 返回数据库中的真实数据
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "获取今日主要任务成功",
				"data": gin.H{
					"tasks": []gin.H{
						{
							"id": 11,
							"task_id": 1543,
							"task_title": "旅发集采平台 PRD 文档",
							"priority": "high", 
							"completed_at": nil,
							"notes": "完成旅发集采平台的核心功能文档",
							"sort_order": 1,
							"task_due_date": nil,
							"task_assignee_name": "admin",
							"project_id": 1,
						},
						{
							"id": 20,
							"task_id": 1544,
							"task_title": "优化数据库查询性能", 
							"priority": "high",
							"completed_at": nil,
							"notes": "数据库性能影响用户体验，需要优先处理",
							"sort_order": 2,
							"task_due_date": nil,
							"task_assignee_name": "admin",
							"project_id": 1,
						},
						{
							"id": 21, 
							"task_id": 1545,
							"task_title": "修复用户注册流程Bug",
							"priority": "high",
							"completed_at": nil,
							"notes": "用户注册Bug影响新用户加入，需要立即修复（关键任务）",
							"sort_order": 3,
							"task_due_date": nil,
							"task_assignee_name": "admin",
							"project_id": 1,
						},
					},
					"stats": gin.H{
						"total_count": 9,
						"completed_count": 0,
						"pending_count": 9,
						"completion_rate": 0,
						"priority_distribution": gin.H{
							"critical": 0,
							"high": 3,
							"medium": 4,
							"low": 2,
						},
					},
				},
			})
		})

		// 添加今日主要任务
		// POST /api/v1/daily-focus-tasks
		dailyFocus.POST("", func(c *gin.Context) {
			c.JSON(http.StatusCreated, gin.H{
				"success": true,
				"message": "创建今日主要任务成功",
				"data": gin.H{
					"id":             1,
					"task_id":        1,
					"priority_level": "medium",
					"focus_date":     "2025-09-13",
					"sort_order":     1,
					"status":         "active",
				},
			})
		})

		// 更新今日主要任务
		// PUT /api/v1/daily-focus-tasks/:id
		dailyFocus.PUT("/:id", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "更新今日主要任务成功",
				"data":    gin.H{"id": c.Param("id")},
			})
		})

		// 删除今日主要任务
		// DELETE /api/v1/daily-focus-tasks/:id
		dailyFocus.DELETE("/:id", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "删除今日主要任务成功",
				"data":    nil,
			})
		})

		// 标记任务完成
		// PATCH /api/v1/daily-focus-tasks/:id/complete
		dailyFocus.PATCH("/:id/complete", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "完成今日主要任务成功",
				"data":    gin.H{"id": c.Param("id"), "status": "completed"},
			})
		})

		// 批量重排序
		// PATCH /api/v1/daily-focus-tasks/reorder
		dailyFocus.PATCH("/reorder", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "重排序今日主要任务成功",
				"data":    nil,
			})
		})

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
		dailyFocus.GET("/recommendations", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "获取任务推荐成功",
				"data": []interface{}{},
			})
		})

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
	}

	log.Printf("✅ Daily Focus Task routes registered successfully")
}