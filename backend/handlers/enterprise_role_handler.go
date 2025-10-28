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

// EnterpriseRoleHandler handles HTTP requests for enterprise role management (RBAC v2)
// Manages roles within a specific enterprise context
type EnterpriseRoleHandler struct {
	enterpriseRoleRepo   interfaces.EnterpriseRoleRepository
	identityProvider     services.IdentityProvider
	db                   *sql.DB
	validator            *validator.Validate
}

// NewEnterpriseRoleHandler creates a new enterprise role handler
func NewEnterpriseRoleHandler(
	db *sql.DB,
	enterpriseRoleRepo interfaces.EnterpriseRoleRepository,
	identityProvider services.IdentityProvider,
) *EnterpriseRoleHandler {
	return &EnterpriseRoleHandler{
		db:                   db,
		enterpriseRoleRepo:   enterpriseRoleRepo,
		identityProvider:     identityProvider,
		validator:            validator.New(),
	}
}

// ListEnterpriseRoles retrieves a list of roles in an enterprise with pagination
// @Summary List enterprise roles
// @Description Get paginated list of all roles in the enterprise
// @Tags enterprise-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param search query string false "Search by role name or code"
// @Param is_active query boolean false "Filter by active status"
// @Success 200 {object} map[string]interface{} "List of enterprise roles"
// @Failure 400 {object} map[string]interface{} "Bad request - Invalid enterprise ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Insufficient permissions"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/roles [get]
func (h *EnterpriseRoleHandler) ListEnterpriseRoles(c *gin.Context) {
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
	isActiveStr := c.Query("is_active")

	// Query enterprise roles from database
	query := `
		SELECT id, enterprise_id, role_code, role_name, description, is_active, is_built_in, created_by, created_at, updated_at
		FROM enterprise_roles
		WHERE enterprise_id = $1
	`

	var args []interface{}
	args = append(args, enterpriseID)
	argIndex := 2

	if search != "" {
		query += fmt.Sprintf(" AND (role_name ILIKE $%d OR role_code ILIKE $%d)", argIndex, argIndex+1)
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
		argIndex += 2
	}

	if isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			query += fmt.Sprintf(" AND is_active = $%d", argIndex)
			args = append(args, isActive)
			argIndex++
		}
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM (" + query + ") AS filtered_roles"
	var total int
	err = h.db.QueryRowContext(c.Request.Context(), countQuery, args...).Scan(&total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询企业角色总数失败",
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
				"message": "查询企业角色列表失败",
				"details": err.Error(),
			},
		})
		return
	}
	defer rows.Close()

	roles := make([]gin.H, 0)
	for rows.Next() {
		var (
			id           uint
			entID        uint
			roleCode     string
			roleName     string
			description  sql.NullString
			isActive     bool
			isBuiltIn    bool
			createdBy    sql.NullInt64
			createdAt    string
			updatedAt    string
		)

		err := rows.Scan(
			&id, &entID, &roleCode, &roleName, &description,
			&isActive, &isBuiltIn, &createdBy, &createdAt, &updatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "DATABASE_ERROR",
					"message": "读取企业角色数据失败",
					"details": err.Error(),
				},
			})
			return
		}

		role := gin.H{
			"id":            id,
			"enterprise_id": entID,
			"role_code":     roleCode,
			"role_name":     roleName,
			"is_active":     isActive,
			"is_built_in":   isBuiltIn,
			"created_at":    createdAt,
			"updated_at":    updatedAt,
		}

		if description.Valid {
			role["description"] = description.String
		}

		if createdBy.Valid {
			role["created_by"] = createdBy.Int64
		}

		roles = append(roles, role)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"roles":        roles,
			"total":        total,
			"page":         page,
			"page_size":    pageSize,
			"enterprise_id": enterpriseID,
		},
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// CreateEnterpriseRole creates a new enterprise role
// @Summary Create enterprise role
// @Description Create a new role within the enterprise
// @Tags enterprise-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param request body map[string]interface{} true "Create role request"
// @Success 201 {object} map[string]interface{} "Role created successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 409 {object} map[string]interface{} "Role already exists"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/roles [post]
func (h *EnterpriseRoleHandler) CreateEnterpriseRole(c *gin.Context) {
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
		RoleCode    string  `json:"role_code" binding:"required"`
		RoleName    string  `json:"role_name" binding:"required"`
		Description *string `json:"description"`
		IsActive    *bool   `json:"is_active"` // optional, defaults to true
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

	// Validate role code format (alphanumeric, underscore, hyphen)
	if !isValidRoleCode(request.RoleCode) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_CODE",
				"message": "角色代码格式无效，只能包含字母、数字、下划线和连字符",
			},
		})
		return
	}

	// Check if role code already exists in this enterprise
	existingRole, err := h.enterpriseRoleRepo.GetRoleByCode(c.Request.Context(), uint(enterpriseID), request.RoleCode)
	if err == nil && existingRole != nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_CODE_EXISTS",
				"message": "该企业中已存在相同代码的角色",
				"details": fmt.Sprintf("角色代码 '%s' 已被使用", request.RoleCode),
			},
		})
		return
	}

	// Set default value for is_active
	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	// Create role object
	createdBy := identity.GetUserID()
	role := &interfaces.EnterpriseRole{
		EnterpriseID: uint(enterpriseID),
		RoleCode:     request.RoleCode,
		RoleName:     request.RoleName,
		Description:  request.Description,
		IsActive:     isActive,
		IsBuiltIn:    false, // User-created roles are never built-in
		CreatedBy:    &createdBy,
	}

	// Create role in database
	err = h.enterpriseRoleRepo.CreateRole(c.Request.Context(), role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "创建角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Build response data
	roleData := gin.H{
		"id":            role.ID,
		"enterprise_id": role.EnterpriseID,
		"role_code":     role.RoleCode,
		"role_name":     role.RoleName,
		"is_active":     role.IsActive,
		"is_built_in":   role.IsBuiltIn,
		"created_by":    role.CreatedBy,
		"created_at":    role.CreatedAt,
		"updated_at":    role.UpdatedAt,
	}

	if role.Description != nil {
		roleData["description"] = *role.Description
	}

	// Return success response
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    roleData,
		"message": fmt.Sprintf("角色创建成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// GetEnterpriseRole retrieves detailed information about a specific enterprise role
// @Summary Get enterprise role
// @Description Get detailed information about a specific role including permissions
// @Tags enterprise-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param role_id path int true "Role ID"
// @Success 200 {object} map[string]interface{} "Role details with permissions"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/roles/{role_id} [get]
func (h *EnterpriseRoleHandler) GetEnterpriseRole(c *gin.Context) {
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

	// Get role ID from URL parameter
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "无效的角色ID",
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

	// Get role by ID
	role, err := h.enterpriseRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": "角色不存在",
				"details": err.Error(),
			},
		})
		return
	}

	// Verify role belongs to the enterprise
	if role.EnterpriseID != uint(enterpriseID) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ENTERPRISE_ISOLATION_VIOLATION",
				"message": "该角色不属于指定企业",
			},
		})
		return
	}

	// Get role permissions
	permissions, err := h.enterpriseRoleRepo.GetRolePermissions(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询角色权限失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format permissions
	permissionList := make([]gin.H, 0)
	for _, perm := range permissions {
		permissionList = append(permissionList, gin.H{
			"id":              perm.ID,
			"permission_code": perm.PermissionCode,
			"is_granted":      perm.IsGranted,
			"created_at":      perm.CreatedAt,
		})
	}

	// Build response
	roleData := gin.H{
		"id":            role.ID,
		"enterprise_id": role.EnterpriseID,
		"role_code":     role.RoleCode,
		"role_name":     role.RoleName,
		"is_active":     role.IsActive,
		"is_built_in":   role.IsBuiltIn,
		"permissions":   permissionList,
		"created_at":    role.CreatedAt,
		"updated_at":    role.UpdatedAt,
	}

	if role.Description != nil {
		roleData["description"] = *role.Description
	}

	if role.CreatedBy != nil {
		roleData["created_by"] = *role.CreatedBy
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    roleData,
		"message": fmt.Sprintf("查询成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// UpdateEnterpriseRole updates information about an enterprise role
// @Summary Update enterprise role
// @Description Update role name, description, or active status
// @Tags enterprise-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param role_id path int true "Role ID"
// @Param request body map[string]interface{} true "Update role request"
// @Success 200 {object} map[string]interface{} "Role updated successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Cannot update built-in roles"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/roles/{role_id} [put]
func (h *EnterpriseRoleHandler) UpdateEnterpriseRole(c *gin.Context) {
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

	// Get role ID from URL parameter
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "无效的角色ID",
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
		RoleName    *string `json:"role_name"`    // optional
		Description *string `json:"description"`  // optional (can be set to null)
		IsActive    *bool   `json:"is_active"`    // optional
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

	// At least one field must be provided
	if request.RoleName == nil && request.Description == nil && request.IsActive == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "NO_FIELDS_TO_UPDATE",
				"message": "至少需要提供一个要更新的字段",
			},
		})
		return
	}

	// Get existing role to verify it exists and belongs to the enterprise
	existingRole, err := h.enterpriseRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": "角色不存在",
				"details": err.Error(),
			},
		})
		return
	}

	// Verify role belongs to the enterprise
	if existingRole.EnterpriseID != uint(enterpriseID) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ENTERPRISE_ISOLATION_VIOLATION",
				"message": "该角色不属于指定企业",
			},
		})
		return
	}

	// Check if role is built-in (built-in roles cannot be updated)
	if existingRole.IsBuiltIn {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CANNOT_UPDATE_BUILTIN_ROLE",
				"message": "内置角色不能被修改",
			},
		})
		return
	}

	// Update fields (only update provided fields)
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
	err = h.enterpriseRoleRepo.UpdateRole(c.Request.Context(), existingRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "更新角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Get updated role with all details
	updatedRole, err := h.enterpriseRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
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

	// Build response data
	roleData := gin.H{
		"id":            updatedRole.ID,
		"enterprise_id": updatedRole.EnterpriseID,
		"role_code":     updatedRole.RoleCode,
		"role_name":     updatedRole.RoleName,
		"is_active":     updatedRole.IsActive,
		"is_built_in":   updatedRole.IsBuiltIn,
		"created_by":    updatedRole.CreatedBy,
		"created_at":    updatedRole.CreatedAt,
		"updated_at":    updatedRole.UpdatedAt,
	}

	if updatedRole.Description != nil {
		roleData["description"] = *updatedRole.Description
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    roleData,
		"message": fmt.Sprintf("角色更新成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// DeleteEnterpriseRole deletes an enterprise role
// @Summary Delete enterprise role
// @Description Delete a role (built-in roles cannot be deleted)
// @Tags enterprise-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param role_id path int true "Role ID"
// @Success 200 {object} map[string]interface{} "Role deleted successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Cannot delete built-in roles or roles in use"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/roles/{role_id} [delete]
func (h *EnterpriseRoleHandler) DeleteEnterpriseRole(c *gin.Context) {
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

	// Get role ID from URL parameter
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "无效的角色ID",
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

	// Get existing role to verify it exists and belongs to the enterprise
	existingRole, err := h.enterpriseRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": "角色不存在",
				"details": err.Error(),
			},
		})
		return
	}

	// Verify role belongs to the enterprise
	if existingRole.EnterpriseID != uint(enterpriseID) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ENTERPRISE_ISOLATION_VIOLATION",
				"message": "该角色不属于指定企业",
			},
		})
		return
	}

	// Check if role is built-in (built-in roles cannot be deleted)
	if existingRole.IsBuiltIn {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CANNOT_DELETE_BUILTIN_ROLE",
				"message": "内置角色不能被删除",
			},
		})
		return
	}

	// Check if any users are assigned to this role
	countQuery := `
		SELECT COUNT(*)
		FROM enterprise_user_roles
		WHERE enterprise_role_id = $1 AND is_active = true
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
				"message": "该角色正在被使用，无法删除",
				"details": fmt.Sprintf("有 %d 个用户分配了此角色", userCount),
			},
		})
		return
	}

	// Delete role from database (soft delete - sets is_active = false)
	err = h.enterpriseRoleRepo.DeleteRole(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "删除角色失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("角色 '%s' 删除成功，由用户 ID: %d 执行", existingRole.RoleName, identity.GetUserID()),
	})
}

// AssignPermissionsToEnterpriseRole assigns permissions to an enterprise role
// @Summary Assign permissions to role
// @Description Assign or update permissions for an enterprise role
// @Tags enterprise-roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "Enterprise ID"
// @Param role_id path int true "Role ID"
// @Param request body map[string]interface{} true "Assign permissions request"
// @Success 200 {object} map[string]interface{} "Permissions assigned successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Role not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/enterprises/{enterprise_id}/roles/{role_id}/permissions [post]
func (h *EnterpriseRoleHandler) AssignPermissionsToEnterpriseRole(c *gin.Context) {
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

	// Get role ID from URL parameter
	roleIDStr := c.Param("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ROLE_ID",
				"message": "无效的角色ID",
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
				"message": "请求参数格式错误",
				"details": err.Error(),
			},
		})
		return
	}

	// Get existing role to verify it exists and belongs to the enterprise
	existingRole, err := h.enterpriseRoleRepo.GetRoleByID(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROLE_NOT_FOUND",
				"message": "角色不存在",
				"details": err.Error(),
			},
		})
		return
	}

	// Verify role belongs to the enterprise
	if existingRole.EnterpriseID != uint(enterpriseID) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ENTERPRISE_ISOLATION_VIOLATION",
				"message": "该角色不属于指定企业",
			},
		})
		return
	}

	// Get current permissions
	currentPermissions, err := h.enterpriseRoleRepo.GetRolePermissions(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询当前权限失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Build current permissions map for comparison
	currentPermMap := make(map[string]bool)
	for _, perm := range currentPermissions {
		currentPermMap[perm.PermissionCode] = perm.IsGranted
	}

	// Build new permissions map from request
	newPermMap := make(map[string]bool)
	for _, perm := range request.Permissions {
		newPermMap[perm.PermissionCode] = perm.IsGranted
	}

	// Track changes for response
	addedCount := 0
	updatedCount := 0
	removedCount := 0

	// Process permissions: add/update
	for permCode, isGranted := range newPermMap {
		if currentIsGranted, exists := currentPermMap[permCode]; exists {
			// Permission exists - update if value changed
			if currentIsGranted != isGranted {
				err = h.enterpriseRoleRepo.AssignPermissionToRole(c.Request.Context(), uint(roleID), permCode, isGranted)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{
						"success": false,
						"error": gin.H{
							"code":    "DATABASE_ERROR",
							"message": fmt.Sprintf("更新权限 '%s' 失败", permCode),
							"details": err.Error(),
						},
					})
					return
				}
				updatedCount++
			}
		} else {
			// Permission doesn't exist - add it
			err = h.enterpriseRoleRepo.AssignPermissionToRole(c.Request.Context(), uint(roleID), permCode, isGranted)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "DATABASE_ERROR",
						"message": fmt.Sprintf("添加权限 '%s' 失败", permCode),
						"details": err.Error(),
					},
				})
				return
			}
			addedCount++
		}
	}

	// Process permissions: remove those not in new list
	for permCode := range currentPermMap {
		if _, exists := newPermMap[permCode]; !exists {
			err = h.enterpriseRoleRepo.RemovePermissionFromRole(c.Request.Context(), uint(roleID), permCode)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "DATABASE_ERROR",
						"message": fmt.Sprintf("删除权限 '%s' 失败", permCode),
						"details": err.Error(),
					},
				})
				return
			}
			removedCount++
		}
	}

	// Get updated permissions list
	updatedPermissions, err := h.enterpriseRoleRepo.GetRolePermissions(c.Request.Context(), uint(roleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查询更新后的权限失败",
				"details": err.Error(),
			},
		})
		return
	}

	// Format permissions for response
	permissionList := make([]gin.H, 0)
	for _, perm := range updatedPermissions {
		permissionList = append(permissionList, gin.H{
			"id":              perm.ID,
			"permission_code": perm.PermissionCode,
			"is_granted":      perm.IsGranted,
			"created_at":      perm.CreatedAt,
		})
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"role_id":     roleID,
			"permissions": permissionList,
			"statistics": gin.H{
				"added":   addedCount,
				"updated": updatedCount,
				"removed": removedCount,
				"total":   len(updatedPermissions),
			},
		},
		"message": fmt.Sprintf("权限分配成功，由用户 ID: %d 执行", identity.GetUserID()),
	})
}

// Helper Functions

// isValidRoleCode validates that a role code contains only alphanumeric characters, underscores, and hyphens
// Valid examples: "project_manager", "sales-lead", "developer123"
// Invalid examples: "role@admin", "user role", "admin!"
func isValidRoleCode(roleCode string) bool {
	if len(roleCode) == 0 {
		return false
	}

	// Check each character
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

// ListEnterprisePermissions godoc
// @Summary 列出企业可用权限
// @Description 获取企业域所有可用权限列表,支持按资源过滤
// @Tags 企业权限管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "企业ID"
// @Param resource query string false "资源类型过滤 (e.g., project, task, document)"
// @Param is_active query boolean false "是否仅显示活跃权限" default(true)
// @Success 200 {object} map[string]interface{} "权限列表"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 403 {object} map[string]interface{} "无权限"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/enterprises/{enterprise_id}/permissions [get]
func (h *EnterpriseRoleHandler) ListEnterprisePermissions(c *gin.Context) {
	// Get user identity
	identityRaw, exists := c.Get("user_identity")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "未找到用户身份信息",
			},
		})
		return
	}
	identity := identityRaw.(interfaces.UserIdentity)

	// Get enterprise_id from path
	enterpriseIDStr := c.Param("enterprise_id")
	enterpriseID, err := strconv.ParseUint(enterpriseIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_ENTERPRISE_ID",
				"message": "企业ID格式错误",
			},
		})
		return
	}

	// Verify user has access to this enterprise
	// (Already done by EnforceEnterpriseIsolation middleware, but double-check)
	if identity.IsEnterpriseUser() {
		userEnterpriseID := identity.GetEnterpriseID()
		if userEnterpriseID != nil && *userEnterpriseID != uint(enterpriseID) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "ACCESS_DENIED",
					"message": "无权访问其他企业的数据",
				},
			})
			return
		}
	}

	// Parse filters
	resourceFilter := c.Query("resource")
	isActiveFilter := c.DefaultQuery("is_active", "true")

	// Build query
	query := `
		SELECT id, code, name, description, resource, action, is_active, created_at, updated_at
		FROM enterprise_permissions
		WHERE deleted_at IS NULL
	`
	args := make([]interface{}, 0)
	argCount := 0

	// Add resource filter
	if resourceFilter != "" {
		argCount++
		query += fmt.Sprintf(" AND resource = $%d", argCount)
		args = append(args, resourceFilter)
	}

	// Add is_active filter
	if isActiveFilter == "true" {
		query += " AND is_active = true"
	}

	query += " ORDER BY resource, action"

	// Execute query
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": fmt.Sprintf("查询企业权限失败: %v", err),
			},
		})
		return
	}
	defer rows.Close()

	// Parse results
	permissions := make([]gin.H, 0)
	for rows.Next() {
		var id int
		var code, name, resource, action string
		var description sql.NullString
		var isActive bool
		var createdAt, updatedAt string

		err := rows.Scan(&id, &code, &name, &description, &resource, &action, &isActive, &createdAt, &updatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "SCAN_ERROR",
					"message": fmt.Sprintf("解析权限数据失败: %v", err),
				},
			})
			return
		}

		permission := gin.H{
			"id":         id,
			"code":       code,
			"name":       name,
			"resource":   resource,
			"action":     action,
			"is_active":  isActive,
			"created_at": createdAt,
			"updated_at": updatedAt,
		}

		if description.Valid {
			permission["description"] = description.String
		} else {
			permission["description"] = nil
		}

		permissions = append(permissions, permission)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROWS_ERROR",
				"message": fmt.Sprintf("读取权限列表失败: %v", err),
			},
		})
		return
	}

	// Group by resource for better organization
	permissionsByResource := make(map[string][]gin.H)
	for _, perm := range permissions {
		resource := perm["resource"].(string)
		if _, exists := permissionsByResource[resource]; !exists {
			permissionsByResource[resource] = make([]gin.H, 0)
		}
		permissionsByResource[resource] = append(permissionsByResource[resource], perm)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enterprise_id":            uint(enterpriseID),
			"permissions":              permissions,
			"permissions_by_resource": permissionsByResource,
			"total":                   len(permissions),
		},
		"message": fmt.Sprintf("成功获取企业 %d 的 %d 个权限, 由用户 ID: %d 查询", enterpriseID, len(permissions), identity.GetUserID()),
	})
}
