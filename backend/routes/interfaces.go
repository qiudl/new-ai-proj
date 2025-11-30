package routes

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/services"
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
	// TODO: password功能开发中,暂时注释
	// GetPasswordResetHandler() *handlers.PasswordResetHandler

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
	CheckTaskTitleUniqueHandler() gin.HandlerFunc

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
	CompleteTaskHandler() gin.HandlerFunc
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
	GetUserEnterpriseHandler() *handlers.UserEnterpriseHandler

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
	// GetHybridDocumentHandler() *handlers.HybridDocumentHandler // @Deprecated: 已删除，使用GetUnifiedDocumentHandler()
	// GetSimpleDocumentHandler() *handlers.HybridDocumentHandler // @Deprecated: 已删除，使用GetUnifiedDocumentHandler()
	GetUnifiedDocumentHandler() *handlers.UnifiedDocumentHandler // 统一文档处理器
	GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler // Document folder handler
	GetDocumentVersionHandler() *handlers.DocumentVersionHandler              // Document version handler

	// 工作笔记文件夹处理器
	GetWorkNoteFolderHandler() *handlers.WorkNoteFolderHandler
	GetWorkNoteFolderTreeHandler() *handlers.WorkNoteFolderTreeHandler // 三棵树处理器（新增）

	// 协作处理器
	GetCollaborationHandler() *handlers.DocumentCollaborationHandler

	// 任务文档文件处理器
	GetTaskDocumentFileHandler() *handlers.TaskDocumentFileHandler
	GetTaskDocumentHandler() *handlers.TaskDocumentHandler

	// 任务评论处理器
	GetTaskCommentHandler() *handlers.TaskCommentHandler

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
	GetRecycledDocumentsHandler() gin.HandlerFunc
	RestoreDocumentHandler() gin.HandlerFunc
	HardDeleteDocumentHandler() gin.HandlerFunc
	GetRecycledWorkNotesHandler() gin.HandlerFunc
	RestoreWorkNoteHandler() gin.HandlerFunc
	HardDeleteWorkNoteHandler() gin.HandlerFunc
	GetRecycledRequirementsHandler() gin.HandlerFunc
	RestoreRequirementHandler() gin.HandlerFunc
	HardDeleteRequirementHandler() gin.HandlerFunc
	EmptyRecycleBinHandler() gin.HandlerFunc

	// AI配置处理器
	GetAIConfigHandler() *handlers.AIConfigHandler

	// API密钥处理器
	GetAPIKeyHandler() *handlers.APIKeyHandler

	// 系统管理员权限处理器
	GetSystemAdminHandler() *handlers.SystemAdminHandler

	// 审计日志处理器
	GetAuditHandler() *handlers.AuditHandler

	// Dashboard处理器
	GetDashboardHandler() *handlers.DashboardHandler

	// 效率分析处理器
	GetEfficiencyHandler() *handlers.EfficiencyHandler

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

	// 需求管理处理器
	GetRequirementHandler() *handlers.RequirementHandler
	GetRequirementStatusHandler() *handlers.RequirementStatusHandler
	GetRequirementCommentHandler() *handlers.RequirementCommentHandler
	GetRequirementTaskHandler() *handlers.RequirementTaskHandler
	GetRequirementHistoryHandler() *handlers.RequirementHistoryHandler
	GetMCPRequirementHandler() *handlers.MCPRequirementHandler

	// 通知处理器
	GetNotificationHandler() *handlers.NotificationHandler

	// Worktree管理处理器
	GetWorktreeHandler() *handlers.WorktreeHandler
	GetWorktreeCoordinatorHandler() *handlers.WorktreeCoordinatorHandler

	// 冲突管理处理器 (Phase 4)
	GetConflictHandler() *handlers.ConflictHandler

	// MCP Worktree处理器 (Phase 5)
	GetMCPWorktreeHandler() *handlers.MCPWorktreeHandler

	// Worktree监控处理器 (Phase 6)
	GetMonitoringHandler() *handlers.WorktreeMonitoringHandler

	// RBAC v2 Services
	GetPermissionMiddlewareV2() *middleware.PermissionMiddlewareV2
	GetPermissionServiceV2() services.PermissionServiceV2
	GetIdentityProvider() services.IdentityProvider

	// RBAC v2 Handlers
	GetSystemUserHandler() *handlers.SystemUserHandler
	GetSystemRoleHandler() *handlers.SystemRoleHandler
	GetSystemPermissionHandler() *handlers.SystemPermissionHandler
	GetEnterpriseUserHandler() *handlers.EnterpriseUserHandler
	GetEnterpriseRoleHandler() *handlers.EnterpriseRoleHandler
	GetRoleManagementHandlerV2() *handlers.RoleManagementHandlerV2 // RBAC v2 dual-layer role management

	// 导航管理处理器
	GetNavigationHandler() *handlers.NavigationHandler

	// 产品管理处理器 (SPU/SKU/Inventory)
	GetSPUHandler() *handlers.SPUHandler
	GetSKUHandler() *handlers.SKUHandler
	GetInventoryHandler() *handlers.InventoryHandler

	// MCP Dev Plans 文档同步处理器
  GetMCPDevPlansHandler() *handlers.MCPDevPlansHandler

  // Figma Integration Handler
  GetFigmaHandler() *handlers.FigmaHandler

  // MCP Public API (API-Key Authentication)
  GetMCPAPIKeyService() *services.MCPAPIKeyService
  GetMCPAPIKeyHandler() *handlers.MCPAPIKeyHandler
}
