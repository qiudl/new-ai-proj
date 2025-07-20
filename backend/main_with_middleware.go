// backend/main_with_middleware.go
// This shows how to integrate the new middleware into the existing main.go

package main

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	_ "github.com/lib/pq"
)

// Enhanced Application with middleware support
type Application struct {
	config            *config.Config
	db                database.DB
	logger            *log.Logger
	validator         *validator.Validate
	jwtManager        *utils.JWTManager
	
	// New middleware components
	auditMiddleware   *middleware.AuditMiddleware
	authMiddleware    *middleware.AuthMiddleware
	permissionManager *middleware.PermissionManager
}

// NewApplication creates a new application instance with middleware
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

	// Initialize permission manager
	permissionManager := middleware.NewPermissionManager(db)

	// Initialize auth middleware
	authConfig := &middleware.AuthConfig{
		DB:         db,
		JWTManager: jwtManager,
		EnableSessions:    true,
		SessionTimeout:    24 * time.Hour,
		SessionCookieName: "session_id",
		AllowAnonymous: []string{
			"/api/auth/login",
			"/api/auth/register", 
			"/api/v1/auth/login",
			"/api/v1/auth/register",
			"/health",
			"/version",
		},
		RequireVerification: false, // Set to true in production
		MaxLoginAttempts:    5,
		LockoutDuration:     15 * time.Minute,
	}
	authMiddleware := middleware.NewAuthMiddleware(authConfig)

	// Initialize audit middleware
	auditConfig := &middleware.AuditConfig{
		DB: db,
		ExcludePaths: []string{
			"/health",
			"/version",
			"/metrics",
			"/static/",
			"/assets/",
		},
		ExcludeMethods:    []string{"OPTIONS"},
		LogRequestBody:    true,
		LogResponseBody:   true,
		MaxBodySize:       1024 * 1024, // 1MB
		SensitiveHeaders:  []string{"authorization", "cookie", "x-api-key"},
		SensitiveBodyKeys: []string{"password", "token", "secret"},
	}
	auditMiddleware := middleware.NewAuditMiddleware(auditConfig)

	return &Application{
		config:            cfg,
		db:                db,
		logger:            log.New(log.Writer(), "[API] ", log.LstdFlags),
		validator:         validate,
		jwtManager:        jwtManager,
		auditMiddleware:   auditMiddleware,
		authMiddleware:    authMiddleware,
		permissionManager: permissionManager,
	}, nil
}

