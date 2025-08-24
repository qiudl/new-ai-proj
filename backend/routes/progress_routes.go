package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterProgressRoutes registers progress calculation routes
func RegisterProgressRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Log that we're registering progress routes
	if gin.IsDebugging() {
		println("[DEBUG] Registering progress routes...")
	}
	
	// Progress routes group
	progress := authorized.Group("/progress")
	{
		// Get progress configuration
		progress.GET("/config", app.GetProgressHandler().GetProgressConfig)
		
		// Calculate progress for an entity
		progress.GET("/:entityType/:id", app.GetProgressHandler().GetProgress)
		
		// Get historical snapshots
		progress.GET("/:entityType/:id/snapshots", app.GetProgressHandler().GetProgressSnapshots)
		
		// Force recalculation
		progress.POST("/recompute", app.GetProgressHandler().RecomputeProgress)
	}
}
