package handlers

import (
	"ai-project-backend/interfaces"
	"ai-project-backend/services"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// SystemUserHandler handles HTTP requests for system user management (RBAC v2)
type SystemUserHandler struct {
	identityProvider services.IdentityProvider
	userMgmtService  services.UserManagementService
	validator        *validator.Validate
}

// NewSystemUserHandler creates a new system user handler
func NewSystemUserHandler(userMgmtService services.UserManagementService, identityProvider services.IdentityProvider) *SystemUserHandler {
	return &SystemUserHandler{
		userMgmtService:  userMgmtService,
		identityProvider: identityProvider,
		validator:        validator.New(),
	}
}

// ListSystemUsers retrieves a list of system users with pagination
// @Summary List system users
// @Description Get paginated list of all system users
// @Tags system-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param search query string false "Search by username or email"
// @Param status query string false "Filter by status (active/inactive)"
// @Success 200 {object} map[string]interface{} "List of system users"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - System admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/users [get]
func (h *SystemUserHandler) ListSystemUsers(c *gin.Context) {
	// Get user identity from context (set by middleware)
	identityRaw, exists := c.Get("user_identity")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "用户未认证",
			},
		})
		return
	}

	identity := identityRaw.(interfaces.UserIdentity)

	// Parse query parameters
	page := 1
	pageSize := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	search := c.Query("search")
	status := c.Query("status")

	// Call service to list users
	filters := services.SystemUserFilters{
		Search: search,
		Status: status,
	}

	pagination := services.Pagination{
		Page:     page,
		PageSize: pageSize,
	}

	result, err := h.userMgmtService.ListSystemUsers(c.Request.Context(), filters, pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SERVICE_ERROR",
				"message": "查询系统用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Convert service result to HTTP response format
	users := make([]gin.H, len(result.Users))
	for i, user := range result.Users {
		users[i] = gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"role":       user.Role,
			"status":     user.Status,
			"created_at": user.CreatedAt,
			"updated_at": user.UpdatedAt,
		}

		if user.LastLoginAt != nil {
			users[i]["last_login_at"] = *user.LastLoginAt
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users":       users,
			"total":       result.Total,
			"page":        result.Page,
			"page_size":   result.PageSize,
			"total_pages": result.TotalPages,
		},
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// CreateSystemUser creates a new system user
// @Summary Create system user
// @Description Create a new system user with specified roles
// @Tags system-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body map[string]interface{} true "Create system user request"
// @Success 201 {object} map[string]interface{} "Created system user"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 409 {object} map[string]interface{} "User already exists"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/users [post]
func (h *SystemUserHandler) CreateSystemUser(c *gin.Context) {
	// Get user identity from context (set by middleware)
	identityRaw, exists := c.Get("user_identity")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "用户未认证",
			},
		})
		return
	}

	identity := identityRaw.(interfaces.UserIdentity)

	// Parse request
	var request struct {
		Username string   `json:"username" binding:"required"`
		Email    string   `json:"email" binding:"required,email"`
		Password *string  `json:"password"` // Optional, can be set later
		Role     string   `json:"role" binding:"required"`
		Status   *string  `json:"status"`
		RoleIDs  []uint   `json:"role_ids"` // Optional system roles to assign
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "请求参数验证失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Set default password if not provided
	password := ""
	if request.Password != nil {
		password = *request.Password
	} else {
		// Generate a random password if not provided
		password = "ChangeMe123!" // Default temporary password
	}

	// Set default status
	status := "active"
	if request.Status != nil {
		status = *request.Status
	}

	// Create service request
	serviceReq := &services.CreateSystemUserRequest{
		Username: request.Username,
		Email:    request.Email,
		Password: password,
		Role:     request.Role,
		Status:   status,
	}

	// Call service to create user
	userDetail, err := h.userMgmtService.CreateSystemUser(c.Request.Context(), serviceReq)
	if err != nil {
		// Check if it's a conflict error
		statusCode := http.StatusInternalServerError
		errorCode := "CREATION_FAILED"

		errMsg := err.Error()
		if strings.Contains(errMsg, "already exists") || strings.Contains(errMsg, "exists") {
			statusCode = http.StatusConflict
			if strings.Contains(errMsg, "username") {
				errorCode = "USERNAME_EXISTS"
			} else if strings.Contains(errMsg, "email") {
				errorCode = "EMAIL_EXISTS"
			}
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error": gin.H{
				"code":    errorCode,
				"message": "创建系统用户失败",
				"details": errMsg,
			},
		})
		return
	}

	// Optionally assign system roles if provided
	assignedRolesCount := 0
	if len(request.RoleIDs) > 0 {
		roleResult, err := h.userMgmtService.UpdateSystemUserRoles(
			c.Request.Context(),
			userDetail.ID,
			request.RoleIDs,
			uint(identity.GetUserID()),
		)
		if err == nil {
			assignedRolesCount = roleResult.RolesAdded
		}
		// Silently ignore role assignment errors for now
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":                   userDetail.ID,
			"username":             userDetail.Username,
			"email":                userDetail.Email,
			"user_type":            userDetail.UserType,
			"role":                 userDetail.Role,
			"status":               userDetail.Status,
			"created_at":           userDetail.CreatedAt,
			"updated_at":           userDetail.UpdatedAt,
			"assigned_roles_count": assignedRolesCount,
		},
		"message": fmt.Sprintf("系统用户创建成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// GetSystemUser retrieves detailed information about a specific system user
// @Summary Get system user
// @Description Get detailed information about a specific system user by ID
// @Tags system-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param user_id path int true "User ID"
// @Success 200 {object} map[string]interface{} "System user details"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/users/{user_id} [get]
func (h *SystemUserHandler) GetSystemUser(c *gin.Context) {
	// Get user identity from context (set by middleware)
	identityRaw, exists := c.Get("user_identity")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "用户未认证",
			},
		})
		return
	}

	identity := identityRaw.(interfaces.UserIdentity)

	// Parse user_id from path
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_USER_ID",
				"message": "用户ID格式无效",
			},
		})
		return
	}

	// Call service to get user
	userDetail, err := h.userMgmtService.GetSystemUser(c.Request.Context(), uint(userID))
	if err != nil {
		// Check if it's a not found error
		statusCode := http.StatusInternalServerError
		errorCode := "SERVICE_ERROR"

		if strings.Contains(err.Error(), "not found") {
			statusCode = http.StatusNotFound
			errorCode = "USER_NOT_FOUND"
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error": gin.H{
				"code":    errorCode,
				"message": fmt.Sprintf("获取系统用户失败: %v", err),
			},
		})
		return
	}

	// Build user data response
	userData := gin.H{
		"id":           userDetail.ID,
		"username":     userDetail.Username,
		"email":        userDetail.Email,
		"user_type":    userDetail.UserType,
		"role":         userDetail.Role,
		"status":       userDetail.Status,
		"role_ids":     userDetail.RoleIDs,
		"created_at":   userDetail.CreatedAt,
		"updated_at":   userDetail.UpdatedAt,
	}

	if userDetail.LastLoginAt != nil {
		userData["last_login_at"] = *userDetail.LastLoginAt
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    userData,
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// UpdateSystemUserRoles updates roles assigned to a system user
// @Summary Update system user roles
// @Description Update the roles assigned to a system user
// @Tags system-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param user_id path int true "User ID"
// @Param request body map[string]interface{} true "Update roles request"
// @Success 200 {object} map[string]interface{} "Roles updated successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/users/{user_id}/roles [put]
func (h *SystemUserHandler) UpdateSystemUserRoles(c *gin.Context) {
	// Get user identity from context (set by middleware)
	identityRaw, exists := c.Get("user_identity")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "用户未认证",
			},
		})
		return
	}

	identity := identityRaw.(interfaces.UserIdentity)

	// Parse user_id from path
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_USER_ID",
				"message": "用户ID格式无效",
			},
		})
		return
	}

	// Parse request
	var request struct {
		RoleIDs []uint `json:"role_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "请求参数验证失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Call service to update roles (this solves the N+1 problem!)
	result, err := h.userMgmtService.UpdateSystemUserRoles(
		c.Request.Context(),
		uint(userID),
		request.RoleIDs,
		uint(identity.GetUserID()),
	)
	if err != nil {
		// Check error type
		statusCode := http.StatusInternalServerError
		errorCode := "SERVICE_ERROR"

		errMsg := err.Error()
		if strings.Contains(errMsg, "not found") {
			statusCode = http.StatusNotFound
			errorCode = "USER_NOT_FOUND"
		} else if strings.Contains(errMsg, "locked") {
			statusCode = http.StatusForbidden
			errorCode = "USER_LOCKED"
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error": gin.H{
				"code":    errorCode,
				"message": "更新角色失败",
				"details": errMsg,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":       result.UserID,
			"username":      result.Username,
			"roles_added":   result.RolesAdded,
			"roles_removed": result.RolesRemoved,
			"current_roles": result.CurrentRoles,
			"total_roles":   len(result.CurrentRoles),
			"updated_at":    result.UpdatedAt,
		},
		"message": result.Message,
	})
}

// UpdateSystemUserStatus updates the status of a system user
// @Summary Update system user status
// @Description Update the status of a system user (active/inactive/suspended)
// @Tags system-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param user_id path int true "User ID"
// @Param request body map[string]interface{} true "Update status request"
// @Success 200 {object} map[string]interface{} "Status updated successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/users/{user_id}/status [put]
func (h *SystemUserHandler) UpdateSystemUserStatus(c *gin.Context) {
	// Get user identity from context (set by middleware)
	identityRaw, exists := c.Get("user_identity")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "用户未认证",
			},
		})
		return
	}

	identity := identityRaw.(interfaces.UserIdentity)

	// Parse user_id from path
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_USER_ID",
				"message": "用户ID格式无效",
			},
		})
		return
	}

	// Parse request
	var request struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "请求参数验证失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Prevent self-suspension or self-deactivation
	if !identity.IsSystemUser() || identity.GetUserID() == uint(userID) {
		if request.Status != "active" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "CANNOT_MODIFY_SELF_STATUS",
					"message": "不能修改自己的账号状态为非活跃",
				},
			})
			return
		}
	}

	// Call service to update status
	result, err := h.userMgmtService.UpdateSystemUserStatus(
		c.Request.Context(),
		uint(userID),
		request.Status,
		uint(identity.GetUserID()),
	)
	if err != nil {
		// Check error type
		statusCode := http.StatusInternalServerError
		errorCode := "SERVICE_ERROR"

		errMsg := err.Error()
		if strings.Contains(errMsg, "not found") {
			statusCode = http.StatusNotFound
			errorCode = "USER_NOT_FOUND"
		} else if strings.Contains(errMsg, "invalid status") {
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_STATUS"
		} else if strings.Contains(errMsg, "already has status") {
			statusCode = http.StatusBadRequest
			errorCode = "STATUS_UNCHANGED"
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error": gin.H{
				"code":    errorCode,
				"message": "更新状态失败",
				"details": errMsg,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":         result.UserID,
			"username":        result.Username,
			"previous_status": result.OldStatus,
			"new_status":      result.NewStatus,
			"updated_at":      result.UpdatedAt,
		},
		"message": result.Message,
	})
}
