package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
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
	config     *config.Config
	db         database.DB
	logger     *log.Logger
	validator  *validator.Validate
	jwtManager *utils.JWTManager
	cache      *utils.TaskQueryCache
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

	// Initialize cache with 5-minute default TTL
	cache := utils.NewTaskQueryCache(5 * time.Minute)

	return &Application{
		config:     cfg,
		db:         db,
		logger:     log.New(log.Writer(), "[API] ", log.LstdFlags),
		validator:  validate,
		jwtManager: jwtManager,
		cache:      cache,
	}, nil
}

// getAllTasksHandler gets all tasks across all projects with caching
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

	// Check if caching is enabled (via query parameter)
	enableCache := c.Query("cache") != "false"
	
	// Generate cache key
	cacheKey := fmt.Sprintf("global_tasks:limit=%d:offset=%d", pagination.PageSize, offset)
	
	// Try to get from cache first
	if enableCache {
		if cachedData, found := app.cache.Get(cacheKey); found {
			if result, ok := cachedData.(utils.CachedTaskResult); ok {
				utils.RecordCacheHit()
				
				// Convert to response format
				taskResponses := make([]models.TaskResponse, len(result.Tasks))
				for i, task := range result.Tasks {
					taskResponse := task.ToResponse()
					// Add project_name and assignee_name from custom_fields
					if task.CustomFields != nil {
						if projectName, ok := task.CustomFields["project_name"].(string); ok {
							taskResponse.ProjectName = projectName
						}
						if assigneeName, ok := task.CustomFields["assignee_name"].(string); ok {
							taskResponse.AssigneeName = assigneeName
						}
						if childrenCount, ok := task.CustomFields["children_count"].(int); ok {
							taskResponse.ChildrenCount = childrenCount
						}
					}
					taskResponses[i] = taskResponse
				}

				// Create pagination metadata
				totalPages := int((int64(result.Total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
				paginationMeta := models.Pagination{
					Page:       pagination.Page,
					PageSize:   pagination.PageSize,
					Total:      int64(result.Total),
					TotalPages: totalPages,
					HasNext:    pagination.Page < totalPages,
					HasPrev:    pagination.Page > 1,
				}

				paginatedResponse := models.PaginatedResponse{
					Data:       taskResponses,
					Pagination: paginationMeta,
				}

				// Add cache info to response headers
				c.Header("X-Cache-Status", "HIT")
				c.Header("X-Cache-Key", cacheKey)
				
				response := models.NewSuccessResponse(paginatedResponse, "All tasks retrieved successfully (cached)")
				c.JSON(http.StatusOK, response)
				return
			}
		}
		utils.RecordCacheMiss()
	}

	// Get all tasks from database
	startTime := time.Now()
	tasks, total, err := app.db.Tasks().GetAll(c.Request.Context(), pagination.PageSize, offset)
	queryDuration := time.Since(startTime)
	
	if err != nil {
		app.logger.Printf("Error getting all tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Cache the result if caching is enabled
	if enableCache {
		app.cache.Set(cacheKey, utils.CachedTaskResult{
			Tasks: tasks,
			Total: total,
		})
		utils.RecordCacheSet()
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
			if childrenCount, ok := task.CustomFields["children_count"].(int); ok {
				taskResponse.ChildrenCount = childrenCount
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

	// Add performance info to response headers
	c.Header("X-Cache-Status", "MISS")
	c.Header("X-Query-Duration", fmt.Sprintf("%.2fms", float64(queryDuration.Nanoseconds())/1e6))
	if enableCache {
		c.Header("X-Cache-Key", cacheKey)
	}

	response := models.NewSuccessResponse(paginatedResponse, "All tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// Add cache statistics endpoint
func (app *Application) getCacheStatsHandler(c *gin.Context) {
	stats := app.cache.GetStats()
	
	// Add global metrics
	stats["cache_hit_ratio"] = utils.GetCacheHitRatio()
	stats["cache_hits"] = utils.GlobalCacheMetrics.Hits
	stats["cache_misses"] = utils.GlobalCacheMetrics.Misses
	stats["cache_sets"] = utils.GlobalCacheMetrics.Sets
	
	response := models.NewSuccessResponse(stats, "Cache statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// Add cache management endpoints
func (app *Application) clearCacheHandler(c *gin.Context) {
	app.cache.Clear()
	
	// Reset metrics
	utils.GlobalCacheMetrics.Hits = 0
	utils.GlobalCacheMetrics.Misses = 0
	utils.GlobalCacheMetrics.Sets = 0
	
	response := models.NewSuccessResponse(nil, "Cache cleared successfully")
	c.JSON(http.StatusOK, response)
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
		// Cache management routes
		cache := api.Group("/cache")
		{
			cache.GET("/stats", app.getCacheStatsHandler)
			cache.DELETE("/clear", app.clearCacheHandler)
		}

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
			
			// Projects routes (keeping existing implementation for other routes)
			// ... (rest of the routes remain the same)
		}
	}

	// Add legacy API routes for compatibility
	legacyApi := router.Group("/api")
	{
		// Cache management routes
		cache := legacyApi.Group("/cache")
		{
			cache.GET("/stats", app.getCacheStatsHandler)
			cache.DELETE("/clear", app.clearCacheHandler)
		}

		// Auth routes
		auth := legacyApi.Group("/auth")
		{
			auth.POST("/login", app.loginHandler)
			auth.POST("/logout", app.logoutHandler)
		}

		// Protected routes
		authorized := legacyApi.Group("/")
		{
			// Global tasks route (all projects)
			authorized.GET("/tasks", app.getAllTasksHandler)
			// ... (rest of the routes remain the same)
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

// Health check handler with cache info
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

	// Get cache stats
	cacheStats := app.cache.GetStats()

	data := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now().UTC(),
		"version":    Version,
		"build_time": BuildTime,
		"git_commit": GitCommit,
		"database":   "connected",
		"cache": map[string]interface{}{
			"active_entries": cacheStats["active_entries"],
			"hit_ratio":      utils.GetCacheHitRatio(),
		},
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

// Placeholder handlers - simplified versions
func (app *Application) loginHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Login endpoint - simplified for performance testing",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) logoutHandler(c *gin.Context) {
	response := models.NewSuccessResponse(
		map[string]string{"status": "placeholder"},
		"Logout endpoint - simplified for performance testing",
	)
	c.JSON(http.StatusOK, response)
}

// Run starts the application server
func (app *Application) Run() error {
	router := app.setupRouter()

	log.Printf("Starting %s server on %s", app.config.App.Name, app.config.GetServerAddress())
	log.Printf("Version: %s, Build Time: %s, Git Commit: %s", Version, BuildTime, GitCommit)
	log.Printf("Environment: %s", app.config.App.Environment)
	log.Printf("Cache enabled with 5-minute TTL")
	
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