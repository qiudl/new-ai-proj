package routes

import (
	"ai-project-backend/handlers"
	"log"

	"github.com/gin-gonic/gin"
)

// SetupUploadRoutes 设置文件上传相关路由
func SetupUploadRoutes(router *gin.RouterGroup, logger *log.Logger) {
	uploadHandler := handlers.NewImageUploadHandler(logger)

	// 图片上传路由（需要认证）
	uploadGroup := router.Group("/upload")
	{
		// 上传图片
		uploadGroup.POST("/image", uploadHandler.UploadImage)
	}

	// 静态文件访问路由（公开访问）
	uploadsGroup := router.Group("/uploads")
	{
		// 访问上传的图片
		uploadsGroup.GET("/images/:filename", uploadHandler.ServeUploadedImage)
		// 也支持 avatars 路径（兼容旧的头像上传）
		uploadsGroup.Static("/avatars", "./uploads/avatars")
	}
}
