package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetupDocumentRoutes sets up all document-related routes
func SetupDocumentRoutes(router *gin.Engine, db *gorm.DB, documentHandlers *DocumentHandlers) {
	// API v1 group
	v1 := router.Group("/api/v1")
	
	// Apply authentication middleware to all document routes
	v1.Use(AuthMiddleware())

	// Document management routes
	setupTaskDocumentRoutes(v1, documentHandlers)
	setupGlobalDocumentRoutes(v1, documentHandlers)
	setupDocumentVersionRoutes(v1, documentHandlers)
	setupDocumentBatchRoutes(v1, documentHandlers)
}

// setupTaskDocumentRoutes sets up routes for task-specific documents
func setupTaskDocumentRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Task document routes: /api/v1/projects/:project_id/tasks/:task_id/documents
	taskDocs := v1.Group("/projects/:project_id/tasks/:task_id/documents")
	{
		// Document CRUD operations
		taskDocs.POST("/upload", handlers.ManualUpload)           // Manual file upload
		taskDocs.GET("", handlers.ListDocuments)                 // List documents for task
		taskDocs.GET("/:document_id", handlers.GetDocument)      // Get specific document
		taskDocs.PUT("/:document_id", handlers.UpdateDocument)   // Update document metadata
		taskDocs.DELETE("/:document_id", handlers.DeleteDocument) // Delete document

		// Document download
		taskDocs.GET("/:document_id/download", handlers.DownloadDocument) // Download document

		// Document version management
		taskDocs.POST("/:document_id/versions", handlers.CreateVersion)                                    // Create new version
		taskDocs.GET("/:document_id/versions", handlers.GetVersionHistory)                               // Get version history
		taskDocs.GET("/:document_id/versions/:version_number", handlers.GetVersion)                      // Get specific version
		taskDocs.GET("/:document_id/versions/:version_number/download", handlers.DownloadVersion)        // Download specific version
		taskDocs.POST("/:document_id/versions/:version_number/restore", handlers.RestoreVersion)         // Restore to specific version
		taskDocs.DELETE("/:document_id/versions/:version_number", handlers.DeleteVersion)                // Delete specific version
		taskDocs.GET("/:document_id/versions/compare", handlers.CompareVersions)                         // Compare two versions
	}
}

// setupGlobalDocumentRoutes sets up global document routes (not tied to specific tasks)
func setupGlobalDocumentRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Global document routes: /api/v1/documents
	docs := v1.Group("/documents")
	{
		// Global document operations
		docs.POST("", handlers.APIUpload)                        // API-based document creation
		docs.GET("", handlers.ListAllDocuments)                  // List all documents (with filters)
		docs.GET("/:document_id", handlers.GetDocumentByID)      // Get document by ID
		docs.PUT("/:document_id", handlers.UpdateDocumentByID)   // Update document by ID
		docs.DELETE("/:document_id", handlers.DeleteDocumentByID) // Delete document by ID

		// Global document download
		docs.GET("/:document_id/download", handlers.DownloadDocumentByID) // Download document by ID

		// Search and filter
		docs.GET("/search", handlers.SearchDocuments)            // Search documents
		docs.GET("/recent", handlers.GetRecentDocuments)         // Get recent documents
		docs.GET("/popular", handlers.GetPopularDocuments)       // Get popular documents
	}
}

// setupDocumentVersionRoutes sets up global document version routes
func setupDocumentVersionRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Document version routes: /api/v1/document-versions
	versions := v1.Group("/document-versions")
	{
		versions.GET("/:version_id", handlers.GetVersionByID)                           // Get version by ID
		versions.GET("/:version_id/download", handlers.DownloadVersionByID)            // Download version by ID
		versions.POST("/:version_id/restore", handlers.RestoreVersionByID)             // Restore version by ID
		versions.DELETE("/:version_id", handlers.DeleteVersionByID)                    // Delete version by ID
	}
}

// setupDocumentBatchRoutes sets up batch operation routes
func setupDocumentBatchRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Batch operations: /api/v1/documents/batch
	batch := v1.Group("/documents/batch")
	{
		batch.POST("/upload", handlers.BatchUpload)              // Batch upload documents
		batch.PUT("/update", handlers.BatchUpdate)              // Batch update documents
		batch.DELETE("/delete", handlers.BatchDelete)           // Batch delete documents
		batch.POST("/download", handlers.BatchDownload)         // Batch download documents (zip)
		batch.POST("/move", handlers.BatchMove)                 // Batch move documents
		batch.POST("/duplicate", handlers.BatchDuplicate)       // Batch duplicate documents
	}
}

