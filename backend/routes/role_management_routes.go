package routes

import (
	"ai-project-backend/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterRoleManagementRoutes registers role management routes under /api/v1/roles
func RegisterRoleManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	roles := authorized.Group("/roles")
	// Admin-only access
	roles.Use(middleware.RoleBasedAccessMiddleware("admin"))
	{
		// Basic CRUD
		roles.GET("", app.GetRoleManagementHandler().GetRoles)
		roles.POST("", app.GetRoleManagementHandler().CreateRole)
		roles.GET("/:id", app.GetRoleManagementHandler().GetRole)
		roles.PUT("/:id", app.GetRoleManagementHandler().UpdateRole)
		roles.DELETE("/:id", app.GetRoleManagementHandler().DeleteRole)
		roles.PATCH("/:id/status", app.GetRoleManagementHandler().UpdateRoleStatus)

		// Permissions management for role
		roles.GET("/:id/permissions", app.GetRoleManagementHandler().GetRolePermissions)
		roles.POST("/:id/permissions", app.GetRoleManagementHandler().SetRolePermissions)
		roles.PATCH("/:id/permissions", app.GetRoleManagementHandler().UpdateRolePermissions)
		roles.DELETE("/:id/permissions/:permissionId", app.GetRoleManagementHandler().RemoveRolePermission)
	}
}
