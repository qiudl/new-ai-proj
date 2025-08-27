package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterCompanyRoutes 注册公司管理相关路由
func RegisterCompanyRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 公司路由组
	companies := authorized.Group("/companies")
	{
		// 基础公司管理
		companies.GET("", app.GetCompanyHandler().GetCompanies)
		companies.POST("", app.GetCompanyHandler().CreateCompany)
		companies.GET("/stats", app.GetCompanyHandler().GetCompanyStats)
		companies.GET("/:id", app.GetCompanyHandler().GetCompany)
		companies.PUT("/:id", app.GetCompanyHandler().UpdateCompany)
		companies.DELETE("/:id", app.GetCompanyHandler().DeleteCompany)
		
		// 公司用户管理
		companies.GET("/:id/users", app.GetCompanyHandler().GetCompanyUsers)
		companies.POST("/:id/users", app.GetCompanyHandler().CreateCompanyUser)
		companies.GET("/:id/users/:userId", app.GetCompanyHandler().GetCompanyUser)
		companies.PUT("/:id/users/:userId", app.GetCompanyHandler().UpdateCompanyUser)
		companies.DELETE("/:id/users/:userId", app.GetCompanyHandler().DeleteCompanyUser)
		
		// 公司用户权限管理
		companies.POST("/:id/users/:userId/role", app.GetCompanyHandler().AssignUserRole)
		companies.GET("/:id/users/:userId/permissions", app.GetCompanyHandler().GetUserPermissions)
		companies.PUT("/:id/users/:userId/permissions", app.GetCompanyHandler().UpdateUserPermissions)
		
		// 联系记录
		companies.GET("/:id/contacts", app.GetCompanyHandler().GetCompanyContacts)
	}
}
