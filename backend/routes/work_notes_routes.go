package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterWorkNotesRoutes 注册工作笔记路由（完整实现）
func RegisterWorkNotesRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	println("[DEBUG] RegisterWorkNotesRoutes called (full implementation)...")
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
	}
	
	println("[DEBUG] Work notes routes registered successfully (full implementation)")
}
