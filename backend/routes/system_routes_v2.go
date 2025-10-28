package routes

import (
	"ai-project-backend/middleware"
	"fmt"
	"github.com/gin-gonic/gin"
)

// RegisterSystemRoutesV2 注册系统管理路由 (RBAC v2)
// 系统域路由: /api/v1/system/*
// 这些API仅供系统用户(system users)访问,用于管理企业、系统用户、系统角色等
func RegisterSystemRoutesV2(
	router *gin.Engine,
	authMiddleware gin.HandlerFunc,
	app ApplicationInterface,
) {
	// 获取RBAC v2 权限中间件
	permMiddleware := app.GetPermissionMiddlewareV2()
	if permMiddleware == nil {
		fmt.Printf("⚠️  [WARNING] PermissionMiddlewareV2 not available, skipping system routes registration\n")
		return
	}

	// 创建系统管理路由组
	// 基础路径: /api/v1/system
	system := router.Group("/api/v1/system")
	system.Use(authMiddleware)                         // JWT认证
	system.Use(permMiddleware.RequireSystemUser())     // 要求系统用户身份

	fmt.Printf("✅ 注册系统域路由组: /api/v1/system\n")

	// 注册企业管理路由
	registerSystemEnterpriseManagementRoutes(system, permMiddleware, app)

	// 注册系统用户管理路由
	registerSystemUserManagementRoutes(system, permMiddleware, app)

	// 注册系统角色和权限管理路由
	registerSystemRolePermissionRoutes(system, permMiddleware, app)
}

// registerSystemEnterpriseManagementRoutes 注册企业管理路由 (系统管理员视角)
// 路径: /api/v1/system/enterprises/*
func registerSystemEnterpriseManagementRoutes(
	system *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	enterpriseHandler := app.GetEnterpriseHandler()
	if enterpriseHandler == nil {
		fmt.Printf("⚠️  [WARNING] EnterpriseHandler not available\n")
		return
	}

	enterprises := system.Group("/enterprises")

	// 企业列表 (系统管理员查看所有企业)
	enterprises.GET("",
		permMiddleware.RequireSystemPermission("system.enterprise.read"),
		enterpriseHandler.GetEnterprises,
	)

	// 创建企业
	enterprises.POST("",
		permMiddleware.RequireSystemPermission("system.enterprise.create"),
		enterpriseHandler.CreateEnterprise,
	)

	// 查看企业详情
	enterprises.GET("/:enterprise_id",
		permMiddleware.RequireSystemPermission("system.enterprise.read"),
		adaptEnterpriseIDParam(enterpriseHandler.GetEnterprise),
	)

	// 更新企业信息
	enterprises.PUT("/:enterprise_id",
		permMiddleware.RequireSystemPermission("system.enterprise.update"),
		adaptEnterpriseIDParam(enterpriseHandler.UpdateEnterprise),
	)

	// 删除企业
	enterprises.DELETE("/:enterprise_id",
		permMiddleware.RequireSystemPermission("system.enterprise.delete"),
		adaptEnterpriseIDParam(enterpriseHandler.DeleteEnterprise),
	)

	// 企业用户管理 (系统管理员视角)
	// 查看企业的所有用户
	enterprises.GET("/:enterprise_id/users",
		permMiddleware.RequireSystemPermission("system.enterprise.read"),
		adaptEnterpriseIDParam(enterpriseHandler.GetEnterpriseUsers),
	)

	// 添加用户到企业 (系统管理员操作)
	enterprises.POST("/:enterprise_id/users",
		permMiddleware.RequireSystemPermission("system.enterprise.manage_users"),
		adaptEnterpriseIDParam(enterpriseHandler.CreateEnterpriseUser),
	)

	// 从企业移除用户 (系统管理员操作)
	enterprises.DELETE("/:enterprise_id/users/:user_id",
		permMiddleware.RequireSystemPermission("system.enterprise.manage_users"),
		func(c *gin.Context) {
			// Adapter for removing enterprise user
			enterpriseIDStr := c.Param("enterprise_id")
			userIDStr := c.Param("user_id")

			// Re-set parameters for handler compatibility
			// - "id" contains enterprise_id
			// - "userId" contains user_id
			c.Params = append(c.Params[:0],
				gin.Param{Key: "id", Value: enterpriseIDStr},
				gin.Param{Key: "userId", Value: userIDStr},
			)

			// Call the actual handler
			enterpriseHandler.RemoveEnterpriseUser(c)
		},
	)

	fmt.Printf("  ✓ 企业管理路由: /api/v1/system/enterprises\n")
}

