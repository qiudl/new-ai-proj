package handlers

import (
	"ai-project-backend/models"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock PermissionRepository for testing
type MockPermissionRepository struct {
	mock.Mock
}

func (m *MockPermissionRepository) GetRoles(ctx context.Context) ([]models.CompanyRole, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) CreateRole(ctx context.Context, role models.CreateRoleRequest) (*models.CompanyRole, error) {
	args := m.Called(ctx, role)
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) UpdateRole(ctx context.Context, roleID int, role models.UpdateRoleRequest) (*models.CompanyRole, error) {
	args := m.Called(ctx, roleID, role)
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) DeleteRole(ctx context.Context, roleID int) error {
	args := m.Called(ctx, roleID)
	return args.Error(0)
}

func (m *MockPermissionRepository) GetPermissions(ctx context.Context) ([]models.Permission, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.Permission), args.Error(1)
}

func (m *MockPermissionRepository) GetRolePermissions(ctx context.Context, roleID int) ([]models.Permission, error) {
	args := m.Called(ctx, roleID)
	return args.Get(0).([]models.Permission), args.Error(1)
}

func (m *MockPermissionRepository) CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCode, resourceID)
	return args.Get(0).(*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepository) CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCodes, resourceID)
	return args.Get(0).(map[string]*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepository) GetUserPermissions(ctx context.Context, companyUserID int) (*models.UserPermissionsSummary, error) {
	args := m.Called(ctx, companyUserID)
	return args.Get(0).(*models.UserPermissionsSummary), args.Error(1)
}

func (m *MockPermissionRepository) AssignUserRole(ctx context.Context, companyUserID int, roleID int) error {
	args := m.Called(ctx, companyUserID, roleID)
	return args.Error(0)
}