// setupRouter sets up Gin router with middleware
func (app *Application) setupRouter() *gin.Engine {
	gin.SetMode(func() string {
		if app.config.IsProduction() {
			return gin.ReleaseMode
		}
		return gin.DebugMode
	}())

	router := gin.New()
	
	// Basic middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(app.corsMiddleware())
	
	// Add audit middleware for all requests
	router.Use(app.auditMiddleware.Middleware())
	
	// Add rate limiting for login attempts
	router.Use(app.authMiddleware.RateLimitMiddleware())

	// Health check endpoints (no auth required)
	router.GET("/health", app.healthHandler)
	router.GET("/version", app.versionHandler)

	// API routes
	api := router.Group("/api/v1")
	{
		// Auth routes (no auth required)
		auth := api.Group("/auth")
		{
			auth.POST("/login", app.loginHandler)
			auth.POST("/logout", app.authMiddleware.RequireAuth(), app.logoutHandler)
			auth.POST("/refresh", app.authMiddleware.RequireAuth(), app.refreshTokenHandler)
		}

		// Protected routes
		authorized := api.Group("/")
		authorized.Use(app.authMiddleware.RequireAuth()) // Require authentication
		{
			// Global tasks route (requires authentication)
			authorized.GET("/tasks", 
				app.permissionManager.RequirePermission(middleware.PermTaskView),
				app.getAllTasksHandler)
			
			// Projects routes
			projects := authorized.Group("/projects")
			{
				// Project creation (requires permission)
				projects.POST("", 
					app.permissionManager.RequirePermission(middleware.PermProjectCreate),
					app.createProjectHandler)
					
				// Project listing (requires basic project view permission)
				projects.GET("", 
					app.permissionManager.RequirePermission(middleware.PermProjectView),
					app.getProjectsHandler)
				
				// Project-specific routes (require project access)
				projectSpecific := projects.Group("/:id")
				projectSpecific.Use(app.permissionManager.RequireProjectAccess())
				{
					projectSpecific.GET("", app.getProjectHandler)
					
					// Project modification (requires update permission)
					projectSpecific.PUT("", 
						app.permissionManager.RequirePermission(middleware.PermProjectUpdate),
						app.updateProjectHandler)
						
					// Project deletion (requires delete permission) 
					projectSpecific.DELETE("", 
						app.permissionManager.RequirePermission(middleware.PermProjectDelete),
						app.deleteProjectHandler)

					// Task routes within project
					tasks := projectSpecific.Group("/tasks")
					{
						// Task listing (inherited from project access)
						tasks.GET("", app.getTasksHandler)
						tasks.GET("/tree", app.getTaskTreeHandler)
						tasks.GET("/root", app.getRootTasksHandler)
						
						// Task creation
						tasks.POST("", 
							app.permissionManager.RequirePermission(middleware.PermTaskCreate),
							app.createTaskHandler)
							
						// Bulk operations
						tasks.POST("/bulk-import", 
							app.permissionManager.RequirePermission(middleware.PermTaskCreate),
							app.bulkImportTasksHandler)
							
						tasks.DELETE("", 
							app.permissionManager.RequirePermission(middleware.PermTaskBulkDelete),
							app.bulkDeleteTasksHandler)
						
						// Individual task routes
						taskSpecific := tasks.Group("/:taskId")
						{
							taskSpecific.GET("", app.getTaskHandler)
							
							taskSpecific.PUT("", 
								app.requireTaskAccess(),
								app.updateTaskHandler)
								
							taskSpecific.DELETE("", 
								app.requireTaskAccess(),
								app.deleteTaskHandler)
							
							// Task children and timeline
							taskSpecific.GET("/children", app.getTaskChildrenHandler)
							taskSpecific.GET("/timeline", app.getTaskTimelineHandler)
							taskSpecific.GET("/updates", app.getTaskUpdatesHandler)
							taskSpecific.PUT("/updates/:updateId", app.updateTaskUpdateHandler)
							taskSpecific.DELETE("/updates/:updateId", 
								app.authMiddleware.RequireRole("admin"), 
								app.deleteTaskUpdateHandler)
						}
					}
					
					// Project timeline
					projectSpecific.GET("/timeline", app.getProjectTimelineHandler)
				}
			}

			// System management routes (admin only)
			system := authorized.Group("/system")
			system.Use(app.authMiddleware.RequireRole("admin"))
			{
				// Audit routes
				audit := system.Group("/audit")
				{
					audit.GET("/logs", 
						app.permissionManager.RequirePermission(middleware.PermSystemAudit),
						app.getAuditLogsHandler)
					audit.GET("/logs/:id", 
						app.permissionManager.RequirePermission(middleware.PermSystemAudit),
						app.getAuditLogHandler)
					audit.GET("/stats", 
						app.permissionManager.RequirePermission(middleware.PermSystemAudit),
						app.getAuditStatsHandler)
				}

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

				// User management
				userMgmt := system.Group("/users")
				{
					userMgmt.GET("", 
						app.permissionManager.RequirePermission(middleware.PermSystemUsers),
						app.listUsersHandler)
					userMgmt.POST("", 
						app.permissionManager.RequirePermission(middleware.PermSystemUsers),
						app.createUserHandler)
					userMgmt.PUT("/:userId/role", 
						app.permissionManager.RequirePermission(middleware.PermSystemUsers),
						app.updateUserRoleHandler)
					userMgmt.GET("/:userId/sessions", 
						app.permissionManager.RequirePermission(middleware.PermSystemUsers),
						app.getUserSessionsHandler)
					userMgmt.DELETE("/:userId/sessions", 
						app.permissionManager.RequirePermission(middleware.PermSystemUsers),
						app.invalidateUserSessionsHandler)
				}

				// Permission management
				permissions := system.Group("/permissions")
				{
					permissions.GET("/roles", app.getRolesHandler)
					permissions.GET("/permissions", app.getPermissionsHandler)
					permissions.POST("/users/:userId/permissions", app.grantUserPermissionHandler)
					permissions.DELETE("/users/:userId/permissions/:permissionId", app.revokeUserPermissionHandler)
				}
			}

			// User profile routes
			users := authorized.Group("/users")
			{
				users.GET("/profile", app.getUserProfileHandler)
				users.PUT("/profile", 
					app.permissionManager.RequirePermission(middleware.PermUserProfile),
					app.updateUserProfileHandler)
				users.PUT("/password", 
					app.permissionManager.RequirePermission(middleware.PermUserPassword),
					app.changePasswordHandler)
				users.GET("/sessions", 
					app.permissionManager.RequirePermission(middleware.PermUserSessions),
					app.getMySessionsHandler)
				users.DELETE("/sessions/:sessionId", 
					app.permissionManager.RequirePermission(middleware.PermUserSessions),
					app.invalidateSessionHandler)
			}
		}
	}

	// Add legacy API routes for compatibility
	app.addLegacyRoutes(router)

	return router
}

