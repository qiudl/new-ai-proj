package handlers

import (
	"ai-project-backend/interfaces"
	"ai-project-backend/services"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// EnterpriseUserHandler handles HTTP requests for enterprise user management (RBAC v2)
// Manages users within a specific enterprise context
type EnterpriseUserHandler struct {
	identityProvider     services.IdentityProvider
	enterpriseRoleRepo   interfaces.EnterpriseRoleRepository
	db                   *sql.DB
	validator            *validator.Validate
}

// NewEnterpriseUserHandler creates a new enterprise user handler
func NewEnterpriseUserHandler(
	db *sql.DB,
	identityProvider services.IdentityProvider,
	enterpriseRoleRepo interfaces.EnterpriseRoleRepository,
) *EnterpriseUserHandler {
	return &EnterpriseUserHandler{
		db:                   db,
		identityProvider:     identityProvider,
		enterpriseRoleRepo:   enterpriseRoleRepo,
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
func (h *EnterpriseUserHandler) ListEnterpriseUsers(c *gin.Context) {
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

	// Query enterprise users from database
	// Join with users table to get user details
	query := `
		SELECT
			u.id, u.username, u.email, u.user_type, u.status,
			eu.id as enterprise_user_id, eu.enterprise_id, eu.status as enterprise_status,
			u.created_at, u.updated_at, u.last_login_at
		FROM enterprise_users eu
		JOIN users u ON eu.user_id = u.id
		WHERE eu.enterprise_id = $1
		AND eu.deleted_at IS NULL
		AND u.deleted_at IS NULL
	`

	var args []interface{}
	args = append(args, enterpriseID)
	argIndex := 2

	if search != "" {
		query += fmt.Sprintf(" AND (u.username ILIKE $%d OR u.email ILIKE $%d)", argIndex, argIndex+1)
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
		argIndex += 2
	}

	if status != "" {
		query += fmt.Sprintf(" AND eu.status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM (" + query + ") AS filtered_users"
	var total int
	err = h.db.QueryRowContext(c.Request.Context(), countQuery, args...).Scan(&total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询企业用户总数失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Add pagination
	query += fmt.Sprintf(" ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, pageSize, (page-1)*pageSize)

	// Execute query
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询企业用户列表失败",
				"details": err.Error(),
			},
		})
		return
	}
	defer rows.Close()

	users := make([]gin.H, 0)
	for rows.Next() {
		var (
			userID             uint
			username           string
			email              string
			userType           string
			userStatus         string
			enterpriseUserID   uint
			entID              uint
			enterpriseStatus   string
			createdAt          string
			updatedAt          string
			lastLoginAt        sql.NullString
		)

		err := rows.Scan(
			&userID, &username, &email, &userType, &userStatus,
			&enterpriseUserID, &entID, &enterpriseStatus,
			&createdAt, &updatedAt, &lastLoginAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "DATABASE_ERROR",
					"message": "读取企业用户数据失败",
					"details": err.Error(),
				},
			})
			return
		}

		user := gin.H{
			"user_id":             userID,
			"username":            username,
			"email":               email,
			"user_type":           userType,
			"status":              userStatus,
			"enterprise_user_id":  enterpriseUserID,
			"enterprise_id":       entID,
			"enterprise_status":   enterpriseStatus,
			"created_at":          createdAt,
			"updated_at":          updatedAt,
		}

		if lastLoginAt.Valid {
			user["last_login_at"] = lastLoginAt.String
		}

		users = append(users, user)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users":        users,
			"total":        total,
			"page":         page,
			"page_size":    pageSize,
			"enterprise_id": enterpriseID,
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
		RoleIDs []uint `json:"role_ids"` // Optional: initial roles to assign
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

	// Check if user exists in users table
	var username, email string
	var userType string
	checkUserQuery := `
		SELECT COALESCE(username, ''), COALESCE(email, ''), user_type
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = h.db.QueryRowContext(c.Request.Context(), checkUserQuery, request.UserID).Scan(&username, &email, &userType)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": "用户不存在",
			},
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "检查用户是否存在失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Check if user is already in enterprise
	var existingEnterpriseUserID sql.NullInt64
	checkMembershipQuery := `
		SELECT id FROM enterprise_users
		WHERE enterprise_id = $1 AND user_id = $2 AND deleted_at IS NULL
	`
	err = h.db.QueryRowContext(c.Request.Context(), checkMembershipQuery, enterpriseID, request.UserID).Scan(&existingEnterpriseUserID)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "检查用户企业关系失败",
				"details": err.Error(),
			},
		})
		return
	}

	if existingEnterpriseUserID.Valid {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_ALREADY_IN_ENTERPRISE",
				"message": "用户已在该企业中",
				"details": fmt.Sprintf("企业用户ID: %d", existingEnterpriseUserID.Int64),
			},
		})
		return
	}

	// Get default role ID (member role) for this enterprise
	var defaultRoleID sql.NullInt64
	getDefaultRoleQuery := `
		SELECT id FROM enterprise_roles
		WHERE enterprise_id = $1 AND code = 'member' AND is_active = TRUE AND deleted_at IS NULL
		LIMIT 1
	`
	err = h.db.QueryRowContext(c.Request.Context(), getDefaultRoleQuery, enterpriseID).Scan(&defaultRoleID)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询默认角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Create enterprise_users record with default role
	createdBy := identity.GetUserID()
	var enterpriseUserID uint
	createEnterpriseUserQuery := `
		INSERT INTO enterprise_users (
			enterprise_id, user_id, username, email, role_id, status, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, 'active', $6, NOW(), NOW()
		) RETURNING id
	`
	err = h.db.QueryRowContext(c.Request.Context(), createEnterpriseUserQuery,
		enterpriseID,
		request.UserID,
		username,      // From users table
		email,         // From users table
		defaultRoleID, // Automatically assign member role
		createdBy,
	).Scan(&enterpriseUserID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "创建企业用户记录失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Assign initial roles if provided
	assignedRoles := 0
	if len(request.RoleIDs) > 0 {
		assignedBy := identity.GetUserID()
		for _, roleID := range request.RoleIDs {
			// Verify role belongs to this enterprise
			role, err := h.enterpriseRoleRepo.GetRoleByID(c.Request.Context(), roleID)
			if err != nil || role.EnterpriseID != uint(enterpriseID) {
				// Skip invalid roles
				continue
			}

			// Assign role to user
			err = h.enterpriseRoleRepo.AssignRoleToUser(
				c.Request.Context(),
				enterpriseUserID,
				uint(enterpriseID),
				roleID,
				nil, // no expiration
				&assignedBy,
			)
			if err == nil {
				assignedRoles++
			}
		}
	}

	// Return success response
	responseData := gin.H{
		"enterprise_user_id": enterpriseUserID,
		"user_id":            request.UserID,
		"username":           username,
		"email":              email,
		"enterprise_id":      enterpriseID,
		"status":             "active",
		"roles_assigned":     assignedRoles,
	}

	// Add default role info if assigned
	message := fmt.Sprintf("用户成功添加到企业，由用户 ID: %d 执行", identity.GetUserID())
	if defaultRoleID.Valid {
		responseData["default_role_assigned"] = true
		responseData["default_role_id"] = defaultRoleID.Int64
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

	// Query user details from database
	query := `
		SELECT
			u.id, u.username, u.email, u.user_type, u.status,
			eu.id as enterprise_user_id, eu.enterprise_id, eu.status as enterprise_status,
			u.created_at, u.updated_at, u.last_login_at
		FROM enterprise_users eu
		JOIN users u ON eu.user_id = u.id
		WHERE eu.enterprise_id = $1
		AND u.id = $2
		AND eu.deleted_at IS NULL
		AND u.deleted_at IS NULL
	`

	var (
		uID              uint
		username         string
		email            string
		userType         string
		userStatus       string
		enterpriseUserID uint
		entID            uint
		enterpriseStatus string
		createdAt        string
		updatedAt        string
		lastLoginAt      sql.NullString
	)

	err = h.db.QueryRowContext(c.Request.Context(), query, enterpriseID, userID).Scan(
		&uID, &username, &email, &userType, &userStatus,
		&enterpriseUserID, &entID, &enterpriseStatus,
		&createdAt, &updatedAt, &lastLoginAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": "用户不存在或不属于该企业",
			},
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询用户详情失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Query user roles
	roles, err := h.enterpriseRoleRepo.GetUserRoles(c.Request.Context(), enterpriseUserID, uint(enterpriseID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询用户角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format roles
	roleList := make([]gin.H, 0)
	for _, role := range roles {
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
		"user_id":            uID,
		"username":           username,
		"email":              email,
		"user_type":          userType,
		"status":             userStatus,
		"enterprise_user_id": enterpriseUserID,
		"enterprise_id":      entID,
		"enterprise_status":  enterpriseStatus,
		"roles":              roleList,
		"created_at":         createdAt,
		"updated_at":         updatedAt,
	}

	if lastLoginAt.Valid {
		user["last_login_at"] = lastLoginAt.String
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

	// Get enterprise user ID
	query := `
		SELECT id FROM enterprise_users
		WHERE enterprise_id = $1 AND user_id = $2 AND deleted_at IS NULL
	`
	var enterpriseUserID uint
	err = h.db.QueryRowContext(c.Request.Context(), query, enterpriseID, userID).Scan(&enterpriseUserID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": "用户不存在或不属于该企业",
			},
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Get current roles
	currentRoles, err := h.enterpriseRoleRepo.GetUserRoles(c.Request.Context(), enterpriseUserID, uint(enterpriseID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询当前角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Build current role ID set
	currentRoleIDs := make(map[uint]bool)
	for _, role := range currentRoles {
		currentRoleIDs[role.ID] = true
	}

	// Build new role ID set
	newRoleIDs := make(map[uint]bool)
	for _, roleID := range request.RoleIDs {
		newRoleIDs[roleID] = true
	}

	// Determine which roles to add and which to remove
	rolesToAdd := make([]uint, 0)
	rolesToRemove := make([]uint, 0)

	for roleID := range newRoleIDs {
		if !currentRoleIDs[roleID] {
			rolesToAdd = append(rolesToAdd, roleID)
		}
	}

	for roleID := range currentRoleIDs {
		if !newRoleIDs[roleID] {
			rolesToRemove = append(rolesToRemove, roleID)
		}
	}

	// Add new roles
	assignedBy := identity.GetUserID()
	for _, roleID := range rolesToAdd {
		err = h.enterpriseRoleRepo.AssignRoleToUser(
			c.Request.Context(),
			enterpriseUserID,
			uint(enterpriseID),
			roleID,
			nil, // no expiration
			&assignedBy,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "DATABASE_ERROR",
					"message": fmt.Sprintf("分配角色 %d 失败", roleID),
					"details": err.Error(),
				},
			})
			return
		}
	}

	// Remove old roles
	for _, roleID := range rolesToRemove {
		err = h.enterpriseRoleRepo.RemoveRoleFromUser(c.Request.Context(), enterpriseUserID, roleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "DATABASE_ERROR",
					"message": fmt.Sprintf("移除角色 %d 失败", roleID),
					"details": err.Error(),
				},
			})
			return
		}
	}

	// Get updated roles
	updatedRoles, err := h.enterpriseRoleRepo.GetUserRoles(c.Request.Context(), enterpriseUserID, uint(enterpriseID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询更新后的角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format roles
	roleList := make([]gin.H, 0)
	for _, role := range updatedRoles {
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
			"user_id":            userID,
			"enterprise_id":      enterpriseID,
			"enterprise_user_id": enterpriseUserID,
			"roles":              roleList,
			"roles_added":        len(rolesToAdd),
			"roles_removed":      len(rolesToRemove),
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

	// Check if enterprise_user exists
	var enterpriseUserID uint
	var username string
	getEnterpriseUserQuery := `
		SELECT eu.id, COALESCE(u.username, '') as username
		FROM enterprise_users eu
		JOIN users u ON eu.user_id = u.id
		WHERE eu.enterprise_id = $1 AND eu.user_id = $2 AND eu.deleted_at IS NULL
	`
	err = h.db.QueryRowContext(c.Request.Context(), getEnterpriseUserQuery, enterpriseID, userID).Scan(&enterpriseUserID, &username)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ENTERPRISE_USER_NOT_FOUND",
				"message": "用户不在该企业中",
			},
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询企业用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Get all user roles for statistics
	roles, err := h.enterpriseRoleRepo.GetUserRoles(c.Request.Context(), enterpriseUserID, uint(enterpriseID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询用户角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Remove all role assignments
	removedRolesCount := 0
	for _, role := range roles {
		err = h.enterpriseRoleRepo.RemoveRoleFromUser(c.Request.Context(), enterpriseUserID, role.ID)
		if err == nil {
			removedRolesCount++
		}
	}

	// Soft delete enterprise_users record
	deleteEnterpriseUserQuery := `
		UPDATE enterprise_users
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`
	_, err = h.db.ExecContext(c.Request.Context(), deleteEnterpriseUserQuery, enterpriseUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "删除企业用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("用户 '%s' 已从企业中移除，由用户 ID: %d 执行", username, identity.GetUserID()),
		"data": gin.H{
			"enterprise_user_id": enterpriseUserID,
			"user_id":            userID,
			"username":           username,
			"removed_roles":      removedRolesCount,
		},
	})
}
