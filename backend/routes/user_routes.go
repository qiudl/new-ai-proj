package routes

import (
	"ai-project-backend/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterUserRoutes 注册用户相关路由
func RegisterUserRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取用户资料处理器和用户管理处理器
	userProfileHandler := app.GetUserProfileHandler()
	userManagementHandler := app.GetUserManagementHandler()
	userEnterpriseHandler := app.GetUserEnterpriseHandler()
	passwordHandler := app.GetPasswordHandler()

	// 用户资料路由 - 已经通过authorized组应用了JWT中间件，不需要重复应用
	users := authorized.Group("/users")
	// 移除重复的JWT中间件：users.Use(middleware.AuthMiddleware(app.GetJWTManager()))
	{
		users.GET("/profile", userProfileHandler.GetUserProfile)
		users.PUT("/profile", userProfileHandler.UpdateUserProfile)
		users.POST("/change-password", passwordHandler.ChangePassword) // 使用新的PasswordHandler
		users.POST("/me/change-password", passwordHandler.ChangePassword) // 更直观的路径
		users.POST("/upload-avatar", userProfileHandler.UploadAvatar)
		users.GET("/statistics", userProfileHandler.GetUserStatistics)

		// 简单测试端点
		users.GET("/test", func(c *gin.Context) {
			userID, exists := c.Get("user_id")
			if !exists {
				c.JSON(401, gin.H{"error": "user_id not found in context"})
				return
			}
			c.JSON(200, gin.H{
				"success": true,
				"user_id": userID,
				"message": "JWT middleware working",
			})
		})

		// 使用真实的用户管理处理器获取用户列表
		users.GET("", userManagementHandler.GetUserList)

		// 用户活动时间线
		users.GET("/:id/activity", app.GetTimelineHandler().GetUserActivity)

		// 用户企业信息管理 - 仅超级管理员可访问
		users.PUT("/:id/enterprise",
			middleware.SystemUserOnlyMiddleware(),
			userEnterpriseHandler.UpdateUserEnterprise)
		users.GET("/:id/enterprise-details", userEnterpriseHandler.GetUserEnterpriseDetails)
	}
}