// Additional utility routes
func setupDocumentUtilityRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Utility routes: /api/v1/documents/utils
	utils := v1.Group("/documents/utils")
	{
		utils.GET("/stats", handlers.GetDocumentStats)          // Get document statistics
		utils.GET("/storage-usage", handlers.GetStorageUsage)   // Get storage usage statistics
		utils.POST("/validate", handlers.ValidateDocument)      // Validate document before upload
		utils.POST("/preview", handlers.GeneratePreview)        // Generate document preview
		utils.GET("/formats", handlers.GetSupportedFormats)     // Get supported file formats
	}

	// Health check and monitoring
	health := v1.Group("/documents/health")
	{
		health.GET("", handlers.HealthCheck)                    // Health check endpoint
		health.GET("/metrics", handlers.GetMetrics)             // Get service metrics
	}
}

// Document folder management routes
func setupDocumentFolderRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Document folder routes: /api/v1/document-folders
	folders := v1.Group("/document-folders")
	{
		folders.GET("", handlers.ListFolders)                   // List all folders
		folders.POST("", handlers.CreateFolder)                 // Create new folder
		folders.GET("/:folder_id", handlers.GetFolder)          // Get specific folder
		folders.PUT("/:folder_id", handlers.UpdateFolder)       // Update folder
		folders.DELETE("/:folder_id", handlers.DeleteFolder)    // Delete folder
		folders.GET("/:folder_id/documents", handlers.ListFolderDocuments) // Documents in folder
		folders.POST("/:folder_id/documents/:document_id", handlers.AddDocumentToFolder) // Add document to folder
		folders.DELETE("/:folder_id/documents/:document_id", handlers.RemoveDocumentFromFolder) // Remove document from folder
		folders.GET("/tree", handlers.GetFolderTree)            // Get folder hierarchy tree
	}
}

// Document sharing and collaboration routes
func setupDocumentSharingRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Document sharing routes: /api/v1/documents/:document_id/sharing
	sharing := v1.Group("/documents/:document_id/sharing")
	{
		sharing.POST("", handlers.CreateShare)                  // Create document share
		sharing.GET("", handlers.ListShares)                    // List document shares
		sharing.PUT("/:share_id", handlers.UpdateShare)         // Update share settings
		sharing.DELETE("/:share_id", handlers.RevokeShare)      // Revoke document share
		sharing.GET("/public/:share_token", handlers.GetSharedDocument) // Access shared document
	}

	// Public access routes (no authentication required)
	public := v1.Group("/public/documents")
	{
		public.GET("/:share_token", handlers.GetPublicDocument)  // Get publicly shared document
		public.GET("/:share_token/download", handlers.DownloadPublicDocument) // Download public document
	}
}

// Document analytics and reporting routes
func setupDocumentAnalyticsRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Analytics routes: /api/v1/documents/analytics
	analytics := v1.Group("/documents/analytics")
	{
		analytics.GET("/usage", handlers.GetUsageAnalytics)      // Get usage analytics
		analytics.GET("/activity", handlers.GetActivityLog)     // Get activity logs
		analytics.GET("/popular", handlers.GetPopularityStats)  // Get popularity statistics
		analytics.GET("/size-distribution", handlers.GetSizeDistribution) // File size distribution
		analytics.GET("/type-distribution", handlers.GetTypeDistribution) // File type distribution
		analytics.GET("/user-activity", handlers.GetUserActivity) // User activity statistics
	}
}

// Document permissions and access control routes
func setupDocumentPermissionsRoutes(v1 *gin.RouterGroup, handlers *DocumentHandlers) {
	// Permissions routes: /api/v1/documents/:document_id/permissions
	permissions := v1.Group("/documents/:document_id/permissions")
	{
		permissions.GET("", handlers.GetDocumentPermissions)     // Get document permissions
		permissions.POST("", handlers.GrantPermission)          // Grant permission to user/role
		permissions.PUT("/:permission_id", handlers.UpdatePermission) // Update permission
		permissions.DELETE("/:permission_id", handlers.RevokePermission) // Revoke permission
		permissions.GET("/check", handlers.CheckPermission)     // Check user permission
	}
}

// AuthMiddleware placeholder - should be implemented based on your authentication system
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement JWT authentication middleware
		// Extract JWT token from Authorization header
		// Validate token and extract user information
		// Set user_id in context for handlers to use
		
		// For now, set a dummy user ID for development
		c.Set("user_id", uint64(1))
		c.Next()
	}
}

// CORS middleware for API access
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// RequestLoggerMiddleware logs all API requests
func RequestLoggerMiddleware() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP,
			param.TimeStamp.Format("02/Jan/2006:15:04:05 -0700"),
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	})
}

// RateLimitMiddleware implements basic rate limiting
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement rate limiting based on IP address or user ID
		// This could use Redis or in-memory store to track request counts
		c.Next()
	}
}