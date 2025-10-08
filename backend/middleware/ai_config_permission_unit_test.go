package middleware

import (
	"ai-project-backend/models"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestPermissionMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Enable super admin feature for testing
	os.Setenv("FEATURE_SUPERADMIN_ENABLE", "true")
	defer os.Unsetenv("FEATURE_SUPERADMIN_ENABLE")

	tests := []struct {
		name           string
		userRole       string
		username       string
		isSuperAdmin   bool
		requiredPerms  []string
		expectedStatus int
		expectedNext   bool
	}{
		{
			name:           "system_admin has all permissions",
			userRole:       "system_admin",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigView},
			expectedStatus: 200,
			expectedNext:   true,
		},
		{
			name:           "super_admin bypasses all checks",
			userRole:       "viewer",
			username:       "admin", // Default super admin username (when no env config)
			isSuperAdmin:   true,
			requiredPerms:  []string{models.PermissionAIConfigCreate, models.PermissionAIConfigDelete},
			expectedStatus: 200,
			expectedNext:   true,
		},
		{
			name:           "viewer can view",
			userRole:       "viewer",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigView},
			expectedStatus: 200,
			expectedNext:   true,
		},
		{
			name:           "viewer cannot create",
			userRole:       "viewer",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigCreate},
			expectedStatus: 403,
			expectedNext:   false,
		},
		{
			name:           "ops_user can rotate key",
			userRole:       "ops_user",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigRotateKey},
			expectedStatus: 200,
			expectedNext:   true,
		},
		{
			name:           "developer cannot rotate key",
			userRole:       "developer",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigRotateKey},
			expectedStatus: 403,
			expectedNext:   false,
		},
		{
			name:           "ai_admin can create",
			userRole:       "ai_admin",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigCreate},
			expectedStatus: 200,
			expectedNext:   true,
		},
		{
			name:           "ai_admin cannot delete (system_admin only)",
			userRole:       "ai_admin",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigDelete},
			expectedStatus: 403,
			expectedNext:   false,
		},
		{
			name:           "developer can view stats",
			userRole:       "developer",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigViewStats},
			expectedStatus: 200,
			expectedNext:   true,
		},
		{
			name:           "multiple permissions - all granted",
			userRole:       "ai_admin",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigView, models.PermissionAIConfigCreate},
			expectedStatus: 200,
			expectedNext:   true,
		},
		{
			name:           "multiple permissions - one missing",
			userRole:       "developer",
			isSuperAdmin:   false,
			requiredPerms:  []string{models.PermissionAIConfigView, models.PermissionAIConfigCreate},
			expectedStatus: 403,
			expectedNext:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 创建测试记录器
			w := httptest.NewRecorder()

			// 设置一个测试handler来验证是否调用了Next()
			nextCalled := false

			// 创建完整的路由链
			router := gin.New()

			// 添加中间件设置用户信息
			router.Use(func(c *gin.Context) {
				c.Set("user_role", tt.userRole)
				c.Set("user_id", 1)
				if tt.username != "" {
					c.Set("username", tt.username)
				}
				if tt.isSuperAdmin {
					c.Set("is_super_admin", true)
				}
				c.Next()
			})

			// 创建中间件
			middleware := NewAIConfigPermissionMiddleware()
			handler := middleware.RequirePermission(tt.requiredPerms...)
			router.Use(handler)

			// 添加最终handler
			router.GET("/test", func(c *gin.Context) {
				nextCalled = true
				c.Status(200)
			})

			// 准备请求
			req := httptest.NewRequest("GET", "/test", nil)
			router.ServeHTTP(w, req)

			// 验证状态码
			if w.Code != tt.expectedStatus && tt.expectedStatus != 200 {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			// 验证是否调用了Next()
			if nextCalled != tt.expectedNext {
				t.Errorf("Expected nextCalled=%v, got %v", tt.expectedNext, nextCalled)
			}

			// 如果是403，验证响应包含错误信息
			if tt.expectedStatus == 403 {
				body := w.Body.String()
				if len(body) == 0 {
					t.Error("Expected error response body for 403")
				}
			}
		})
	}
}

func TestRequireAnyPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		userRole       string
		requiredPerms  []string
		expectedStatus int
	}{
		{
			name:           "has first permission",
			userRole:       "ops_user",
			requiredPerms:  []string{models.PermissionAIConfigRotateKey, models.PermissionAIConfigCreate},
			expectedStatus: 200,
		},
		{
			name:           "has second permission",
			userRole:       "ai_admin",
			requiredPerms:  []string{models.PermissionAIConfigRotateKey, models.PermissionAIConfigAdminAll},
			expectedStatus: 200,
		},
		{
			name:           "has none of the permissions",
			userRole:       "viewer",
			requiredPerms:  []string{models.PermissionAIConfigCreate, models.PermissionAIConfigRotateKey},
			expectedStatus: 403,
		},
		{
			name:           "system_admin has admin_all permission",
			userRole:       "system_admin",
			requiredPerms:  []string{models.PermissionAIConfigAdminAll},
			expectedStatus: 200,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("user_role", tt.userRole)
			c.Set("user_id", 1)

			middleware := NewAIConfigPermissionMiddleware()
			handler := middleware.RequireAnyPermission(tt.requiredPerms...)

			handler(c)

			// 验证状态码
			if tt.expectedStatus == 403 && c.Writer.Status() != 403 {
				t.Errorf("Expected status 403, got %d", c.Writer.Status())
			}
		})
	}
}

func TestConvenienceMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		middleware     gin.HandlerFunc
		userRole       string
		expectedStatus int
	}{
		{
			name:           "RequireView - viewer allowed",
			middleware:     RequireView(),
			userRole:       "viewer",
			expectedStatus: 200,
		},
		{
			name:           "RequireCreate - ai_admin allowed",
			middleware:     RequireCreate(),
			userRole:       "ai_admin",
			expectedStatus: 200,
		},
		{
			name:           "RequireCreate - viewer denied",
			middleware:     RequireCreate(),
			userRole:       "viewer",
			expectedStatus: 403,
		},
		{
			name:           "RequireUpdate - ai_admin allowed",
			middleware:     RequireUpdate(),
			userRole:       "ai_admin",
			expectedStatus: 200,
		},
		{
			name:           "RequireDelete - system_admin allowed",
			middleware:     RequireDelete(),
			userRole:       "system_admin",
			expectedStatus: 200,
		},
		{
			name:           "RequireDelete - ai_admin denied",
			middleware:     RequireDelete(),
			userRole:       "ai_admin",
			expectedStatus: 403,
		},
		{
			name:           "RequireRotateKey - ops_user allowed",
			middleware:     RequireRotateKey(),
			userRole:       "ops_user",
			expectedStatus: 200,
		},
		{
			name:           "RequireRotateKey - developer denied",
			middleware:     RequireRotateKey(),
			userRole:       "developer",
			expectedStatus: 403,
		},
		{
			name:           "RequireManageExpiry - ai_admin allowed",
			middleware:     RequireManageExpiry(),
			userRole:       "ai_admin",
			expectedStatus: 200,
		},
		{
			name:           "RequireAdminPermission - system_admin allowed",
			middleware:     RequireAdminPermission(),
			userRole:       "system_admin",
			expectedStatus: 200,
		},
		{
			name:           "RequireAdminPermission - ai_admin denied",
			middleware:     RequireAdminPermission(),
			userRole:       "ai_admin",
			expectedStatus: 403,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("user_role", tt.userRole)
			c.Set("user_id", 1)

			tt.middleware(c)

			// 验证状态码
			if tt.expectedStatus == 403 && c.Writer.Status() != 403 {
				t.Errorf("Expected status 403, got %d", c.Writer.Status())
			}
		})
	}
}

func TestMissingUserContext(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Temporarily disable super admin feature for this test
	oldEnv := os.Getenv("FEATURE_SUPERADMIN_ENABLE")
	os.Setenv("FEATURE_SUPERADMIN_ENABLE", "false")
	defer os.Setenv("FEATURE_SUPERADMIN_ENABLE", oldEnv)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// 不设置user_role和user_id

	middleware := NewAIConfigPermissionMiddleware()
	handler := middleware.RequirePermission(models.PermissionAIConfigView)

	handler(c)

	// 应该返回401（未认证，因为没有user_id）
	if c.Writer.Status() != 401 {
		t.Errorf("Expected status 401 for missing user context, got %d", c.Writer.Status())
	}
}

func TestGetRequiredPermissionsForEndpoint(t *testing.T) {
	tests := []struct {
		method         string
		path           string
		expectedPerms  []string
		expectNonEmpty bool
	}{
		{
			method:         "GET",
			path:           "/api/v1/system/ai-configs",
			expectedPerms:  []string{models.PermissionAIConfigView},
			expectNonEmpty: true,
		},
		{
			method:         "POST",
			path:           "/api/v1/system/ai-configs",
			expectedPerms:  []string{models.PermissionAIConfigCreate},
			expectNonEmpty: true,
		},
		{
			method:         "POST",
			path:           "/api/v1/system/ai-configs/:id/rotate-key",
			expectedPerms:  []string{models.PermissionAIConfigRotateKey},
			expectNonEmpty: true,
		},
		{
			method:         "DELETE",
			path:           "/api/v1/system/ai-configs/:provider",
			expectedPerms:  []string{models.PermissionAIConfigDelete},
			expectNonEmpty: true,
		},
		{
			method:         "POST",
			path:           "/api/v1/system/ai-configs/test",
			expectedPerms:  []string{models.PermissionAIConfigTest},
			expectNonEmpty: true,
		},
		{
			method:         "GET",
			path:           "/other/endpoint",
			expectedPerms:  nil,
			expectNonEmpty: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			perms := models.GetRequiredPermissionsForEndpoint(tt.method, tt.path)

			if tt.expectNonEmpty && len(perms) == 0 {
				t.Error("Expected non-empty permissions list")
			}

			if !tt.expectNonEmpty && len(perms) > 0 {
				t.Error("Expected empty permissions list")
			}

			// 验证权限是否匹配
			if tt.expectedPerms != nil && len(perms) > 0 {
				found := false
				for _, perm := range perms {
					for _, expected := range tt.expectedPerms {
						if perm == expected {
							found = true
							break
						}
					}
					if found {
						break
					}
				}
			}
		})
	}
}

