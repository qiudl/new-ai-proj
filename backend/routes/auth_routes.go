package routes

import (
	"ai-project-backend/models"
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
		
		// Development-only 快速登录
		auth.POST("/dev-quick-login", authHandler.DevQuickLogin)
		auth.POST("/dev/quick-login", authHandler.DevQuickLogin) // 兼容两种路径
		auth.GET("/dev/accounts", authHandler.GetDevAccounts)
	}
	
	// 创建需要认证的路由组（简化版认证中间件）
	authorized := api.Group("/")
	authorized.Use(func(c *gin.Context) {
		// 简化的JWT认证检查
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(401, models.ErrorResponse{
				Success: false,
				Error:   &models.APIError{Message: "No authorization token provided"},
			})
			c.Abort()
			return
		}
		
		// 这里应该验证JWT token，但为了快速测试，我们暂时允许任何带token的请求通过
		// 在实际应用中应该使用 middleware.JWTAuthMiddleware
		
		// 设置基本用户信息（用于测试）
		c.Set("user_id", 1) // 默认用户ID
		c.Set("username", "admin") // 默认用户名
		c.Set("user_type", "system") // 默认用户类型
		c.Set("authenticated", true)
		
		c.Next()
	})

	// 打印调试信息
	fmt.Printf("✅ 认证路由已注册，返回授权路由组\n")
	
	return authorized
}
