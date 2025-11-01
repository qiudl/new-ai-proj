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

	// 系统管理员权限管理路由
	registerSystemAdminRoutes(authorized, app)

	// 审计日志路由
	registerAuditRoutes(authorized, app)

	// 导航管理路由
	registerNavigationRoutes(authorized, app)
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
			// 获取单条测试日志详情 - 使用单独的子组避免与 /:provider 参数冲突
			testLogsGroup := aiConfigGroup.Group("/test-logs")
			{
				testLogsGroup.GET("/:id", middleware.RequireView(), aiConfigHandler.GetTestLogDetail)
			}

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

// registerSystemAdminRoutes 注册系统管理员权限管理路由
func registerSystemAdminRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] 开始注册系统管理员权限管理路由")

	// 检查SystemAdminHandler是否为nil
	systemAdminHandler := app.GetSystemAdminHandler()
	if systemAdminHandler == nil {
		log.Printf("[ERROR] SystemAdminHandler is nil, cannot register system admin routes!")
		return
	}
	log.Printf("[DEBUG] SystemAdminHandler OK: %p", systemAdminHandler)

	// 系统管理员路由组 - 所有路由都在 /system/admins 下
	systemGroup := authorized.Group("/system")
	{
		adminsGroup := systemGroup.Group("/admins")
		{
			// ========== 授予和撤销权限 ==========
			// 授予完整的系统管理员权限（需要自定义admin_scopes）
			adminsGroup.POST("/grant", middleware.RequireAdminPermission(), systemAdminHandler.GrantSystemAdmin)

			// 授予范围限定的系统管理员权限（简化版，自动构建admin_scopes）
			adminsGroup.POST("/grant-scoped", middleware.RequireAdminPermission(), systemAdminHandler.GrantScopedAdmin)

			// 撤销系统管理员权限
			adminsGroup.POST("/revoke", middleware.RequireAdminPermission(), systemAdminHandler.RevokeSystemAdmin)

			// ========== 查询管理员信息 ==========
			// 获取所有系统管理员列表
			adminsGroup.GET("", middleware.RequireView(), systemAdminHandler.ListSystemAdmins)

			// 检查当前用户是否为系统管理员
			adminsGroup.GET("/check", systemAdminHandler.CheckCurrentUser)

			// 获取指定管理员可访问的项目列表
			adminsGroup.GET("/:id/accessible-projects", middleware.RequireView(), systemAdminHandler.GetAccessibleProjects)

			// ========== 审计日志 ==========
			// 获取系统管理员操作审计日志
			adminsGroup.GET("/audit-logs", middleware.RequireView(), systemAdminHandler.GetAuditLogs)
		}
	}

	log.Printf("[DEBUG] 系统管理员权限管理路由注册完成")
}

// registerAuditRoutes 注册审计日志路由
func registerAuditRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] 开始注册审计日志路由")

	// 检查AuditHandler是否为nil
	auditHandler := app.GetAuditHandler()
	if auditHandler == nil {
		log.Printf("[ERROR] AuditHandler is nil, cannot register audit routes!")
		return
	}
	log.Printf("[DEBUG] AuditHandler OK: %p", auditHandler)

	// 系统审计日志路由组 - 所有路由都在 /system/audit 下
	systemGroup := authorized.Group("/system")
	{
		auditGroup := systemGroup.Group("/audit")
		{
			// ========== 审计日志查询 ==========
			// 获取审计日志列表（支持筛选和分页）
			auditGroup.GET("/logs", middleware.RequireView(), auditHandler.GetAuditLogs)

			// 获取单条审计日志详情
			auditGroup.GET("/logs/:id", middleware.RequireView(), auditHandler.GetAuditLog)

			// 导出审计日志（CSV格式）
			auditGroup.GET("/logs/export", middleware.RequireView(), auditHandler.ExportAuditLogs)
		}
	}

	log.Printf("[DEBUG] 审计日志路由注册完成")
}

// registerNavigationRoutes 注册导航管理路由
func registerNavigationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] 开始注册导航管理路由")

	// 检查NavigationHandler是否为nil
	navHandler := app.GetNavigationHandler()
	if navHandler == nil {
		log.Printf("[ERROR] NavigationHandler is nil, cannot register navigation routes!")
		return
	}
	log.Printf("[DEBUG] NavigationHandler OK: %p", navHandler)

	// 系统导航管理路由组
	systemGroup := authorized.Group("/system")
	{
		// 菜单项管理
		systemGroup.GET("/menu-items", navHandler.GetMenuItems)
		systemGroup.GET("/menu-items/:id", navHandler.GetMenuItem)
		systemGroup.POST("/menu-items", navHandler.CreateMenuItem)
		systemGroup.PUT("/menu-items/:id", navHandler.UpdateMenuItem)
		systemGroup.DELETE("/menu-items/:id", navHandler.DeleteMenuItem)
		systemGroup.POST("/menu-items/reorder", navHandler.ReorderMenuItems)

		// 菜单分组管理
		systemGroup.GET("/menu-groups", navHandler.GetMenuGroups)
		systemGroup.GET("/menu-groups/:id", navHandler.GetMenuGroup)
		systemGroup.POST("/menu-groups", navHandler.CreateMenuGroup)
		systemGroup.PUT("/menu-groups/:id", navHandler.UpdateMenuGroup)
		systemGroup.DELETE("/menu-groups/:id", navHandler.DeleteMenuGroup)

		// 路由配置管理
		systemGroup.GET("/routes", navHandler.GetRoutes)
		systemGroup.GET("/routes/:id", navHandler.GetRoute)
		systemGroup.POST("/routes", navHandler.CreateRoute)
		systemGroup.PUT("/routes/:id", navHandler.UpdateRoute)
		systemGroup.DELETE("/routes/:id", navHandler.DeleteRoute)

		// 导航配置和统计
		navConfigGroup := systemGroup.Group("/navigation-config")
		{
			navConfigGroup.GET("/stats", navHandler.GetNavigationStats)
		}
	}

	log.Printf("[DEBUG] 导航管理路由注册完成")
}
