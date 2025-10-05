package middleware

import (
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AI配置权限常量（导出供其他包使用）
const (
	PermissionAIConfigView                   = models.PermissionAIConfigView
	PermissionAIConfigCreate                 = models.PermissionAIConfigCreate
	PermissionAIConfigUpdate                 = models.PermissionAIConfigUpdate
	PermissionAIConfigDelete                 = models.PermissionAIConfigDelete
	PermissionAIConfigViewAPIKey             = models.PermissionAIConfigViewAPIKey
	PermissionAIConfigManageAPIKey           = models.PermissionAIConfigManageAPIKey
	PermissionAIConfigTest                   = models.PermissionAIConfigTest
	PermissionAIConfigToggle                 = models.PermissionAIConfigToggle
	PermissionAIConfigRotateKey              = models.PermissionAIConfigRotateKey
	PermissionAIConfigViewRotationHistory    = models.PermissionAIConfigViewRotationHistory
	PermissionAIConfigManageExpiry           = models.PermissionAIConfigManageExpiry
	PermissionAIConfigAutoRotate             = models.PermissionAIConfigAutoRotate
	PermissionAIConfigAdminAll               = models.PermissionAIConfigAdminAll
	PermissionAIConfigViewStats              = models.PermissionAIConfigViewStats
	PermissionAIConfigCheckExpiry            = models.PermissionAIConfigCheckExpiry
	PermissionAIConfigDisableExpired         = models.PermissionAIConfigDisableExpired
	PermissionAIConfigSendWarnings           = models.PermissionAIConfigSendWarnings
)

// AIConfigPermissionMiddleware AI配置权限检查中间件
type AIConfigPermissionMiddleware struct {
	// 可选：如果需要查询数据库权限，添加PermissionRepository
	// permissionRepo database.PermissionRepository
}

// NewAIConfigPermissionMiddleware 创建AI配置权限中间件
func NewAIConfigPermissionMiddleware() *AIConfigPermissionMiddleware {
	return &AIConfigPermissionMiddleware{}
}

// RequirePermission 创建需要特定权限的中间件
func (m *AIConfigPermissionMiddleware) RequirePermission(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 检查是否为超级管理员（绕过权限检查）
		if isSuperAdmin(c) {
			log.Printf("[AI_CONFIG_PERMISSION] User is super admin, bypassing permission check")
			c.Next()
			return
		}

		// 2. 获取用户ID和角色信息
		userID, exists := c.Get("user_id")
		if !exists {
			log.Printf("[AI_CONFIG_PERMISSION] User not authenticated")
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "User not authenticated",
				},
			})
			c.Abort()
			return
		}

		// 3. 获取用户角色（从上下文或数据库）
		role := getUserRole(c)
		log.Printf("[AI_CONFIG_PERMISSION] User %v has role: %s", userID, role)

		// 4. 检查角色是否拥有所需权限
		hasPermission := false
		rolePermissions, ok := models.AIConfigRolePermissions[role]
		if ok {
			userPermSet := make(map[string]bool)
			for _, perm := range rolePermissions {
				userPermSet[perm] = true
			}

			// 检查用户是否拥有完全管理权限
			if userPermSet[models.PermissionAIConfigAdminAll] {
				hasPermission = true
			} else {
				// 检查用户是否拥有所有所需权限
				hasPermission = true
				for _, requiredPerm := range permissions {
					if !userPermSet[requiredPerm] {
						hasPermission = false
						log.Printf("[AI_CONFIG_PERMISSION] User missing permission: %s", requiredPerm)
						break
					}
				}
			}
		}

		// 5. 权限检查失败
		if !hasPermission {
			log.Printf("[AI_CONFIG_PERMISSION] Access denied for user %v, required: %v", userID, permissions)
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "PERMISSION_DENIED",
					"message": fmt.Sprintf("Insufficient permissions. Required: %v", permissions),
					"details": gin.H{
						"required_permissions": permissions,
						"user_role":            role,
					},
				},
			})
			c.Abort()
			return
		}

		// 6. 权限检查通过
		log.Printf("[AI_CONFIG_PERMISSION] Access granted for user %v with role %s", userID, role)
		c.Next()
	}
}

// RequireAnyPermission 创建需要任意一个权限的中间件
func (m *AIConfigPermissionMiddleware) RequireAnyPermission(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 检查是否为超级管理员
		if isSuperAdmin(c) {
			c.Next()
			return
		}

		// 2. 获取用户信息
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "User not authenticated",
				},
			})
			c.Abort()
			return
		}

		// 3. 获取用户角色和权限
		role := getUserRole(c)
		rolePermissions, ok := models.AIConfigRolePermissions[role]
		if !ok {
			rolePermissions = []string{}
		}

		// 4. 检查是否拥有任意一个所需权限
		hasPermission := models.HasAIConfigPermission(rolePermissions, models.PermissionAIConfigAdminAll)
		if !hasPermission {
			for _, requiredPerm := range permissions {
				if models.HasAIConfigPermission(rolePermissions, requiredPerm) {
					hasPermission = true
					break
				}
			}
		}

		// 5. 权限检查
		if !hasPermission {
			log.Printf("[AI_CONFIG_PERMISSION] Access denied for user %v, required any of: %v", userID, permissions)
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "PERMISSION_DENIED",
					"message": fmt.Sprintf("Insufficient permissions. Required any of: %v", permissions),
				},
			})
			c.Abort()
			return
		}

		log.Printf("[AI_CONFIG_PERMISSION] Access granted for user %v", userID)
		c.Next()
	}
}

