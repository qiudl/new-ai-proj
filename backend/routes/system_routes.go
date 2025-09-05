package routes

import (
	"github.com/gin-gonic/gin"
	"log"
)

// RegisterSystemRoutes 注册系统管理相关路由（简化版）
func RegisterSystemRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] RegisterSystemRoutes started (simplified for role permission testing)")

	// 权限管理路由 - 这是我们需要测试的核心功能
	registerPermissionManagementRoutes(authorized, app)
	
	// AI配置管理路由
	registerAIConfigRoutes(authorized, app)
}

// registerPermissionManagementRoutes 注册权限管理路由
func registerPermissionManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] 开始注册权限管理路由")

	// 检查PermissionHandler是否为nil
	permHandler := app.GetPermissionHandler()
	if permHandler == nil {
		log.Printf("[ERROR] PermissionHandler is nil, cannot register permission routes!")
		return
	}
	log.Printf("[DEBUG] PermissionHandler OK: %p", permHandler)

	// 注意：权限检查路由已在 permission_routes.go 中注册，避免重复注册
	log.Printf("[DEBUG] Permission check routes already registered in permission_routes.go")
}

// registerAIConfigRoutes 注册AI配置管理路由
func registerAIConfigRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] 开始注册AI配置管理路由")

	// 检查AIConfigHandler是否为nil
	aiConfigHandler := app.GetAIConfigHandler()
	if aiConfigHandler == nil {
		log.Printf("[ERROR] AIConfigHandler is nil, cannot register AI config routes!")
		return
	}
	log.Printf("[DEBUG] AIConfigHandler OK: %p", aiConfigHandler)

	// AI配置系统路由组
	systemGroup := authorized.Group("/system")
	{
		aiConfigGroup := systemGroup.Group("/ai-configs")
		{
			// 获取启用的AI配置 - 公司创建页面需要的API
			aiConfigGroup.GET("/enabled", aiConfigHandler.GetEnabledConfig)
			
			// 获取AI配置统计 - 公司创建页面需要的API
			aiConfigGroup.GET("/stats", aiConfigHandler.GetConfigStats)
			
			// 完整的AI配置CRUD操作
			aiConfigGroup.GET("", aiConfigHandler.GetAllConfigs)
			aiConfigGroup.POST("", aiConfigHandler.CreateConfig)
			aiConfigGroup.GET("/:provider", aiConfigHandler.GetConfig)
			aiConfigGroup.PUT("/:provider", aiConfigHandler.UpdateConfig)
			aiConfigGroup.DELETE("/:provider", aiConfigHandler.DeleteConfig)
			
			// AI连接测试
			aiConfigGroup.POST("/test", aiConfigHandler.TestConnection)
			
			// 切换启用状态
			aiConfigGroup.PATCH("/:provider/toggle", aiConfigHandler.ToggleConfig)
		}
	}
	
	log.Printf("[DEBUG] AI配置管理路由注册完成")
}
