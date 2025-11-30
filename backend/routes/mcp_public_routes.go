package routes

import (
	"log"
	"net/http"

	"ai-project-backend/mcp"
	"ai-project-backend/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterMCPPublicRoutes 注册公共 MCP SSE 路由
// 这些路由使用 API-Key 认证，供外部 MCP 客户端（如 Claude Desktop）使用
func RegisterMCPPublicRoutes(router *gin.Engine, app ApplicationInterface) {
	// 获取 MCP API Key 服务
	mcpAPIKeyService := app.GetMCPAPIKeyService()
	if mcpAPIKeyService == nil {
		log.Println("[MCP_PUBLIC] Warning: MCP API Key service not initialized, skipping MCP public routes")
		return
	}

	// 创建 MCP Server
	mcpServer := mcp.NewMCPServer(&mcp.MCPServerConfig{
		DB:            app.GetDB(),
		APIKeyService: mcpAPIKeyService,
	})

	// 创建 MCP API Key 认证中间件
	mcpAuthMiddleware := middleware.MCPAPIKeyAuth(mcpAPIKeyService, true)

	// ========== MCP SSE 端点（API-Key 认证）==========
	// 路径: /api/v1/mcp/sse
	// 这是主要的 MCP 协议端点，支持 Streamable HTTP (SSE)
	mcpSSE := router.Group("/api/v1/mcp/sse")
	{
		// 所有 MCP SSE 请求都需要 API-Key 认证
		mcpSSE.Use(mcpAuthMiddleware)

		// MCP 协议端点 - 处理所有 MCP 请求（初始化、工具调用等）
		// POST 用于发送请求，GET 用于 SSE 长连接
		// 注意：不能使用 Any() 因为会与全局 OPTIONS /*path 冲突
		mcpHandler := gin.WrapH(wrapMCPHandler(mcpServer))
		mcpSSE.GET("", mcpHandler)
		mcpSSE.POST("", mcpHandler)
		mcpSSE.GET("/", mcpHandler)
		mcpSSE.POST("/", mcpHandler)
	}

	// ========== MCP 健康检查端点（无需认证）==========
	router.GET("/api/v1/mcp/health", mcpHealthCheck)

	// ========== MCP API Key 管理端点（JWT 认证）==========
	// 这些端点用于用户管理自己的 API Keys
	mcpKeys := router.Group("/api/v1/mcp/keys")
	{
		// 使用 JWT 认证
		jwtAuth := middleware.AuthMiddleware(app.GetJWTManager(), app.GetDB())
		mcpKeys.Use(jwtAuth)

		// 获取 MCP API Key Handler
		mcpAPIKeyHandler := app.GetMCPAPIKeyHandler()
		if mcpAPIKeyHandler != nil {
			// API Key CRUD 操作
			mcpKeys.GET("", mcpAPIKeyHandler.ListAPIKeys)         // 列出用户的所有 API Keys
			mcpKeys.POST("", mcpAPIKeyHandler.CreateAPIKey)       // 创建新 API Key
			mcpKeys.GET("/:keyId", mcpAPIKeyHandler.GetAPIKey)    // 获取单个 API Key 详情
			mcpKeys.PUT("/:keyId", mcpAPIKeyHandler.UpdateAPIKey) // 更新 API Key
			mcpKeys.DELETE("/:keyId", mcpAPIKeyHandler.RevokeAPIKey) // 撤销 API Key

			// API Key 统计和日志
			mcpKeys.GET("/:keyId/stats", mcpAPIKeyHandler.GetAPIKeyStats)   // 获取 API Key 使用统计
			mcpKeys.GET("/:keyId/logs", mcpAPIKeyHandler.GetAPIKeyLogs)     // 获取 API Key 调用日志
		} else {
			log.Println("[MCP_PUBLIC] Warning: MCP API Key handler not initialized")
		}
	}

	log.Println("[MCP_PUBLIC] MCP public routes registered successfully")
}

// wrapMCPHandler 包装 MCP Handler，添加 Gin 上下文转换
func wrapMCPHandler(mcpServer *mcp.MCPServer) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 从 Gin 上下文中获取认证信息
		// 注意：这里的 r.Context() 已经包含了中间件设置的认证信息
		mcpServer.ServeHTTP(w, r)
	})
}

// mcpHealthCheck MCP 服务健康检查
func mcpHealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "MCP service is healthy",
		"data": gin.H{
			"service":  "ai-project-mcp",
			"version":  "1.0.0",
			"protocol": "MCP/1.0",
			"transport": "Streamable HTTP (SSE)",
			"endpoints": gin.H{
				"sse":    "/api/v1/mcp/sse",
				"keys":   "/api/v1/mcp/keys",
				"health": "/api/v1/mcp/health",
			},
		},
	})
}
