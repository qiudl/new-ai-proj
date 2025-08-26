package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterUserStatsRoutes registers user statistics routes
func RegisterUserStatsRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	println("[DEBUG] Registering user stats routes...")
	stats := authorized.Group("/users/stats")
	{
		// Basic statistics endpoints
		stats.GET("/basic", app.GetUserStatsHandler().GetBasicStats)
		stats.GET("/roles", app.GetUserStatsHandler().GetRoleStats)
		stats.GET("/dashboard", app.GetUserStatsHandler().GetDashboardStats)
		
		// User activity and performance endpoints
		stats.GET("/activity", app.GetUserStatsHandler().GetUserActivity)
		stats.GET("/performance", app.GetUserStatsHandler().GetUserPerformance)
		stats.GET("/top-performers", app.GetUserStatsHandler().GetTopPerformers)
		
		// Company and trends endpoints
		stats.GET("/companies", app.GetUserStatsHandler().GetCompanyStats)
		stats.GET("/trends", app.GetUserStatsHandler().GetRegistrationTrends)
		
		// Active users count endpoint
		stats.GET("/active-count", app.GetUserStatsHandler().GetActiveUsersCount)
	}
	println("[DEBUG] User stats routes registered successfully")
}
