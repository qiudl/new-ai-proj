package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	// "ai-project-backend/handlers"
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
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
	config          *config.Config
	db              database.DB
	logger          *log.Logger
	validator       *validator.Validate
	jwtManager      *utils.JWTManager
	// customerHandler *handlers.CustomerHandler
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

	// Initialize handlers
	// customerHandler := handlers.NewCustomerHandler(db, logger, validate)

	return &Application{
		config:          cfg,
		db:              db,
		logger:          logger,
		validator:       validate,
		jwtManager:      jwtManager,
		// customerHandler: customerHandler,
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

		// Protected routes (will be implemented with auth middleware)
		authorized := api.Group("/")
		// authorized.Use(app.authMiddleware()) // Will be implemented in next task
		{
			// Global tasks route (all projects) - for compatibility
			authorized.GET("/tasks", app.getAllTasksHandler)
			
			// Projects routes
			projects := authorized.Group("/projects")
			{
				projects.GET("", app.getProjectsHandler)
				projects.POST("", app.createProjectHandler)
				projects.GET("/:id", app.getProjectHandler)
				projects.PUT("/:id", app.updateProjectHandler)
				projects.DELETE("/:id", app.deleteProjectHandler)

				// Hierarchical task routes (more specific routes first)
				projects.GET("/:id/tasks/tree", app.getTaskTreeHandler)
				projects.GET("/:id/tasks/root", app.getRootTasksHandler)
				projects.POST("/:id/tasks/bulk-import", app.bulkImportTasksHandler)
				
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
				
				// Project timeline
				projects.GET("/:id/timeline", app.getProjectTimelineHandler)
			}

			// System management routes (admin only)
			system := authorized.Group("/system")
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

			}

			// User management routes
			users := authorized.Group("/users")
			{
				users.GET("/profile", app.getUserProfileHandler)
				users.PUT("/profile", app.updateUserProfileHandler)
				users.PUT("/password", app.changePasswordHandler)
			}

			// Customer management routes (temporarily disabled)
			// customers := authorized.Group("/customers")
			// {
			//	customers.GET("", app.customerHandler.GetCustomers)
			//	customers.POST("", app.customerHandler.CreateCustomer)
			//	customers.GET("/stats", app.customerHandler.GetCustomerStats)
			//	customers.GET("/:id", app.customerHandler.GetCustomer)
			//	customers.PUT("/:id", app.customerHandler.UpdateCustomer)
			//	customers.DELETE("/:id", app.customerHandler.DeleteCustomer)

			//	// Customer user association routes
			//	customers.POST("/:id/users", app.customerHandler.AddCustomerUser)
			//	customers.DELETE("/:id/users/:userId", app.customerHandler.RemoveCustomerUser)

			//	// Customer contact routes
			//	customers.GET("/:id/contacts", app.customerHandler.GetCustomerContacts)
			//	customers.POST("/:id/contacts", app.customerHandler.CreateContact)
			// }
		}
	}

	// Add legacy API routes for compatibility (without v1)
	legacyApi := router.Group("/api")
	{
		// Auth routes
		auth := legacyApi.Group("/auth")
		{
			auth.POST("/login", app.loginHandler)
			auth.POST("/logout", app.logoutHandler)
		}

		// Protected routes (will be implemented with auth middleware)
		authorized := legacyApi.Group("/")
		// authorized.Use(app.authMiddleware()) // Will be implemented in next task
		{
			// Global tasks route (all projects)
			authorized.GET("/tasks", app.getAllTasksHandler)
			// Projects routes
			projects := authorized.Group("/projects")
			{
				projects.GET("", app.getProjectsHandler)
				projects.POST("", app.createProjectHandler)
				projects.GET("/:id", app.getProjectHandler)
				projects.PUT("/:id", app.updateProjectHandler)
				projects.DELETE("/:id", app.deleteProjectHandler)

				// Hierarchical task routes (more specific routes first)
				projects.GET("/:id/tasks/tree", app.getTaskTreeHandler)
				projects.GET("/:id/tasks/root", app.getRootTasksHandler)
				projects.POST("/:id/tasks/bulk-import", app.bulkImportTasksHandler)
				
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
				
				// Project timeline
				projects.GET("/:id/timeline", app.getProjectTimelineHandler)
			}
		}
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
	token, err := app.jwtManager.GenerateToken(user.ID, user.Username, user.Role)
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
	projects, total, err := app.db.Projects().List(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting projects: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	projectResponses := make([]models.ProjectResponse, len(projects))
	for i, project := range projects {
		projectResponses[i] = project.ToResponse()
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

	// Create project model (for now, use owner_id = 1 as default)
	project := &models.Project{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     1, // TODO: Get from authenticated user context
	}

	// Create project in database
	createdProject, err := app.db.Projects().Create(c.Request.Context(), project)
	if err != nil {
		app.logger.Printf("Error creating project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
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

	// Update project fields
	if req.Name != "" {
		existingProject.Name = req.Name
	}
	if req.Description != "" {
		existingProject.Description = req.Description
	}

	// Update project in database
	updatedProject, err := app.db.Projects().Update(c.Request.Context(), existingProject)
	if err != nil {
		app.logger.Printf("Error updating project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
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
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
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
		existingTask.CustomFields = req.CustomFields
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
		StartTime: time.Now().AddDate(0, 0, -7), // Last 7 days by default
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
	// TODO: Extract user ID from JWT token in context
	// For now, using placeholder user ID
	userID := 1 // This should come from JWT token middleware

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
	// TODO: Extract user ID from JWT token in context
	userID := 1 // This should come from JWT token middleware

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