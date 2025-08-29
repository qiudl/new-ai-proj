package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterTaskRoutes 注册独立的任务路由
func RegisterTaskRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 全局任务路由（跨项目）
	tasks := authorized.Group("/tasks")
	{
		// 获取用户的所有任务（跨项目）
		tasks.GET("", app.GetAllTasksHandler())
		
		// 创建任务（需要指定项目ID）
		tasks.POST("", app.CreateGlobalTaskHandler())
		
		// 获取特定任务
		tasks.GET("/:id", app.GetTaskByIdHandler())
		
		// 更新任务
		tasks.PUT("/:id", app.UpdateTaskByIdHandler())
		
		// 删除任务
		tasks.DELETE("/:id", app.DeleteTaskByIdHandler())
		
		// 任务状态切换
		tasks.PATCH("/:id/status", app.UpdateTaskStatusHandler())
		
		// 任务移动和重排序
		tasks.POST("/:id/move", app.MoveTaskByIdHandler())
		tasks.POST("/:id/reorder", app.ReorderTaskByIdHandler())
		
		// 任务关联的工作笔记路由
		taskWorkNotes := tasks.Group("/:id/work-notes")
		{
			workNotesHandler := app.GetWorkNoteHandler()
			
			// 获取任务关联的工作笔记
			taskWorkNotes.GET("", workNotesHandler.GetWorkNotesByTask)
			
			// 创建工作笔记并关联到任务
			taskWorkNotes.POST("/create-and-attach", workNotesHandler.CreateAndAttachWorkNoteToTask)
		}
	}
}
