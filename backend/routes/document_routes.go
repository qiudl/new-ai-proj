package routes

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"ai-project-backend/handlers"
)

// registerBatchDocumentRoutes 注册批量文档状态API
func registerBatchDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取数据库连接
	db := app.GetDB().GetDB().(*sql.DB)
	batchHandler := handlers.NewBatchDocumentHandler(db)

	// 批量获取文档状态
	authorized.POST("/documents/batch-status", batchHandler.BatchGetDocumentStatus)
}

// RegisterDocumentRoutes 注册文档管理相关路由
func RegisterDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 注册批量文档状态API
	registerBatchDocumentRoutes(authorized, app)

	// 注册基础文档CRUD路由
	registerBasicDocumentRoutes(authorized, app)

	// 注册统一任务文档路由（基于项目/任务的文档接口，包括 create-and-attach）
	registerUnifiedTaskDocumentRoutes(authorized, app)

	// 注册基于路由器的新API（优先使用RouterDocumentHandler）
	registerRouterBasedTaskDocumentRoutes(authorized, app)

	// 注册工作笔记路由
	registerWorkNotesRoutes(authorized, app)

	// 注册文档文件夹管理路由（扩展版）
	registerDocumentFolderRoutes(authorized, app)

	// 注册文档协作路由（占位符）
	registerDocumentCollaborationRoutes(authorized, app)

	// 注册文档元数据路由
	registerDocumentMetadataRoutes(authorized, app)
}

// registerBasicDocumentRoutes 注册基础文档CRUD路由
func registerBasicDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 开发环境调试端点
	config := app.GetConfig()
	if !config.IsProduction() {
		authorized.GET("/debug-work-notes", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "message": "Debug endpoint coming soon"})
		})
	}

	// Document CRUD routes（全局文档资源）
	// 使用UnifiedDocumentHandler处理文档读写操作
	unifiedHandler := app.GetUnifiedDocumentHandler()
	authorized.GET("/documents", app.GetDocumentHandler().GetDocuments)
	authorized.POST("/documents", app.GetDocumentHandler().CreateDocument)
	authorized.GET("/documents/:id", unifiedHandler.GetDocumentByID)     // 使用GetDocumentByID处理全局文档获取
	authorized.PUT("/documents/:id", unifiedHandler.UpdateDocumentByID)  // 使用UpdateDocumentByID处理全局文档更新
	authorized.DELETE("/documents/:id", app.GetDocumentHandler().DeleteDocument)

	// Archive/Unarchive - 占位符实现
	authorized.POST("/documents/:id/archive", func(c *gin.Context) {
		c.JSON(200, gin.H{"success": true, "message": "Archive feature coming soon"})
	})
	authorized.POST("/documents/:id/unarchive", func(c *gin.Context) {
		c.JSON(200, gin.H{"success": true, "message": "Unarchive feature coming soon"})
	})
	// Batch operations - 占位符实现
	authorized.POST("/documents/batch", func(c *gin.Context) {
		c.JSON(200, gin.H{"success": true, "message": "Batch operations coming soon"})
	})

	// Search - 占位符实现
	authorized.GET("/documents/search", func(c *gin.Context) {
		c.JSON(200, gin.H{"success": true, "data": []interface{}{}, "message": "Search coming soon"})
	})

	// Version management - using DocumentVersionHandler
	versionHandler := app.GetDocumentVersionHandler()
	authorized.GET("/documents/:id/versions", versionHandler.GetVersionHistory)
	authorized.GET("/documents/:id/versions/:version_number", versionHandler.GetVersion)
	authorized.POST("/documents/:id/versions", versionHandler.CreateVersion)
	authorized.GET("/documents/:id/versions/compare", versionHandler.CompareVersions)
	authorized.POST("/documents/:id/versions/:version_number/restore", versionHandler.RestoreVersion)
	authorized.GET("/documents/:id/versions/:version_number/download", versionHandler.DownloadVersion)
	authorized.DELETE("/documents/:id/versions/:version_number", versionHandler.DeleteVersion)

	// 文档操作路由（已迁移到UnifiedDocumentHandler，使用前面声明的unifiedHandler）
	authorized.POST("/documents/:id/copy", unifiedHandler.CopyDocument)
	authorized.POST("/documents/:id/toggle-template", unifiedHandler.ToggleTemplate)
}

