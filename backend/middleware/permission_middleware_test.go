package middleware

import (
	"ai-project-backend/models"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock PermissionRepository for testing middleware
type MockPermissionRepo struct {
	mock.Mock
}

func (m *MockPermissionRepo) GetRoles(ctx context.Context) ([]models.CompanyRole, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepo) CreateRole(ctx context.Context, role models.CreateRoleRequest) (*models.CompanyRole, error) {
	args := m.Called(ctx, role)
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepo) UpdateRole(ctx context.Context, roleID int, role models.UpdateRoleRequest) (*models.CompanyRole, error) {
	args := m.Called(ctx, roleID, role)
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepo) DeleteRole(ctx context.Context, roleID int) error {
	args := m.Called(ctx, roleID)
	return args.Error(0)
}

func (m *MockPermissionRepo) GetPermissions(ctx context.Context) ([]models.Permission, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.Permission), args.Error(1)
}

func (m *MockPermissionRepo) GetRolePermissions(ctx context.Context, roleID int) ([]models.Permission, error) {
	args := m.Called(ctx, roleID)
	return args.Get(0).([]models.Permission), args.Error(1)
}

func (m *MockPermissionRepo) CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCode, resourceID)
	return args.Get(0).(*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepo) CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCodes, resourceID)
	return args.Get(0).(map[string]*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepo) GetUserPermissions(ctx context.Context, companyUserID int) (*models.UserPermissionsSummary, error) {
	args := m.Called(ctx, companyUserID)
	return args.Get(0).(*models.UserPermissionsSummary), args.Error(1)
}

func (m *MockPermissionRepo) AssignUserRole(ctx context.Context, companyUserID int, roleID int) error {
	args := m.Called(ctx, companyUserID, roleID)
	return args.Error(0)
}

func (m *MockPermissionRepo) UpdateUserProjectPermissions(ctx context.Context, companyUserID int, projectID int, permissions []models.ProjectPermissionUpdate) error {
	args := m.Called(ctx, companyUserID, projectID, permissions)
	return args.Error(0)
}

func setupTestGin() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	return r
}

