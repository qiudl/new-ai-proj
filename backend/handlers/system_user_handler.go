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

// SystemUserHandler handles HTTP requests for system user management (RBAC v2)
type SystemUserHandler struct {
	identityProvider services.IdentityProvider
	db               *sql.DB
	validator        *validator.Validate
}

// NewSystemUserHandler creates a new system user handler
func NewSystemUserHandler(db *sql.DB, identityProvider services.IdentityProvider) *SystemUserHandler {
	return &SystemUserHandler{
		db:               db,
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

	// Query system users from database
	query := `
		SELECT id, username, email, user_type, role, status, created_at, updated_at, last_login_at
		FROM users
		WHERE user_type = 'system'
		AND deleted_at IS NULL
	`

	var args []interface{}
	argIndex := 1

	if search != "" {
		query += fmt.Sprintf(" AND (username ILIKE $%d OR email ILIKE $%d)", argIndex, argIndex+1)
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
		argIndex += 2
	}

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM (" + query + ") AS filtered_users"
	var total int
	err := h.db.QueryRowContext(c.Request.Context(), countQuery, args...).Scan(&total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询系统用户总数失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Add pagination
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, pageSize, (page-1)*pageSize)

	// Execute query
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询系统用户列表失败",
				"details": err.Error(),
			},
		})
		return
	}
	defer rows.Close()

	users := make([]gin.H, 0)
	for rows.Next() {
		var (
			id          uint
			username    string
			email       string
			userType    string
			role        string
			userStatus  string
			createdAt   string
			updatedAt   string
			lastLoginAt sql.NullString
		)

		err := rows.Scan(&id, &username, &email, &userType, &role, &userStatus, &createdAt, &updatedAt, &lastLoginAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "DATABASE_ERROR",
					"message": "读取系统用户数据失败",
					"details": err.Error(),
				},
			})
			return
		}

		user := gin.H{
			"id":         id,
			"username":   username,
			"email":      email,
			"user_type":  userType,
			"role":       role,
			"status":     userStatus,
			"created_at": createdAt,
			"updated_at": updatedAt,
		}

		if lastLoginAt.Valid {
			user["last_login_at"] = lastLoginAt.String
		}

		users = append(users, user)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users":     users,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
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

	// Check if username already exists
	var existingUserID sql.NullInt64
	checkUsernameQuery := `SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL`
	err := h.db.QueryRowContext(c.Request.Context(), checkUsernameQuery, request.Username).Scan(&existingUserID)
	if err == nil && existingUserID.Valid {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USERNAME_EXISTS",
				"message": fmt.Sprintf("用户名 %s 已存在", request.Username),
			},
		})
		return
	}

	// Check if email already exists
	var existingEmailID sql.NullInt64
	checkEmailQuery := `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`
	err = h.db.QueryRowContext(c.Request.Context(), checkEmailQuery, request.Email).Scan(&existingEmailID)
	if err == nil && existingEmailID.Valid {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "EMAIL_EXISTS",
				"message": fmt.Sprintf("邮箱 %s 已存在", request.Email),
			},
		})
		return
	}

	// Set default status
	status := "active"
	if request.Status != nil {
		status = *request.Status
	}

	// Hash password if provided (simplified - in production should use bcrypt)
	var passwordHash *string
	if request.Password != nil {
		// TODO: In production, use bcrypt.GenerateFromPassword
		hash := *request.Password // Placeholder
		passwordHash = &hash
	}

	// Create user in users table
	createUserQuery := `
		INSERT INTO users (username, email, password_hash, user_type, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, 'system', $4, $5, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`

	var userID uint
	var createdAt, updatedAt string
	err = h.db.QueryRowContext(c.Request.Context(), createUserQuery,
		request.Username, request.Email, passwordHash, request.Role, status).Scan(&userID, &createdAt, &updatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATION_FAILED",
				"message": "创建系统用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Assign system roles if provided (implementation depends on SystemRoleRepository)
	assignedRolesCount := 0
	// Note: Role assignment logic would go here if systemRoleRepo is available
	// For now, just tracking the count

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":         userID,
			"username":   request.Username,
			"email":      request.Email,
			"user_type":  "system",
			"role":       request.Role,
			"status":     status,
			"created_at": createdAt,
			"updated_at": updatedAt,
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

	// Get user from database
	getUserQuery := `
		SELECT id, username, email, user_type, role, status, created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1 AND user_type = 'system' AND deleted_at IS NULL
	`

	var (
		id          uint
		username    string
		email       string
		userType    string
		role        string
		userStatus  string
		createdAt   string
		updatedAt   string
		lastLoginAt sql.NullString
	)

	err = h.db.QueryRowContext(c.Request.Context(), getUserQuery, userID).Scan(
		&id, &username, &email, &userType, &role, &userStatus, &createdAt, &updatedAt, &lastLoginAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": fmt.Sprintf("系统用户 ID %d 不存在", userID),
			},
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "获取系统用户失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Build user data
	userData := gin.H{
		"id":         id,
		"username":   username,
		"email":      email,
		"user_type":  userType,
		"role":       role,
		"status":     userStatus,
		"created_at": createdAt,
		"updated_at": updatedAt,
	}

	if lastLoginAt.Valid {
		userData["last_login_at"] = lastLoginAt.String
	}

	// Get assigned system roles (if systemRoleRepo is available)
	// This would require access to SystemRoleRepository
	// For now, include placeholder
	userData["system_roles"] = []gin.H{}

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

	// Verify user exists and is a system user
	var username string
	checkUserQuery := `
		SELECT username FROM users
		WHERE id = $1 AND user_type = 'system' AND deleted_at IS NULL
	`
	err = h.db.QueryRowContext(c.Request.Context(), checkUserQuery, userID).Scan(&username)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": fmt.Sprintf("系统用户 ID %d 不存在", userID),
			},
		})
		return
	}

	// Get current role assignments
	getCurrentRolesQuery := `
		SELECT system_role_id
		FROM system_user_roles
		WHERE user_id = $1 AND is_active = true
	`
	rows, err := h.db.QueryContext(c.Request.Context(), getCurrentRolesQuery, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "获取用户当前角色失败",
				"details": err.Error(),
			},
		})
		return
	}
	defer rows.Close()

	currentRoleMap := make(map[uint]bool)
	for rows.Next() {
		var roleID uint
		if err := rows.Scan(&roleID); err != nil {
			continue
		}
		currentRoleMap[roleID] = true
	}

	newRoleMap := make(map[uint]bool)
	for _, roleID := range request.RoleIDs {
		newRoleMap[roleID] = true
	}

	// Track changes
	addedCount := 0
	removedCount := 0
	assignedBy := identity.GetUserID()

	// Add new roles
	for roleID := range newRoleMap {
		if !currentRoleMap[roleID] {
			// Verify role exists
			var roleExists bool
			checkRoleQuery := `SELECT EXISTS(SELECT 1 FROM system_roles WHERE id = $1)`
			err = h.db.QueryRowContext(c.Request.Context(), checkRoleQuery, roleID).Scan(&roleExists)
			if err != nil || !roleExists {
				continue
			}

			// Add role
			addRoleQuery := `
				INSERT INTO system_user_roles (user_id, system_role_id, is_active, assigned_by, created_at, updated_at)
				VALUES ($1, $2, true, $3, NOW(), NOW())
				ON CONFLICT (user_id, system_role_id)
				DO UPDATE SET is_active = true, updated_at = NOW()
			`
			_, err = h.db.ExecContext(c.Request.Context(), addRoleQuery, userID, roleID, assignedBy)
			if err == nil {
				addedCount++
			}
		}
	}

	// Remove roles that are not in new list
	for roleID := range currentRoleMap {
		if !newRoleMap[roleID] {
			removeRoleQuery := `
				UPDATE system_user_roles
				SET is_active = false, updated_at = NOW()
				WHERE user_id = $1 AND system_role_id = $2
			`
			_, err = h.db.ExecContext(c.Request.Context(), removeRoleQuery, userID, roleID)
			if err == nil {
				removedCount++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":        userID,
			"username":       username,
			"added_count":    addedCount,
			"removed_count":  removedCount,
			"total_roles":    len(request.RoleIDs),
		},
		"message": fmt.Sprintf("角色更新成功（新增: %d, 移除: %d），由用户 ID: %d 执行",
			addedCount, removedCount, identity.GetUserID()),
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

	// Validate status value
	validStatuses := map[string]bool{
		"active":    true,
		"inactive":  true,
		"suspended": true,
		"locked":    true,
	}

	if !validStatuses[request.Status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_STATUS",
				"message": "状态值无效，必须是: active, inactive, suspended, locked",
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

	// Verify user exists and is a system user
	var username string
	var currentStatus string
	checkUserQuery := `
		SELECT username, status FROM users
		WHERE id = $1 AND user_type = 'system' AND deleted_at IS NULL
	`
	err = h.db.QueryRowContext(c.Request.Context(), checkUserQuery, userID).Scan(&username, &currentStatus)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": fmt.Sprintf("系统用户 ID %d 不存在", userID),
			},
		})
		return
	}

	// Update status
	updateStatusQuery := `
		UPDATE users
		SET status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	var updatedAt string
	err = h.db.QueryRowContext(c.Request.Context(), updateStatusQuery, userID, request.Status).Scan(&updatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UPDATE_FAILED",
				"message": "更新用户状态失败",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":        userID,
			"username":       username,
			"previous_status": currentStatus,
			"new_status":     request.Status,
			"updated_at":     updatedAt,
		},
		"message": fmt.Sprintf("用户状态更新成功（%s -> %s），由用户 ID: %d 执行",
			currentStatus, request.Status, identity.GetUserID()),
	})
}
