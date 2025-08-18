package application

import (
	"ai-project-backend/handlers"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Build-time variables for version handler
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

// Health and version handlers
func (app *Application) healthHandler(c *gin.Context) {
	// Test database connection
	dbStatus := "healthy"
	if err := app.db.Ping(); err != nil {
		app.logger.Printf("Database health check failed: %v", err)
		dbStatus = "unhealthy"
	}

	status := gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   Version,
		"database":  dbStatus,
	}

	c.JSON(http.StatusOK, status)
}

func (app *Application) versionHandler(c *gin.Context) {
	versionInfo := gin.H{
		"version":    Version,
		"build_time": BuildTime,
		"git_commit": GitCommit,
		"go_version": "go1.21+",
	}

	c.JSON(http.StatusOK, versionInfo)
}

// Exported getters to align with routes.ApplicationInterface
func (app *Application) GetHealthHandler() gin.HandlerFunc { return app.healthHandler }
func (app *Application) GetVersionHandler() gin.HandlerFunc { return app.versionHandler }
func (app *Application) GetLoginHandler() gin.HandlerFunc { return app.handlers.AuthHandler.Login }
func (app *Application) GetLogoutHandler() gin.HandlerFunc { return app.handlers.AuthHandler.Logout }
func (app *Application) GetAllTasksHandler() gin.HandlerFunc { return app.handlers.TaskHandler.GetAllTasks }
func (app *Application) GetTasksHandler() gin.HandlerFunc { return app.handlers.TaskHandler.GetTasks }
func (app *Application) GetTaskHandler() gin.HandlerFunc { return app.handlers.TaskHandler.GetTask }
func (app *Application) CreateTaskHandler() gin.HandlerFunc { return app.handlers.TaskHandler.CreateTask }
func (app *Application) UpdateTaskHandler() gin.HandlerFunc { return app.handlers.TaskHandler.UpdateTask }
func (app *Application) DeleteTaskHandler() gin.HandlerFunc { return app.handlers.TaskHandler.DeleteTask }
func (app *Application) BulkDeleteTasksHandler() gin.HandlerFunc { return app.handlers.BulkOperationHandler.BulkDeleteTasks() }
func (app *Application) BatchValidateTasksPreviewHandler() gin.HandlerFunc { return app.handlers.BulkOperationHandler.BatchValidateTasksPreview() }
func (app *Application) GetTaskTreeHandler() gin.HandlerFunc { return app.handlers.TaskHierarchyHandler.GetTaskTree }
func (app *Application) GetRootTasksHandler() gin.HandlerFunc { return app.handlers.TaskHierarchyHandler.GetRootTasks }
func (app *Application) SearchParentTasksHandler() gin.HandlerFunc { return app.handlers.TaskHierarchyHandler.SearchParentTasks }
func (app *Application) BulkImportTasksHandler() gin.HandlerFunc { return app.handlers.BulkOperationHandler.BulkImportTasks }
func (app *Application) ImportTasksFromCSVHandler() gin.HandlerFunc { return app.handlers.BulkOperationHandler.ImportTasksFromCSV }
func (app *Application) BulkUpdateTaskStatusHandler() gin.HandlerFunc { return app.handlers.BulkOperationHandler.BulkUpdateTaskStatus }
func (app *Application) BatchUpdateTasksHandler() gin.HandlerFunc { return app.handlers.BulkOperationHandler.BulkUpdateTaskStatus }
func (app *Application) GetTaskChildrenHandler() gin.HandlerFunc { return app.handlers.TaskHierarchyHandler.GetTaskChildren }
func (app *Application) GetProjectsHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.GetProjects }
func (app *Application) CreateProjectHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.CreateProject }
func (app *Application) GetProjectHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.GetProject }
func (app *Application) UpdateProjectHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.UpdateProject }
func (app *Application) DeleteProjectHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.DeleteProject }
func (app *Application) GetProjectStatsHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.GetProjectStats }
func (app *Application) GetProjectUsersHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.GetProjectUsers }
func (app *Application) AddProjectUserHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.AddProjectUser }
func (app *Application) RemoveProjectUserHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.RemoveProjectUser }
func (app *Application) FileDownloadHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "FileDownloadHandler not implemented"})
	}
}
func (app *Application) GetDocumentProjectsHandler() gin.HandlerFunc { return app.handlers.ProjectHandler.GetDocumentProjects }
func (app *Application) MapUserToCompanyUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		// For development/admin users, skip company mapping and continue
		// This is a simplified implementation for basic functionality
		c.Next()
	}
}
func (app *Application) ValidateParentHandler() gin.HandlerFunc { return app.handlers.ValidationHandler.ValidateParent }
func (app *Application) ValidateTaskHierarchyHandler() gin.HandlerFunc { return app.handlers.ValidationHandler.ValidateTaskHierarchy }
func (app *Application) ValidateTaskDependenciesHandler() gin.HandlerFunc { return app.handlers.ValidationHandler.ValidateTaskDependencies }
func (app *Application) ValidateProjectAccessHandler() gin.HandlerFunc { return app.handlers.ValidationHandler.ValidateProjectAccess }

