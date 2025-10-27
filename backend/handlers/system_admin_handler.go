package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// SystemAdminHandler handles HTTP requests for system administrator management
type SystemAdminHandler struct {
	systemAdminService *services.SystemAdminService
	db                 database.DB
	validator          *validator.Validate
}

// NewSystemAdminHandler creates a new system admin handler
func NewSystemAdminHandler(db *sql.DB) *SystemAdminHandler {
	return &SystemAdminHandler{
		systemAdminService: services.NewSystemAdminService(db),
		validator:          validator.New(),
	}
}

// SetDB sets the database.DB interface for handler operations
// This is needed for accessing Tasks and Projects repositories
func (h *SystemAdminHandler) SetDB(db database.DB) {
	h.db = db
}

// GrantSystemAdmin grants system administrator privileges to a user
// @Summary Grant system admin
// @Description Grant system administrator privileges to a user
// @Tags system-admin
// @Accept json
// @Produce json
// @Param request body services.GrantSystemAdminRequest true "Grant request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/system/admins/grant [post]
func (h *SystemAdminHandler) GrantSystemAdmin(c *gin.Context) {
	var req services.GrantSystemAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get operator info from context (set by auth middleware)
	operatorUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	operatorUsername, _ := c.Get("username")

	// Set operator information
	req.OperatorUserID = operatorUserID.(int)
	if operatorUsername != nil {
		req.OperatorUsername = operatorUsername.(string)
	}

	// Validate admin_scopes
	if err := services.ValidateAdminScopes(req.AdminScopes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid admin_scopes",
			"details": err.Error(),
		})
		return
	}

	// Grant admin privileges
	if err := h.systemAdminService.GrantSystemAdmin(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to grant system admin privileges",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "System admin privileges granted successfully",
		"data": gin.H{
			"target_user_id": req.TargetUserID,
			"admin_level":    req.AdminLevel,
		},
	})
}

// GrantScopedAdmin grants scoped system administrator privileges
// @Summary Grant scoped admin
// @Description Grant system admin privileges with specific project scope
// @Tags system-admin
// @Accept json
// @Produce json
// @Param request body services.GrantScopedAdminRequest true "Grant scoped request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/system/admins/grant-scoped [post]
func (h *SystemAdminHandler) GrantScopedAdmin(c *gin.Context) {
	var req services.GrantScopedAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get operator info from context
	operatorUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	operatorUsername, _ := c.Get("username")

	// Set operator information
	req.OperatorUserID = operatorUserID.(int)
	if operatorUsername != nil {
		req.OperatorUsername = operatorUsername.(string)
	}

	// Grant scoped admin
	if err := h.systemAdminService.GrantScopedAdmin(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to grant scoped admin privileges",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Scoped admin privileges granted successfully",
		"data": gin.H{
			"target_user_id": req.TargetUserID,
			"admin_level":    req.AdminLevel,
			"scope_type":     req.ScopeType,
			"project_count":  len(req.ProjectIDs),
		},
	})
}

// RevokeSystemAdmin revokes system administrator privileges from a user
// @Summary Revoke system admin
// @Description Revoke system administrator privileges from a user
// @Tags system-admin
// @Accept json
// @Produce json
// @Param request body services.RevokeSystemAdminRequest true "Revoke request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/system/admins/revoke [post]
func (h *SystemAdminHandler) RevokeSystemAdmin(c *gin.Context) {
	var req services.RevokeSystemAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get operator info from context
	operatorUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	operatorUsername, _ := c.Get("username")

	// Set operator information
	req.OperatorUserID = operatorUserID.(int)
	if operatorUsername != nil {
		req.OperatorUsername = operatorUsername.(string)
	}

	// Revoke admin privileges
	if err := h.systemAdminService.RevokeSystemAdmin(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to revoke system admin privileges",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "System admin privileges revoked successfully",
		"data": gin.H{
			"target_user_id": req.TargetUserID,
			"reason":         req.Reason,
		},
	})
}

// ListSystemAdmins retrieves list of system administrators
// @Summary List system admins
// @Description Get list of all active system administrators
// @Tags system-admin
// @Produce json
// @Param min_level query int false "Minimum admin level"
// @Param max_level query int false "Maximum admin level"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/system/admins [get]
func (h *SystemAdminHandler) ListSystemAdmins(c *gin.Context) {
	// Check if user is authenticated
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	// Parse query parameters
	filters := database.SystemAdminFilters{}
	if minLevelStr := c.Query("min_level"); minLevelStr != "" {
		if minLevel, err := strconv.Atoi(minLevelStr); err == nil {
			filters.MinAdminLevel = minLevel
		}
	}

	if maxLevelStr := c.Query("max_level"); maxLevelStr != "" {
		if maxLevel, err := strconv.Atoi(maxLevelStr); err == nil {
			filters.MaxAdminLevel = maxLevel
		}
	}

	// Get system admins
	admins, err := h.systemAdminService.ListSystemAdmins(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list system admins",
			"details": err.Error(),
		})
		return
	}

	// Format response
	adminList := make([]gin.H, 0, len(admins))
	for _, admin := range admins {
		adminList = append(adminList, gin.H{
			"user_id":       admin.UserID,
			"username":      admin.Username,
			"email":         admin.Email,
			"admin_level":   admin.AdminLevel,
			"admin_level_name": services.GetAdminLevelName(admin.AdminLevel),
			"scope_summary": services.FormatAdminScopeSummary(admin.AdminScopes),
			"activated_at":  admin.AdminActivatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"admins": adminList,
			"total":  len(adminList),
		},
	})
}

