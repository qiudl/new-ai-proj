package application

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/factories"
	"ai-project-backend/handlers"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	// ws "ai-project-backend/websocket"
	// "context" // Temporarily unused
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/go-redis/redis/v8"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Application holds the application dependencies
type Application struct {
	config     *config.Config
	db         database.DB
	logger     *log.Logger
	validator  *validator.Validate
	jwtManager *utils.JWTManager
	handlers   *factories.AllHandlers // Re-enabled
	// WebSocket components (temporarily disabled)
	// wsHub          *ws.Hub
	// wsHandler      *handlers.WebSocketHandler
	// progressPusher *services.ProgressPusher
	redisClient *redis.Client
	// Legacy individual handlers for compatibility
	authHandler           *handlers.AuthHandler           // Auth handler instance
	documentHandler       *handlers.DocumentHandler       // Document handler instance (legacy)
	routerDocumentHandler *handlers.RouterDocumentHandler // Router-based document handler
	userProfileHandler    *handlers.UserProfileHandler    // User profile handler instance
	companyHandler        *handlers.CompanyHandler        // Company handler instance
	enterpriseHandler     *handlers.EnterpriseHandler     // Enterprise handler instance
	projectHandler        *handlers.ProjectHandler        // Project handler instance
	taskHandler           *handlers.TaskHandler           // Task handler instance
	taskHierarchyHandler     *handlers.TaskHierarchyHandler     // Task hierarchy handler instance
	reportHandler            *handlers.ReportHandler            // Report handler instance
	testDataGeneratorService *services.TestDataGeneratorService // Test data generator service instance
	mirrorWritable           bool
}

