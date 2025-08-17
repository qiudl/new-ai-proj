package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/factories"
	"ai-project-backend/handlers"
	"ai-project-backend/models"
	"ai-project-backend/routes"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
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
	authHandler         *handlers.AuthHandler
	customerHandler     *handlers.CustomerHandler
	companyHandler      *handlers.CompanyHandler
	projectHandler      *handlers.ProjectHandler
	permissionHandler   *handlers.PermissionHandler
	taskHandler         *handlers.TaskHandler
	taskHierarchyHandler *handlers.TaskHierarchyHandler
	userManagementHandler *handlers.UserManagementHandler
	userProfileHandler  *handlers.UserProfileHandler
	aiConfigPlaceholderHandler *handlers.AIConfigPlaceholderHandler
	utilityHandler      *handlers.UtilityHandler
	companyUserHandler  *handlers.CompanyUserHandler
	// 文档管理处理器 (混合版本，直接SQL)
	hybridDocumentHandler       *handlers.HybridDocumentHandler
	hybridDocumentFolderHandler *handlers.HybridDocumentFolderHandler
	simpleDocumentHandler       *handlers.SimpleDocumentHandler
	// documentRelationHandler *handlers.DocumentRelationHandler // 临时注释，避免编译错误
	// documentVersionHandler *handlers.DocumentVersionHandler // 临时注释，避免编译错误
	// documentVersionLabelHandler *handlers.DocumentVersionLabelHandler // 临时注释，避免编译错误
	// documentVersionCommentHandler *handlers.DocumentVersionCommentHandler // 临时注释，避免编译错误
	timerHandler               *handlers.TimerHandler
	userTimerHandler           *handlers.UserTimerHandler
	unifiedTimerHandler        *handlers.UnifiedTimerHandler
	archiveHandler             *handlers.ArchiveHandler
	recycleBinHandler          *handlers.RecycleBinHandler
	auditEnhancedHandler       *handlers.AuditEnhancedHandler
	taskUpdateHandler          *handlers.TaskUpdateHandler
	todayTasksHandler          *handlers.TodayTasksHandler
	documentUtilityHandler     *handlers.DocumentUtilityHandler
	// taskDocumentHandler        *handlers.TaskDocumentHandler // Temporarily disabled due to model conflicts
	taskDocumentFileHandler    *handlers.TaskDocumentFileHandler
	unifiedDocumentHandler     *handlers.UnifiedDocumentHandler  // 新的统一文档处理器
	googleAuthHandler          *handlers.GoogleAuthHandler       // Google认证处理器
	calendarSyncHandler        *handlers.CalendarSyncHandler     // 日历同步处理器
	// 归档的复杂处理器 - MVP版本不需要
	// unifiedTaskDocumentHandler *handlers.UnifiedTaskDocumentHandler
	// upgradedTaskDocumentHandler *handlers.UpgradedTaskDocumentHandler
	smartTemplateHandler       *handlers.SmartTemplateHandler
	collaborationHandler       *handlers.DocumentCollaborationHandler
	statisticsHandler          *handlers.StatisticsHandlers
	auditHandler               *handlers.AuditHandler
	aiConfigHandler            *handlers.AIConfigHandler
	aiTaskGeneratorHandler     *handlers.AITaskGeneratorHandler
	dashboardHandler           *handlers.DashboardHandler
	taskAnalysisHandler        *handlers.TaskAnalysisHandler
	apiKeyHandler              *handlers.APIKeyHandler
	// documentRegistryHandler    *handlers.DocumentRegistryHandler // Disabled - conflicting models
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

	// Initialize middleware
	// TODO: Fix middleware interface issues
	// authConfig := &middleware.AuthConfig{...}
	// authMiddleware := middleware.NewAuthMiddleware(authConfig)
	// permissionMiddleware := middleware.NewPermissionMiddleware(db.Permissions())

	// Initialize handlers using factory
	handlerFactory := factories.NewHandlerFactory(db, logger, validate, cfg)
	allHandlers, err := handlerFactory.CreateAllHandlers()
	if err != nil {
		return nil, fmt.Errorf("failed to create handlers: %v", err)
	}

	return &Application{
		config:              cfg,
		db:                  db,
		logger:              logger,
		validator:           validate,
		jwtManager:          jwtManager,
		authHandler:         allHandlers.AuthHandler,
		customerHandler:     allHandlers.CustomerHandler,
		companyHandler:      allHandlers.CompanyHandler,
		projectHandler:      allHandlers.ProjectHandler,
		permissionHandler:   allHandlers.PermissionHandler,
		taskHandler:         allHandlers.TaskHandler,
		taskHierarchyHandler: allHandlers.TaskHierarchyHandler,
		userManagementHandler: allHandlers.UserManagementHandler,
		userProfileHandler:  allHandlers.UserProfileHandler,
		aiConfigPlaceholderHandler: allHandlers.AIConfigPlaceholderHandler,
		utilityHandler:      allHandlers.UtilityHandler,
		companyUserHandler:  allHandlers.CompanyUserHandler,
		// 混合版文档管理处理器 (直接SQL)
		hybridDocumentHandler:       allHandlers.HybridDocumentHandler,
		hybridDocumentFolderHandler: allHandlers.HybridDocumentFolderHandler,
		simpleDocumentHandler:       allHandlers.SimpleDocumentHandler,
		timerHandler:                allHandlers.TimerHandler,
		userTimerHandler:            allHandlers.UserTimerHandler,
		unifiedTimerHandler:         allHandlers.UnifiedTimerHandler,
		archiveHandler:              allHandlers.ArchiveHandler,
		recycleBinHandler:           allHandlers.RecycleBinHandler,
		auditEnhancedHandler:        allHandlers.AuditEnhancedHandler,
		taskUpdateHandler:           allHandlers.TaskUpdateHandler,
		todayTasksHandler:           allHandlers.TodayTasksHandler,
		documentUtilityHandler:      allHandlers.DocumentUtilityHandler,
		taskDocumentFileHandler:     allHandlers.TaskDocumentFileHandler,
		unifiedDocumentHandler:      allHandlers.UnifiedDocumentHandler,
		smartTemplateHandler:        allHandlers.SmartTemplateHandler,
		collaborationHandler:        allHandlers.CollaborationHandler,
		statisticsHandler:           allHandlers.StatisticsHandler,
		auditHandler:                allHandlers.AuditHandler,
		aiConfigHandler:             allHandlers.AIConfigHandler,
		aiTaskGeneratorHandler:      allHandlers.AITaskGeneratorHandler,
		dashboardHandler:            allHandlers.DashboardHandler,
		taskAnalysisHandler:         allHandlers.TaskAnalysisHandler,
		apiKeyHandler:               allHandlers.APIKeyHandler,
		googleAuthHandler:           allHandlers.GoogleAuthHandler,
		calendarSyncHandler:         allHandlers.CalendarSyncHandler,
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



// Exported getters to align with routes.ApplicationInterface
func (app *Application) GetHealthHandler() gin.HandlerFunc { return app.healthHandler }
func (app *Application) GetVersionHandler() gin.HandlerFunc { return app.versionHandler }
func (app *Application) GetLoginHandler() gin.HandlerFunc { return app.authHandler.Login }
func (app *Application) GetLogoutHandler() gin.HandlerFunc { return app.authHandler.Logout }
func (app *Application) GetAllTasksHandler() gin.HandlerFunc { return app.taskHandler.GetAllTasks }
func (app *Application) GetTasksHandler() gin.HandlerFunc { return app.taskHandler.GetTasks }
func (app *Application) GetTaskHandler() gin.HandlerFunc { return app.taskHandler.GetTask }
func (app *Application) CreateTaskHandler() gin.HandlerFunc { return app.taskHandler.CreateTask }
func (app *Application) UpdateTaskHandler() gin.HandlerFunc { return app.taskHandler.UpdateTask }
func (app *Application) DeleteTaskHandler() gin.HandlerFunc { return app.taskHandler.DeleteTask }
func (app *Application) BulkDeleteTasksHandler() gin.HandlerFunc { return app.bulkDeleteTasksHandler() }
func (app *Application) BatchValidateTasksPreviewHandler() gin.HandlerFunc { return app.batchValidateTasksPreviewHandler() }
func (app *Application) GetTaskTreeHandler() gin.HandlerFunc { return app.taskHierarchyHandler.GetTaskTree }
func (app *Application) GetRootTasksHandler() gin.HandlerFunc { return app.taskHierarchyHandler.GetRootTasks }
func (app *Application) SearchParentTasksHandler() gin.HandlerFunc { return app.taskHierarchyHandler.SearchParentTasks }
func (app *Application) BulkImportTasksHandler() gin.HandlerFunc { return app.bulkImportTasksHandler }
func (app *Application) GetTaskChildrenHandler() gin.HandlerFunc { return app.taskHierarchyHandler.GetTaskChildren }
func (app *Application) GetProjectsHandler() gin.HandlerFunc { return app.projectHandler.GetProjects }
func (app *Application) CreateProjectHandler() gin.HandlerFunc { return app.projectHandler.CreateProject }
func (app *Application) GetProjectHandler() gin.HandlerFunc { return app.projectHandler.GetProject }
func (app *Application) UpdateProjectHandler() gin.HandlerFunc { return app.projectHandler.UpdateProject }
func (app *Application) DeleteProjectHandler() gin.HandlerFunc { return app.projectHandler.DeleteProject }
func (app *Application) GetProjectStatsHandler() gin.HandlerFunc { return app.projectHandler.GetProjectStats }
func (app *Application) FileDownloadHandler() gin.HandlerFunc { return app.fileDownloadHandler }
func (app *Application) GetDocumentProjectsHandler() gin.HandlerFunc { return app.projectHandler.GetDocumentProjects }
func (app *Application) MapUserToCompanyUser() gin.HandlerFunc { return app.mapUserToCompanyUser() }
func (app *Application) ValidateParentHandler() gin.HandlerFunc { return app.validateParentHandler }
// Recycle bin handlers
func (app *Application) GetRecycledTasksHandler() gin.HandlerFunc { return app.recycleBinHandler.GetRecycledTasks }
func (app *Application) RestoreTaskHandler() gin.HandlerFunc { return app.recycleBinHandler.RestoreTask }
func (app *Application) HardDeleteTaskHandler() gin.HandlerFunc { return app.recycleBinHandler.HardDeleteTask }
func (app *Application) EmptyRecycleBinHandler() gin.HandlerFunc { return app.recycleBinHandler.EmptyRecycleBin }
// Audit handlers
func (app *Application) GetAuditLogsHandler() gin.HandlerFunc { return app.auditEnhancedHandler.GetAuditLogs }
func (app *Application) GetAuditLogHandler() gin.HandlerFunc { return app.auditEnhancedHandler.GetAuditLog }
func (app *Application) GetAuditStatsHandler() gin.HandlerFunc { return app.auditEnhancedHandler.GetAuditStats }
// Task update handlers
func (app *Application) GetTaskUpdatesHandler() gin.HandlerFunc { return app.taskUpdateHandler.GetTaskUpdates }
func (app *Application) UpdateTaskUpdateHandler() gin.HandlerFunc { return app.taskUpdateHandler.UpdateTaskUpdate }
func (app *Application) DeleteTaskUpdateHandler() gin.HandlerFunc { return app.taskUpdateHandler.DeleteTaskUpdate }
func (app *Application) GetTaskTimelineHandler() gin.HandlerFunc { return app.taskUpdateHandler.GetTaskTimeline }
// Today tasks handlers
func (app *Application) GetTodayTasksHandler() gin.HandlerFunc { return app.todayTasksHandler.GetTodayTasks }
func (app *Application) GetTodayTasksStatsHandler() gin.HandlerFunc { return app.todayTasksHandler.GetTodayTasksStats }
func (app *Application) MarkTodayTaskCompletedHandler() gin.HandlerFunc { return app.todayTasksHandler.MarkTodayTaskCompleted }
func (app *Application) PostponeTodayTaskHandler() gin.HandlerFunc { return app.todayTasksHandler.PostponeTodayTask }
func (app *Application) BulkOperationTodayTasksHandler() gin.HandlerFunc { return app.todayTasksHandler.BulkOperationTodayTasks }
// Document utility handlers
func (app *Application) GetDocumentCustomersHandler() gin.HandlerFunc { return app.documentUtilityHandler.GetDocumentCustomers }
func (app *Application) GetDocumentCategoriesHandler() gin.HandlerFunc { return app.documentUtilityHandler.GetDocumentCategories }
// Dev login helpers (development only)
func (app *Application) GetDevAccountsHandler() gin.HandlerFunc { return app.authHandler.GetDevAccounts }
func (app *Application) DevQuickLoginHandler() gin.HandlerFunc { return app.authHandler.DevQuickLogin }


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

// Handler getter methods for ApplicationInterface
func (app *Application) GetAIConfigHandler() *handlers.AIConfigHandler {
	return app.aiConfigHandler
}

func (app *Application) GetAITaskGeneratorHandler() *handlers.AITaskGeneratorHandler {
	return app.aiTaskGeneratorHandler
}

func (app *Application) GetDashboardHandler() *handlers.DashboardHandler {
	return app.dashboardHandler
}

func (app *Application) GetTaskAnalysisHandler() *handlers.TaskAnalysisHandler {
	return app.taskAnalysisHandler
}

func (app *Application) GetAPIKeyHandler() *handlers.APIKeyHandler {
	return app.apiKeyHandler
}

// ApplicationInterface basic getter methods
func (app *Application) GetConfig() *config.Config {
	return app.config
}

func (app *Application) GetDB() database.DB {
	return app.db
}

func (app *Application) GetJWTManager() *utils.JWTManager {
	return app.jwtManager
}

func (app *Application) GetStatisticsHandler() *handlers.StatisticsHandlers {
	return app.statisticsHandler
}

func (app *Application) GetAuditHandler() *handlers.AuditHandler {
	return app.auditHandler
}

func (app *Application) GetSmartTemplateHandler() *handlers.SmartTemplateHandler {
	return app.smartTemplateHandler
}

func (app *Application) GetCollaborationHandler() *handlers.DocumentCollaborationHandler {
	return app.collaborationHandler
}

func (app *Application) GetArchiveHandler() *handlers.ArchiveHandler {
	return app.archiveHandler
}

// 各模块处理器 getter methods
func (app *Application) GetCustomerHandler() *handlers.CustomerHandler {
	return app.customerHandler
}

func (app *Application) GetCompanyHandler() *handlers.CompanyHandler {
	return app.companyHandler
}

func (app *Application) GetPermissionHandler() *handlers.PermissionHandler {
	return app.permissionHandler
}

func (app *Application) GetUserManagementHandler() *handlers.UserManagementHandler {
	return app.userManagementHandler
}

func (app *Application) GetUserProfileHandlerInstance() *handlers.UserProfileHandler {
	return app.userProfileHandler
}

func (app *Application) GetAIConfigPlaceholderHandler() *handlers.AIConfigPlaceholderHandler {
	return app.aiConfigPlaceholderHandler
}

func (app *Application) GetUtilityHandler() *handlers.UtilityHandler {
	return app.utilityHandler
}

func (app *Application) GetCompanyUserHandler() *handlers.CompanyUserHandler {
	return app.companyUserHandler
}

// 文档管理处理器 getter methods
func (app *Application) GetHybridDocumentHandler() *handlers.HybridDocumentHandler {
	return app.hybridDocumentHandler
}

func (app *Application) GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler {
	return app.hybridDocumentFolderHandler
}

func (app *Application) GetSimpleDocumentHandler() *handlers.SimpleDocumentHandler {
	return app.simpleDocumentHandler
}

func (app *Application) GetUnifiedDocumentHandler() *handlers.UnifiedDocumentHandler {
	return app.unifiedDocumentHandler
}

// 计时器处理器 getter methods
func (app *Application) GetTimerHandler() *handlers.TimerHandler {
	return app.timerHandler
}

func (app *Application) GetUserTimerHandler() *handlers.UserTimerHandler {
	return app.userTimerHandler
}

func (app *Application) GetUnifiedTimerHandler() *handlers.UnifiedTimerHandler {
	return app.unifiedTimerHandler
}

// 其他处理器 getter methods
func (app *Application) GetTaskDocumentFileHandler() *handlers.TaskDocumentFileHandler {
	return app.taskDocumentFileHandler
}

func (app *Application) GetGoogleAuthHandler() *handlers.GoogleAuthHandler {
	return app.googleAuthHandler
}

func (app *Application) GetCalendarSyncHandler() *handlers.CalendarSyncHandler {
	return app.calendarSyncHandler
}


// Recycle bin handler methods
func (app *Application) GetRecycledProjectsHandler() gin.HandlerFunc {
	return app.projectHandler.GetRecycledProjects
}


func (app *Application) GetRecycledDocumentsHandler() gin.HandlerFunc {
	// TODO: Implement getRecycledDocumentsHandler method
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "getRecycledDocumentsHandler not implemented"})
	}
}