// registerUnifiedTaskDocumentRoutes 注册统一任务文档路由（按项目/任务命名空间）
func registerUnifiedTaskDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 添加简短的任务文档路由（用于Android客户端）
	registerShortTaskDocumentRoutes(authorized, app)

	// 任务文档管理路由
	projects := authorized.Group("/projects")
	{
		tasks := projects.Group("/:id/tasks")
		{
			// 旧的单数路由兼容性处理
			tasks.GET("/:taskId/document", func(c *gin.Context) {
				c.JSON(410, gin.H{
					"success":     false,
					"message":     "This GET endpoint is deprecated. Use /projects/:id/tasks/:taskId/documents instead.",
					"replacement": "/api/v1/projects/:id/tasks/:taskId/documents",
				})
			})
			// 任务文档保存（自动判断创建或更新）
			// 使用数据库backed handler，支持自动版本创建
			tasks.POST("/:taskId/document", app.GetDocumentHandler().UpsertTaskDocument)
			tasks.PUT("/:taskId/document", app.GetDocumentHandler().UpsertTaskDocument)
			taskDocuments := tasks.Group("/:taskId/documents")
			{
				// 获取任务的所有文档（合并API - P1优化）
				// 支持 ?include_content=true 参数
				taskDocuments.GET("/all", app.GetDocumentHandler().GetAllTaskDocuments)

				// 获取任务的数据库文档（不包含上传文件）
				taskDocuments.GET("", app.GetDocumentHandler().GetTaskDocuments)
				// 检查是否存在文档
				taskDocuments.GET("/has", app.GetDocumentHandler().HasTaskDocument)
				taskDocuments.GET("/list", func(c *gin.Context) {
					c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
				})

				// 原子：创建文档并关联到任务（使用现有方法）
				taskDocuments.POST("/create-and-attach", app.GetDocumentHandler().CreateAndAttachDocument)
				// 别名路由
				taskDocuments.POST("", app.GetDocumentHandler().CreateAndAttachDocument)

				// 批量更新任务文档关联 - 占位符
				taskDocuments.PUT("", func(c *gin.Context) {
					c.JSON(200, gin.H{
						"success": true,
						"message": "批量更新功能开发中，请使用单个文档更新接口",
						"note":    "请使用 PUT /api/v1/documents/:documentId 来更新特定文档",
					})
				})

				// 更新特定任务文档 (便捷路由，实际调用标准文档更新)
				taskDocuments.PUT("/:documentId", app.GetDocumentHandler().UpdateDocument)

				// 文档归档/解归档（便捷路由）- 占位符
				taskDocuments.POST("/:documentId/archive", func(c *gin.Context) {
					c.JSON(200, gin.H{"success": true, "message": "Archive coming soon"})
				})
				taskDocuments.POST("/:documentId/unarchive", func(c *gin.Context) {
					c.JSON(200, gin.H{"success": true, "message": "Unarchive coming soon"})
				})

				// 将现有文档关联到任务 - 占位符
				taskDocuments.POST("/:documentId/attach", func(c *gin.Context) {
					c.JSON(200, gin.H{"success": true, "message": "Attach document coming soon"})
				})

				// 从任务中移除文档 - 占位符
				taskDocuments.DELETE("/:documentId", func(c *gin.Context) {
					c.JSON(200, gin.H{"success": true, "message": "Detach document coming soon"})
				})

				// 文档版本管理路由
				versionHandler := app.GetDocumentVersionHandler()
				taskDocuments.GET("/:documentId/versions", versionHandler.GetVersionHistory)
				taskDocuments.GET("/:documentId/versions/:version_number", versionHandler.GetVersion)
				taskDocuments.POST("/:documentId/versions", versionHandler.CreateVersion)
				taskDocuments.GET("/:documentId/versions/compare", versionHandler.CompareVersions)
				taskDocuments.POST("/:documentId/versions/:version_number/restore", versionHandler.RestoreVersion)
				taskDocuments.GET("/:documentId/versions/:version_number/download", versionHandler.DownloadVersion)
				taskDocuments.DELETE("/:documentId/versions/:version_number", versionHandler.DeleteVersion)
			}
		}
	}
}

