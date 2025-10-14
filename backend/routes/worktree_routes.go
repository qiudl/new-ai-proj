package routes

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

// RegisterWorktreeRoutes registers worktree management routes
func RegisterWorktreeRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	fmt.Println("DEBUG: RegisterWorktreeRoutes called")

	// Get worktree handler
	worktreeHandler := app.GetWorktreeHandler()
	if worktreeHandler == nil {
		fmt.Println("WARNING: WorktreeHandler is not available, skipping worktree routes")
		return
	}

	// ============================================
	// Basic CRUD Routes
	// ============================================
	worktrees := authorized.Group("/worktrees")
	{
		// Create worktree
		worktrees.POST("", worktreeHandler.CreateWorktree)

		// List worktrees (with filters)
		worktrees.GET("", worktreeHandler.ListWorktrees)

		// Get single worktree
		worktrees.GET("/:id", worktreeHandler.GetWorktree)

		// Update worktree
		worktrees.PUT("/:id", worktreeHandler.UpdateWorktree)

		// Delete worktree
		worktrees.DELETE("/:id", worktreeHandler.DeleteWorktree)

		// ============================================
		// Lifecycle Operations
		// ============================================

		// Initialize worktree
		worktrees.POST("/:id/initialize", worktreeHandler.InitializeWorktree)

		// Activate worktree (assign AI user)
		worktrees.POST("/:id/activate", worktreeHandler.ActivateWorktree)

		// Deactivate worktree (release AI user)
		worktrees.POST("/:id/deactivate", worktreeHandler.DeactivateWorktree)

		// Complete worktree
		worktrees.POST("/:id/complete", worktreeHandler.CompleteWorktree)

		// Archive worktree
		worktrees.POST("/:id/archive", worktreeHandler.ArchiveWorktree)

		// Lock worktree
		worktrees.POST("/:id/lock", worktreeHandler.LockWorktree)

		// Unlock worktree
		worktrees.POST("/:id/unlock", worktreeHandler.UnlockWorktree)

		// ============================================
		// Health and Sync
		// ============================================

		// Health check
		worktrees.GET("/:id/health", worktreeHandler.HealthCheckWorktree)

		// Sync worktree with Git
		worktrees.POST("/:id/sync", worktreeHandler.SyncWorktree)

		// ============================================
		// Task Binding
		// ============================================

		// Bind task to worktree
		worktrees.POST("/:id/tasks", worktreeHandler.BindTask)

		// Get worktree tasks
		worktrees.GET("/:id/tasks", worktreeHandler.GetWorktreeTasks)

		// Unbind task from worktree
		worktrees.DELETE("/:id/tasks/:taskId", worktreeHandler.UnbindTask)

		// ============================================
		// Activity Logs
		// ============================================

		// Get worktree activities
		worktrees.GET("/:id/activities", worktreeHandler.GetWorktreeActivities)

		// ============================================
		// Workspace Assignment
		// ============================================

		// Get workspace assignment
		worktrees.GET("/:id/assignment", worktreeHandler.GetWorkspaceAssignment)
	}

	// ============================================
	// Project-Level Routes
	// ============================================
	projects := authorized.Group("/projects")
	{
		// Get worktree statistics for project
		projects.GET("/:id/worktrees/stats", worktreeHandler.GetWorktreeStats)

		// Get active worktrees for project
		projects.GET("/:id/worktrees/active", worktreeHandler.GetActiveWorktrees)

		// Get worktrees by expert ID
		projects.GET("/:id/worktrees/expert/:expertId", worktreeHandler.GetWorktreesByExpert)

		// Sync all worktrees in project
		projects.POST("/:id/worktrees/sync", worktreeHandler.SyncAllWorktrees)
	}

	// ============================================
	// AI User Routes
	// ============================================
	aiUsers := authorized.Group("/ai-users")
	{
		// Get workspaces for AI user
		aiUsers.GET("/:id/workspaces", worktreeHandler.GetAIUserWorkspaces)
	}

	fmt.Println("DEBUG: Worktree routes registered successfully")
}
