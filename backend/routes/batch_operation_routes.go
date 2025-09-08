package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterBatchOperationRoutes registers all batch operation routes
func RegisterBatchOperationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	bulkHandler := app.GetBulkOperationHandler()
	
	// Batch operations group
	batch := authorized.Group("/batch")
	{
		// Generic batch operation endpoints
		batch.POST("/validate", bulkHandler.ValidateBatchOperation)
		batch.POST("/execute", bulkHandler.ExecuteBatchOperation)
		batch.POST("/preview", bulkHandler.PreviewBatchOperation)
		batch.GET("/status/:operation_id", bulkHandler.GetBatchOperationStatus)

		// Legacy bulk endpoints (for backward compatibility)
		batch.POST("/tasks/import", bulkHandler.BulkImportTasks)
		batch.POST("/tasks/csv-import", bulkHandler.ImportTasksFromCSV)
		batch.POST("/tasks/validate-preview", bulkHandler.BatchValidateTasksPreview())
		batch.POST("/tasks/status-update", bulkHandler.BulkUpdateTaskStatus)
		batch.POST("/tasks/update", bulkHandler.BulkUpdateTasks)
		batch.DELETE("/tasks/delete", bulkHandler.BulkDeleteTasks())

		// New enhanced batch operation endpoints
		operations := batch.Group("/operations")
		{
			// Status operations
			operations.POST("/status-update", bulkHandler.BatchStatusUpdate)
			
			// Hierarchy operations
			operations.POST("/parent-change", bulkHandler.BatchParentChange)
			
			// Assignment operations
			operations.POST("/assignee-change", bulkHandler.BatchAssigneeChange)
			
			// Delete operations
			operations.POST("/delete", bulkHandler.BatchDelete)
			
			// Archive operations
			operations.POST("/archive", bulkHandler.BatchArchive)
		}

		// Task-specific batch operations
		tasks := batch.Group("/tasks")
		{
			// Task creation and import
			tasks.POST("", bulkHandler.BulkImportTasks)
			tasks.POST("/csv", bulkHandler.ImportTasksFromCSV)
			
			// Task validation and preview
			tasks.POST("/validate", bulkHandler.BatchValidateTasksPreview())
			
			// Task updates (legacy compatibility)
			tasks.PUT("/status", bulkHandler.BulkUpdateTaskStatus)
			tasks.PUT("", bulkHandler.BulkUpdateTasks)
			
			// Task deletion
			tasks.DELETE("", bulkHandler.BulkDeleteTasks())
		}
	}

	// Alternative endpoint structure for REST compliance
	bulkOps := authorized.Group("/bulk-operations")
	{
		// RESTful bulk operation endpoints
		bulkOps.POST("", bulkHandler.ExecuteBatchOperation)
		bulkOps.POST("/validate", bulkHandler.ValidateBatchOperation)
		bulkOps.POST("/preview", bulkHandler.PreviewBatchOperation)
		bulkOps.GET("/:operation_id", bulkHandler.GetBatchOperationStatus)
		
		// Resource-specific bulk operations
		bulkOps.POST("/tasks/status", bulkHandler.BatchStatusUpdate)
		bulkOps.POST("/tasks/parent", bulkHandler.BatchParentChange)
		bulkOps.POST("/tasks/assignee", bulkHandler.BatchAssigneeChange)
		bulkOps.DELETE("/tasks", bulkHandler.BatchDelete)
		bulkOps.POST("/tasks/archive", bulkHandler.BatchArchive)
	}
}