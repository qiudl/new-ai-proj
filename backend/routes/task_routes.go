package routes

import (
	"log"

	"github.com/gin-gonic/gin"
)

// RegisterTaskRoutes 注册独立的任务路由
func RegisterTaskRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Println("[ROUTES] 🚀 Starting task routes registration...")
	// 全局任务路由（跨项目）
	tasks := authorized.Group("/tasks")
	{
		// 获取用户的所有任务（跨项目）
		tasks.GET("", app.GetAllTasksHandler())

		// 创建任务（需要指定项目ID）
		tasks.POST("", app.CreateGlobalTaskHandler())

		// 获取特定任务
		tasks.GET("/:id", app.GetTaskByIdHandler())

		// 获取任务详细信息（包含层级结构）
		tasks.GET("/:id/details", app.GetTaskDetailedInfoHandler())

		// 获取任务子任务
		tasks.GET("/:id/children", app.GetTaskChildrenHandler())

		// 更新任务
		tasks.PUT("/:id", app.UpdateTaskByIdHandler())

		// 删除任务
		tasks.DELETE("/:id", app.DeleteTaskByIdHandler())

		// 任务状态切换
		tasks.PATCH("/:id/status", app.UpdateTaskStatusHandler())

		// 任务移动和重排序
		tasks.POST("/:id/move", app.MoveTaskByIdHandler())
		tasks.POST("/:id/reorder", app.ReorderTaskByIdHandler())

		// 任务归档和取消归档
		tasks.POST("/:id/archive", app.ArchiveTaskHandler())
		tasks.POST("/:id/unarchive", app.UnarchiveTaskHandler())

		// 批量归档和取消归档
		tasksBulk := tasks.Group("/bulk")
		{
			tasksBulk.POST("/archive", app.BulkArchiveTasksHandler())
			tasksBulk.POST("/unarchive", app.BulkUnarchiveTasksHandler())
		}

		// 任务时间线路由
		taskTimeline := tasks.Group("/:id/timeline")
		{
			timelineHandler := app.GetTimelineHandler()

			// 获取任务时间线
			taskTimeline.GET("", timelineHandler.GetTaskTimeline)

			// 获取时间线统计
			taskTimeline.GET("/stats", timelineHandler.GetTimelineStatistics)

			// 创建时间线事件
			taskTimeline.POST("", timelineHandler.CreateTimelineEvent)
		}

		// 批量任务时间线
		tasks.GET("/timeline/batch", app.GetTimelineHandler().GetTasksTimeline)

		// 任务关联的工作笔记路由
		taskWorkNotes := tasks.Group("/:id/work-notes")
		{
			workNotesHandler := app.GetWorkNoteHandler()

			// 获取任务关联的工作笔记
			taskWorkNotes.GET("", workNotesHandler.GetWorkNotesByTask)

			// 创建工作笔记并关联到任务
			taskWorkNotes.POST("/create-and-attach", workNotesHandler.CreateAndAttachWorkNoteToTask)
		}

		// AI生成子任务路由
		aiSubtaskHandler := app.GetAISubtaskHandler()
		tasks.POST("/:id/ai-generate-subtasks", aiSubtaskHandler.GenerateSubtasks)

		// 批量创建子任务路由
		tasks.POST("/batch-create-subtasks", aiSubtaskHandler.BatchCreateSubtasks)
	}

	log.Println("[ROUTES] ✅ Task routes registration completed!")
}
