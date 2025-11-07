package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterRequirementRoutes registers requirement-related routes
func RegisterRequirementRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Get requirement handler
	requirementHandler := app.GetRequirementHandler()
	if requirementHandler == nil {
		return
	}

	// Get requirement status handler (enhanced status management)
	requirementStatusHandler := app.GetRequirementStatusHandler()

	// Get requirement comment handler
	requirementCommentHandler := app.GetRequirementCommentHandler()

	// Get requirement-task link handler
	requirementTaskHandler := app.GetRequirementTaskHandler()

	// Requirements routes
	requirements := authorized.Group("/requirements")
	{
		// List and create requirements
		requirements.GET("", requirementHandler.GetRequirements)
		requirements.POST("", requirementHandler.CreateRequirement)

		// Statistics endpoint
		requirements.GET("/stats", requirementHandler.GetRequirementStats)

		// Individual requirement routes
		requirements.GET("/:id", requirementHandler.GetRequirement)
		requirements.PUT("/:id", requirementHandler.UpdateRequirement)
		requirements.DELETE("/:id", requirementHandler.DeleteRequirement)

		// Status management - use enhanced handler if available, fallback to basic
		if requirementStatusHandler != nil {
			// Enhanced status management with comprehensive permission checking
			requirements.PUT("/:id/status", requirementStatusHandler.UpdateRequirementStatusEnhanced)

			// Convenience endpoints for common status transitions
			requirements.POST("/:id/submit", requirementStatusHandler.SubmitRequirement)
			requirements.POST("/:id/approve", requirementStatusHandler.ApproveRequirement)
			requirements.POST("/:id/reject", requirementStatusHandler.RejectRequirement)
			requirements.POST("/:id/withdraw", requirementStatusHandler.WithdrawRequirement)
			requirements.POST("/:id/archive", requirementStatusHandler.ArchiveRequirement)

			// Permission inquiry endpoint
			requirements.GET("/:id/permissions", requirementStatusHandler.GetRequirementPermissions)
		} else {
			// Fallback to basic status management
			requirements.PUT("/:id/status", requirementHandler.UpdateRequirementStatus)
		}

		// Convert requirement to task
		requirements.POST("/:id/convert-to-task", requirementHandler.ConvertRequirementToTask)

		// Task link management
		if requirementTaskHandler != nil {
			// Link and unlink tasks
			requirements.POST("/:id/tasks", requirementTaskHandler.LinkTaskToRequirement)
			requirements.DELETE("/:id/tasks/:task_id", requirementTaskHandler.UnlinkTaskFromRequirement)
			requirements.GET("/:id/tasks", requirementTaskHandler.GetRequirementTasks)
		}

		// Comment routes
		if requirementCommentHandler != nil {
			comments := requirements.Group("/comments")
			{
				// Create and list comments
				comments.POST("", requirementCommentHandler.CreateComment)
				comments.GET("", requirementCommentHandler.GetComments) // ?requirement_id=X

				// Get comments where current user was @mentioned
				comments.GET("/mentions/me", requirementCommentHandler.GetMentionedComments)

				// Individual comment operations
				comments.GET("/:id", requirementCommentHandler.GetComment)
				comments.PUT("/:id", requirementCommentHandler.UpdateComment)
				comments.DELETE("/:id", requirementCommentHandler.DeleteComment)

				// Pin/unpin comment (admin only)
				comments.PUT("/:id/pin", requirementCommentHandler.TogglePin)
			}
		}
	}
}