// adaptEnterpriseIDParam 适配器函数: 将 :enterprise_id 参数重命名为 :id
// EnterpriseHandler的方法使用 c.Param("id"),但系统路由使用 :enterprise_id
func adaptEnterpriseIDParam(handler gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		enterpriseID := c.Param("enterprise_id")
		if enterpriseID != "" {
			// 替换params,将enterprise_id重命名为id
			newParams := make(gin.Params, 0, len(c.Params))
			for _, p := range c.Params {
				if p.Key == "enterprise_id" {
					newParams = append(newParams, gin.Param{Key: "id", Value: p.Value})
				} else {
					newParams = append(newParams, p)
				}
			}
			c.Params = newParams
		}
		handler(c)
	}
}

// registerSystemUserManagementRoutes 注册系统用户管理路由
// 路径: /api/v1/system/users/*
func registerSystemUserManagementRoutes(
	system *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	systemUserHandler := app.GetSystemUserHandler()
	if systemUserHandler == nil {
		fmt.Printf("⚠️  [WARNING] SystemUserHandler not available\n")
		return
	}

	users := system.Group("/users")

	// 系统用户列表
	users.GET("",
		permMiddleware.RequireSystemPermission("system.user.list"),
		systemUserHandler.ListSystemUsers,
	)

	// 创建系统用户
	users.POST("",
		permMiddleware.RequireSystemPermission("system.user.create"),
		systemUserHandler.CreateSystemUser,
	)

	// 查看系统用户详情
	users.GET("/:user_id",
		permMiddleware.RequireSystemPermission("system.user.read"),
		systemUserHandler.GetSystemUser,
	)

	// 更新系统用户角色
	users.PUT("/:user_id/roles",
		permMiddleware.RequireSystemPermission("system.user.manage_roles"),
		systemUserHandler.UpdateSystemUserRoles,
	)

	// 禁用/启用系统用户
	users.PUT("/:user_id/status",
		permMiddleware.RequireSystemPermission("system.user.update"),
		systemUserHandler.UpdateSystemUserStatus,
	)

	fmt.Printf("  ✓ 系统用户管理路由: /api/v1/system/users\n")
}

// registerSystemRolePermissionRoutes 注册系统角色和权限管理路由
// 路径: /api/v1/system/roles/*, /api/v1/system/permissions/*
func registerSystemRolePermissionRoutes(
	system *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	systemRoleHandler := app.GetSystemRoleHandler()
	if systemRoleHandler == nil {
		fmt.Printf("⚠️  [WARNING] SystemRoleHandler not available\n")
		return
	}

	// 系统角色管理
	roles := system.Group("/roles")

	// 角色列表
	roles.GET("",
		permMiddleware.RequireSystemPermission("system.role.list"),
		systemRoleHandler.ListSystemRoles,
	)

	// 创建角色
	roles.POST("",
		permMiddleware.RequireSystemPermission("system.role.create"),
		systemRoleHandler.CreateSystemRole,
	)

	// 查看角色详情(包含权限列表)
	roles.GET("/:role_id",
		permMiddleware.RequireSystemPermission("system.role.read"),
		systemRoleHandler.GetSystemRole,
	)

	// 更新角色信息
	roles.PUT("/:role_id",
		permMiddleware.RequireSystemPermission("system.role.update"),
		systemRoleHandler.UpdateSystemRole,
	)

	// 删除角色
	roles.DELETE("/:role_id",
		permMiddleware.RequireSystemPermission("system.role.delete"),
		systemRoleHandler.DeleteSystemRole,
	)

	// 为角色分配权限
	roles.POST("/:role_id/permissions",
		permMiddleware.RequireSystemPermission("system.role.manage_permissions"),
		systemRoleHandler.AssignPermissionsToRole,
	)

	fmt.Printf("  ✓ 系统角色管理路由: /api/v1/system/roles\n")

	// 系统权限管理
	systemPermissionHandler := app.GetSystemPermissionHandler()
	if systemPermissionHandler == nil {
		fmt.Printf("⚠️  [WARNING] SystemPermissionHandler not available\n")
		return
	}

	permissions := system.Group("/permissions")

	// 权限列表 (所有可用的系统权限)
	permissions.GET("",
		permMiddleware.RequireSystemPermission("system.permission.list"),
		systemPermissionHandler.ListSystemPermissions,
	)

	// 创建自定义权限
	permissions.POST("",
		permMiddleware.RequireSystemPermission("system.permission.create"),
		systemPermissionHandler.CreateSystemPermission,
	)

	fmt.Printf("  ✓ 系统权限管理路由: /api/v1/system/permissions\n")
}
