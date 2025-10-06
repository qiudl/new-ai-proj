package routes

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"ai-project-backend/utils"
	"github.com/gin-gonic/gin"
)

// ApplicationInterface 最小化的Application接口
type ApplicationInterface interface {
	// 配置和基础服务
	GetConfig() *config.Config
	GetDB() database.DB
	GetJWTManager() *utils.JWTManager

	// WebSocket处理器 - DISABLED
	// GetWebSocketHandler() gin.HandlerFunc

	// 认证处理器
	GetAuthHandler() *handlers.AuthHandler
	GetServiceAccountHandler() *handlers.ServiceAccountHandler

	// 基础处理器 (for backward compatibility)
	GetHealthHandler() gin.HandlerFunc
	GetVersionHandler() gin.HandlerFunc
	GetLoginHandler() gin.HandlerFunc
	GetLogoutHandler() gin.HandlerFunc

	// Development-only auth helpers
	GetDevAccountsHandler() gin.HandlerFunc
	DevQuickLoginHandler() gin.HandlerFunc

	// 角色权限管理
	GetRoleManagementHandler() *handlers.RoleManagementHandler

	// 权限相关处理器
	GetPermissionHandler() *handlers.PermissionHandler
	GetEnhancedPermissionHandler() *handlers.EnhancedPermissionHandler
	GetUnifiedPermissionHandler() *handlers.UnifiedPermissionHandler

	// 权限审批处理器（已暂时禁用）
	// GetPermissionApprovalHandler() *handlers.PermissionApprovalHandler
	// GetPermissionApprovalGinHandler() *handlers.PermissionApprovalGinHandler

	// 角色模板处理器
	GetRoleTemplateHandler() *handlers.RoleTemplateHandler

	// 项目相关处理器
	GetProjectsHandler() gin.HandlerFunc
	CreateProjectHandler() gin.HandlerFunc
	GetProjectHandler() gin.HandlerFunc
	UpdateProjectHandler() gin.HandlerFunc
	DeleteProjectHandler() gin.HandlerFunc
	GetProjectStatsHandler() gin.HandlerFunc
	GetProjectUsersHandler() gin.HandlerFunc
	AddProjectUserHandler() gin.HandlerFunc
	RemoveProjectUserHandler() gin.HandlerFunc

	// 基础任务处理器
	GetTasksHandler() gin.HandlerFunc
	CreateTaskHandler() gin.HandlerFunc
	GetTaskHandler() gin.HandlerFunc
	UpdateTaskHandler() gin.HandlerFunc
	DeleteTaskHandler() gin.HandlerFunc

	// 任务移动与排序接口
	MoveTaskHandler() gin.HandlerFunc
	ReorderTaskHandler() gin.HandlerFunc
	BulkReorderTasksHandler() gin.HandlerFunc
	
	// 批量任务操作接口
	BulkDeleteTasksHandler() gin.HandlerFunc
	BulkArchiveTasksHandler() gin.HandlerFunc
	BulkUnarchiveTasksHandler() gin.HandlerFunc

	// 独立任务处理器（跨项目）
	GetAllTasksHandler() gin.HandlerFunc
	CreateGlobalTaskHandler() gin.HandlerFunc
	GetTaskByIdHandler() gin.HandlerFunc
	GetTaskDetailedInfoHandler() gin.HandlerFunc
	GetTaskChildrenHandler() gin.HandlerFunc
	UpdateTaskByIdHandler() gin.HandlerFunc
	DeleteTaskByIdHandler() gin.HandlerFunc
	UpdateTaskStatusHandler() gin.HandlerFunc
	MoveTaskByIdHandler() gin.HandlerFunc
	ReorderTaskByIdHandler() gin.HandlerFunc
	ArchiveTaskHandler() gin.HandlerFunc
	UnarchiveTaskHandler() gin.HandlerFunc

	// 今日任务处理器
	GetTodayTasksHandler() gin.HandlerFunc
	GetTodayTasksStatsHandler() gin.HandlerFunc
	MarkTodayTaskCompletedHandler() gin.HandlerFunc
	PostponeTodayTaskHandler() gin.HandlerFunc
	BulkOperationTodayTasksHandler() gin.HandlerFunc

	// 今日主要任务处理器
	GetDailyFocusTaskHandler() *handlers.DailyFocusTaskHandler

	// 任务组织处理器
	GetTaskOrganizationHandler() *handlers.TaskOrganizationHandler

	// 各模块处理器
	GetArchiveHandler() *handlers.ArchiveHandler
	GetCalendarSyncHandler() *handlers.CalendarSyncHandler
	GetUnifiedTimerHandler() *handlers.UnifiedTimerHandler
	GetUserTimerHandler() *handlers.UserTimerHandler
	GetUserProfileHandler() *handlers.UserProfileHandler
	GetUserManagementHandler() *handlers.UserManagementHandler

	// 公司管理处理器
	GetCompanyHandler() *handlers.CompanyHandler

	// 企业管理处理器
	GetEnterpriseHandler() *handlers.EnterpriseHandler

	// 组织管理处理器
	GetOrganizationHandler() *handlers.OrganizationHandler

	// 工作笔记处理器
	GetWorkNoteHandler() *handlers.WorkNoteHandler

	// 报告处理器
	GetReportHandler() *handlers.ReportHandler

	// 文档处理器
	GetDocumentHandler() *handlers.DocumentHandler
	GetRouterDocumentHandler() *handlers.RouterDocumentHandler // New router-based document handler
	GetHybridDocumentHandler() *handlers.HybridDocumentHandler
	GetSimpleDocumentHandler() *handlers.HybridDocumentHandler
	GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler // Document folder handler
	GetDocumentVersionHandler() *handlers.DocumentVersionHandler              // Document version handler

	// 工作笔记文件夹处理器
	GetWorkNoteFolderHandler() *handlers.WorkNoteFolderHandler

	// 协作处理器
	GetCollaborationHandler() *handlers.DocumentCollaborationHandler

	// 任务文档文件处理器
	GetTaskDocumentFileHandler() *handlers.TaskDocumentFileHandler
	GetTaskDocumentHandler() *handlers.TaskDocumentHandler

	// 文档元数据处理器
	GetDocumentProjectsHandler() gin.HandlerFunc
	GetDocumentCustomersHandler() gin.HandlerFunc
	GetDocumentCategoriesHandler() gin.HandlerFunc

	// 任务层级处理器
	GetTaskHierarchyHandler() *handlers.TaskHierarchyHandler
	GetTaskTimelineHandler() gin.HandlerFunc

	// 时间线处理器
	GetTimelineHandler() *handlers.TimelineHandler

	// 任务更新处理器
	GetTaskUpdatesHandler() gin.HandlerFunc
	UpdateTaskUpdateHandler() gin.HandlerFunc
	DeleteTaskUpdateHandler() gin.HandlerFunc

	// 验证处理器
	ValidateParentHandler() gin.HandlerFunc

	// 分析埋点处理器
	GetAnalyticsHandler() *handlers.AnalyticsHandler

	// 批量操作处理器
	GetBulkOperationHandler() *handlers.BulkOperationHandler

	// 回收站处理器
	GetRecycledTasksHandler() gin.HandlerFunc
	RestoreTaskHandler() gin.HandlerFunc
	HardDeleteTaskHandler() gin.HandlerFunc
	GetRecycledProjectsHandler() gin.HandlerFunc
	RestoreProjectHandler() gin.HandlerFunc
	HardDeleteProjectHandler() gin.HandlerFunc
	EmptyRecycleBinHandler() gin.HandlerFunc

	// AI配置处理器
	GetAIConfigHandler() *handlers.AIConfigHandler

	// API密钥处理器
	GetAPIKeyHandler() *handlers.APIKeyHandler

	// Dashboard处理器
	GetDashboardHandler() *handlers.DashboardHandler

	// AI子任务处理器
	GetAISubtaskHandler() *handlers.AISubtaskHandler

	// AI文档生成处理器
	GetAIDocumentHandler() *handlers.AIDocumentHandler

	// AI描述生成处理器
	GetAIDescriptionHandler() *handlers.AIDescriptionHandler

	// AI限流器
	GetAIRateLimiter() interface{}

	// 测试数据生成服务
	GetTestDataGeneratorService() interface{}
}
