package routes

import (
	"log"
	"github.com/gin-gonic/gin"
)

// RegisterSystemRoutes 注册系统管理相关路由（简化版）
func RegisterSystemRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] RegisterSystemRoutes started (simplified for role permission testing)")
	
	// 权限管理路由 - 这是我们需要测试的核心功能
	registerPermissionManagementRoutes(authorized, app)
}

// registerPermissionManagementRoutes 注册权限管理路由
func registerPermissionManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("[DEBUG] 开始注册权限管理路由")
	
	// 检查PermissionHandler是否为nil
	permHandler := app.GetPermissionHandler()
	if permHandler == nil {
		log.Printf("[ERROR] PermissionHandler is nil, cannot register permission routes!")
		return
	}
	log.Printf("[DEBUG] PermissionHandler OK: %p", permHandler)
	
	// 基础权限管理路由
	permissions := authorized.Group("/permissions")
	{
		// 权限检查端点（所有认证用户可以检查自己的权限）
		permissions.POST("/check", permHandler.CheckUserPermission)
		log.Printf("[DEBUG] Registered POST /permissions/check")
	}
}
