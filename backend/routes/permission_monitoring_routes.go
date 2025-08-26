package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterPermissionMonitoringRoutes registers permission monitoring and analytics routes
func RegisterPermissionMonitoringRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Get permission monitoring handler
	handler := app.GetPermissionMonitoringHandler()
	if handler == nil {
		return // Skip if handler is not available
	}

	// Permission monitoring routes group - requires admin access
	monitoring := authorized.Group("/permissions/monitoring")
	monitoring.Use(app.GetUnifiedPermissionManager().CreatePermissionMiddleware("admin.permissions.monitor"))
	{
		// System statistics and health
		monitoring.GET("/stats", handler.GetPermissionStats)
		monitoring.GET("/health", handler.GetPermissionHealth)
		monitoring.GET("/analytics", handler.GetPermissionAnalytics)
		
		// Cache management
		monitoring.GET("/cache/stats", handler.GetCacheStats)
		
		// User-specific monitoring
		userMonitoring := monitoring.Group("/users")
		{
			// Individual user permission operations
			userMonitoring.GET("/:company_user_id/profile", handler.GetUserPermissionProfile)
			userMonitoring.GET("/:company_user_id/recommendations", handler.GetPermissionRecommendations)
			userMonitoring.POST("/:company_user_id/cache/prewarm", handler.PrewarmUserCache)
			userMonitoring.DELETE("/:company_user_id/cache", handler.InvalidateUserCache)
			userMonitoring.POST("/:company_user_id/validate", handler.ValidatePredictionAccuracy)
		}
		
		// Permission testing endpoints
		monitoring.POST("/test", handler.TestPermissionMiddleware)
	}

	// Permission check endpoints - requires appropriate permissions
	permissions := authorized.Group("/permissions")
	{
		// Single permission check
		permissions.GET("/check/:company_user_id", 
			app.GetUnifiedPermissionManager().CreatePermissionMiddleware("permissions.check"),
			handler.CheckUserPermission)
		
		// Batch permission check
		permissions.POST("/check/batch",
			app.GetUnifiedPermissionManager().CreatePermissionMiddleware("permissions.check"),
			handler.CheckBatchPermissions)
	}
}

// RegisterEnhancedPermissionRoutes registers enhanced permission management routes
func RegisterEnhancedPermissionRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Enhanced permission routes group
	enhancedPerms := authorized.Group("/enhanced-permissions")
	enhancedPerms.Use(app.GetUnifiedPermissionManager().CreatePermissionMiddleware("admin.permissions.manage"))
	{
		// Permission analysis and insights
		enhancedPerms.GET("/insights", app.GetEnhancedPermissionHandler().GetPermissionInsights)
		enhancedPerms.GET("/correlations", app.GetEnhancedPermissionHandler().GetPermissionCorrelations)
		enhancedPerms.GET("/usage-patterns", app.GetEnhancedPermissionHandler().GetUsagePatterns)
		
		// Permission optimization recommendations
		enhancedPerms.GET("/optimization", app.GetEnhancedPermissionHandler().GetOptimizationRecommendations)
		enhancedPerms.POST("/optimization/apply", app.GetEnhancedPermissionHandler().ApplyOptimizations)
		
		// Bulk permission operations
		enhancedPerms.POST("/bulk/check", app.GetEnhancedPermissionHandler().BulkPermissionCheck)
		enhancedPerms.POST("/bulk/update", app.GetEnhancedPermissionHandler().BulkPermissionUpdate)
		enhancedPerms.POST("/bulk/validate", app.GetEnhancedPermissionHandler().BulkValidatePermissions)
		
		// Permission templates and presets
		enhancedPerms.GET("/templates", app.GetEnhancedPermissionHandler().GetPermissionTemplates)
		enhancedPerms.POST("/templates", app.GetEnhancedPermissionHandler().CreatePermissionTemplate)
		enhancedPerms.GET("/templates/:id", app.GetEnhancedPermissionHandler().GetPermissionTemplate)
		enhancedPerms.PUT("/templates/:id", app.GetEnhancedPermissionHandler().UpdatePermissionTemplate)
		enhancedPerms.DELETE("/templates/:id", app.GetEnhancedPermissionHandler().DeletePermissionTemplate)
		enhancedPerms.POST("/templates/:id/apply", app.GetEnhancedPermissionHandler().ApplyPermissionTemplate)
		
		// Role-based permission analysis
		enhancedPerms.GET("/roles/:role_id/analysis", app.GetEnhancedPermissionHandler().AnalyzeRolePermissions)
		enhancedPerms.GET("/roles/:role_id/suggestions", app.GetEnhancedPermissionHandler().GetRolePermissionSuggestions)
		enhancedPerms.POST("/roles/:role_id/optimize", app.GetEnhancedPermissionHandler().OptimizeRolePermissions)
		
		// Project-specific permission management
		enhancedPerms.GET("/projects/:project_id/permissions", app.GetEnhancedPermissionHandler().GetProjectPermissions)
		enhancedPerms.POST("/projects/:project_id/permissions/analyze", app.GetEnhancedPermissionHandler().AnalyzeProjectPermissions)
		enhancedPerms.PUT("/projects/:project_id/permissions/optimize", app.GetEnhancedPermissionHandler().OptimizeProjectPermissions)
		
		// Permission migration and backup
		enhancedPerms.GET("/export", app.GetEnhancedPermissionHandler().ExportPermissions)
		enhancedPerms.POST("/import", app.GetEnhancedPermissionHandler().ImportPermissions)
		enhancedPerms.POST("/backup", app.GetEnhancedPermissionHandler().BackupPermissions)
		enhancedPerms.POST("/restore", app.GetEnhancedPermissionHandler().RestorePermissions)
		
		// Permission auditing and compliance
		enhancedPerms.GET("/audit", app.GetEnhancedPermissionHandler().GetPermissionAuditLog)
		enhancedPerms.GET("/compliance", app.GetEnhancedPermissionHandler().GetComplianceReport)
		enhancedPerms.POST("/compliance/scan", app.GetEnhancedPermissionHandler().RunComplianceScan)
		
		// Advanced permission queries
		enhancedPerms.POST("/query", app.GetEnhancedPermissionHandler().QueryPermissions)
		enhancedPerms.POST("/search", app.GetEnhancedPermissionHandler().SearchPermissions)
		enhancedPerms.GET("/hierarchy", app.GetEnhancedPermissionHandler().GetPermissionHierarchy)
	}
}
