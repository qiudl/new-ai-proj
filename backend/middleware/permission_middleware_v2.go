package middleware

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// PermissionMiddlewareV2 provides RBAC v2 permission checking middleware
// Implements dual-domain architecture for system and enterprise permissions
type PermissionMiddlewareV2 struct {
	permissionService services.PermissionServiceV2
	identityProvider  services.IdentityProvider
}

// NewPermissionMiddlewareV2 creates a new RBAC v2 permission middleware
func NewPermissionMiddlewareV2(
	permissionService services.PermissionServiceV2,
	identityProvider services.IdentityProvider,
) *PermissionMiddlewareV2 {
	return &PermissionMiddlewareV2{
		permissionService: permissionService,
		identityProvider:  identityProvider,
	}
}

// RequireSystemPermission requires a specific system permission
// Used for system-level operations like enterprise management, system configuration
//
// Example usage:
//   router.POST("/enterprises", authMiddleware, permMiddleware.RequireSystemPermission("system.enterprise.create"), handler)
//
// Permission format: "system.{resource}.{action}"
// Examples:
//   - "system.enterprise.create" - Create enterprises
//   - "system.user.delete" - Delete users
//   - "system.config.update" - Update system configuration
func (m *PermissionMiddlewareV2) RequireSystemPermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RBAC-v2] Checking system permission: %s", permission)

		// 1. Get user ID from JWT context (set by AuthMiddleware)
		userID, exists := c.Get("user_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"未认证",
				"用户未登录或token无效",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// Convert userID to uint
		uid, err := convertToUint(userID)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"内部错误",
				"无效的用户ID类型",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		// 2. Load system user identity
		identity, err := m.identityProvider.GetSystemUserIdentity(uid)
		if err != nil {
			log.Printf("[RBAC-v2] Failed to get system user identity for user %d: %v", uid, err)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"非系统用户",
				"此操作仅限系统用户",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		// 3. Check permission
		hasPermission, err := m.permissionService.CheckSystemPermission(identity, permission)
		if err != nil {
			log.Printf("[RBAC-v2] Error checking system permission for user %d: %v", uid, err)
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"权限检查失败",
				err.Error(),
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		if !hasPermission {
			log.Printf("[RBAC-v2] User %d does not have system permission: %s", uid, permission)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"无权限执行此操作",
				fmt.Sprintf("需要权限: %s", permission),
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		// 4. Store identity in context for handlers
		c.Set("user_identity", identity)
		c.Set("identity_type", "system")
		c.Set("required_permission", permission)

		log.Printf("[RBAC-v2] System permission check passed for user %d: %s", uid, permission)
		c.Next()
	}
}

// RequireAnySystemPermission requires any one of the specified system permissions
// Used when multiple permissions can satisfy the requirement
//
// Example usage:
//   router.GET("/admin", authMiddleware, permMiddleware.RequireAnySystemPermission(
//       "system.enterprise.read", "system.enterprise.create",
//   ), handler)
func (m *PermissionMiddlewareV2) RequireAnySystemPermission(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RBAC-v2] Checking any of system permissions: %v", permissions)

		userID, exists := c.Get("user_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"未认证",
				"用户未登录或token无效",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		uid, err := convertToUint(userID)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"内部错误",
				"无效的用户ID类型",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		identity, err := m.identityProvider.GetSystemUserIdentity(uid)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"非系统用户",
				"此操作仅限系统用户",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		// Check each permission until one succeeds
		for _, permission := range permissions {
			hasPermission, err := m.permissionService.CheckSystemPermission(identity, permission)
			if err != nil {
				log.Printf("[RBAC-v2] Error checking permission %s: %v", permission, err)
				continue
			}
			if hasPermission {
				c.Set("user_identity", identity)
				c.Set("identity_type", "system")
				c.Set("granted_permission", permission)
				log.Printf("[RBAC-v2] User %d granted permission: %s", uid, permission)
				c.Next()
				return
			}
		}

		// No permission matched
		log.Printf("[RBAC-v2] User %d does not have any of the required permissions: %v", uid, permissions)
		response := models.NewErrorResponse(
			models.ErrCodeAuthorization,
			"无权限执行此操作",
			fmt.Sprintf("需要以下任一权限: %s", strings.Join(permissions, ", ")),
		)
		c.JSON(http.StatusForbidden, response)
		c.Abort()
	}
}

// RequireEnterprisePermission requires a specific enterprise permission
// Used for enterprise-specific operations like project/task management
//
// Example usage:
//   router.POST("/enterprises/:enterprise_id/projects", authMiddleware,
//       permMiddleware.RequireEnterprisePermission("enterprise.project.create"), handler)
//
// Permission format: "enterprise.{resource}.{action}"
// Examples:
//   - "enterprise.project.create" - Create projects
//   - "enterprise.task.update" - Update tasks
//   - "enterprise.member.invite" - Invite members
//
// Enterprise ID extraction:
//   1. URL path parameter `:enterprise_id`
//   2. Query parameter `?enterprise_id=123`
//   3. Header `X-Enterprise-ID`
//   4. Request body field `enterprise_id`
func (m *PermissionMiddlewareV2) RequireEnterprisePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RBAC-v2] Checking enterprise permission: %s", permission)

		// 1. Get user ID from context
		userID, exists := c.Get("user_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"未认证",
				"用户未登录或token无效",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		uid, err := convertToUint(userID)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"内部错误",
				"无效的用户ID类型",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		// 2. Extract enterprise ID from request
		enterpriseID, err := m.extractEnterpriseIDFromRequest(c)
		if err != nil {
			log.Printf("[RBAC-v2] Failed to extract enterprise ID: %v", err)
			response := models.NewErrorResponse(
				models.ErrCodeBadRequest,
				"缺少企业ID",
				err.Error(),
			)
			c.JSON(http.StatusBadRequest, response)
			c.Abort()
			return
		}

		// 3. Load enterprise user identity
		identity, err := m.identityProvider.GetEnterpriseUserIdentity(uid, enterpriseID)
		if err != nil {
			log.Printf("[RBAC-v2] Failed to get enterprise user identity for user %d in enterprise %d: %v",
				uid, enterpriseID, err)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"不属于该企业",
				"您不是该企业的成员",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		// 4. Check permission
		hasPermission, err := m.permissionService.CheckEnterprisePermission(identity, enterpriseID, permission)
		if err != nil {
			log.Printf("[RBAC-v2] Error checking enterprise permission for user %d: %v", uid, err)
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"权限检查失败",
				err.Error(),
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		if !hasPermission {
			log.Printf("[RBAC-v2] User %d does not have enterprise permission %s in enterprise %d",
				uid, permission, enterpriseID)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"无权限执行此操作",
				fmt.Sprintf("需要权限: %s", permission),
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		// 5. Store identity in context
		c.Set("user_identity", identity)
		c.Set("identity_type", "enterprise")
		c.Set("enterprise_id", enterpriseID)
		c.Set("required_permission", permission)

		log.Printf("[RBAC-v2] Enterprise permission check passed for user %d in enterprise %d: %s",
			uid, enterpriseID, permission)
		c.Next()
	}
}

// EnforceEnterpriseIsolation enforces enterprise data isolation
// Prevents users from accessing resources outside their enterprise
//
// SECURITY CRITICAL: This middleware fixes enterprise isolation vulnerabilities
//
// Example usage:
//   router.GET("/projects/:id", authMiddleware, permMiddleware.EnforceEnterpriseIsolation(), handler)
//
// Isolation rules:
//   - Enterprise users: Can ONLY access their own enterprise's resources
//   - System users: Can access with "system.enterprise.access_data" permission
//
// Enterprise ID extraction (same as RequireEnterprisePermission):
//   1. URL path parameter
//   2. Query parameter
//   3. Header
//   4. Request body
func (m *PermissionMiddlewareV2) EnforceEnterpriseIsolation() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RBAC-v2] Enforcing enterprise isolation")

		// 1. Get user ID
		userID, exists := c.Get("user_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"未认证",
				"用户未登录或token无效",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		uid, err := convertToUint(userID)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"内部错误",
				"无效的用户ID类型",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		// 2. Get user type from context (set by AuthMiddleware)
		userType, _ := c.Get("user_type")
		userTypeStr, _ := userType.(string)

		// 3. Extract target enterprise ID from request
		targetEnterpriseID, err := m.extractEnterpriseIDFromRequest(c)
		if err != nil {
			log.Printf("[RBAC-v2] Failed to extract enterprise ID for isolation check: %v", err)
			response := models.NewErrorResponse(
				models.ErrCodeBadRequest,
				"无法确定目标企业",
				err.Error(),
			)
			c.JSON(http.StatusBadRequest, response)
			c.Abort()
			return
		}

		// 4. Handle system users
		if userTypeStr == "system" {
			// System users need special permission to access enterprise data
			identity, err := m.identityProvider.GetSystemUserIdentity(uid)
			if err != nil {
				response := models.NewErrorResponse(
					models.ErrCodeAuthorization,
					"访问被拒绝",
					"无法验证系统用户身份",
				)
				c.JSON(http.StatusForbidden, response)
				c.Abort()
				return
			}

			hasAccess, err := m.permissionService.CheckSystemPermission(identity, "system.enterprise.access_data")
			if err != nil || !hasAccess {
				log.Printf("[RBAC-v2] System user %d denied access to enterprise %d data: no permission",
					uid, targetEnterpriseID)
				response := models.NewErrorResponse(
					models.ErrCodeAuthorization,
					"无权访问企业数据",
					"需要权限: system.enterprise.access_data",
				)
				c.JSON(http.StatusForbidden, response)
				c.Abort()
				return
			}

			// System user with permission can access (read-only)
			c.Set("is_system_admin_access", true)
			c.Set("target_enterprise_id", targetEnterpriseID)
			log.Printf("[RBAC-v2] System user %d granted access to enterprise %d data", uid, targetEnterpriseID)
			c.Next()
			return
		}

		// 5. Handle enterprise users - enforce strict isolation
		if userTypeStr == "enterprise" {
			// Get user's enterprise ID from context (set by AuthMiddleware)
			userEnterpriseID, exists := c.Get("enterprise_id")
			if !exists {
				log.Printf("[RBAC-v2] Enterprise user %d has no enterprise_id in context", uid)
				response := models.NewErrorResponse(
					models.ErrCodeAuthorization,
					"企业信息缺失",
					"无法确定用户所属企业",
				)
				c.JSON(http.StatusForbidden, response)
				c.Abort()
				return
			}

			userEntID, err := convertToUint(userEnterpriseID)
			if err != nil {
				response := models.NewErrorResponse(
					models.ErrCodeInternal,
					"内部错误",
					"无效的企业ID类型",
				)
				c.JSON(http.StatusInternalServerError, response)
				c.Abort()
				return
			}

			// CRITICAL: Verify user is accessing their own enterprise
			if targetEnterpriseID != userEntID {
				log.Printf("[RBAC-v2] ISOLATION VIOLATION: User %d (enterprise %d) attempted to access enterprise %d",
					uid, userEntID, targetEnterpriseID)
				response := models.NewErrorResponse(
					models.ErrCodeAuthorization,
					"无权访问其他企业的资源",
					fmt.Sprintf("您只能访问自己企业的资源 (您的企业ID: %d)", userEntID),
				)
				c.JSON(http.StatusForbidden, response)
				c.Abort()
				return
			}

			// Isolation check passed
			c.Set("enterprise_isolation_verified", true)
			c.Set("enterprise_id", targetEnterpriseID)
			log.Printf("[RBAC-v2] Enterprise isolation verified for user %d in enterprise %d", uid, userEntID)
			c.Next()
			return
		}

		// Unknown user type
		log.Printf("[RBAC-v2] Unknown user type: %s for user %d", userTypeStr, uid)
		response := models.NewErrorResponse(
			models.ErrCodeAuthorization,
			"未知用户类型",
			"无法验证用户身份",
		)
		c.JSON(http.StatusForbidden, response)
		c.Abort()
	}
}

