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
	
	// 注意：权限检查路由已在 permission_routes.go 中注册，避免重复注册
	log.Printf("[DEBUG] Permission check routes already registered in permission_routes.go")
}
