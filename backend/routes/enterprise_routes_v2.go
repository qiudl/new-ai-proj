package routes

import (
	"ai-project-backend/middleware"
	"fmt"
	"strconv"
	"github.com/gin-gonic/gin"
)

// RegisterEnterpriseRoutesV2 注册企业业务路由 (RBAC v2)
// 企业域路由: /api/v1/enterprises/:enterprise_id/*
// 这些API供企业用户访问,严格执行企业数据隔离
func RegisterEnterpriseRoutesV2(
	router *gin.Engine,
	authMiddleware gin.HandlerFunc,
	app ApplicationInterface,
) {
	// 获取RBAC v2 权限中间件
	permMiddleware := app.GetPermissionMiddlewareV2()
	if permMiddleware == nil {
		fmt.Printf("⚠️  [WARNING] PermissionMiddlewareV2 not available, skipping enterprise routes registration\n")
		return
	}

	// 创建企业域路由组
	// 基础路径: /api/v1/enterprises/:enterprise_id
	enterprise := router.Group("/api/v1/enterprises/:enterprise_id")
	enterprise.Use(authMiddleware)                                  // JWT认证
	enterprise.Use(permMiddleware.EnforceEnterpriseIsolation())    // 企业隔离检查

	fmt.Printf("✅ 注册企业域路由组: /api/v1/enterprises/:enterprise_id\n")

	// 注册企业用户管理路由
	registerEnterpriseUserManagementRoutes(enterprise, permMiddleware, app)

	// 注册企业角色权限管理路由
	registerEnterpriseRolePermissionRoutes(enterprise, permMiddleware, app)

	// 注册企业部门管理路由 (新增)
	registerEnterpriseDepartmentRoutes(enterprise, permMiddleware, app)

	// 注册企业用户中心路由 (用户详情、项目、统计、活动等)
	registerEnterpriseUserCenterRoutes(enterprise, permMiddleware, app)

	// 注册业务路由 (项目、任务、文档等)
	registerEnterpriseBusinessRoutes(enterprise, permMiddleware, app)
}

// registerEnterpriseUserManagementRoutes 注册企业用户管理路由 (企业管理员视角)
// 路径: /api/v1/enterprises/:enterprise_id/users/*
func registerEnterpriseUserManagementRoutes(
	enterprise *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	enterpriseUserHandler := app.GetEnterpriseUserHandler()
	if enterpriseUserHandler == nil {
		fmt.Printf("⚠️  [WARNING] EnterpriseUserHandler not available\n")
		return
	}

	users := enterprise.Group("/users")

	// 企业用户列表
	users.GET("",
		permMiddleware.RequireEnterprisePermission("enterprise.user.list"),
		enterpriseUserHandler.ListEnterpriseUsers,
	)

	// 邀请用户加入企业
	users.POST("",
		permMiddleware.RequireEnterprisePermission("enterprise.user.create"),
		enterpriseUserHandler.InviteUserToEnterprise,
	)

	// 查看用户详情
	users.GET("/:user_id",
		permMiddleware.RequireEnterprisePermission("enterprise.user.read"),
		enterpriseUserHandler.GetEnterpriseUser,
	)

	// 更新用户角色
	users.PUT("/:user_id/roles",
		permMiddleware.RequireEnterprisePermission("enterprise.user.manage_roles"),
		enterpriseUserHandler.UpdateEnterpriseUserRoles,
	)

	// 从企业移除用户
	users.DELETE("/:user_id",
		permMiddleware.RequireEnterprisePermission("enterprise.user.delete"),
		enterpriseUserHandler.RemoveEnterpriseUser,
	)

	// 获取未分配部门的用户 (新增)
	enterpriseHandler := app.GetEnterpriseHandler()
	if enterpriseHandler != nil {
		users.GET("/unassigned",
			permMiddleware.RequireEnterprisePermission("enterprise.user.read"),
			func(c *gin.Context) {
				enterpriseID := c.Param("enterprise_id")
				// 完全替换params以避免冲突
				c.Params = []gin.Param{
					{Key: "id", Value: enterpriseID},
				}
				enterpriseHandler.GetUnassignedEnterpriseUsers(c)
			},
		)

		// 更新用户部门 (新增)
		users.PUT("/:user_id/department",
			permMiddleware.RequireEnterprisePermission("enterprise.user.update"),
			func(c *gin.Context) {
				enterpriseID := c.Param("enterprise_id")
				userID := c.Param("user_id")
				c.Params = []gin.Param{
					{Key: "id", Value: enterpriseID},
					{Key: "userId", Value: userID},
				}
				enterpriseHandler.UpdateEnterpriseUserDepartment(c)
			},
		)
	}

	fmt.Printf("  ✓ 企业用户管理路由: /api/v1/enterprises/:enterprise_id/users\n")
}

