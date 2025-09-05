package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterOrganizationRoutes 注册组织管理相关路由
func RegisterOrganizationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 组织路由组
	organization := authorized.Group("/organization")
	{
		// 部门管理
		organization.GET("/departments", app.GetOrganizationHandler().GetDepartments)
		organization.POST("/departments", app.GetOrganizationHandler().CreateDepartment)
		organization.GET("/departments/:id", app.GetOrganizationHandler().GetDepartment)
		organization.PUT("/departments/:id", app.GetOrganizationHandler().UpdateDepartment)
		organization.DELETE("/departments/:id", app.GetOrganizationHandler().DeleteDepartment)
		
		// 部门员工管理
		organization.GET("/departments/:id/employees", app.GetOrganizationHandler().GetDepartmentEmployees)
		organization.GET("/employees", app.GetOrganizationHandler().GetAllEmployees)
		
		// 可用经理列表
		organization.GET("/managers", app.GetOrganizationHandler().GetAvailableManagers)
		
		// 组织统计信息
		organization.GET("/stats", app.GetOrganizationHandler().GetOrganizationStats)
	}
}