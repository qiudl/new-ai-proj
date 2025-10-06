package routes

import (
	"ai-project-backend/middleware"
	"time"

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

	// 创建权限中间件实例
	permMiddleware := middleware.NewAIConfigPermissionMiddleware()

	// 创建AI配置专用频率限制器
	aiConfigRateLimiter := middleware.AIConfigRateLimiter()
	// 启动定期清理（每10分钟清理一次）
	aiConfigRateLimiter.Cleanup(10 * time.Minute)

	// AI配置系统路由组
	systemGroup := authorized.Group("/system")
	{
		// 应用频率限制到AI配置路由组
		aiConfigGroup := systemGroup.Group("/ai-configs", aiConfigRateLimiter.Middleware())
		{
			// ========== 基础查看权限 ==========
			// 获取所有启用的AI配置列表 - 前端下拉框使用
			aiConfigGroup.GET("/enabled", middleware.RequireView(), aiConfigHandler.GetEnabledConfigs)

			// 获取AI配置统计 - 需要统计查看权限
			aiConfigGroup.GET("/stats", permMiddleware.RequireAnyPermission(
				"ai_config:view_stats",
				"ai_config:view",
			), aiConfigHandler.GetConfigStats)

			// 完整的AI配置CRUD操作
			aiConfigGroup.GET("", middleware.RequireView(), aiConfigHandler.GetAllConfigs)
			aiConfigGroup.POST("", middleware.RequireCreate(), aiConfigHandler.CreateConfig)

			// ========== 测试历史查询 (Task #2780) ==========
			// 获取单条测试日志详情 - 静态路径，需要在 /:provider 之前
			aiConfigGroup.GET("/test-logs/:id", middleware.RequireView(), aiConfigHandler.GetTestLogDetail)

			// 按provider操作
			aiConfigGroup.GET("/:provider", middleware.RequireView(), aiConfigHandler.GetConfig)
			aiConfigGroup.PUT("/:provider", middleware.RequireUpdate(), aiConfigHandler.UpdateConfig)
			aiConfigGroup.DELETE("/:provider", middleware.RequireDelete(), aiConfigHandler.DeleteConfig)

			// 获取指定provider的测试历史 - 子路径，在 /:provider 之后
			aiConfigGroup.GET("/:provider/test-history", middleware.RequireView(), aiConfigHandler.GetTestHistory)

			// ========== AI连接测试权限 ==========
			aiConfigGroup.POST("/test", permMiddleware.RequireAnyPermission(
				"ai_config:test",
				"ai_config:admin_all",
			), aiConfigHandler.TestConnection)

			// ========== 切换启用状态权限 ==========
			aiConfigGroup.PATCH("/:provider/toggle", permMiddleware.RequireAnyPermission(
				"ai_config:toggle",
				"ai_config:admin_all",
			), aiConfigHandler.ToggleConfig)

			// ========== API密钥轮换和过期管理路由 ==========
			// 检查所有密钥的过期状态 - 需要检查过期权限
			aiConfigGroup.GET("/expiry-status", permMiddleware.RequireAnyPermission(
				"ai_config:check_expiry",
				"ai_config:admin_all",
			), aiConfigHandler.CheckExpiredKeys)

			// 自动禁用所有过期的密钥 - 需要管理员权限
			aiConfigGroup.POST("/auto-disable-expired", middleware.RequireAdminPermission(), aiConfigHandler.AutoDisableExpiredKeys)

			// 发送即将过期的警告 - 需要管理员权限
			aiConfigGroup.POST("/send-expiry-warnings", middleware.RequireAdminPermission(), aiConfigHandler.SendExpiryWarnings)

			// ========== 单个配置的密钥轮换操作 ==========
			// 密钥轮换 - 需要轮换密钥权限
			aiConfigGroup.POST("/:provider/rotate-key", middleware.RequireRotateKey(), aiConfigHandler.RotateAPIKey)

			// 查看轮换历史 - 需要查看轮换历史权限
			aiConfigGroup.GET("/:provider/rotation-history", permMiddleware.RequireAnyPermission(
				"ai_config:view_rotation_history",
				"ai_config:admin_all",
			), aiConfigHandler.GetRotationHistory)

			// 查看过期通知 - 需要查看轮换历史权限
			aiConfigGroup.GET("/:provider/expiry-notifications", permMiddleware.RequireAnyPermission(
				"ai_config:view_rotation_history",
				"ai_config:admin_all",
			), aiConfigHandler.GetExpiryNotifications)

			// ========== 密钥过期管理 ==========
			// 设置密钥过期时间 - 需要管理过期权限
			aiConfigGroup.POST("/:provider/set-expiry", middleware.RequireManageExpiry(), aiConfigHandler.SetAPIKeyExpiry)

			// ========== 自动轮换控制 ==========
			// 启用自动轮换 - 需要自动轮换权限
			aiConfigGroup.POST("/:provider/enable-auto-rotation", permMiddleware.RequireAnyPermission(
				"ai_config:auto_rotate",
				"ai_config:admin_all",
			), aiConfigHandler.EnableAutoRotation)

			// 禁用自动轮换 - 需要自动轮换权限
			aiConfigGroup.POST("/:provider/disable-auto-rotation", permMiddleware.RequireAnyPermission(
				"ai_config:auto_rotate",
				"ai_config:admin_all",
			), aiConfigHandler.DisableAutoRotation)
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
