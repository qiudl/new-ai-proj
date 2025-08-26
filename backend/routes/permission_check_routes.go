package routes

import "github.com/gin-gonic/gin"

// RegisterPermissionCheckRoutes registers minimal permission check endpoints for quick verification
func RegisterPermissionCheckRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	perms := authorized.Group("/permissions")
	{
		// Keep single-check route in system_routes.go; only register batch here to avoid duplicates
		perms.POST("/check/batch", app.GetPermissionHandler().BatchCheckPermissions)
	}
}