// requireTaskAccess is a custom middleware for task-level access control
func (app *Application) requireTaskAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(403, models.NewErrorResponse(models.ErrCodeAuthentication, "Authentication required", nil))
			c.Abort()
			return
		}

		uid, ok := userID.(int)
		if !ok {
			c.JSON(403, models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid user context", nil))
			c.Abort()
			return
		}

		taskIDStr := c.Param("taskId")
		taskID, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(400, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil))
			c.Abort()
			return
		}

		// Check if user can modify this specific task
		canModify, err := app.permissionManager.CanModifyTask(c.Request.Context(), uid, taskID)
		if err != nil || !canModify {
			c.JSON(403, models.NewErrorResponse(models.ErrCodeAuthorization, "Task access denied", nil))
			c.Abort()
			return
		}

		c.Set("task_id", taskID)
		c.Next()
	}
}

// CORS middleware
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
		"middleware": map[string]bool{
			"audit":       true,
			"auth":        true,
			"permissions": true,
		},
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

// New handler methods for audit and session management

func (app *Application) refreshTokenHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid session", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	uid, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid user context", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Get user details
	user, err := app.db.Users().GetByID(c.Request.Context(), uid)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "User not found", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Generate new token
	token, err := app.jwtManager.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate token", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(
		map[string]interface{}{"token": token},
		"Token refreshed successfully",
	)
	c.JSON(http.StatusOK, response)
}

