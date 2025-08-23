package routes

import (
	"ai-project-backend/config"
	"ai-project-backend/middleware"
	"os"
	"github.com/gin-gonic/gin"
	promhttp "github.com/prometheus/client_golang/prometheus/promhttp"
)

// SetupRouter 创建并配置主路由器
func SetupRouter(app ApplicationInterface) *gin.Engine {
	gin.SetMode(func() string {
		if app.GetConfig().IsProduction() {
			return gin.ReleaseMode
		}
		return gin.DebugMode
	}())

	router := gin.New()
	
	// 设置中间件
	SetupMiddleware(router, app.GetConfig(), app)
	
	// 注册所有路由
	RegisterAllRoutes(router, app)
	
	return router
}

// SetupMiddleware 配置所有中间件
func SetupMiddleware(router *gin.Engine, cfg *config.Config, app ApplicationInterface) {
	// 基础中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware(cfg))
	
	// 审计中间件
	auditMiddleware := middleware.NewAuditMiddleware(&middleware.AuditConfig{
		DB:                 app.GetDB(),
		LogRequestBody:     true,
		LogResponseBody:    false, // 避免敏感数据泄露
		MaxBodySize:        1024 * 1024, // 1MB
		ExcludePaths:       []string{"/health", "/version", "/metrics", "/documents/health"},
		ExcludeMethods:     []string{"OPTIONS"},
	})
	router.Use(auditMiddleware.Middleware())
}

// RegisterAllRoutes 注册所有模块的路由
func RegisterAllRoutes(router *gin.Engine, app ApplicationInterface) {
	// 注册基础健康检查路由（无需认证）
	registerBasicRoutes(router, app)
	// Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 静态API文档挂载（/docs）
	mountDocs(router)
	
	// 注册Webhook路由（无需认证）
	registerWebhookRoutes(router, app)
	
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
	
	// 注册需要授权的各模块路由
	RegisterProjectRoutes(authorized, app)
	RegisterDocumentRoutes(authorized, app)
	RegisterTimerRoutes(authorized, app)
	RegisterSystemRoutes(authorized, app)
	RegisterSearchRoutes(authorized, app)
	RegisterEnhancedPermissionRoutes(authorized, app)
	
	// 注册API和其他杂项路由（包含公共路由、webhooks、全局任务等）
	RegisterAPIRoutes(router, authorized, app)

	// 注册文档健康检查附加路由（确保可用）
	RegisterDocumentHealthRoute(router, app)
}

// mountDocs 尝试挂载静态OpenAPI文档到 /docs
func mountDocs(router *gin.Engine) {
	candidates := []string{
		"../docs/api",      // when running from backend/
		"../../docs/api",   // when running from backend subdir
		"./docs/api",       // when running from project root
	}
	for _, dir := range candidates {
		if st, err := os.Stat(dir); err == nil && st.IsDir() {
			// 静态挂载 /docs，包含 openapi.yaml 在内的所有静态资源
			router.Static("/docs", dir)
			return
		}
	}
}

// registerBasicRoutes 注册基础路由
func registerBasicRoutes(router *gin.Engine, app ApplicationInterface) {
	router.GET("/health", app.GetHealthHandler())
	router.GET("/version", app.GetVersionHandler())
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