func (m *MockPermissionRepository) UpdateUserProjectPermissions(ctx context.Context, companyUserID int, projectID int, permissions []models.ProjectPermissionUpdate) error {
	args := m.Called(ctx, companyUserID, projectID, permissions)
	return args.Error(0)
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestPermissionHandler_GetRoles(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	// Test successful case
	expectedRoles := []models.CompanyRole{
		{
			ID:                1,
			RoleCode:          "admin",
			RoleName:          "Administrator",
			RoleDescription:   "Full access",
			IsSystemRole:      true,
			IsActive:          true,
		},
		{
			ID:                2,
			RoleCode:          "user",
			RoleName:          "User",
			RoleDescription:   "Limited access",
			IsSystemRole:      false,
			IsActive:          true,
		},
	}

	mockRepo.On("GetRoles", mock.Anything).Return(expectedRoles, nil)

	router := setupTestRouter()
	router.GET("/roles", handler.GetRoles)

	req, _ := http.NewRequest("GET", "/roles", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.GetRolesResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response.Roles, 2)
	assert.Equal(t, "admin", response.Roles[0].RoleCode)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_GetRoles_Error(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	mockRepo.On("GetRoles", mock.Anything).Return([]models.CompanyRole{}, errors.New("database error"))

	router := setupTestRouter()
	router.GET("/roles", handler.GetRoles)

	req, _ := http.NewRequest("GET", "/roles", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_CreateRole(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	roleRequest := models.CreateRoleRequest{
		RoleCode:        "manager",
		RoleName:        "Manager",
		RoleDescription: "Management access",
		PermissionCodes: []string{"project.read", "task.create"},
	}

	expectedRole := &models.CompanyRole{
		ID:                3,
		RoleCode:          "manager",
		RoleName:          "Manager",
		RoleDescription:   "Management access",
		IsSystemRole:      false,
		IsActive:          true,
	}

	mockRepo.On("CreateRole", mock.Anything, roleRequest).Return(expectedRole, nil)

	router := setupTestRouter()
	router.POST("/roles", handler.CreateRole)

	body, _ := json.Marshal(roleRequest)
	req, _ := http.NewRequest("POST", "/roles", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.CompanyRole
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "manager", response.RoleCode)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_CreateRole_InvalidJSON(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	router := setupTestRouter()
	router.POST("/roles", handler.CreateRole)

	req, _ := http.NewRequest("POST", "/roles", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPermissionHandler_UpdateRole(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	updateRequest := models.UpdateRoleRequest{
		RoleName:        "Updated Manager",
		RoleDescription: "Updated description",
		PermissionCodes: []string{"project.read"},
	}

	expectedRole := &models.CompanyRole{
		ID:                2,
		RoleCode:          "manager",
		RoleName:          "Updated Manager",
		RoleDescription:   "Updated description",
		IsSystemRole:      false,
		IsActive:          true,
	}

	mockRepo.On("UpdateRole", mock.Anything, 2, updateRequest).Return(expectedRole, nil)

	router := setupTestRouter()
	router.PUT("/roles/:id", handler.UpdateRole)

	body, _ := json.Marshal(updateRequest)
	req, _ := http.NewRequest("PUT", "/roles/2", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.CompanyRole
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Updated Manager", response.RoleName)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_UpdateRole_InvalidID(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	router := setupTestRouter()
	router.PUT("/roles/:id", handler.UpdateRole)

	req, _ := http.NewRequest("PUT", "/roles/invalid", bytes.NewBuffer([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPermissionHandler_DeleteRole(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	mockRepo.On("DeleteRole", mock.Anything, 2).Return(nil)

	router := setupTestRouter()
	router.DELETE("/roles/:id", handler.DeleteRole)

	req, _ := http.NewRequest("DELETE", "/roles/2", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_GetPermissions(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	expectedPermissions := []models.Permission{
		{
			ID:                    1,
			PermissionCode:        "project.read",
			PermissionName:        "Read Projects",
			PermissionDescription: "View project information",
			Module:                "project",
			Resource:              "project",
			Action:                "read",
			IsActive:              true,
		},
	}

	mockRepo.On("GetPermissions", mock.Anything).Return(expectedPermissions, nil)

	router := setupTestRouter()
	router.GET("/permissions", handler.GetPermissions)

	req, _ := http.NewRequest("GET", "/permissions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.GetPermissionsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response.Permissions, 1)
	assert.Equal(t, "project.read", response.Permissions[0].PermissionCode)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_GetRolePermissions(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	expectedPermissions := []models.Permission{
		{
			ID:                    1,
			PermissionCode:        "project.read",
			PermissionName:        "Read Projects",
			PermissionDescription: "View project information",
			Module:                "project",
			Resource:              "project",
			Action:                "read",
			IsActive:              true,
			IsGranted:             true,
		},
	}

	mockRepo.On("GetRolePermissions", mock.Anything, 1).Return(expectedPermissions, nil)

	router := setupTestRouter()
	router.GET("/roles/:id/permissions", handler.GetRolePermissions)

	req, _ := http.NewRequest("GET", "/roles/1/permissions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.GetRolePermissionsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response.Permissions, 1)
	assert.True(t, response.Permissions[0].IsGranted)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_CheckUserPermission(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	expectedResult := &models.PermissionResult{
		HasPermission: true,
		Source:        "role",
		Reason:        "User has permission through role",
	}

	mockRepo.On("CheckUserPermission", mock.Anything, 1, "project.read", (*int)(nil)).Return(expectedResult, nil)

	router := setupTestRouter()
	router.GET("/users/:userId/permissions/:permissionCode/check", handler.CheckUserPermission)

	req, _ := http.NewRequest("GET", "/users/1/permissions/project.read/check", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.CheckPermissionResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.HasPermission)
	assert.Equal(t, "role", response.Source)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_CheckUserPermission_WithProjectID(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	projectID := 123
	expectedResult := &models.PermissionResult{
		HasPermission: true,
		Source:        "project",
		Reason:        "User has project-specific permission",
	}

	mockRepo.On("CheckUserPermission", mock.Anything, 1, "project.read", &projectID).Return(expectedResult, nil)

	router := setupTestRouter()
	router.GET("/users/:userId/permissions/:permissionCode/check", handler.CheckUserPermission)

	req, _ := http.NewRequest("GET", "/users/1/permissions/project.read/check?project_id=123", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.CheckPermissionResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.HasPermission)
	assert.Equal(t, "project", response.Source)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_GetUserPermissions(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	expectedSummary := &models.UserPermissionsSummary{
		Role: &models.CompanyRole{
			ID:                1,
			RoleCode:          "admin",
			RoleName:          "Administrator",
			RoleDescription:   "Full access",
			IsSystemRole:      true,
			IsActive:          true,
		},
		RolePermissions: []models.Permission{
			{
				ID:                    1,
				PermissionCode:        "project.read",
				PermissionName:        "Read Projects",
				PermissionDescription: "View project information",
				Module:                "project",
				Resource:              "project",
				Action:                "read",
				IsActive:              true,
			},
		},
		ProjectPermissions:    []models.CompanyUserProjectPermission{},
		EffectivePermissions:  []models.Permission{},
	}

	mockRepo.On("GetUserPermissions", mock.Anything, 1).Return(expectedSummary, nil)

	router := setupTestRouter()
	router.GET("/users/:userId/permissions", handler.GetUserPermissions)

	req, _ := http.NewRequest("GET", "/users/1/permissions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.GetUserPermissionsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.NotNil(t, response.Permissions.Role)
	assert.Equal(t, "admin", response.Permissions.Role.RoleCode)

	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_AssignUserRole(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	assignRequest := models.AssignRoleRequest{
		RoleID: 2,
	}

	mockRepo.On("AssignUserRole", mock.Anything, 1, 2).Return(nil)

	router := setupTestRouter()
	router.POST("/users/:userId/role", handler.AssignUserRole)

	body, _ := json.Marshal(assignRequest)
	req, _ := http.NewRequest("POST", "/users/1/role", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestPermissionHandler_UpdateUserPermissions(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	updateRequest := models.UpdateUserPermissionsRequest{
		ProjectID: 1,
		Permissions: []models.ProjectPermissionUpdate{
			{
				PermissionCode: "project.read",
				IsGranted:      true,
			},
		},
	}

	mockRepo.On("UpdateUserProjectPermissions", mock.Anything, 1, 1, updateRequest.Permissions).Return(nil)

	router := setupTestRouter()
	router.PUT("/users/:userId/permissions", handler.UpdateUserPermissions)

	body, _ := json.Marshal(updateRequest)
	req, _ := http.NewRequest("PUT", "/users/1/permissions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

// Test helper functions
func TestPermissionHandler_InvalidUserID(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	router := setupTestRouter()
	router.GET("/users/:userId/permissions", handler.GetUserPermissions)

	req, _ := http.NewRequest("GET", "/users/invalid/permissions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPermissionHandler_InvalidProjectID(t *testing.T) {
	mockRepo := new(MockPermissionRepository)
	handler := NewPermissionHandler(mockRepo)

	router := setupTestRouter()
	router.GET("/users/:userId/permissions/:permissionCode/check", handler.CheckUserPermission)

	req, _ := http.NewRequest("GET", "/users/1/permissions/project.read/check?project_id=invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}