// NewApplication creates a new application instance
func NewApplication() (*Application, error) {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %v", err)
	}

	// Log effective DB config in development for debugging
	if cfg.IsDevelopment() {
		log.Printf("Effective DB config: host=%s port=%s db=%s user=%s sslmode=%s",
			cfg.Database.Host, cfg.Database.Port, cfg.Database.Name, cfg.Database.User, cfg.Database.SSLMode,
		)
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

	// Initialize JWT token service
	jwtServiceConfig := &services.JWTServiceConfig{
		SecretKey:          cfg.JWT.Secret,
		RefreshSecretKey:   cfg.JWT.Secret + "_refresh", // Use a different key for refresh tokens
		AccessTokenExpiry:  cfg.JWT.Expiration,
		RefreshTokenExpiry: cfg.JWT.Expiration * 24, // Refresh token lasts longer
		MaxRefreshCount:    5,
		CleanupInterval:    time.Hour,
		EnableBlacklist:    true,
	}
	jwtTokenService := services.NewJWTTokenService(jwtServiceConfig, logger)

	// Initialize Auth Handler
	authHandler := handlers.NewAuthHandler(db, cfg.JWT.Secret, jwtTokenService)

	// Initialize User Profile Handler
	userProfileHandler := handlers.NewUserProfileHandler(db, logger, validate)

	// Initialize Company Handler
	companyHandler := handlers.NewCompanyHandler(db, logger, validate)

	// Initialize Enterprise Service and Handler
	auditService := services.NewAuditService(db)
	auditLogger := services.NewAsyncAuditLogger(auditService, 10, 30*time.Second)
	enterpriseService := services.NewEnterpriseService(db.Enterprises(), auditLogger)
	enterpriseHandler := handlers.NewEnterpriseHandler(enterpriseService, db, logger, validate)

	// Initialize Project Handler
	projectHandler := handlers.NewProjectHandler(db, logger, validate)

	// Initialize Task Handler
	taskHandler := handlers.NewTaskHandler(db, logger, validate)

	// Initialize Task Hierarchy Handler
	taskHierarchyHandler := handlers.NewTaskHierarchyHandler(db, logger, validate)

	// Initialize Document Handler
	documentHandler := handlers.NewDocumentHandler(db)

	// Initialize Report Handler
	reportHandler := handlers.NewReportHandler(db)
	
	// Initialize Test Data Generator Service
	var testDataGeneratorService *services.TestDataGeneratorService
	if sqlDB, ok := db.GetDB().(*sql.DB); ok {
		// Get repositories from the database interface
		taskRepo := db.Tasks()
		timerRepo := db.Timer()
		testDataGeneratorService = services.NewTestDataGeneratorService(sqlDB, taskRepo, timerRepo)
	}

	// Initialize Router Document Handler with DocumentRouter
	services.InitDocumentRouterFactory(db)
	documentRouterFactory := services.GetDocumentRouterFactory()
	documentRouter := documentRouterFactory.GetDefaultDocumentRouter()
	routerDocumentHandler := handlers.NewRouterDocumentHandler(documentRouter)

	// Initialize handlers using factory
	handlerFactory := factories.NewHandlerFactory(db, logger, validate, cfg)
	allHandlers, err := handlerFactory.CreateAllHandlers()
	if err != nil {
		return nil, fmt.Errorf("failed to create handlers: %v", err)
	}

	// Initialize Redis client (optional, for distributed systems)
	var redisClient *redis.Client
	if os.Getenv("REDIS_URL") != "" {
		opt, err := redis.ParseURL(os.Getenv("REDIS_URL"))
		if err == nil {
			redisClient = redis.NewClient(opt)
		} else {
			logger.Printf("Warning: Failed to parse Redis URL: %v", err)
		}
	}

	// Initialize WebSocket Hub (temporarily disabled)
	// wsHub := ws.NewHub(logger)
	// go wsHub.Run() // Start the hub in a goroutine

	// Initialize WebSocket Handler (temporarily disabled)
	// wsHandler := handlers.NewWebSocketHandler(wsHub, logger)

	// Initialize Progress Pusher (temporarily disabled)
	// progressPusher := services.NewProgressPusher(wsHub, redisClient, db, logger)

	// Start Redis subscriber if Redis is available
	// if redisClient != nil {
	// 	go progressPusher.StartRedisSubscriber(context.Background())
	// }

	app := &Application{
		config:     cfg,
		db:         db,
		logger:     logger,
		validator:  validate,
		jwtManager: jwtManager,
		handlers:   allHandlers, // Re-enabled
		// WebSocket components (temporarily disabled)
		// wsHub:          wsHub,
		// wsHandler:      wsHandler,
		// progressPusher: progressPusher,
		redisClient: redisClient,
		// Legacy individual handlers for compatibility
		authHandler:           authHandler,
		documentHandler:       documentHandler,
		routerDocumentHandler: routerDocumentHandler,
		userProfileHandler:    userProfileHandler,
		companyHandler:        companyHandler,
		enterpriseHandler:     enterpriseHandler,
		projectHandler:        projectHandler,
		taskHandler:              taskHandler,
		taskHierarchyHandler:     taskHierarchyHandler,
		reportHandler:            reportHandler,
		testDataGeneratorService: testDataGeneratorService,
	}

	// Perform startup permission/volume checks
	app.mirrorWritable = app.checkMirrorWritable()
	if cfg.App.MirrorEnabled && !app.mirrorWritable {
		logger.Printf("Warning: DOCS mirror is enabled but not writable at path: %s", cfg.App.MirrorBasePath)
	}

	// Initialize permission framework - temporarily disabled
	/*
		if err := app.initializePermissionFramework(); err != nil {
			logger.Printf("Warning: Permission framework initialization failed: %v", err)
			// In production, we should fail here
			if cfg.IsProduction() {
				return nil, fmt.Errorf("permission framework is required in production: %v", err)
			}
		}
	*/

	// Initialize Timer Cleanup Service
	if sqlDB, ok := db.GetDB().(*sql.DB); ok {
		timerCleanupService := services.NewTimerCleanupService(sqlDB, logger)
		// Start automatic cleanup (1 hour max, check every 5 minutes)
		config := timerCleanupService.GetDefaultConfig()
		config.MaxRunDurationHours = 1   // Auto-pause timers after 1 hour
		config.CheckIntervalMinutes = 5  // Check every 5 minutes
		config.PauseInsteadOfStop = true // Pause instead of stop
		timerCleanupService.StartAutomaticCleanup(config)
		logger.Printf("Timer cleanup service started: max duration=%dh, check interval=%dm",
			config.MaxRunDurationHours, config.CheckIntervalMinutes)
	}

	return app, nil
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
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	log.Println("Database connected successfully")
	return db, nil
}

