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

// SystemRoleHandler handles HTTP requests for system role management (RBAC v2)
type SystemRoleHandler struct {
	systemRoleRepo   interfaces.SystemRoleRepository
	identityProvider services.IdentityProvider
	db               *sql.DB
	validator        *validator.Validate
}

// NewSystemRoleHandler creates a new system role handler
func NewSystemRoleHandler(db *sql.DB, systemRoleRepo interfaces.SystemRoleRepository, identityProvider services.IdentityProvider) *SystemRoleHandler {
	return &SystemRoleHandler{
		db:               db,
		systemRoleRepo:   systemRoleRepo,
		identityProvider: identityProvider,
		validator:        validator.New(),
	}
}

// ListSystemRoles retrieves a list of system roles with optional filtering
// @Summary List system roles
// @Description Get list of all system roles with pagination
// @Tags system-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param search query string false "Search by role name or code"
// @Param is_active query boolean false "Filter by active status"
// @Success 200 {object} map[string]interface{} "List of system roles"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - System admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/roles [get]
func (h *SystemRoleHandler) ListSystemRoles(c *gin.Context) {
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
	isActiveStr := c.Query("is_active")

	// Query system roles from database
	query := `
		SELECT id, code, name, description, is_active, is_builtin, created_at, updated_at
		FROM system_roles
	`

	var args []interface{}
	argIndex := 1
	whereAdded := false

	if search != "" {
		query += " WHERE (name ILIKE $1 OR code ILIKE $2)"
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
		argIndex += 2
		whereAdded = true
	}

	if isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			if whereAdded {
				query += " AND"
			} else {
				query += " WHERE"
				whereAdded = true
			}
			query += fmt.Sprintf(" is_active = $%d", argIndex)
			args = append(args, isActive)
			argIndex++
		}
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM (" + query + ") AS filtered_roles"
	var total int
	err := h.db.QueryRowContext(c.Request.Context(), countQuery, args...).Scan(&total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询系统角色总数失败",
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
				"message": "查询系统角色列表失败",
				"details": err.Error(),
			},
		})
		return
	}
	defer rows.Close()

	roles := make([]gin.H, 0)
	for rows.Next() {
		var (
			id          uint
			roleCode    string
			roleName    string
			description sql.NullString
			isActive    bool
			isBuiltIn   bool
			createdAt   string
			updatedAt   string
		)

		err := rows.Scan(&id, &roleCode, &roleName, &description, &isActive, &isBuiltIn, &createdAt, &updatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "DATABASE_ERROR",
					"message": "读取系统角色数据失败",
					"details": err.Error(),
				},
			})
			return
		}

		role := gin.H{
			"id":          id,
			"role_code":   roleCode,
			"role_name":   roleName,
			"is_active":   isActive,
			"is_built_in": isBuiltIn,
			"created_at":  createdAt,
			"updated_at":  updatedAt,
		}

		if description.Valid {
			role["description"] = description.String
		}

		roles = append(roles, role)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"roles":     roles,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// CreateSystemRole creates a new system role
// @Summary Create system role
// @Description Create a new system role with specified permissions
// @Tags system-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body map[string]interface{} true "Create system role request"
// @Success 201 {object} map[string]interface{} "Created system role"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 409 {object} map[string]interface{} "Role already exists"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/roles [post]
func (h *SystemRoleHandler) CreateSystemRole(c *gin.Context) {
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
		RoleCode    string  `json:"role_code" binding:"required"`
		RoleName    string  `json:"role_name" binding:"required"`
		Description *string `json:"description"`
		IsActive    *bool   `json:"is_active"`
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

	// Validate role code format (only alphanumeric, underscore, hyphen)
	if !isValidSystemRoleCode(request.RoleCode) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_CODE",
				"message": "角色代码格式无效，只能包含字母、数字、下划线和连字符",
			},
		})
		return
	}

	// Check for duplicate role code
	existingRole, err := h.systemRoleRepo.GetRoleByCode(c.Request.Context(), request.RoleCode)
	if err == nil && existingRole != nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_CODE_EXISTS",
				"message": fmt.Sprintf("角色代码 %s 已存在", request.RoleCode),
			},
		})
		return
	}

	// Set default is_active if not provided
	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	// Create role
	role := &interfaces.SystemRole{
		RoleCode:    request.RoleCode,
		RoleName:    request.RoleName,
		Description: request.Description,
		IsActive:    isActive,
		IsBuiltIn:   false, // User-created roles are never built-in
	}

	err = h.systemRoleRepo.CreateRole(c.Request.Context(), role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATION_FAILED",
				"message": "创建系统角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":          role.ID,
			"role_code":   role.RoleCode,
			"role_name":   role.RoleName,
			"description": role.Description,
			"is_active":   role.IsActive,
			"is_built_in": role.IsBuiltIn,
			"created_at":  role.CreatedAt,
			"updated_at":  role.UpdatedAt,
		},
		"message": fmt.Sprintf("系统角色创建成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// isValidSystemRoleCode validates that a role code contains only allowed characters
func isValidSystemRoleCode(roleCode string) bool {
	if len(roleCode) == 0 {
		return false
	}

	for _, char := range roleCode {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_' ||
			char == '-') {
			return false
		}
	}

	return true
}

