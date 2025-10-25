package routes

import (
	"log"

	"github.com/gin-gonic/gin"
)

// RegisterRecycleBinRoutes 注册回收站相关路由
func RegisterRecycleBinRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] RegisterRecycleBinRoutes started")

	// 回收站路由组
	recycleGroup := authorized.Group("/system/recycle")
	
	// 项目回收站路由
	projects := recycleGroup.Group("/projects")
	{
		projects.GET("", app.GetRecycledProjectsHandler())           // GET /api/v1/system/recycle/projects
		projects.POST("/:id/restore", app.RestoreProjectHandler())  // POST /api/v1/system/recycle/projects/:id/restore
		projects.DELETE("/:id", app.HardDeleteProjectHandler())     // DELETE /api/v1/system/recycle/projects/:id
	}
	
	// 任务回收站路由
	tasks := recycleGroup.Group("/tasks")
	{
		tasks.GET("", app.GetRecycledTasksHandler())                 // GET /api/v1/system/recycle/tasks
		tasks.POST("/:id/restore", app.RestoreTaskHandler())        // POST /api/v1/system/recycle/tasks/:id/restore
		tasks.DELETE("/:id", app.HardDeleteTaskHandler())           // DELETE /api/v1/system/recycle/tasks/:id
	}

	// 文档回收站路由
	documents := recycleGroup.Group("/documents")
	{
		documents.GET("", app.GetRecycledDocumentsHandler())           // GET /api/v1/system/recycle/documents
		documents.POST("/:id/restore", app.RestoreDocumentHandler())  // POST /api/v1/system/recycle/documents/:id/restore
		documents.DELETE("/:id", app.HardDeleteDocumentHandler())     // DELETE /api/v1/system/recycle/documents/:id
	}

	// 工作笔记回收站路由
	workNotes := recycleGroup.Group("/work-notes")
	{
		workNotes.GET("", app.GetRecycledWorkNotesHandler())          // GET /api/v1/system/recycle/work-notes
		workNotes.POST("/:id/restore", app.RestoreWorkNoteHandler())  // POST /api/v1/system/recycle/work-notes/:id/restore
		workNotes.DELETE("/:id", app.HardDeleteWorkNoteHandler())     // DELETE /api/v1/system/recycle/work-notes/:id
	}

	// 清空回收站
	recycleGroup.POST("/empty", app.EmptyRecycleBinHandler())       // POST /api/v1/system/recycle/empty

	log.Printf("[DEBUG] RegisterRecycleBinRoutes completed")
}