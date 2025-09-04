package middleware

import (
	"ai-project-backend/database"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// PermissionMiddleware provides permission checking middleware
type PermissionMiddleware struct {
	permissionRepo database.PermissionRepository
}

// NewPermissionMiddleware creates a new permission middleware
func NewPermissionMiddleware(permissionRepo database.PermissionRepository) *PermissionMiddleware {
	return &PermissionMiddleware{
		permissionRepo: permissionRepo,
	}
}

// ----- superadmin helpers (env-driven, minimal) -----
func featureEnabled(key string) bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	switch v {
	case "1", "true", "yes", "on", "y":
		return true
	default:
		return false
	}
}

func parseCSV(key string) []string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.ToLower(strings.TrimSpace(p))
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func isSuperAdminCtx(c *gin.Context) bool {
	if !featureEnabled("FEATURE_SUPERADMIN_ENABLE") {
		return false
	}
	username := ""
	if v, ok := c.Get("username"); ok {
		username = strings.ToLower(strings.TrimSpace(v.(string)))
	}
	var uid int
	if v, ok := c.Get("user_id"); ok {
		switch t := v.(type) {
		case int:
			uid = t
		case int64:
			uid = int(t)
		case float64:
			uid = int(t)
		case string:
			if parsed, err := strconv.Atoi(t); err == nil {
				uid = parsed
			}
		}
	}
	usernames := map[string]struct{}{}
	ids := map[int]struct{}{}
	for _, u := range parseCSV("SUPER_ADMIN_USERNAMES") {
		usernames[u] = struct{}{}
	}
	for _, tok := range parseCSV("SUPER_ADMINS") {
		if id, err := strconv.Atoi(tok); err == nil {
			ids[id] = struct{}{}
			continue
		}
		if !strings.Contains(tok, "@") {
			usernames[tok] = struct{}{}
		}
	}
	for _, idStr := range parseCSV("SUPER_ADMIN_IDS") {
		if id, err := strconv.Atoi(idStr); err == nil {
			ids[id] = struct{}{}
		}
	}
	if len(usernames) == 0 && len(ids) == 0 && username == "admin" {
		return true
	}
	if username != "" {
		if _, ok := usernames[username]; ok {
			return true
		}
	}
	if uid != 0 {
		if _, ok := ids[uid]; ok {
			return true
		}
	}
	return false
}

// RequirePermission creates middleware that requires specific permission
func (m *PermissionMiddleware) RequirePermission(permissionCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Superadmin override (no rate-limit here; classic middleware path)
		if isSuperAdminCtx(c) {
			c.Set("permission_result", map[string]interface{}{
				"has_permission": true,
				"source":         "admin_override",
				"reason":         "Superadmin bypass",
			})
			c.Next()
			return
		}

		// Check if user is company_admin (they have full access to their company)
		userRole, _ := c.Get("user_role")
		if userRole == "company_admin" {
			c.Set("permission_result", map[string]interface{}{
				"has_permission": true,
				"source":         "company_admin_bypass",
				"reason":         "Company admin has full access to company resources",
			})
			c.Next()
			return
		}

		// Get company user ID from context (should be set by authentication middleware)
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}

		// Get resource ID from URL parameters if available
		var resourceID *int
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.Atoi(idStr); err == nil {
				resourceID = &id
			}
		}
		// Also check for project_id parameter
		if resourceID == nil {
			if idStr := c.Param("project_id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					resourceID = &id
				}
			}
		}

		// Check permission
		result, err := m.permissionRepo.CheckUserPermission(ctx, companyUserID, permissionCode, resourceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permission"})
			c.Abort()
			return
		}

		if !result.HasPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Permission denied",
				"reason": result.Reason,
			})
			c.Abort()
			return
		}

		// Store permission result in context for potential use in handlers
		c.Set("permission_result", result)
		c.Next()
	}
}

// RequireAnyPermission creates middleware that requires any of the specified permissions
func (m *PermissionMiddleware) RequireAnyPermission(permissionCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Superadmin override
		if isSuperAdminCtx(c) {
			c.Set("permission_results", map[string]interface{}{"admin_override": true})
			c.Set("granted_permissions", permissionCodes)
			c.Next()
			return
		}

		// Get company user ID from context
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}

		// Get resource ID from URL parameters if available
		var resourceID *int
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.Atoi(idStr); err == nil {
				resourceID = &id
			}
		}
		if resourceID == nil {
			if idStr := c.Param("project_id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					resourceID = &id
				}
			}
		}

		// Check if user has any of the required permissions
		results, err := m.permissionRepo.CheckMultiplePermissions(ctx, companyUserID, permissionCodes, resourceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permissions"})
			c.Abort()
			return
		}

		hasPermission := false
		var grantedPermissions []string
		for permissionCode, result := range results {
			if result.HasPermission {
				hasPermission = true
				grantedPermissions = append(grantedPermissions, permissionCode)
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Permission denied",
				"reason": "User does not have any of the required permissions",
			})
			c.Abort()
			return
		}

		// Store permission results in context
		c.Set("permission_results", results)
		c.Set("granted_permissions", grantedPermissions)
		c.Next()
	}
}

