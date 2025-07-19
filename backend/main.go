package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/models"
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
			// Projects routes
			projects := authorized.Group("/projects")
			{
				projects.GET("", app.getProjectsHandler)
				projects.POST("", app.createProjectHandler)
				projects.GET("/:id", app.getProjectHandler)
				projects.PUT("/:id", app.updateProjectHandler)
				projects.DELETE("/:id", app.deleteProjectHandler)

				// Tasks routes
				projects.GET("/:id/tasks", app.getTasksHandler)
				projects.POST("/:id/tasks", app.createTaskHandler)
				projects.POST("/:id/tasks/bulk-import", app.bulkImportTasksHandler)
				projects.GET("/:id/tasks/:taskId", app.getTaskHandler)
				projects.PUT("/:id/tasks/:taskId", app.updateTaskHandler)
				projects.DELETE("/:id/tasks/:taskId", app.deleteTaskHandler)
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
			// Projects routes
			projects := authorized.Group("/projects")
			{
				projects.GET("", app.getProjectsHandler)
				projects.POST("", app.createProjectHandler)
				projects.GET("/:id", app.getProjectHandler)
				projects.PUT("/:id", app.updateProjectHandler)
				projects.DELETE("/:id", app.deleteProjectHandler)

				// Tasks routes
				projects.GET("/:id/tasks", app.getTasksHandler)
				projects.POST("/:id/tasks", app.createTaskHandler)
				projects.POST("/:id/tasks/bulk-import", app.bulkImportTasksHandler)
				projects.GET("/:id/tasks/:taskId", app.getTaskHandler)
				projects.PUT("/:id/tasks/:taskId", app.updateTaskHandler)
				projects.DELETE("/:id/tasks/:taskId", app.deleteTaskHandler)
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

	// Create task model
	task := &models.Task{
		ProjectID:    projectID,
		Title:        req.Title,
		Description:  req.Description,
		Status:       req.Status,
		AssigneeID:   req.AssigneeID,
		DueDate:      req.DueDate,
		CustomFields: req.CustomFields,
	}

	// Create task in database
	createdTask, err := app.db.Tasks().Create(c.Request.Context(), task)
	if err != nil {
		app.logger.Printf("Error creating task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
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

	// Update task fields
	if req.Title != "" {
		existingTask.Title = req.Title
	}
	if req.Description != "" {
		existingTask.Description = req.Description
	}
	if req.Status != "" {
		existingTask.Status = req.Status
	}
	if req.AssigneeID != nil {
		existingTask.AssigneeID = req.AssigneeID
	}
	if req.DueDate != nil {
		existingTask.DueDate = req.DueDate
	}
	if req.CustomFields != nil {
		existingTask.CustomFields = req.CustomFields
	}

	// Update task in database
	updatedTask, err := app.db.Tasks().Update(c.Request.Context(), existingTask)
	if err != nil {
		app.logger.Printf("Error updating task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
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