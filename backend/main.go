package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
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
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Get projects endpoint - to be implemented in task 2.4",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) createProjectHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Create project endpoint - to be implemented in task 2.4",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) getProjectHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Get project endpoint - to be implemented in task 2.4",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) updateProjectHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Update project endpoint - to be implemented in task 2.4",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) deleteProjectHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Delete project endpoint - to be implemented in task 2.4",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) getTasksHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Get tasks endpoint - to be implemented in task 2.5",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) createTaskHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Create task endpoint - to be implemented in task 2.5",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) bulkImportTasksHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Bulk import tasks endpoint - to be implemented in task 2.6",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) getTaskHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Get task endpoint - to be implemented in task 2.5",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) updateTaskHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Update task endpoint - to be implemented in task 2.5",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) deleteTaskHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Delete task endpoint - to be implemented in task 2.5",
	)
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