func (app *Application) getAuditLogsHandler(c *gin.Context) {
	// Parse filter parameters
	filter := &models.AuditLogFilter{
		Limit:  20,
		Offset: 0,
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filter.Offset = offset
		}
	}

	if action := c.Query("action"); action != "" {
		filter.Action = action
	}

	if resourceType := c.Query("resource_type"); resourceType != "" {
		filter.ResourceType = resourceType
	}

	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}

	// Get audit logs (implement this in your audit repository)
	logs, total, err := app.getAuditLogsFromDB(c.Request.Context(), filter)
	if err != nil {
		app.logger.Printf("Error getting audit logs: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve audit logs", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create pagination metadata
	totalPages := (total + filter.Limit - 1) / filter.Limit
	paginationMeta := models.Pagination{
		Page:       (filter.Offset / filter.Limit) + 1,
		PageSize:   filter.Limit,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    filter.Offset+filter.Limit < total,
		HasPrev:    filter.Offset > 0,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       logs,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Audit logs retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getAuditLogHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid audit log ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get specific audit log
	auditLog, err := app.getAuditLogByID(c.Request.Context(), id)
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

func (app *Application) getAuditStatsHandler(c *gin.Context) {
	// Parse request parameters
	req := &models.AuditStatsRequest{
		StartTime: time.Now().AddDate(0, 0, -7), // Last 7 days
		EndTime:   time.Now(),
		GroupBy:   c.DefaultQuery("group_by", "day"),
	}

	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			req.StartTime = startTime
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			req.EndTime = endTime
		}
	}

	// Get audit statistics
	stats, err := app.getAuditStats(c.Request.Context(), req)
	if err != nil {
		app.logger.Printf("Error getting audit stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve audit statistics", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Audit statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getMySessionsHandler(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(int)

	sessions, err := app.authMiddleware.GetUserSessions(c.Request.Context(), uid)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve sessions", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(sessions, "User sessions retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) invalidateSessionHandler(c *gin.Context) {
	sessionID := c.Param("sessionId")
	
	err := app.authMiddleware.InvalidateSession(c.Request.Context(), sessionID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to invalidate session", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Session invalidated successfully")
	c.JSON(http.StatusOK, response)
}

// Enhanced login handler with audit logging
func (app *Application) loginHandler(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Record failed attempt
		go app.recordLoginAttempt(c, req.Username, false, "Invalid request format")
		
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := app.validator.Struct(&req); err != nil {
		go app.recordLoginAttempt(c, req.Username, false, "Validation failed")
		
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get user by username
	user, err := app.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		go app.recordLoginAttempt(c, req.Username, false, "User not found")
		
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid username or password", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		go app.recordLoginAttempt(c, req.Username, false, "Invalid password")
		
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid username or password", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Check if user is active
	if !user.IsActive {
		go app.recordLoginAttempt(c, req.Username, false, "Account disabled")
		
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Account is disabled", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Generate JWT token
	token, err := app.jwtManager.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		go app.recordLoginAttempt(c, req.Username, false, "Token generation failed")
		
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate token", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create session if enabled
	var sessionID string
	if app.authMiddleware != nil {
		if sid, err := app.authMiddleware.CreateSession(c.Request.Context(), user, c); err == nil {
			sessionID = sid
		}
	}

	// Record successful login
	go app.recordLoginAttempt(c, req.Username, true, "")

	// Prepare response
	loginResponse := models.LoginResponse{
		Token: token,
		User:  *user,
	}

	if sessionID != "" {
		loginResponse.SessionID = sessionID
	}

	response := models.NewSuccessResponse(loginResponse, "Login successful")
	c.JSON(http.StatusOK, response)
}

// Enhanced logout handler with session cleanup
func (app *Application) logoutHandler(c *gin.Context) {
	sessionID, exists := c.Get("session_id")
	if exists {
		if sid, ok := sessionID.(string); ok {
			// Invalidate the session
			go app.authMiddleware.InvalidateSession(c.Request.Context(), sid)
		}
	}

	// Clear session cookie
	c.SetCookie("session_id", "", -1, "/", "", false, true)
	c.SetCookie("auth_token", "", -1, "/", "", false, true)

	response := models.NewSuccessResponse(nil, "Logout successful")
	c.JSON(http.StatusOK, response)
}

// recordLoginAttempt records login attempts for audit and rate limiting
func (app *Application) recordLoginAttempt(c *gin.Context, username string, success bool, errorReason string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	clientIP := c.ClientIP()
	if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
		clientIP = forwarded
	}

	app.authMiddleware.RecordLoginAttempt(
		ctx,
		clientIP,
		username,
		c.GetHeader("User-Agent"),
		success,
		errorReason,
	)
}

// Placeholder methods for database operations (implement these in your database layer)

func (app *Application) getAuditLogsFromDB(ctx context.Context, filter *models.AuditLogFilter) ([]interface{}, int, error) {
	// Implementation would query the audit_logs table
	// This is a placeholder - implement based on your database schema
	return []interface{}{}, 0, nil
}

func (app *Application) getAuditLogByID(ctx context.Context, id int64) (interface{}, error) {
	// Implementation would query specific audit log
	return nil, nil
}

func (app *Application) getAuditStats(ctx context.Context, req *models.AuditStatsRequest) (interface{}, error) {
	// Implementation would aggregate audit statistics
	return nil, nil
}

// Additional placeholder handlers (implement as needed)
func (app *Application) listUsersHandler(c *gin.Context) {
	response := models.NewSuccessResponse([]interface{}{}, "Users list - implement in database layer")
	c.JSON(http.StatusOK, response)
}

func (app *Application) createUserHandler(c *gin.Context) {
	response := models.NewSuccessResponse(nil, "User creation - implement in database layer")
	c.JSON(http.StatusCreated, response)
}

func (app *Application) updateUserRoleHandler(c *gin.Context) {
	response := models.NewSuccessResponse(nil, "User role update - implement in database layer")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getUserSessionsHandler(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	sessions, err := app.authMiddleware.GetUserSessions(c.Request.Context(), userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve user sessions", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(sessions, "User sessions retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) invalidateUserSessionsHandler(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = app.authMiddleware.InvalidateUserSessions(c.Request.Context(), userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to invalidate user sessions", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "All user sessions invalidated successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getRolesHandler(c *gin.Context) {
	roles := middleware.DefaultRoles()
	response := models.NewSuccessResponse(roles, "Roles retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) getPermissionsHandler(c *gin.Context) {
	permissions := middleware.DefaultPermissions()
	response := models.NewSuccessResponse(permissions, "Permissions retrieved successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) grantUserPermissionHandler(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		PermissionID int  `json:"permission_id" binding:"required"`
		ProjectID    *int `json:"project_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	grantedBy, _ := c.Get("user_id")
	grantedByID := grantedBy.(int)

	err = app.permissionManager.GrantPermission(c.Request.Context(), userID, req.PermissionID, req.ProjectID, grantedByID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to grant permission", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Permission granted successfully")
	c.JSON(http.StatusOK, response)
}

func (app *Application) revokeUserPermissionHandler(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	permissionIDStr := c.Param("permissionId")
	permissionID, err := strconv.Atoi(permissionIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid permission ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		ProjectID *int `json:"project_id"`
	}
	c.ShouldBindJSON(&req) // Optional project ID

	revokedBy, _ := c.Get("user_id")
	revokedByID := revokedBy.(int)

	err = app.permissionManager.RevokePermission(c.Request.Context(), userID, permissionID, req.ProjectID, revokedByID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to revoke permission", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Permission revoked successfully")
	c.JSON(http.StatusOK, response)
}

// Background job for cleaning up expired sessions and old audit logs
func (app *Application) startBackgroundJobs() {
	// Session cleanup job - runs every hour
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			
			// Cleanup expired sessions
			if deleted, err := app.authMiddleware.CleanupSessions(ctx); err == nil {
				app.logger.Printf("Cleaned up %d expired sessions", deleted)
			} else {
				app.logger.Printf("Session cleanup failed: %v", err)
			}
			
			cancel()
		}
	}()

	// Audit log cleanup job - runs daily at 2 AM
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 2, 0, 0, 0, now.Location())
			time.Sleep(time.Until(next))

			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			
			// Cleanup old audit logs (older than 2 years)
			if deleted, err := app.cleanupOldAuditLogs(ctx, 730); err == nil {
				app.logger.Printf("Cleaned up %d old audit logs", deleted)
			} else {
				app.logger.Printf("Audit log cleanup failed: %v", err)
			}
			
			// Cleanup old login attempts (older than 30 days)
			if deleted, err := app.cleanupOldLoginAttempts(ctx, 30); err == nil {
				app.logger.Printf("Cleaned up %d old login attempts", deleted)
			} else {
				app.logger.Printf("Login attempt cleanup failed: %v", err)
			}
			
			cancel()
		}
	}()
}

// Cleanup methods (implement these with your database layer)
func (app *Application) cleanupOldAuditLogs(ctx context.Context, retentionDays int) (int64, error) {
	// Implement audit log cleanup
	return 0, nil
}

func (app *Application) cleanupOldLoginAttempts(ctx context.Context, retentionDays int) (int64, error) {
	// Implement login attempt cleanup
	return 0, nil
}

// Enhanced initDB function with audit table creation
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

	// Initialize audit and permission tables
	if err := initializeAuditTables(db); err != nil {
		log.Printf("Warning: Failed to initialize audit tables: %v", err)
	}

	log.Println("Database connected successfully")
	return db, nil
}

// initializeAuditTables creates necessary tables for audit and permission system
func initializeAuditTables(db database.DB) error {
	// This would contain SQL statements to create the required tables
	tables := []string{
		// Audit logs table
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id BIGSERIAL PRIMARY KEY,
			event_id VARCHAR(255) NOT NULL UNIQUE,
			timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			user_id INTEGER,
			user_email VARCHAR(255),
			user_name VARCHAR(255),
			user_role VARCHAR(100),
			action VARCHAR(255) NOT NULL,
			resource_type VARCHAR(100) NOT NULL,
			resource_id VARCHAR(100),
			resource_name VARCHAR(255),
			ip_address INET,
			user_agent TEXT,
			session_id VARCHAR(255),
			request_id VARCHAR(255),
			description TEXT,
			before_data JSONB,
			after_data JSONB,
			changes JSONB,
			status VARCHAR(50) DEFAULT 'success',
			error_message TEXT,
			project_id INTEGER,
			parent_event_id VARCHAR(255),
			correlation_id VARCHAR(255),
			metadata JSONB,
			tags TEXT[]
		)`,

		// User sessions table
		`CREATE TABLE IF NOT EXISTS user_sessions (
			id VARCHAR(255) PRIMARY KEY,
			user_id INTEGER NOT NULL,
			token TEXT NOT NULL,
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			ip_address INET,
			user_agent TEXT,
			is_active BOOLEAN DEFAULT true
		)`,

		// Login attempts table for rate limiting
		`CREATE TABLE IF NOT EXISTS login_attempts (
			id BIGSERIAL PRIMARY KEY,
			ip_address INET NOT NULL,
			username VARCHAR(255),
			success BOOLEAN NOT NULL DEFAULT false,
			timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			user_agent TEXT,
			error_reason VARCHAR(255)
		)`,

		// Permissions table
		`CREATE TABLE IF NOT EXISTS permissions (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			description TEXT,
			category VARCHAR(100),
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		)`,

		// Roles table
		`CREATE TABLE IF NOT EXISTS roles (
			id SERIAL PRIMARY KEY,
			name VARCHAR(100) NOT NULL UNIQUE,
			description TEXT,
			is_system BOOLEAN DEFAULT false,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		)`,

		// Role permissions junction table
		`CREATE TABLE IF NOT EXISTS role_permissions (
			id SERIAL PRIMARY KEY,
			role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
			permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE(role_id, permission_id)
		)`,

		// User permissions table for direct user permissions
		`CREATE TABLE IF NOT EXISTS user_permissions (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			project_id INTEGER,
			granted BOOLEAN NOT NULL DEFAULT true,
			granted_by INTEGER NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		)`,

		// Project members table for project-specific roles
		`CREATE TABLE IF NOT EXISTS project_members (
			id SERIAL PRIMARY KEY,
			project_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			role_id INTEGER NOT NULL REFERENCES roles(id),
			added_by INTEGER NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			UNIQUE(project_id, user_id)
		)`,
	}

	// Create indexes for better performance
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)`,
		`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_timestamp ON login_attempts(ip_address, timestamp)`,
		`CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)`,
		`CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id)`,
	}

	// Execute table creation statements
	for _, table := range tables {
		if _, err := db.Exec(table); err != nil {
			return fmt.Errorf("failed to create table: %v", err)
		}
	}

	// Execute index creation statements
	for _, index := range indexes {
		if _, err := db.Exec(index); err != nil {
			log.Printf("Warning: Failed to create index: %v", err)
		}
	}

	// Insert default permissions and roles
	if err := insertDefaultPermissionsAndRoles(db); err != nil {
		log.Printf("Warning: Failed to insert default permissions and roles: %v", err)
	}

	return nil
}

// insertDefaultPermissionsAndRoles inserts default permissions and roles
func insertDefaultPermissionsAndRoles(db database.DB) error {
	// Insert default permissions
	permissions := middleware.DefaultPermissions()
	for _, perm := range permissions {
		_, err := db.Exec(`
			INSERT INTO permissions (name, description, category) 
			VALUES ($1, $2, $3) 
			ON CONFLICT (name) DO NOTHING`,
			perm.Name, perm.Description, perm.Category)
		if err != nil {
			return fmt.Errorf("failed to insert permission %s: %v", perm.Name, err)
		}
	}

	// Insert default roles
	roles := middleware.DefaultRoles()
	for _, role := range roles {
		var roleID int
		err := db.QueryRow(`
			INSERT INTO roles (name, description, is_system) 
			VALUES ($1, $2, $3) 
			ON CONFLICT (name) DO UPDATE SET 
				description = EXCLUDED.description,
				is_system = EXCLUDED.is_system
			RETURNING id`,
			role.Name, role.Description, role.IsSystem).Scan(&roleID)
		if err != nil {
			return fmt.Errorf("failed to insert role %s: %v", role.Name, err)
		}

		// Insert role permissions
		for _, perm := range role.Permissions {
			_, err := db.Exec(`
				INSERT INTO role_permissions (role_id, permission_id)
				SELECT $1, p.id FROM permissions p WHERE p.name = $2
				ON CONFLICT (role_id, permission_id) DO NOTHING`,
				roleID, perm.Name)
			if err != nil {
				log.Printf("Warning: Failed to insert role permission %s for role %s: %v", perm.Name, role.Name, err)
			}
		}
	}

	return nil
}

// addLegacyRoutes adds legacy API routes for backward compatibility
func (app *Application) addLegacyRoutes(router *gin.Engine) {
	// Add your existing legacy routes here
	legacyApi := router.Group("/api")
	{
		// Auth routes
		auth := legacyApi.Group("/auth")
		{
			auth.POST("/login", app.loginHandler)
			auth.POST("/logout", app.logoutHandler)
		}

		// Protected routes
		authorized := legacyApi.Group("/")
		authorized.Use(app.authMiddleware.RequireAuth())
		{
			// Copy all the same routes from the v1 API for backward compatibility
			authorized.GET("/tasks", app.getAllTasksHandler)
			// ... add other legacy routes as needed
		}
	}
}

// Include placeholder handlers from original main.go
// (Copy all the existing handlers from your original main.go here)

// Enhanced Run method with background jobs
func (app *Application) Run() error {
	router := app.setupRouter()

	// Start background cleanup jobs
	app.startBackgroundJobs()

	log.Printf("Starting %s server on %s", app.config.App.Name, app.config.GetServerAddress())
	log.Printf("Version: %s, Build Time: %s, Git Commit: %s", Version, BuildTime, GitCommit)
	log.Printf("Environment: %s", app.config.App.Environment)
	log.Printf("Audit middleware: enabled")
	log.Printf("Authentication middleware: enabled")
	log.Printf("Permission system: enabled")
	
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

// Build-time variables
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

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
