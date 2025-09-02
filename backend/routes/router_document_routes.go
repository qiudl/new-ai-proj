package routes

import (
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterRouterDocumentRoutes 注册基于路由器的文档管理路由
func RegisterRouterDocumentRoutes(router *gin.Engine, app ApplicationInterface) {
	// API v1 路由组
	v1 := router.Group("/api/v1")

	// 需要认证的路由
	authorized := v1.Use(middleware.AuthMiddleware(app.GetJWTManager()))

	// 获取路由器文档处理器
	routerHandler := app.GetRouterDocumentHandler()

	// 基础文档CRUD路由（使用RouterDocumentHandler）
	registerRouterBasicDocumentRoutes(authorized.(*gin.RouterGroup), routerHandler)

	// 统一任务文档路由（基于项目/任务的文档接口）
	registerRouterTaskDocumentRoutes(authorized.(*gin.RouterGroup), routerHandler)

	// 高级文档功能路由
	registerRouterAdvancedDocumentRoutes(authorized.(*gin.RouterGroup), routerHandler)

	// 管理路由（监控和配置）
	registerRouterManagementRoutes(authorized.(*gin.RouterGroup), routerHandler)
}

// registerRouterBasicDocumentRoutes 注册基础文档CRUD路由
func registerRouterBasicDocumentRoutes(authorized *gin.RouterGroup, handler interface{}) {
	// 暂时使用空接口，因为RouterDocumentHandler可能还没有所有方法
	// 这里可以添加基础的CRUD路由

	// 文档搜索
	authorized.GET("/documents/search", handler.(*handlers.RouterDocumentHandler).SearchDocuments)

	// 批量操作
	authorized.POST("/documents/batch/create", handler.(*handlers.RouterDocumentHandler).BatchCreateDocuments)
	authorized.POST("/documents/batch/update", handler.(*handlers.RouterDocumentHandler).BatchUpdateDocuments)

	// 导出/导入
	authorized.POST("/documents/export", handler.(*handlers.RouterDocumentHandler).ExportDocuments)
}

// registerRouterTaskDocumentRoutes 注册任务文档路由
func registerRouterTaskDocumentRoutes(authorized *gin.RouterGroup, handler interface{}) {
	routerHandler := handler.(*handlers.RouterDocumentHandler)

	// 项目任务文档路由
	projects := authorized.Group("/projects")
	{
		tasks := projects.Group("/:project_id/tasks")
		{
			taskDocuments := tasks.Group("/:task_id/documents")
			{
				// 基础CRUD操作
				taskDocuments.POST("", routerHandler.CreateDocument)
				taskDocuments.GET("", routerHandler.GetDocument)
				taskDocuments.PUT("", routerHandler.UpdateDocument)
				taskDocuments.DELETE("", routerHandler.DeleteDocument)

				// 创建并关联文档到任务（兼容现有API）
				taskDocuments.POST("/create-and-attach", routerHandler.CreateAndAttachDocument)

				// 文档历史
				taskDocuments.GET("/history", routerHandler.GetDocumentHistory)

				// 文档归档
				taskDocuments.POST("/archive", routerHandler.ArchiveDocument)
			}
		}

		// 兼容旧版API路径
		tasks.POST("/:task_id/documents/create-and-attach", routerHandler.CreateAndAttachDocument)
	}
}

// registerRouterAdvancedDocumentRoutes 注册高级文档功能路由
func registerRouterAdvancedDocumentRoutes(authorized *gin.RouterGroup, handler interface{}) {
	routerHandler := handler.(*handlers.RouterDocumentHandler)

	// 高级功能组
	advanced := authorized.Group("/documents/advanced")
	{
		// 搜索功能
		advanced.GET("/search", routerHandler.SearchDocuments)

		// 批量操作
		batch := advanced.Group("/batch")
		{
			batch.POST("/create", routerHandler.BatchCreateDocuments)
			batch.POST("/update", routerHandler.BatchUpdateDocuments)
		}

		// 导出功能
		advanced.POST("/export", routerHandler.ExportDocuments)
	}
}

// registerRouterManagementRoutes 注册管理路由（监控和配置）
func registerRouterManagementRoutes(authorized *gin.RouterGroup, handler interface{}) {
	routerHandler := handler.(*handlers.RouterDocumentHandler)

	// 管理路由组
	management := authorized.Group("/documents/management")
	{
		// 路由器状态监控
		management.GET("/status", routerHandler.GetRouterStatus)
		management.GET("/stats", routerHandler.GetRouterStatus) // 别名

		// 路由策略配置
		management.POST("/strategy", routerHandler.SetRoutingStrategy)

		// 服务管理
		services := management.Group("/services")
		{
			services.POST("/:version/enable", routerHandler.EnableService)
			services.POST("/:version/disable", routerHandler.DisableService)
		}

		// 统计信息管理
		management.POST("/stats/reset", routerHandler.ResetStats)
	}
}

// RegisterRouterDocumentHealthRoutes 注册文档路由器健康检查路由
func RegisterRouterDocumentHealthRoutes(router *gin.Engine, app ApplicationInterface) {
	routerHandler := app.GetRouterDocumentHandler()

	// 健康检查路由（不需要认证）
	router.GET("/health/documents/router", routerHandler.GetRouterStatus)
}
