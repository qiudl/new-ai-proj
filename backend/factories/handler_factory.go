package factories

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"ai-project-backend/interfaces"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/jmoiron/sqlx"
)

// HandlerFactory 处理器工厂结构
type HandlerFactory struct {
	db       database.DB
	logger   *log.Logger
	validate *validator.Validate
	config   *config.Config
}

// NewHandlerFactory 创建处理器工厂实例
func NewHandlerFactory(db database.DB, logger *log.Logger, validate *validator.Validate, cfg *config.Config) *HandlerFactory {
	return &HandlerFactory{
		db:       db,
		logger:   logger,
		validate: validate,
		config:   cfg,
	}
}

// CreateAllHandlers 创建所有处理器并返回填充的Application结构
func (f *HandlerFactory) CreateAllHandlers() (*AllHandlers, error) {
	allHandlers := &AllHandlers{}
	
	// 认证处理器
	allHandlers.AuthHandler = handlers.NewAuthHandler(f.db, f.logger, f.validate, utils.NewJWTManager(f.config.JWT.Secret, f.config.JWT.Expiration), f.config)
	
	// 基础处理器
	allHandlers.CustomerHandler = handlers.NewCustomerHandler(f.db, f.logger, f.validate)
	allHandlers.CompanyHandler = handlers.NewCompanyHandler(f.db, f.logger, f.validate)
	allHandlers.ProjectHandler = handlers.NewProjectHandler(f.db, f.logger, f.validate)
	allHandlers.PermissionHandler = handlers.NewPermissionHandler(f.db.Permissions())
	
	// 任务管理处理器
	allHandlers.TaskHandler = handlers.NewTaskHandler(f.db, f.logger, f.validate)
	allHandlers.TaskHierarchyHandler = handlers.NewTaskHierarchyHandler(f.db, f.logger, f.validate)

	// 用户管理处理器
	allHandlers.UserProfileHandler = handlers.NewUserProfileHandler(f.db, f.logger, f.validate)

	// AI配置处理器 (占位)
	allHandlers.AIConfigPlaceholderHandler = handlers.NewAIConfigPlaceholderHandler(f.db, f.logger, f.validate)

	// 通用工具处理器
	allHandlers.UtilityHandler = handlers.NewUtilityHandler(f.db, f.logger, f.validate)
	
	// 用户管理处理器
	userManagementRepo := database.NewUserManagementRepository(f.db.GetDB())
	allHandlers.UserManagementHandler = handlers.NewUserManagementHandler(userManagementRepo)
	
	// 公司用户处理器
	serviceManager := services.NewServiceManager(f.db)
	allHandlers.CompanyUserHandler = handlers.NewCompanyUserHandler(
		f.db.Users(), 
		f.db.Companies(), 
		serviceManager.AsyncLogger(), 
		f.validate,
	)
	
	// 文档管理处理器 (混合版本，直接SQL)
	allHandlers.HybridDocumentHandler = handlers.NewHybridDocumentHandler(f.db)
	allHandlers.HybridDocumentFolderHandler = handlers.NewHybridDocumentFolderHandler(f.db)
	allHandlers.SimpleDocumentHandler = handlers.NewSimpleDocumentHandler()
	allHandlers.TimerHandler = handlers.NewTimerHandler(f.db)
	
	// 任务文档处理器
	docsBasePath := "./docs" // 可以通过配置文件配置
	
	// 统一文档处理器 (新架构)
	documentConfig, err := config.LoadDocumentConfig("")
	if err != nil {
		f.logger.Printf("Failed to load document config, using defaults: %v", err)
		documentConfig = &interfaces.DocumentConfig{
			BasePath:          docsBasePath,
			GitEnabled:        true,
			CacheEnabled:      true,
			MaxFileSize:       10 * 1024 * 1024,
			AllowedExtensions: []string{".md", ".txt"},
			BackupEnabled:     true,
		}
	}
	unifiedDocumentService := services.NewUnifiedDocumentService(documentConfig)
	allHandlers.UnifiedDocumentHandler = handlers.NewUnifiedDocumentHandler(unifiedDocumentService)
	
	// 基于文件的任务文档处理器 (向后兼容)
	taskDocumentFileService := services.NewTaskDocumentFileService(docsBasePath)
	allHandlers.TaskDocumentFileHandler = handlers.NewTaskDocumentFileHandler(taskDocumentFileService)
	
	allHandlers.UserTimerHandler = handlers.NewUserTimerHandler(f.db, taskDocumentFileService)
	allHandlers.UnifiedTimerHandler = handlers.NewUnifiedTimerHandler(f.db)
	
	// 归档处理器
	allHandlers.ArchiveHandler = handlers.NewArchiveHandler(f.db)
	
	// 回收站处理器
	allHandlers.RecycleBinHandler = handlers.NewRecycleBinHandler(f.db, f.logger, f.validate)
	
	// 增强版审计处理器
	allHandlers.AuditEnhancedHandler = handlers.NewAuditEnhancedHandler(f.db, f.logger, f.validate)
	
	// 任务更新处理器
	allHandlers.TaskUpdateHandler = handlers.NewTaskUpdateHandler(f.db, f.logger, f.validate)
	
	// 今日任务处理器
	allHandlers.TodayTasksHandler = handlers.NewTodayTasksHandler(f.db, f.logger, f.validate)
	
	// 文档工具处理器
	allHandlers.DocumentUtilityHandler = handlers.NewDocumentUtilityHandler(f.db, f.logger, f.validate)
	
	// 批量操作处理器
	allHandlers.BulkOperationHandler = handlers.NewBulkOperationHandler(f.db, f.logger, f.validate)
	
	// 验证处理器
	allHandlers.ValidationHandler = handlers.NewValidationHandler(f.db, f.logger, f.validate)
	
	// 创建智能模板服务和处理器
	smartTemplateService := services.NewSmartTemplateService(f.db.GetDB().(*sql.DB))
	allHandlers.SmartTemplateHandler = handlers.NewSmartTemplateHandler(smartTemplateService)
	
	// 创建协作服务和处理器
	collaborationService := services.NewDocumentCollaborationService(f.db.GetDB().(*sql.DB))
	allHandlers.CollaborationHandler = handlers.NewDocumentCollaborationHandler(collaborationService)
	
	// 统计处理器
	allHandlers.StatisticsHandler = handlers.NewStatisticsHandlers(f.db.GetDB().(*sql.DB))
	
	// 审计处理器
	allHandlers.AuditHandler = handlers.NewAuditHandler(f.db, f.logger, f.validate)
	
	// AI配置处理器（可通过环境变量禁用以便本地开发）
	sqlxDB := sqlx.NewDb(f.db.GetDB().(*sql.DB), "postgres")
	if err := f.createAIHandlers(allHandlers, sqlxDB); err != nil {
		return nil, err
	}
	
	// 仪表板处理器
	allHandlers.DashboardHandler = handlers.NewDashboardHandler(f.db)
	
	// 任务分析处理器
	allHandlers.TaskAnalysisHandler = handlers.NewTaskAnalysisHandler(f.db)
	
	// API密钥管理处理器
	allHandlers.APIKeyHandler = handlers.NewAPIKeyHandler(f.db.GetDB())
	
	// Google日历集成服务和处理器
	googleCalendarService := services.NewGoogleCalendarService()
	allHandlers.GoogleAuthHandler = handlers.NewGoogleAuthHandler(googleCalendarService, f.db.Users(), f.db.GoogleAuth())
	
	// 日历同步服务和处理器
	calendarSyncRepo := database.NewCalendarSyncRepository(sqlxDB)
	calendarSyncService := services.NewCalendarSyncService(googleCalendarService, calendarSyncRepo, f.db.GoogleAuth())
	allHandlers.CalendarSyncHandler = handlers.NewCalendarSyncHandler(calendarSyncService, calendarSyncRepo)
	
	return allHandlers, nil
}

// createAIHandlers 创建AI相关处理器
func (f *HandlerFactory) createAIHandlers(h *AllHandlers, sqlxDB *sqlx.DB) error {
	// 设置 AI_CONFIG_ENABLED=false 可跳过AI配置初始化
	if enabled := strings.ToLower(strings.TrimSpace(os.Getenv("AI_CONFIG_ENABLED"))); enabled == "" || enabled == "true" || enabled == "1" {
		aiConfigRepo, err := database.NewAIConfigRepository(sqlxDB)
		if err != nil {
			return fmt.Errorf("failed to create AI config repository: %w", err)
		}
		h.AIConfigHandler = handlers.NewAIConfigHandler(aiConfigRepo)

		// AI任务生成处理器
		historyRepo := database.NewAIGenerationHistoryRepository(sqlxDB)
		h.AITaskGeneratorHandler = handlers.NewAITaskGeneratorHandler(
			aiConfigRepo,
			f.db.Tasks(),
			f.db.Projects(),
			historyRepo,
		)
	} else {
		f.logger.Printf("AI configuration subsystem disabled by AI_CONFIG_ENABLED=%q", os.Getenv("AI_CONFIG_ENABLED"))
	}
	return nil
}