func (app *Application) RestoreProjectHandler() gin.HandlerFunc {
	return app.projectHandler.RestoreProject
}


func (app *Application) RestoreDocumentHandler() gin.HandlerFunc {
	// TODO: Implement restoreDocumentHandler method
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "restoreDocumentHandler not implemented"})
	}
}

// Development-only: return preset dev accounts to show on login page

// Development-only quick login: use existing user to issue JWT (no DB writes)









// Project User Management Handlers







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
		// Check if it's a duplicate title error
		if strings.Contains(err.Error(), "已存在") {
			response := models.NewErrorResponse(models.ErrCodeConflict, err.Error(), nil)
			c.JSON(http.StatusConflict, response)
			return
		}
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




func (app *Application) BatchUpdateTasksHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.BatchUpdateTasksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if len(req.TaskIDs) == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "At least one task ID is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate that at least one of Status or ParentID is provided
	if req.Status == nil && req.ParentID == nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "At least one of 'status' or 'parent_id' must be provided", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate status value if provided
	if req.Status != nil {
		validStatuses := map[string]bool{
			"todo":        true,
			"in_progress": true,
			"completed":   true,
			"cancelled":   true,
		}
		if !validStatuses[*req.Status] {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, 
				"Invalid status. Must be one of: todo, in_progress, completed, cancelled", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
	}

	// *** ADDED: TaskValidationService integration for parent task updates ***
	if req.ParentID != nil {
		// Create TaskValidationService instance
		validationService := services.NewTaskValidationService(app.db.GetDB().(*sql.DB))
		
		// Handle parent ID of 0 (root task) vs actual parent ID
		parentIDForValidation := 0
		if *req.ParentID != 0 {
			parentIDForValidation = *req.ParentID
		}
		
		// Perform comprehensive hierarchy validation
		if err := validationService.ValidateCompleteHierarchy(req.TaskIDs, parentIDForValidation, projectID); err != nil {
			app.logger.Printf("Batch parent update validation failed: %v", err)
			
			// Check if it's a ValidationError with specific error details
			var validationErr services.ValidationError
			if errors.As(err, &validationErr) {
				response := models.NewErrorResponse(models.ErrCodeBadRequest, validationErr.Message, map[string]interface{}{
					"task_id": validationErr.TaskID,
					"code":    validationErr.Code,
				})
				c.JSON(http.StatusBadRequest, response)
				return
			}
			
			// General validation error
			response := models.NewErrorResponse(models.ErrCodeBadRequest, 
				fmt.Sprintf("批量父任务更新验证失败: %v", err), nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		
		app.logger.Printf("Batch parent update validation passed for %d tasks", len(req.TaskIDs))
	}

	// Perform batch update with transaction
	ctx := c.Request.Context()
	updatedCount := 0
	var failedTasks []models.BatchTaskError

	// Start transaction for atomic operation
	tx, err := app.db.BeginTx(ctx)
	if err != nil {
		app.logger.Printf("Error starting transaction: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to start batch update", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	defer tx.Rollback()

	for _, taskID := range req.TaskIDs {
		// Verify task exists and belongs to the project
		existingTask, err := app.db.Tasks().GetByID(ctx, taskID)
		if err != nil {
			failedTasks = append(failedTasks, models.BatchTaskError{
				TaskID: taskID,
				Error:  "Task not found",
			})
			continue
		}

		if existingTask.ProjectID != projectID {
			failedTasks = append(failedTasks, models.BatchTaskError{
				TaskID: taskID,
				Error:  "Task does not belong to this project",
			})
			continue
		}

		// Check if any update is needed
		needsUpdate := false
		
		// Update status if provided and different
		if req.Status != nil && existingTask.Status != *req.Status {
			existingTask.Status = *req.Status
			needsUpdate = true
		}
		
		// Update parent_id if provided and different
		if req.ParentID != nil {
			// Handle case where ParentID is 0 (meaning remove parent, set to nil)
			if *req.ParentID == 0 {
				if existingTask.ParentID != nil {
					existingTask.ParentID = nil
					needsUpdate = true
				}
			} else {
				// Set new parent ID
				if existingTask.ParentID == nil || *existingTask.ParentID != *req.ParentID {
					existingTask.ParentID = req.ParentID
					needsUpdate = true
				}
			}
		}
		
		// Skip if no updates needed
		if !needsUpdate {
			continue
		}

		// Ensure Title field is not empty before update (防止批量更新时title验证错误)
		if existingTask.Title == "" {
			app.logger.Printf("Warning: Task %d has empty title, using placeholder", taskID)
			existingTask.Title = fmt.Sprintf("Task #%d", taskID)
		}

		_, err = app.db.Tasks().Update(ctx, existingTask)
		if err != nil {
			failedTasks = append(failedTasks, models.BatchTaskError{
				TaskID: taskID,
				Error:  fmt.Sprintf("Failed to update: %v", err),
			})
			continue
		}

		// Note: Task update history creation is handled by the database layer if needed
		// For MVP, we skip explicit update history creation to keep it simple

		updatedCount++
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		app.logger.Printf("Error committing transaction: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to commit batch update", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Prepare response message based on what was updated
	var updateMessage string
	if req.Status != nil && req.ParentID != nil {
		updateMessage = fmt.Sprintf("Successfully updated %d tasks (status and parent)", updatedCount)
	} else if req.Status != nil {
		updateMessage = fmt.Sprintf("Successfully updated %d tasks to status '%s'", updatedCount, *req.Status)
	} else if req.ParentID != nil {
		if *req.ParentID == 0 {
			updateMessage = fmt.Sprintf("Successfully updated %d tasks (removed parent)", updatedCount)
		} else {
			updateMessage = fmt.Sprintf("Successfully updated %d tasks (set parent to %d)", updatedCount, *req.ParentID)
		}
	}

	// Prepare response
	batchResponse := models.BatchUpdateTasksResponse{
		UpdatedCount: updatedCount,
		FailedTasks:  failedTasks,
		Message:      updateMessage,
	}

	if len(failedTasks) > 0 {
		batchResponse.Message += fmt.Sprintf(" (%d tasks failed)", len(failedTasks))
	}

	response := models.NewSuccessResponse(batchResponse, "Batch update completed")
	c.JSON(http.StatusOK, response)
	}
}

// batchValidateTasksPreviewHandler provides preview validation for batch parent task updates
func (app *Application) batchValidateTasksPreviewHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Define request structure for batch validation preview
	var req struct {
		TaskIDs  []int `json:"task_ids" validate:"required,min=1"`
		ParentID *int  `json:"parent_id,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if len(req.TaskIDs) == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "At least one task ID is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Create TaskValidationService instance
	validationService := services.NewTaskValidationService(app.db.GetDB().(*sql.DB))
	
	// Handle parent ID of 0 (root task) vs actual parent ID
	parentIDForValidation := 0
	if req.ParentID != nil && *req.ParentID != 0 {
		parentIDForValidation = *req.ParentID
	}
	
	// Get batch update preview with comprehensive validation
	preview, err := validationService.GetBatchUpdatePreview(req.TaskIDs, parentIDForValidation, projectID)
	if err != nil {
		app.logger.Printf("Batch validation preview failed: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, 
			fmt.Sprintf("Failed to generate validation preview: %v", err), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	app.logger.Printf("Generated batch validation preview for %d tasks: %d valid, %d invalid, %d warnings", 
		preview.TotalTasks, len(preview.ValidTasks), len(preview.InvalidTasks), len(preview.Warnings))

	// Return the validation preview
	response := models.NewSuccessResponse(preview, "Batch validation preview generated successfully")
	c.JSON(http.StatusOK, response)
	}
}

func (app *Application) bulkDeleteTasksHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
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
}

// System Management Handlers




func (app *Application) getRecycledTasksHandler(c *gin.Context) {
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
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


func (app *Application) getAuditLogsHandler(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
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

// ExportAuditLogsHandler exports audit logs as CSV or Excel
func (app *Application) ExportAuditLogsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
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

// User management handlers

// getUserProfileHandler gets the current user's profile

// getProjectStatsHandler handles GET /api/v1/projects/:id/stats






// Run starts the application server
func (app *Application) Run() error {
	router := routes.SetupRouter(app)

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


// validateNoCircularReference checks if setting parentID for taskID would create a circular reference
func (app *Application) validateNoCircularReference(ctx context.Context, parentID, taskID int) error {
	const maxDepth = 3 // Maximum hierarchy depth allowed (0,1,2,3)
	
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

// validateParentHandler validates parent task selection for circular dependency
func (app *Application) validateParentHandler(c *gin.Context) {
	var req struct {
		TaskID   int `json:"taskId" binding:"required"`
		ParentID int `json:"parentId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", map[string]interface{}{
			"error": err.Error(),
		})
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := c.Request.Context()

	// Check for circular dependency using existing validation function
	err := app.validateNoCircularReference(ctx, req.ParentID, req.TaskID)
	
	if err != nil {
		// Circular dependency detected
		response := models.NewSuccessResponse(map[string]interface{}{
			"hasCircularDependency": true,
			"error": err.Error(),
		}, "Parent validation completed")
		c.JSON(http.StatusOK, response)
		return
	}

	// No circular dependency
	response := models.NewSuccessResponse(map[string]interface{}{
		"hasCircularDependency": false,
	}, "Parent validation completed")
	c.JSON(http.StatusOK, response)
}

// AI Configuration handlers




// 已删除旧的updateAIConfigHandler，使用handlers.AIConfigHandler.UpdateConfig代替









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



// getDocumentProjectsHandler 获取文档可关联的项目列表

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

// fileDownloadHandler handles file download requests
func (app *Application) fileDownloadHandler(c *gin.Context) {
	filePath := c.Query("path")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文件路径参数缺失",
			"code":    "MISSING_FILE_PATH",
		})
		return
	}

	// Log the download request for debugging
	log.Printf("[DOWNLOAD] Requested file path: %s", filePath)

	// Check if the file path looks like a document reference
	if strings.HasPrefix(filePath, "docs/") || strings.HasPrefix(filePath, "backend/docs/") {
		// This might be a task document download request
		c.JSON(http.StatusNotImplemented, gin.H{
			"success": false,
			"error":   "文档下载功能尚未完全实现",
			"code":    "FEATURE_NOT_IMPLEMENTED",
			"message": "请使用任务文档API获取文档内容",
			"suggestion": "使用 GET /api/v1/projects/{id}/tasks/{taskId}/documents 获取文档",
		})
		return
	}

	// For other file types, return file not found
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "请求的资源不存在",
		"code":    "FILE_NOT_FOUND",
		"details": map[string]interface{}{
			"requested_path": filePath,
			"available_endpoints": []string{
				"GET /api/v1/projects/{id}/tasks/{taskId}/documents",
				"GET /api/v1/projects/{id}/tasks/{taskId}/document",
			},
		},
	})
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