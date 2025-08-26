package routes

import (
	"database/sql"
	
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"github.com/gin-gonic/gin"
)

// RegisterRoleManagementRoutes registers role management routes
func RegisterRoleManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取数据库连接
	dbConn := app.GetDB().GetDB().(*sql.DB)
	
	// 创建权限repository和角色管理处理器
	permissionRepo := database.NewPermissionRepository(dbConn)
	roleHandler := handlers.NewRoleManagementHandler(permissionRepo)
	
	// 角色管理路由组
	roles := authorized.Group("/roles")
	{
		// 角色 CRUD
		roles.GET("", roleHandler.GetRoles)                    // 获取角色列表
		roles.GET("/:id", roleHandler.GetRole)                 // 获取单个角色
		roles.POST("", roleHandler.CreateRole)                 // 创建角色
		roles.PUT("/:id", roleHandler.UpdateRole)              // 更新角色
		roles.DELETE("/:id", roleHandler.DeleteRole)           // 删除角色
		roles.PATCH("/:id/status", roleHandler.UpdateRoleStatus) // 启用/禁用角色

		// 角色权限管理
		roles.GET("/:id/permissions", roleHandler.GetRolePermissions)     // 获取角色权限
		roles.POST("/:id/permissions", roleHandler.SetRolePermissions)    // 设置角色权限
		roles.PATCH("/:id/permissions", roleHandler.UpdateRolePermissions) // 更新角色权限
		roles.DELETE("/:id/permissions/:permissionId", roleHandler.RemoveRolePermission) // 移除单个权限

		// 角色用户管理
		roles.GET("/:id/users", roleHandler.GetRoleUsers)         // 获取拥有该角色的用户
		roles.POST("/:id/users", roleHandler.AssignRoleToUsers)   // 批量分配角色给用户
		roles.DELETE("/:id/users/:userId", roleHandler.RemoveUserFromRole) // 移除用户角色

		// 角色模板和预设
		roles.GET("/templates", roleHandler.GetRoleTemplates)     // 获取角色模板
		roles.POST("/templates/:templateId/create", roleHandler.CreateRoleFromTemplate) // 从模板创建角色

		// 角色分析和统计
		roles.GET("/:id/usage-stats", roleHandler.GetRoleUsageStats)     // 角色使用统计
		roles.GET("/:id/permission-analysis", roleHandler.AnalyzeRolePermissions) // 权限分析
	}

	// 权限管理相关路由
	permissions := authorized.Group("/permissions")
	{
		// 权限基础操作
		permissions.GET("", roleHandler.GetPermissions)                    // 获取权限列表
		permissions.GET("/:id", roleHandler.GetPermission)                 // 获取单个权限
		permissions.GET("/modules", roleHandler.GetPermissionModules)      // 获取权限模块列表
		permissions.GET("/by-module/:module", roleHandler.GetPermissionsByModule) // 按模块获取权限

		// 权限检查
		permissions.POST("/check", roleHandler.CheckUserPermission)        // 检查用户权限
		permissions.POST("/batch-check", roleHandler.BatchCheckPermissions) // 批量权限检查
		permissions.GET("/trace/:userId", roleHandler.GetPermissionTrace)  // 权限继承追踪

		// 用户权限管理
		permissions.GET("/users/:userId", roleHandler.GetUserPermissions)       // 获取用户权限
		permissions.PUT("/users/:userId", roleHandler.UpdateUserPermissions)    // 更新用户权限
		permissions.POST("/users/:userId/override", roleHandler.SetPermissionOverride) // 设置权限覆盖
		permissions.DELETE("/users/:userId/override/:permissionCode", roleHandler.RemovePermissionOverride) // 移除权限覆盖

		// 权限审计
		permissions.GET("/audit-logs", roleHandler.GetPermissionAuditLogs)  // 权限变更审计日志
		permissions.GET("/users/:userId/audit", roleHandler.GetUserPermissionAudit) // 用户权限审计
	}

	// 权限分析和优化路由
	analysis := authorized.Group("/permission-analysis")
	{
		analysis.GET("/conflicts/:userId", roleHandler.AnalyzePermissionConflicts)    // 权限冲突分析
		analysis.GET("/optimization/:userId", roleHandler.GetPermissionOptimization) // 权限优化建议
		analysis.GET("/usage-report", roleHandler.GetPermissionUsageReport)          // 权限使用报告
		analysis.GET("/security-gaps", roleHandler.GetSecurityGapAnalysis)           // 安全缺口分析
	}
}
