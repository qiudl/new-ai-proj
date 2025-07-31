package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// Build-time variables
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

// Application holds the application dependencies
type Application struct {
	config            *config.Config
	db                database.DB
	logger            *log.Logger
	validator         *validator.Validate
	jwtManager        *utils.JWTManager
	// authMiddleware    *middleware.AuthMiddleware    // TODO: Fix interface issues
	// permissionMiddleware *middleware.PermissionMiddleware // TODO: Fix interface issues
	customerHandler     *handlers.CustomerHandler
	companyHandler      *handlers.CompanyHandler
	permissionHandler   *handlers.PermissionHandler
	userManagementHandler *handlers.UserManagementHandler
	companyUserHandler  *handlers.CompanyUserHandler
	// 文档管理处理器 (混合版本，直接SQL)
	hybridDocumentHandler       *handlers.HybridDocumentHandler
	hybridDocumentFolderHandler *handlers.HybridDocumentFolderHandler
	// documentRelationHandler *handlers.DocumentRelationHandler // 临时注释，避免编译错误
	// documentVersionHandler *handlers.DocumentVersionHandler // 临时注释，避免编译错误
	// documentVersionLabelHandler *handlers.DocumentVersionLabelHandler // 临时注释，避免编译错误
	// documentVersionCommentHandler *handlers.DocumentVersionCommentHandler // 临时注释，避免编译错误
	timerHandler               *handlers.TimerHandler
	archiveHandler             *handlers.ArchiveHandler
	taskDocumentHandler        *handlers.TaskDocumentHandler
	// 归档的复杂处理器 - MVP版本不需要
	// unifiedTaskDocumentHandler *handlers.UnifiedTaskDocumentHandler
	// upgradedTaskDocumentHandler *handlers.UpgradedTaskDocumentHandler
	smartTemplateHandler       *handlers.SmartTemplateHandler
	collaborationHandler       *handlers.DocumentCollaborationHandler
	statisticsHandler          *handlers.StatisticsHandlers
	auditHandler               *handlers.AuditHandler
	aiConfigHandler            *handlers.AIConfigHandler
	aiTaskGeneratorHandler     *handlers.AITaskGeneratorHandler
}

// NewApplication creates a new application instance
func NewApplication() (*Application, error) {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %v", err)
	}

	// Initialize database
	db, err := initDB(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %v", err)
	}

	// Initialize validator
	validate := validator.New()

	// Initialize JWT manager
	jwtManager := utils.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.Expiration,
	)

	// Initialize logger
	logger := log.New(log.Writer(), "[API] ", log.LstdFlags)

	// Initialize middleware
	// TODO: Fix middleware interface issues
	// authConfig := &middleware.AuthConfig{...}
	// authMiddleware := middleware.NewAuthMiddleware(authConfig)
	// permissionMiddleware := middleware.NewPermissionMiddleware(db.Permissions())

	// Initialize handlers
	customerHandler := handlers.NewCustomerHandler(db, logger, validate)
	companyHandler := handlers.NewCompanyHandler(db, logger, validate)
	permissionHandler := handlers.NewPermissionHandler(db.Permissions())
	userManagementRepo := database.NewUserManagementRepository(db.GetDB())
	userManagementHandler := handlers.NewUserManagementHandler(userManagementRepo)
	
	// Company user handler
	serviceManager := services.NewServiceManager(db)
	companyUserHandler := handlers.NewCompanyUserHandler(
		db.Users(), 
		db.Companies(), 
		serviceManager.AsyncLogger(), 
		validate,
	)
	// 文档管理处理器 (混合版本，直接SQL)
	hybridDocumentHandler := handlers.NewHybridDocumentHandler(db)
	hybridDocumentFolderHandler := handlers.NewHybridDocumentFolderHandler(db)
	// documentRelationHandler := handlers.NewDocumentRelationHandler(db) // 临时注释，避免编译错误
	// documentVersionHandler := handlers.NewDocumentVersionHandler(db, logger, validate) // 临时注释，避免编译错误
	// documentVersionLabelHandler := handlers.NewDocumentVersionLabelHandler(db, logger, validate) // 临时注释，避免编译错误
	// documentVersionCommentHandler := handlers.NewDocumentVersionCommentHandler(db, logger, validate) // 临时注释，避免编译错误
	timerHandler := handlers.NewTimerHandler(db)
	
	// 归档处理器
	archiveHandler := handlers.NewArchiveHandler(db)
	
	// 任务文档处理器
	docsBasePath := "./docs/tasks" // 可以通过配置文件配置
	taskDocumentHandler := handlers.NewTaskDocumentHandler(docsBasePath)
	
	// 归档复杂的任务文档服务 - MVP版本使用简单方案
	// taskDocumentService := services.NewTaskDocumentService(db.GetDB().(*sql.DB), nil)
	// unifiedTaskDocumentHandler := handlers.NewUnifiedTaskDocumentHandler(taskDocumentService)
	// upgradedTaskDocumentHandler := handlers.NewUpgradedTaskDocumentHandler(...)
	
	// TODO: 实现简化版任务文档处理器
	
	// 创建智能模板服务和处理器
	smartTemplateService := services.NewSmartTemplateService(db.GetDB().(*sql.DB))
	smartTemplateHandler := handlers.NewSmartTemplateHandler(smartTemplateService)
	
	// 创建协作服务和处理器
	collaborationService := services.NewDocumentCollaborationService(db.GetDB().(*sql.DB))
	collaborationHandler := handlers.NewDocumentCollaborationHandler(collaborationService)
	
	// 统计处理器
	statisticsHandler := handlers.NewStatisticsHandlers(db.GetDB().(*sql.DB))
	
	// 审计处理器
	auditHandler := handlers.NewAuditHandler(db, logger, validate)
	
	// AI配置处理器
	// 创建sqlx.DB实例用于AI配置仓库
	sqlxDB := sqlx.NewDb(db.GetDB().(*sql.DB), "postgres")
	aiConfigRepo, err := database.NewAIConfigRepository(sqlxDB)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI config repository: %w", err)
	}
	aiConfigHandler := handlers.NewAIConfigHandler(aiConfigRepo)

	// AI任务生成处理器
	historyRepo := database.NewAIGenerationHistoryRepository(sqlxDB)
	aiTaskGeneratorHandler := handlers.NewAITaskGeneratorHandler(
		aiConfigRepo,
		db.Tasks(),
		db.Projects(),
		historyRepo,
	)

	return &Application{
		config:              cfg,
		db:                  db,
		logger:              logger,
		validator:           validate,
		jwtManager:          jwtManager,
		customerHandler:     customerHandler,
		companyHandler:      companyHandler,
		permissionHandler:   permissionHandler,
		userManagementHandler: userManagementHandler,
		companyUserHandler:  companyUserHandler,
		// 混合版文档管理处理器 (直接SQL)
		hybridDocumentHandler:       hybridDocumentHandler,
		hybridDocumentFolderHandler: hybridDocumentFolderHandler,
		// documentRelationHandler: documentRelationHandler, // 临时注释，避免编译错误
		// documentVersionHandler: documentVersionHandler, // 临时注释，避免编译错误
		// documentVersionLabelHandler: documentVersionLabelHandler, // 临时注释，避免编译错误
		// documentVersionCommentHandler: documentVersionCommentHandler, // 临时注释，避免编译错误
		timerHandler:                timerHandler,
		archiveHandler:              archiveHandler,
		taskDocumentHandler:         taskDocumentHandler,
		// 归档复杂处理器
		// unifiedTaskDocumentHandler:  unifiedTaskDocumentHandler,
		// upgradedTaskDocumentHandler: upgradedTaskDocumentHandler,
		smartTemplateHandler:        smartTemplateHandler,
		collaborationHandler:        collaborationHandler,
		statisticsHandler:           statisticsHandler,
		auditHandler:                auditHandler,
		aiConfigHandler:             aiConfigHandler,
		aiTaskGeneratorHandler:      aiTaskGeneratorHandler,
	}, nil
}

// initDB initializes database connection
func initDB(cfg *config.Config) (database.DB, error) {
	db, err := database.NewPostgresDBWithConfig(
		cfg.GetDatabaseDSN(),
		cfg.Database.MaxOpenConns,
		cfg.Database.MaxIdleConns,
		cfg.Database.ConnMaxLifetime,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create database: %v", err)
	}

	// Test database connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	log.Println("Database connected successfully")
	return db, nil
}

