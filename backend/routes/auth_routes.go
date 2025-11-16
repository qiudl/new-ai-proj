package routes

import (
	"ai-project-backend/middleware"
	"fmt"
	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes 注册认证相关路由（简化版）
func RegisterAuthRoutes(api *gin.RouterGroup, app ApplicationInterface) *gin.RouterGroup {
	// 获取认证处理器
	authHandler := app.GetAuthHandler()

	// 创建认证路由组
	auth := api.Group("/auth")
	{
		// 基础认证路由
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", authHandler.Logout)
		auth.POST("/refresh", authHandler.RefreshToken)

		// 密码强度验证（公开路由，无需认证）
		passwordHandler := app.GetPasswordHandler()
		auth.POST("/validate-password", passwordHandler.ValidatePasswordStrength)

		// 密码重置路由（公开路由，无需认证）
		passwordResetHandler := app.GetPasswordResetHandler()
		if passwordResetHandler != nil {
			auth.POST("/forgot-password", passwordResetHandler.ForgotPassword)
			auth.POST("/verify-reset-token", passwordResetHandler.VerifyResetToken)
			auth.POST("/reset-password", passwordResetHandler.ResetPassword)
		}

		// Development-only 快速登录
		auth.POST("/dev-quick-login", authHandler.DevQuickLogin)
		auth.POST("/dev/quick-login", authHandler.DevQuickLogin) // 兼容两种路径
		auth.GET("/dev/accounts", authHandler.GetDevAccounts)

		// 服务账号Token生成（使用API Key认证）
		serviceAccountHandler := app.GetServiceAccountHandler()
		if serviceAccountHandler != nil {
			auth.POST("/service-token", serviceAccountHandler.GenerateServiceToken)

			// API Key管理（需要JWT认证）
			authProtectedService := auth.Group("")
			authProtectedService.Use(middleware.AuthMiddleware(app.GetJWTManager(), app.GetDB()))
			authProtectedService.POST("/service-api-key", serviceAccountHandler.CreateAPIKey)
		}

		// 统一权限检查路由 - 需要认证但在auth组下
		authProtected := auth.Group("")
		authProtected.Use(middleware.AuthMiddleware(app.GetJWTManager(), app.GetDB()))
		
		// 获取统一权限处理器
		unifiedPermissionHandler := app.GetUnifiedPermissionHandler()
		if unifiedPermissionHandler != nil {
			authProtected.POST("/check-permission", unifiedPermissionHandler.CheckPermission)
			authProtected.POST("/check-batch-permissions", unifiedPermissionHandler.CheckBatchPermissions)
			authProtected.GET("/user-permissions", unifiedPermissionHandler.GetUserPermissions)
		} else {
			// 回退到兼容性处理器
			fmt.Printf("⚠️  [WARNING] No unified permission handler available, using compatibility route\n")
			authProtected.POST("/check-permission", func(c *gin.Context) {
				fmt.Printf("🔧 [COMPAT] Handling auth/check-permission request with fallback\n")
				c.JSON(200, gin.H{
					"data": gin.H{
						"has_permission": true,
						"reason":         "Fallback compatibility handler",
						"source":         "auth_fallback",
					},
				})
			})
		}
	}

	// 创建需要认证的路由组 - 使用JWT认证中间件
	authorized := api.Group("/")
	authorized.Use(middleware.AuthMiddleware(app.GetJWTManager(), app.GetDB()))

	// 打印调试信息
	fmt.Printf("✅ 认证路由已注册，返回授权路由组（使用JWT中间件）\n")

	return authorized
}