// registerWorkNotesRoutes 注册工作笔记路由
func registerWorkNotesRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	fmt.Println("DEBUG: registerWorkNotesRoutes function called from document_routes.go!")
	log.Printf("DEBUG: registerWorkNotesRoutes function called from document_routes.go!")
	workNotes := authorized.Group("/work-notes")
	{
		// 开发环境辅助端点
		config := app.GetConfig()
		if !config.IsProduction() {
			workNotes.POST("/dev-create", func(c *gin.Context) {
				c.JSON(200, gin.H{"success": true, "message": "Dev create coming soon"})
			})
			workNotes.GET("/debug-work-notes", func(c *gin.Context) {
				c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
			})
		}

		// 使用专用的WorkNoteHandler处理工作笔记特有功能
		workNotesHandler := app.GetWorkNoteHandler()

		// 基础CRUD操作
		workNotes.GET("", workNotesHandler.ListWorkNotes)
		workNotes.POST("", workNotesHandler.CreateWorkNote)
		workNotes.GET("/search", workNotesHandler.SearchWorkNotes)
		workNotes.GET("/:id", workNotesHandler.GetWorkNote)
		workNotes.PUT("/:id", workNotesHandler.UpdateWorkNote)
		workNotes.DELETE("/:id", workNotesHandler.DeleteWorkNote)

		// 工作笔记特有功能 - 占位符实现
		workNotes.POST("/batch", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "message": "Batch operations coming soon"})
		})
		workNotes.GET("/stats", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "data": map[string]int{"total": 0}})
		})

		// 工作笔记任务关联功能
		workNotes.POST("/:id/attach-task", workNotesHandler.AttachWorkNoteToTask)
		workNotes.DELETE("/:id/detach-task/:taskId", workNotesHandler.DetachWorkNoteFromTask)
		workNotes.GET("/:id/tasks", workNotesHandler.GetWorkNoteTaskRelations)
		workNotes.GET("/relation-stats", workNotesHandler.GetWorkNoteTaskRelationStats)
		workNotes.GET("/recent", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		})
		workNotes.GET("/pinned", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		})
		workNotes.GET("/bookmarked", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		})

		// 单个笔记操作 - 占位符实现
		workNotes.POST("/:id/pin", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "message": "Pin feature coming soon"})
		})
		workNotes.POST("/:id/bookmark", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "message": "Bookmark feature coming soon"})
		})
		workNotes.GET("/:id/related", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		})
		// 兼容性：保留一些通用文档操作（已迁移到UnifiedDocumentHandler）
		workNotes.POST("/:id/copy", app.GetUnifiedDocumentHandler().CopyDocument)
		workNotes.POST("/:id/toggle-template", app.GetUnifiedDocumentHandler().ToggleTemplate)

		// 工作笔记转任务文档功能 - 占位符实现
		workNotes.POST("/:id/convert-to-task-document", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "message": "Convert to task document coming soon"})
		})
		workNotes.POST("/:id/convert-preview", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "message": "Convert preview coming soon"})
		})
		workNotes.POST("/batch-convert-to-task-documents", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "message": "Batch convert coming soon"})
		})
	}

	// 工作笔记文件夹路由
	workNoteFolders := authorized.Group("/work-note-folders")
	{
		folderHandler := app.GetWorkNoteFolderHandler()
		fmt.Printf("DEBUG ROUTES: folderHandler is nil: %v\n", folderHandler == nil)
		if folderHandler != nil {
			fmt.Println("DEBUG ROUTES: Registering work note folder routes with valid handler")
			// 基础CRUD操作 - Add debug wrapper
			workNoteFolders.GET("", func(c *gin.Context) {
				fmt.Println("DEBUG WRAPPER: Route handler wrapper called!")
				folderHandler.ListWorkNoteFolders(c)
			})
			workNoteFolders.POST("", folderHandler.CreateWorkNoteFolder)
			workNoteFolders.GET("/:id", folderHandler.GetWorkNoteFolder)
			workNoteFolders.PUT("/:id", folderHandler.UpdateWorkNoteFolder)
			workNoteFolders.DELETE("/:id", folderHandler.DeleteWorkNoteFolder)

			// 文件夹树和层级操作
			workNoteFolders.GET("/tree", folderHandler.GetWorkNoteFolderTree)
			workNoteFolders.GET("/search", folderHandler.SearchWorkNoteFolders)
			workNoteFolders.GET("/:id/ancestors", folderHandler.GetFolderAncestors)
			workNoteFolders.GET("/:id/descendants", folderHandler.GetFolderDescendants)
			workNoteFolders.GET("/:id/stats", folderHandler.GetFolderStats)

			// 批量操作
			workNoteFolders.POST("/:id/move", folderHandler.MoveWorkNoteFolder)
			workNoteFolders.POST("/batch/move", folderHandler.BatchMoveFolders)
			workNoteFolders.POST("/batch/sort", folderHandler.BatchSortFolders)
			workNoteFolders.POST("/batch/move-notes", folderHandler.BatchMoveNotesToFolder)
		} else {
			fmt.Println("DEBUG ROUTES: folderHandler is nil! Registering fallback routes")
			// Fallback route to show the issue
			workNoteFolders.GET("", func(c *gin.Context) {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "WorkNoteFolderHandler is nil",
					"message": "Failed to initialize work note folder handler",
				})
			})
		}
	}
}

