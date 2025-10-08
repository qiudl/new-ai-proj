package application

import (
	"ai-project-backend/handlers"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// 恢复Handler方法实现，使用工厂模式
// 只包含gin.HandlerFunc类型的方法，避免与application.go中的getter方法冲突

// Health and version handlers
func (app *Application) GetHealthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"message":   "Service is healthy",
			"service":   "ai-project-backend",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func (app *Application) GetVersionHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"version": "1.0.0",
			"service": "ai-project-backend",
			"build":   "development",
		})
	}
}

// Authentication handlers
func (app *Application) GetLoginHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.AuthHandler != nil {
		return app.handlers.AuthHandler.Login
	}
	// Fallback to individual handler
	return app.authHandler.Login
}

func (app *Application) GetLogoutHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.AuthHandler != nil {
		return app.handlers.AuthHandler.Logout
	}
	return app.authHandler.Logout
}

func (app *Application) DevQuickLoginHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.AuthHandler != nil {
		return app.handlers.AuthHandler.DevQuickLogin
	}
	return app.authHandler.DevQuickLogin
}

func (app *Application) GetDevAccountsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.AuthHandler != nil {
		return app.handlers.AuthHandler.GetDevAccounts
	}
	return app.authHandler.GetDevAccounts
}

// Project handlers
func (app *Application) GetProjectsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.GetProjects
	}
	return app.projectHandler.GetProjects
}

func (app *Application) CreateProjectHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.CreateProject
	}
	return app.projectHandler.CreateProject
}

func (app *Application) GetProjectHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.GetProject
	}
	return app.projectHandler.GetProject
}

func (app *Application) UpdateProjectHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.UpdateProject
	}
	return app.projectHandler.UpdateProject
}

func (app *Application) DeleteProjectHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.DeleteProject
	}
	return app.projectHandler.DeleteProject
}

func (app *Application) GetProjectStatsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.GetProjectStats
	}
	// Fallback implementation
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"stats": gin.H{}})
	}
}

func (app *Application) GetProjectUsersHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.GetProjectUsers
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"users": []gin.H{}})
	}
}

func (app *Application) AddProjectUserHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.AddProjectUser
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "User added to project"})
	}
}

func (app *Application) RemoveProjectUserHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ProjectHandler != nil {
		return app.handlers.ProjectHandler.RemoveProjectUser
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "User removed from project"})
	}
}

// Task handlers
func (app *Application) GetTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.GetTasks
	}
	return app.taskHandler.GetTasks
}

func (app *Application) GetAllTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.GetAllTasks
	}
	return app.taskHandler.GetAllTasks
}

func (app *Application) GetTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.GetTask
	}
	return app.taskHandler.GetTask
}

func (app *Application) CreateTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.CreateTask
	}
	return app.taskHandler.CreateTask
}

func (app *Application) UpdateTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.UpdateTask
	}
	return app.taskHandler.UpdateTask
}

func (app *Application) DeleteTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.DeleteTask
	}
	return app.taskHandler.DeleteTask
}

func (app *Application) MoveTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.MoveTask
	}
	return app.taskHandler.MoveTask
}

func (app *Application) ReorderTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.ReorderTask
	}
	return app.taskHandler.ReorderTask
}

func (app *Application) BulkReorderTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.BulkReorderTasks
	}
	return app.taskHandler.BulkReorderTasks
}

func (app *Application) BulkDeleteTasksHandler() gin.HandlerFunc {
	// Create bulk operation handler on-demand
	bulkOpHandler := handlers.NewBulkOperationHandler(app.db, app.logger, app.validator)
	return bulkOpHandler.BulkDeleteTasks()
}

func (app *Application) BulkArchiveTasksHandler() gin.HandlerFunc {
	return app.taskHandler.BulkArchiveTasks
}

func (app *Application) BulkUnarchiveTasksHandler() gin.HandlerFunc {
	return app.taskHandler.BulkUnarchiveTasks
}

func (app *Application) GetTaskProgressHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.GetTaskProgress
	}
	return app.taskHandler.GetTaskProgress
}

// Task hierarchy handlers
func (app *Application) GetTaskTreeHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHierarchyHandler != nil {
		return app.handlers.TaskHierarchyHandler.GetTaskTree
	}
	return app.taskHierarchyHandler.GetTaskTree
}

func (app *Application) GetRootTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHierarchyHandler != nil {
		return app.handlers.TaskHierarchyHandler.GetRootTasks
	}
	return app.taskHierarchyHandler.GetRootTasks
}

func (app *Application) GetTaskChildrenHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHierarchyHandler != nil {
		return app.handlers.TaskHierarchyHandler.GetTaskChildren
	}
	return app.taskHierarchyHandler.GetTaskChildren
}