// Run starts the HTTP server
func (app *Application) Run() error {
	router := gin.Default()

	// Setup routes
	if err := app.setupRoutes(router); err != nil {
		return fmt.Errorf("failed to setup routes: %v", err)
	}

	port := "8080" // Default port
	if app.config.Server.Port != "" {
		port = app.config.Server.Port
	}
	app.logger.Printf("Server starting on port %s", port)

	return http.ListenAndServe(":"+port, router)
}

// Close closes database connections and permission framework
func (app *Application) Close() error {
	var err error

	// Close permission framework - temporarily disabled
	/*
		if frameworkErr := app.closePermissionFramework(); frameworkErr != nil {
			app.logger.Printf("Error closing permission framework: %v", frameworkErr)
			err = frameworkErr
		}
	*/

	// Close database
	if app.db != nil {
		if dbErr := app.db.Close(); dbErr != nil {
			app.logger.Printf("Error closing database: %v", dbErr)
			if err == nil {
				err = dbErr
			}
		}
	}

	return err
}

// GetConfig returns the application config
func (app *Application) GetConfig() *config.Config {
	return app.config
}

// GetDB returns the database instance
func (app *Application) GetDB() database.DB {
	return app.db
}

// GetJWTManager returns the JWT manager
func (app *Application) GetJWTManager() *utils.JWTManager {
	return app.jwtManager
}

// GetAuthHandler returns the auth handler
func (app *Application) GetAuthHandler() *handlers.AuthHandler {
	return app.authHandler
}

// GetUserProfileHandler returns the user profile handler
func (app *Application) GetUserProfileHandler() *handlers.UserProfileHandler {
	return app.userProfileHandler
}

// GetUserManagementHandler returns the user management handler
func (app *Application) GetUserManagementHandler() *handlers.UserManagementHandler {
	// Initialize UserManagementRepository and UserManagementHandler
	userRepo := database.NewUserManagementRepository(app.db.(*database.PostgresDB).DB())
	return handlers.NewUserManagementHandler(userRepo)
}

// GetCompanyHandler returns the company handler
func (app *Application) GetCompanyHandler() *handlers.CompanyHandler {
	return app.companyHandler
}

// GetEnterpriseHandler returns the enterprise handler
func (app *Application) GetEnterpriseHandler() *handlers.EnterpriseHandler {
	return app.enterpriseHandler
}

// GetOrganizationHandler returns the organization handler
func (app *Application) GetOrganizationHandler() *handlers.OrganizationHandler {
	return handlers.NewOrganizationHandler(app.db)
}

// GetDocumentHandler returns the document handler
func (app *Application) GetDocumentHandler() *handlers.DocumentHandler {
	return app.documentHandler
}

// GetWorkNoteHandler returns the work note handler
func (app *Application) GetWorkNoteHandler() *handlers.WorkNoteHandler {
	// Use the adapter to connect complete WorkNoteService with database.DB interface
	workNoteService := services.NewWorkNoteServiceAdapter(app.db)

	return handlers.NewWorkNoteHandler(workNoteService, app.jwtManager, app.db)
}

// GetReportHandler returns the report handler
func (app *Application) GetReportHandler() *handlers.ReportHandler {
	return app.reportHandler
}