// Recycle bin handlers
func (app *Application) GetRecycledTasksHandler() gin.HandlerFunc { return app.handlers.RecycleBinHandler.GetRecycledTasks }
func (app *Application) RestoreTaskHandler() gin.HandlerFunc { return app.handlers.RecycleBinHandler.RestoreTask }
func (app *Application) HardDeleteTaskHandler() gin.HandlerFunc { return app.handlers.RecycleBinHandler.HardDeleteTask }
func (app *Application) EmptyRecycleBinHandler() gin.HandlerFunc { return app.handlers.RecycleBinHandler.EmptyRecycleBin }

// Audit handlers
func (app *Application) GetAuditLogsHandler() gin.HandlerFunc { return app.handlers.AuditEnhancedHandler.GetAuditLogs }
func (app *Application) GetAuditLogHandler() gin.HandlerFunc { return app.handlers.AuditEnhancedHandler.GetAuditLog }
func (app *Application) GetAuditStatsHandler() gin.HandlerFunc { return app.handlers.AuditEnhancedHandler.GetAuditStats }
func (app *Application) ExportAuditLogsHandler() gin.HandlerFunc {
	// TODO: Implement export audit logs handler
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ExportAuditLogsHandler not implemented"})
	}
}

// Task update handlers
func (app *Application) GetTaskUpdatesHandler() gin.HandlerFunc { return app.handlers.TaskUpdateHandler.GetTaskUpdates }
func (app *Application) UpdateTaskUpdateHandler() gin.HandlerFunc { return app.handlers.TaskUpdateHandler.UpdateTaskUpdate }
func (app *Application) DeleteTaskUpdateHandler() gin.HandlerFunc { return app.handlers.TaskUpdateHandler.DeleteTaskUpdate }
func (app *Application) GetTaskTimelineHandler() gin.HandlerFunc { return app.handlers.TaskUpdateHandler.GetTaskTimeline }

// Today tasks handlers
func (app *Application) GetTodayTasksHandler() gin.HandlerFunc { return app.handlers.TodayTasksHandler.GetTodayTasks }
func (app *Application) GetTodayTasksStatsHandler() gin.HandlerFunc { return app.handlers.TodayTasksHandler.GetTodayTasksStats }
func (app *Application) MarkTodayTaskCompletedHandler() gin.HandlerFunc { return app.handlers.TodayTasksHandler.MarkTodayTaskCompleted }
func (app *Application) PostponeTodayTaskHandler() gin.HandlerFunc { return app.handlers.TodayTasksHandler.PostponeTodayTask }
func (app *Application) BulkOperationTodayTasksHandler() gin.HandlerFunc { return app.handlers.TodayTasksHandler.BulkOperationTodayTasks }

// Document utility handlers
func (app *Application) GetDocumentCustomersHandler() gin.HandlerFunc { return app.handlers.DocumentUtilityHandler.GetDocumentCustomers }
func (app *Application) GetDocumentCategoriesHandler() gin.HandlerFunc { return app.handlers.DocumentUtilityHandler.GetDocumentCategories }

// Dev login helpers (development only)
func (app *Application) GetDevAccountsHandler() gin.HandlerFunc { return app.handlers.AuthHandler.GetDevAccounts }
func (app *Application) DevQuickLoginHandler() gin.HandlerFunc { return app.handlers.AuthHandler.DevQuickLogin }

// Handler getter methods for ApplicationInterface
func (app *Application) GetAIConfigHandler() *handlers.AIConfigHandler {
	return app.handlers.AIConfigHandler
}

func (app *Application) GetAITaskGeneratorHandler() *handlers.AITaskGeneratorHandler {
	return app.handlers.AITaskGeneratorHandler
}

func (app *Application) GetDashboardHandler() *handlers.DashboardHandler {
	return app.handlers.DashboardHandler
}

func (app *Application) GetTaskAnalysisHandler() *handlers.TaskAnalysisHandler {
	return app.handlers.TaskAnalysisHandler
}

func (app *Application) GetAPIKeyHandler() *handlers.APIKeyHandler {
	return app.handlers.APIKeyHandler
}

