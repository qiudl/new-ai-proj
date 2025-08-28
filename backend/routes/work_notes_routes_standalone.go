package routes

import (
	"github.com/gin-gonic/gin"
)

// registerWorkNotesRoutesStandalone 独立注册工作笔记路由，避免document_routes.go编译错误
func registerWorkNotesRoutesStandalone(authorized *gin.RouterGroup, app ApplicationInterface) {
	workNotes := authorized.Group("/work-notes")
	{
		// 使用专用的WorkNoteHandler处理工作笔记特有功能
		workNotesHandler := app.GetWorkNoteHandler()
		if workNotesHandler == nil {
			println("[ERROR] WorkNoteHandler is nil! Cannot register work notes routes.")
			return
		}
		
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
}