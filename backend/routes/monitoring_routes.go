package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterMonitoringRoutes 注册监控路由
// Phase 6: 系统监控、资源管理、健康检查
func RegisterMonitoringRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	handler := app.GetMonitoringHandler()

	monitoring := authorized.Group("/monitoring")
	{
		// 指标收集
		monitoring.GET("/metrics", handler.GetSystemMetrics)

		// 健康检查
		monitoring.GET("/health", handler.CheckHealth)
		monitoring.GET("/ping", handler.SimpleHealthCheck)

		// 资源分析
		monitoring.GET("/resources", handler.AnalyzeResources)

		// 配置管理
		monitoring.GET("/thresholds", handler.GetAlertThresholds)
		monitoring.PUT("/thresholds", handler.UpdateAlertThresholds)

		// 缓存管理
		monitoring.POST("/cache/invalidate", handler.InvalidateCache)
	}
}
