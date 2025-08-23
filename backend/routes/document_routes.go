package routes

import (
	"database/sql"
	"os"
	"path/filepath"
	"time"
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
			// 单个任务文档管理（兼容旧的单数路由，改为走数据库文档Upsert，而非文件系统）
			tasks.GET("/:taskId/document", func(c *gin.Context) {
				c.JSON(410, gin.H{
					"success": false,
					"message": "This GET endpoint is deprecated. Use /projects/:id/tasks/:taskId/documents instead.",
					"replacement": "/api/v1/projects/:id/tasks/:taskId/documents",
				})
			})
			tasks.POST("/:taskId/document", app.GetDocumentHandler().UpsertTaskDocument)
			tasks.PUT("/:taskId/document", app.GetDocumentHandler().UpsertTaskDocument)
			
				taskDocuments := tasks.Group("/:taskId/documents")
				{
					// 获取任务的所有文档
					taskDocuments.GET("", app.GetDocumentHandler().GetTaskDocuments)
					// 一致性读取：是否存在文档、列出文档
					taskDocuments.GET("/has", app.GetDocumentHandler().HasTaskDocument)
					taskDocuments.GET("/list", app.GetDocumentHandler().ListTaskDocuments)
					
					// 原子：创建文档并关联到任务（单事务）
					taskDocuments.POST("/create-and-attach", app.GetDocumentHandler().CreateAndAttachDocument)
					// 别名路由：与文档一致的 REST 设计（POST 空路径）
					taskDocuments.POST("", app.GetDocumentHandler().CreateAndAttachDocument)
					
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
		// 使用标准 DocumentHandler 以保证与前端期望的数据结构一致（包含分页字段）
		workNotes.GET("", app.GetDocumentHandler().ListWorkNotes)
		workNotes.POST("", app.GetDocumentHandler().CreateDocument)
		workNotes.GET("/search", app.GetDocumentHandler().SearchWorkNotes)
		workNotes.GET("/:id", app.GetDocumentHandler().GetDocument)
		workNotes.PUT("/:id", app.GetDocumentHandler().UpdateDocument)
		workNotes.DELETE("/:id", app.GetDocumentHandler().DeleteDocument)

		// 开发环境辅助端点（非生产环境注册，避免因环境名不一致导致开发期不可用）
		config := app.GetConfig()
		if !config.IsProduction() {
			workNotes.POST("/dev-create", app.GetDocumentHandler().DevCreateWorkNote)
		}

		// 兼容前端服务的工作笔记复制与模板切换端点（与 /documents 下行为一致）
		workNotes.POST("/:id/copy", app.GetHybridDocumentHandler().CopyDocument)
		workNotes.POST("/:id/toggle-template", app.GetHybridDocumentHandler().ToggleTemplate)
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
	// 已归档：GET 接口返回 410，避免误用；请使用标准文档接口或任务文档列表
	timerTasks.GET("/:id/document", func(c *gin.Context) {
		c.JSON(410, gin.H{
			"success": false,
			"message": "This file-based personal GET endpoint is deprecated. Use documents API instead.",
			"replacement": "/api/v1/projects/:id/tasks/:taskId/documents",
		})
	})
	timerTasks.PUT("/:id/document", app.GetTaskDocumentFileHandler().UpdatePersonalTaskDocument)
}

// RegisterDocumentHealthRoute 注册文档服务健康检查路由
func RegisterDocumentHealthRoute(router *gin.Engine, app ApplicationInterface) {
	// 文档服务健康检查路由（不需要认证）
	router.GET("/documents/health", func(c *gin.Context) {
		// 组合基础健康与一致性指标
		status := "healthy"
		orphanDocs := 0
		orphanLinks := 0
		if db := app.GetDB(); db != nil {
			if sqlDB, ok := db.GetDB().(*sql.DB); ok {
				row := sqlDB.QueryRow(`
					SELECT COALESCE(COUNT(*),0)
					FROM documents d
					LEFT JOIN task_documents td ON td.document_id = d.id
					WHERE td.document_id IS NULL AND d.deleted_at IS NULL
				`)
					_ = row.Scan(&orphanDocs)

				row2 := sqlDB.QueryRow(`
					SELECT COALESCE(COUNT(*),0)
					FROM task_documents td
					LEFT JOIN documents d ON d.id = td.document_id
					WHERE d.id IS NULL
				`)
					_ = row2.Scan(&orphanLinks)
			}
		}
		c.JSON(200, gin.H{
			"success": true,
			"message": "Document service is healthy",
			"data": gin.H{
				"status": status,
				"timestamp": time.Now().Format(time.RFC3339),
				"orphan_documents": orphanDocs,
				"orphan_links": orphanLinks,
				"mirror_writable": false,
			},
		})
	})

	// 文档一致性健康检查（DB层）
	router.GET("/documents/health/docs", func(c *gin.Context) {
		orphanDocs := 0
		orphanLinks := 0
		if db := app.GetDB(); db != nil {
			if sqlDB, ok := db.GetDB().(*sql.DB); ok {
				row := sqlDB.QueryRow(`
					SELECT COALESCE(COUNT(*),0)
					FROM documents d
					LEFT JOIN task_documents td ON td.document_id = d.id
					WHERE td.document_id IS NULL AND d.deleted_at IS NULL
				`)
				_ = row.Scan(&orphanDocs)

				row2 := sqlDB.QueryRow(`
					SELECT COALESCE(COUNT(*),0)
					FROM task_documents td
					LEFT JOIN documents d ON d.id = td.document_id
					WHERE d.id IS NULL
				`)
				_ = row2.Scan(&orphanLinks)
			}
		}
		c.JSON(200, gin.H{
			"success": true,
			"data": gin.H{
				"orphan_documents": orphanDocs,
				"orphan_links": orphanLinks,
				"mirror_writable": false,
				"timestamp": time.Now().UTC(),
			},
		})
	})

	// 综合健康：/health/docs（合并文档一致性与镜像状态）
	router.GET("/health/docs", func(c *gin.Context) {
		status := "healthy"
		orphanDocs := 0
		orphanLinks := 0
		cfg := app.GetConfig()
		mirrorEnabled := cfg.App.MirrorEnabled
		mirrorPath := cfg.App.MirrorBasePath
		mirrorWritable := false

		if db := app.GetDB(); db != nil {
			if sqlDB, ok := db.GetDB().(*sql.DB); ok {
				row := sqlDB.QueryRow(`
					SELECT COALESCE(COUNT(*),0)
					FROM documents d
					LEFT JOIN task_documents td ON td.document_id = d.id
					WHERE td.document_id IS NULL AND d.deleted_at IS NULL
				`)
				_ = row.Scan(&orphanDocs)

				row2 := sqlDB.QueryRow(`
					SELECT COALESCE(COUNT(*),0)
					FROM task_documents td
					LEFT JOIN documents d ON d.id = td.document_id
					WHERE d.id IS NULL
				`)
				_ = row2.Scan(&orphanLinks)
			}
		}

		if mirrorEnabled && mirrorPath != "" {
			if err := os.MkdirAll(mirrorPath, 0o755); err == nil {
				tmp := filepath.Join(mirrorPath, ".health_write_test")
				if err2 := os.WriteFile(tmp, []byte(time.Now().Format(time.RFC3339)), 0o644); err2 == nil {
					mirrorWritable = true
					_ = os.Remove(tmp)
				}
			}
		}

		c.JSON(200, gin.H{
			"success": true,
			"message": "Document service health",
			"data": gin.H{
				"status": status,
				"timestamp": time.Now().Format(time.RFC3339),
				"orphan_documents": orphanDocs,
				"orphan_links": orphanLinks,
				"mirror_enabled": mirrorEnabled,
				"mirror_base_path": mirrorPath,
				"mirror_writable": mirrorWritable,
			},
		})
	})
}