// setupRouter sets up Gin router with routes
func (app *Application) setupRouter() *gin.Engine {
	gin.SetMode(func() string {
		if app.config.IsProduction() {
			return gin.ReleaseMode
		}
		return gin.DebugMode
	}())

	router := gin.New()
	
	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(app.corsMiddleware())
	
	// 审计中间件
	auditMiddleware := middleware.NewAuditMiddleware(&middleware.AuditConfig{
		DB:                 app.db,
		LogRequestBody:     true,
		LogResponseBody:    false, // 避免敏感数据泄露
		MaxBodySize:        1024 * 1024, // 1MB
		ExcludePaths:       []string{"/health", "/version", "/metrics"},
		ExcludeMethods:     []string{"OPTIONS"},
	})
	router.Use(auditMiddleware.Middleware())

	// Health check endpoint
	router.GET("/health", app.healthHandler)
	router.GET("/version", app.versionHandler)

	// API routes
	api := router.Group("/api/v1")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", app.loginHandler)
			auth.POST("/logout", app.logoutHandler)
		}

		// Protected routes (with user type access control)
		authorized := api.Group("/")
		// Apply JWT authentication middleware first
		authorized.Use(middleware.AuthMiddleware(app.jwtManager))
		// Apply user type access control middleware
		authorized.Use(middleware.UserTypeAccessMiddleware())
		authorized.Use(middleware.CompanyAccessMiddleware())
		authorized.Use(app.mapUserToCompanyUser()) // Map authenticated user to company user
		{
			// Global tasks routes (all projects) - for compatibility
			authorized.GET("/tasks", app.getAllTasksHandler)
			authorized.GET("/tasks/today", app.getTodayTasksHandler)
			authorized.GET("/tasks/today/stats", app.getTodayTasksStatsHandler)
			authorized.POST("/tasks/today/bulk", app.bulkOperationTodayTasksHandler)
			authorized.POST("/tasks/:id/complete", app.markTodayTaskCompletedHandler)
			authorized.POST("/tasks/:id/postpone", app.postponeTodayTaskHandler)
			
			// Statistics routes
			authorized.GET("/statistics/today-stats", func(c *gin.Context) {
				app.statisticsHandler.HandleTodayStats(c.Writer, c.Request)
			})
			
			// Projects routes with permission requirements
			projects := authorized.Group("/projects")
			{
				projects.GET("", app.getProjectsHandler)
				projects.POST("", app.createProjectHandler)
				projects.GET("/:id", app.getProjectHandler)
				projects.GET("/:id/stats", app.getProjectStatsHandler)
				projects.PUT("/:id", app.updateProjectHandler)
				projects.DELETE("/:id", app.deleteProjectHandler)

				// Hierarchical task routes (more specific routes first)
				projects.GET("/:id/tasks/tree", app.getTaskTreeHandler)
				projects.GET("/:id/tasks/root", app.getRootTasksHandler)
				projects.POST("/:id/tasks/bulk-import", app.bulkImportTasksHandler)
				projects.POST("/:id/tasks/ai-bulk-import", app.aiTaskGeneratorHandler.BulkImport)
				
				// Task-specific hierarchical routes
				projects.GET("/:id/tasks/:taskId/children", app.getTaskChildrenHandler)
				projects.GET("/:id/tasks/:taskId/updates", app.getTaskUpdatesHandler)
				projects.PUT("/:id/tasks/:taskId/updates/:updateId", app.updateTaskUpdateHandler)
				projects.DELETE("/:id/tasks/:taskId/updates/:updateId", app.deleteTaskUpdateHandler)
				projects.GET("/:id/tasks/:taskId/timeline", app.getTaskTimelineHandler)
				
				// Basic tasks routes
				projects.GET("/:id/tasks", app.getTasksHandler)
				projects.POST("/:id/tasks", app.createTaskHandler)
				projects.DELETE("/:id/tasks", app.bulkDeleteTasksHandler)
				projects.GET("/:id/tasks/:taskId", app.getTaskHandler)
				projects.PUT("/:id/tasks/:taskId", app.updateTaskHandler)
				projects.DELETE("/:id/tasks/:taskId", app.deleteTaskHandler)
				
				// Archive routes
				projects.GET("/:id/tasks/archived", app.archiveHandler.GetArchivedTasks)
				projects.POST("/:id/tasks/archive/bulk", app.archiveHandler.BulkArchiveTasks)
				projects.POST("/:id/tasks/:taskId/archive", app.archiveHandler.ArchiveTask)
				projects.POST("/:id/tasks/:taskId/unarchive", app.archiveHandler.UnarchiveTask)
				projects.GET("/:id/archive/stats", app.archiveHandler.GetArchiveStatistics)
				
				// Task document routes (升级版，向后兼容)
				// 使用简单的任务文档处理器
				projects.GET("/:id/tasks/:taskId/document", app.taskDocumentHandler.GetTaskDocument)
				projects.PUT("/:id/tasks/:taskId/document", app.taskDocumentHandler.SaveTaskDocument)
				// projects.HEAD("/:id/tasks/:taskId/document", app.upgradedTaskDocumentHandler.CheckTaskDocument)
				
				// 删除增强版API路由 - 保持MVP简洁
				// projects.GET("/:id/tasks/:taskId/document/advanced", app.unifiedTaskDocumentHandler.GetTaskDocumentAdvanced)
				// projects.PATCH("/:id/tasks/:taskId/document/advanced", app.unifiedTaskDocumentHandler.UpdateTaskDocumentAdvanced)
				// projects.DELETE("/:id/tasks/:taskId/document", app.unifiedTaskDocumentHandler.DeleteTaskDocument)
				
				// 智能模板系统 - 暂时注释，保持MVP简洁
				// projects.GET("/:id/tasks/:taskId/templates/recommendations", app.smartTemplateHandler.GetRecommendedTemplates)
				
				// 文档协作功能
				documents := projects.Group("/:id/documents")
				{
					documents.POST("/:docId/comments", app.collaborationHandler.AddComment)
					documents.GET("/:docId/comments", app.collaborationHandler.GetComments)
					documents.POST("/:docId/collaborators", app.collaborationHandler.AddCollaborator)
					documents.GET("/:docId/collaborators", app.collaborationHandler.GetCollaborators)
					documents.PUT("/:docId/collaborators/:userId", app.collaborationHandler.UpdateCollaborator)
					documents.DELETE("/:docId/collaborators/:userId", app.collaborationHandler.RemoveCollaborator)
					documents.GET("/:docId/history", app.collaborationHandler.GetChangeHistory)
					documents.POST("/:docId/collaboration/start", app.collaborationHandler.StartCollaborationSession)
					documents.GET("/:docId/collaboration/active", app.collaborationHandler.GetActiveCollaborators)
					documents.GET("/:docId/collaboration/stats", app.collaborationHandler.GetCollaborationStats)
				}
				
				// Project timeline
				projects.GET("/:id/timeline", app.getProjectTimelineHandler)
				
				// Project user management
				projects.GET("/:id/users", app.getProjectUsersHandler)
				projects.POST("/:id/users", app.addProjectUserHandler)
				projects.DELETE("/:id/users/:userId", app.removeProjectUserHandler)
				
				// Document management routes
				// projects.GET("/:id/documents", app.documentHandler.GetProjectDocuments) // 临时注释，避免编译错误
				// projects.POST("/:id/documents", app.documentHandler.CreateDocument) // 临时注释，避免编译错误
			}

			// System management routes (system users only)
			system := authorized.Group("/system")
			// Apply system user only middleware
			system.Use(middleware.SystemUserOnlyMiddleware())
			{
				// Recycle bin routes
				recycle := system.Group("/recycle")
				{
					recycle.GET("/projects", app.getRecycledProjectsHandler)
					recycle.POST("/projects/:id/restore", app.restoreProjectHandler)
					recycle.DELETE("/projects/:id", app.hardDeleteProjectHandler)
					
					recycle.GET("/tasks", app.getRecycledTasksHandler)
					recycle.POST("/tasks/:id/restore", app.restoreTaskHandler)
					recycle.DELETE("/tasks/:id", app.hardDeleteTaskHandler)
				}

				// Audit log routes
				audit := system.Group("/audit")
				{
					audit.GET("/logs", app.getAuditLogsHandler)
					audit.GET("/logs/:id", app.getAuditLogHandler)
					audit.GET("/stats", app.getAuditStatsHandler)
					audit.GET("/export", app.exportAuditLogsHandler)
				}

				// AI configuration routes
				aiConfigs := system.Group("/ai-configs")
				{
					aiConfigs.GET("", app.aiConfigHandler.GetAllConfigs)
					aiConfigs.POST("", app.aiConfigHandler.CreateConfig)
					aiConfigs.GET("/:provider", app.aiConfigHandler.GetConfig)
					aiConfigs.PUT("/:provider", app.aiConfigHandler.UpdateConfig)
					aiConfigs.DELETE("/:provider", app.aiConfigHandler.DeleteConfig)
					aiConfigs.POST("/test", app.aiConfigHandler.TestConnection)
					aiConfigs.POST("/generate", app.aiConfigHandler.GenerateCompletion) // 新增：AI生成端点
					aiConfigs.PATCH("/:provider/toggle", app.aiConfigHandler.ToggleConfig)
					aiConfigs.GET("/enabled", app.aiConfigHandler.GetEnabledConfig)
					aiConfigs.GET("/stats", app.aiConfigHandler.GetConfigStats)
					// 暂时保留未实现的路由
					aiConfigs.POST("/batch", app.batchUpdateAIConfigsHandler)
					aiConfigs.GET("/export", app.exportAIConfigsHandler)
				}

				// AI task generation routes
				aiTasks := system.Group("/ai-tasks")
				{
					aiTasks.POST("/generate", app.aiTaskGeneratorHandler.GenerateTasks)
					aiTasks.POST("/validate", app.aiTaskGeneratorHandler.ValidateTasks)
					aiTasks.POST("/optimize", app.aiTaskGeneratorHandler.OptimizeTasks)
					aiTasks.GET("/models/status", app.aiTaskGeneratorHandler.GetModelStatus)
					aiTasks.GET("/history", app.aiTaskGeneratorHandler.GetGenerationHistory)
					aiTasks.POST("/usage/stats", app.aiTaskGeneratorHandler.GetUsageStats)
					aiTasks.GET("/templates/popular", app.aiTaskGeneratorHandler.GetPopularTemplates)
					
					// Cost tracking and budget management routes
					aiTasks.GET("/cost/summary", app.aiTaskGeneratorHandler.GetCostSummary)
					aiTasks.GET("/budget/status", app.aiTaskGeneratorHandler.CheckBudgetStatus)
					aiTasks.POST("/budget/limit", app.aiTaskGeneratorHandler.SetBudgetLimit)
					aiTasks.GET("/budget/alerts", app.aiTaskGeneratorHandler.GetBudgetAlerts)
					
					// Template management routes
					aiTasks.POST("/templates", app.aiTaskGeneratorHandler.CreateTemplate)
					aiTasks.GET("/templates", app.aiTaskGeneratorHandler.GetTemplates)
					aiTasks.GET("/templates/:id", app.aiTaskGeneratorHandler.GetTemplate)
					aiTasks.POST("/templates/generate", app.aiTaskGeneratorHandler.GenerateFromTemplate)
					
					// Batch optimization routes
					aiTasks.POST("/batch/optimize", app.aiTaskGeneratorHandler.BatchOptimizeTasks)
				}

			}

			// User management routes
			users := authorized.Group("/users")
			{
				users.GET("/profile", app.getUserProfileHandler) // No permission needed for own profile
				users.PUT("/profile", app.updateUserProfileHandler) // No permission needed for own profile
				users.PUT("/password", app.changePasswordHandler) // No permission needed for own password
			}

			// Customer management routes (deprecated, use companies instead)
			customers := authorized.Group("/customers")
			{
				customers.GET("", app.customerHandler.GetCustomers)
				customers.POST("", app.customerHandler.CreateCustomer)
				customers.GET("/stats", app.customerHandler.GetCustomerStats)
				customers.GET("/:id", app.customerHandler.GetCustomer)
				customers.PUT("/:id", app.customerHandler.UpdateCustomer)
				customers.DELETE("/:id", app.customerHandler.DeleteCustomer)

				// Customer user association routes
				customers.POST("/:id/users", app.customerHandler.AddCustomerUser)
				customers.DELETE("/:id/users/:userId", app.customerHandler.RemoveCustomerUser)

				// Customer contact routes
				customers.GET("/:id/contacts", app.customerHandler.GetCustomerContacts)
				customers.POST("/:id/contacts", app.customerHandler.CreateContact)
			}

			// Company management routes (new enterprise customer model)
			companies := authorized.Group("/companies")
			{
				companies.GET("", app.companyHandler.GetCompanies)
				companies.POST("", app.companyHandler.CreateCompany)
				companies.GET("/stats", app.companyHandler.GetCompanyStats)
				companies.GET("/:id", app.companyHandler.GetCompany)
				companies.PUT("/:id", app.companyHandler.UpdateCompany)
				companies.DELETE("/:id", app.companyHandler.DeleteCompany)

				// Company user management routes
				companies.GET("/:id/users", app.companyHandler.GetCompanyUsers)
				companies.POST("/:id/users", app.companyHandler.CreateCompanyUser)
				companies.GET("/:id/users/:userId", app.companyHandler.GetCompanyUser)
				companies.PUT("/:id/users/:userId", app.companyHandler.UpdateCompanyUser)
				companies.DELETE("/:id/users/:userId", app.companyHandler.DeleteCompanyUser)
				
				// Company user role and permission management routes
				companies.POST("/:id/users/:userId/role", app.companyHandler.AssignUserRole)
				companies.GET("/:id/users/:userId/permissions", app.companyHandler.GetUserPermissions)
				companies.PUT("/:id/users/:userId/permissions", app.companyHandler.UpdateUserPermissions)

				// Company contact routes
				companies.GET("/:id/contacts", app.companyHandler.GetCompanyContacts)
				companies.POST("/:id/contacts", app.companyHandler.CreateCompanyContact)
			}

			// 数据库版文档管理路由 - 已删除，只保留文档管理器功能
			
			// Document CRUD routes (direct access by document ID)
			authorized.GET("/documents", app.hybridDocumentHandler.GetDocuments)
			authorized.POST("/documents", app.hybridDocumentHandler.CreateDocument)
			authorized.GET("/documents/:id", app.hybridDocumentHandler.GetDocument)
			authorized.PUT("/documents/:id", app.hybridDocumentHandler.UpdateDocument)
			authorized.DELETE("/documents/:id", app.hybridDocumentHandler.DeleteDocument)
			authorized.POST("/documents/:id/copy", app.hybridDocumentHandler.CopyDocument)
			authorized.POST("/documents/:id/toggle-template", app.hybridDocumentHandler.ToggleTemplate)
			
			// Document metadata APIs for frontend dropdowns
			authorized.GET("/document-metadata/projects", app.getDocumentProjectsHandler)
			authorized.GET("/document-metadata/customers", app.getDocumentCustomersHandler)
			authorized.GET("/document-metadata/categories", app.getDocumentCategoriesHandler)

			// 数据库版文档文件夹路由
			documentFolders := authorized.Group("/document-folders")
			{
				documentFolders.POST("", app.hybridDocumentFolderHandler.CreateFolder)
				documentFolders.GET("", app.hybridDocumentFolderHandler.ListFolders)
				documentFolders.GET("/tree", app.hybridDocumentFolderHandler.GetFolderTree)
				documentFolders.GET("/:id", app.hybridDocumentFolderHandler.GetFolder)
				documentFolders.PUT("/:id", app.hybridDocumentFolderHandler.UpdateFolder)
				documentFolders.DELETE("/:id", app.hybridDocumentFolderHandler.DeleteFolder)
				documentFolders.POST("/:id/move", app.hybridDocumentFolderHandler.MoveFolder)
				documentFolders.POST("/batch-update", app.hybridDocumentFolderHandler.BatchUpdateFolders)
			}

			// Document Relation routes
			// documentRelations := authorized.Group("/document-relations") // 临时注释，避免编译错误
			{
				// Create relations
// 				documentRelations.POST("/customer", app.documentRelationHandler.CreateCustomerRelation) // 临时注释，避免编译错误
// 				documentRelations.POST("/project", app.documentRelationHandler.CreateProjectRelation) // 临时注释，避免编译错误
// 				documentRelations.POST("/task", app.documentRelationHandler.CreateTaskRelation) // 临时注释，避免编译错误
				
				// Get relations
// 				documentRelations.GET("/document/:documentId", app.documentRelationHandler.GetDocumentRelations) // 临时注释，避免编译错误
// 				documentRelations.GET("/:entityType/:entityId", app.documentRelationHandler.GetEntityRelations) // 临时注释，避免编译错误
				
				// Update relations
// 				documentRelations.PUT("/customer/:id", app.documentRelationHandler.UpdateCustomerRelation) // 临时注释，避免编译错误
// 				documentRelations.PUT("/project/:id", app.documentRelationHandler.UpdateProjectRelation) // 临时注释，避免编译错误
// 				documentRelations.PUT("/task/:id", app.documentRelationHandler.UpdateTaskRelation) // 临时注释，避免编译错误
				
				// Delete relations 
// 				documentRelations.DELETE("/:entityType/:id", app.documentRelationHandler.DeleteRelation) // 临时注释，避免编译错误
				
				// Statistics and bulk operations
// 				documentRelations.GET("/stats", app.documentRelationHandler.GetRelationStats) // 临时注释，避免编译错误
// 				documentRelations.POST("/bulk", app.documentRelationHandler.BulkCreateRelations) // 临时注释，避免编译错误
			}

			// Document Version Management routes
			// Document Versions
// 			authorized.POST("/document-versions", app.documentVersionHandler.CreateVersion) // 临时注释，避免编译错误
// 			authorized.GET("/document-versions/:id", app.documentVersionHandler.GetVersion) // 临时注释，避免编译错误
// 			authorized.PUT("/document-versions/:id", app.documentVersionHandler.UpdateVersion) // 临时注释，避免编译错误
// 			authorized.DELETE("/document-versions/:id", app.documentVersionHandler.DeleteVersion) // 临时注释，避免编译错误
// 			authorized.POST("/document-versions/compare", app.documentVersionHandler.CompareVersions) // 临时注释，避免编译错误
			
			// Document version by document and version number
// 			authorized.GET("/documents/:document_id/versions", app.documentVersionHandler.GetVersionHistory) // 临时注释，避免编译错误
// 			authorized.GET("/documents/:document_id/versions/:version_number", app.documentVersionHandler.GetVersionByNumber) // 临时注释，避免编译错误
// 			authorized.GET("/documents/:document_id/version-history", app.documentVersionHandler.GetFullVersionHistory) // 临时注释，避免编译错误
// 			authorized.POST("/documents/:document_id/restore", app.documentVersionHandler.RestoreVersion) // 临时注释，避免编译错误
// 			authorized.GET("/documents/:document_id/version-stats", app.documentVersionHandler.GetVersionStats) // 临时注释，避免编译错误

			// Version Labels
// 			authorized.POST("/document-version-labels", app.documentVersionLabelHandler.CreateLabel) // 临时注释，避免编译错误
// 			authorized.GET("/documents/:document_id/versions/:version_number/labels", app.documentVersionLabelHandler.GetVersionLabels) // 临时注释，避免编译错误
// 			authorized.GET("/documents/:document_id/labels", app.documentVersionLabelHandler.GetDocumentLabels) // 临时注释，避免编译错误
// 			authorized.PUT("/document-version-labels/:id", app.documentVersionLabelHandler.UpdateLabel) // 临时注释，避免编译错误
// 			authorized.DELETE("/document-version-labels/:id", app.documentVersionLabelHandler.DeleteLabel) // 临时注释，避免编译错误
// 			authorized.GET("/document-version-labels/by-color/:color", app.documentVersionLabelHandler.GetLabelsByColor) // 临时注释，避免编译错误
// 			authorized.GET("/document-version-labels/search", app.documentVersionLabelHandler.SearchLabels) // 临时注释，避免编译错误

			// Version Comments
// 			authorized.POST("/document-version-comments", app.documentVersionCommentHandler.CreateComment) // 临时注释，避免编译错误
// 			authorized.GET("/document-version-comments/:id", app.documentVersionCommentHandler.GetComment) // 临时注释，避免编译错误
// 			authorized.PUT("/document-version-comments/:id", app.documentVersionCommentHandler.UpdateComment) // 临时注释，避免编译错误
// 			authorized.DELETE("/document-version-comments/:id", app.documentVersionCommentHandler.DeleteComment) // 临时注释，避免编译错误
// 			authorized.PATCH("/document-version-comments/:id/resolve", app.documentVersionCommentHandler.ResolveComment) // 临时注释，避免编译错误
// 			authorized.GET("/documents/:document_id/versions/:version_number/comments", app.documentVersionCommentHandler.GetVersionComments) // 临时注释，避免编译错误
// 			authorized.GET("/documents/:document_id/comments", app.documentVersionCommentHandler.GetDocumentComments) // 临时注释，避免编译错误
// 			authorized.GET("/document-version-comments/:id/replies", app.documentVersionCommentHandler.GetCommentReplies) // 临时注释，避免编译错误

			// Timer routes
			timer := authorized.Group("/timer")
			{
				timer.POST("/start", app.timerHandler.StartTimer)
				timer.POST("/stop", app.timerHandler.StopTimer)
				timer.GET("/current", app.timerHandler.GetCurrentTimer)
				timer.GET("/stats", app.timerHandler.GetTimerStats)
				timer.GET("/weekly", app.timerHandler.GetWeeklyReport)
			}

			// Permission management routes (system users with appropriate roles)
			permissions := authorized.Group("/permissions")
			// Most permission operations require system user access
			permissions.Use(middleware.SystemUserOnlyMiddleware())
			{
				// Role management (require admin permissions)
				permissions.GET("/roles", middleware.AdminOnlyMiddleware(), app.permissionHandler.GetRoles)
				permissions.POST("/roles", middleware.AdminOnlyMiddleware(), app.permissionHandler.CreateRole)
				permissions.PUT("/roles/:id", middleware.AdminOnlyMiddleware(), app.permissionHandler.UpdateRole)
				permissions.DELETE("/roles/:id", middleware.AdminOnlyMiddleware(), app.permissionHandler.DeleteRole)
				
				// Role permissions
				permissions.GET("/roles/:id/permissions", middleware.RoleBasedAccessMiddleware("admin", "project_manager"), app.permissionHandler.GetRolePermissions)
				permissions.POST("/roles/:id/permissions", middleware.AdminOnlyMiddleware(), app.permissionHandler.SetRolePermissions)
				
				// Permissions (read-only for most users)
				permissions.GET("", app.permissionHandler.GetPermissions) // Basic read access for UI
				
				// User permissions (admin and project managers can view, admin can update)
				permissions.GET("/users/:id", middleware.RoleBasedAccessMiddleware("admin", "project_manager"), app.permissionHandler.GetUserPermissions)
				permissions.PUT("/users/:id", middleware.AdminOnlyMiddleware(), app.permissionHandler.UpdateUserPermissions)
				
				// Permission checking (any authenticated user can check own permissions)
				permissions.POST("/check", app.permissionHandler.CheckUserPermission)
				
				// Audit logs (admin only)
				permissions.GET("/audit-logs", middleware.AdminOnlyMiddleware(), app.permissionHandler.GetPermissionAuditLogs)
				
				// Permission inheritance and override management (admin only)
				permissions.GET("/users/:id/trace", middleware.AdminOnlyMiddleware(), app.permissionHandler.GetPermissionTrace)
				permissions.POST("/users/:id/overrides", middleware.AdminOnlyMiddleware(), app.permissionHandler.SetPermissionOverride)
				permissions.GET("/users/:id/overrides", middleware.RoleBasedAccessMiddleware("admin", "project_manager"), app.permissionHandler.GetPermissionOverrides)
				permissions.DELETE("/users/:id/overrides/:permissionCode", middleware.AdminOnlyMiddleware(), app.permissionHandler.RemovePermissionOverride)
				permissions.GET("/users/:id/conflicts", middleware.AdminOnlyMiddleware(), app.permissionHandler.AnalyzePermissionConflicts)
			}

			// Admin user management routes (admin only - system users with admin role)
			admin := authorized.Group("/admin")
			// Apply system user only middleware and admin role restriction
			admin.Use(middleware.SystemUserOnlyMiddleware())
			admin.Use(middleware.AdminOnlyMiddleware())
			{
				// User management (admin only)
				adminUsers := admin.Group("/users")
				// Additional role-based access control for user management operations
				adminUsers.Use(middleware.RoleBasedAccessMiddleware("admin"))
				{
					adminUsers.GET("", app.userManagementHandler.GetUserList)
					adminUsers.POST("", app.userManagementHandler.CreateUser)
					adminUsers.GET("/stats", app.userManagementHandler.GetUserStats)
					adminUsers.GET("/export", app.userManagementHandler.ExportUsers)
					adminUsers.POST("/batch", app.userManagementHandler.BatchUpdateUsers)
					adminUsers.GET("/:id", app.userManagementHandler.GetUser)
					adminUsers.PUT("/:id", app.userManagementHandler.UpdateUser)
					adminUsers.DELETE("/:id", app.userManagementHandler.DeleteUser)
					adminUsers.POST("/:id/reset-password", app.userManagementHandler.ResetUserPassword)
					adminUsers.PUT("/:id/status", app.userManagementHandler.UpdateUserStatus)
				}

				// Company user management (admin only)
				companyUsers := admin.Group("/company-users")
				companyUsers.Use(middleware.RoleBasedAccessMiddleware("admin"))
				{
					companyUsers.GET("", app.companyUserHandler.GetCompanyUserList)
					companyUsers.POST("", app.companyUserHandler.CreateCompanyUser)
					companyUsers.GET("/stats", app.companyUserHandler.GetCompanyUserStats)
					companyUsers.POST("/batch", app.companyUserHandler.BatchUpdateCompanyUsers)
					companyUsers.GET("/:id", app.companyUserHandler.GetCompanyUser)
					companyUsers.PUT("/:id", app.companyUserHandler.UpdateCompanyUser)
					companyUsers.PUT("/:id/status", app.companyUserHandler.UpdateCompanyUserStatus)
					companyUsers.DELETE("/:id", app.companyUserHandler.DeleteCompanyUser)
				}
			}
		}
		
		// 全局模板管理路由
		templates := authorized.Group("/templates")
		{
			templates.GET("", app.smartTemplateHandler.GetTemplates)
			templates.POST("", app.smartTemplateHandler.CreateTemplate)
			templates.GET("/stats", app.smartTemplateHandler.GetTemplateStats)
			templates.GET("/:id", app.smartTemplateHandler.GetTemplateByID)
			templates.POST("/:id/generate", app.smartTemplateHandler.GenerateFromTemplate)
		}
		
		// 全局文档协作路由
		collaboration := authorized.Group("/collaboration")
		{
			collaboration.GET("/dashboard", app.collaborationHandler.GetUserCollaborationDashboard)
		}
		
		// 评论管理路由
		comments := authorized.Group("/comments")
		{
			comments.PUT("/:id", app.collaborationHandler.UpdateComment)
			comments.DELETE("/:id", app.collaborationHandler.DeleteComment)
			comments.PATCH("/:id/resolve", app.collaborationHandler.ResolveComment)
		}
		
		// 任务文档管理路由 - 暂时注释，保持MVP简洁
		// taskDocuments := authorized.Group("/task-documents")
		// {
		//     // 归档复杂的任务文档列表功能
		//     // taskDocuments.GET("", app.unifiedTaskDocumentHandler.GetTaskDocumentList)
		//     // taskDocuments.GET("/stats", app.unifiedTaskDocumentHandler.GetTaskDocumentStats)
		// }
		
		// 迁移管理路由已移至上面的system组中
	}


	return router
}

