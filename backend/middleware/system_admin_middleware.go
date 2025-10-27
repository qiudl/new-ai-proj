package middleware

import (
	"ai-project-backend/models"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SystemAdminOnly creates middleware that requires system administrator privileges
// This middleware ensures only users with role="admin" AND user_type="system" can access the protected routes
// It also respects the SuperAdmin environment variable configuration for override access
func SystemAdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		_ = ctx // Use context if needed for future enhancements

		// Log the incoming request for security audit
		log.Printf("[SYSTEM_ADMIN_MIDDLEWARE] Checking system admin privileges for path: %s", c.Request.URL.Path)

		// Step 1: Check SuperAdmin environment variable configuration
		// This allows configured superadmins to bypass role checks
		if isSuperAdminCtx(c) {
			log.Printf("[SYSTEM_ADMIN_MIDDLEWARE] ✅ SuperAdmin bypass granted")
			c.Set("permission_result", map[string]interface{}{
				"has_permission": true,
				"source":         "superadmin_override",
				"reason":         "SuperAdmin environment configuration bypass",
			})
			c.Next()
			return
		}

		// Step 2: Extract user information from context (set by auth middleware)
		userRole, roleExists := c.Get("user_role")
		userType, typeExists := c.Get("user_type")
		username, _ := c.Get("username")
		userID, _ := c.Get("user_id")

		// Log extracted user information for debugging
		log.Printf("[SYSTEM_ADMIN_MIDDLEWARE] User info - username: %v, id: %v, role: %v, type: %v",
			username, userID, userRole, userType)

		// Step 3: Validate that user information exists
		if !roleExists || !typeExists {
			log.Printf("[SYSTEM_ADMIN_MIDDLEWARE] ❌ Missing user role or type in context")
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"authentication_required",
				"用户认证信息不完整",
				map[string]interface{}{
					"missing_fields": []string{"user_role", "user_type"},
				},
			))
			c.Abort()
			return
		}

		// Step 4: Check if user role is "admin"
		if userRole != "admin" {
			log.Printf("[SYSTEM_ADMIN_MIDDLEWARE] ❌ Access denied - user role is not admin (role: %v)", userRole)
			c.JSON(http.StatusForbidden, models.NewErrorResponse(
				"permission_denied",
				"只有系统管理员可以执行此操作",
				map[string]interface{}{
					"required_role": "admin",
					"current_role":  userRole,
					"reason":        "此操作需要系统管理员权限",
				},
			))
			c.Abort()
			return
		}

		// Step 5: Check if user type is "system"
		// Company admins (user_type="company") are not allowed
		if userType != "system" {
			log.Printf("[SYSTEM_ADMIN_MIDDLEWARE] ❌ Access denied - user type is not system (type: %v)", userType)
			c.JSON(http.StatusForbidden, models.NewErrorResponse(
				"permission_denied",
				"只有系统用户可以执行此操作",
				map[string]interface{}{
					"required_type": "system",
					"current_type":  userType,
					"reason":        "企业管理员无权执行此系统级操作",
				},
			))
			c.Abort()
			return
		}

		// Step 6: All checks passed - grant access
		log.Printf("[SYSTEM_ADMIN_MIDDLEWARE] ✅ System admin access granted for user: %v (id: %v)", username, userID)
		c.Set("permission_result", map[string]interface{}{
			"has_permission": true,
			"source":         "system_admin_check",
			"reason":         "User has system admin privileges",
			"user_role":      userRole,
			"user_type":      userType,
		})
		c.Next()
	}
}

// IsSystemAdmin checks if the current user in the context is a system administrator
// This is a helper function that can be used in handlers for additional checks
func IsSystemAdmin(c *gin.Context) bool {
	// Check SuperAdmin first
	if isSuperAdminCtx(c) {
		return true
	}

	// Check role and type
	userRole, roleExists := c.Get("user_role")
	userType, typeExists := c.Get("user_type")

	if !roleExists || !typeExists {
		return false
	}

	return userRole == "admin" && userType == "system"
}
