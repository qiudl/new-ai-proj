package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"ai-project-backend/interfaces"
	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// SystemPermissionHandler 系统权限管理Handler
// 负责处理系统级权限的CRUD操作
type SystemPermissionHandler struct {
	db              *sql.DB
	identityService services.IdentityProvider
}

// NewSystemPermissionHandler 创建SystemPermissionHandler实例
func NewSystemPermissionHandler(
	db *sql.DB,
	identityService services.IdentityProvider,
) *SystemPermissionHandler {
	return &SystemPermissionHandler{
		db:              db,
		identityService: identityService,
	}
}

// ListSystemPermissions godoc
// @Summary 列出所有系统权限
// @Description 获取所有系统级权限列表,支持按资源和活跃状态过滤
// @Tags 系统权限管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param resource query string false "资源类型过滤 (e.g., user, role, enterprise)"
// @Param is_active query boolean false "是否仅显示活跃权限" default(true)
// @Success 200 {object} map[string]interface{} "权限列表"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 403 {object} map[string]interface{} "无权限"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/system/permissions [get]
func (h *SystemPermissionHandler) ListSystemPermissions(c *gin.Context) {
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

	// Parse filters
	resourceFilter := c.Query("resource")
	isActiveFilter := c.DefaultQuery("is_active", "true")

	// Build query
	query := `
		SELECT id, code, name, description, resource, action, is_dangerous, is_active, created_at, updated_at
		FROM system_permissions
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
				"message": fmt.Sprintf("查询系统权限失败: %v", err),
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
		var isDangerous, isActive bool
		var createdAt, updatedAt string

		err := rows.Scan(&id, &code, &name, &description, &resource, &action, &isDangerous, &isActive, &createdAt, &updatedAt)
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
			"id":           id,
			"code":         code,
			"name":         name,
			"resource":     resource,
			"action":       action,
			"is_dangerous": isDangerous,
			"is_active":    isActive,
			"created_at":   createdAt,
			"updated_at":   updatedAt,
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
			"permissions":           permissions,
			"permissions_by_resource": permissionsByResource,
			"total":                  len(permissions),
		},
		"message": fmt.Sprintf("成功获取 %d 个系统权限, 由用户 ID: %d 查询", len(permissions), identity.GetUserID()),
	})
}

// CreateSystemPermission godoc
// @Summary 创建系统权限
// @Description 创建新的系统级权限定义
// @Tags 系统权限管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param permission body object true "权限信息"
// @Success 201 {object} map[string]interface{} "创建成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 403 {object} map[string]interface{} "无权限"
// @Failure 409 {object} map[string]interface{} "权限代码已存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/system/permissions [post]
func (h *SystemPermissionHandler) CreateSystemPermission(c *gin.Context) {
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

	// Parse request
	var request struct {
		Code        string  `json:"code" binding:"required"`
		Name        string  `json:"name" binding:"required"`
		Description *string `json:"description"`
		Resource    string  `json:"resource" binding:"required"`
		Action      string  `json:"action" binding:"required"`
		IsDangerous *bool   `json:"is_dangerous"`
		IsActive    *bool   `json:"is_active"`
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

	// Validate permission code format (alphanumeric, underscore, dot, hyphen)
	if !isValidPermissionCode(request.Code) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_PERMISSION_CODE",
				"message": "权限代码格式错误,只允许字母、数字、下划线、点号和连字符",
			},
		})
		return
	}

	// Validate resource and action are consistent with code
	expectedCode := fmt.Sprintf("%s.%s", request.Resource, request.Action)
	if request.Code != expectedCode {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CODE_MISMATCH",
				"message": fmt.Sprintf("权限代码应为 '%s' (resource.action 格式)", expectedCode),
			},
		})
		return
	}

	// Check if permission code already exists
	var existingID sql.NullInt64
	checkQuery := `SELECT id FROM system_permissions WHERE code = $1 AND deleted_at IS NULL`
	err := h.db.QueryRowContext(c.Request.Context(), checkQuery, request.Code).Scan(&existingID)
	if err == nil && existingID.Valid {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PERMISSION_CODE_EXISTS",
				"message": fmt.Sprintf("权限代码 '%s' 已存在", request.Code),
			},
		})
		return
	}

	// Default values
	isDangerous := false
	if request.IsDangerous != nil {
		isDangerous = *request.IsDangerous
	}

	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	// Insert permission
	var permissionID int
	var createdAt, updatedAt string

	insertQuery := `
		INSERT INTO system_permissions (code, name, description, resource, action, is_dangerous, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`

	err = h.db.QueryRowContext(
		c.Request.Context(),
		insertQuery,
		request.Code,
		request.Name,
		request.Description,
		request.Resource,
		request.Action,
		isDangerous,
		isActive,
	).Scan(&permissionID, &createdAt, &updatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATE_FAILED",
				"message": fmt.Sprintf("创建系统权限失败: %v", err),
			},
		})
		return
	}

	// Build response
	permission := gin.H{
		"id":           permissionID,
		"code":         request.Code,
		"name":         request.Name,
		"resource":     request.Resource,
		"action":       request.Action,
		"is_dangerous": isDangerous,
		"is_active":    isActive,
		"created_at":   createdAt,
		"updated_at":   updatedAt,
	}

	if request.Description != nil {
		permission["description"] = *request.Description
	} else {
		permission["description"] = nil
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"permission": permission,
		},
		"message": fmt.Sprintf("成功创建系统权限 '%s', 由用户 ID: %d 执行", request.Code, identity.GetUserID()),
	})
}

// isValidPermissionCode 验证权限代码格式
// 允许: 字母、数字、下划线、点号、连字符
func isValidPermissionCode(code string) bool {
	if len(code) == 0 {
		return false
	}

	// Must contain at least one dot (resource.action format)
	if !strings.Contains(code, ".") {
		return false
	}

	for _, char := range code {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_' ||
			char == '.' ||
			char == '-') {
			return false
		}
	}
	return true
}
