package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterDocumentRoutes 注册文档管理相关路由
func RegisterDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 注册文档CRUD路由
	registerDocumentCRUDRoutes(authorized, app)
	
	// 注册任务文档关联路由
	registerTaskDocumentRoutes(authorized, app)
	
	// 注册文档文件夹管理路由
	registerDocumentFolderRoutes(authorized, app)
	
	// 注册工作笔记路由
	registerWorkNotesRoutes(authorized, app)
	
	// 注册文档协作路由
	registerDocumentCollaborationRoutes(authorized, app)
	
	// 注册文档元数据路由
	registerDocumentMetadataRoutes(authorized, app)
}

// registerDocumentCRUDRoutes 注册文档CRUD路由
func registerDocumentCRUDRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Document CRUD routes (use new DocumentHandler for core operations)
	authorized.GET("/documents", app.GetDocumentHandler().GetDocuments)
	authorized.POST("/documents", app.GetDocumentHandler().CreateDocument)
	authorized.GET("/documents/:id", app.GetDocumentHandler().GetDocument)
	authorized.PUT("/documents/:id", app.GetDocumentHandler().UpdateDocument)
	authorized.DELETE("/documents/:id", app.GetDocumentHandler().DeleteDocument)
	
	// Batch operations
	authorized.POST("/documents/batch", app.GetDocumentHandler().CreateBatchDocuments)
	
	// Search
	authorized.GET("/documents/search", app.GetDocumentHandler().SearchDocuments)
	
	// Version management
	authorized.GET("/documents/:id/versions", app.GetDocumentHandler().GetDocumentVersions)
	authorized.POST("/documents/:id/versions", app.GetDocumentHandler().CreateDocumentVersion)
	
	// Legacy compatibility routes (keep HybridDocumentHandler for backward compatibility)
	authorized.POST("/documents/:id/copy", app.GetHybridDocumentHandler().CopyDocument)
	authorized.POST("/documents/:id/toggle-template", app.GetHybridDocumentHandler().ToggleTemplate)
}

// registerTaskDocumentRoutes 注册任务文档关联路由
func registerTaskDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 任务文档管理路由
	projects := authorized.Group("/projects")
	{
		tasks := projects.Group("/:id/tasks")
		{
			// 单个任务文档管理 (文件系统存储)
			tasks.GET("/:taskId/document", app.GetTaskDocumentFileHandler().GetTaskDocument)
			tasks.PUT("/:taskId/document", app.GetTaskDocumentFileHandler().UpdateTaskDocument)
			
			taskDocuments := tasks.Group("/:taskId/documents")
			{
				// 获取任务的所有文档
				taskDocuments.GET("", app.GetDocumentHandler().GetTaskDocuments)
				
				// 批量更新任务文档关联 (暂时返回成功，需要实现具体逻辑)
				taskDocuments.PUT("", func(c *gin.Context) {
					c.JSON(200, gin.H{
						"success": true,
						"message": "批量更新功能开发中，请使用单个文档更新接口",
						"note": "请使用 PUT /api/v1/documents/:documentId 来更新特定文档",
					})
				})
				
				// 更新特定任务文档 (便捷路由，实际调用标准文档更新)
				taskDocuments.PUT("/:documentId", app.GetDocumentHandler().UpdateDocument)
				
				// 将现有文档关联到任务
				taskDocuments.POST("/:documentId/attach", app.GetDocumentHandler().AttachDocumentToTask)
				
				// 从任务中移除文档
				taskDocuments.DELETE("/:documentId", app.GetDocumentHandler().DetachDocumentFromTask)
			}
		}
	}
}

// registerDocumentFolderRoutes 注册文档文件夹管理路由
func registerDocumentFolderRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	documentFolders := authorized.Group("/document-folders")
	{
		documentFolders.POST("", app.GetHybridDocumentFolderHandler().CreateFolder)
		documentFolders.GET("", app.GetHybridDocumentFolderHandler().ListFolders)
		documentFolders.GET("/tree", app.GetHybridDocumentFolderHandler().GetFolderTree)
		documentFolders.GET("/:id", app.GetHybridDocumentFolderHandler().GetFolder)
		documentFolders.PUT("/:id", app.GetHybridDocumentFolderHandler().UpdateFolder)
		documentFolders.DELETE("/:id", app.GetHybridDocumentFolderHandler().DeleteFolder)
		documentFolders.POST("/:id/move", app.GetHybridDocumentFolderHandler().MoveFolder)
		documentFolders.POST("/batch-update", app.GetHybridDocumentFolderHandler().BatchUpdateFolders)
		
		// 文件夹内文档管理
		documentFolders.GET("/:id/documents", app.GetSimpleDocumentHandler().GetFolderDocuments)
	}
}