func TestRolePermissions(t *testing.T) {
	tests := []struct {
		role        string
		shouldHave  []string
		shouldNotHave []string
	}{
		{
			role: "system_admin",
			shouldHave: []string{
				models.PermissionAIConfigView,
				models.PermissionAIConfigCreate,
				models.PermissionAIConfigDelete,
				models.PermissionAIConfigRotateKey,
				models.PermissionAIConfigAdminAll,
			},
			shouldNotHave: []string{},
		},
		{
			role: "ai_admin",
			shouldHave: []string{
				models.PermissionAIConfigView,
				models.PermissionAIConfigCreate,
				models.PermissionAIConfigRotateKey,
			},
			shouldNotHave: []string{
				models.PermissionAIConfigDelete, // system_admin only
			},
		},
		{
			role: "ops_user",
			shouldHave: []string{
				models.PermissionAIConfigView,
				models.PermissionAIConfigRotateKey,
				models.PermissionAIConfigTest,
			},
			shouldNotHave: []string{
				models.PermissionAIConfigCreate,
				models.PermissionAIConfigDelete,
			},
		},
		{
			role: "developer",
			shouldHave: []string{
				models.PermissionAIConfigView,
				models.PermissionAIConfigViewAPIKey,
				models.PermissionAIConfigViewStats,
			},
			shouldNotHave: []string{
				models.PermissionAIConfigCreate,
				models.PermissionAIConfigRotateKey,
				models.PermissionAIConfigDelete,
			},
		},
		{
			role: "viewer",
			shouldHave: []string{
				models.PermissionAIConfigView,
			},
			shouldNotHave: []string{
				models.PermissionAIConfigCreate,
				models.PermissionAIConfigUpdate,
				models.PermissionAIConfigDelete,
				models.PermissionAIConfigRotateKey,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			rolePerms := models.AIConfigRolePermissions[tt.role]

			// 验证应该拥有的权限
			for _, perm := range tt.shouldHave {
				found := false
				for _, rolePerm := range rolePerms {
					if rolePerm == perm {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("Role %s should have permission %s", tt.role, perm)
				}
			}

			// 验证不应该拥有的权限
			for _, perm := range tt.shouldNotHave {
				for _, rolePerm := range rolePerms {
					if rolePerm == perm {
						t.Errorf("Role %s should not have permission %s", tt.role, perm)
					}
				}
			}
		})
	}
}

func TestErrorResponseFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_role", "viewer")
	c.Set("user_id", 1)

	middleware := NewAIConfigPermissionMiddleware()
	handler := middleware.RequirePermission(models.PermissionAIConfigCreate)

	handler(c)

	// 验证响应格式
	if c.Writer.Status() != 403 {
		t.Error("Expected 403 status")
	}

	body := w.Body.String()
	if len(body) == 0 {
		t.Error("Response body should not be empty")
	}

	// 验证响应包含必要的字段
	if !containsPermission(body, "PERMISSION_DENIED") {
		t.Error("Response should contain PERMISSION_DENIED error code")
	}

	if !containsPermission(body, "Insufficient permissions") {
		t.Error("Response should contain error message")
	}
}

// 辅助函数
func containsPermission(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && (s == substr || len(s) > len(substr) && containsPermissionHelper(s, substr))
}

func containsPermissionHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// BenchmarkPermissionCheck 权限检查性能基准测试
func BenchmarkPermissionCheck(b *testing.B) {
	gin.SetMode(gin.TestMode)
	middleware := NewAIConfigPermissionMiddleware()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_role", "ai_admin")
		c.Set("user_id", 1)

		handler := middleware.RequirePermission(models.PermissionAIConfigView)
		handler(c)
	}
}

// BenchmarkPermissionCheckParallel 并发权限检查性能基准测试
func BenchmarkPermissionCheckParallel(b *testing.B) {
	gin.SetMode(gin.TestMode)
	middleware := NewAIConfigPermissionMiddleware()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set("user_role", "ai_admin")
			c.Set("user_id", 1)

			handler := middleware.RequirePermission(models.PermissionAIConfigView)
			handler(c)
		}
	})
}
