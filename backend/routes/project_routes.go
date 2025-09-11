package routes

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

// RegisterProjectRoutes 注册项目和任务管理路由（简化版，专注于权限测试）
func RegisterProjectRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	fmt.Println("DEBUG: RegisterProjectRoutes called")
	// Projects routes with permission requirements
	projects := authorized.Group("/projects")
	{
		fmt.Println("DEBUG: Setting up project routes")
		// 基础项目管理路由
		projects.GET("", app.GetProjectsHandler())
		projects.POST("", app.CreateProjectHandler())
		projects.GET("/:id", app.GetProjectHandler())
		projects.PUT("/:id", app.UpdateProjectHandler())
		projects.DELETE("/:id", app.DeleteProjectHandler())

		// Project statistics endpoint
		projects.GET("/:id/stats", app.GetProjectStatsHandler())

		// Project user management routes
		projects.GET("/:id/users", app.GetProjectUsersHandler())
		projects.POST("/:id/users", app.AddProjectUserHandler())
		projects.DELETE("/:id/users/:userId", app.RemoveProjectUserHandler())

		// 注册简化的任务相关路由
		registerSimpleTaskRoutes(projects, app)

		// 注册任务层级路由
		registerTaskHierarchyRoutes(projects, app)
	}
}

// registerSimpleTaskRoutes 注册简化的任务管理路由
func registerSimpleTaskRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// Basic tasks routes only
	projects.GET("/:id/tasks", app.GetTasksHandler())
	projects.POST("/:id/tasks", app.CreateTaskHandler())
	projects.DELETE("/:id/tasks", app.BulkDeleteTasksHandler())  // Bulk delete tasks
	projects.GET("/:id/tasks/:taskId", app.GetTaskHandler())
	projects.PUT("/:id/tasks/:taskId", app.UpdateTaskHandler())
	projects.DELETE("/:id/tasks/:taskId", app.DeleteTaskHandler())

	// Task timeline route
	projects.GET("/:id/tasks/:taskId/timeline", app.GetTaskTimelineHandler())

	// Project timeline route
	projects.GET("/:id/tasks/timeline", app.GetTimelineHandler().GetProjectTimeline)

	// Task movement and positioning routes
	projects.POST("/:id/tasks/:taskId/move", app.MoveTaskHandler())
	projects.POST("/:id/tasks/:taskId/reorder", app.ReorderTaskHandler())
	projects.POST("/:id/tasks/bulk-reorder", app.BulkReorderTasksHandler())

	// Task document upload routes
	registerTaskDocumentRoutes(projects, app)
}

// registerTaskHierarchyRoutes 注册任务层级路由
func registerTaskHierarchyRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// 获取任务层级处理器
	hierarchyHandler := app.GetTaskHierarchyHandler()

	// 任务层级相关路由
	projects.GET("/:id/tasks/root", hierarchyHandler.GetRootTasks)
	projects.GET("/:id/tasks/tree", hierarchyHandler.GetTaskTree)
	projects.GET("/:id/tasks/search-parents", hierarchyHandler.SearchParentTasks)
	projects.GET("/:id/tasks/:taskId/descendants", hierarchyHandler.GetTaskDescendants)
	projects.GET("/:id/tasks/:taskId/children", hierarchyHandler.GetTaskChildren)
}

// registerTaskDocumentRoutes 注册任务文档上传路由
func registerTaskDocumentRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// 获取任务文档处理器
	taskDocHandler := app.GetTaskDocumentHandler()
	if taskDocHandler == nil {
		fmt.Println("WARNING: TaskDocumentHandler is not available, skipping document upload routes")
		return
	}

	// 任务文档上传相关路由
	projects.POST("/:id/tasks/:taskId/upload", taskDocHandler.ManualUploadDocument)           // 手动文件上传
	projects.POST("/:id/tasks/:taskId/upload-api", taskDocHandler.APIUploadDocument)         // API上传
	// 注意：GET documents 路由在 document_routes.go 中已定义，避免重复注册
	
	// 文件查看和下载路由
	projects.GET("/files/view", taskDocHandler.ViewFile)                                     // 查看文件
	projects.GET("/files/download", taskDocHandler.DownloadFile)                             // 下载文件
}
