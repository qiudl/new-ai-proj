package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoleManagementRoutesV2 registers RBAC v2 dual-layer role management routes
func RegisterRoleManagementRoutesV2(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Get the RBAC v2 handler
	roleHandlerV2 := app.GetRoleManagementHandlerV2()

	// System Roles (read-only for most users)
	systemRoles := authorized.Group("/system/roles")
	{
		systemRoles.GET("", roleHandlerV2.GetSystemRoles)                        // GET /api/v1/system/roles
		systemRoles.GET("/:roleId/permissions", roleHandlerV2.GetSystemRolePermissions) // GET /api/v1/system/roles/:roleId/permissions
	}

	// Enterprise Roles (full CRUD for enterprise admins)
	enterpriseRoles := authorized.Group("/enterprises/:enterpriseId/roles")
	{
		enterpriseRoles.GET("", roleHandlerV2.GetEnterpriseRoles)                          // GET /api/v1/enterprises/:enterpriseId/roles
		enterpriseRoles.POST("", roleHandlerV2.CreateEnterpriseRole)                       // POST /api/v1/enterprises/:enterpriseId/roles
		enterpriseRoles.GET("/:roleId/permissions", roleHandlerV2.GetEnterpriseRolePermissions) // GET /api/v1/enterprises/:enterpriseId/roles/:roleId/permissions
		enterpriseRoles.PUT("/:roleId", roleHandlerV2.UpdateEnterpriseRole)                // PUT /api/v1/enterprises/:enterpriseId/roles/:roleId
		enterpriseRoles.DELETE("/:roleId", roleHandlerV2.DeleteEnterpriseRole)             // DELETE /api/v1/enterprises/:enterpriseId/roles/:roleId
	}
}