// registerEnterpriseRolePermissionRoutes 注册企业角色权限管理路由
// 路径: /api/v1/enterprises/:enterprise_id/roles/*, /api/v1/enterprises/:enterprise_id/permissions/*
func registerEnterpriseRolePermissionRoutes(
	enterprise *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	enterpriseRoleHandler := app.GetEnterpriseRoleHandler()
	if enterpriseRoleHandler == nil {
		fmt.Printf("⚠️  [WARNING] EnterpriseRoleHandler not available\n")
		return
	}

	// 企业角色管理
	roles := enterprise.Group("/roles")

	// 角色列表
	roles.GET("",
		permMiddleware.RequireEnterprisePermission("enterprise.role.list"),
		enterpriseRoleHandler.ListEnterpriseRoles,
	)

	// 创建角色
	roles.POST("",
		permMiddleware.RequireEnterprisePermission("enterprise.role.create"),
		enterpriseRoleHandler.CreateEnterpriseRole,
	)

	// 查看角色详情
	roles.GET("/:role_id",
		permMiddleware.RequireEnterprisePermission("enterprise.role.read"),
		enterpriseRoleHandler.GetEnterpriseRole,
	)

	// 更新角色
	roles.PUT("/:role_id",
		permMiddleware.RequireEnterprisePermission("enterprise.role.update"),
		enterpriseRoleHandler.UpdateEnterpriseRole,
	)

	// 删除角色
	roles.DELETE("/:role_id",
		permMiddleware.RequireEnterprisePermission("enterprise.role.delete"),
		enterpriseRoleHandler.DeleteEnterpriseRole,
	)

	// 为角色分配权限
	roles.POST("/:role_id/permissions",
		permMiddleware.RequireEnterprisePermission("enterprise.role.manage_permissions"),
		enterpriseRoleHandler.AssignPermissionsToEnterpriseRole,
	)

	fmt.Printf("  ✓ 企业角色管理路由: /api/v1/enterprises/:enterprise_id/roles\n")

	// 企业权限管理
	permissions := enterprise.Group("/permissions")

	// 权限列表 (企业可用的所有权限)
	permissions.GET("",
		permMiddleware.RequireEnterprisePermission("enterprise.permission.list"),
		permMiddleware.EnforceEnterpriseIsolation(),
		func(c *gin.Context) {
			// Reuse enterpriseRoleHandler for permission listing
			enterpriseRoleHandler := app.GetEnterpriseRoleHandler()
			if enterpriseRoleHandler != nil {
				enterpriseRoleHandler.ListEnterprisePermissions(c)
			} else {
				c.JSON(500, gin.H{
					"success": false,
					"error": map[string]interface{}{
						"code":    "HANDLER_NOT_AVAILABLE",
						"message": "EnterpriseRoleHandler未初始化",
					},
				})
			}
		},
	)

	fmt.Printf("  ✓ 企业权限管理路由: /api/v1/enterprises/:enterprise_id/permissions\n")
}

// registerEnterpriseDepartmentRoutes 注册企业部门管理路由
// 路径: /api/v1/enterprises/:enterprise_id/departments/*
func registerEnterpriseDepartmentRoutes(
	enterprise *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	enterpriseHandler := app.GetEnterpriseHandler()
	if enterpriseHandler == nil {
		fmt.Printf("⚠️  [WARNING] EnterpriseHandler not available for department routes\n")
		return
	}

	departments := enterprise.Group("/departments")

	// 部门列表
	departments.GET("",
		permMiddleware.RequireEnterprisePermission("enterprise.department.read"),
		func(c *gin.Context) {
			// 将enterprise_id从路径参数转换为:id参数供handler使用
			enterpriseID := c.Param("enterprise_id")
			// 完全替换params以避免冲突
			c.Params = []gin.Param{
				{Key: "id", Value: enterpriseID},
			}
			enterpriseHandler.GetEnterpriseDepartments(c)
		},
	)

	// 部门统计（带实际人数）
	departments.GET("/stats",
		permMiddleware.RequireEnterprisePermission("enterprise.department.read"),
		func(c *gin.Context) {
			// 将enterprise_id从路径参数转换为:id参数供handler使用
			enterpriseID := c.Param("enterprise_id")
			// 完全替换params以避免冲突
			c.Params = []gin.Param{
				{Key: "id", Value: enterpriseID},
			}
			enterpriseHandler.GetEnterpriseDepartmentStats(c)
		},
	)

	// 创建部门
	departments.POST("",
		permMiddleware.RequireEnterprisePermission("enterprise.department.create"),
		func(c *gin.Context) {
			enterpriseID := c.Param("enterprise_id")
			c.Params = []gin.Param{
				{Key: "id", Value: enterpriseID},
			}
			enterpriseHandler.CreateEnterpriseDepartment(c)
		},
	)

	// 更新部门
	departments.PUT("/:dept_id",
		permMiddleware.RequireEnterprisePermission("enterprise.department.update"),
		func(c *gin.Context) {
			enterpriseID := c.Param("enterprise_id")
			deptID := c.Param("dept_id")
			c.Params = []gin.Param{
				{Key: "id", Value: enterpriseID},
				{Key: "dept_id", Value: deptID},
			}
			enterpriseHandler.UpdateEnterpriseDepartment(c)
		},
	)

	// 删除部门
	departments.DELETE("/:dept_id",
		permMiddleware.RequireEnterprisePermission("enterprise.department.delete"),
		func(c *gin.Context) {
			enterpriseID := c.Param("enterprise_id")
			deptID := c.Param("dept_id")
			c.Params = []gin.Param{
				{Key: "id", Value: enterpriseID},
				{Key: "dept_id", Value: deptID},
			}
			enterpriseHandler.DeleteEnterpriseDepartment(c)
		},
	)

	fmt.Printf("  ✓ 企业部门管理路由: /api/v1/enterprises/:enterprise_id/departments\n")
}

