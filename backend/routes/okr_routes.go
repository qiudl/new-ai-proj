package routes

import (
	"ai-project-backend/handlers"
	"github.com/gin-gonic/gin"
)

// RegisterOKRRoutes registers OKR-related routes
func RegisterOKRRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	okrHandler := handlers.NewOKRHandler(app.GetDB())
	
	okr := authorized.Group("/okr")
	{
		// Objective management
		okr.POST("/objectives", okrHandler.CreateObjective)           // 创建目标
		okr.GET("/objectives", okrHandler.ListObjectives)             // 获取目标列表
		okr.GET("/objectives/:id", okrHandler.GetObjective)           // 获取单个目标
		okr.PUT("/objectives/:id", okrHandler.UpdateObjective)        // 更新目标
		okr.DELETE("/objectives/:id", okrHandler.DeleteObjective)     // 删除目标
		
		// Key result management
		okr.POST("/objectives/:id/key-results", okrHandler.CreateKeyResult)     // 创建关键结果
		okr.PUT("/key-results/:id", okrHandler.UpdateKeyResult)                 // 更新关键结果
		okr.DELETE("/key-results/:id", okrHandler.DeleteKeyResult)              // 删除关键结果
		
		// Statistics and query
		okr.GET("/stats", okrHandler.GetOKRStats)                     // 获取OKR统计
		okr.GET("/quarters", okrHandler.GetAvailableQuarters)         // 获取可用季度

		// Progress logs
		okr.GET("/objectives/:id/progress-logs", okrHandler.ListProgressLogsByObjective)
		okr.GET("/key-results/:id/progress-logs", okrHandler.ListProgressLogsByKeyResult)
		
		// Task-KR associations
		okr.POST("/tasks/:task_id/key-results/:kr_id/associate", okrHandler.CreateTaskKRAssociation)
		okr.GET("/tasks/:task_id/associations", okrHandler.GetTaskKRAssociations)
		okr.GET("/associations/key-results/:kr_id/tasks", okrHandler.GetKeyResultTaskAssociations)
		okr.POST("/associations/key-results/:kr_id/sync-progress", okrHandler.SyncKeyResultProgress)
	}
}