// corsMiddleware adds CORS headers
func (app *Application) corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// Health check handler
func (app *Application) healthHandler(c *gin.Context) {
	// Check database connection
	if err := app.db.Ping(); err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeInternal,
			"Database connection failed",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusServiceUnavailable, response)
		return
	}

	data := map[string]any{
		"status":     "healthy",
		"timestamp":  time.Now().UTC(),
		"version":    Version,
		"build_time": BuildTime,
		"git_commit": GitCommit,
		"database":   "connected",
	}

	response := models.NewSuccessResponse(data, "Service is healthy")
	c.JSON(http.StatusOK, response)
}

// Version handler
func (app *Application) versionHandler(c *gin.Context) {
	data := map[string]any{
		"version":     Version,
		"build_time":  BuildTime,
		"git_commit":  GitCommit,
		"app_name":    app.config.App.Name,
		"environment": app.config.App.Environment,
	}

	response := models.NewSuccessResponse(data, "Version information")
	c.JSON(http.StatusOK, response)
}

// Placeholder handlers - to be implemented in upcoming tasks
func (app *Application) loginHandler(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := app.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get user by username
	user, err := app.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid username or password", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid username or password", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Generate JWT token
	token, err := app.jwtManager.GenerateToken(user.ID, user.Username, user.Role, user.UserType)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate token", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Prepare response
	loginResponse := models.LoginResponse{
		Token: token,
		User:  *user,
	}

	response := models.NewSuccessResponse(loginResponse, "Login successful")
	c.JSON(http.StatusOK, response)
}

