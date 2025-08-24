package routes

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"ai-project-backend/utils"
	"github.com/gin-gonic/gin"
)

// ApplicationInterface 定义Application的接口，用于路由配置
type ApplicationInterface interface {
	// 配置和基础服务
	GetConfig() *config.Config
	GetDB() database.DB
	GetJWTManager() *utils.JWTManager

	// 基础处理器（导出getter，返回 gin.HandlerFunc）
	GetHealthHandler() gin.HandlerFunc
	GetVersionHandler() gin.HandlerFunc
	GetLoginHandler() gin.HandlerFunc
	GetLogoutHandler() gin.HandlerFunc

	// Development-only auth helpers
	GetDevAccountsHandler() gin.HandlerFunc
	DevQuickLoginHandler() gin.HandlerFunc

	// 今日任务相关处理器方法
	GetTodayTasksHandler() gin.HandlerFunc
	GetTodayTasksStatsHandler() gin.HandlerFunc
	BulkOperationTodayTasksHandler() gin.HandlerFunc
	MarkTodayTaskCompletedHandler() gin.HandlerFunc
	PostponeTodayTaskHandler() gin.HandlerFunc
	ValidateParentHandler() gin.HandlerFunc

	// 任务相关的基础处理器方法
	GetAllTasksHandler() gin.HandlerFunc
	GetTasksHandler() gin.HandlerFunc
	GetTaskHandler() gin.HandlerFunc
	CreateTaskHandler() gin.HandlerFunc
	UpdateTaskHandler() gin.HandlerFunc
	DeleteTaskHandler() gin.HandlerFunc
	BulkDeleteTasksHandler() gin.HandlerFunc
	BatchUpdateTasksHandler() gin.HandlerFunc
	BatchValidateTasksPreviewHandler() gin.HandlerFunc
	GetTaskTreeHandler() gin.HandlerFunc
	GetRootTasksHandler() gin.HandlerFunc
	SearchParentTasksHandler() gin.HandlerFunc
	BulkImportTasksHandler() gin.HandlerFunc
GetTaskChildrenHandler() gin.HandlerFunc
	GetTaskDescendantsHandler() gin.HandlerFunc
	GetTaskUpdatesHandler() gin.HandlerFunc
	UpdateTaskUpdateHandler() gin.HandlerFunc
	DeleteTaskUpdateHandler() gin.HandlerFunc
	GetTaskTimelineHandler() gin.HandlerFunc
	// 新增：任务进度计算接口
	GetTaskProgressHandler() gin.HandlerFunc

	// 项目相关
	GetProjectsHandler() gin.HandlerFunc
	CreateProjectHandler() gin.HandlerFunc
	GetProjectHandler() gin.HandlerFunc
	UpdateProjectHandler() gin.HandlerFunc
	DeleteProjectHandler() gin.HandlerFunc
	GetProjectStatsHandler() gin.HandlerFunc
	
	// 项目用户管理
	GetProjectUsersHandler() gin.HandlerFunc
	AddProjectUserHandler() gin.HandlerFunc
	RemoveProjectUserHandler() gin.HandlerFunc

	// 文件处理器方法
	FileDownloadHandler() gin.HandlerFunc

	// 文档元数据处理器方法
	GetDocumentProjectsHandler() gin.HandlerFunc
	GetDocumentCustomersHandler() gin.HandlerFunc
	GetDocumentCategoriesHandler() gin.HandlerFunc

	// 中间件相关方法
	MapUserToCompanyUser() gin.HandlerFunc

	// 各模块处理器
	GetCustomerHandler() *handlers.CustomerHandler
	GetCompanyHandler() *handlers.CompanyHandler
	GetPermissionHandler() *handlers.PermissionHandler
	GetUserManagementHandler() *handlers.UserManagementHandler
	GetCompanyUserHandler() *handlers.CompanyUserHandler

	// 文档管理处理器
	GetDocumentHandler() *handlers.DocumentHandler
	GetHybridDocumentHandler() *handlers.HybridDocumentHandler
	GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler
	GetSimpleDocumentHandler() *handlers.SimpleDocumentHandler
	GetUnifiedDocumentHandler() *handlers.UnifiedDocumentHandler

	// 计时器处理器
	GetTimerHandler() *handlers.TimerHandler
	GetUserTimerHandler() *handlers.UserTimerHandler
	GetUnifiedTimerHandler() *handlers.UnifiedTimerHandler

	// 其他处理器
	GetArchiveHandler() *handlers.ArchiveHandler
	GetTaskDocumentFileHandler() *handlers.TaskDocumentFileHandler
	GetGoogleAuthHandler() *handlers.GoogleAuthHandler
	GetCalendarSyncHandler() *handlers.CalendarSyncHandler
	GetSmartTemplateHandler() *handlers.SmartTemplateHandler
	GetCollaborationHandler() *handlers.DocumentCollaborationHandler
	GetStatisticsHandler() *handlers.StatisticsHandlers
	GetAnalyticsHandler() *handlers.AnalyticsHandler
	GetAuditHandler() *handlers.AuditHandler
	GetAIConfigHandler() *handlers.AIConfigHandler
	GetAITaskGeneratorHandler() *handlers.AITaskGeneratorHandler
	GetDashboardHandler() *handlers.DashboardHandler
	GetTaskAnalysisHandler() *handlers.TaskAnalysisHandler
	GetAPIKeyHandler() *handlers.APIKeyHandler
	GetProgressHandler() *handlers.ProgressHandler
	GetTaskRelationshipHandler() *handlers.TaskRelationshipHandler

	// 回收站相关处理器方法
	GetRecycledProjectsHandler() gin.HandlerFunc
	GetRecycledTasksHandler() gin.HandlerFunc
	GetRecycledDocumentsHandler() gin.HandlerFunc
	RestoreProjectHandler() gin.HandlerFunc
	RestoreTaskHandler() gin.HandlerFunc
	RestoreDocumentHandler() gin.HandlerFunc

	// 审计日志处理器方法
	GetAuditLogsHandler() gin.HandlerFunc
	GetAuditLogHandler() gin.HandlerFunc
	GetAuditStatsHandler() gin.HandlerFunc
	ExportAuditLogsHandler() gin.HandlerFunc
}
