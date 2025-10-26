package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/services"
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// SystemAdminHandler handles HTTP requests for system administrator management
type SystemAdminHandler struct {
	systemAdminService *services.SystemAdminService
	validator          *validator.Validate
}

// NewSystemAdminHandler creates a new system admin handler
func NewSystemAdminHandler(db *sql.DB) *SystemAdminHandler {
	return &SystemAdminHandler{
		systemAdminService: services.NewSystemAdminService(db),
		validator:          validator.New(),
	}
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