// CheckCurrentUser checks if current user is a system administrator
// @Summary Check current user
// @Description Check if the current authenticated user is a system administrator
// @Tags system-admin
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/v1/system/admins/check [get]
func (h *SystemAdminHandler) CheckCurrentUser(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	// Check if user is system admin
	adminInfo, err := h.systemAdminService.CheckSystemAdmin(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success":        false,
			"is_system_admin": false,
			"message":        "User is not a system administrator",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"is_system_admin": true,
		"data": gin.H{
			"user_id":       adminInfo.UserID,
			"username":      adminInfo.Username,
			"admin_level":   adminInfo.AdminLevel,
			"admin_level_name": services.GetAdminLevelName(adminInfo.AdminLevel),
			"scope_summary": services.FormatAdminScopeSummary(adminInfo.AdminScopes),
		},
	})
}

// GetAccessibleProjects gets list of projects accessible to an admin
// @Summary Get accessible projects
// @Description Get list of projects that an admin can access
// @Tags system-admin
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/v1/system/admins/{id}/accessible-projects [get]
func (h *SystemAdminHandler) GetAccessibleProjects(c *gin.Context) {
	// Check authentication
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	// Parse user ID from path
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	// Get admin info
	adminInfo, err := h.systemAdminService.CheckSystemAdmin(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User is not a system administrator",
		})
		return
	}

	// Get accessible projects
	projectIDs, err := h.systemAdminService.GetAccessibleProjects(c.Request.Context(), adminInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get accessible projects",
			"details": err.Error(),
		})
		return
	}

	// Check if global scope
	isGlobal := len(projectIDs) == 0 // Empty array means all projects

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":      userID,
			"is_global":    isGlobal,
			"project_ids":  projectIDs,
			"project_count": len(projectIDs),
		},
	})
}

// GetAuditLogs retrieves system admin audit logs
// @Summary Get audit logs
// @Description Get audit logs for system admin operations
// @Tags system-admin
// @Produce json
// @Param target_user_id query int false "Filter by target user ID"
// @Param operator_user_id query int false "Filter by operator user ID"
// @Param limit query int false "Limit (default 20)"
// @Param offset query int false "Offset (default 0)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/system/admins/audit-logs [get]
func (h *SystemAdminHandler) GetAuditLogs(c *gin.Context) {
	// Check authentication
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	// Parse query parameters
	filters := database.AuditLogFilters{
		Limit:  20,
		Offset: 0,
	}

	if targetUserIDStr := c.Query("target_user_id"); targetUserIDStr != "" {
		if targetUserID, err := strconv.Atoi(targetUserIDStr); err == nil {
			filters.TargetUserID = targetUserID
		}
	}

	if operatorUserIDStr := c.Query("operator_user_id"); operatorUserIDStr != "" {
		if operatorUserID, err := strconv.Atoi(operatorUserIDStr); err == nil {
			filters.OperatorUserID = operatorUserID
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filters.Limit = limit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filters.Offset = offset
		}
	}

	// Get audit logs
	logs, total, err := h.systemAdminService.GetAuditLogs(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get audit logs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"logs":   logs,
			"total":  total,
			"limit":  filters.Limit,
			"offset": filters.Offset,
		},
	})
}