// registerDocumentFolderRoutes 注册文档文件夹管理路由
// registerDocumentFolderRoutes 注册文档文件夹路由
func registerDocumentFolderRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 添加调试日志
	println("DEBUG: registerDocumentFolderRoutes called")

	// Try to get folder handler; it may be unavailable if DB is not *gorm.DB
	h := app.GetHybridDocumentFolderHandler()
	if h == nil {
		println("WARN: HybridDocumentFolderHandler unavailable; skipping /document-folders routes")
		// Provide a minimal stub to make it explicit in dev builds
		authorized.GET("/document-folders", func(c *gin.Context) {
			c.JSON(503, gin.H{"success": false, "message": "Document folder API disabled in this build"})
		})
		return
	}

	documentFolders := authorized.Group("/document-folders")
	{
		// 使用现有的HybridDocumentFolderHandler方法
		documentFolders.POST("", h.CreateFolder)
		documentFolders.GET("", h.ListFolders)
		documentFolders.GET("/tree", h.GetFolderTree)
		documentFolders.GET("/:id", h.GetFolder)
		documentFolders.PUT("/:id", h.UpdateFolder)
		documentFolders.DELETE("/:id", h.DeleteFolder)
		documentFolders.POST("/:id/move", h.MoveFolder)
		documentFolders.POST("/batch-update", h.BatchUpdateFolders)

		// 文件夹内文档管理 - 使用基础的DocumentHandler
		documentFolders.GET("/:id/documents", func(c *gin.Context) {
			c.JSON(200, gin.H{"success": true, "data": []interface{}{}, "message": "Folder documents coming soon"})
		})
	}
}

// registerDocumentCollaborationRoutes 注册文档协作路由（占位符）
func registerDocumentCollaborationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 项目级文档协作路由
	projects := authorized.Group("/projects")
	{
		collaboration := projects.Group("/:id/documents")
		{
			// 协作功能 - 占位符实现
			collaboration.POST("/:docId/comments", func(c *gin.Context) {
				c.JSON(200, gin.H{"success": true, "message": "Comments feature coming soon"})
			})
			collaboration.GET("/:docId/comments", func(c *gin.Context) {
				c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
			})
			collaboration.POST("/:docId/collaborators", func(c *gin.Context) {
				c.JSON(200, gin.H{"success": true, "message": "Collaboration feature coming soon"})
			})
			collaboration.GET("/:docId/collaborators", func(c *gin.Context) {
				c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
			})
		}
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
	timerTasks.GET("/:id/document", func(c *gin.Context) {
		c.JSON(410, gin.H{
			"success":     false,
			"message":     "This file-based personal GET endpoint is deprecated. Use documents API instead.",
			"replacement": "/api/v1/projects/:id/tasks/:taskId/documents",
		})
	})
	// 这个方法需要检查是否存在
	timerTasks.PUT("/:id/document", func(c *gin.Context) {
		c.JSON(200, gin.H{"success": true, "message": "Personal task document update coming soon"})
	})
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
				"status":           status,
				"timestamp":        time.Now().Format(time.RFC3339),
				"orphan_documents": orphanDocs,
				"orphan_links":     orphanLinks,
				"mirror_writable":  false,
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
				"status":           status,
				"timestamp":        time.Now().Format(time.RFC3339),
				"orphan_documents": orphanDocs,
				"orphan_links":     orphanLinks,
				"mirror_enabled":   mirrorEnabled,
				"mirror_base_path": mirrorPath,
				"mirror_writable":  mirrorWritable,
			},
		})
	})
}

