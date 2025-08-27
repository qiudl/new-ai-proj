package routes

import (
	"ai-project-backend/handlers"
	"github.com/gin-gonic/gin"
)

// RegisterPermissionSystemRoutes 注册权限系统管理路由
func RegisterPermissionSystemRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取权限系统处理器
	permissionSystemHandler := app.GetPermissionSystemHandler()
	
	// 权限系统管理路由组
	permissionSystem := authorized.Group("/system/permissions")
	
	// 基础管理路由
	{
		// 权限系统初始化
		permissionSystem.POST("/initialize", permissionSystemHandler.InitializePermissionSystem)
		
		// 权限系统状态
		permissionSystem.GET("/status", permissionSystemHandler.GetPermissionSystemStatus)
		
		// 权限统计信息
		permissionSystem.GET("/statistics", permissionSystemHandler.GetPermissionStatistics)
	}
	
	// 权限数据查询路由
	{
		// 获取所有权限
		permissionSystem.GET("", permissionSystemHandler.GetAllPermissions)
		
		// 根据分类获取权限
		permissionSystem.GET("/category/:category", permissionSystemHandler.GetPermissionsByCategory)
		
		// 导出权限数据
		permissionSystem.GET("/export", permissionSystemHandler.ExportPermissions)
	}
	
	// 权限模块和规范路由
	{
		// 获取权限模块列表
		permissionSystem.GET("/modules", permissionSystemHandler.GetPermissionModules)
		
		// 获取权限操作类型
		permissionSystem.GET("/operation-types", permissionSystemHandler.GetPermissionOperationTypes)
		
		// 获取权限编码规范
		permissionSystem.GET("/code-rules", permissionSystemHandler.GetPermissionCodeRules)
	}
	
	// 权限验证路由
	{
		// 验证单个权限编码
		permissionSystem.POST("/validate-code", permissionSystemHandler.ValidatePermissionCode)
		
		// 批量验证权限编码
		permissionSystem.POST("/batch-validate-codes", permissionSystemHandler.BatchValidatePermissionCodes)
	}
}

// 在 system_routes.go 中添加权限系统路由注册
func registerPermissionSystemManagementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	RegisterPermissionSystemRoutes(authorized, app)
}