// RequireSystemUser requires that the authenticated user is a system user
// Used for system-only endpoints that don't require specific permissions
//
// Example usage:
//   router.GET("/system/status", authMiddleware, permMiddleware.RequireSystemUser(), handler)
func (m *PermissionMiddlewareV2) RequireSystemUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RBAC-v2] Checking system user requirement")

		userID, exists := c.Get("user_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"未认证",
				"用户未登录或token无效",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		uid, err := convertToUint(userID)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"内部错误",
				"无效的用户ID类型",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		identity, err := m.identityProvider.GetSystemUserIdentity(uid)
		if err != nil {
			log.Printf("[RBAC-v2] User %d is not a system user: %v", uid, err)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"仅系统用户可访问",
				"此接口仅限系统用户使用",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		c.Set("user_identity", identity)
		c.Set("identity_type", "system")
		log.Printf("[RBAC-v2] System user check passed for user %d", uid)
		c.Next()
	}
}

// RequireEnterpriseUser requires that the authenticated user is an enterprise user
// Used for enterprise-only endpoints
//
// Example usage:
//   router.GET("/my-tasks", authMiddleware, permMiddleware.RequireEnterpriseUser(), handler)
func (m *PermissionMiddlewareV2) RequireEnterpriseUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RBAC-v2] Checking enterprise user requirement")

		userID, exists := c.Get("user_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"未认证",
				"用户未登录或token无效",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		uid, err := convertToUint(userID)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"内部错误",
				"无效的用户ID类型",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		userType, _ := c.Get("user_type")
		if userType != "enterprise" {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"仅企业用户可访问",
				"此接口仅限企业用户使用",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		enterpriseID, exists := c.Get("enterprise_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"企业信息缺失",
				"无法确定用户所属企业",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		entID, err := convertToUint(enterpriseID)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"内部错误",
				"无效的企业ID类型",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		identity, err := m.identityProvider.GetEnterpriseUserIdentity(uid, entID)
		if err != nil {
			log.Printf("[RBAC-v2] Failed to create enterprise user identity for user %d: %v", uid, err)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"企业用户验证失败",
				err.Error(),
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		c.Set("user_identity", identity)
		c.Set("identity_type", "enterprise")
		c.Set("enterprise_id", entID)
		log.Printf("[RBAC-v2] Enterprise user check passed for user %d in enterprise %d", uid, entID)
		c.Next()
	}
}

// extractEnterpriseIDFromRequest extracts enterprise ID from various request sources
// Priority order:
//   1. URL path parameter `:enterprise_id`
//   2. Query parameter `?enterprise_id=123`
//   3. Header `X-Enterprise-ID`
//   4. Request body field `enterprise_id`
func (m *PermissionMiddlewareV2) extractEnterpriseIDFromRequest(c *gin.Context) (uint, error) {
	// Method 1: URL path parameter /enterprises/:enterprise_id/*
	if idStr := c.Param("enterprise_id"); idStr != "" {
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			return 0, errors.New("invalid enterprise_id in URL path")
		}
		return uint(id), nil
	}

	// Method 2: Query parameter ?enterprise_id=123
	if idStr := c.Query("enterprise_id"); idStr != "" {
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			return 0, errors.New("invalid enterprise_id in query parameter")
		}
		return uint(id), nil
	}

	// Method 3: Header X-Enterprise-ID
	if idStr := c.GetHeader("X-Enterprise-ID"); idStr != "" {
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			return 0, errors.New("invalid X-Enterprise-ID header")
		}
		return uint(id), nil
	}

	// Method 4: From context (set by AuthMiddleware or previous middleware)
	if enterpriseID, exists := c.Get("enterprise_id"); exists {
		if id, err := convertToUint(enterpriseID); err == nil {
			return id, nil
		}
	}

	// Method 5: Request body - only if Content-Type is application/json
	// Note: This consumes the request body, so it should be used cautiously
	contentType := c.GetHeader("Content-Type")
	if strings.Contains(contentType, "application/json") {
		var body struct {
			EnterpriseID uint `json:"enterprise_id"`
		}
		if err := c.ShouldBindJSON(&body); err == nil && body.EnterpriseID > 0 {
			return body.EnterpriseID, nil
		}
	}

	return 0, errors.New("enterprise_id not found in request (checked: URL path, query params, headers, context)")
}

// convertToUint converts various integer types to uint
// Handles int, int64, float64, string types commonly used in Gin context
func convertToUint(value interface{}) (uint, error) {
	switch v := value.(type) {
	case uint:
		return v, nil
	case int:
		if v < 0 {
			return 0, errors.New("negative value cannot be converted to uint")
		}
		return uint(v), nil
	case int64:
		if v < 0 {
			return 0, errors.New("negative value cannot be converted to uint")
		}
		return uint(v), nil
	case float64:
		if v < 0 {
			return 0, errors.New("negative value cannot be converted to uint")
		}
		return uint(v), nil
	case string:
		id, err := strconv.ParseUint(v, 10, 32)
		if err != nil {
			return 0, fmt.Errorf("failed to parse string to uint: %w", err)
		}
		return uint(id), nil
	default:
		return 0, fmt.Errorf("unsupported type for uint conversion: %T", value)
	}
}