// GetHybridDocumentFolderHandler returns the document folder handler
func (app *Application) GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler {
	// Debug: Log the actual type of the database
	dbInstance := app.db.GetDB()
	app.logger.Printf("DEBUG: DB type is %T", dbInstance)

	// Try to obtain a *gorm.DB from the underlying DB for folder features
	if gdb, ok := dbInstance.(*gorm.DB); ok && gdb != nil {
		app.logger.Printf("DEBUG: Found *gorm.DB, creating handler")
		return handlers.NewHybridDocumentFolderHandler(gdb)
	}

	// If we have a *sql.DB, create a GORM instance from it
	if sqlDB, ok := dbInstance.(*sql.DB); ok && sqlDB != nil {
		app.logger.Printf("DEBUG: Found *sql.DB, creating GORM instance")
		gormDB, err := gorm.Open(postgres.New(postgres.Config{
			Conn: sqlDB,
		}), &gorm.Config{})

		if err != nil {
			app.logger.Printf("Failed to create GORM instance from sql.DB: %v", err)
			return nil
		}

		app.logger.Printf("DEBUG: Successfully created GORM instance from *sql.DB")
		return handlers.NewHybridDocumentFolderHandler(gormDB)
	}

	app.logger.Printf("DocumentFolderHandler unavailable: underlying DB is not *gorm.DB or *sql.DB (got %T); skipping folder APIs", dbInstance)
	return nil
}

// GetHybridDocumentHandler returns the hybrid document handler (for legacy compatibility)
func (app *Application) GetHybridDocumentHandler() *handlers.HybridDocumentHandler {
	// Return the same instance as DocumentHandler since DocumentHandler is an alias
	return app.documentHandler
}

// GetSimpleDocumentHandler returns a simple document handler (for backward compatibility)
func (app *Application) GetSimpleDocumentHandler() *handlers.HybridDocumentHandler {
	// Use the same DocumentHandler for simplicity
	return app.documentHandler
}

// GetDocumentVersionHandler returns the document version handler
func (app *Application) GetDocumentVersionHandler() *handlers.DocumentVersionHandler {
	// Get underlying *gorm.DB from the database interface
	dbInstance := app.db.GetDB()
	app.logger.Printf("DEBUG: Database instance type: %T", dbInstance)
	
	gormDB, ok := dbInstance.(*gorm.DB)
	if !ok {
		// If not GORM, try to create one from *sql.DB
		if sqlDB, ok := dbInstance.(*sql.DB); ok {
			app.logger.Printf("DEBUG: Converting *sql.DB to *gorm.DB")
			var err error
			gormDB, err = gorm.Open(postgres.New(postgres.Config{
				Conn: sqlDB,
			}), &gorm.Config{})
			if err != nil {
				app.logger.Printf("ERROR: Failed to create GORM instance from sql.DB: %v", err)
				return nil
			}
		} else {
			app.logger.Printf("ERROR: DocumentVersionHandler requires *gorm.DB or *sql.DB but got %T", dbInstance)
			return nil
		}
	}

	app.logger.Printf("DEBUG: Successfully obtained GORM DB instance")

	// Create storage adapter (using local storage for now)
	storageBasePath := "/tmp/document_versions" // TODO: make this configurable
	storageAdapter := services.NewLocalStorageAdapter(storageBasePath, "")
	app.logger.Printf("DEBUG: Created storage adapter with path: %s", storageBasePath)

	// Create document service
	documentService := services.NewDocumentService(gormDB, storageBasePath)
	if documentService == nil {
		app.logger.Printf("ERROR: Failed to create DocumentService")
		return nil
	}
	app.logger.Printf("DEBUG: Created document service")

	// Create DocumentVersionService with all required dependencies
	versionService := services.NewDocumentVersionService(gormDB, storageAdapter, documentService)
	if versionService == nil {
		app.logger.Printf("ERROR: Failed to create DocumentVersionService")
		return nil
	}
	app.logger.Printf("DEBUG: Created document version service")

	handler := handlers.NewDocumentVersionHandler(versionService)
	if handler == nil {
		app.logger.Printf("ERROR: Failed to create DocumentVersionHandler")
		return nil
	}
	app.logger.Printf("DEBUG: Successfully created DocumentVersionHandler")
	return handler
}