func (app *Application) GetStatisticsHandler() *handlers.StatisticsHandlers {
	return app.handlers.StatisticsHandler
}

func (app *Application) GetAuditHandler() *handlers.AuditHandler {
	return app.handlers.AuditHandler
}

func (app *Application) GetSmartTemplateHandler() *handlers.SmartTemplateHandler {
	return app.handlers.SmartTemplateHandler
}

func (app *Application) GetCollaborationHandler() *handlers.DocumentCollaborationHandler {
	return app.handlers.CollaborationHandler
}

func (app *Application) GetArchiveHandler() *handlers.ArchiveHandler {
	return app.handlers.ArchiveHandler
}

func (app *Application) GetCustomerHandler() *handlers.CustomerHandler {
	return app.handlers.CustomerHandler
}

func (app *Application) GetCompanyHandler() *handlers.CompanyHandler {
	return app.handlers.CompanyHandler
}

func (app *Application) GetPermissionHandler() *handlers.PermissionHandler {
	return app.handlers.PermissionHandler
}

func (app *Application) GetUserManagementHandler() *handlers.UserManagementHandler {
	return app.handlers.UserManagementHandler
}

func (app *Application) GetUserProfileHandlerInstance() *handlers.UserProfileHandler {
	return app.handlers.UserProfileHandler
}

// User profile handlers
func (app *Application) GetUserProfileHandler() gin.HandlerFunc { return app.handlers.UserProfileHandler.GetUserProfile }
func (app *Application) UpdateUserProfileHandler() gin.HandlerFunc { return app.handlers.UserProfileHandler.UpdateUserProfile }
func (app *Application) ChangePasswordHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ChangePasswordHandler not implemented"})
	}
}

func (app *Application) GetAIConfigPlaceholderHandler() *handlers.AIConfigPlaceholderHandler {
	return app.handlers.AIConfigPlaceholderHandler
}

func (app *Application) GetUtilityHandler() *handlers.UtilityHandler {
	return app.handlers.UtilityHandler
}

func (app *Application) GetCompanyUserHandler() *handlers.CompanyUserHandler {
	return app.handlers.CompanyUserHandler
}

func (app *Application) GetDocumentHandler() *handlers.DocumentHandler {
	return app.handlers.DocumentHandler
}

func (app *Application) GetHybridDocumentHandler() *handlers.HybridDocumentHandler {
	return app.handlers.HybridDocumentHandler
}

func (app *Application) GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler {
	return app.handlers.HybridDocumentFolderHandler
}

func (app *Application) GetSimpleDocumentHandler() *handlers.SimpleDocumentHandler {
	return app.handlers.SimpleDocumentHandler
}

func (app *Application) GetUnifiedDocumentHandler() *handlers.UnifiedDocumentHandler {
	return app.handlers.UnifiedDocumentHandler
}

func (app *Application) GetTimerHandler() *handlers.TimerHandler {
	return app.handlers.TimerHandler
}

func (app *Application) GetUserTimerHandler() *handlers.UserTimerHandler {
	return app.handlers.UserTimerHandler
}

func (app *Application) GetUnifiedTimerHandler() *handlers.UnifiedTimerHandler {
	return app.handlers.UnifiedTimerHandler
}

func (app *Application) GetTaskDocumentFileHandler() *handlers.TaskDocumentFileHandler {
	return app.handlers.TaskDocumentFileHandler
}

func (app *Application) GetGoogleAuthHandler() *handlers.GoogleAuthHandler {
	return app.handlers.GoogleAuthHandler
}

func (app *Application) GetCalendarSyncHandler() *handlers.CalendarSyncHandler {
	return app.handlers.CalendarSyncHandler
}

func (app *Application) GetBulkOperationHandler() *handlers.BulkOperationHandler {
	return app.handlers.BulkOperationHandler
}

func (app *Application) GetValidationHandler() *handlers.ValidationHandler {
	return app.handlers.ValidationHandler
}

// Recycle bin handler methods
func (app *Application) GetRecycledProjectsHandler() gin.HandlerFunc {
	return app.handlers.ProjectHandler.GetRecycledProjects
}

func (app *Application) GetRecycledDocumentsHandler() gin.HandlerFunc {
	// TODO: Implement getRecycledDocumentsHandler method
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "getRecycledDocumentsHandler not implemented"})
	}
}

func (app *Application) RestoreProjectHandler() gin.HandlerFunc {
	return app.handlers.ProjectHandler.RestoreProject
}

func (app *Application) RestoreDocumentHandler() gin.HandlerFunc {
	// TODO: Implement restoreDocumentHandler method
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "restoreDocumentHandler not implemented"})
	}
}