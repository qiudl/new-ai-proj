package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterAPIRoutes 注册API路由（简化版，专注于角色权限测试）
func RegisterAPIRoutes(router *gin.Engine, authorized *gin.RouterGroup, app ApplicationInterface) {
	// 简化的公共路由
	// 保持基本结构以便系统正常运行
	// Note: /health and /version are already registered in setup.go
}