// GetWorkNoteFolderHandler returns the work note folder handler
func (app *Application) GetWorkNoteFolderHandler() *handlers.WorkNoteFolderHandler {
	if app.handlers != nil && app.handlers.WorkNoteFolderHandler != nil {
		return app.handlers.WorkNoteFolderHandler
	}
	// Fallback: create a new instance
	return handlers.NewWorkNoteFolderHandler(app.db)
}

// GetCollaborationHandler returns the collaboration handler
func (app *Application) GetCollaborationHandler() *handlers.DocumentCollaborationHandler {
	// TODO: Initialize collaboration service properly
	return handlers.NewDocumentCollaborationHandler(nil)
}

// GetTaskDocumentFileHandler returns the task document file handler
func (app *Application) GetTaskDocumentFileHandler() *handlers.TaskDocumentFileHandler {
	if app.handlers != nil && app.handlers.TaskDocumentFileHandler != nil {
		return app.handlers.TaskDocumentFileHandler
	}
	return nil
}

// GetTaskDocumentHandler returns the task document handler with upload support
func (app *Application) GetTaskDocumentHandler() *handlers.TaskDocumentHandler {
	if app.handlers != nil && app.handlers.TaskDocumentHandler != nil {
		return app.handlers.TaskDocumentHandler
	}
	return nil
}

// GetDocumentProjectsHandler returns the document projects handler
func (app *Application) GetDocumentProjectsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"success": true,
			"data":    []string{"Project1", "Project2"}, // TODO: Implement actual logic
		})
	}
}

// GetDocumentCustomersHandler returns the document customers handler
func (app *Application) GetDocumentCustomersHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"success": true,
			"data":    []string{"Customer1", "Customer2"}, // TODO: Implement actual logic
		})
	}
}

// GetDocumentCategoriesHandler returns the document categories handler
func (app *Application) GetDocumentCategoriesHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"success": true,
			"data":    []string{"Documentation", "Reports", "Templates"}, // TODO: Implement actual logic
		})
	}
}

// GetTaskHierarchyHandler returns the task hierarchy handler
func (app *Application) GetTaskHierarchyHandler() *handlers.TaskHierarchyHandler {
	return app.taskHierarchyHandler
}

// GetDailyFocusTaskHandler returns the daily focus task handler
func (app *Application) GetDailyFocusTaskHandler() *handlers.DailyFocusTaskHandler {
	if app.handlers != nil && app.handlers.DailyFocusTaskHandler != nil {
		return app.handlers.DailyFocusTaskHandler
	}
	return nil // 需要通过工厂创建
}

// GetTimelineHandler returns the timeline handler
func (app *Application) GetTimelineHandler() *handlers.TimelineHandler {
	if app.handlers != nil && app.handlers.TimelineHandler != nil {
		return app.handlers.TimelineHandler
	}
	// Fallback: create handler on-demand
	return handlers.NewTimelineHandler(app.db, app.logger, app.validator)
}

// checkMirrorWritable verifies if the optional mirror base path is writable
func (app *Application) checkMirrorWritable() bool {
	cfg := app.config
	if !cfg.App.MirrorEnabled || cfg.App.MirrorBasePath == "" {
		return false
	}
	// Try to create the base directory and a temp file
	if err := os.MkdirAll(cfg.App.MirrorBasePath, 0o755); err != nil {
		app.logger.Printf("Mirror path mkdir failed: %v", err)
		return false
	}
	tmpFile := filepath.Join(cfg.App.MirrorBasePath, ".health_write_test")
	data := []byte(time.Now().UTC().Format(time.RFC3339))
	if err := os.WriteFile(tmpFile, data, 0o644); err != nil {
		app.logger.Printf("Mirror path write test failed: %v", err)
		return false
	}
	_ = os.Remove(tmpFile)
	return true
}