// UpdateTaskProject updates the project_id of a task (System Admin Only)
// @Summary Update task project
// @Description Change the project that a task belongs to (System administrators only)
// @Tags system-admin,tasks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param taskId path int true "Task ID"
// @Param request body models.UpdateTaskProjectRequest true "Update task project request"
// @Success 200 {object} models.APIResponse "Task project updated successfully"
// @Failure 400 {object} models.APIResponse "Bad request"
// @Failure 401 {object} models.APIResponse "Unauthorized"
// @Failure 403 {object} models.APIResponse "Forbidden - System admin only"
// @Failure 404 {object} models.APIResponse "Task or project not found"
// @Failure 500 {object} models.APIResponse "Internal server error"
// @Router /admin/tasks/{taskId}/project [put]
func (h *SystemAdminHandler) UpdateTaskProject(c *gin.Context) {
	ctx := c.Request.Context()

	// Step 1: Parse task ID from URL parameter
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "invalid_task_id",
				"message": "任务ID必须是有效的数字",
				"details": err.Error(),
			},
		})
		return
	}

	// Step 2: Parse and validate request body
	var req struct {
		NewProjectID int     `json:"new_project_id" binding:"required"`
		Reason       *string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "invalid_request",
				"message": "请求格式不正确",
				"details": err.Error(),
			},
		})
		return
	}

	// Step 3: Check if database interface is available
	if h.db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "internal_error",
				"message": "数据库接口未初始化",
			},
		})
		return
	}

	// Step 3.1: Begin database transaction for data consistency
	// All database operations (read and write) are wrapped in transaction
	tx, err := h.db.BeginTx(ctx)
	if err != nil {
		log.Printf("[ERROR] Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "transaction_error",
				"message": "无法开始数据库事务",
				"details": err.Error(),
			},
		})
		return
	}

	// Ensure transaction is rolled back on error (Rollback after Commit is safe no-op)
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			log.Printf("[ERROR] Panic in UpdateTaskProject, rolled back transaction: %v", p)
			panic(p) // re-throw panic after rollback
		}
	}()

	// Step 4: Get current task information (within transaction for read consistency)
	currentTask, err := tx.Tasks().GetByID(ctx, taskID)
	if err != nil {
		_ = tx.Rollback()
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "task_not_found",
					"message": "任务不存在",
					"task_id": taskID,
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "database_error",
				"message": "查询任务失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Step 5: Validate target project exists (within transaction)
	targetProject, err := tx.Projects().GetByID(ctx, req.NewProjectID)
	if err != nil {
		_ = tx.Rollback()
		if err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error": gin.H{
					"code":       "project_not_found",
					"message":    "目标项目不存在",
					"project_id": req.NewProjectID,
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "database_error",
				"message": "查询项目失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Step 6: Record old project ID and get old project name for audit log
	oldProjectID := currentTask.ProjectID

	// Get old project information for audit log
	oldProject, err := tx.Projects().GetByID(ctx, oldProjectID)
	if err != nil {
		_ = tx.Rollback()
		log.Printf("[ERROR] Failed to query old project (id=%d): %v", oldProjectID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "database_error",
				"message": "查询原项目信息失败",
				"details": err.Error(),
			},
		})
		return
	}
	oldProjectName := oldProject.Name

	// Check if project is actually changing
	if oldProjectID == req.NewProjectID {
		_ = tx.Rollback() // No changes needed, rollback transaction
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"task_id":        taskID,
				"old_project_id": oldProjectID,
				"new_project_id": req.NewProjectID,
				"message":        "任务已在目标项目中",
			},
		})
		return
	}

	// Step 7: Update task project_id within transaction
	currentTask.ProjectID = req.NewProjectID
	_, err = tx.Tasks().Update(ctx, currentTask)
	if err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "update_failed",
				"message": "更新任务项目失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Step 7.1: Create persistent audit log entry within same transaction
	// Get user information from context (set by auth middleware)
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	userRole, _ := c.Get("user_role")

	// Prepare audit log details
	auditDescription := fmt.Sprintf("任务 #%d '%s' 从项目 #%d '%s' 移动到项目 #%d '%s'",
		taskID, currentTask.Title, oldProjectID, oldProjectName, req.NewProjectID, targetProject.Name)

	if req.Reason != nil && *req.Reason != "" {
		auditDescription += fmt.Sprintf(" (原因: %s)", *req.Reason)
	}

	// Create audit log entry
	auditLog := &models.AuditLog{
		Timestamp:    time.Now(),
		UserID:       userID.(*int),
		UserName:     username.(string),
		UserRole:     userRole.(string),
		Action:       "task_project_change",
		ResourceType: "task",
		ResourceID:   fmt.Sprintf("%d", taskID),
		ResourceName: currentTask.Title,
		Description:  auditDescription,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
		RequestID:    c.GetString("request_id"),
		Status:       "success",
		Changes: map[string]interface{}{
			"old_project_id":   oldProjectID,
			"old_project_name": oldProjectName,
			"new_project_id":   req.NewProjectID,
			"new_project_name": targetProject.Name,
			"task_id":          taskID,
			"task_title":       currentTask.Title,
			"reason":           req.Reason,
		},
	}

	// Write audit log to database within transaction
	err = tx.Audit().CreateAuditLog(ctx, auditLog)
	if err != nil {
		_ = tx.Rollback()
		log.Printf("[ERROR] Failed to create audit log: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "audit_log_failed",
				"message": "创建审计日志失败",
				"details": err.Error(),
			},
		})
		return
	}

	log.Printf("[AUDIT] Successfully created audit log for task_project_change: task_id=%d, user=%s", taskID, username)

	// Step 8: Commit transaction (includes task update AND audit log)
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "commit_failed",
				"message": "提交事务失败",
				"details": err.Error(),
			},
		})
		return
	}
	// Step 9: Return success response with comprehensive information
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task_id":          taskID,
			"task_title":       currentTask.Title,
			"old_project_id":   oldProjectID,
			"new_project_id":   req.NewProjectID,
			"new_project_name": targetProject.Name,
			"updated_at":       currentTask.UpdatedAt,
		},
		"message": "任务项目已成功更新",
	})
}
