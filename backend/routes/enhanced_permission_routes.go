package routes

import (
	"database/sql"
	
	"ai-project-backend/handlers"
	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// RegisterEnhancedPermissionRoutes registers enhanced permission management routes
func RegisterEnhancedPermissionRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 创建增强权限服务和处理器
	dbConn := app.GetDB().GetDB().(*sql.DB)
	permissionService := services.NewEnhancedPermissionService(dbConn)
	permissionHandler := handlers.NewEnhancedPermissionHandler(permissionService)
	
	// 增强权限路由组
	permissions := authorized.Group("/enhanced-permissions")
	{
		// Role template routes
		permissions.GET("/role-templates", permissionHandler.GetRoleTemplates)
		permissions.GET("/permission-templates", permissionHandler.GetPermissionTemplates)
		permissions.POST("/roles/from-template", permissionHandler.CreateRoleFromTemplate)

		// Permission request routes
		permissions.POST("/request", permissionHandler.RequestPermission)
		permissions.GET("/requests", permissionHandler.GetPermissionRequests)
		permissions.POST("/requests/:id/approve", permissionHandler.ApprovePermissionRequest)
		permissions.POST("/requests/:id/reject", permissionHandler.RejectPermissionRequest)

		// Permission delegation routes
		permissions.POST("/delegate", permissionHandler.DelegatePermissions)
		permissions.GET("/users/:id/delegations", permissionHandler.GetUserDelegations)
		permissions.POST("/delegations/:id/revoke", permissionHandler.RevokeDelegation)

		// Analysis and optimization routes
		permissions.GET("/users/:id/usage-analysis", permissionHandler.AnalyzePermissionUsage)
		permissions.GET("/users/:id/optimization-suggestions", permissionHandler.SuggestRoleOptimization)

		// Dynamic permission check routes
		permissions.POST("/check-dynamic", permissionHandler.CheckDynamicPermission)
	}
}