// registerEnterpriseUserCenterRoutes 注册企业用户中心路由
// 路径: /api/v1/enterprises/:enterprise_id/users/:user_id/*
// 提供用户详情、项目列表、统计信息、活动记录、权限管理等功能
func registerEnterpriseUserCenterRoutes(
	enterprise *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	enterpriseHandler := app.GetEnterpriseHandler()
	if enterpriseHandler == nil {
		fmt.Printf("⚠️  [WARNING] EnterpriseHandler not available for user center routes\n")
		return
	}

	// 用户中心路由组
	userCenter := enterprise.Group("/users/:user_id")

	// 用户项目列表
	userCenter.GET("/projects",
		permMiddleware.RequireEnterprisePermission("enterprise.user.read"),
		adaptUserCenterParams(enterpriseHandler.GetEnterpriseUserProjects),
	)

	// 用户统计信息
	userCenter.GET("/stats",
		permMiddleware.RequireEnterprisePermission("enterprise.user.read"),
		adaptUserCenterParams(enterpriseHandler.GetEnterpriseUserStats),
	)

	// 用户活动记录
	userCenter.GET("/activities",
		permMiddleware.RequireEnterprisePermission("enterprise.user.read"),
		adaptUserCenterParams(enterpriseHandler.GetEnterpriseUserActivities),
	)

	// 用户权限查询
	userCenter.GET("/permissions",
		permMiddleware.RequireEnterprisePermission("enterprise.user.read_permissions"),
		adaptUserCenterParams(enterpriseHandler.GetEnterpriseUserPermissions),
	)

	// 更新用户权限
	userCenter.PUT("/permissions",
		permMiddleware.RequireEnterprisePermission("enterprise.user.manage_permissions"),
		adaptUserCenterParams(enterpriseHandler.UpdateEnterpriseUserPermissions),
	)

	// 重置用户密码
	userCenter.POST("/reset-password",
		permMiddleware.RequireEnterprisePermission("enterprise.user.reset_password"),
		adaptUserCenterParams(enterpriseHandler.ResetEnterpriseUserPassword),
	)

	fmt.Printf("  ✓ 企业用户中心路由: /api/v1/enterprises/:enterprise_id/users/:user_id\n")
}

// adaptUserCenterParams 参数适配器: 将RBAC v2路径参数映射为旧handler期望的参数名
// 映射关系:
//   - enterprise_id (新) -> id (旧)
//   - user_id (新) -> userId (旧)
// 这样可以复用EnterpriseHandler的现有方法,无需修改其内部实现
func adaptUserCenterParams(handler gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		enterpriseID := c.Param("enterprise_id")
		userID := c.Param("user_id")

		// 重映射参数为旧handler期望的名称
		c.Params = []gin.Param{
			{Key: "id", Value: enterpriseID},
			{Key: "userId", Value: userID},
		}

		handler(c)
	}
}

