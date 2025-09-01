package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterWorkNotesRoutes 注册工作笔记路由（完整实现）
func RegisterWorkNotesRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	println("[DEBUG] RegisterWorkNotesRoutes called (full implementation)...")
	
	// 获取权限中间件 - 注释掉直到权限系统完全集成
	// permissionMiddleware := app.GetPermissionMiddleware()
	
	// 工作笔记路由
	workNotes := authorized.Group("/work-notes")
	{
		// 使用专用的WorkNoteHandler处理工作笔记特有功能
		workNotesHandler := app.GetWorkNoteHandler()
		
		// 基础CRUD操作
		workNotes.GET("", workNotesHandler.ListWorkNotes)
		workNotes.POST("", workNotesHandler.CreateWorkNote)
		workNotes.GET("/search", workNotesHandler.SearchWorkNotes)
		workNotes.GET("/:id", workNotesHandler.GetWorkNote)
		workNotes.PUT("/:id", workNotesHandler.UpdateWorkNote)
		workNotes.DELETE("/:id", workNotesHandler.DeleteWorkNote)
		
		// 工作笔记统计
		workNotes.GET("/stats", workNotesHandler.GetWorkNoteStats)
		
		// 工作笔记转换功能
		workNotes.POST("/:id/convert-preview", workNotesHandler.GetConversionPreview)
		workNotes.POST("/:id/convert-to-task-document", workNotesHandler.ConvertToTaskDocument)
		workNotes.POST("/batch-convert-to-task-documents", workNotesHandler.BatchConvertToTaskDocuments)
	}

	// 工作笔记文件夹路由
	workNoteFolders := authorized.Group("/work-note-folders")
	{
		// 使用专用的WorkNoteFolderHandler处理文件夹特有功能
		workNoteFolderHandler := app.GetWorkNoteFolderHandler()
		
		// 基础CRUD操作
		workNoteFolders.GET("", workNoteFolderHandler.ListWorkNoteFolders)         // 获取文件夹列表
		workNoteFolders.POST("", workNoteFolderHandler.CreateWorkNoteFolder)       // 创建文件夹
		workNoteFolders.GET("/search", workNoteFolderHandler.SearchWorkNoteFolders) // 搜索文件夹
		workNoteFolders.GET("/tree", workNoteFolderHandler.GetWorkNoteFolderTree)   // 获取文件夹树
		workNoteFolders.GET("/:id", workNoteFolderHandler.GetWorkNoteFolder)        // 获取单个文件夹
		workNoteFolders.PUT("/:id", workNoteFolderHandler.UpdateWorkNoteFolder)     // 更新文件夹
		workNoteFolders.DELETE("/:id", workNoteFolderHandler.DeleteWorkNoteFolder)  // 删除文件夹
		
		// 文件夹管理操作
		workNoteFolders.POST("/:id/move", workNoteFolderHandler.MoveWorkNoteFolder) // 移动文件夹
		
		// 文件夹统计和信息
		workNoteFolders.GET("/:id/ancestors", workNoteFolderHandler.GetFolderAncestors)    // 获取祖先路径
		workNoteFolders.GET("/:id/descendants", workNoteFolderHandler.GetFolderDescendants) // 获取后代
		workNoteFolders.GET("/:id/stats", workNoteFolderHandler.GetFolderStats)            // 获取统计信息
		
		// 批量操作
		workNoteFolders.POST("/batch/move", workNoteFolderHandler.BatchMoveFolders)               // 批量移动
		workNoteFolders.POST("/batch/sort", workNoteFolderHandler.BatchSortFolders)               // 批量排序
		workNoteFolders.POST("/batch/move-notes", workNoteFolderHandler.BatchMoveNotesToFolder)   // 批量移动笔记到文件夹
	}
	
	println("[DEBUG] Work notes and folder routes registered successfully (full implementation)")
}
