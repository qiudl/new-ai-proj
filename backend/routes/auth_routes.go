package routes

import (
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"fmt"
	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes 注册认证相关路由并返回授权路由组
func RegisterAuthRoutes(api *gin.RouterGroup, app ApplicationInterface) *gin.RouterGroup {
	// 基础认证路由
	auth := api.Group("/auth")
	{
		auth.POST("/login", app.GetLoginHandler())
		auth.POST("/logout", app.GetLogoutHandler())
		auth.POST("/refresh", app.GetJWTTokenHandler().RefreshToken)
		auth.POST("/revoke", app.GetJWTTokenHandler().RevokeToken)
		auth.POST("/validate", app.GetJWTTokenHandler().ValidateToken)
		
		// 需要认证的JWT管理接口
		authProtected := auth.Group("/")
		authProtected.Use(middleware.AuthMiddleware(app.GetJWTManager()))
		{
			authProtected.GET("/token-info", app.GetJWTTokenHandler().GetTokenInfo)
			authProtected.POST("/revoke-all", app.GetJWTTokenHandler().RevokeAllTokens)
			authProtected.GET("/blacklist-stats", app.GetJWTTokenHandler().GetBlacklistStats)
		}
		
		// Google认证路由
		auth.GET("/google", app.GetGoogleAuthHandler().InitiateGoogleAuth)
		auth.GET("/google/callback", app.GetGoogleAuthHandler().HandleGoogleCallback)
		
		// 开发环境专用的登录辅助接口（仅在 development 模式下可用）
		config := app.GetConfig()
		isDev := config.IsDevelopment()
		fmt.Printf("[DEBUG] Environment: %s, IsDevelopment: %v\n", config.App.Environment, isDev)
		if isDev {
			auth.GET("/dev-accounts", app.GetDevAccountsHandler())
			auth.POST("/dev-quick-login", app.DevQuickLoginHandler())
			fmt.Println("[DEBUG] Development routes registered")
		} else {
			fmt.Println("[DEBUG] Development routes NOT registered")
		}
	}

	// API Key authenticated routes (alternative to JWT)
	registerAPIKeyRoutes(api, app)

	// JWT authenticated routes - 返回授权路由组
	return registerJWTRoutes(api, app)
}

// registerAPIKeyRoutes 注册API密钥认证路由
func registerAPIKeyRoutes(api *gin.RouterGroup, app ApplicationInterface) {
	// 为避免与用户JWT路由冲突，API Key 使用 /external 前缀
	external := api.Group("/external")
	// Apply API Key authentication middleware
	external.Use(middleware.APIKeyAuthRequired(&middleware.APIKeyAuthConfig{
		DB:                    app.GetDB(),
		EnableHMACValidation:  false, // Disable for basic implementation
		EnableTimestamp:       false, // Disable for basic implementation
		EnableRateLimit:       true,  // Enable rate limiting
		EnableIPWhitelist:     true,  // Enable IP whitelist
		RequireHTTPS:          false, // Allow HTTP for development
	}))
	{
		// Task management for API consumers (external)
		externalTasks := external.Group("/tasks")
		externalTasks.Use(middleware.RequirePermission(models.PermissionTasksRead))
		{
			externalTasks.GET("", app.GetAllTasksHandler())
			externalTasks.GET("/:id", app.GetTaskHandler())
		}
		
		// Project management for API consumers (external)
		externalProjects := external.Group("/projects")
		externalProjects.Use(middleware.RequirePermission(models.PermissionProjectsRead))
		{
			externalProjects.GET("", app.GetProjectsHandler())
			externalProjects.GET("/:id", app.GetProjectHandler())
		}

		// Document management for API consumers (external)
		// 需要任务写权限，并限制到指定项目范围
		externalDocs := external.Group("/projects")
		externalDocs.Use(middleware.RequirePermission(models.PermissionTasksWrite))
		externalDocs.Use(middleware.RequireProjectAccess())
		{
			tasks := externalDocs.Group("/:id/tasks")
			{
				taskDocuments := tasks.Group("/:taskId/documents")
				{
					// 原子：创建文档并关联到任务（单事务）
					taskDocuments.POST("/create-and-attach", app.GetDocumentHandler().CreateAndAttachDocument)
					// 别名路由：与文档一致的 REST 设计（POST 空路径）
					taskDocuments.POST("", app.GetDocumentHandler().CreateAndAttachDocument)
					// 只读校验端点：是否存在文档、列出文档
					taskDocuments.GET("/has", app.GetDocumentHandler().HasTaskDocument)
					taskDocuments.GET("/list", app.GetDocumentHandler().ListTaskDocuments)
				}
			}
		}
	}
}

// registerJWTRoutes 注册JWT认证路由的基础中间件设置
func registerJWTRoutes(api *gin.RouterGroup, app ApplicationInterface) *gin.RouterGroup {
	// Protected routes (with user type access control)
	authorized := api.Group("/")
	// Apply JWT authentication middleware first
	authorized.Use(middleware.AuthMiddleware(app.GetJWTManager()))
	// Apply user type access control middleware
	authorized.Use(middleware.UserTypeAccessMiddleware())
	authorized.Use(middleware.CompanyAccessMiddleware())
	authorized.Use(app.MapUserToCompanyUser()) // Map authenticated user to company user
	
	return authorized
}
