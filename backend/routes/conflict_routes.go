package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterConflictRoutes 注册冲突管理路由
// Phase 4: 冲突检测、监控和解决建议的REST API
func RegisterConflictRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	handler := app.GetConflictHandler()

	// ================================
	// 1. Worktree级别的冲突管理
	// ================================
	worktrees := authorized.Group("/worktrees")
	{
		// 冲突检测
		worktrees.POST("/:id/conflicts/detect", handler.DetectConflicts)
		worktrees.POST("/:id/conflicts/force-check", handler.ForceCheckConflicts)
		worktrees.GET("/:id/conflicts/cached", handler.GetCachedConflicts)
		worktrees.POST("/:id/conflicts/predict-merge", handler.PredictMergeConflicts)

		// 冲突解决
		worktrees.POST("/:id/conflicts/resolve", handler.GenerateResolutionPlans)
		worktrees.GET("/:id/conflicts/resolutions", handler.GetResolutionHistory)

		// 诊断
		worktrees.GET("/:id/conflicts/diagnose", handler.DiagnoseWorktree)

		// Worktree比较
		worktrees.POST("/compare", handler.CompareWorktrees)
	}

	// ================================
	// 2. Task级别的冲突管理
	// ================================
	tasks := authorized.Group("/tasks")
	{
		// 任务冲突检测
		tasks.POST("/:id/conflicts/detect", handler.DetectTaskConflicts)
	}

	// ================================
	// 3. Project级别的冲突概览
	// ================================
	projects := authorized.Group("/projects")
	{
		// 项目冲突概览
		projects.GET("/:id/conflicts/overview", handler.GetProjectConflictOverview)
		projects.GET("/:id/conflicts/trend", handler.GetProjectConflictTrend)
	}

	// ================================
	// 4. 全局冲突管理
	// ================================
	conflicts := authorized.Group("/conflicts")
	{
		// 统计和监控
		conflicts.GET("/statistics", handler.GetConflictStatistics)
		conflicts.POST("/monitor/interval", handler.SetMonitorInterval)

		// 健康检查
		conflicts.GET("/health", handler.HealthCheck)
	}
}
