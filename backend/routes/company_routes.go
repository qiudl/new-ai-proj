package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterCompanyRoutes 注册公司管理相关路由 (兼容企业架构)
func RegisterCompanyRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 公司路由组 - 提供向后兼容性，内部代理到企业API
	companies := authorized.Group("/companies")
	{
		// 基础公司管理 - 代理到企业API
		companies.GET("", app.GetCompanyHandler().GetCompanies)       // 代理到 enterprises
		companies.POST("", app.GetCompanyHandler().CreateCompany)     // 代理到 enterprises
		companies.GET("/stats", app.GetCompanyHandler().GetCompanyStats) // 代理到 enterprises/stats
		companies.GET("/:id", app.GetCompanyHandler().GetCompany)     // 代理到 enterprises/:id
		companies.PUT("/:id", app.GetCompanyHandler().UpdateCompany)  // 代理到 enterprises/:id
		companies.DELETE("/:id", app.GetCompanyHandler().DeleteCompany) // 代理到 enterprises/:id

		// 公司用户管理 - 代理到企业用户API
		companies.GET("/:id/users", app.GetCompanyHandler().GetCompanyUsers)      // 代理到 enterprises/:id/users
		companies.POST("/:id/users", app.GetCompanyHandler().CreateCompanyUser)   // 代理到 enterprises/:id/users
		companies.GET("/:id/users/:userId", app.GetCompanyHandler().GetCompanyUser) // 代理到 enterprises/:id/users/:userId
		companies.PUT("/:id/users/:userId", app.GetCompanyHandler().UpdateCompanyUser) // 代理到 enterprises/:id/users/:userId
		companies.DELETE("/:id/users/:userId", app.GetCompanyHandler().DeleteCompanyUser) // 代理到 enterprises/:id/users/:userId

		// 公司用户权限管理 - 代理到企业权限API
		companies.POST("/:id/users/:userId/role", app.GetCompanyHandler().AssignUserRole)
		companies.GET("/:id/users/:userId/permissions", app.GetCompanyHandler().GetUserPermissions)
		companies.PUT("/:id/users/:userId/permissions", app.GetCompanyHandler().UpdateUserPermissions)

		// 联系记录 - 保留原有功能
		companies.GET("/:id/contacts", app.GetCompanyHandler().GetCompanyContacts)
	}

	// 企业架构别名路由 - 为过渡期提供灵活性
	enterpriseCompatibility := authorized.Group("/company-enterprises")
	{
		// 提供企业到公司的映射端点
		enterpriseCompatibility.GET("/mapping", app.GetCompanyHandler().GetEnterpriseMapping)
		enterpriseCompatibility.POST("/migrate/:companyId", app.GetCompanyHandler().MigrateCompanyToEnterprise)
	}
}
