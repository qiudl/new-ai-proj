package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"ai-project-backend/models"
)

// Mock audit service for testing
type MockAuditServiceForMiddleware struct {
	mock.Mock
}

func (m *MockAuditServiceForMiddleware) LogEvent(ctx interface{}, data *models.AuditEventData) error {
	args := m.Called(ctx, data)
	return args.Error(0)
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

func TestImpersonationMiddleware_NonImpersonatingUser(t *testing.T) {
	mockAuditService := new(MockAuditServiceForMiddleware)
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		// Set normal user claims
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(ImpersonationMiddleware(mockAuditService))

	// Test route
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Should not log any audit events for non-impersonating users
	mockAuditService.AssertNotCalled(t, "LogEvent", mock.Anything, mock.Anything)
}

func TestImpersonationMiddleware_ImpersonatingUser(t *testing.T) {
	mockAuditService := new(MockAuditServiceForMiddleware)
	mockAuditService.On("LogEvent", mock.Anything, mock.Anything).Return(nil)

	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		// Set impersonating user claims
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     100,
				EnterpriseName:   "Test Enterprise",
				EnterpriseCode:   "TEST001",
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
				StartedAt:        time.Now().Add(-30 * time.Minute),
				ExpiresAt:        time.Now().Add(90 * time.Minute),
				SessionID:        "test_session_123",
				Reason:           "Testing middleware",
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(ImpersonationMiddleware(mockAuditService))

	// Test route
	router.GET("/test", func(c *gin.Context) {
		// Check if context values are set correctly
		enterpriseID, exists := c.Get("enterprise_id")
		assert.True(t, exists)
		assert.Equal(t, 100, enterpriseID)

		enterpriseName, exists := c.Get("enterprise_name")
		assert.True(t, exists)
		assert.Equal(t, "Test Enterprise", enterpriseName)

		isImpersonating, exists := c.Get("is_impersonating")
		assert.True(t, exists)
		assert.True(t, isImpersonating.(bool))

		originalUserID, exists := c.Get("original_user_id")
		assert.True(t, exists)
		assert.Equal(t, 1, originalUserID)

		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Should log audit event
	// Note: Since LogEvent is called in a goroutine, we use Eventually to wait
	time.Sleep(100 * time.Millisecond) // Give time for goroutine to execute
	mockAuditService.AssertCalled(t, "LogEvent", mock.Anything, mock.Anything)
}

func TestImpersonationMiddleware_ExpiredSession(t *testing.T) {
	mockAuditService := new(MockAuditServiceForMiddleware)
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		// Set expired impersonating user claims
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     100,
				EnterpriseName:   "Test Enterprise",
				EnterpriseCode:   "TEST001",
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
				StartedAt:        time.Now().Add(-3 * time.Hour),
				ExpiresAt:        time.Now().Add(-1 * time.Hour), // Expired 1 hour ago
				SessionID:        "test_session_123",
				Reason:           "Testing expired session",
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(ImpersonationMiddleware(mockAuditService))

	// Test route
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Impersonation session expired", response["error"])
	assert.Equal(t, "IMPERSONATION_EXPIRED", response["code"])
}

func TestRequireNonImpersonation_AllowsNormalUser(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		// Don't set is_impersonating flag
		c.Next()
	})
	router.Use(RequireNonImpersonation())

	// Test route
	router.POST("/sensitive-action", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "action completed"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/sensitive-action", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireNonImpersonation_BlocksImpersonatingUser(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		// Set impersonating flag
		c.Set("is_impersonating", true)
		c.Next()
	})
	router.Use(RequireNonImpersonation())

	// Test route
	router.POST("/sensitive-action", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "action completed"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/sensitive-action", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "This action is not allowed in impersonation mode", response["error"])
	assert.Equal(t, "IMPERSONATION_FORBIDDEN", response["code"])
}

func TestRequireSystemAdmin_AllowsSystemAdmin(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(RequireSystemAdmin())

	// Test route
	router.GET("/admin-only", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin-only", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireSystemAdmin_AllowsSystemAdminInImpersonation(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin", // Original role is admin
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(RequireSystemAdmin())

	// Test route
	router.GET("/admin-only", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin-only", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireSystemAdmin_BlocksRegularUser(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   2,
			Username: "user",
			Role:     "user",
			UserType: "enterprise",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(RequireSystemAdmin())

	// Test route
	router.GET("/admin-only", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/admin-only", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "System administrator privileges required", response["error"])
	assert.Equal(t, "INSUFFICIENT_PRIVILEGES", response["code"])
}

func TestRequireEnterpriseAdmin_AllowsSystemAdmin(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(RequireEnterpriseAdmin())

	// Test route
	router.GET("/enterprise-admin", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "enterprise admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/enterprise-admin", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireEnterpriseAdmin_AllowsEnterpriseAdmin(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   2,
			Username: "enterprise_admin",
			Role:     "enterprise_admin",
			UserType: "enterprise",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(RequireEnterpriseAdmin())

	// Test route
	router.GET("/enterprise-admin", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "enterprise admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/enterprise-admin", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireEnterpriseAdmin_AllowsImpersonatingSystemAdmin(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin", // Role during impersonation
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(RequireEnterpriseAdmin())

	// Test route
	router.GET("/enterprise-admin", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "enterprise admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/enterprise-admin", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireEnterpriseAdmin_BlocksRegularUser(t *testing.T) {
	router := setupTestRouter()

	// Add middleware
	router.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   3,
			Username: "regular_user",
			Role:     "user",
			UserType: "enterprise",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router.Use(RequireEnterpriseAdmin())

	// Test route
	router.GET("/enterprise-admin", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "enterprise admin access granted"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/enterprise-admin", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Enterprise administrator privileges required", response["error"])
	assert.Equal(t, "INSUFFICIENT_PRIVILEGES", response["code"])
}