// registerShortTaskDocumentRoutes 注册简短的任务文档路由（用于移动端API）
func registerShortTaskDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 简短路由: /api/v1/tasks/:id/documents
	tasks := authorized.Group("/tasks")
	{
		taskDocuments := tasks.Group("/:id/documents")
		{
			// 获取任务的所有文档（需要从taskId反查projectId）
			taskDocuments.GET("", app.GetDocumentHandler().GetTaskDocumentsWithoutProject)

			// 获取单个文档
			taskDocuments.GET("/:documentId", app.GetDocumentHandler().GetDocument)

			// 创建文档并关联到任务
			taskDocuments.POST("", app.GetDocumentHandler().CreateTaskDocumentWithoutProject)

			// 更新文档
			taskDocuments.PUT("/:documentId", app.GetDocumentHandler().UpdateDocument)

			// 删除文档关联
			taskDocuments.DELETE("/:documentId", app.GetDocumentHandler().DeleteDocument)
		}
	}
}

// registerRouterBasedTaskDocumentRoutes 注册基于路由器的任务文档路由（新架构）
func registerRouterBasedTaskDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	routerHandler := app.GetRouterDocumentHandler()

	// 新架构路由：/api/v1/router/projects/:id/tasks/:taskId/documents
	routerGroup := authorized.Group("/router")
	{
		projects := routerGroup.Group("/projects")
		{
			tasks := projects.Group("/:id/tasks")
			{
				taskDocuments := tasks.Group("/:taskId/documents")
				{
					// 使用RouterDocumentHandler的新API
					taskDocuments.POST("/create", routerHandler.CreateDocument)
					taskDocuments.GET("/read", routerHandler.GetDocument)
					taskDocuments.PUT("/update", routerHandler.UpdateDocument)
					taskDocuments.DELETE("/delete", routerHandler.DeleteDocument)

					// 创建并关联文档到任务（兼容现有API）
					taskDocuments.POST("/create-and-attach", routerHandler.CreateAndAttachDocument)

					// 文档历史
					taskDocuments.GET("/history", routerHandler.GetDocumentHistory)

					// 文档归档
					taskDocuments.POST("/archive", routerHandler.ArchiveDocument)

					// 搜索（项目范围）
					taskDocuments.GET("/search", routerHandler.SearchDocuments)
				}
			}

			// 项目级别的批量操作
			projectDocs := projects.Group("/:id/documents")
			{
				projectDocs.POST("/batch/create", routerHandler.BatchCreateDocuments)
				projectDocs.POST("/batch/update", routerHandler.BatchUpdateDocuments)
				projectDocs.POST("/export", routerHandler.ExportDocuments)
			}
		}

		// 全局文档搜索
		routerGroup.GET("/documents/search", routerHandler.SearchDocuments)

		// 管理接口
		management := routerGroup.Group("/management")
		{
			management.GET("/status", routerHandler.GetRouterStatus)
			management.POST("/strategy", routerHandler.SetRoutingStrategy)
			management.POST("/services/:version/enable", routerHandler.EnableService)
			management.POST("/services/:version/disable", routerHandler.DisableService)
			management.POST("/stats/reset", routerHandler.ResetStats)
		}
	}
}
