package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
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
	config *config.Config
	db     database.DB
	logger *log.Logger
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

	return &Application{
		config: cfg,
		db:     db,
		logger: log.New(log.Writer(), "[API] ", log.LstdFlags),
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
				}

			}
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

	data := map[string]interface{}{
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
	data := map[string]interface{}{
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
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Login endpoint - to be implemented in task 2.3",
	)
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

	// Get all tasks from database
	tasks, total, err := app.db.Tasks().GetAll(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting all tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	taskResponses := make([]models.TaskResponse, len(tasks))
	for i, task := range tasks {
		taskResponse := task.ToResponse()
		// Add project_name and assignee_name from custom_fields
		if task.CustomFields != nil {
			if projectName, ok := task.CustomFields["project_name"].(string); ok {
				taskResponse.ProjectName = projectName
			}
			if assigneeName, ok := task.CustomFields["assignee_name"].(string); ok {
				taskResponse.AssigneeName = assigneeName
			}
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

// System Management Handlers

func (app *Application) getRecycledProjectsHandler(c *gin.Context) {
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
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
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	logs, total, err := app.db.System().GetAuditLogs(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		app.logger.Printf("Error getting audit logs: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit logs", nil)
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
		Data:       logs,
		Pagination: paginationResult,
	}

	response := models.NewSuccessResponse(result, "Audit logs retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// Hierarchical Task Handlers

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