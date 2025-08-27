package routes

import (
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
	
	// 创建需要认证的路由组（简化版本，暂时不使用中间件）
	authorized := api.Group("/")
	// authorized.Use(app.GetMapUserToCompanyUserMiddleware())  // 暂时注释掉

	// 打印调试信息
	fmt.Printf("✅ 认证路由已注册，返回授权路由组\n")
	
	return authorized
}
