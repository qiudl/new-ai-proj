package routes

import (
	"log"

	"github.com/gin-gonic/gin"
)

// RegisterTaskCommentRoutes 注册任务评论路由
func RegisterTaskCommentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Println("[ROUTES] 🚀 Starting task comment routes registration...")

	// 任务评论路由组
	tasks := authorized.Group("/tasks")
	{
		// 任务评论相关路由 (使用:id而非:taskId避免与现有任务路由冲突)
		taskComments := tasks.Group("/:id/comments")
		{
			handler := app.GetTaskCommentHandler()

			// 创建评论
			// POST /api/v1/tasks/:id/comments
			taskComments.POST("", handler.CreateComment)

			// 获取评论列表（分页）
			// GET /api/v1/tasks/:id/comments?page=1&limit=20
			taskComments.GET("", handler.ListComments)

			// 获取评论统计
			// GET /api/v1/tasks/:id/comments/stats
			taskComments.GET("/stats", handler.GetCommentStats)

			// 删除评论
			// DELETE /api/v1/tasks/:id/comments/:commentId
			taskComments.DELETE("/:commentId", handler.DeleteComment)
		}
	}

	log.Println("[ROUTES] ✅ Task comment routes registration completed!")
}