// GetPermissionHandler returns the permission handler
func (app *Application) GetPermissionHandler() *handlers.PermissionHandler {
	if app.handlers != nil && app.handlers.PermissionHandler != nil {
		return app.handlers.PermissionHandler
	}
	return nil // 需要通过工厂创建
}

// GetEnhancedPermissionHandler returns the enhanced permission handler
func (app *Application) GetEnhancedPermissionHandler() *handlers.EnhancedPermissionHandler {
	// EnhancedPermissionHandler may not be created by factory yet
	return nil
}

// GetRoleTemplateHandler returns the role template handler
func (app *Application) GetRoleTemplateHandler() *handlers.RoleTemplateHandler {
	if app.handlers != nil && app.handlers.RoleTemplateHandler != nil {
		return app.handlers.RoleTemplateHandler
	}
	return nil
}

// GetUnifiedPermissionHandler returns the unified permission handler
func (app *Application) GetUnifiedPermissionHandler() *handlers.UnifiedPermissionHandler {
	if app.handlers != nil && app.handlers.UnifiedPermissionHandler != nil {
		return app.handlers.UnifiedPermissionHandler
	}
	return nil // 需要通过工厂创建
}

// GetRoleManagementHandler returns the role management handler
func (app *Application) GetRoleManagementHandler() *handlers.RoleManagementHandler {
	if app.handlers != nil && app.handlers.RoleManagementHandler != nil {
		return app.handlers.RoleManagementHandler
	}
	return nil // 需要通过工厂创建
}

// GetUnifiedTimerHandler returns the unified timer handler
func (app *Application) GetUnifiedTimerHandler() *handlers.UnifiedTimerHandler {
	if app.handlers != nil && app.handlers.UnifiedTimerHandler != nil {
		return app.handlers.UnifiedTimerHandler
	}
	return nil // 需要通过工厂创建
}

// GetUserTimerHandler returns the user timer handler
func (app *Application) GetUserTimerHandler() *handlers.UserTimerHandler {
	if app.handlers != nil && app.handlers.UserTimerHandler != nil {
		return app.handlers.UserTimerHandler
	}
	return nil // 需要通过工厂创建
}

// GetArchiveHandler returns the archive handler
func (app *Application) GetArchiveHandler() *handlers.ArchiveHandler {
	if app.handlers != nil && app.handlers.ArchiveHandler != nil {
		return app.handlers.ArchiveHandler
	}
	return nil // 需要通过工厂创建
}

// GetCalendarSyncHandler returns the calendar sync handler
func (app *Application) GetCalendarSyncHandler() *handlers.CalendarSyncHandler {
	if app.handlers != nil && app.handlers.CalendarSyncHandler != nil {
		return app.handlers.CalendarSyncHandler
	}
	return nil // 需要通过工厂创建
}

// GetAIConfigHandler returns the AI config handler
func (app *Application) GetAIConfigHandler() *handlers.AIConfigHandler {
	if app.handlers != nil && app.handlers.AIConfigHandler != nil {
		return app.handlers.AIConfigHandler
	}
	return nil // 需要通过工厂创建
}

// GetWebSocketHandler returns the WebSocket handler - COMPLETELY DISABLED
// func (app *Application) GetWebSocketHandler() gin.HandlerFunc {
// 	// Temporarily disabled WebSocket functionality
// 	return func(c *gin.Context) {
// 		c.JSON(503, gin.H{"error": "WebSocket service temporarily unavailable"})
// 	}
// }

// GetTestDataGeneratorService returns the test data generator service
func (app *Application) GetTestDataGeneratorService() interface{} {
	return app.testDataGeneratorService
}

// GetProgressPusher returns the progress pusher service
// Temporarily disabled due to missing service
/*
func (app *Application) GetProgressPusher() *services.ProgressPusher {
	// return app.progressPusher
	return nil // Temporarily disabled
}
*/
