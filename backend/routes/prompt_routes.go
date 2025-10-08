package routes

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"ai-project-backend/handlers"
)

// RegisterPromptRoutes 注册提示词相关路由
func RegisterPromptRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取数据库连接
	db := app.GetDB().GetDB().(*sql.DB)

	// 创建处理器
	promptHandler := handlers.NewPromptHandler(db)

	// 提示词路由组
	prompts := authorized.Group("/prompts")
	{
		// 获取模板列表
		prompts.GET("/templates", promptHandler.GetTemplates)

		// 智能推荐
		prompts.GET("/recommendations", promptHandler.GetRecommendations)

		// 历史记录管理
		prompts.GET("/history", promptHandler.GetUserHistory)
		prompts.POST("/history", promptHandler.CreateHistory)
		prompts.PATCH("/history/:id/result", promptHandler.UpdateHistoryResult)
	}
}
