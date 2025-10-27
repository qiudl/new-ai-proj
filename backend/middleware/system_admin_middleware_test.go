package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestRouterForSystemAdmin() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

// TestSystemAdminOnly_SystemAdminAccess tests that system admin (role=admin, type=system) can access
func TestSystemAdminOnly_SystemAdminAccess(t *testing.T) {
	router := setupTestRouterForSystemAdmin()

	// Add middleware to set user context
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "admin")
		c.Set("user_type", "system")
		c.Set("username", "admin")
		c.Set("user_id", 1)
		c.Next()
	})
	router.Use(SystemAdminOnly())

	// Test route
	router.GET("/admin/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "ok", response["status"])
}

// TestSystemAdminOnly_CompanyAdminDenied tests that company admin (role=admin, type=company) is denied
func TestSystemAdminOnly_CompanyAdminDenied(t *testing.T) {
	router := setupTestRouterForSystemAdmin()

	// Add middleware to set company admin context
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "admin")
		c.Set("user_type", "company") // Company admin, not system
		c.Set("username", "company_admin")
		c.Set("user_id", 2)
		c.Next()
	})
	router.Use(SystemAdminOnly())

	// Test route
	router.GET("/admin/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "permission_denied", errorObj["code"])
	assert.Equal(t, "只有系统用户可以执行此操作", errorObj["message"])
}

// TestSystemAdminOnly_RegularUserDenied tests that regular user (role=user) is denied
func TestSystemAdminOnly_RegularUserDenied(t *testing.T) {
	router := setupTestRouterForSystemAdmin()

	// Add middleware to set regular user context
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "user")
		c.Set("user_type", "system")
		c.Set("username", "regular_user")
		c.Set("user_id", 3)
		c.Next()
	})
	router.Use(SystemAdminOnly())

	// Test route
	router.GET("/admin/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "permission_denied", errorObj["code"])
	assert.Equal(t, "只有系统管理员可以执行此操作", errorObj["message"])
}

// TestSystemAdminOnly_CompanyUser tests that company user is denied
func TestSystemAdminOnly_CompanyUser(t *testing.T) {
	router := setupTestRouterForSystemAdmin()

	// Add middleware to set company user context
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "user")
		c.Set("user_type", "company")
		c.Set("username", "company_user")
		c.Set("user_id", 4)
		c.Next()
	})
	router.Use(SystemAdminOnly())

	// Test route
	router.GET("/admin/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "permission_denied", errorObj["code"])
}

// TestSystemAdminOnly_MissingRole tests that missing user_role is rejected
func TestSystemAdminOnly_MissingRole(t *testing.T) {
	router := setupTestRouterForSystemAdmin()

	// Add middleware without user_role
	router.Use(func(c *gin.Context) {
		c.Set("user_type", "system")
		c.Set("username", "test_user")
		c.Set("user_id", 5)
		c.Next()
	})
	router.Use(SystemAdminOnly())

	// Test route
	router.GET("/admin/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "authentication_required", errorObj["code"])
	assert.Equal(t, "用户认证信息不完整", errorObj["message"])
}

// TestSystemAdminOnly_MissingType tests that missing user_type is rejected
func TestSystemAdminOnly_MissingType(t *testing.T) {
	router := setupTestRouterForSystemAdmin()

	// Add middleware without user_type
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "admin")
		c.Set("username", "test_user")
		c.Set("user_id", 6)
		c.Next()
	})
	router.Use(SystemAdminOnly())

	// Test route
	router.GET("/admin/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, "authentication_required", errorObj["code"])
}

// TestSystemAdminOnly_SuperAdminBypass tests that SuperAdmin environment variable bypasses checks
// Note: This test is skipped because SuperAdmin requires complex configuration in production
// In real usage, SuperAdmin users are configured via SUPERADMIN_USER_* environment variables
func TestSystemAdminOnly_SuperAdminBypass(t *testing.T) {
	t.Skip("SuperAdmin requires production configuration - skipped in unit tests")

	// This test would require setting up SUPERADMIN_USER_USERNAME_1, SUPERADMIN_USER_ID_1 etc.
	// which is beyond the scope of unit testing. The SuperAdmin feature is tested in integration tests.
}

// TestSystemAdminOnly_PermissionResultInContext tests that permission result is set in context
func TestSystemAdminOnly_PermissionResultInContext(t *testing.T) {
	router := setupTestRouterForSystemAdmin()

	// Add middleware to set user context
	router.Use(func(c *gin.Context) {
		c.Set("user_role", "admin")
		c.Set("user_type", "system")
		c.Set("username", "admin")
		c.Set("user_id", 1)
		c.Next()
	})
	router.Use(SystemAdminOnly())

	// Test route that checks permission_result
	router.GET("/admin/test", func(c *gin.Context) {
		permissionResult, exists := c.Get("permission_result")
		assert.True(t, exists, "permission_result should exist in context")

		result, ok := permissionResult.(map[string]interface{})
		assert.True(t, ok, "permission_result should be a map")
		assert.Equal(t, true, result["has_permission"])
		assert.Equal(t, "system_admin_check", result["source"])

		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

// TestIsSystemAdmin_HelperFunction tests the IsSystemAdmin helper function
func TestIsSystemAdmin_HelperFunction(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		userType string
		expected bool
	}{
		{"System Admin", "admin", "system", true},
		{"Company Admin", "admin", "company", false},
		{"Regular User", "user", "system", false},
		{"Company User", "user", "company", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Set("user_role", tt.role)
			c.Set("user_type", tt.userType)

			result := IsSystemAdmin(c)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestIsSystemAdmin_SuperAdminBypass tests that IsSystemAdmin recognizes SuperAdmin
// Note: Skipped for same reason as TestSystemAdminOnly_SuperAdminBypass
func TestIsSystemAdmin_SuperAdminBypass(t *testing.T) {
	t.Skip("SuperAdmin requires production configuration - skipped in unit tests")
}

// TestIsSystemAdmin_MissingContext tests that IsSystemAdmin returns false when context is missing
func TestIsSystemAdmin_MissingContext(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	// Don't set any context values

	result := IsSystemAdmin(c)
	assert.False(t, result, "Should return false when context is missing")
}
