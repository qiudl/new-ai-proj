package routes

import (
	"ai-project-backend/middleware"
	"log"
	"github.com/gin-gonic/gin"
)

// RegisterSystemRoutes 注册系统管理相关路由
func RegisterSystemRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] RegisterSystemRoutes started")
	
	// Statistics routes
	registerStatisticsRoutes(authorized, app)
	
	// Dashboard routes  
	registerDashboardRoutes(authorized, app)
	
	// Task analysis routes
	registerTaskAnalysisRoutes(authorized, app)
	
	// System management routes (system users only)
	registerSystemManagementRoutes(authorized, app)
	
	// User management routes
	registerUserManagementRoutes(authorized, app)
	
	// Company management routes (new enterprise customer model)
	registerCompanyManagementRoutes(authorized, app)
	
	// Customer management routes (deprecated, use companies instead)
	registerCustomerManagementRoutes(authorized, app)
	
	// Permission management routes
	log.Printf("[DEBUG] About to call registerPermissionManagementRoutes")
	registerPermissionManagementRoutes(authorized, app)
	log.Printf("[DEBUG] registerPermissionManagementRoutes completed")
}

// registerStatisticsRoutes 注册统计相关路由
func registerStatisticsRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Statistics routes
	authorized.GET("/statistics/today-stats", func(c *gin.Context) {
		app.GetStatisticsHandler().HandleTodayStats(c.Writer, c.Request)
	})
}

// registerDashboardRoutes 注册仪表板路由
func registerDashboardRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Dashboard routes
	dashboard := authorized.Group("/dashboard")
	{
		dashboard.GET("/weekly-stats", app.GetDashboardHandler().GetWeeklyStats)
	}
}

// registerTaskAnalysisRoutes 注册任务分析路由
func registerTaskAnalysisRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Task analysis routes
	analysis := authorized.Group("/analysis")
	{
		analysis.GET("/tags/statistics", app.GetTaskAnalysisHandler().GetTagStatistics)
		analysis.POST("/tags/batch-update", app.GetTaskAnalysisHandler().BatchUpdateTags)
		analysis.POST("/tasks/batch-analyze", app.GetTaskAnalysisHandler().BatchAnalyzeTasks)
		analysis.GET("/tags/:taskId", app.GetTaskAnalysisHandler().AnalyzeTaskTags)
		analysis.POST("/reports/weekly", app.GetTaskAnalysisHandler().GenerateWeeklyReport)
		analysis.GET("/environment/nodejs", app.GetTaskAnalysisHandler().GetNodejsEnvironmentStatus)
	}
}

