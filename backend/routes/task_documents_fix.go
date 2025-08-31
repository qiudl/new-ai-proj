package routes

import (
	"database/sql"
	"ai-project-backend/handlers"
	"github.com/gin-gonic/gin"
	"log"
)

// RegisterTaskDocumentFixRoutes 注册修复的任务文档路由
// 这个函数应该在其他文档路由之后调用，以确保优先级更高
func RegisterTaskDocumentFixRoutes(authorized *gin.RouterGroup, db *sql.DB) {
	log.Println("📌 Registering task document fix routes...")
	
	// 添加修复的路由，优先级更高
	projects := authorized.Group("/projects")
	{
		projectTasks := projects.Group("/:id/tasks")
		{
			taskDocuments := projectTasks.Group("/:taskId/documents")
			{
				// 使用修复版本的handler
				taskDocuments.GET("", handlers.GetTaskDocumentsFix(db))
				log.Println("✅ Fixed route registered: GET /api/v1/projects/:id/tasks/:taskId/documents")
			}
		}
	}
}
