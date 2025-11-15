package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/interfaces"
	"ai-project-backend/services"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// EnterpriseUserHandler handles HTTP requests for enterprise user management (RBAC v2)
// Manages users within a specific enterprise context
// REFACTORED: Now uses Service layer instead of direct DB access
type EnterpriseUserHandler struct {
	identityProvider     services.IdentityProvider
	enterpriseUserService services.EnterpriseUserManagementService
	validator            *validator.Validate
}

// NewEnterpriseUserHandler creates a new enterprise user handler
// REFACTORED: Now uses Service layer (Handler → Service → Repository pattern)
func NewEnterpriseUserHandler(
	identityProvider services.IdentityProvider,
	enterpriseUserService services.EnterpriseUserManagementService,
) *EnterpriseUserHandler {
	return &EnterpriseUserHandler{
		identityProvider:     identityProvider,
		enterpriseUserService: enterpriseUserService,
		validator:            validator.New(),
	}
}

// ListEnterpriseUsers retrieves a list of users in an enterprise with pagination
// @Summary List enterprise users
// @Description Get paginated list of all users in the enterprise
// @Tags enterprise-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param search query string false "Search by username or email"
// @Param status query string false "Filter by status (active/inactive)"
// @Success 200 {object} map[string]interface{} "List of enterprise users"
// @Failure 400 {object} map[string]interface{} "Bad request - Invalid enterprise ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Insufficient permissions"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/users [get]
// REFACTORED: Now uses Service layer (2 SQL violations eliminated: lines 154, 172)
func (h *EnterpriseUserHandler) ListEnterpriseUsers(c *gin.Context) {
	fmt.Printf("\n\n=== [NEW HANDLER] EnterpriseUserHandler.ListEnterpriseUsers CALLED ===\n\n")
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

	// Get enterprise ID from URL parameter
	enterpriseIDStr := c.Param("enterprise_id")
	enterpriseID, err := strconv.ParseUint(enterpriseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ENTERPRISE_ID",
				"message": "无效的企业ID",
			},
		})
		return
	}

	// Validate enterprise isolation (middleware should have already checked this)
	if !identity.IsSystemUser() {
		userEnterpriseID := identity.GetEnterpriseID()
		if userEnterpriseID == nil || *userEnterpriseID != uint(enterpriseID) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "ENTERPRISE_ISOLATION_VIOLATION",
					"message": "无权访问其他企业的数据",
				},
			})
			return
		}
	}

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

	// Build filters
	filters := database.EnterpriseUserFilters{
		EnterpriseID: uint(enterpriseID),
	}

	if search != "" {
		filters.Search = &search
	}

	if status != "" {
		filters.Status = &status
	}

	pagination := database.EnterpriseUserPagination{
		Page:     page,
		PageSize: pageSize,
	}

	// Call service
	fmt.Printf("🔍 [HANDLER DEBUG] About to call Service.ListEnterpriseUsers - EnterpriseID: %d\n", enterpriseID)
	result, err := h.enterpriseUserService.ListEnterpriseUsers(c.Request.Context(), filters, pagination)
	fmt.Printf("🔍 [HANDLER DEBUG] Service returned %d users\n", len(result.Users))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SERVICE_ERROR",
				"message": "查询企业用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format response
	users := make([]gin.H, 0, len(result.Users))
	for _, user := range result.Users {
		userData := gin.H{
			"user_id":            user.UserID,
			"username":           user.Username,
			"email":              user.Email,
			"user_type":          user.UserType,
			"status":             user.UserStatus,
			"enterprise_user_id": user.EnterpriseUserID,
			"enterprise_id":      user.EnterpriseID,
			"enterprise_status":  user.EnterpriseStatus,
			"created_at":         user.CreatedAt,
			"updated_at":         user.UpdatedAt,
		}

		if user.LastLoginAt != nil {
			userData["last_login_at"] = *user.LastLoginAt
		}

		users = append(users, userData)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users":         users,
			"total":         result.Total,
			"page":          result.Page,
			"page_size":     result.PageSize,
			"enterprise_id": result.EnterpriseID,
		},
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// InviteUserToEnterprise invites a user to join the enterprise
// @Summary Invite user to enterprise
// @Description Invite a new user to join the enterprise or add existing user
// @Tags enterprise-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param request body map[string]interface{} true "Invite user request"
// @Success 201 {object} map[string]interface{} "User invited successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 409 {object} map[string]interface{} "User already in enterprise"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/users [post]
// REFACTORED: Now uses Service layer (4 SQL violations eliminated: lines 274, 303, 335, 358)
func (h *EnterpriseUserHandler) InviteUserToEnterprise(c *gin.Context) {
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

	// Get enterprise ID from URL parameter
	enterpriseIDStr := c.Param("enterprise_id")
	enterpriseID, err := strconv.ParseUint(enterpriseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ENTERPRISE_ID",
				"message": "无效的企业ID",
				"details": err.Error(),
			},
		})
		return
	}

	// Validate enterprise isolation - non-system users can only access their own enterprise
	if !identity.IsSystemUser() {
		userEnterpriseID := identity.GetEnterpriseID()
		if userEnterpriseID == nil || *userEnterpriseID != uint(enterpriseID) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "ENTERPRISE_ISOLATION_VIOLATION",
					"message": "无权访问其他企业的数据",
				},
			})
			return
		}
	}

	// Parse request body
	var request struct {
		UserID  uint   `json:"user_id" binding:"required"`
		RoleIDs []uint `json:"role_ids"` // Optional: initial roles to assign (not yet implemented in Service)
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "请求参数格式错误",
				"details": err.Error(),
			},
		})
		return
	}

	// Call service
	inviteReq := services.InviteUserRequest{
		UserID: request.UserID,
	}

	result, err := h.enterpriseUserService.InviteUserToEnterprise(
		c.Request.Context(),
		uint(enterpriseID),
		inviteReq,
		identity.GetUserID(),
	)

	if err != nil {
		// Handle different error types
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "USER_NOT_FOUND",
					"message": "用户不存在",
				},
			})
			return
		}

		if err.Error()[:29] == "user is already a member of" {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "USER_ALREADY_IN_ENTERPRISE",
					"message": "用户已在该企业中",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SERVICE_ERROR",
				"message": "添加用户到企业失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Build response
	responseData := gin.H{
		"enterprise_user_id": result.EnterpriseUserID,
		"user_id":            result.UserID,
		"username":           result.Username,
		"email":              result.Email,
		"enterprise_id":      enterpriseID,
		"status":             "active",
	}

	message := fmt.Sprintf("用户成功添加到企业，由用户 ID: %d 执行", identity.GetUserID())
	if result.DefaultRoleID != nil {
		responseData["default_role_assigned"] = true
		responseData["default_role_id"] = *result.DefaultRoleID
		message += "（已自动分配默认角色：普通成员）"
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    responseData,
		"message": message,
	})
}