// registerEnterpriseBusinessRoutes 注册企业业务路由 (项目、任务、文档等)
// 路径: /api/v1/enterprises/:enterprise_id/projects/*, /api/v1/enterprises/:enterprise_id/tasks/* 等
// NOTE: 当前使用占位处理器,实际Handler实现在Task 2903后续阶段完成
func registerEnterpriseBusinessRoutes(
	enterprise *gin.RouterGroup,
	permMiddleware *middleware.PermissionMiddlewareV2,
	app ApplicationInterface,
) {
	// ===== 项目管理 =====
	projectHandler := app.GetProjectsHandler()
	projects := enterprise.Group("/projects")

	// 项目列表
	projects.GET("",
		permMiddleware.RequireEnterprisePermission("enterprise.project.list"),
		adaptEnterpriseContext(projectHandler),
	)

	// 创建项目
	createProjectHandler := app.CreateProjectHandler()
	projects.POST("",
		permMiddleware.RequireEnterprisePermission("enterprise.project.create"),
		adaptEnterpriseContext(createProjectHandler),
	)

	fmt.Printf("  ✓ 项目管理路由: /api/v1/enterprises/:enterprise_id/projects\n")

	// ===== 任务管理 =====
	taskHandler := app.GetTasksHandler()
	createTaskHandler := app.CreateTaskHandler()
	tasks := projects.Group("/:project_id/tasks")

	// 任务列表
	tasks.GET("",
		permMiddleware.RequireEnterprisePermission("enterprise.task.list"),
		adaptEnterpriseContext(taskHandler),
	)

	// 创建任务
	tasks.POST("",
		permMiddleware.RequireEnterprisePermission("enterprise.task.create"),
		adaptEnterpriseContext(createTaskHandler),
	)

	fmt.Printf("  ✓ 任务管理路由: /api/v1/enterprises/:enterprise_id/projects/:project_id/tasks\n")

	// ===== 文档管理 =====
	unifiedDocumentHandler := app.GetUnifiedDocumentHandler()
	legacyDocumentHandler := app.GetDocumentHandler()

	if unifiedDocumentHandler != nil {
		documents := enterprise.Group("/documents")

		// 文档列表 - 使用legacy DocumentHandler的GetDocuments方法
		if legacyDocumentHandler != nil {
			documents.GET("",
				permMiddleware.RequireEnterprisePermission("enterprise.document.list"),
				adaptEnterpriseContext(legacyDocumentHandler.GetDocuments),
			)
		}

		// 创建文档
		documents.POST("",
			permMiddleware.RequireEnterprisePermission("enterprise.document.create"),
			unifiedDocumentHandler.CreateDocument,
		)

		// 查看文档
		documents.GET("/:document_id",
			permMiddleware.RequireEnterprisePermission("enterprise.document.read"),
			unifiedDocumentHandler.GetDocument,
		)

		// 更新文档
		documents.PUT("/:document_id",
			permMiddleware.RequireEnterprisePermission("enterprise.document.update"),
			unifiedDocumentHandler.UpdateDocument,
		)

		// 删除文档
		documents.DELETE("/:document_id",
			permMiddleware.RequireEnterprisePermission("enterprise.document.delete"),
			unifiedDocumentHandler.DeleteDocument,
		)

		fmt.Printf("  ✓ 文档管理路由: /api/v1/enterprises/:enterprise_id/documents\n")
	}

	// NOTE: Daily Focus和Timer路由暂时不迁移,使用现有API
	fmt.Printf("  ℹ️  Daily Focus和Timer路由保留在现有API中\n")
}

// adaptEnterpriseContext 适配器函数: 将enterprise_id从URL参数注入到context
// 使现有handler能够识别企业隔离上下文
//
// 工作流程:
//  1. 从URL路径参数:enterprise_id提取企业ID
//  2. 设置context变量:
//     - enterprise_id: 企业ID (用于现有handler的企业隔离逻辑)
//     - is_impersonating: true (触发现有handler的企业过滤)
//  3. 调用实际的handler
//
// 这样可以复用现有的ProjectHandler、TaskHandler等，无需修改其内部逻辑
func adaptEnterpriseContext(handler gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract enterprise_id from URL path
		enterpriseIDStr := c.Param("enterprise_id")
		if enterpriseIDStr == "" {
			c.JSON(400, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "MISSING_ENTERPRISE_ID",
					"message": "缺少企业ID参数",
				},
			})
			return
		}

		enterpriseID, err := strconv.Atoi(enterpriseIDStr)
		if err != nil || enterpriseID <= 0 {
			c.JSON(400, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_ENTERPRISE_ID",
					"message": "无效的企业ID",
				},
			})
			return
		}

		// Set context variables for existing handler compatibility
		// These are checked by ProjectHandler.GetProjects() and similar methods
		c.Set("enterprise_id", enterpriseID)
		c.Set("is_impersonating", true) // Trigger enterprise filtering logic

		// Call the actual handler
		handler(c)
	}
}
