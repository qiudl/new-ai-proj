package routes

import (
	"ai-project-backend/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterAPIRoutes 注册API管理和其他杂项路由
func RegisterAPIRoutes(router *gin.Engine, authorized *gin.RouterGroup, app ApplicationInterface) {
	// 注意：基础公共路由和Webhook在 Setup 中已注册，这里不再重复注册以避免冲突
	// 注册全局任务路由 (需要认证)
	registerGlobalTaskRoutes(authorized, app)
	// 注册文件管理路由 (需要认证)
	registerFileRoutes(authorized, app)
	// 注册模板管理路由 (需要认证)
	registerTemplateRoutes(authorized, app)
	// 协作与评论相关路由已在 document_routes.go 中注册，这里不重复注册
	// 注册管理员路由 (需要管理员权限)
	registerAdminRoutes(authorized, app)
}

// registerPublicRoutes 注册公共路由 (无需认证)
func registerPublicRoutes(router *gin.Engine, app ApplicationInterface) {
	// Health check and version endpoints (public access)
router.GET("/health", app.GetHealthHandler())
router.GET("/version", app.GetVersionHandler())
router.GET("/documents/health", app.GetUnifiedDocumentHandler().HealthCheck)
}

// registerWebhookRoutes 注册Webhook路由 (无需认证)
func registerWebhookRoutes(router *gin.Engine, app ApplicationInterface) {
	// Webhook endpoints (public access)
	webhooks := router.Group("/api/v1/webhooks")
	{
		webhooks.POST("/google-calendar", app.GetCalendarSyncHandler().GoogleCalendarWebhook)
	}
}

// registerGlobalTaskRoutes 注册全局任务路由
func registerGlobalTaskRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Global tasks routes (all projects) - for compatibility
authorized.GET("/tasks", app.GetAllTasksHandler())
authorized.GET("/tasks/today", app.GetTodayTasksHandler())
authorized.GET("/tasks/today/stats", app.GetTodayTasksStatsHandler())
authorized.POST("/tasks/today/bulk", app.BulkOperationTodayTasksHandler())
authorized.POST("/tasks/:id/complete", app.MarkTodayTaskCompletedHandler())
authorized.POST("/tasks/:id/postpone", app.PostponeTodayTaskHandler())
authorized.POST("/tasks/validate-parent", app.ValidateParentHandler())
}

// registerFileRoutes 注册文件管理路由
func registerFileRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// File download routes
	files := authorized.Group("/files")
	{
		files.GET("/download", app.FileDownloadHandler())
	}
}

// registerTemplateRoutes 注册模板管理路由
func registerTemplateRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 全局模板管理路由
	templates := authorized.Group("/templates")
	{
		templates.GET("", app.GetSmartTemplateHandler().GetTemplates)
		templates.POST("", app.GetSmartTemplateHandler().CreateTemplate)
		templates.GET("/stats", app.GetSmartTemplateHandler().GetTemplateStats)
		templates.GET("/:id", app.GetSmartTemplateHandler().GetTemplateByID)
		templates.POST("/:id/generate", app.GetSmartTemplateHandler().GenerateFromTemplate)
	}
}

// registerCollaborationRoutes 注册协作管理路由
func registerCollaborationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 全局文档协作路由
	collaboration := authorized.Group("/collaboration")
	{
		collaboration.GET("/dashboard", app.GetCollaborationHandler().GetUserCollaborationDashboard)
	}
}

// registerCommentRoutes 注册评论管理路由
func registerCommentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 评论管理路由
	comments := authorized.Group("/comments")
	{
		comments.PUT("/:id", app.GetCollaborationHandler().UpdateComment)
		comments.DELETE("/:id", app.GetCollaborationHandler().DeleteComment)
		comments.PATCH("/:id/resolve", app.GetCollaborationHandler().ResolveComment)
	}
}

// registerAdminRoutes 注册管理员路由 (需要管理员权限)
func registerAdminRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Admin user management routes (admin only - system users with admin role)
	admin := authorized.Group("/admin")
	// Apply system user only middleware and admin role restriction
	admin.Use(middleware.SystemUserOnlyMiddleware())
	admin.Use(middleware.AdminOnlyMiddleware())
	{
		// User management (admin only)
		registerAdminUserManagementRoutes(admin, app)
		
		// Company user management (admin only) 
		registerAdminCompanyUserRoutes(admin, app)
		
		// Calendar sync management (admin only)
		registerAdminCalendarSyncRoutes(admin, app)
	}
}

// registerAdminUserManagementRoutes 注册管理员用户管理路由
func registerAdminUserManagementRoutes(admin *gin.RouterGroup, app ApplicationInterface) {
	adminUsers := admin.Group("/users")
	// Additional role-based access control for user management operations
	adminUsers.Use(middleware.RoleBasedAccessMiddleware("admin"))
	{
		adminUsers.GET("", app.GetUserManagementHandler().GetUserList)
		adminUsers.POST("", app.GetUserManagementHandler().CreateUser)
		adminUsers.GET("/stats", app.GetUserManagementHandler().GetUserStats)
		adminUsers.GET("/export", app.GetUserManagementHandler().ExportUsers)
		adminUsers.POST("/batch", app.GetUserManagementHandler().BatchUpdateUsers)
		adminUsers.GET("/:id", app.GetUserManagementHandler().GetUser)
		adminUsers.PUT("/:id", app.GetUserManagementHandler().UpdateUser)
		adminUsers.DELETE("/:id", app.GetUserManagementHandler().DeleteUser)
		adminUsers.POST("/:id/reset-password", app.GetUserManagementHandler().ResetUserPassword)
		adminUsers.PUT("/:id/status", app.GetUserManagementHandler().UpdateUserStatus)
	}
}

// registerAdminCompanyUserRoutes 注册管理员公司用户管理路由
func registerAdminCompanyUserRoutes(admin *gin.RouterGroup, app ApplicationInterface) {
	companyUsers := admin.Group("/company-users")
	companyUsers.Use(middleware.RoleBasedAccessMiddleware("admin"))
	{
		companyUsers.GET("", app.GetCompanyUserHandler().GetCompanyUserList)
		companyUsers.POST("", app.GetCompanyUserHandler().CreateCompanyUser)
		companyUsers.GET("/stats", app.GetCompanyUserHandler().GetCompanyUserStats)
		companyUsers.POST("/batch", app.GetCompanyUserHandler().BatchUpdateCompanyUsers)
		companyUsers.GET("/:id", app.GetCompanyUserHandler().GetCompanyUser)
		companyUsers.PUT("/:id", app.GetCompanyUserHandler().UpdateCompanyUser)
		companyUsers.PUT("/:id/status", app.GetCompanyUserHandler().UpdateCompanyUserStatus)
		companyUsers.DELETE("/:id", app.GetCompanyUserHandler().DeleteCompanyUser)
	}
}

// registerAdminCalendarSyncRoutes 注册管理员日历同步管理路由
func registerAdminCalendarSyncRoutes(admin *gin.RouterGroup, app ApplicationInterface) {
	calendarSyncAdmin := admin.Group("/calendar-sync")
	calendarSyncAdmin.Use(middleware.RoleBasedAccessMiddleware("admin"))
	{
		calendarSyncAdmin.POST("/process-queue", app.GetCalendarSyncHandler().ProcessSyncQueue)
		calendarSyncAdmin.GET("/queue-status", app.GetCalendarSyncHandler().GetSyncQueueStatus)
	}
}