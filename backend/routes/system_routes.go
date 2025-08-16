package routes

import (
	"ai-project-backend/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterSystemRoutes 注册系统管理相关路由
func RegisterSystemRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
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
	registerPermissionManagementRoutes(authorized, app)
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
			// TODO: Implement these methods in api_key_handler.go
			// apiKeys.POST("/:id/regenerate", app.GetAPIKeyHandler().RegenerateAPIKey)
			// apiKeys.POST("/:id/activate", app.GetAPIKeyHandler().ActivateAPIKey)
			// apiKeys.POST("/:id/deactivate", app.GetAPIKeyHandler().DeactivateAPIKey)
			// apiKeys.GET("/:id/usage", app.GetAPIKeyHandler().GetAPIKeyUsage)
			// apiKeys.POST("/:id/reset-usage", app.GetAPIKeyHandler().ResetAPIKeyUsage)
		}
	}
}

// registerUserManagementRoutes 注册用户管理路由
func registerUserManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// User management routes
	users := authorized.Group("/users")
	{
		// TODO: Implement user profile handlers
		// users.GET("/profile", app.GetUserProfileHandler())           // No permission needed for own profile
		// users.PUT("/profile", app.UpdateUserProfileHandler())       // No permission needed for own profile
		// users.PUT("/password", app.ChangePasswordHandler())         // No permission needed for own password
		
		// Google日历集成管理
		users.GET("/google-connection", app.GetGoogleAuthHandler().GetGoogleConnectionStatus)
		users.DELETE("/google-connection", app.GetGoogleAuthHandler().DisconnectGoogle)
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
	// Permission management routes (system users with appropriate roles)
	permissions := authorized.Group("/permissions")
	// Most permission operations require system user access
	permissions.Use(middleware.SystemUserOnlyMiddleware())
	{
		// Role management (require admin permissions)
		permissions.GET("/roles", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().GetRoles)
		permissions.POST("/roles", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().CreateRole)
		permissions.PUT("/roles/:id", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().UpdateRole)
		permissions.DELETE("/roles/:id", middleware.AdminOnlyMiddleware(), app.GetPermissionHandler().DeleteRole)

		// User permission assignment (require user management permissions)
		// TODO: Implement PermissionUserManagement constant and AssignUserRole method
		// permissions.GET("/users/:userId", middleware.RequirePermission(models.PermissionUserManagement), app.GetPermissionHandler().GetUserPermissions)
		// permissions.PUT("/users/:userId", middleware.RequirePermission(models.PermissionUserManagement), app.GetPermissionHandler().UpdateUserPermissions)
		// permissions.POST("/users/:userId/roles", middleware.RequirePermission(models.PermissionUserManagement), app.GetPermissionHandler().AssignUserRole)
		// permissions.DELETE("/users/:userId/roles/:roleId", middleware.RequirePermission(models.PermissionUserManagement), app.GetPermissionHandler().RemoveUserRole)

		// Permission validation and checking (available to all system users)
		// TODO: Implement these permission validation methods
		// permissions.GET("/check", app.GetPermissionHandler().CheckPermissions)
		// permissions.GET("/validate", app.GetPermissionHandler().ValidatePermissions)
		// permissions.GET("/list", app.GetPermissionHandler().ListAllPermissions)
	}
}