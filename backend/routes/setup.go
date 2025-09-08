package routes

import (
	"ai-project-backend/config"
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	promhttp "github.com/prometheus/client_golang/prometheus/promhttp"
)

// SetupRouter 创建并配置主路由器（简化版，专注于角色权限测试）
func SetupRouter(app ApplicationInterface) *gin.Engine {
	gin.SetMode(func() string {
		if app.GetConfig().IsProduction() {
			return gin.ReleaseMode
		}
		return gin.DebugMode
	}())

	router := gin.New()

	// 设置基础中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware(app.GetConfig()))

	// 注册简化的路由（专注于角色权限测试）
	RegisterAllRoutes(router, app)

	return router
}

// RegisterAllRoutes 注册所有模块的路由（简化版）
func RegisterAllRoutes(router *gin.Engine, app ApplicationInterface) {
	// 注册基础健康检查路由（无需认证）
	router.GET("/health", app.GetHealthHandler())
	router.GET("/version", app.GetVersionHandler())

	// Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 注册WebSocket路由（在静态文件之前） - 已注释
	// RegisterWebSocketRoutes(router, app)

	// API routes with authentication
	api := router.Group("/api/v1")

	// Add global OPTIONS handler for CORS preflight requests
	router.OPTIONS("/*path", func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Max-Age", "86400")
		c.Status(204)
	})

	// 注册认证路由并获取授权路由组
	authorized := RegisterAuthRoutes(api, app)

	// 注册基础权限路由
	RegisterPermissionRoutes(authorized, app)

	// 注册角色权限管理路由 - 这是我们要测试的核心功能
	RegisterRoleManagementRoutes(authorized, app)

	// 注册增强权限路由
	RegisterEnhancedPermissionRoutes(authorized, app)

	// 注册权限审批路由（暂时禁用以避免未完成模块导致的编译问题）
	// RegisterPermissionApprovalRoutes(authorized, app)

	// 注册角色模板路由
	RegisterRoleTemplateRoutes(authorized, app)

	// 注册公司管理路由
	RegisterCompanyRoutes(authorized, app)

	// 注册企业管理路由
	RegisterEnterpriseRoutes(authorized, app)

	// 注册组织管理路由
	RegisterOrganizationRoutes(authorized, app)

	// 注册项目和任务管理路由
	fmt.Println("DEBUG: About to call RegisterProjectRoutes")
	RegisterProjectRoutes(authorized, app)
	fmt.Println("DEBUG: RegisterProjectRoutes completed")

	// 注册独立的任务路由
	fmt.Println("DEBUG: About to call RegisterTaskRoutes")
	RegisterTaskRoutes(authorized, app)
	fmt.Println("DEBUG: RegisterTaskRoutes completed")

	// 注册批量操作路由
	fmt.Println("DEBUG: About to call RegisterBatchOperationRoutes")
	RegisterBatchOperationRoutes(authorized, app)
	fmt.Println("DEBUG: RegisterBatchOperationRoutes completed")

	// 注册简化的系统路由（主要是权限相关）
	RegisterSystemRoutes(authorized, app)

	// 注册回收站路由
	RegisterRecycleBinRoutes(authorized, app)

	// 注册计时器路由
	RegisterTimerRoutes(authorized, app)

	// 注册用户路由
	RegisterUserRoutes(authorized, app)

	// 注册文档管理路由（包含工作笔记路由）
	RegisterDocumentRoutes(authorized, app)

	// 注册MCP专用路由
	RegisterMCPRoutes(authorized, app)

	// 注册修复的任务文档路由（优先级更高，会覆盖之前的路由）
	// 获取数据库连接用于修复
	if dbProvider, ok := app.(interface{ GetDB() interface{} }); ok {
		if sqlDB, ok := dbProvider.GetDB().(*sql.DB); ok {
			RegisterTaskDocumentFixRoutes(authorized, sqlDB)
		}
	}

	// 注册简化的API路由
	RegisterAPIRoutes(router, authorized, app)

	// 注册文档健康检查
	RegisterDocumentHealthRoute(router, app)
}

// corsMiddleware CORS中间件
func corsMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 明确设置CORS头部 - 对所有请求都设置
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		c.Header("Access-Control-Max-Age", "86400")

		// 处理OPTIONS预检请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		// 继续处理其他请求
		c.Next()
	}
}
