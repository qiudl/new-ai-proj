package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoleTemplateRoutes configures the role template routes using Gin
func RegisterRoleTemplateRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	handler := app.GetRoleTemplateHandler()
	if handler == nil {
		return
	}

	// Create a subrouter for role template endpoints
	templateGroup := authorized.Group("/role-templates")

	// Template CRUD operations
	templateGroup.POST("", handler.CreateRoleTemplate)             // Create new template
	templateGroup.GET("", handler.ListRoleTemplates)               // List templates with filtering
	templateGroup.GET("/:id", handler.GetRoleTemplate)             // Get specific template
	templateGroup.PUT("/:id", handler.UpdateRoleTemplate)          // Update template
	templateGroup.DELETE("/:id", handler.DeleteRoleTemplate)       // Delete template

	// Template operations
	templateGroup.POST("/:id/apply", handler.ApplyTemplateToRole)  // Apply template to role
	templateGroup.POST("/:id/clone", handler.CloneTemplate)        // Clone template
	
	// Template queries
	templateGroup.GET("/category/:category", handler.GetTemplatesByCategory) // Get templates by category
	templateGroup.GET("/:id/permissions", handler.GetTemplatePermissions)    // Get template permissions
	templateGroup.GET("/defaults", handler.GetDefaultTemplates)              // Get default system templates

	// TODO: 需要实现统计端点
	// templateGroup.GET("/stats", handler.GetTemplateStats)                   // Get template statistics
	// 前端 RoleTemplatesPage.tsx 当前使用模拟数据 (total=0, system=0, business=0, custom=0)
	// 需要实现返回: { total_templates, system_templates, business_templates, custom_templates }

	// Admin-only routes (if admin middleware is available)
	// adminGroup := templateGroup.Group("/admin")
	// adminGroup.Use(AdminMiddleware()) // Uncomment when admin middleware is available
	// adminGroup.POST("/system-templates", handler.CreateSystemTemplate)
	// adminGroup.GET("/usage-stats", handler.GetTemplateUsageStats)
}