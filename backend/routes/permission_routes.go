package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterPermissionRoutes 注册基础权限路由
func RegisterPermissionRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 权限路由组
	permissions := authorized.Group("/permissions")
	{
		// 权限管理
		permissions.GET("", app.GetPermissionHandler().GetPermissions)
		permissions.GET("/modules", app.GetPermissionHandler().GetPermissionModules)
		permissions.GET("/modules/:module/permissions", app.GetPermissionHandler().GetModulePermissions)

		// 角色管理
		permissions.GET("/roles", app.GetPermissionHandler().GetRoles)
		permissions.POST("/roles", app.GetPermissionHandler().CreateRole)
		permissions.PUT("/roles/:id", app.GetPermissionHandler().UpdateRole)
		permissions.DELETE("/roles/:id", app.GetPermissionHandler().DeleteRole)
		permissions.GET("/roles/:id/permissions", app.GetPermissionHandler().GetRolePermissions)
		permissions.POST("/roles/:id/permissions", app.GetPermissionHandler().SetRolePermissions)

		// 用户权限管理 - 这里是前端请求的关键路由
		permissions.GET("/users/:id", app.GetPermissionHandler().GetUserPermissions)
		permissions.PUT("/users/:id", app.GetPermissionHandler().UpdateUserPermissions)
		permissions.GET("/users/:id/trace", app.GetPermissionHandler().GetPermissionTrace)
		permissions.POST("/users/:id/override", app.GetPermissionHandler().SetPermissionOverride)
		permissions.GET("/users/:id/overrides", app.GetPermissionHandler().GetPermissionOverrides)
		permissions.DELETE("/users/:id/overrides/:permissionCode", app.GetPermissionHandler().RemovePermissionOverride)
		permissions.GET("/users/:id/conflicts", app.GetPermissionHandler().AnalyzePermissionConflicts)
		permissions.GET("/users/:id/roles", app.GetPermissionHandler().GetUserRoles)
		permissions.POST("/users/:id/roles", app.GetPermissionHandler().AssignUserRole)
		permissions.DELETE("/users/:id/roles/:roleId", app.GetPermissionHandler().RemoveUserRole)

		// 权限检查
		permissions.POST("/check", app.GetPermissionHandler().CheckUserPermission)
		permissions.POST("/check/batch", app.GetPermissionHandler().BatchCheckPermissions)

		// 审计日志
		permissions.GET("/audit-logs", app.GetPermissionHandler().GetPermissionAuditLogs)
	}
}
