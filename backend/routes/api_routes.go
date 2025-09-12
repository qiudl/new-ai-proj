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
	// 注意：/documents/health 已在 document_routes.go 中注册了包含一致性指标的版本，这里不要重复注册以避免覆盖
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
	// 注意：/tasks路由已在RegisterTaskRoutes中注册，避免重复注册
	// Global tasks routes (all projects) - for compatibility
	// authorized.GET("/tasks", app.GetAllTasksHandler()) // 重复路由，已在task_routes.go中注册

	// TODO: 以下handler方法需要实现
	// authorized.GET("/tasks/today", app.GetTodayTasksHandler())
	// authorized.GET("/tasks/today/stats", app.GetTodayTasksStatsHandler())
	// authorized.POST("/tasks/today/bulk", app.BulkOperationTodayTasksHandler())
	// authorized.POST("/tasks/:task_id/complete", app.MarkTodayTaskCompletedHandler())
	// authorized.POST("/tasks/:task_id/postpone", app.PostponeTodayTaskHandler())
	// authorized.POST("/tasks/validate-parent", app.ValidateParentHandler())
	// Task progress endpoint
	// authorized.GET("/tasks/:task_id/progress", app.GetTaskProgressHandler())

	// 分析埋点回传（前端 fire-and-forget）
	// TODO: 以下handler方法需要实现
	// authorized.POST("/analytics/events", app.GetAnalyticsHandler().IngestEvents)
	// KPI 查询占位
	// authorized.GET("/analytics/kpi/:name", app.GetAnalyticsHandler().GetKPI)
}

// registerFileRoutes 注册文件管理路由
func registerFileRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// File download routes
	// files := authorized.Group("/files")
	// {
	// TODO: FileDownloadHandler方法需要实现
	// files.GET("/download", app.FileDownloadHandler())
	// }
}

// registerTemplateRoutes 注册模板管理路由
func registerTemplateRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 全局模板管理路由
	// templates := authorized.Group("/templates")
	// {
	// TODO: GetSmartTemplateHandler方法需要实现
	// templates.GET("", app.GetSmartTemplateHandler().GetTemplates)
	// templates.POST("", app.GetSmartTemplateHandler().CreateTemplate)
	// templates.GET("/stats", app.GetSmartTemplateHandler().GetTemplateStats)
	// templates.GET("/:id", app.GetSmartTemplateHandler().GetTemplateByID)
	// templates.POST("/:id/generate", app.GetSmartTemplateHandler().GenerateFromTemplate)
	// }
}

// registerCollaborationRoutes 注册协作管理路由
func registerCollaborationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 全局文档协作路由
	// collaboration := authorized.Group("/collaboration")
	// {
	// TODO: GetCollaborationHandler方法需要实现
	// collaboration.GET("/dashboard", app.GetCollaborationHandler().GetUserCollaborationDashboard)
	// }
}

// registerCommentRoutes 注册评论管理路由
func registerCommentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 评论管理路由
	// comments := authorized.Group("/comments")
	// {
	// TODO: GetCollaborationHandler方法需要实现
	// comments.PUT("/:id", app.GetCollaborationHandler().UpdateComment)
	// comments.DELETE("/:id", app.GetCollaborationHandler().DeleteComment)
	// comments.PATCH("/:id/resolve", app.GetCollaborationHandler().ResolveComment)
	// }
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

		// Company user management (admin only) - temporarily disabled due to missing interface
		// registerAdminCompanyUserRoutes(admin, app)

		// Calendar sync management (admin only) - keeping commented for now
		// registerAdminCalendarSyncRoutes(admin, app)
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
		adminUsers.GET("/:id/projects", app.GetUserManagementHandler().GetUserProjects)
		adminUsers.GET("/:id/activity", app.GetUserManagementHandler().GetUserActivityLog)
	}
}

/* Temporarily disabled due to missing interface
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
*/

// Temporarily commenting out calendar sync routes that might have compilation issues
/*

// registerAdminCalendarSyncRoutes 注册管理员日历同步管理路由
func registerAdminCalendarSyncRoutes(admin *gin.RouterGroup, app ApplicationInterface) {
	calendarSyncAdmin := admin.Group("/calendar-sync")
	calendarSyncAdmin.Use(middleware.RoleBasedAccessMiddleware("admin"))
	{
		calendarSyncAdmin.POST("/process-queue", app.GetCalendarSyncHandler().ProcessSyncQueue)
		calendarSyncAdmin.GET("/queue-status", app.GetCalendarSyncHandler().GetSyncQueueStatus)
	}
}

// registerProgressRoutesHere registers progress calculation routes directly
func registerProgressRoutesHere(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Only register if handler is available
	if app.GetProgressHandler() == nil {
		return
	}

	// Progress routes group
	progress := authorized.Group("/progress")
	{
		// Get progress configuration
		progress.GET("/config", app.GetProgressHandler().GetProgressConfig)
		// Calculate progress for an entity
		progress.GET("/:entityType/:id", app.GetProgressHandler().GetProgress)
		// Get historical snapshots
		progress.GET("/:entityType/:id/snapshots", app.GetProgressHandler().GetProgressSnapshots)
		// Force recalculation
		progress.POST("/recompute", app.GetProgressHandler().RecomputeProgress)
	}
}
*/
