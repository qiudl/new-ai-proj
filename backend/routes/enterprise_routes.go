package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterEnterpriseRoutes 注册企业管理相关路由
func RegisterEnterpriseRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 企业路由组
	enterprises := authorized.Group("/enterprises")
	{
		// 基础企业管理
		enterprises.GET("", app.GetEnterpriseHandler().GetEnterprises)
		enterprises.POST("", app.GetEnterpriseHandler().CreateEnterprise)
		enterprises.GET("/stats", app.GetEnterpriseHandler().GetEnterpriseStats)
		enterprises.GET("/:id", app.GetEnterpriseHandler().GetEnterprise)
		enterprises.PUT("/:id", app.GetEnterpriseHandler().UpdateEnterprise)
		enterprises.DELETE("/:id", app.GetEnterpriseHandler().DeleteEnterprise)

		// 企业用户管理
		enterprises.GET("/:id/users", app.GetEnterpriseHandler().GetEnterpriseUsers)
		enterprises.POST("/:id/users", app.GetEnterpriseHandler().CreateEnterpriseUser)
		enterprises.GET("/:id/users/:userId", app.GetEnterpriseHandler().GetEnterpriseUser)
		enterprises.PUT("/:id/users/:userId", app.GetEnterpriseHandler().UpdateEnterpriseUser)

		// 企业部门管理
		enterprises.GET("/:id/departments", app.GetEnterpriseHandler().GetEnterpriseDepartments)
		enterprises.POST("/:id/departments", app.GetEnterpriseHandler().CreateEnterpriseDepartment)
		enterprises.PUT("/:id/departments/:dept_id", app.GetEnterpriseHandler().UpdateEnterpriseDepartment)
		enterprises.DELETE("/:id/departments/:dept_id", app.GetEnterpriseHandler().DeleteEnterpriseDepartment)

		// 企业项目管理
		enterprises.GET("/:id/projects", app.GetEnterpriseHandler().GetEnterpriseProjects)
		enterprises.POST("/:id/projects", app.GetEnterpriseHandler().CreateProjectForEnterprise)
	}
}