// GetEnterpriseUser retrieves detailed information about a specific enterprise user
// @Summary Get enterprise user
// @Description Get detailed information about a specific user in the enterprise
// @Tags enterprise-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param user_id path int true "User ID"
// @Success 200 {object} map[string]interface{} "Enterprise user details with roles"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/users/{user_id} [get]
// REFACTORED: Now uses Service layer (1 SQL violation eliminated: line 440)
func (h *EnterpriseUserHandler) GetEnterpriseUser(c *gin.Context) {
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

	// Get enterprise ID from URL parameter
	enterpriseIDStr := c.Param("enterprise_id")
	enterpriseID, err := strconv.ParseUint(enterpriseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ENTERPRISE_ID",
				"message": "无效的企业ID",
			},
		})
		return
	}

	// Get user ID from URL parameter
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_USER_ID",
				"message": "无效的用户ID",
			},
		})
		return
	}

	// Validate enterprise isolation (middleware should have already checked this)
	if !identity.IsSystemUser() {
		userEnterpriseID := identity.GetEnterpriseID()
		if userEnterpriseID == nil || *userEnterpriseID != uint(enterpriseID) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "ENTERPRISE_ISOLATION_VIOLATION",
					"message": "无权访问其他企业的数据",
				},
			})
			return
		}
	}

	// Call service
	userDetail, err := h.enterpriseUserService.GetEnterpriseUser(c.Request.Context(), uint(enterpriseID), uint(userID))
	if err != nil {
		if err.Error() == "user not found in enterprise" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "USER_NOT_FOUND",
					"message": "用户不存在或不属于该企业",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SERVICE_ERROR",
				"message": "查询用户详情失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format roles
	roleList := make([]gin.H, 0, len(userDetail.Roles))
	for _, role := range userDetail.Roles {
		roleData := gin.H{
			"id":          role.ID,
			"role_code":   role.RoleCode,
			"role_name":   role.RoleName,
			"is_active":   role.IsActive,
			"is_built_in": role.IsBuiltIn,
		}
		if role.Description != nil {
			roleData["description"] = *role.Description
		}
		roleList = append(roleList, roleData)
	}

	// Build response
	user := gin.H{
		"user_id":            userDetail.UserID,
		"username":           userDetail.Username,
		"email":              userDetail.Email,
		"user_type":          userDetail.UserType,
		"status":             userDetail.Status,
		"enterprise_user_id": userDetail.EnterpriseUserID,
		"enterprise_id":      userDetail.EnterpriseID,
		"enterprise_status":  userDetail.EnterpriseStatus,
		"roles":              roleList,
		"created_at":         userDetail.CreatedAt,
		"updated_at":         userDetail.UpdatedAt,
	}

	if userDetail.LastLoginAt != nil {
		user["last_login_at"] = *userDetail.LastLoginAt
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// UpdateEnterpriseUserRoles updates roles assigned to an enterprise user
// @Summary Update enterprise user roles
// @Description Update the roles assigned to a user within the enterprise
// @Tags enterprise-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param user_id path int true "User ID"
// @Param request body map[string]interface{} true "Update roles request"
// @Success 200 {object} map[string]interface{} "Roles updated successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/users/{user_id}/roles [put]
// REFACTORED: Now uses Service layer (1 SQL violation eliminated: line 577)
func (h *EnterpriseUserHandler) UpdateEnterpriseUserRoles(c *gin.Context) {
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

	// Get enterprise ID from URL parameter
	enterpriseIDStr := c.Param("enterprise_id")
	enterpriseID, err := strconv.ParseUint(enterpriseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ENTERPRISE_ID",
				"message": "无效的企业ID",
			},
		})
		return
	}

	// Get user ID from URL parameter
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_USER_ID",
				"message": "无效的用户ID",
			},
		})
		return
	}

	// Validate enterprise isolation
	if !identity.IsSystemUser() {
		userEnterpriseID := identity.GetEnterpriseID()
		if userEnterpriseID == nil || *userEnterpriseID != uint(enterpriseID) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "ENTERPRISE_ISOLATION_VIOLATION",
					"message": "无权访问其他企业的数据",
				},
			})
			return
		}
	}

	// Parse request body
	var request struct {
		RoleIDs []uint `json:"role_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "请求参数无效",
				"details": err.Error(),
			},
		})
		return
	}

	// Call service
	result, err := h.enterpriseUserService.UpdateEnterpriseUserRoles(
		c.Request.Context(),
		uint(enterpriseID),
		uint(userID),
		request.RoleIDs,
		identity.GetUserID(),
	)

	if err != nil {
		if err.Error() == "user not found in enterprise" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "USER_NOT_FOUND",
					"message": "用户不存在或不属于该企业",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SERVICE_ERROR",
				"message": "更新角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format roles
	roleList := make([]gin.H, 0, len(result.CurrentRoles))
	for _, role := range result.CurrentRoles {
		roleData := gin.H{
			"id":          role.ID,
			"role_code":   role.RoleCode,
			"role_name":   role.RoleName,
			"is_active":   role.IsActive,
			"is_built_in": role.IsBuiltIn,
		}
		if role.Description != nil {
			roleData["description"] = *role.Description
		}
		roleList = append(roleList, roleData)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":       userID,
			"enterprise_id": enterpriseID,
			"roles":         roleList,
			"roles_added":   result.RolesAdded,
			"roles_removed": result.RolesRemoved,
		},
		"message": fmt.Sprintf("角色更新成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// RemoveEnterpriseUser removes a user from the enterprise
// @Summary Remove user from enterprise
// @Description Remove a user's access to the enterprise
// @Tags enterprise-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param user_id path int true "User ID"
// @Success 200 {object} map[string]interface{} "User removed successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/users/{user_id} [delete]
// REFACTORED: Now uses Service layer (2 SQL violations eliminated: lines 729, 781)
func (h *EnterpriseUserHandler) RemoveEnterpriseUser(c *gin.Context) {
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

	// Get enterprise ID from URL parameter
	enterpriseIDStr := c.Param("enterprise_id")
	enterpriseID, err := strconv.ParseUint(enterpriseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ENTERPRISE_ID",
				"message": "无效的企业ID",
				"details": err.Error(),
			},
		})
		return
	}

	// Get user ID from URL parameter
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_USER_ID",
				"message": "无效的用户ID",
				"details": err.Error(),
			},
		})
		return
	}

	// Validate enterprise isolation - non-system users can only access their own enterprise
	if !identity.IsSystemUser() {
		userEnterpriseID := identity.GetEnterpriseID()
		if userEnterpriseID == nil || *userEnterpriseID != uint(enterpriseID) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "ENTERPRISE_ISOLATION_VIOLATION",
					"message": "无权访问其他企业的数据",
				},
			})
			return
		}
	}

	// Prevent users from removing themselves
	if !identity.IsSystemUser() && identity.GetUserID() == uint(userID) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CANNOT_REMOVE_SELF",
				"message": "不能移除自己的企业成员身份",
			},
		})
		return
	}

	// Call service
	result, err := h.enterpriseUserService.RemoveEnterpriseUser(
		c.Request.Context(),
		uint(enterpriseID),
		uint(userID),
		identity.GetUserID(),
	)

	if err != nil {
		if err.Error() == "user not found in enterprise" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "ENTERPRISE_USER_NOT_FOUND",
					"message": "用户不在该企业中",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "SERVICE_ERROR",
				"message": "删除企业用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("用户 '%s' 已从企业中移除，由用户 ID: %d 执行", result.Username, identity.GetUserID()),
		"data": gin.H{
			"enterprise_user_id": result.EnterpriseUserID,
			"user_id":            result.UserID,
			"username":           result.Username,
			"removed_roles":      result.RemovedRoles,
		},
	})
}
