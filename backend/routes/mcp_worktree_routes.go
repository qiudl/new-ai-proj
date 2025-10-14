package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterMCPWorktreeRoutes 注册MCP Worktree工具路由
// Phase 5: 为Claude Code提供原生Worktree支持
func RegisterMCPWorktreeRoutes(mcp *gin.RouterGroup, app ApplicationInterface) {
	handler := app.GetMCPWorktreeHandler()

	// ============================================================================
	// MCP Worktree管理工具 - 12个核心工具
	// ============================================================================

	wt := mcp.Group("/wt")
	{
		// Tool 1: wt_create - 创建新的Worktree
		wt.POST("/create", handler.WtCreate)

		// Tool 2: wt_assign - 分配Worktree给AI用户
		wt.POST("/assign", handler.WtAssign)

		// Tool 3: wt_status - 查看Worktree状态
		wt.GET("/:id/status", handler.WtStatus)

		// Tool 4: wt_list - 列出所有Worktrees
		wt.GET("/list", handler.WtList)

		// Tool 5: wt_bind_task - 绑定任务到Worktree
		wt.POST("/bind-task", handler.WtBindTask)

		// Tool 6: wt_unbind_task - 解绑任务
		wt.POST("/unbind-task", handler.WtUnbindTask)

		// Tool 7: wt_conflict_check - 检测冲突
		wt.POST("/:id/conflict-check", handler.WtConflictCheck)

		// Tool 8: wt_conflict_resolve - 生成解决方案
		wt.POST("/:id/conflict-resolve", handler.WtConflictResolve)

		// Tool 9: wt_allocate - 智能分配工作空间
		wt.POST("/allocate", handler.WtAllocate)

		// Tool 10: wt_release - 释放工作空间
		wt.POST("/release", handler.WtRelease)

		// Tool 11: wt_sync - 同步Worktree代码
		wt.POST("/:id/sync", handler.WtSync)

		// Tool 12: wt_health - 健康检查
		wt.GET("/health", handler.WtHealth)
	}
}