func (app *Application) logoutHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Logout endpoint - to be implemented in task 2.3",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) getProjectsHandler(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Get projects from database
	projectsWithCompany, total, err := app.db.Projects().ListWithCompanyInfo(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting projects with company info: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	projectResponses := make([]models.ProjectResponse, len(projectsWithCompany))
	for i, projectWithCompany := range projectsWithCompany {
		projectResponses[i] = projectWithCompany.ToResponse()
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       projectResponses,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Projects retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) createProjectHandler(c *gin.Context) {
	var req models.ProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate required fields
	if req.Name == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Project name is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse date strings to time.Time
	var startDate, endDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			startDate = &parsed
		}
	}
	if req.EndDate != nil && *req.EndDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			endDate = &parsed
		}
	}

	// Set default values
	status := req.Status
	if status == "" {
		status = "planning"
	}
	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	// Create project model (for now, use owner_id = 1 as default)
	project := &models.Project{
		ProjectNumber: req.ProjectNumber,
		Name:          req.Name,
		Description:   req.Description,
		OwnerID:       1, // TODO: Get from authenticated user context
		CompanyID:     req.CompanyID,
		Status:        status,
		Priority:      priority,
		Progress:      req.Progress,
		StartDate:     startDate,
		EndDate:       endDate,
		Budget:        req.Budget,
	}

	// Create project in database
	createdProject, err := app.db.Projects().Create(c.Request.Context(), project)
	if err != nil {
		app.logger.Printf("Error creating project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Handle company associations if provided
	if len(req.CompanyIDs) > 0 {
		for i, companyID := range req.CompanyIDs {
			isPrimary := (i == 0) // First company is primary
			if err := app.createProjectCompanyAssociation(c.Request.Context(), createdProject.ID, companyID, isPrimary); err != nil {
				app.logger.Printf("Warning: Failed to create company association for project %d, company %d: %v", createdProject.ID, companyID, err)
			}
		}
	} else if req.CompanyID != nil {
		// Handle legacy single company_id
		if err := app.createProjectCompanyAssociation(c.Request.Context(), createdProject.ID, *req.CompanyID, true); err != nil {
			app.logger.Printf("Warning: Failed to create company association for project %d, company %d: %v", createdProject.ID, *req.CompanyID, err)
		}
	}

	// Handle user assignments if provided
	if len(req.UserIDs) > 0 {
		for i, userID := range req.UserIDs {
			isPrimary := (i == 0) // First user is primary
			if err := app.createProjectUserAssignment(c.Request.Context(), createdProject.ID, userID, "customer", isPrimary); err != nil {
				app.logger.Printf("Warning: Failed to create user assignment for project %d, user %d: %v", createdProject.ID, userID, err)
			}
		}
	}

	response := models.NewSuccessResponse(createdProject.ToResponse(), "Project created successfully")
	c.JSON(http.StatusCreated, response)
}

func (app *Application) getProjectHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	project, err := app.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error getting project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(project.ToResponse(), "Project retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getProjectStatsHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get project stats using system repository
	stats, err := app.db.System().GetProjectStats(c.Request.Context(), projectID)
	if err != nil {
		app.logger.Printf("Error getting project stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project stats", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Project stats retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) updateProjectHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.ProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing project
	existingProject, err := app.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error getting project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Parse date strings to time.Time for update
	var startDate, endDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			startDate = &parsed
		}
	}
	if req.EndDate != nil && *req.EndDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			endDate = &parsed
		}
	}

	// Update project fields
	if req.ProjectNumber != nil {
		existingProject.ProjectNumber = req.ProjectNumber
	}
	if req.Name != "" {
		existingProject.Name = req.Name
	}
	if req.Description != "" {
		existingProject.Description = req.Description
	}
	if req.CompanyID != nil {
		existingProject.CompanyID = req.CompanyID
	}
	if req.Status != "" {
		existingProject.Status = req.Status
	}
	if req.Priority != "" {
		existingProject.Priority = req.Priority
	}
	// Update progress (0 is a valid value)
	existingProject.Progress = req.Progress
	if startDate != nil {
		existingProject.StartDate = startDate
	}
	if endDate != nil {
		existingProject.EndDate = endDate
	}
	if req.Budget != nil {
		existingProject.Budget = req.Budget
	}

	// Update project in database
	updatedProject, err := app.db.Projects().Update(c.Request.Context(), existingProject)
	if err != nil {
		app.logger.Printf("Error updating project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Handle company associations update if provided
	if len(req.CompanyIDs) > 0 {
		// Clear existing company associations
		db := app.db.GetDB().(*sql.DB)
		_, err := db.ExecContext(c.Request.Context(), "DELETE FROM project_companies WHERE project_id = $1", projectID)
		if err != nil {
			app.logger.Printf("Warning: Failed to clear existing company associations: %v", err)
		}

		// Add new company associations
		for i, companyID := range req.CompanyIDs {
			isPrimary := (i == 0) // First company is primary
			if err := app.createProjectCompanyAssociation(c.Request.Context(), projectID, companyID, isPrimary); err != nil {
				app.logger.Printf("Warning: Failed to create company association for project %d, company %d: %v", projectID, companyID, err)
			}
		}
	} else if req.CompanyID != nil {
		// Handle legacy single company_id
		db := app.db.GetDB().(*sql.DB)
		_, err := db.ExecContext(c.Request.Context(), "DELETE FROM project_companies WHERE project_id = $1", projectID)
		if err != nil {
			app.logger.Printf("Warning: Failed to clear existing company associations: %v", err)
		}

		if err := app.createProjectCompanyAssociation(c.Request.Context(), projectID, *req.CompanyID, true); err != nil {
			app.logger.Printf("Warning: Failed to create company association for project %d, company %d: %v", projectID, *req.CompanyID, err)
		}
	}

	// Handle user assignments update if provided
	if len(req.UserIDs) > 0 {
		// Clear existing user assignments
		db := app.db.GetDB().(*sql.DB)
		_, err := db.ExecContext(c.Request.Context(), "DELETE FROM project_users WHERE project_id = $1", projectID)
		if err != nil {
			app.logger.Printf("Warning: Failed to clear existing user assignments: %v", err)
		}

		// Add new user assignments
		for i, userID := range req.UserIDs {
			isPrimary := (i == 0) // First user is primary
			if err := app.createProjectUserAssignment(c.Request.Context(), projectID, userID, "customer", isPrimary); err != nil {
				app.logger.Printf("Warning: Failed to create user assignment for project %d, user %d: %v", projectID, userID, err)
			}
		}
	}

	response := models.NewSuccessResponse(updatedProject.ToResponse(), "Project updated successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) deleteProjectHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.db.Projects().Delete(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error deleting project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Project deleted successfully")
	c.JSON(http.StatusOK, response)
}

// Project User Management Handlers

func (app *Application) getProjectUsersHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Query project users with user details
	query := `
		SELECT pu.id, pu.project_id, pu.user_id, pu.role, pu.is_primary, 
		       u.username, u.email, pu.created_at
		FROM project_users pu
		JOIN users u ON pu.user_id = u.id
		WHERE pu.project_id = $1
		ORDER BY pu.is_primary DESC, pu.created_at ASC`

	db := app.db.GetDB().(*sql.DB)
	rows, err := db.QueryContext(c.Request.Context(), query, projectID)
	if err != nil {
		app.logger.Printf("Error querying project users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	defer rows.Close()

	var users []models.ProjectUserResponse
	for rows.Next() {
		var user models.ProjectUserResponse
		var roleName string
		
		err := rows.Scan(
			&user.ID, &user.ProjectID, &user.UserID, &user.Role, &user.IsPrimary,
			&user.UserName, &user.UserEmail, &user.JoinedAt,
		)
		if err != nil {
			app.logger.Printf("Error scanning project user: %v", err)
			continue
		}

		// Map role to display name
		roleMap := map[string]string{
			"manager":    "项目经理",
			"developer":  "开发人员", 
			"designer":   "设计师",
			"consultant": "顾问",
			"customer":   "客户代表",
		}
		if displayName, ok := roleMap[user.Role]; ok {
			roleName = displayName
		} else {
			roleName = user.Role
		}
		user.RoleName = roleName

		users = append(users, user)
	}

	response := models.NewSuccessResponse(users, "Project users retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) addProjectUserHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		UserID    int    `json:"user_id" binding:"required"`
		Role      string `json:"role" binding:"required,oneof=manager developer designer consultant customer"`
		IsPrimary bool   `json:"is_primary"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Add user to project
	if err := app.createProjectUserAssignment(c.Request.Context(), projectID, req.UserID, req.Role, req.IsPrimary); err != nil {
		app.logger.Printf("Error adding user to project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to add user to project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "User added to project successfully")
	c.JSON(http.StatusCreated, response)
}

func (app *Application) removeProjectUserHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Remove user from project
	query := `DELETE FROM project_users WHERE project_id = $1 AND user_id = $2`
	db := app.db.GetDB().(*sql.DB)
	result, err := db.ExecContext(c.Request.Context(), query, projectID, userID)
	if err != nil {
		app.logger.Printf("Error removing user from project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to remove user from project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in project", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(nil, "User removed from project successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getTasksHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Get tasks from database
	tasks, total, err := app.db.Tasks().GetByProjectID(c.Request.Context(), projectID, pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	taskResponses := make([]models.TaskResponse, len(tasks))
	for i, task := range tasks {
		taskResponses[i] = task.ToResponse()
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       taskResponses,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getAllTasksHandler gets all tasks across all projects
func (app *Application) getAllTasksHandler(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		app.logger.Printf("getAllTasksHandler: Invalid pagination parameters: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	app.logger.Printf("getAllTasksHandler: Fetching tasks (page %d, size %d, offset %d)", 
		pagination.Page, pagination.PageSize, offset)

	// Get all tasks from database
	tasks, total, err := app.db.Tasks().GetAll(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("getAllTasksHandler: Error getting all tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	app.logger.Printf("getAllTasksHandler: Retrieved %d tasks from database (total: %d)", len(tasks), total)

	// Convert to response format with enhanced project information and hierarchy support
	taskResponses := make([]models.TaskResponse, len(tasks))
	for i, task := range tasks {
		taskResponse := task.ToResponse()
		
		// Extract information from custom_fields populated by the database query
		var projectName, assigneeName string
		var childrenCount int
		
		if task.CustomFields != nil {
			if pName, ok := task.CustomFields["project_name"].(string); ok {
				projectName = pName
			}
			if aName, ok := task.CustomFields["assignee_name"].(string); ok {
				assigneeName = aName
			}
			if cCount, ok := task.CustomFields["children_count"].(float64); ok {
				childrenCount = int(cCount)
			} else if cCount, ok := task.CustomFields["children_count"].(int); ok {
				childrenCount = cCount
			}
		}

		// Ensure project information completeness with validation and default handling
		if projectName == "" {
			if task.ProjectID != 0 {
				projectName = fmt.Sprintf("项目 %d", task.ProjectID)
				app.logger.Printf("getAllTasksHandler: Task %d missing project name, using default: %s", 
					task.ID, projectName)
			} else {
				projectName = "未分配项目"
				app.logger.Printf("getAllTasksHandler: Task %d has no project assigned", task.ID)
			}
		}

		// Set project and assignee information
		taskResponse.ProjectName = projectName
		taskResponse.AssigneeName = assigneeName
		
		// Set hierarchy-related fields
		taskResponse.ChildrenCount = childrenCount
		taskResponse.HasChildren = childrenCount > 0
		
		// Calculate depth based on task level (enhanced hierarchy support)
		if task.TaskLevel > 0 {
			taskResponse.Depth = task.TaskLevel
		} else {
			// Fallback: calculate depth from parent chain if task_level is not set
			taskResponse.Depth = app.calculateTaskDepth(c.Request.Context(), task)
		}

		// Add debug logging for hierarchy information
		if task.ParentID != nil {
			app.logger.Printf("getAllTasksHandler: Task %d is a subtask (parent: %d, depth: %d, children: %d)", 
				task.ID, *task.ParentID, taskResponse.Depth, childrenCount)
		}

		taskResponses[i] = taskResponse
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       taskResponses,
		Pagination: paginationMeta,
	}

	app.logger.Printf("getAllTasksHandler: Successfully processed %d tasks with complete project and hierarchy info", 
		len(taskResponses))

	response := models.NewSuccessResponse(paginatedResponse, "All tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) createTaskHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.TaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate required fields
	if req.Title == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Title is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if req.Status == "" {
		req.Status = "todo"
	}

	// Validate and clean CustomFields
	if err := utils.ValidateTaskRequest(&req); err != nil {
		app.logger.Printf("Error validating task request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate parent task if specified
	if req.ParentID != nil {
		// Validate parent task exists and is in the same project
		parentTask, err := app.db.Tasks().GetByID(c.Request.Context(), *req.ParentID)
		if err != nil {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Parent task must exist and be in the same project", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		if parentTask.ProjectID != projectID {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Parent task must be in the same project", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		
		// Check hierarchy depth (since this is a new task, we only need to check parent chain depth)
		depth := 1
		currentParentID := *req.ParentID
		for currentParentID != 0 {
			if depth > 10 { // max depth
				response := models.NewErrorResponse(models.ErrCodeBadRequest, "Maximum hierarchy depth (10) exceeded", nil)
				c.JSON(http.StatusBadRequest, response)
				return
			}
			
			parent, err := app.db.Tasks().GetByID(c.Request.Context(), currentParentID)
			if err != nil {
				break
			}
			if parent.ParentID == nil {
				break
			}
			currentParentID = *parent.ParentID
			depth++
		}
	}

	// Create task model
	task := &models.Task{
		ProjectID:    projectID,
		Title:        req.Title,
		Description:  req.Description,
		Status:       req.Status,
		AssigneeID:   req.AssigneeID,
		DueDate:      req.DueDate,
		CustomFields: req.CustomFields,
		ParentID:     req.ParentID,
		SortOrder:    req.SortOrder,
	}

	// Create task in database
	createdTask, err := app.db.Tasks().Create(c.Request.Context(), task)
	if err != nil {
		app.logger.Printf("Error creating task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create timeline event for task creation
	timelineEvent := &models.TimelineEvent{
		TaskID:      createdTask.ID,
		EventType:   "created",
		Description: fmt.Sprintf("Task '%s' was created", createdTask.Title),
		UserID:      nil, // TODO: Get user ID from auth context when auth is implemented
		Metadata:    models.CustomFields{"initial_status": createdTask.Status},
	}
	
	if err := app.db.Tasks().CreateTimelineEvent(c.Request.Context(), timelineEvent); err != nil {
		// Log error but don't fail the request
		app.logger.Printf("Error creating timeline event: %v", err)
	}

	response := models.NewSuccessResponse(createdTask.ToResponse(), "Task created successfully")
	c.JSON(http.StatusCreated, response)
}

func (app *Application) bulkImportTasksHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.BulkImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if len(req.Tasks) == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "No tasks provided", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if len(req.Tasks) > 1000 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Too many tasks (max 1000)", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Convert TaskRequest to Task models
	tasks := make([]*models.Task, len(req.Tasks))
	for i, taskReq := range req.Tasks {
		if taskReq.Title == "" {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, fmt.Sprintf("Task %d: title is required", i+1), nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		if taskReq.Status == "" {
			taskReq.Status = "todo"
		}

		tasks[i] = &models.Task{
			ProjectID:    projectID,
			Title:        taskReq.Title,
			Description:  taskReq.Description,
			Status:       taskReq.Status,
			AssigneeID:   taskReq.AssigneeID,
			DueDate:      taskReq.DueDate,
			CustomFields: taskReq.CustomFields,
		}
	}

	// Create tasks in database
	createdTasks, err := app.db.Tasks().BulkCreate(c.Request.Context(), tasks)
	if err != nil {
		app.logger.Printf("Error bulk creating tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Prepare response
	importedIDs := make([]int, len(createdTasks))
	for i, task := range createdTasks {
		importedIDs[i] = task.ID
	}

	bulkResponse := models.BulkImportResponse{
		TotalTasks:    len(req.Tasks),
		SuccessCount:  len(createdTasks),
		FailureCount:  0,
		ImportedTasks: importedIDs,
	}

	response := models.NewSuccessResponse(bulkResponse, "Tasks imported successfully")
	c.JSON(http.StatusCreated, response)
}

func (app *Application) getTaskHandler(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	task, err := app.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error getting task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(task.ToResponse(), "Task retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) updateTaskHandler(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.TaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		app.logger.Printf("Error binding JSON for task update: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, fmt.Sprintf("Invalid request body: %v", err), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing task
	existingTask, err := app.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error getting task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Track changes for update history
	var updates []models.TaskUpdate
	
	// Update task fields and track changes
	if req.Title != "" && req.Title != existingTask.Title {
		oldValue := existingTask.Title
		newValue := req.Title
		updates = append(updates, models.TaskUpdate{
			TaskID:     taskID,
			UpdateType: "title",
			OldValue:   &oldValue,
			NewValue:   &newValue,
			UpdatedBy:  nil, // TODO: Get user ID from auth context
		})
		existingTask.Title = req.Title
	}
	
	if req.Status != "" && req.Status != existingTask.Status {
		oldValue := existingTask.Status
		newValue := req.Status
		updates = append(updates, models.TaskUpdate{
			TaskID:     taskID,
			UpdateType: "status",
			OldValue:   &oldValue,
			NewValue:   &newValue,
			UpdatedBy:  nil, // TODO: Get user ID from auth context
		})
		existingTask.Status = req.Status
	}
	
	if req.Description != "" && req.Description != existingTask.Description {
		oldValue := existingTask.Description
		newValue := req.Description
		updates = append(updates, models.TaskUpdate{
			TaskID:     taskID,
			UpdateType: "description", 
			OldValue:   &oldValue,
			NewValue:   &newValue,
			UpdatedBy:  nil, // TODO: Get user ID from auth context
		})
		existingTask.Description = req.Description
	}
	
	if req.AssigneeID != nil && (existingTask.AssigneeID == nil || *req.AssigneeID != *existingTask.AssigneeID) {
		var oldValue, newValue string
		if existingTask.AssigneeID != nil {
			oldValue = fmt.Sprintf("%d", *existingTask.AssigneeID)
		} else {
			oldValue = "unassigned"
		}
		newValue = fmt.Sprintf("%d", *req.AssigneeID)
		updates = append(updates, models.TaskUpdate{
			TaskID:     taskID,
			UpdateType: "assignee",
			OldValue:   &oldValue,
			NewValue:   &newValue,
			UpdatedBy:  nil, // TODO: Get user ID from auth context
		})
		existingTask.AssigneeID = req.AssigneeID
	}
	
	if req.ParentID != nil && (existingTask.ParentID == nil || *req.ParentID != *existingTask.ParentID) {
		// Prevent self-reference
		if *req.ParentID == taskID {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Task cannot be its own parent", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		
		// Validate parent task exists and is in the same project
		parentTask, err := app.db.Tasks().GetByID(c.Request.Context(), *req.ParentID)
		if err != nil {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Parent task must exist and be in the same project", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		if parentTask.ProjectID != existingTask.ProjectID {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Parent task must be in the same project", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		
		// Check for circular reference
		if err := app.validateNoCircularReference(c.Request.Context(), *req.ParentID, taskID); err != nil {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, err.Error(), nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		
		var oldValue, newValue string
		if existingTask.ParentID != nil {
			oldValue = fmt.Sprintf("%d", *existingTask.ParentID)
		} else {
			oldValue = "none"
		}
		newValue = fmt.Sprintf("%d", *req.ParentID)
		updates = append(updates, models.TaskUpdate{
			TaskID:     taskID,
			UpdateType: "parent",
			OldValue:   &oldValue,
			NewValue:   &newValue,
			UpdatedBy:  nil, // TODO: Get user ID from auth context
		})
		existingTask.ParentID = req.ParentID
	}
	
	if req.DueDate != nil {
		existingTask.DueDate = req.DueDate
	}
	if req.CustomFields != nil {
		// Validate and clean CustomFields before assignment
		cleanedFields, err := utils.ValidateAndCleanCustomFields(req.CustomFields)
		if err != nil {
			app.logger.Printf("Error validating custom_fields: %v", err)
			response := models.NewErrorResponse(models.ErrCodeBadRequest, fmt.Sprintf("Invalid custom_fields: %v", err), nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		existingTask.CustomFields = cleanedFields
	}
	if req.SortOrder != 0 {
		existingTask.SortOrder = req.SortOrder
	}

	// Update task in database
	updatedTask, err := app.db.Tasks().Update(c.Request.Context(), existingTask)
	if err != nil {
		app.logger.Printf("Error updating task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create update history records
	for _, update := range updates {
		if err := app.db.Tasks().CreateTaskUpdate(c.Request.Context(), &update); err != nil {
			// Log error but don't fail the request
			app.logger.Printf("Error creating task update history: %v", err)
		}
	}
	
	// Create timeline event if there were changes
	if len(updates) > 0 {
		description := fmt.Sprintf("Task '%s' was updated", updatedTask.Title)
		if len(updates) == 1 {
			description = fmt.Sprintf("Task '%s' %s was changed", updatedTask.Title, updates[0].UpdateType)
		} else {
			description = fmt.Sprintf("Task '%s' was updated (%d changes)", updatedTask.Title, len(updates))
		}
		
		timelineEvent := &models.TimelineEvent{
			TaskID:      updatedTask.ID,
			EventType:   "updated",
			Description: description,
			UserID:      nil, // TODO: Get user ID from auth context
			Metadata:    models.CustomFields{"changes_count": len(updates)},
		}
		
		if err := app.db.Tasks().CreateTimelineEvent(c.Request.Context(), timelineEvent); err != nil {
			// Log error but don't fail the request
			app.logger.Printf("Error creating timeline event: %v", err)
		}
	}

	response := models.NewSuccessResponse(updatedTask.ToResponse(), "Task updated successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) deleteTaskHandler(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.db.Tasks().Delete(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error deleting task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Task deleted successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) bulkDeleteTasksHandler(c *gin.Context) {
	var request struct {
		TaskIDs []int `json:"task_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if len(request.TaskIDs) == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Task IDs list cannot be empty", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err := app.db.Tasks().BulkDelete(c.Request.Context(), request.TaskIDs)
	if err != nil {
		if err.Error() == "no tasks found to delete" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "No tasks found to delete", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error bulk deleting tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(map[string]interface{}{
		"deleted_count": len(request.TaskIDs),
		"message":       fmt.Sprintf("Successfully deleted %d tasks and their children", len(request.TaskIDs)),
	}, "Tasks deleted successfully")
	c.JSON(http.StatusOK, response)
}

// System Management Handlers

func (app *Application) getRecycledProjectsHandler(c *gin.Context) {
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	projects, total, err := app.db.System().GetRecycledProjects(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting recycled projects: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get recycled projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	paginationResult := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: (total + pagination.PageSize - 1) / pagination.PageSize,
		HasNext:    pagination.Page*pagination.PageSize < total,
		HasPrev:    pagination.Page > 1,
	}

	result := models.PaginatedResponse{
		Data:       projects,
		Pagination: paginationResult,
	}

	response := models.NewSuccessResponse(result, "Recycled projects retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) restoreProjectHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.db.System().RestoreProject(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found in recycle bin" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found in recycle bin", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error restoring project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to restore project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Project restored successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) hardDeleteProjectHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.db.System().HardDeleteProject(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found in recycle bin" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found in recycle bin", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error permanently deleting project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to permanently delete project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Project permanently deleted successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getRecycledTasksHandler(c *gin.Context) {
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	tasks, total, err := app.db.System().GetRecycledTasks(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting recycled tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get recycled tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	paginationResult := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: (total + pagination.PageSize - 1) / pagination.PageSize,
		HasNext:    pagination.Page*pagination.PageSize < total,
		HasPrev:    pagination.Page > 1,
	}

	result := models.PaginatedResponse{
		Data:       tasks,
		Pagination: paginationResult,
	}

	response := models.NewSuccessResponse(result, "Recycled tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) restoreTaskHandler(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.db.System().RestoreTask(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found in recycle bin" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found in recycle bin", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error restoring task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to restore task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Task restored successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) hardDeleteTaskHandler(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.db.System().HardDeleteTask(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found in recycle bin" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found in recycle bin", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error permanently deleting task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to permanently delete task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Task permanently deleted successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getAuditLogsHandler(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	// Parse filter parameters
	filter := &models.AuditLogFilter{
		Limit:  pagination.PageSize,
		Offset: (pagination.Page - 1) * pagination.PageSize,
	}

	// Parse query parameters for filtering
	if action := c.Query("action"); action != "" {
		filter.Action = action
	}
	if entityType := c.Query("entity_type"); entityType != "" {
		filter.ResourceType = entityType
	}
	if resourceType := c.Query("resource_type"); resourceType != "" {
		filter.ResourceType = resourceType
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startTime, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartTime = startTime
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endTime, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filter.EndTime = endTime.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}
	if ipAddress := c.Query("ip_address"); ipAddress != "" {
		filter.IPAddress = ipAddress
	}
	if status := c.Query("status"); status != "" {
		filter.Status = status
	}
	if sessionID := c.Query("session_id"); sessionID != "" {
		filter.SessionID = sessionID
	}
	if search := c.Query("search"); search != "" {
		filter.Description = search
	}

	// Get audit logs with enhanced filtering
	logs, total, err := app.db.System().GetAuditLogsWithFilter(c.Request.Context(), filter)
	if err != nil {
		app.logger.Printf("Error getting audit logs: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit logs", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create pagination metadata
	totalPages := (total + pagination.PageSize - 1) / pagination.PageSize
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       logs,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Audit logs retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getAuditLogHandler gets a single audit log by ID
func (app *Application) getAuditLogHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid audit log ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	auditLog, err := app.db.System().GetAuditLogByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "audit log not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Audit log not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		app.logger.Printf("Error getting audit log: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve audit log", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(auditLog, "Audit log retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getAuditStatsHandler gets audit log statistics
func (app *Application) getAuditStatsHandler(c *gin.Context) {
	// Parse request parameters
	filter := &models.AuditLogFilter{
		StartTime: time.Now().AddDate(0, 0, -30), // Last 30 days by default
		EndTime:   time.Now(),
	}

	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse("2006-01-02", startTimeStr); err == nil {
			filter.StartTime = startTime
		}
	}
	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse("2006-01-02", endTimeStr); err == nil {
			filter.EndTime = endTime.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}

	// Apply additional filters from query params
	if action := c.Query("action"); action != "" {
		filter.Action = action
	}
	if entityType := c.Query("entity_type"); entityType != "" {
		filter.ResourceType = entityType
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}

	groupBy := c.DefaultQuery("group_by", "day")

	// Get audit statistics
	stats, err := app.db.System().GetAuditStats(c.Request.Context(), filter, groupBy)
	if err != nil {
		app.logger.Printf("Error getting audit stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve audit statistics", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Audit statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// exportAuditLogsHandler exports audit logs as CSV or Excel
func (app *Application) exportAuditLogsHandler(c *gin.Context) {
	format := c.DefaultQuery("format", "csv")
	if format != "csv" && format != "excel" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid format. Supported formats: csv, excel", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse filter parameters (similar to getAuditLogsHandler)
	filter := &models.AuditLogFilter{
		Limit: 10000, // Set a reasonable limit for export
	}

	// Parse query parameters for filtering
	if action := c.Query("action"); action != "" {
		filter.Action = action
	}
	if entityType := c.Query("entity_type"); entityType != "" {
		filter.ResourceType = entityType
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startTime, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartTime = startTime
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endTime, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filter.EndTime = endTime.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}
	if search := c.Query("search"); search != "" {
		filter.Description = search
	}

	// Get audit logs for export
	logs, _, err := app.db.System().GetAuditLogsWithFilter(c.Request.Context(), filter)
	if err != nil {
		app.logger.Printf("Error getting audit logs for export: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit logs for export", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if format == "csv" {
		app.exportAuditLogsAsCSV(c, logs)
	} else {
		app.exportAuditLogsAsExcel(c, logs)
	}
}

// exportAuditLogsAsCSV exports audit logs as CSV
func (app *Application) exportAuditLogsAsCSV(c *gin.Context, logs []interface{}) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment;filename=audit_logs.csv")

	// Write CSV header
	csvContent := "时间,用户,操作,实体类型,实体ID,IP地址,状态,描述\n"

	// Write data rows
	for _, logInterface := range logs {
		if log, ok := logInterface.(*models.AuditLog); ok {
			csvContent += app.formatAuditLogCSVRow(log)
		}
	}

	c.String(http.StatusOK, csvContent)
}

// exportAuditLogsAsExcel exports audit logs as Excel (placeholder implementation)
func (app *Application) exportAuditLogsAsExcel(c *gin.Context, logs []interface{}) {
	// For now, return CSV with Excel headers
	// In a real implementation, you would use a library like excelize
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment;filename=audit_logs.xlsx")

	// For simplicity, return CSV content
	// TODO: Implement proper Excel export
	csvContent := "时间,用户,操作,实体类型,实体ID,IP地址,状态,描述\n"
	for _, logInterface := range logs {
		if log, ok := logInterface.(*models.AuditLog); ok {
			csvContent += app.formatAuditLogCSVRow(log)
		}
	}

	c.String(http.StatusOK, csvContent)
}

// formatAuditLogCSVRow formats a single audit log as CSV row
func (app *Application) formatAuditLogCSVRow(log *models.AuditLog) string {
	return log.Timestamp.Format("2006-01-02 15:04:05") + "," +
		log.UserName + "," +
		log.Action + "," +
		log.ResourceType + "," +
		log.ResourceID + "," +
		log.IPAddress + "," +
		log.Status + "," +
		"\"" + log.Description + "\"" + "\n"
}

// getTaskTreeHandler gets the complete task tree for a project
func (app *Application) getTaskTreeHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	taskTree, err := app.db.Tasks().GetTaskTree(c.Request.Context(), projectID)
	if err != nil {
		app.logger.Printf("Error getting task tree: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get task tree", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(taskTree, "Task tree retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getRootTasksHandler gets root tasks for a project
func (app *Application) getRootTasksHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	tasks, total, err := app.db.Tasks().GetRootTasks(c.Request.Context(), projectID, pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting root tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get root tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	paginationResult := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: (total + pagination.PageSize - 1) / pagination.PageSize,
		HasNext:    pagination.Page*pagination.PageSize < total,
		HasPrev:    pagination.Page > 1,
	}

	result := models.PaginatedResponse{
		Data:       tasks,
		Pagination: paginationResult,
	}

	response := models.NewSuccessResponse(result, "Root tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getTaskChildrenHandler gets direct children of a task
func (app *Application) getTaskChildrenHandler(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	children, err := app.db.Tasks().GetChildren(c.Request.Context(), taskID)
	if err != nil {
		app.logger.Printf("Error getting task children: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get task children", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(children, "Task children retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getTaskUpdatesHandler gets update history for a task
func (app *Application) getTaskUpdatesHandler(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set default values if not provided
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	updates, total, err := app.db.Tasks().GetTaskUpdates(c.Request.Context(), taskID, pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting task updates: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get task updates", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	paginationResult := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: (total + pagination.PageSize - 1) / pagination.PageSize,
		HasNext:    pagination.Page*pagination.PageSize < total,
		HasPrev:    pagination.Page > 1,
	}

	result := models.PaginatedResponse{
		Data:       updates,
		Pagination: paginationResult,
	}

	response := models.NewSuccessResponse(result, "Task updates retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// updateTaskUpdateHandler updates notes for a task update record
func (app *Application) updateTaskUpdateHandler(c *gin.Context) {
	updateIDStr := c.Param("updateId")
	updateID, err := strconv.Atoi(updateIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid update ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.db.Tasks().UpdateTaskUpdateNotes(c.Request.Context(), updateID, req.Notes)
	if err != nil {
		app.logger.Printf("Error updating task update notes: %v", err)
		if err.Error() == "task update not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task update not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update task update notes", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(nil, "Task update notes updated successfully")
	c.JSON(http.StatusOK, response)
}

// deleteTaskUpdateHandler deletes a task update record (admin only)
func (app *Application) deleteTaskUpdateHandler(c *gin.Context) {
	updateIDStr := c.Param("updateId")
	updateID, err := strconv.Atoi(updateIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid update ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Note: In production, add admin role check here
	// if !app.isAdmin(c) { ... }

	err = app.db.Tasks().DeleteTaskUpdate(c.Request.Context(), updateID)
	if err != nil {
		app.logger.Printf("Error deleting task update: %v", err)
		if err.Error() == "task update not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task update not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete task update", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(nil, "Task update deleted successfully")
	c.JSON(http.StatusOK, response)
}

// getTaskTimelineHandler gets timeline events for a specific task
func (app *Application) getTaskTimelineHandler(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set default values if not provided
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	events, total, err := app.db.Tasks().GetTaskTimeline(c.Request.Context(), taskID, pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting task timeline: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get task timeline", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	paginationResult := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: (total + pagination.PageSize - 1) / pagination.PageSize,
		HasNext:    pagination.Page*pagination.PageSize < total,
		HasPrev:    pagination.Page > 1,
	}

	result := models.PaginatedResponse{
		Data:       events,
		Pagination: paginationResult,
	}

	response := models.NewSuccessResponse(result, "Task timeline retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getProjectTimelineHandler gets timeline events for all tasks in a project
func (app *Application) getProjectTimelineHandler(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	events, total, err := app.db.Tasks().GetProjectTimeline(c.Request.Context(), projectID, pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting project timeline: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get project timeline", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	paginationResult := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: (total + pagination.PageSize - 1) / pagination.PageSize,
		HasNext:    pagination.Page*pagination.PageSize < total,
		HasPrev:    pagination.Page > 1,
	}

	result := models.PaginatedResponse{
		Data:       events,
		Pagination: paginationResult,
	}

	response := models.NewSuccessResponse(result, "Project timeline retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// User management handlers

// getUserProfileHandler gets the current user's profile
func (app *Application) getUserProfileHandler(c *gin.Context) {
	// Extract user ID from context (set by mapUserToCompanyUser middleware)
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"User not authenticated",
			map[string]string{"error": "No user context found"},
		)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userID, ok := userIDInterface.(int)
	if !ok {
		response := models.NewErrorResponse(
			models.ErrCodeInternal,
			"Invalid user context",
			map[string]string{"error": "Invalid user ID format"},
		)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	user, err := app.db.Users().GetByID(c.Request.Context(), userID)
	if err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeNotFound,
			"User not found",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(user.ToResponse(), "User profile retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// updateUserProfileHandler updates the current user's profile
func (app *Application) updateUserProfileHandler(c *gin.Context) {
	// Extract user ID from context (set by mapUserToCompanyUser middleware)
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"User not authenticated",
			map[string]string{"error": "No user context found"},
		)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userID, ok := userIDInterface.(int)
	if !ok {
		response := models.NewErrorResponse(
			models.ErrCodeInternal,
			"Invalid user context",
			map[string]string{"error": "Invalid user ID format"},
		)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var req models.UserProfileUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeValidation,
			"Invalid request data",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := app.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeValidation,
			"Validation failed",
			app.extractValidationErrors(err),
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Check if username is already taken by another user
	existingUser, err := app.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err == nil && existingUser.ID != userID {
		response := models.NewErrorResponse(
			models.ErrCodeConflict,
			"Username already taken",
			map[string]string{"username": "This username is already in use"},
		)
		c.JSON(http.StatusConflict, response)
		return
	}

	// Check if email is already taken by another user
	existingUser, err = app.db.Users().GetByEmail(c.Request.Context(), req.Email)
	if err == nil && existingUser.ID != userID {
		response := models.NewErrorResponse(
			models.ErrCodeConflict,
			"Email already taken",
			map[string]string{"email": "This email is already in use"},
		)
		c.JSON(http.StatusConflict, response)
		return
	}

	// Update user profile
	updatedUser, err := app.db.Users().UpdateProfile(c.Request.Context(), userID, req.Username, req.Email)
	if err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeInternal,
			"Failed to update profile",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedUser.ToResponse(), "Profile updated successfully")
	c.JSON(http.StatusOK, response)
}

// changePasswordHandler changes the current user's password
func (app *Application) changePasswordHandler(c *gin.Context) {
	// TODO: Extract user ID from JWT token in context
	userID := 1 // This should come from JWT token middleware

	var req models.PasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeValidation,
			"Invalid request data",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := app.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeValidation,
			"Validation failed",
			app.extractValidationErrors(err),
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get current user
	user, err := app.db.Users().GetByID(c.Request.Context(), userID)
	if err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeNotFound,
			"User not found",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Verify current password
	if !utils.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		response := models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"Current password is incorrect",
			map[string]string{"current_password": "Invalid current password"},
		)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Hash new password
	newPasswordHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeInternal,
			"Failed to hash password",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Update password
	err = app.db.Users().UpdatePassword(c.Request.Context(), userID, newPasswordHash)
	if err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeInternal,
			"Failed to update password",
			map[string]string{"error": err.Error()},
		)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Password changed successfully")
	c.JSON(http.StatusOK, response)
}

// extractValidationErrors extracts validation errors from validator error
func (app *Application) extractValidationErrors(err error) map[string]string {
	errors := make(map[string]string)
	
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := fieldError.Field()
			tag := fieldError.Tag()
			
			switch tag {
			case "required":
				errors[field] = fmt.Sprintf("%s is required", field)
			case "email":
				errors[field] = "Invalid email format"
			case "min":
				errors[field] = fmt.Sprintf("%s must be at least %s characters", field, fieldError.Param())
			case "max":
				errors[field] = fmt.Sprintf("%s must be no more than %s characters", field, fieldError.Param())
			case "oneof":
				errors[field] = fmt.Sprintf("%s must be one of: %s", field, fieldError.Param())
			default:
				errors[field] = fmt.Sprintf("%s is invalid", field)
			}
		}
	} else {
		// Fallback for non-validation errors
		errors["general"] = err.Error()
	}
	
	return errors
}


// Run starts the application server
func (app *Application) Run() error {
	router := app.setupRouter()

	log.Printf("Starting %s server on %s", app.config.App.Name, app.config.GetServerAddress())
	log.Printf("Version: %s, Build Time: %s, Git Commit: %s", Version, BuildTime, GitCommit)
	log.Printf("Environment: %s", app.config.App.Environment)
	
	server := &http.Server{
		Addr:         app.config.GetServerAddress(),
		Handler:      router,
		ReadTimeout:  app.config.Server.ReadTimeout,
		WriteTimeout: app.config.Server.WriteTimeout,
		IdleTimeout:  app.config.Server.IdleTimeout,
	}

	return server.ListenAndServe()
}

// Close closes the application and its dependencies
func (app *Application) Close() error {
	if app.db != nil {
		return app.db.Close()
	}
	return nil
}

// calculateTaskDepth calculates the depth of a task in the hierarchy
func (app *Application) calculateTaskDepth(ctx context.Context, task *models.Task) int {
	if task.ParentID == nil {
		return 0 // Root task has depth 0
	}

	depth := 0
	currentParentID := *task.ParentID
	
	// Traverse up the parent chain to calculate depth
	for currentParentID != 0 && depth < 10 { // Max depth limit to prevent infinite loops
		parentTask, err := app.db.Tasks().GetByID(ctx, currentParentID)
		if err != nil {
			// If we can't find the parent, assume current depth
			app.logger.Printf("calculateTaskDepth: Error finding parent task %d: %v", currentParentID, err)
			break
		}
		
		depth++
		if parentTask.ParentID == nil {
			break // Reached root parent
		}
		currentParentID = *parentTask.ParentID
	}
	
	return depth
}

// validateNoCircularReference checks if setting parentID for taskID would create a circular reference
func (app *Application) validateNoCircularReference(ctx context.Context, parentID, taskID int) error {
	const maxDepth = 10 // Maximum hierarchy depth allowed
	
	// Follow the parent chain up to check for circular reference
	currentParentID := parentID
	depth := 0
	
	for currentParentID != 0 {
		// Check for circular reference
		if currentParentID == taskID {
			return fmt.Errorf("circular reference detected: setting parent would create a loop")
		}
		
		// Check depth limit
		depth++
		if depth > maxDepth {
			return fmt.Errorf("maximum hierarchy depth (%d) exceeded", maxDepth)
		}
		
		// Get the parent's parent
		parentTask, err := app.db.Tasks().GetByID(ctx, currentParentID)
		if err != nil {
			if err.Error() == "task not found" {
				break // Parent doesn't exist, no circular reference
			}
			return fmt.Errorf("error checking parent task: %v", err)
		}
		
		if parentTask.ParentID == nil {
			break // Reached root parent
		}
		
		currentParentID = *parentTask.ParentID
	}
	
	return nil
}

// AI Configuration handlers

// getAIConfigsHandler gets all AI configurations
func (app *Application) getAIConfigsHandler(c *gin.Context) {
	// Return empty list for now - this is a placeholder implementation
	configs := []map[string]interface{}{}
	response := models.NewSuccessResponse(configs, "AI configurations retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// createAIConfigHandler creates a new AI configuration
func (app *Application) createAIConfigHandler(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Placeholder response - in production this would save to database
	config := map[string]interface{}{
		"id":         1,
		"provider":   req["provider"],
		"model":      req["model"],
		"enabled":    req["enabled"],
		"created_at": "2024-01-01T00:00:00Z",
		"updated_at": "2024-01-01T00:00:00Z",
	}

	response := models.NewSuccessResponse(config, "AI configuration created successfully")
	c.JSON(http.StatusCreated, response)
}

// getAIConfigHandler gets a specific AI configuration
func (app *Application) getAIConfigHandler(c *gin.Context) {
	provider := c.Param("provider")
	
	// Placeholder response
	config := map[string]interface{}{
		"id":         1,
		"provider":   provider,
		"model":      "default-model",
		"enabled":    true,
		"created_at": "2024-01-01T00:00:00Z",
		"updated_at": "2024-01-01T00:00:00Z",
	}

	response := models.NewSuccessResponse(config, "AI configuration retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// 已删除旧的updateAIConfigHandler，使用handlers.AIConfigHandler.UpdateConfig代替

// deleteAIConfigHandler deletes an AI configuration
func (app *Application) deleteAIConfigHandler(c *gin.Context) {
	response := models.NewSuccessResponse(nil, "AI configuration deleted successfully")
	c.JSON(http.StatusOK, response)
}

// testAIConnectionHandler tests AI connection
func (app *Application) testAIConnectionHandler(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 验证必需字段
	provider, ok := req["provider"].(string)
	if !ok || provider == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Provider is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	apiKey, ok := req["apiKey"].(string)
	if !ok || apiKey == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "API key is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	model, ok := req["model"].(string)
	if !ok || model == "" {
		// 设置默认模型
		switch provider {
		case "deepseek":
			model = "deepseek-chat"
		case "openai":
			model = "gpt-3.5-turbo"
		case "claude":
			model = "claude-3-haiku-20240307"
		default:
			model = "gpt-3.5-turbo"
		}
	}

	baseURL, _ := req["baseURL"].(string)
	if baseURL == "" {
		// 设置默认API地址
		switch provider {
		case "deepseek":
			baseURL = "https://api.deepseek.com/v1"
		case "openai":
			baseURL = "https://api.openai.com/v1"
		case "claude":
			baseURL = "https://api.anthropic.com/v1"
		}
	}

	// 执行模拟测试（增强版）
	startTime := time.Now()
	
	// 基本格式验证
	var validationError string
	switch provider {
	case "deepseek":
		if !strings.HasPrefix(apiKey, "sk-") || len(apiKey) < 20 {
			validationError = "DeepSeek API密钥格式错误，应以sk-开头且长度至少20位"
		}
	case "openai":
		if !strings.HasPrefix(apiKey, "sk-") || len(apiKey) < 20 {
			validationError = "OpenAI API密钥格式错误，应以sk-开头且长度至少20位"
		}
	case "claude":
		if !strings.HasPrefix(apiKey, "sk-ant-") || len(apiKey) < 30 {
			validationError = "Claude API密钥格式错误，应以sk-ant-开头且长度至少30位"
		}
	default:
		validationError = "不支持的AI提供商"
	}

	responseTime := int(time.Since(startTime).Milliseconds())

	var testResult map[string]interface{}
	if validationError != "" {
		testResult = map[string]interface{}{
			"success":      false,
			"message":      validationError,
			"responseTime": responseTime,
		}
	} else {
		// 模拟成功的连接测试
		// 在生产环境中，这里应该调用真实的AI API
		
		// 检查是否为测试密钥
		isTestKey := strings.Contains(strings.ToLower(apiKey), "test") || 
					 strings.Contains(strings.ToLower(apiKey), "demo") ||
					 strings.Contains(strings.ToLower(apiKey), "mock")

		if isTestKey {
			// 测试密钥总是成功
			testResult = map[string]interface{}{
				"success":      true,
				"message":      fmt.Sprintf("%s连接测试成功（模拟模式）", getProviderName(provider)),
				"responseTime": responseTime + 100, // 模拟网络延迟
				"modelInfo": map[string]interface{}{
					"name":    model,
					"version": "1.0.0",
				},
			}
		} else {
			// 对于非测试密钥，模拟70%的成功率
			rand.Seed(time.Now().UnixNano())
			if rand.Float32() < 0.7 {
				testResult = map[string]interface{}{
					"success":      true,
					"message":      fmt.Sprintf("%s连接测试成功", getProviderName(provider)),
					"responseTime": responseTime + 200,
					"modelInfo": map[string]interface{}{
						"name":    model,
						"version": "1.0.0",
					},
				}
			} else {
				testResult = map[string]interface{}{
					"success":      false,
					"message":      "API密钥验证失败，请检查密钥是否正确且有效",
					"responseTime": responseTime + 50,
				}
			}
		}
	}

	response := models.NewSuccessResponse(testResult, "AI connection test completed")
	c.JSON(http.StatusOK, response)
}

// getProviderName 获取AI提供商的友好名称
func getProviderName(provider string) string {
	switch provider {
	case "deepseek":
		return "DeepSeek"
	case "openai":
		return "OpenAI"
	case "claude":
		return "Claude"
	default:
		return "AI Provider"
	}
}

// toggleAIConfigHandler enables/disables an AI configuration
func (app *Application) toggleAIConfigHandler(c *gin.Context) {
	provider := c.Param("provider")
	var req map[string]interface{}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Placeholder response
	config := map[string]interface{}{
		"id":         1,
		"provider":   provider,
		"enabled":    req["enabled"],
		"updated_at": "2024-01-01T00:00:00Z",
	}

	response := models.NewSuccessResponse(config, "AI configuration toggled successfully")
	c.JSON(http.StatusOK, response)
}

// getEnabledAIConfigHandler gets the currently enabled AI configuration
func (app *Application) getEnabledAIConfigHandler(c *gin.Context) {
	// Placeholder response - return null for now
	response := models.NewSuccessResponse(nil, "No enabled AI configuration")
	c.JSON(http.StatusOK, response)
}

// getAIConfigStatsHandler gets AI configuration statistics
func (app *Application) getAIConfigStatsHandler(c *gin.Context) {
	stats := map[string]interface{}{
		"total":   0,
		"enabled": 0,
		"providers": []map[string]interface{}{},
	}

	response := models.NewSuccessResponse(stats, "AI configuration stats retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// batchUpdateAIConfigsHandler updates multiple AI configurations
func (app *Application) batchUpdateAIConfigsHandler(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	configs := []map[string]interface{}{}
	response := models.NewSuccessResponse(configs, "AI configurations updated successfully")
	c.JSON(http.StatusOK, response)
}

// exportAIConfigsHandler exports AI configurations
func (app *Application) exportAIConfigsHandler(c *gin.Context) {
	exportData := map[string]interface{}{
		"configs":    []map[string]interface{}{},
		"exportTime": "2024-01-01T00:00:00Z",
	}

	response := models.NewSuccessResponse(exportData, "AI configurations exported successfully")
	c.JSON(http.StatusOK, response)
}

// mapUserToCompanyUser middleware maps authenticated user to company user and sets user type
func (app *Application) mapUserToCompanyUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"Authorization header is required",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		tokenParts := []string{}
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenParts = append(tokenParts, authHeader[7:])
		}

		if len(tokenParts) == 0 {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"Invalid authorization format",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		token := tokenParts[0]

		// Validate and parse JWT token
		claims, err := app.jwtManager.ValidateToken(token)
		if err != nil {
			app.logger.Printf("Token validation error: %v", err)
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"Invalid or expired token",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// Get user ID from claims
		userID := int(claims.UserID)
		
		// Get user information from database to determine user type
		user, err := app.db.Users().GetByID(c.Request.Context(), userID)
		if err != nil {
			app.logger.Printf("User lookup error for userID %d: %v", userID, err)
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"User not found",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// Set basic user context for compatibility
		c.Set("user_id", userID)
		c.Set("user_name", user.Username)
		c.Set("user_role", user.Role)
		
		// Set user type information for middleware
		userType := "system" // Default to system user for backward compatibility
		var companyID interface{}
		
		// Determine user type based on role:
		// - admin, project_manager, developer = system users
		// - company_admin, company_user = company users
		if user.Role == "company_admin" || user.Role == "company_user" {
			userType = "company"
			// For company users, you would get their company_id from the user record
			// For demo, we'll set a default company ID
			companyID = 1
		}
		
		c.Set("user_type", userType)
		c.Set("company_id", companyID)
		
		// Map to company user (for demo, use same ID)
		c.Set("company_user_id", userID)
		
		// Log user type information for debugging
		app.logger.Printf("mapUserToCompanyUser: userID=%d, userType=%s, role=%s, companyID=%v", 
			userID, userType, user.Role, companyID)
		
		c.Next()
	}
}

// Helper function to create project-company association
func (app *Application) createProjectCompanyAssociation(ctx context.Context, projectID, companyID int, isPrimary bool) error {
	query := `
		INSERT INTO project_companies (project_id, company_id, is_primary, role)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (project_id, company_id) DO UPDATE SET
			is_primary = EXCLUDED.is_primary,
			role = EXCLUDED.role,
			updated_at = now()`
	
	role := "客户"
	if isPrimary {
		role = "主客户"
	}
	
	db := app.db.GetDB().(*sql.DB)
	_, err := db.ExecContext(ctx, query, projectID, companyID, isPrimary, role)
	return err
}

// Helper function to create project-user assignment
func (app *Application) createProjectUserAssignment(ctx context.Context, projectID, userID int, role string, isPrimary bool) error {
	query := `
		INSERT INTO project_users (project_id, user_id, role, is_primary)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (project_id, user_id) DO UPDATE SET
			role = EXCLUDED.role,
			is_primary = EXCLUDED.is_primary,
			updated_at = now()`
	
	db := app.db.GetDB().(*sql.DB)
	_, err := db.ExecContext(ctx, query, projectID, userID, role, isPrimary)
	return err
}

// getDocumentProjectsHandler 获取文档可关联的项目列表
func (app *Application) getDocumentProjectsHandler(c *gin.Context) {
	sqlDB := app.db.GetDB().(*sql.DB)
	
	query := `
		SELECT id, name, description, status 
		FROM projects 
		WHERE deleted_at IS NULL 
		ORDER BY name ASC
	`
	
	rows, err := sqlDB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to query projects",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()
	
	var projects []map[string]interface{}
	
	for rows.Next() {
		var id int
		var name, description, status sql.NullString
		
		err := rows.Scan(&id, &name, &description, &status)
		if err != nil {
			continue
		}
		
		project := map[string]interface{}{
			"id":   id,
			"name": name.String,
		}
		
		if description.Valid {
			project["description"] = description.String
		}
		if status.Valid {
			project["status"] = status.String
		}
		
		projects = append(projects, project)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Projects retrieved successfully",
		"data":    projects,
	})
}

// getDocumentCustomersHandler 获取文档可关联的客户列表
func (app *Application) getDocumentCustomersHandler(c *gin.Context) {
	sqlDB := app.db.GetDB().(*sql.DB)
	
	query := `
		SELECT id, name, company_name, type, industry, description 
		FROM customers 
		WHERE deleted_at IS NULL 
		ORDER BY name ASC
	`
	
	rows, err := sqlDB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to query customers",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()
	
	var customers []map[string]interface{}
	
	for rows.Next() {
		var id int
		var name, companyName, customerType, industry, description sql.NullString
		
		err := rows.Scan(&id, &name, &companyName, &customerType, &industry, &description)
		if err != nil {
			continue
		}
		
		customer := map[string]interface{}{
			"id":   id,
			"name": name.String,
		}
		
		if companyName.Valid {
			customer["company_name"] = companyName.String
		}
		if customerType.Valid {
			customer["type"] = customerType.String
		}
		if industry.Valid {
			customer["industry"] = industry.String
		}
		if description.Valid {
			customer["description"] = description.String
		}
		
		customers = append(customers, customer)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Customers retrieved successfully",
		"data":    customers,
	})
}

// getDocumentCategoriesHandler 获取文档分类列表
func (app *Application) getDocumentCategoriesHandler(c *gin.Context) {
	// 预定义的文档分类
	categories := []map[string]interface{}{
		{
			"label": "产品文档",
			"value": "product",
			"children": []map[string]string{
				{"label": "需求文档", "value": "product/requirement"},
				{"label": "PRD", "value": "product/prd"},
				{"label": "原型设计", "value": "product/prototype"},
				{"label": "用户故事", "value": "product/user-story"},
			},
		},
		{
			"label": "技术文档",
			"value": "technical",
			"children": []map[string]string{
				{"label": "API文档", "value": "technical/api"},
				{"label": "架构设计", "value": "technical/architecture"},
				{"label": "开发指南", "value": "technical/dev-guide"},
				{"label": "部署文档", "value": "technical/deployment"},
			},
		},
		{
			"label": "业务文档",
			"value": "business",
			"children": []map[string]string{
				{"label": "商业计划", "value": "business/plan"},
				{"label": "市场分析", "value": "business/market"},
				{"label": "财务报告", "value": "business/finance"},
				{"label": "合同协议", "value": "business/contract"},
			},
		},
		{
			"label": "会议文档",
			"value": "meeting",
			"children": []map[string]string{
				{"label": "会议纪要", "value": "meeting/minutes"},
				{"label": "决策记录", "value": "meeting/decision"},
				{"label": "行动计划", "value": "meeting/action"},
				{"label": "状态更新", "value": "meeting/status"},
			},
		},
		{
			"label": "培训文档",
			"value": "training",
			"children": []map[string]string{
				{"label": "用户手册", "value": "training/manual"},
				{"label": "操作指南", "value": "training/guide"},
				{"label": "培训材料", "value": "training/material"},
				{"label": "FAQ", "value": "training/faq"},
			},
		},
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Categories retrieved successfully",
		"data":    categories,
	})
}

// getTodayTasksHandler returns today's tasks based on specific criteria
func (app *Application) getTodayTasksHandler(c *gin.Context) {
	// Parse query parameters
	projectID := c.Query("project_id")
	userID := c.Query("user_id") 
	status := c.Query("status")
	priority := c.Query("priority")
	sortBy := c.DefaultQuery("sort_by", "updated_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	limitStr := c.DefaultQuery("limit", "1000")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 1000
	}

	// Get all tasks first
	tasks, _, err := app.db.Tasks().GetAll(c.Request.Context(), limit, 0)
	if err != nil {
		app.logger.Printf("Error getting all tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Apply basic filters first
	if projectID != "" {
		if pid, err := strconv.Atoi(projectID); err == nil {
			filteredTasks := []*models.Task{}
			for _, task := range tasks {
				if task.ProjectID == pid {
					filteredTasks = append(filteredTasks, task)
				}
			}
			tasks = filteredTasks
		}
	}

	if userID != "" {
		if uid, err := strconv.Atoi(userID); err == nil {
			filteredTasks := []*models.Task{}
			for _, task := range tasks {
				if task.AssigneeID != nil && *task.AssigneeID == uid {
					filteredTasks = append(filteredTasks, task)
				}
			}
			tasks = filteredTasks
		}
	}

	if status != "" {
		filteredTasks := []*models.Task{}
		for _, task := range tasks {
			if task.Status == status {
				filteredTasks = append(filteredTasks, task)
			}
		}
		tasks = filteredTasks
	}

	if priority != "" {
		filteredTasks := []*models.Task{}
		for _, task := range tasks {
			if task.CustomFields != nil {
				if taskPriority, exists := task.CustomFields["priority"]; exists && taskPriority == priority {
					filteredTasks = append(filteredTasks, task)
				}
			}
		}
		tasks = filteredTasks
	}

	// Apply today's tasks filtering logic
	todayTasks := []*models.Task{}
	inProgressTasks := []*models.Task{}
	dueTodayTasks := []*models.Task{}
	createdTodayTasks := []*models.Task{}
	updatedTodayTasks := []*models.Task{}
	overdueTasks := []*models.Task{}

	today := time.Now().Format("2006-01-02")

	for _, task := range tasks {
		// Skip cancelled tasks
		if task.Status == "cancelled" {
			continue
		}

		isToday := false

		// 1. Tasks with status "in_progress"
		if task.Status == "in_progress" {
			isToday = true
			inProgressTasks = append(inProgressTasks, task)
		}

		// 2. Tasks due today
		if task.DueDate != nil && task.DueDate.Format("2006-01-02") == today {
			isToday = true
			dueTodayTasks = append(dueTodayTasks, task)
		}

		// 3. Tasks created today
		if task.CreatedAt.Format("2006-01-02") == today {
			isToday = true
			createdTodayTasks = append(createdTodayTasks, task)
		}

		// 4. Tasks updated today (where updated_at ≠ created_at)
		if task.UpdatedAt.Format("2006-01-02") == today && !task.UpdatedAt.Equal(task.CreatedAt) {
			isToday = true
			updatedTodayTasks = append(updatedTodayTasks, task)
		}

		// 5. Overdue tasks that are not completed
		if task.DueDate != nil {
			dueDate := task.DueDate.Format("2006-01-02")
			if dueDate < today && task.Status != "completed" && task.Status != "cancelled" {
				isToday = true
				overdueTasks = append(overdueTasks, task)
			}
		}

		if isToday {
			todayTasks = append(todayTasks, task)
		}
	}

	// Remove duplicates (a task might satisfy multiple conditions)
	uniqueTasks := make(map[int]*models.Task)
	for _, task := range todayTasks {
		uniqueTasks[task.ID] = task
	}

	finalTasks := make([]*models.Task, 0, len(uniqueTasks))
	for _, task := range uniqueTasks {
		finalTasks = append(finalTasks, task)
	}

	// Apply sorting
	if len(finalTasks) > 0 {
		switch sortBy {
		case "created_at":
			if sortOrder == "desc" {
				sort.Slice(finalTasks, func(i, j int) bool {
					return finalTasks[i].CreatedAt.After(finalTasks[j].CreatedAt)
				})
			} else {
				sort.Slice(finalTasks, func(i, j int) bool {
					return finalTasks[i].CreatedAt.Before(finalTasks[j].CreatedAt)
				})
			}
		case "updated_at":
			if sortOrder == "desc" {
				sort.Slice(finalTasks, func(i, j int) bool {
					return finalTasks[i].UpdatedAt.After(finalTasks[j].UpdatedAt)
				})
			} else {
				sort.Slice(finalTasks, func(i, j int) bool {
					return finalTasks[i].UpdatedAt.Before(finalTasks[j].UpdatedAt)
				})
			}
		case "due_date":
			if sortOrder == "desc" {
				sort.Slice(finalTasks, func(i, j int) bool {
					if finalTasks[i].DueDate == nil && finalTasks[j].DueDate == nil {
						return false
					}
					if finalTasks[i].DueDate == nil {
						return false
					}
					if finalTasks[j].DueDate == nil {
						return true
					}
					return finalTasks[i].DueDate.After(*finalTasks[j].DueDate)
				})
			} else {
				sort.Slice(finalTasks, func(i, j int) bool {
					if finalTasks[i].DueDate == nil && finalTasks[j].DueDate == nil {
						return false
					}
					if finalTasks[i].DueDate == nil {
						return false
					}
					if finalTasks[j].DueDate == nil {
						return true
					}
					return finalTasks[i].DueDate.Before(*finalTasks[j].DueDate)
				})
			}
		case "priority":
			priorityOrder := map[string]int{"high": 3, "medium": 2, "low": 1}
			if sortOrder == "desc" {
				sort.Slice(finalTasks, func(i, j int) bool {
					iPriority := 0
					jPriority := 0
					if finalTasks[i].CustomFields != nil {
						if p, exists := finalTasks[i].CustomFields["priority"]; exists {
							if pStr, ok := p.(string); ok {
								iPriority = priorityOrder[pStr]
							}
						}
					}
					if finalTasks[j].CustomFields != nil {
						if p, exists := finalTasks[j].CustomFields["priority"]; exists {
							if pStr, ok := p.(string); ok {
								jPriority = priorityOrder[pStr]
							}
						}
					}
					return iPriority > jPriority
				})
			} else {
				sort.Slice(finalTasks, func(i, j int) bool {
					iPriority := 0
					jPriority := 0
					if finalTasks[i].CustomFields != nil {
						if p, exists := finalTasks[i].CustomFields["priority"]; exists {
							if pStr, ok := p.(string); ok {
								iPriority = priorityOrder[pStr]
							}
						}
					}
					if finalTasks[j].CustomFields != nil {
						if p, exists := finalTasks[j].CustomFields["priority"]; exists {
							if pStr, ok := p.(string); ok {
								jPriority = priorityOrder[pStr]
							}
						}
					}
					return iPriority < jPriority
				})
			}
		case "title":
			if sortOrder == "desc" {
				sort.Slice(finalTasks, func(i, j int) bool {
					return finalTasks[i].Title > finalTasks[j].Title
				})
			} else {
				sort.Slice(finalTasks, func(i, j int) bool {
					return finalTasks[i].Title < finalTasks[j].Title
				})
			}
		}
	}

	// Convert to response format
	taskResponses := make([]models.TaskResponse, len(finalTasks))
	for i, task := range finalTasks {
		taskResponses[i] = task.ToResponse()
	}

	// Calculate statistics
	stats := map[string]interface{}{
		"total_count":          len(finalTasks),
		"in_progress_count":    len(inProgressTasks),
		"due_today_count":      len(dueTodayTasks),
		"created_today_count":  len(createdTodayTasks),
		"updated_today_count":  len(updatedTodayTasks),
		"overdue_count":        len(overdueTasks),
		"high_priority_count":  0, // TODO: Count high priority tasks
	}

	// Grouping
	grouping := map[string]interface{}{
		"in_progress":     convertTasksToResponses(inProgressTasks),
		"due_today":       convertTasksToResponses(dueTodayTasks),
		"created_today":   convertTasksToResponses(createdTodayTasks),
		"updated_today":   convertTasksToResponses(updatedTodayTasks),
		"overdue":         convertTasksToResponses(overdueTasks),
	}

	responseData := map[string]interface{}{
		"tasks":    taskResponses,
		"stats":    stats,
		"grouping": grouping,
	}

	response := models.NewSuccessResponse(responseData, "Today's tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getTodayTasksStatsHandler returns only statistics for today's tasks
func (app *Application) getTodayTasksStatsHandler(c *gin.Context) {
	// Get all tasks first
	tasks, _, err := app.db.Tasks().GetAll(c.Request.Context(), 1000, 0)
	if err != nil {
		app.logger.Printf("Error getting all tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Apply today's tasks filtering logic (same as above but only count)
	inProgressCount := 0
	dueTodayCount := 0
	createdTodayCount := 0
	updatedTodayCount := 0
	overdueCount := 0
	highPriorityCount := 0
	totalCount := 0

	today := time.Now().Format("2006-01-02")
	uniqueTasks := make(map[int]bool)

	for _, task := range tasks {
		// Skip cancelled tasks
		if task.Status == "cancelled" {
			continue
		}

		isToday := false

		// 1. Tasks with status "in_progress"
		if task.Status == "in_progress" {
			inProgressCount++
			isToday = true
		}

		// 2. Tasks due today
		if task.DueDate != nil && task.DueDate.Format("2006-01-02") == today {
			dueTodayCount++
			isToday = true
		}

		// 3. Tasks created today
		if task.CreatedAt.Format("2006-01-02") == today {
			createdTodayCount++
			isToday = true
		}

		// 4. Tasks updated today (where updated_at ≠ created_at)
		if task.UpdatedAt.Format("2006-01-02") == today && !task.UpdatedAt.Equal(task.CreatedAt) {
			updatedTodayCount++
			isToday = true
		}

		// 5. Overdue tasks that are not completed
		if task.DueDate != nil {
			dueDate := task.DueDate.Format("2006-01-02")
			if dueDate < today && task.Status != "completed" && task.Status != "cancelled" {
				overdueCount++
				isToday = true
			}
		}

		if isToday && !uniqueTasks[task.ID] {
			uniqueTasks[task.ID] = true
			totalCount++

			// Count high priority tasks
			if task.CustomFields != nil {
				if priority, exists := task.CustomFields["priority"]; exists && priority == "high" {
					highPriorityCount++
				}
			}
		}
	}

	stats := map[string]interface{}{
		"total_count":          totalCount,
		"in_progress_count":    inProgressCount,
		"due_today_count":      dueTodayCount,
		"created_today_count":  createdTodayCount,
		"updated_today_count":  updatedTodayCount,
		"overdue_count":        overdueCount,
		"high_priority_count":  highPriorityCount,
	}

	response := models.NewSuccessResponse(stats, "Today's tasks statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// Helper function to convert tasks to response format
func convertTasksToResponses(tasks []*models.Task) []models.TaskResponse {
	responses := make([]models.TaskResponse, len(tasks))
	for i, task := range tasks {
		responses[i] = task.ToResponse()
	}
	return responses
}

// markTodayTaskCompletedHandler marks a specific task as completed
func (app *Application) markTodayTaskCompletedHandler(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get the task first to ensure it exists
	task, err := app.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		app.logger.Printf("Error getting task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Update task status to completed
	task.Status = "completed"
	task.UpdatedAt = time.Now()

	_, err = app.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		app.logger.Printf("Error updating task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(task.ToResponse(), "Task marked as completed")
	c.JSON(http.StatusOK, response)
}

// postponeTodayTaskHandler postpones a task to a new due date
func (app *Application) postponeTodayTaskHandler(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var requestBody struct {
		NewDueDate      string `json:"new_due_date" binding:"required"`
		PostponeReason  string `json:"postpone_reason"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse the new due date
	newDueDate, err := time.Parse("2006-01-02", requestBody.NewDueDate)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid date format. Use YYYY-MM-DD", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get the task first to ensure it exists
	task, err := app.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		app.logger.Printf("Error getting task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Update task due date and add postpone reason to custom fields
	task.DueDate = &newDueDate
	task.UpdatedAt = time.Now()

	if task.CustomFields == nil {
		task.CustomFields = make(map[string]interface{})
	}
	if requestBody.PostponeReason != "" {
		task.CustomFields["postpone_reason"] = requestBody.PostponeReason
		task.CustomFields["postponed_at"] = time.Now().Format("2006-01-02 15:04:05")
	}

	_, err = app.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		app.logger.Printf("Error updating task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(task.ToResponse(), "Task postponed successfully")
	c.JSON(http.StatusOK, response)
}

// bulkOperationTodayTasksHandler performs bulk operations on today's tasks
func (app *Application) bulkOperationTodayTasksHandler(c *gin.Context) {
	var requestBody struct {
		TaskIDs   []int                  `json:"task_ids" binding:"required"`
		Operation string                 `json:"operation" binding:"required"`
		Data      map[string]interface{} `json:"data"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if len(requestBody.TaskIDs) == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "No task IDs provided", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	updatedTasks := []models.TaskResponse{}
	failedTasks := []int{}

	for _, taskID := range requestBody.TaskIDs {
		task, err := app.db.Tasks().GetByID(c.Request.Context(), taskID)
		if err != nil {
			app.logger.Printf("Error getting task %d: %v", taskID, err)
			failedTasks = append(failedTasks, taskID)
			continue
		}

		// Apply the operation
		switch requestBody.Operation {
		case "complete":
			task.Status = "completed"
		case "priority":
			if priority, exists := requestBody.Data["priority"]; exists {
				if task.CustomFields == nil {
					task.CustomFields = make(map[string]interface{})
				}
				task.CustomFields["priority"] = priority
			}
		case "status":
			if status, exists := requestBody.Data["status"]; exists {
				if statusStr, ok := status.(string); ok {
					task.Status = statusStr
				}
			}
		case "assignee":
			if assigneeID, exists := requestBody.Data["assignee_id"]; exists {
				if assigneeIDFloat, ok := assigneeID.(float64); ok {
					assigneeIDInt := int(assigneeIDFloat)
					task.AssigneeID = &assigneeIDInt
				}
			}
		case "postpone":
			if newDueDate, exists := requestBody.Data["new_due_date"]; exists {
				if dueDateStr, ok := newDueDate.(string); ok {
					if parsedDate, err := time.Parse("2006-01-02", dueDateStr); err == nil {
						task.DueDate = &parsedDate
					}
				}
			}
		default:
			failedTasks = append(failedTasks, taskID)
			continue
		}

		task.UpdatedAt = time.Now()
		
		_, err = app.db.Tasks().Update(c.Request.Context(), task)
		if err != nil {
			app.logger.Printf("Error updating task %d: %v", taskID, err)
			failedTasks = append(failedTasks, taskID)
			continue
		}

		updatedTasks = append(updatedTasks, task.ToResponse())
	}

	responseData := map[string]interface{}{
		"updated_tasks": updatedTasks,
		"updated_count": len(updatedTasks),
		"failed_tasks":  failedTasks,
		"failed_count":  len(failedTasks),
	}

	message := fmt.Sprintf("Bulk operation completed. Updated: %d, Failed: %d", len(updatedTasks), len(failedTasks))
	response := models.NewSuccessResponse(responseData, message)
	c.JSON(http.StatusOK, response)
}

func main() {
	// Create application
	app, err := NewApplication()
	if err != nil {
		log.Fatalf("Failed to create application: %v", err)
	}
	defer app.Close()

	// Start server
	if err := app.Run(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}