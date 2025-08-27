package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterDocumentRoutes 注册文档相关路由（简化版，暂时禁用）
func RegisterDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 为了快速测试角色权限API，暂时禁用文档路由
	// 可以在需要时重新启用
}

// RegisterDocumentHealthRoute 注册文档健康检查路由（简化版）
func RegisterDocumentHealthRoute(router *gin.Engine, app ApplicationInterface) {
	// 简化的健康检查
	router.GET("/documents/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"service": "documents",
			"message": "Document service health check (simplified for testing)",
		})
	})
}
