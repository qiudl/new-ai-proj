package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterWorktreeCoordinatorRoutes 注册工作空间协调路由
// 提供智能分配、任务绑定、资源回收等高级功能
func RegisterWorktreeCoordinatorRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	handler := app.GetWorktreeCoordinatorHandler()

	// ==================== 智能分配路由 ====================
	worktrees := authorized.Group("/worktrees")
	{
		// 工作空间分配
		worktrees.POST("/allocate", handler.AllocateWorkspace)
		worktrees.POST("/:id/release", handler.ReleaseWorkspace)
		worktrees.POST("/:id/force-release", handler.ForceReleaseWorktree)
		worktrees.POST("/recommend", handler.RecommendWorktrees)

		// 智能任务绑定
		worktrees.POST("/:id/tasks/smart-bind", handler.SmartBindTask)
		worktrees.POST("/:id/tasks/batch-bind", handler.BatchBindTasks)
		worktrees.DELETE("/:id/tasks/:taskId/unbind", handler.UnbindTask)
		worktrees.POST("/:id/bindings/reorganize", handler.ReorganizeBindings)
		worktrees.POST("/:id/tasks/auto-bind-related", handler.AutoBindRelatedTasks)
	}

	// ==================== 任务相关路由 ====================
	tasks := authorized.Group("/tasks")
	{
		tasks.GET("/:id/allocation-history", handler.GetAllocationHistory)
		tasks.GET("/:id/bindings", handler.GetTaskBindings)
		tasks.GET("/:id/suggested-worktrees", handler.SuggestBindings)
	}

	// ==================== 项目级别路由 ====================
	projects := authorized.Group("/projects")
	{
		// 资源回收
		projects.POST("/:id/worktrees/reclaim", handler.ScanAndReclaim)
		projects.POST("/:id/worktrees/scheduled-cleanup", handler.ScheduledCleanup)
		projects.POST("/:id/worktrees/dry-run-reclaim", handler.DryRunReclaim)
		projects.DELETE("/:id/worktrees/archived/cleanup", handler.CleanupArchivedWorktrees)

		// 工作空间健康监控
		projects.GET("/:id/worktrees/idle", handler.GetIdleWorktrees)
		projects.GET("/:id/worktrees/archivable", handler.GetArchivableWorktrees)
		projects.GET("/:id/worktrees/health-report", handler.GenerateHealthReport)
	}
}