// registerWorkNotesRoutes 注册工作笔记路由
func registerWorkNotesRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	workNotes := authorized.Group("/work-notes")
	{
		workNotes.GET("", app.GetHybridDocumentHandler().GetDocuments)        // 重用GetDocuments，通过查询参数过滤
		workNotes.POST("", app.GetHybridDocumentHandler().CreateDocument)      // 重用CreateDocument
		workNotes.GET("/search", app.GetUnifiedDocumentHandler().SearchDocuments) // 搜索工作笔记
		workNotes.GET("/:id", app.GetHybridDocumentHandler().GetDocument)      // 重用GetDocument  
		workNotes.PUT("/:id", app.GetHybridDocumentHandler().UpdateDocument)   // 重用UpdateDocument
		workNotes.DELETE("/:id", app.GetHybridDocumentHandler().DeleteDocument) // 重用DeleteDocument
	}
}

// registerDocumentCollaborationRoutes 注册文档协作路由
func registerDocumentCollaborationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 项目级文档协作路由
	projects := authorized.Group("/projects")
	{
		collaboration := projects.Group("/:id/documents")
		{
			collaboration.POST("/:docId/comments", app.GetCollaborationHandler().AddComment)
			collaboration.GET("/:docId/comments", app.GetCollaborationHandler().GetComments)
			collaboration.POST("/:docId/collaborators", app.GetCollaborationHandler().AddCollaborator)
			collaboration.GET("/:docId/collaborators", app.GetCollaborationHandler().GetCollaborators)
			collaboration.PUT("/:docId/collaborators/:userId", app.GetCollaborationHandler().UpdateCollaborator)
			collaboration.DELETE("/:docId/collaborators/:userId", app.GetCollaborationHandler().RemoveCollaborator)
			collaboration.GET("/:docId/history", app.GetCollaborationHandler().GetChangeHistory)
			collaboration.POST("/:docId/collaboration/start", app.GetCollaborationHandler().StartCollaborationSession)
			collaboration.GET("/:docId/collaboration/active", app.GetCollaborationHandler().GetActiveCollaborators)
			collaboration.GET("/:docId/collaboration/stats", app.GetCollaborationHandler().GetCollaborationStats)
		}
	}

	// 全局协作功能路由
	collaboration := authorized.Group("/collaboration")
	{
		collaboration.GET("/dashboard", app.GetCollaborationHandler().GetUserCollaborationDashboard)
	}

	// 评论管理路由
	comments := authorized.Group("/comments")
	{
		comments.PUT("/:id", app.GetCollaborationHandler().UpdateComment)
		comments.DELETE("/:id", app.GetCollaborationHandler().DeleteComment)
		comments.PATCH("/:id/resolve", app.GetCollaborationHandler().ResolveComment)
	}
}

// registerDocumentMetadataRoutes 注册文档元数据路由
func registerDocumentMetadataRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 文档元数据获取路由
	authorized.GET("/document-metadata/projects", app.GetDocumentProjectsHandler())
	authorized.GET("/document-metadata/customers", app.GetDocumentCustomersHandler())
	authorized.GET("/document-metadata/categories", app.GetDocumentCategoriesHandler())
}

// RegisterPersonalTimerDocumentRoutes 注册个人计时器文档路由
func RegisterPersonalTimerDocumentRoutes(timerTasks *gin.RouterGroup, app ApplicationInterface) {
	// 个人计时器任务的文档管理
	timerTasks.GET("/:id/document", app.GetTaskDocumentFileHandler().GetPersonalTaskDocument)
	timerTasks.PUT("/:id/document", app.GetTaskDocumentFileHandler().UpdatePersonalTaskDocument)
}

// RegisterDocumentHealthRoute 注册文档服务健康检查路由
func RegisterDocumentHealthRoute(router *gin.Engine, app ApplicationInterface) {
	// 文档服务健康检查路由（不需要认证）
	router.GET("/documents/health", app.GetUnifiedDocumentHandler().HealthCheck)
}