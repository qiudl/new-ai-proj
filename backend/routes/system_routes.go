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

	// API密钥管理路由
	registerAPIKeyRoutes(authorized, app)
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

// registerAPIKeyRoutes 注册API密钥管理路由
func registerAPIKeyRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] 开始注册API密钥管理路由")

	// 检查APIKeyHandler是否为nil
	apiKeyHandler := app.GetAPIKeyHandler()
	if apiKeyHandler == nil {
		log.Printf("[ERROR] APIKeyHandler is nil, cannot register API key routes!")
		return
	}
	log.Printf("[DEBUG] APIKeyHandler OK: %p", apiKeyHandler)

	// API密钥系统路由组
	systemGroup := authorized.Group("/system")
	{
		apiKeyGroup := systemGroup.Group("/api-keys")
		{
			// 列表和创建
			apiKeyGroup.GET("", apiKeyHandler.ListAPIKeys)
			apiKeyGroup.POST("", apiKeyHandler.CreateAPIKey)

			// 单个API Key操作
			apiKeyGroup.GET("/:id", apiKeyHandler.GetAPIKey)
			apiKeyGroup.PUT("/:id", apiKeyHandler.UpdateAPIKey)
			apiKeyGroup.DELETE("/:id", apiKeyHandler.DeleteAPIKey)

			// 特殊操作
			apiKeyGroup.POST("/:id/rotate", apiKeyHandler.RotateAPIKey)
			apiKeyGroup.POST("/:id/regenerate", apiKeyHandler.RotateAPIKey) // 别名，兼容前端
			apiKeyGroup.GET("/:id/stats", apiKeyHandler.GetAPIKeyUsageStats)
			apiKeyGroup.GET("/:id/logs", apiKeyHandler.GetAPIKeyLogs)

			// 验证和活跃状态
			apiKeyGroup.POST("/validate", apiKeyHandler.ValidateAPIKey)
			apiKeyGroup.POST("/verify-permission", apiKeyHandler.VerifyPermission)
			apiKeyGroup.GET("/active", apiKeyHandler.GetActiveAPIKeys)
		}
	}

	log.Printf("[DEBUG] API密钥管理路由注册完成")
}
