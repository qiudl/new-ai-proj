package factories

import "ai-project-backend/handlers"

// AllHandlers 包含所有处理器的结构
type AllHandlers struct {
	// 认证处理器
	AuthHandler               *handlers.AuthHandler

	// 分析埋点处理器
	AnalyticsHandler         *handlers.AnalyticsHandler

	// 基础业务处理器
	CustomerHandler           *handlers.CustomerHandler
	CompanyHandler            *handlers.CompanyHandler
	ProjectHandler            *handlers.ProjectHandler
	PermissionHandler         *handlers.PermissionHandler
	UserManagementHandler     *handlers.UserManagementHandler
	CompanyUserHandler        *handlers.CompanyUserHandler

	// 文档管理处理器
	DocumentHandler             *handlers.DocumentHandler
	HybridDocumentHandler       *handlers.HybridDocumentHandler
	HybridDocumentFolderHandler *handlers.HybridDocumentFolderHandler
	SimpleDocumentHandler       *handlers.SimpleDocumentHandler
	UnifiedDocumentHandler      *handlers.UnifiedDocumentHandler

	// 计时器处理器
	TimerHandler        *handlers.TimerHandler
	UserTimerHandler    *handlers.UserTimerHandler
	UnifiedTimerHandler *handlers.UnifiedTimerHandler

	// 任务管理处理器
	TaskHandler                *handlers.TaskHandler
	TaskHierarchyHandler       *handlers.TaskHierarchyHandler

	// 用户管理处理器
	UserProfileHandler         *handlers.UserProfileHandler

	// AI配置处理器 (占位)
	AIConfigPlaceholderHandler *handlers.AIConfigPlaceholderHandler

	// 通用工具处理器
	UtilityHandler             *handlers.UtilityHandler

	// 其他业务处理器
	ArchiveHandler             *handlers.ArchiveHandler
	RecycleBinHandler          *handlers.RecycleBinHandler
	AuditEnhancedHandler       *handlers.AuditEnhancedHandler
	TaskUpdateHandler          *handlers.TaskUpdateHandler
	TodayTasksHandler          *handlers.TodayTasksHandler
	DocumentUtilityHandler     *handlers.DocumentUtilityHandler
	BulkOperationHandler       *handlers.BulkOperationHandler
	ValidationHandler          *handlers.ValidationHandler
	TaskDocumentFileHandler    *handlers.TaskDocumentFileHandler
	GoogleAuthHandler          *handlers.GoogleAuthHandler
	CalendarSyncHandler        *handlers.CalendarSyncHandler
	SmartTemplateHandler       *handlers.SmartTemplateHandler
	CollaborationHandler       *handlers.DocumentCollaborationHandler
	StatisticsHandler          *handlers.StatisticsHandlers
	AuditHandler               *handlers.AuditHandler
	AIConfigHandler            *handlers.AIConfigHandler
	AITaskGeneratorHandler     *handlers.AITaskGeneratorHandler
	DashboardHandler           *handlers.DashboardHandler
	TaskAnalysisHandler        *handlers.TaskAnalysisHandler
	APIKeyHandler              *handlers.APIKeyHandler
	ProgressHandler            *handlers.ProgressHandler
	TaskRelationshipHandler    *handlers.TaskRelationshipHandler
}