// GetSystemRole retrieves detailed information about a specific system role
// @Summary Get system role
// @Description Get detailed information about a specific system role including permissions
// @Tags system-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param role_id path int true "Role ID"
// @Success 200 {object} map[string]interface{} "System role details with permissions"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/roles/{role_id} [get]
func (h *SystemRoleHandler) GetSystemRole(c *gin.Context) {
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

	// Parse role_id from path
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "角色ID格式无效",
			},
		})
		return
	}

	// Get role from database
	role, err := h.systemRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": fmt.Sprintf("系统角色 ID %d 不存在", roleID),
			},
		})
		return
	}

	// Get role permissions
	permissions, err := h.systemRoleRepo.GetRolePermissions(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "获取角色权限失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format permissions
	permissionList := make([]gin.H, 0, len(permissions))
	for _, perm := range permissions {
		permissionList = append(permissionList, gin.H{
			"permission_code": perm.PermissionCode,
			"is_granted":      perm.IsGranted,
			"created_at":      perm.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":          role.ID,
			"role_code":   role.RoleCode,
			"role_name":   role.RoleName,
			"description": role.Description,
			"is_active":   role.IsActive,
			"is_built_in": role.IsBuiltIn,
			"permissions": permissionList,
			"created_at":  role.CreatedAt,
			"updated_at":  role.UpdatedAt,
		},
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// UpdateSystemRole updates information about a system role
// @Summary Update system role
// @Description Update system role name, description, or active status
// @Tags system-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param role_id path int true "Role ID"
// @Param request body map[string]interface{} true "Update system role request"
// @Success 200 {object} map[string]interface{} "Updated system role"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Cannot update built-in roles"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/roles/{role_id} [put]
func (h *SystemRoleHandler) UpdateSystemRole(c *gin.Context) {
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

	// Parse role_id from path
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "角色ID格式无效",
			},
		})
		return
	}

	// Parse request - all fields are optional
	var request struct {
		RoleName    *string `json:"role_name"`
		Description *string `json:"description"`
		IsActive    *bool   `json:"is_active"`
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

	// At least one field must be provided
	if request.RoleName == nil && request.Description == nil && request.IsActive == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "NO_UPDATE_FIELDS",
				"message": "至少需要提供一个要更新的字段",
			},
		})
		return
	}

	// Get existing role
	existingRole, err := h.systemRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": fmt.Sprintf("系统角色 ID %d 不存在", roleID),
			},
		})
		return
	}

	// Check if role is built-in (cannot be updated)
	if existingRole.IsBuiltIn {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CANNOT_UPDATE_BUILT_IN_ROLE",
				"message": "内置系统角色不允许修改",
			},
		})
		return
	}

	// Update only provided fields
	if request.RoleName != nil {
		existingRole.RoleName = *request.RoleName
	}
	if request.Description != nil {
		existingRole.Description = request.Description
	}
	if request.IsActive != nil {
		existingRole.IsActive = *request.IsActive
	}

	// Update role in database
	err = h.systemRoleRepo.UpdateRole(c.Request.Context(), existingRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UPDATE_FAILED",
				"message": "更新系统角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":          existingRole.ID,
			"role_code":   existingRole.RoleCode,
			"role_name":   existingRole.RoleName,
			"description": existingRole.Description,
			"is_active":   existingRole.IsActive,
			"is_built_in": existingRole.IsBuiltIn,
			"created_at":  existingRole.CreatedAt,
			"updated_at":  existingRole.UpdatedAt,
		},
		"message": fmt.Sprintf("系统角色更新成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// DeleteSystemRole deletes a system role
// @Summary Delete system role
// @Description Delete a system role (built-in roles cannot be deleted)
// @Tags system-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param role_id path int true "Role ID"
// @Success 200 {object} map[string]interface{} "Role deleted successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Cannot delete built-in roles or roles in use"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/roles/{role_id} [delete]
func (h *SystemRoleHandler) DeleteSystemRole(c *gin.Context) {
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

	// Parse role_id from path
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "角色ID格式无效",
			},
		})
		return
	}

	// Get existing role
	existingRole, err := h.systemRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": fmt.Sprintf("系统角色 ID %d 不存在", roleID),
			},
		})
		return
	}

	// Check if role is built-in (cannot be deleted)
	if existingRole.IsBuiltIn {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CANNOT_DELETE_BUILT_IN_ROLE",
				"message": "内置系统角色不允许删除",
			},
		})
		return
	}

	// Check if role is in use (has active user assignments)
	countQuery := `
		SELECT COUNT(*)
		FROM system_user_roles
		WHERE system_role_id = $1 AND is_active = true
	`

	var userCount int
	err = h.db.QueryRowContext(c.Request.Context(), countQuery, roleID).Scan(&userCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "检查角色使用情况失败",
				"details": err.Error(),
			},
		})
		return
	}

	if userCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_IN_USE",
				"message": fmt.Sprintf("角色正在被 %d 个用户使用，无法删除", userCount),
				"details": gin.H{
					"user_count": userCount,
				},
			},
		})
		return
	}

	// Delete role (soft delete by setting is_active = false)
	err = h.systemRoleRepo.DeleteRole(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DELETION_FAILED",
				"message": "删除系统角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":        roleID,
			"role_code": existingRole.RoleCode,
			"role_name": existingRole.RoleName,
		},
		"message": fmt.Sprintf("系统角色删除成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// AssignPermissionsToRole assigns permissions to a system role
// @Summary Assign permissions to role
// @Description Assign or update permissions for a system role
// @Tags system-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param role_id path int true "Role ID"
// @Param request body map[string]interface{} true "Assign permissions request"
// @Success 200 {object} map[string]interface{} "Permissions assigned successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/system/roles/{role_id}/permissions [post]
func (h *SystemRoleHandler) AssignPermissionsToRole(c *gin.Context) {
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

	// Parse role_id from path
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "角色ID格式无效",
			},
		})
		return
	}

	// Parse request
	var request struct {
		Permissions []struct {
			PermissionCode string `json:"permission_code" binding:"required"`
			IsGranted      bool   `json:"is_granted"`
		} `json:"permissions" binding:"required"`
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

	// Verify role exists
	existingRole, err := h.systemRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": fmt.Sprintf("系统角色 ID %d 不存在", roleID),
			},
		})
		return
	}

	// Get current permissions
	currentPermissions, err := h.systemRoleRepo.GetRolePermissions(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "获取角色当前权限失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Build maps for comparison
	currentPermMap := make(map[string]bool)
	for _, perm := range currentPermissions {
		currentPermMap[perm.PermissionCode] = perm.IsGranted
	}

	newPermMap := make(map[string]bool)
	for _, perm := range request.Permissions {
		newPermMap[perm.PermissionCode] = perm.IsGranted
	}

	// Track changes
	addedCount := 0
	updatedCount := 0
	removedCount := 0

	// Process add/update
	for permCode, isGranted := range newPermMap {
		if currentIsGranted, exists := currentPermMap[permCode]; exists {
			// Permission exists, check if it needs update
			if currentIsGranted != isGranted {
				err = h.systemRoleRepo.AssignPermissionToRole(c.Request.Context(), uint(roleID), permCode, isGranted)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{
						"success": false,
						"error": gin.H{
							"code":    "UPDATE_PERMISSION_FAILED",
							"message": fmt.Sprintf("更新权限 %s 失败", permCode),
							"details": err.Error(),
						},
					})
					return
				}
				updatedCount++
			}
		} else {
			// New permission, add it
			err = h.systemRoleRepo.AssignPermissionToRole(c.Request.Context(), uint(roleID), permCode, isGranted)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "ASSIGN_PERMISSION_FAILED",
						"message": fmt.Sprintf("分配权限 %s 失败", permCode),
						"details": err.Error(),
					},
				})
				return
			}
			addedCount++
		}
	}

	// Process removals
	for permCode := range currentPermMap {
		if _, exists := newPermMap[permCode]; !exists {
			// Permission should be removed
			err = h.systemRoleRepo.RemovePermissionFromRole(c.Request.Context(), uint(roleID), permCode)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "REMOVE_PERMISSION_FAILED",
						"message": fmt.Sprintf("移除权限 %s 失败", permCode),
						"details": err.Error(),
					},
				})
				return
			}
			removedCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"role_id":        roleID,
			"role_code":      existingRole.RoleCode,
			"role_name":      existingRole.RoleName,
			"added_count":    addedCount,
			"updated_count":  updatedCount,
			"removed_count":  removedCount,
			"total_permissions": len(newPermMap),
		},
		"message": fmt.Sprintf("权限分配成功（新增: %d, 更新: %d, 移除: %d），由用户 ID: %d 执行",
			addedCount, updatedCount, removedCount, identity.GetUserID()),
	})
}