// RequireAllPermissions creates middleware that requires all of the specified permissions
func (m *PermissionMiddleware) RequireAllPermissions(permissionCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Superadmin override
		if isSuperAdminCtx(c) {
			c.Set("permission_results", map[string]interface{}{"admin_override": true})
			c.Next()
			return
		}

		// Get company user ID from context
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}

		// Get resource ID from URL parameters if available
		var resourceID *int
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.Atoi(idStr); err == nil {
				resourceID = &id
			}
		}
		if resourceID == nil {
			if idStr := c.Param("project_id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					resourceID = &id
				}
			}
		}

		// Check if user has all required permissions
		results, err := m.permissionRepo.CheckMultiplePermissions(ctx, companyUserID, permissionCodes, resourceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permissions"})
			c.Abort()
			return
		}

		var deniedPermissions []string
		for permissionCode, result := range results {
			if !result.HasPermission {
				deniedPermissions = append(deniedPermissions, permissionCode)
			}
		}

		if len(deniedPermissions) > 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"error":              "Permission denied",
				"reason":             "User does not have all required permissions",
				"denied_permissions": deniedPermissions,
			})
			c.Abort()
			return
		}

		// Store permission results in context
		c.Set("permission_results", results)
		c.Next()
	}
}

// RequireRole creates middleware that requires specific role
func (m *PermissionMiddleware) RequireRole(roleCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Superadmin override
		if isSuperAdminCtx(c) {
			c.Next()
			return
		}

		// Get company user ID from context
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}

		// Get user permissions summary to check role
		userPermissions, err := m.permissionRepo.GetUserPermissions(ctx, companyUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user permissions"})
			c.Abort()
			return
		}

		// Check if user has the required role
		if userPermissions.Role == nil || userPermissions.Role.RoleCode != roleCode {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Role access denied",
				"reason": "User does not have the required role",
			})
			c.Abort()
			return
		}

		// Store user permissions in context
		c.Set("user_permissions", userPermissions)
		c.Next()
	}
}

// RequireAnyRole creates middleware that requires any of the specified roles
func (m *PermissionMiddleware) RequireAnyRole(roleCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Get company user ID from context
		companyUserIDInterface, exists := c.Get("company_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Company user ID not found"})
			c.Abort()
			return
		}

		companyUserID, ok := companyUserIDInterface.(int)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid company user ID"})
			c.Abort()
			return
		}

		// Get user permissions summary to check role
		userPermissions, err := m.permissionRepo.GetUserPermissions(ctx, companyUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user permissions"})
			c.Abort()
			return
		}

		// Check if user has any of the required roles
		hasRole := false
		if userPermissions.Role != nil {
			for _, roleCode := range roleCodes {
				if userPermissions.Role.RoleCode == roleCode {
					hasRole = true
					break
				}
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Role access denied",
				"reason": "User does not have any of the required roles",
			})
			c.Abort()
			return
		}

		// Store user permissions in context
		c.Set("user_permissions", userPermissions)
		c.Next()
	}
}

// IsCompanyAdmin creates middleware that checks if user is company admin
func (m *PermissionMiddleware) IsCompanyAdmin() gin.HandlerFunc {
	return m.RequireRole("company_admin")
}

// CanManageUsers creates middleware for user management permissions
func (m *PermissionMiddleware) CanManageUsers() gin.HandlerFunc {
	return m.RequireAnyPermission("company.users.create", "company.users.update", "company.users.delete")
}

// CanManageProjects creates middleware for project management permissions
func (m *PermissionMiddleware) CanManageProjects() gin.HandlerFunc {
	return m.RequireAnyPermission("project.create", "project.update", "project.delete")
}

// CanViewProjects creates middleware for project viewing permissions
func (m *PermissionMiddleware) CanViewProjects() gin.HandlerFunc {
	return m.RequirePermission("project.list.read")
}

// CanManageTasks creates middleware for task management permissions
func (m *PermissionMiddleware) CanManageTasks() gin.HandlerFunc {
	return m.RequireAnyPermission("task.create", "task.update", "task.delete", "task.assign")
}

// CanViewFinancials creates middleware for financial data access
func (m *PermissionMiddleware) CanViewFinancials() gin.HandlerFunc {
	return m.RequirePermission("finance.contracts.read")
}