// registerSystemManagementRoutes 注册系统管理路由 (仅系统用户)
func registerSystemManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// System management routes (system users only)
	system := authorized.Group("/system")
	// Apply system user only middleware
	system.Use(middleware.SystemUserOnlyMiddleware())
	{
		// Recycle bin routes
		recycle := system.Group("/recycle")
		{
			recycle.GET("/projects", app.GetRecycledProjectsHandler())
			recycle.GET("/tasks", app.GetRecycledTasksHandler())
			recycle.GET("/documents", app.GetRecycledDocumentsHandler())
			recycle.POST("/projects/:id/restore", app.RestoreProjectHandler())
			recycle.POST("/tasks/:id/restore", app.RestoreTaskHandler())
			recycle.POST("/documents/:id/restore", app.RestoreDocumentHandler())
		}

		// Audit log routes
		audit := system.Group("/audit")
		{
			audit.GET("/logs", app.GetAuditLogsHandler())
			audit.GET("/logs/:id", app.GetAuditLogHandler())
			audit.GET("/stats", app.GetAuditStatsHandler())
			audit.GET("/export", app.ExportAuditLogsHandler())
		}

		// AI configuration routes
		aiConfigs := system.Group("/ai-configs")
		{
			aiConfigs.GET("", app.GetAIConfigHandler().GetAllConfigs)
			aiConfigs.POST("", app.GetAIConfigHandler().CreateConfig)
			aiConfigs.GET("/:provider", app.GetAIConfigHandler().GetConfig)
			aiConfigs.PUT("/:provider", app.GetAIConfigHandler().UpdateConfig)
			aiConfigs.DELETE("/:provider", app.GetAIConfigHandler().DeleteConfig)
			aiConfigs.POST("/:provider/toggle", app.GetAIConfigHandler().ToggleConfig)
			aiConfigs.GET("/enabled", app.GetAIConfigHandler().GetEnabledConfig)
			aiConfigs.GET("/stats", app.GetAIConfigHandler().GetConfigStats)
			aiConfigs.POST("/test", app.GetAIConfigHandler().TestConnection)
			aiConfigs.POST("/generate", app.GetAIConfigHandler().GenerateCompletion)
		}

		// AI task generation routes
		aiTasks := system.Group("/ai-tasks")
		{
			aiTasks.POST("/generate", app.GetAITaskGeneratorHandler().GenerateTasks)
			aiTasks.GET("/templates", app.GetAITaskGeneratorHandler().GetTemplates)
			aiTasks.POST("/templates", app.GetAITaskGeneratorHandler().CreateTemplate)
			// TODO: Implement these methods in ai_task_generator_handler.go
			// aiTasks.PUT("/templates/:id", app.GetAITaskGeneratorHandler().UpdateTemplate)
			// aiTasks.DELETE("/templates/:id", app.GetAITaskGeneratorHandler().DeleteTemplate)
			// aiTasks.POST("/analyze", app.GetAITaskGeneratorHandler().AnalyzeProject)
			// aiTasks.GET("/suggestions/:projectId", app.GetAITaskGeneratorHandler().GetSuggestions)
			// aiTasks.POST("/suggestions/:projectId/apply", app.GetAITaskGeneratorHandler().ApplySuggestions)
			aiTasks.GET("/history", app.GetAITaskGeneratorHandler().GetGenerationHistory)
			// aiTasks.GET("/stats", app.GetAITaskGeneratorHandler().GetGenerationStats)
		}

		// API Key management routes (system users only)
		apiKeys := system.Group("/api-keys")
		{
			apiKeys.GET("", app.GetAPIKeyHandler().ListAPIKeys)
			apiKeys.POST("", app.GetAPIKeyHandler().CreateAPIKey)
			apiKeys.GET("/:id", app.GetAPIKeyHandler().GetAPIKey)
			apiKeys.PUT("/:id", app.GetAPIKeyHandler().UpdateAPIKey)
			apiKeys.DELETE("/:id", app.GetAPIKeyHandler().DeleteAPIKey)
			
			// Key rotation/regeneration
			apiKeys.POST("/:id/rotate", app.GetAPIKeyHandler().RotateAPIKey)
			apiKeys.POST("/:id/regenerate", app.GetAPIKeyHandler().RotateAPIKey) // Alias for frontend compatibility
			
			// Statistics and monitoring
			apiKeys.GET("/:id/stats", app.GetAPIKeyHandler().GetAPIKeyUsageStats) // Usage statistics
			apiKeys.GET("/:id/logs", app.GetAPIKeyHandler().GetAPIKeyLogs)        // Usage logs
			
			// TODO: Implement these methods in api_key_handler.go
			// apiKeys.POST("/:id/activate", app.GetAPIKeyHandler().ActivateAPIKey)
			// apiKeys.POST("/:id/deactivate", app.GetAPIKeyHandler().DeactivateAPIKey)
			// apiKeys.POST("/:id/reset-usage", app.GetAPIKeyHandler().ResetAPIKeyUsage)
		}
	}
}

// registerUserManagementRoutes 注册用户管理路由
func registerUserManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// User profile management routes
	userProfileHandler := app.GetUserProfileHandler()
	
	users := authorized.Group("/users")
	{
		// 个人资料管理
		users.GET("/profile", userProfileHandler.GetUserProfile)
		users.PUT("/profile", userProfileHandler.UpdateUserProfile)
		users.POST("/profile/change-password", userProfileHandler.ChangePassword)
		users.POST("/profile/upload-avatar", userProfileHandler.UploadAvatar)
		users.GET("/profile/statistics", userProfileHandler.GetUserStatistics)
		
		// Google日历集成管理  
		users.GET("/google-connection", app.GetGoogleAuthHandler().GetGoogleConnectionStatus)
		users.DELETE("/google-connection", app.GetGoogleAuthHandler().DisconnectGoogle)
		
		// User role management (admin access required)
		users.POST("/:id/roles", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().AssignUserRole)
		users.DELETE("/:id/roles/:roleId", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().RemoveUserRole)
	}
}

// registerCompanyManagementRoutes 注册公司管理路由
func registerCompanyManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Company management routes (new enterprise customer model)
	companies := authorized.Group("/companies")
	{
		companies.GET("", app.GetCompanyHandler().GetCompanies)
		companies.POST("", app.GetCompanyHandler().CreateCompany)
		companies.GET("/stats", app.GetCompanyHandler().GetCompanyStats)
		companies.GET("/:id", app.GetCompanyHandler().GetCompany)
		companies.PUT("/:id", app.GetCompanyHandler().UpdateCompany)
		companies.DELETE("/:id", app.GetCompanyHandler().DeleteCompany)

		// Company user management routes
		companies.GET("/:id/users", app.GetCompanyHandler().GetCompanyUsers)
		companies.POST("/:id/users", app.GetCompanyHandler().CreateCompanyUser)
		companies.GET("/:id/users/:userId", app.GetCompanyHandler().GetCompanyUser)
		companies.PUT("/:id/users/:userId", app.GetCompanyHandler().UpdateCompanyUser)
		companies.DELETE("/:id/users/:userId", app.GetCompanyHandler().DeleteCompanyUser)
		
		// Company user role and permission management routes
		// companies.POST("/:id/users/:userId/role", app.GetCompanyHandler().AssignUserRole)
		companies.GET("/:id/users/:userId/permissions", app.GetCompanyHandler().GetUserPermissions)
		companies.PUT("/:id/users/:userId/permissions", app.GetCompanyHandler().UpdateUserPermissions)

		// Company contact routes
		companies.GET("/:id/contacts", app.GetCompanyHandler().GetCompanyContacts)
		companies.POST("/:id/contacts", app.GetCompanyHandler().CreateCompanyContact)
	}
}