// RequireAdminOrOwner 需要管理员权限或资源所有者
func (m *AIConfigPermissionMiddleware) RequireAdminOrOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 超级管理员直接放行
		if isSuperAdmin(c) {
			c.Next()
			return
		}

		// 2. 获取用户信息
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "User not authenticated",
				},
			})
			c.Abort()
			return
		}

		// 3. 检查是否为管理员
		role := getUserRole(c)
		if role == "system_admin" || role == "ai_admin" {
			c.Next()
			return
		}

		// 4. 检查是否为资源所有者（根据具体业务逻辑）
		// 这里简化处理，实际应该检查资源的created_by字段
		createdByID, exists := c.Get("resource_created_by")
		if exists && createdByID == userID {
			c.Next()
			return
		}

		// 5. 拒绝访问
		log.Printf("[AI_CONFIG_PERMISSION] Access denied: not admin or owner for user %v", userID)
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PERMISSION_DENIED",
				"message": "Only administrators or resource owners can perform this action",
			},
		})
		c.Abort()
	}
}

// LogPermissionCheck 记录权限检查日志的中间件
func (m *AIConfigPermissionMiddleware) LogPermissionCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录请求信息
		userID, _ := c.Get("user_id")
		role := getUserRole(c)
		method := c.Request.Method
		path := c.Request.URL.Path

		log.Printf("[AI_CONFIG_PERMISSION] Request: user=%v, role=%s, method=%s, path=%s",
			userID, role, method, path)

		c.Next()

		// 记录响应状态
		status := c.Writer.Status()
		log.Printf("[AI_CONFIG_PERMISSION] Response: user=%v, status=%d", userID, status)
	}
}

// ========== 辅助函数 ==========

// isSuperAdmin 检查用户是否为超级管理员
func isSuperAdmin(c *gin.Context) bool {
	// 检查上下文中是否标记为超级管理员
	if isSuperAdminCtx(c) {
		return true
	}

	// 检查用户角色
	role := getUserRole(c)
	return role == "system_admin" || role == "super_admin"
}

// getUserRole 获取用户角色
func getUserRole(c *gin.Context) string {
	// 优先从上下文获取
	if role, exists := c.Get("user_role"); exists {
		if roleStr, ok := role.(string); ok {
			return roleStr
		}
	}

	// 从角色字段获取
	if role, exists := c.Get("role"); exists {
		if roleStr, ok := role.(string); ok {
			return roleStr
		}
	}

	// 默认为viewer（最低权限）
	return "viewer"
}

// GetUserPermissions 获取用户的所有权限（从上下文或数据库）
func GetUserPermissions(c *gin.Context) []string {
	role := getUserRole(c)
	if perms, ok := models.AIConfigRolePermissions[role]; ok {
		return perms
	}
	return []string{}
}

// HasPermission 检查当前用户是否拥有指定权限
func HasPermission(c *gin.Context, permission string) bool {
	if isSuperAdmin(c) {
		return true
	}

	userPermissions := GetUserPermissions(c)
	return models.HasAIConfigPermission(userPermissions, permission)
}

// ========== 便捷方法 ==========

// RequireView 需要查看权限
func RequireView() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequirePermission(models.PermissionAIConfigView)
}

// RequireCreate 需要创建权限
func RequireCreate() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequirePermission(models.PermissionAIConfigCreate)
}

// RequireUpdate 需要更新权限
func RequireUpdate() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequirePermission(models.PermissionAIConfigUpdate)
}

// RequireDelete 需要删除权限
func RequireDelete() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequirePermission(models.PermissionAIConfigDelete)
}

// RequireManageAPIKey 需要管理API密钥权限
func RequireManageAPIKey() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequirePermission(models.PermissionAIConfigManageAPIKey)
}

// RequireRotateKey 需要轮换密钥权限
func RequireRotateKey() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequirePermission(models.PermissionAIConfigRotateKey)
}

// RequireManageExpiry 需要管理过期权限
func RequireManageExpiry() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequirePermission(models.PermissionAIConfigManageExpiry)
}

// RequireAdminPermission 需要管理员权限
func RequireAdminPermission() gin.HandlerFunc {
	m := NewAIConfigPermissionMiddleware()
	return m.RequireAnyPermission(
		models.PermissionAIConfigAdminAll,
		models.PermissionAIConfigDisableExpired,
		models.PermissionAIConfigSendWarnings,
	)
}

// NormalizePathForPermissionCheck 标准化路径用于权限检查
// 将 /api/v1/system/ai-configs/1/rotate-key 转换为 /api/v1/system/ai-configs/:id/rotate-key
func NormalizePathForPermissionCheck(path string) string {
	parts := strings.Split(path, "/")
	normalized := make([]string, 0, len(parts))

	for i, part := range parts {
		if part == "" {
			continue
		}
		// 如果是数字ID，替换为:id
		if i > 0 && isNumeric(part) && i < len(parts)-1 {
			normalized = append(normalized, ":id")
		} else if i > 0 && (part == "openai" || part == "claude" || part == "deepseek") && i == len(parts)-1 {
			// 如果是provider参数（末尾），替换为:provider
			normalized = append(normalized, ":provider")
		} else {
			normalized = append(normalized, part)
		}
	}

	return "/" + strings.Join(normalized, "/")
}

// isNumeric 检查字符串是否为数字
func isNumeric(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
