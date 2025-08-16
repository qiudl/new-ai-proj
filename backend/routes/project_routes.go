package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterProjectRoutes 注册项目和任务管理路由
func RegisterProjectRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Projects routes with permission requirements
	projects := authorized.Group("/projects")
	{
		// 基础项目管理路由
projects.GET("", app.GetProjectsHandler())
projects.POST("", app.CreateProjectHandler())
projects.GET("/:id", app.GetProjectHandler())
projects.PUT("/:id", app.UpdateProjectHandler())
projects.DELETE("/:id", app.DeleteProjectHandler())
		
		// Project statistics endpoint
projects.GET("/:id/stats", app.GetProjectStatsHandler())

		// 注册任务相关路由
		registerTaskRoutes(projects, app)
		
		// 注册文档相关路由
		registerTaskDocumentRoutes(projects, app)
		
		// 注册归档相关路由
		registerArchiveRoutes(projects, app)
		
		// 注册日历同步路由
		registerCalendarSyncRoutes(projects, app)
	}
}

// registerTaskRoutes 注册任务管理路由
func registerTaskRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// Hierarchical task routes (more specific routes first)
projects.GET("/:id/tasks/tree", app.GetTaskTreeHandler())
projects.GET("/:id/tasks/root", app.GetRootTasksHandler())
projects.GET("/:id/tasks/search-parents", app.SearchParentTasksHandler())
projects.POST("/:id/tasks/bulk-import", app.BulkImportTasksHandler())
	projects.POST("/:id/tasks/ai-bulk-import", app.GetAITaskGeneratorHandler().BulkImport)
	
	// Task-specific hierarchical routes
projects.GET("/:id/tasks/:taskId/children", app.GetTaskChildrenHandler())
projects.GET("/:id/tasks/:taskId/updates", app.GetTaskUpdatesHandler())
projects.PUT("/:id/tasks/:taskId/updates/:updateId", app.UpdateTaskUpdateHandler())
projects.DELETE("/:id/tasks/:taskId/updates/:updateId", app.DeleteTaskUpdateHandler())
projects.GET("/:id/tasks/:taskId/timeline", app.GetTaskTimelineHandler())
	
	// Task analysis routes
	projects.GET("/:id/tasks/:taskId/analysis/tags", app.GetTaskAnalysisHandler().AnalyzeTaskTags)
	projects.PUT("/:id/tasks/:taskId/analysis/tags", app.GetTaskAnalysisHandler().UpdateTaskTags)
	
	// Basic tasks routes
projects.GET("/:id/tasks", app.GetTasksHandler())
projects.POST("/:id/tasks", app.CreateTaskHandler())
projects.DELETE("/:id/tasks", app.BulkDeleteTasksHandler())
projects.PATCH("/:id/tasks/batch", app.BatchUpdateTasksHandler())
projects.POST("/:id/tasks/batch/preview", app.BatchValidateTasksPreviewHandler())
projects.GET("/:id/tasks/:taskId", app.GetTaskHandler())
projects.PUT("/:id/tasks/:taskId", app.UpdateTaskHandler())
projects.DELETE("/:id/tasks/:taskId", app.DeleteTaskHandler())
}

// registerTaskDocumentRoutes 注册任务文档路由
func registerTaskDocumentRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// 统一文档管理API (新架构)
	documents := projects.Group("/:id/tasks/:taskId/documents")
	{
		documents.GET("", app.GetUnifiedDocumentHandler().GetDocument)
		documents.POST("", app.GetUnifiedDocumentHandler().CreateDocument)
		documents.PUT("", app.GetUnifiedDocumentHandler().UpdateDocument)
		documents.DELETE("", app.GetUnifiedDocumentHandler().DeleteDocument)
		documents.GET("/history", app.GetUnifiedDocumentHandler().GetDocumentHistory)
		documents.POST("/archive", app.GetUnifiedDocumentHandler().ArchiveDocument)
		documents.POST("/migrate", app.GetUnifiedDocumentHandler().MigrateDocument)
	}
	
	// 向后兼容的文档API
	projects.GET("/:id/tasks/:taskId/document", app.GetUnifiedDocumentHandler().GetTaskDocument)
	projects.PUT("/:id/tasks/:taskId/document", app.GetUnifiedDocumentHandler().SaveTaskDocument)
	projects.HEAD("/:id/tasks/:taskId/document", app.GetUnifiedDocumentHandler().CheckTaskDocument)
	
	// 基于文件的任务文档管理API (向后兼容)
	projects.GET("/:id/tasks/:taskId/document/file", app.GetTaskDocumentFileHandler().GetTaskDocument)
	projects.PUT("/:id/tasks/:taskId/document/file", app.GetTaskDocumentFileHandler().UpdateTaskDocument)
	projects.POST("/:id/tasks/:taskId/document/create", app.GetTaskDocumentFileHandler().CreateTaskDocumentFromTask)
	projects.POST("/:id/tasks/:taskId/document/archive", app.GetTaskDocumentFileHandler().ArchiveTaskDocument)
	projects.GET("/:id/tasks/:taskId/document/history", app.GetTaskDocumentFileHandler().GetDocumentHistory)
	projects.GET("/:id/tasks/:taskId/document/compare", app.GetTaskDocumentFileHandler().CompareDocumentVersions)
}

// registerArchiveRoutes 注册归档路由
func registerArchiveRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// Archive routes
	projects.GET("/:id/tasks/archived", app.GetArchiveHandler().GetArchivedTasks)
	projects.POST("/:id/tasks/archive/bulk", app.GetArchiveHandler().BulkArchiveTasks)
	projects.POST("/:id/tasks/:taskId/archive", app.GetArchiveHandler().ArchiveTask)
	projects.POST("/:id/tasks/:taskId/unarchive", app.GetArchiveHandler().UnarchiveTask)
	projects.GET("/:id/archive/stats", app.GetArchiveHandler().GetArchiveStatistics)
}

// registerCalendarSyncRoutes 注册日历同步路由
func registerCalendarSyncRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// Calendar sync routes
	calendarSync := projects.Group("/:id/tasks/:taskId/calendar-sync")
	{
		calendarSync.POST("/enable", app.GetCalendarSyncHandler().EnableTaskCalendarSync)
		calendarSync.POST("/disable", app.GetCalendarSyncHandler().DisableTaskCalendarSync)
		calendarSync.PUT("", app.GetCalendarSyncHandler().UpdateTaskSyncSettings)
		calendarSync.GET("/status", app.GetCalendarSyncHandler().GetTaskSyncStatus)
		calendarSync.POST("/trigger", app.GetCalendarSyncHandler().TriggerTaskSync)
		calendarSync.GET("/logs", app.GetCalendarSyncHandler().GetSyncLogs)
	}
}