func TestPermissionMiddleware_RequirePermission_Success(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock successful permission check
	expectedResult := &models.PermissionResult{
		HasPermission: true,
		Source:        "role",
		Reason:        "User has permission through role",
	}
	mockRepo.On("CheckUserPermission", mock.Anything, 1, "project.read", (*int)(nil)).Return(expectedResult, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		// Set company_user_id in context (normally set by auth middleware)
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequirePermission("project.read"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequirePermission_NoCompanyUserID(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	router := setupTestGin()
	router.GET("/test", middleware.RequirePermission("project.read"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestPermissionMiddleware_RequirePermission_InvalidCompanyUserID(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		// Set invalid type for company_user_id
		c.Set("company_user_id", "invalid")
		c.Next()
	})
	router.GET("/test", middleware.RequirePermission("project.read"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestPermissionMiddleware_RequirePermission_PermissionDenied(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock permission denied
	expectedResult := &models.PermissionResult{
		HasPermission: false,
		Source:        "",
		Reason:        "User does not have required permission",
	}
	mockRepo.On("CheckUserPermission", mock.Anything, 1, "project.write", (*int)(nil)).Return(expectedResult, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequirePermission("project.write"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequirePermission_WithResourceID(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	projectID := 123
	expectedResult := &models.PermissionResult{
		HasPermission: true,
		Source:        "project",
		Reason:        "User has project-specific permission",
	}
	mockRepo.On("CheckUserPermission", mock.Anything, 1, "project.read", &projectID).Return(expectedResult, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/projects/:id/tasks", middleware.RequirePermission("project.read"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/projects/123/tasks", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireAnyPermission_Success(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock permission check for multiple permissions
	expectedResults := map[string]*models.PermissionResult{
		"project.read": {
			HasPermission: false,
			Source:        "",
			Reason:        "No permission",
		},
		"project.write": {
			HasPermission: true,
			Source:        "role",
			Reason:        "Has permission through role",
		},
	}
	permissions := []string{"project.read", "project.write"}
	mockRepo.On("CheckMultiplePermissions", mock.Anything, 1, permissions, (*int)(nil)).Return(expectedResults, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireAnyPermission("project.read", "project.write"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireAnyPermission_AllDenied(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock all permissions denied
	expectedResults := map[string]*models.PermissionResult{
		"project.read": {
			HasPermission: false,
			Source:        "",
			Reason:        "No permission",
		},
		"project.write": {
			HasPermission: false,
			Source:        "",
			Reason:        "No permission",
		},
	}
	permissions := []string{"project.read", "project.write"}
	mockRepo.On("CheckMultiplePermissions", mock.Anything, 1, permissions, (*int)(nil)).Return(expectedResults, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireAnyPermission("project.read", "project.write"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireAllPermissions_Success(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock all permissions granted
	expectedResults := map[string]*models.PermissionResult{
		"project.read": {
			HasPermission: true,
			Source:        "role",
			Reason:        "Has permission through role",
		},
		"project.write": {
			HasPermission: true,
			Source:        "role",
			Reason:        "Has permission through role",
		},
	}
	permissions := []string{"project.read", "project.write"}
	mockRepo.On("CheckMultiplePermissions", mock.Anything, 1, permissions, (*int)(nil)).Return(expectedResults, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireAllPermissions("project.read", "project.write"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireAllPermissions_OneDenied(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock one permission denied
	expectedResults := map[string]*models.PermissionResult{
		"project.read": {
			HasPermission: true,
			Source:        "role",
			Reason:        "Has permission through role",
		},
		"project.write": {
			HasPermission: false,
			Source:        "",
			Reason:        "No permission",
		},
	}
	permissions := []string{"project.read", "project.write"}
	mockRepo.On("CheckMultiplePermissions", mock.Anything, 1, permissions, (*int)(nil)).Return(expectedResults, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireAllPermissions("project.read", "project.write"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireRole_Success(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock user permissions with admin role
	expectedSummary := &models.UserPermissionsSummary{
		Role: &models.CompanyRole{
			ID:                1,
			RoleCode:          "admin",
			RoleName:          "Administrator",
			RoleDescription:   "Full access",
			IsSystemRole:      true,
			IsActive:          true,
		},
		RolePermissions:      []models.Permission{},
		ProjectPermissions:   []models.CompanyUserProjectPermission{},
		EffectivePermissions: []models.Permission{},
	}
	mockRepo.On("GetUserPermissions", mock.Anything, 1).Return(expectedSummary, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireRole("admin"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireRole_WrongRole(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock user permissions with user role
	expectedSummary := &models.UserPermissionsSummary{
		Role: &models.CompanyRole{
			ID:                2,
			RoleCode:          "user",
			RoleName:          "User",
			RoleDescription:   "Limited access",
			IsSystemRole:      false,
			IsActive:          true,
		},
		RolePermissions:      []models.Permission{},
		ProjectPermissions:   []models.CompanyUserProjectPermission{},
		EffectivePermissions: []models.Permission{},
	}
	mockRepo.On("GetUserPermissions", mock.Anything, 1).Return(expectedSummary, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireRole("admin"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireRole_NoRole(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock user permissions with no role
	expectedSummary := &models.UserPermissionsSummary{
		Role:                 nil,
		RolePermissions:      []models.Permission{},
		ProjectPermissions:   []models.CompanyUserProjectPermission{},
		EffectivePermissions: []models.Permission{},
	}
	mockRepo.On("GetUserPermissions", mock.Anything, 1).Return(expectedSummary, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireRole("admin"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_RequireAnyRole_Success(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock user permissions with manager role
	expectedSummary := &models.UserPermissionsSummary{
		Role: &models.CompanyRole{
			ID:                2,
			RoleCode:          "manager",
			RoleName:          "Manager",
			RoleDescription:   "Management access",
			IsSystemRole:      false,
			IsActive:          true,
		},
		RolePermissions:      []models.Permission{},
		ProjectPermissions:   []models.CompanyUserProjectPermission{},
		EffectivePermissions: []models.Permission{},
	}
	mockRepo.On("GetUserPermissions", mock.Anything, 1).Return(expectedSummary, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.RequireAnyRole("admin", "manager"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_IsCompanyAdmin(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock user permissions with company_admin role
	expectedSummary := &models.UserPermissionsSummary{
		Role: &models.CompanyRole{
			ID:                1,
			RoleCode:          "company_admin",
			RoleName:          "Company Administrator",
			RoleDescription:   "Company-level admin access",
			IsSystemRole:      true,
			IsActive:          true,
		},
		RolePermissions:      []models.Permission{},
		ProjectPermissions:   []models.CompanyUserProjectPermission{},
		EffectivePermissions: []models.Permission{},
	}
	mockRepo.On("GetUserPermissions", mock.Anything, 1).Return(expectedSummary, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.IsCompanyAdmin(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionMiddleware_CanManageUsers(t *testing.T) {
	mockRepo := new(MockPermissionRepo)
	middleware := NewPermissionMiddleware(mockRepo)

	// Mock permission check for user management
	expectedResults := map[string]*models.PermissionResult{
		"company.users.create": {
			HasPermission: true,
			Source:        "role",
			Reason:        "Has permission through role",
		},
		"company.users.update": {
			HasPermission: false,
			Source:        "",
			Reason:        "No permission",
		},
		"company.users.delete": {
			HasPermission: false,
			Source:        "",
			Reason:        "No permission",
		},
	}
	permissions := []string{"company.users.create", "company.users.update", "company.users.delete"}
	mockRepo.On("CheckMultiplePermissions", mock.Anything, 1, permissions, (*int)(nil)).Return(expectedResults, nil)

	router := setupTestGin()
	router.Use(func(c *gin.Context) {
		c.Set("company_user_id", 1)
		c.Next()
	})
	router.GET("/test", middleware.CanManageUsers(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}