// registerCustomerManagementRoutes 注册客户管理路由 (已弃用)
func registerCustomerManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Customer management routes (deprecated, use companies instead)
	customers := authorized.Group("/customers")
	{
		customers.GET("", app.GetCustomerHandler().GetCustomers)
		customers.POST("", app.GetCustomerHandler().CreateCustomer)
		customers.GET("/:id", app.GetCustomerHandler().GetCustomer)
		customers.PUT("/:id", app.GetCustomerHandler().UpdateCustomer)
		customers.DELETE("/:id", app.GetCustomerHandler().DeleteCustomer)

		// Customer user association routes
		customers.POST("/:id/users", app.GetCustomerHandler().AddCustomerUser)
		customers.DELETE("/:id/users/:userId", app.GetCustomerHandler().RemoveCustomerUser)

		// Customer contact routes
		customers.GET("/:id/contacts", app.GetCustomerHandler().GetCustomerContacts)
		// customers.POST("/:id/contacts", app.GetCustomerHandler().CreateCustomerContact)
	}
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
	
	// Basic permission management routes (admin access)
	permissions := authorized.Group("/permissions")
	{
		// Permission check endpoint (all authenticated users can check their own permissions)
		permissions.POST("/check", permHandler.CheckUserPermission)
		log.Printf("[DEBUG] Registered POST /permissions/check")

		// Permission list endpoint (admin access required) - 添加缺失的GET端点
		permissions.GET("", middleware.AdminOnlyMiddleware(), permHandler.GetPermissions)
		log.Printf("[DEBUG] Registered GET /permissions")

		// Permission modules management (admin access required)
		permissions.GET("/modules", middleware.AdminOnlyMiddleware(), permHandler.GetPermissionModules)
		permissions.GET("/modules/:module/permissions", middleware.AdminOnlyMiddleware(), permHandler.GetModulePermissions)

		// User permission management endpoints (admin access required)
		permissions.GET("/users/:id", middleware.AdminOnlyMiddleware(), permHandler.GetUserPermissions)
		permissions.PUT("/users/:id", middleware.AdminOnlyMiddleware(), permHandler.UpdateUserPermissions)
		log.Printf("[DEBUG] Registered GET/PUT /permissions/users/:id")

		// User permission trace and overrides (admin access required)
		permissions.GET("/users/:id/trace", middleware.AdminOnlyMiddleware(), permHandler.GetPermissionTrace)
		permissions.POST("/users/:id/overrides", middleware.AdminOnlyMiddleware(), permHandler.SetPermissionOverride)
		permissions.DELETE("/users/:id/overrides/:permissionCode", middleware.AdminOnlyMiddleware(), permHandler.RemovePermissionOverride)
		permissions.GET("/users/:id/overrides", middleware.AdminOnlyMiddleware(), permHandler.GetPermissionOverrides)
		permissions.GET("/users/:id/conflicts", middleware.AdminOnlyMiddleware(), permHandler.AnalyzePermissionConflicts)

		// Permission audit logs (admin access required)
		permissions.GET("/audit-logs", middleware.AdminOnlyMiddleware(), permHandler.GetPermissionAuditLogs)

		// Role management (admin access required)
		permissions.GET("/roles", middleware.AdminOnlyMiddleware(), permHandler.GetRoles)
		permissions.POST("/roles", middleware.AdminOnlyMiddleware(), permHandler.CreateRole)
		permissions.PUT("/roles/:id", middleware.AdminOnlyMiddleware(), permHandler.UpdateRole)
		permissions.DELETE("/roles/:id", middleware.AdminOnlyMiddleware(), permHandler.DeleteRole)
		log.Printf("[DEBUG] Registered role management routes")

		// Role permissions management (admin access required)
		permissions.GET("/roles/:id/permissions", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().GetRolePermissions)
		permissions.POST("/roles/:id/permissions", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().SetRolePermissions)
	}

	// System-level permission management routes (system users only)
	systemPermissions := authorized.Group("/system/permissions")
	systemPermissions.Use(middleware.SystemUserOnlyMiddleware())
	{
		// Advanced permission management endpoints for system users
		// These can be added later for more granular system-level control
	}
}
