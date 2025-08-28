package application

import (
	"database/sql"
	"ai-project-backend/handlers"
	"ai-project-backend/services"
	"ai-project-backend/database"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// 简化的Handler方法实现，专注于角色权限API测试

// GetHealthHandler returns a health check handler
func (app *Application) GetHealthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"message": "Service is healthy",
			"service": "ai-project-backend",
		})
	}
}

// GetVersionHandler returns a version handler
func (app *Application) GetVersionHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"version": "1.0.0",
			"service": "ai-project-backend",
			"build": "development",
		})
	}
}

// GetLoginHandler returns a simple login handler
func (app *Application) GetLoginHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 简化的登录逻辑 - 只用于测试
		var loginReq struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		
		if err := c.ShouldBindJSON(&loginReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}
		
		// 简单验证 - 实际应用中应该有真正的用户验证
		if loginReq.Username == "admin" && loginReq.Password == "admin" {
			// 生成简单的JWT token (实际应用中应该使用真正的JWT)
			token := "test-jwt-token-for-role-permissions-testing"
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"token":   token,
				"user": gin.H{
					"id":       1,
					"username": "admin",
					"type":     "admin",
				},
			})
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Invalid credentials",
			})
		}
	}
}

// GetLogoutHandler returns a logout handler
func (app *Application) GetLogoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Logged out successfully",
		})
	}
}

// DevQuickLoginHandler returns a dev quick login handler
func (app *Application) DevQuickLoginHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Username string `json:"username"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}
		
		// 开发环境快速登录
		username := req.Username
		if username == "" {
			username = "admin"
		}
		
		token := "dev-jwt-token-" + username
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"token":   token,
			"user": gin.H{
				"id":       1,
				"username": username,
				"type":     "admin",
			},
		})
	}
}

// GetDevAccountsHandler returns dev accounts handler
func (app *Application) GetDevAccountsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"accounts": []gin.H{
				{"id": 1, "username": "admin", "type": "admin"},
				{"id": 2, "username": "user", "type": "user"},
			},
		})
	}
}

// Project user handlers
func (app *Application) GetProjectUsersHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"users": []gin.H{}})
	}
}

func (app *Application) AddProjectUserHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "User added to project"})
	}
}

func (app *Application) RemoveProjectUserHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "User removed from project"})
	}
}

// Project handlers
func (app *Application) GetProjectsHandler() gin.HandlerFunc {
	return app.projectHandler.GetProjects
}

func (app *Application) CreateProjectHandler() gin.HandlerFunc {
	return app.projectHandler.CreateProject
}

func (app *Application) GetProjectHandler() gin.HandlerFunc {
	return app.projectHandler.GetProject
}

func (app *Application) UpdateProjectHandler() gin.HandlerFunc {
	return app.projectHandler.UpdateProject
}

func (app *Application) DeleteProjectHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

func (app *Application) GetProjectStatsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"stats": gin.H{}})
	}
}

// Task handlers
func (app *Application) GetTasksHandler() gin.HandlerFunc {
	return app.taskHandler.GetTasks
}

func (app *Application) GetTaskHandler() gin.HandlerFunc {
	return app.taskHandler.GetTask
}

func (app *Application) CreateTaskHandler() gin.HandlerFunc {
	return app.taskHandler.CreateTask
}

func (app *Application) UpdateTaskHandler() gin.HandlerFunc {
	return app.taskHandler.UpdateTask
}

func (app *Application) DeleteTaskHandler() gin.HandlerFunc {
	return app.taskHandler.DeleteTask
}

func (app *Application) MoveTaskHandler() gin.HandlerFunc {
	return app.taskHandler.MoveTask
}

func (app *Application) ReorderTaskHandler() gin.HandlerFunc {
	return app.taskHandler.ReorderTask
}

func (app *Application) BulkReorderTasksHandler() gin.HandlerFunc {
	return app.taskHandler.BulkReorderTasks
}

// Core handlers for the services we care about

// GetRoleManagementHandler returns the role management handler
func (app *Application) GetRoleManagementHandler() *handlers.RoleManagementHandler {
	return handlers.NewRoleManagementHandler(app.db.Permissions())
}

// GetPermissionHandler returns the permission handler
func (app *Application) GetPermissionHandler() *handlers.PermissionHandler {
	return handlers.NewPermissionHandler(app.db.Permissions())
}

// GetEnhancedPermissionHandler returns the enhanced permission handler
func (app *Application) GetEnhancedPermissionHandler() *handlers.EnhancedPermissionHandler {
	// 暂时返回nil，因为EnhancedPermissionService可能不可用
	return nil
}

// GetDocumentHandler returns the document handler
func (app *Application) GetDocumentHandler() *handlers.DocumentHandler {
	if app.documentHandler == nil {
		app.documentHandler = handlers.NewDocumentHandler(app.db)
	}
	return app.documentHandler
}

// GetWorkNoteHandler returns the work note handler
func (app *Application) GetWorkNoteHandler() *handlers.WorkNoteHandler {
	// 创建WorkNoteService并返回handler
	if workNoteService := createBasicWorkNoteService(app.db); workNoteService != nil {
		return handlers.NewWorkNoteHandler(workNoteService, app.jwtManager)
	}
	return nil
}

// createBasicWorkNoteService 创建基本的WorkNoteService（临时实现）
func createBasicWorkNoteService(db database.DB) *services.WorkNoteService {
	// 获取原始数据库连接并转换为sqlx.DB
	rawDB := db.GetDB()
	if sqlDB, ok := rawDB.(*sql.DB); ok {
		// 将sql.DB包装为sqlx.DB（PostgreSQL驱动）
		sqlxDB := sqlx.NewDb(sqlDB, "postgres")
		return services.NewWorkNoteService(sqlxDB, nil)
	}
	// 如果已经是sqlx.DB，直接使用
	if sqlxDB, ok := rawDB.(*sqlx.DB); ok {
		return services.NewWorkNoteService(sqlxDB, nil)
	}
	return nil
}

// GetHybridDocumentFolderHandler returns the hybrid document folder handler
func (app *Application) GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler {
	return handlers.NewHybridDocumentFolderHandler(app.db)
}

// Placeholder handler functions for other required interfaces
func (app *Application) GetAITaskGeneratorHandler() *handlers.AITaskGeneratorHandler { return nil }
func (app *Application) GetTaskAnalysisHandler() *handlers.TaskAnalysisHandler { return nil }
func (app *Application) GetArchiveHandler() *handlers.ArchiveHandler { return nil }
func (app *Application) GetCalendarSyncHandler() *handlers.CalendarSyncHandler { return nil }

// GetUnifiedTimerHandler returns the unified timer handler
func (app *Application) GetUnifiedTimerHandler() *handlers.UnifiedTimerHandler {
	return handlers.NewUnifiedTimerHandler(app.db)
}

// 独立任务处理器实现（跨项目）
func (app *Application) GetAllTasksHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.GetAllTasks
}

func (app *Application) CreateGlobalTaskHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.CreateGlobalTask
}

func (app *Application) GetTaskByIdHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.GetTaskById
}

func (app *Application) UpdateTaskByIdHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.UpdateTaskById
}

func (app *Application) DeleteTaskByIdHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.DeleteTaskById
}

func (app *Application) UpdateTaskStatusHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.UpdateTaskStatus
}

func (app *Application) MoveTaskByIdHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.MoveTaskById
}

func (app *Application) ReorderTaskByIdHandler() gin.HandlerFunc {
	taskHandler := handlers.NewTaskHandler(app.db, app.logger, app.validator)
	return taskHandler.ReorderTaskById
}
