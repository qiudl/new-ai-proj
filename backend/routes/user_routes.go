package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterUserRoutes 注册用户相关路由
func RegisterUserRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取用户资料处理器
	userProfileHandler := app.GetUserProfileHandler()
	
	// 用户资料路由
	users := authorized.Group("/users")
	{
		users.GET("/profile", userProfileHandler.GetUserProfile)
		users.PUT("/profile", userProfileHandler.UpdateUserProfile)
		users.POST("/change-password", userProfileHandler.ChangePassword)
		users.POST("/upload-avatar", userProfileHandler.UploadAvatar)
		users.GET("/statistics", userProfileHandler.GetUserStatistics)
		
		// 临时添加用户列表路由 - admin 用户测试
		users.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"success": true,
				"data": gin.H{
					"users": []gin.H{
						{"id": 1, "username": "admin", "role": "admin", "status": "active"},
						{"id": 2, "username": "guoym", "role": "admin", "status": "active"},
					},
					"total": 2,
					"page": 1,
					"page_size": 20,
				},
				"message": "User list retrieved successfully",
			})
		})
	}
}