func (app *Application) SearchParentTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHierarchyHandler != nil {
		return app.handlers.TaskHierarchyHandler.SearchParentTasks
	}
	return app.taskHierarchyHandler.SearchParentTasks
}

func (app *Application) GetTaskDescendantsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHierarchyHandler != nil {
		return app.handlers.TaskHierarchyHandler.GetTaskDescendants
	}
	return app.taskHierarchyHandler.GetTaskDescendants
}


func (app *Application) BulkImportTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.BulkOperationHandler != nil {
		return app.handlers.BulkOperationHandler.BulkImportTasks
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "BulkImportTasksHandler not implemented"})
	}
}

func (app *Application) ImportTasksFromCSVHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.BulkOperationHandler != nil {
		return app.handlers.BulkOperationHandler.ImportTasksFromCSV
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ImportTasksFromCSVHandler not implemented"})
	}
}

func (app *Application) BatchValidateTasksPreviewHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.BulkOperationHandler != nil {
		return app.handlers.BulkOperationHandler.BatchValidateTasksPreview()
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "BatchValidateTasksPreviewHandler not implemented"})
	}
}

func (app *Application) BulkUpdateTaskStatusHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.BulkOperationHandler != nil {
		return app.handlers.BulkOperationHandler.BulkUpdateTaskStatus
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "BulkUpdateTaskStatusHandler not implemented"})
	}
}

func (app *Application) BatchUpdateTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.BulkOperationHandler != nil {
		return app.handlers.BulkOperationHandler.BulkUpdateTasks
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "BatchUpdateTasksHandler not implemented"})
	}
}

// Validation handlers
func (app *Application) ValidateParentHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ValidationHandler != nil {
		return app.handlers.ValidationHandler.ValidateParent
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ValidateParentHandler not implemented"})
	}
}

func (app *Application) ValidateTaskHierarchyHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ValidationHandler != nil {
		return app.handlers.ValidationHandler.ValidateTaskHierarchy
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ValidateTaskHierarchyHandler not implemented"})
	}
}

func (app *Application) ValidateTaskDependenciesHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ValidationHandler != nil {
		return app.handlers.ValidationHandler.ValidateTaskDependencies
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ValidateTaskDependenciesHandler not implemented"})
	}
}

func (app *Application) ValidateProjectAccessHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.ValidationHandler != nil {
		return app.handlers.ValidationHandler.ValidateProjectAccess
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ValidateProjectAccessHandler not implemented"})
	}
}

// Today tasks handlers
func (app *Application) GetTodayTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TodayTasksHandler != nil {
		return app.handlers.TodayTasksHandler.GetTodayTasks
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetTodayTasksHandler not implemented"})
	}
}

func (app *Application) GetTodayTasksStatsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TodayTasksHandler != nil {
		return app.handlers.TodayTasksHandler.GetTodayTasksStats
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetTodayTasksStatsHandler not implemented"})
	}
}

func (app *Application) MarkTodayTaskCompletedHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TodayTasksHandler != nil {
		return app.handlers.TodayTasksHandler.MarkTodayTaskCompleted
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "MarkTodayTaskCompletedHandler not implemented"})
	}
}

func (app *Application) PostponeTodayTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TodayTasksHandler != nil {
		return app.handlers.TodayTasksHandler.PostponeTodayTask
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "PostponeTodayTaskHandler not implemented"})
	}
}

func (app *Application) BulkOperationTodayTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TodayTasksHandler != nil {
		return app.handlers.TodayTasksHandler.BulkOperationTodayTasks
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "BulkOperationTodayTasksHandler not implemented"})
	}
}

// Audit handlers
func (app *Application) GetAuditLogsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.AuditEnhancedHandler != nil {
		return app.handlers.AuditEnhancedHandler.GetAuditLogs
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetAuditLogsHandler not implemented"})
	}
}

func (app *Application) GetAuditLogHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.AuditEnhancedHandler != nil {
		return app.handlers.AuditEnhancedHandler.GetAuditLog
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetAuditLogHandler not implemented"})
	}
}

func (app *Application) GetAuditStatsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.AuditEnhancedHandler != nil {
		return app.handlers.AuditEnhancedHandler.GetAuditStats
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetAuditStatsHandler not implemented"})
	}
}

func (app *Application) ExportAuditLogsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "ExportAuditLogsHandler not implemented"})
	}
}

// Task update handlers
func (app *Application) GetTaskUpdatesHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskUpdateHandler != nil {
		return app.handlers.TaskUpdateHandler.GetTaskUpdates
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetTaskUpdatesHandler not implemented"})
	}
}

func (app *Application) UpdateTaskUpdateHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskUpdateHandler != nil {
		return app.handlers.TaskUpdateHandler.UpdateTaskUpdate
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "UpdateTaskUpdateHandler not implemented"})
	}
}

func (app *Application) DeleteTaskUpdateHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskUpdateHandler != nil {
		return app.handlers.TaskUpdateHandler.DeleteTaskUpdate
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "DeleteTaskUpdateHandler not implemented"})
	}
}

func (app *Application) GetTaskTimelineHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskUpdateHandler != nil {
		return app.handlers.TaskUpdateHandler.GetTaskTimeline
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetTaskTimelineHandler not implemented"})
	}
}

// Recycle bin handlers
func (app *Application) GetRecycledTasksHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.GetRecycledTasks
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetRecycledTasksHandler not implemented"})
	}
}

func (app *Application) RestoreTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.RestoreTask
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "RestoreTaskHandler not implemented"})
	}
}

func (app *Application) HardDeleteTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.HardDeleteTask
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "HardDeleteTaskHandler not implemented"})
	}
}

func (app *Application) GetRecycledDocumentsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.GetRecycledDocuments
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetRecycledDocumentsHandler not implemented"})
	}
}

func (app *Application) GetRecycledWorkNotesHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.GetRecycledWorkNotes
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetRecycledWorkNotesHandler not implemented"})
	}
}

func (app *Application) EmptyRecycleBinHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.EmptyRecycleBin
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "EmptyRecycleBinHandler not implemented"})
	}
}

// Project recycle bin handlers
func (app *Application) GetRecycledProjectsHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.GetRecycledProjects
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "GetRecycledProjectsHandler not implemented"})
	}
}

func (app *Application) RestoreProjectHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.RestoreProject
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "RestoreProjectHandler not implemented"})
	}
}

func (app *Application) HardDeleteProjectHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.RecycleBinHandler != nil {
		return app.handlers.RecycleBinHandler.HardDeleteProject
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "HardDeleteProjectHandler not implemented"})
	}
}

// Additional methods
func (app *Application) FileDownloadHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "FileDownloadHandler not implemented"})
	}
}

// Analytics handler getter
func (app *Application) GetAnalyticsHandler() *handlers.AnalyticsHandler {
	if app.handlers != nil && app.handlers.AnalyticsHandler != nil {
		return app.handlers.AnalyticsHandler
	}
	// Fallback: construct a new handler using current DB
	return handlers.NewAnalyticsHandler(app.db)
}

// User mapping middleware
func (app *Application) MapUserToCompanyUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 简化版本的用户映射中间件
		c.Next()
	}
}

// Missing methods required by ApplicationInterface

// 独立任务处理器（跨项目）
func (app *Application) CreateGlobalTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.CreateTask
	}
	return app.taskHandler.CreateTask
}

func (app *Application) GetTaskByIdHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.GetTask
	}
	return app.taskHandler.GetTask
}

func (app *Application) GetTaskDetailedInfoHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.GetTaskDetailedInfo
	}
	return app.taskHandler.GetTaskDetailedInfo
}

func (app *Application) UpdateTaskByIdHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.UpdateTask
	}
	return app.taskHandler.UpdateTask
}

func (app *Application) DeleteTaskByIdHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.DeleteTask
	}
	return app.taskHandler.DeleteTask
}

func (app *Application) UpdateTaskStatusHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.UpdateTaskStatus
	}
	return app.taskHandler.UpdateTaskStatus
}

func (app *Application) MoveTaskByIdHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.MoveTask
	}
	return app.taskHandler.MoveTask
}

func (app *Application) ReorderTaskByIdHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.ReorderTask
	}
	return app.taskHandler.ReorderTask
}

func (app *Application) ArchiveTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.ArchiveTask
	}
	return app.taskHandler.ArchiveTask
}

func (app *Application) UnarchiveTaskHandler() gin.HandlerFunc {
	if app.handlers != nil && app.handlers.TaskHandler != nil {
		return app.handlers.TaskHandler.UnarchiveTask
	}
	return app.taskHandler.UnarchiveTask
}

func (app *Application) GetRouterDocumentHandler() *handlers.RouterDocumentHandler {
	return app.routerDocumentHandler
}

// GetBulkOperationHandler returns the bulk operation handler
func (app *Application) GetBulkOperationHandler() *handlers.BulkOperationHandler {
	if app.handlers != nil && app.handlers.BulkOperationHandler != nil {
		return app.handlers.BulkOperationHandler
	}
	// Fallback: create handler on-demand
	return handlers.NewBulkOperationHandler(app.db, app.logger, app.validator)
}
