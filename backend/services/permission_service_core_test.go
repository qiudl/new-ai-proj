package services

import (
	"context"
	"database/sql"
	"testing"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockPermissionRepository is a mock implementation of database.PermissionRepository
type MockPermissionRepository struct {
	mock.Mock
}

// Implement all required PermissionRepository methods

// Role management
func (m *MockPermissionRepository) GetRoles(ctx context.Context, companyID *int) ([]*models.CompanyRole, error) {
	args := m.Called(ctx, companyID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) GetRoleByID(ctx context.Context, roleID int) (*models.CompanyRole, error) {
	args := m.Called(ctx, roleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) GetRoleByCode(ctx context.Context, roleCode string) (*models.CompanyRole, error) {
	args := m.Called(ctx, roleCode)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) CreateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error) {
	args := m.Called(ctx, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) UpdateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error) {
	args := m.Called(ctx, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) DeleteRole(ctx context.Context, roleID int) error {
	args := m.Called(ctx, roleID)
	return args.Error(0)
}

// RBAC v2 methods
func (m *MockPermissionRepository) GetSystemRoles(ctx context.Context) ([]*models.CompanyRole, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) GetEnterpriseRoles(ctx context.Context, enterpriseID int) ([]*models.CompanyRole, error) {
	args := m.Called(ctx, enterpriseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) GetEnterpriseRoleByCode(ctx context.Context, roleCode string, enterpriseID int) (*models.CompanyRole, error) {
	args := m.Called(ctx, roleCode, enterpriseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) CreateRoleFromTemplate(ctx context.Context, templateRoleCode string, enterpriseID int, customName *string) (*models.CompanyRole, error) {
	args := m.Called(ctx, templateRoleCode, enterpriseID, customName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CompanyRole), args.Error(1)
}

// Permission management
func (m *MockPermissionRepository) GetPermissions(ctx context.Context) ([]*models.Permission, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Permission), args.Error(1)
}

func (m *MockPermissionRepository) GetPermissionsByModule(ctx context.Context, module string) ([]*models.Permission, error) {
	args := m.Called(ctx, module)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Permission), args.Error(1)
}

func (m *MockPermissionRepository) GetRolePermissions(ctx context.Context, roleID int) ([]*models.Permission, error) {
	args := m.Called(ctx, roleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Permission), args.Error(1)
}

func (m *MockPermissionRepository) GetRolesWithPermissions(ctx context.Context, companyID *int) ([]*models.CompanyRole, map[int][]*models.Permission, error) {
	args := m.Called(ctx, companyID)
	if args.Get(0) == nil {
		return nil, nil, args.Error(2)
	}
	return args.Get(0).([]*models.CompanyRole), args.Get(1).(map[int][]*models.Permission), args.Error(2)
}

func (m *MockPermissionRepository) GetRolePermissionIDs(ctx context.Context, roleID int) ([]int, error) {
	args := m.Called(ctx, roleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]int), args.Error(1)
}

func (m *MockPermissionRepository) SetRolePermissions(ctx context.Context, roleID int, permissionIDs []int) error {
	args := m.Called(ctx, roleID, permissionIDs)
	return args.Error(0)
}

// User permission management
func (m *MockPermissionRepository) GetUserPermissions(ctx context.Context, companyUserID int) (*models.UserPermissionSummary, error) {
	args := m.Called(ctx, companyUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UserPermissionSummary), args.Error(1)
}

func (m *MockPermissionRepository) UpdateUserRole(ctx context.Context, companyUserID int, roleID *int) error {
	args := m.Called(ctx, companyUserID, roleID)
	return args.Error(0)
}

func (m *MockPermissionRepository) UpdateUserCustomPermissions(ctx context.Context, companyUserID int, permissions map[string]bool) error {
	args := m.Called(ctx, companyUserID, permissions)
	return args.Error(0)
}

// Project permissions
func (m *MockPermissionRepository) GetUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) (*models.CompanyUserProjectPermission, error) {
	args := m.Called(ctx, companyUserID, projectID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CompanyUserProjectPermission), args.Error(1)
}

func (m *MockPermissionRepository) SetUserProjectPermissions(ctx context.Context, permission *models.CompanyUserProjectPermission) error {
	args := m.Called(ctx, permission)
	return args.Error(0)
}

func (m *MockPermissionRepository) RemoveUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) error {
	args := m.Called(ctx, companyUserID, projectID)
	return args.Error(0)
}

// Permission checking
func (m *MockPermissionRepository) CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCode, resourceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepository) CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCodes, resourceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]*models.PermissionResult), args.Error(1)
}

// Permission inheritance and override management
func (m *MockPermissionRepository) GetPermissionInheritanceTrace(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionInheritanceTrace, error) {
	args := m.Called(ctx, companyUserID, permissionCode, resourceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PermissionInheritanceTrace), args.Error(1)
}

func (m *MockPermissionRepository) SetUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string, isGranted bool, reason string) error {
	args := m.Called(ctx, companyUserID, permissionCode, isGranted, reason)
	return args.Error(0)
}

func (m *MockPermissionRepository) RemoveUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string) error {
	args := m.Called(ctx, companyUserID, permissionCode)
	return args.Error(0)
}

func (m *MockPermissionRepository) GetUserPermissionOverrides(ctx context.Context, companyUserID int) (map[string]bool, error) {
	args := m.Called(ctx, companyUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]bool), args.Error(1)
}

func (m *MockPermissionRepository) AnalyzePermissionConflicts(ctx context.Context, companyUserID int) (*models.PermissionAnalysis, error) {
	args := m.Called(ctx, companyUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PermissionAnalysis), args.Error(1)
}

// Audit logging
func (m *MockPermissionRepository) LogPermissionChange(ctx context.Context, log *models.PermissionAuditLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockPermissionRepository) GetPermissionAuditLogs(ctx context.Context, companyUserID *int, limit, offset int) ([]*models.PermissionAuditLog, int, error) {
	args := m.Called(ctx, companyUserID, limit, offset)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*models.PermissionAuditLog), args.Int(1), args.Error(2)
}

// Compile-time check to ensure MockPermissionRepository implements database.PermissionRepository
var _ database.PermissionRepository = (*MockPermissionRepository)(nil)

// Helper functions for creating pointers
func coreTestIntPtr(i int) *int {
	return &i
}

func coreTestStringPtr(s string) *string {
	return &s
}

// ============================================================================
// UNIT TESTS
// ============================================================================

// TestPermissionService_checkCustomPermissions tests custom permission checking
func TestPermissionService_checkCustomPermissions(t *testing.T) {
	tests := []struct {
		name            string
		permCtx         *UserPermissionContext
		permissionCode  string
		mockSetup       func(*MockPermissionRepository)
		wantGranted     bool
		wantSource      string
		wantReason      string
	}{
		{
			name: "granted by custom permission",
			permCtx: &UserPermissionContext{
				UserID:    1,
				ProjectID: coreTestIntPtr(100),
			},
			permissionCode: "project.read",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissionOverrides", mock.Anything, 1).
					Return(map[string]bool{
						"project.read": true,
					}, nil)
			},
			wantGranted: true,
			wantSource:  "custom_override",
			wantReason:  "granted by custom permission override",
		},
		{
			name: "denied by custom permission",
			permCtx: &UserPermissionContext{
				UserID: 1,
			},
			permissionCode: "project.delete",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissionOverrides", mock.Anything, 1).
					Return(map[string]bool{
						"project.delete": false,
					}, nil)
			},
			wantGranted: false,
			wantSource:  "custom_override",
			wantReason:  "denied by custom permission override",
		},
		{
			name: "no custom permission found",
			permCtx: &UserPermissionContext{
				UserID: 1,
			},
			permissionCode: "task.create",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissionOverrides", mock.Anything, 1).
					Return(map[string]bool{}, nil)
			},
			wantGranted: false,
			wantSource:  "",
			wantReason:  "",
		},
		{
			name: "db error",
			permCtx: &UserPermissionContext{
				UserID: 1,
			},
			permissionCode: "project.read",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissionOverrides", mock.Anything, 1).
					Return(nil, sql.ErrConnDone)
			},
			wantGranted: false,
			wantSource:  "",
			wantReason:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			tt.mockSetup(mockRepo)

			service := &PermissionService{
				permRepo: mockRepo,
			}

			granted, source, reason := service.checkCustomPermissions(context.Background(), tt.permCtx, tt.permissionCode)

			assert.Equal(t, tt.wantGranted, granted, "granted mismatch")
			assert.Equal(t, tt.wantSource, source, "source mismatch")
			assert.Equal(t, tt.wantReason, reason, "reason mismatch")

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestPermissionService_checkProjectPermissions tests project permission checking
func TestPermissionService_checkProjectPermissions(t *testing.T) {
	tests := []struct {
		name            string
		permCtx         *UserPermissionContext
		permissionCode  string
		mockSetup       func(*MockPermissionRepository)
		wantGranted     bool
		wantSource      string
		wantReasonPart  string
	}{
		{
			name: "granted project.read permission",
			permCtx: &UserPermissionContext{
				UserID:    1,
				ProjectID: coreTestIntPtr(100),
			},
			permissionCode: "project.read",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserProjectPermissions", mock.Anything, 1, 100).
					Return(&models.CompanyUserProjectPermission{
						CanViewProject: true,
					}, nil)
			},
			wantGranted:    true,
			wantSource:     "project_permission",
			wantReasonPart: "granted by project-specific permission",
		},
		{
			name: "granted project.update permission",
			permCtx: &UserPermissionContext{
				UserID:    1,
				ProjectID: coreTestIntPtr(100),
			},
			permissionCode: "project.update",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserProjectPermissions", mock.Anything, 1, 100).
					Return(&models.CompanyUserProjectPermission{
						CanEditProject: true,
					}, nil)
			},
			wantGranted:    true,
			wantSource:     "project_permission",
			wantReasonPart: "granted by project-specific permission",
		},
		{
			name: "granted task management permission",
			permCtx: &UserPermissionContext{
				UserID:    1,
				ProjectID: coreTestIntPtr(100),
			},
			permissionCode: "task.create",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserProjectPermissions", mock.Anything, 1, 100).
					Return(&models.CompanyUserProjectPermission{
						CanManageTasks: true,
					}, nil)
			},
			wantGranted:    true,
			wantSource:     "project_permission",
			wantReasonPart: "granted by project task management permission",
		},
		{
			name: "denied - no permission",
			permCtx: &UserPermissionContext{
				UserID:    1,
				ProjectID: coreTestIntPtr(100),
			},
			permissionCode: "project.delete",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserProjectPermissions", mock.Anything, 1, 100).
					Return(&models.CompanyUserProjectPermission{
						CanDeleteProject: false,
					}, nil)
			},
			wantGranted: false,
			wantSource:  "",
		},
		{
			name: "no project ID provided",
			permCtx: &UserPermissionContext{
				UserID:    1,
				ProjectID: nil,
			},
			permissionCode: "project.read",
			mockSetup:      func(m *MockPermissionRepository) {
				// No mock setup needed
			},
			wantGranted: false,
			wantSource:  "",
		},
		{
			name: "db error",
			permCtx: &UserPermissionContext{
				UserID:    1,
				ProjectID: coreTestIntPtr(100),
			},
			permissionCode: "project.read",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserProjectPermissions", mock.Anything, 1, 100).
					Return(nil, sql.ErrConnDone)
			},
			wantGranted: false,
			wantSource:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			tt.mockSetup(mockRepo)

			service := &PermissionService{
				permRepo: mockRepo,
			}

			granted, source, reason := service.checkProjectPermissions(context.Background(), tt.permCtx, tt.permissionCode)

			assert.Equal(t, tt.wantGranted, granted, "granted mismatch")
			assert.Equal(t, tt.wantSource, source, "source mismatch")
			if tt.wantReasonPart != "" {
				assert.Contains(t, reason, tt.wantReasonPart, "reason should contain expected part")
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestPermissionService_checkRolePermissions tests role-based permission checking
func TestPermissionService_checkRolePermissions(t *testing.T) {
	tests := []struct {
		name            string
		permCtx         *UserPermissionContext
		permissionCode  string
		mockSetup       func(*MockPermissionRepository)
		wantGranted     bool
		wantSource      string
		wantReasonPart  string
	}{
		{
			name: "granted by role permission",
			permCtx: &UserPermissionContext{
				UserID: 1,
			},
			permissionCode: "project.read",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissions", mock.Anything, 1).
					Return(&models.UserPermissionSummary{
						Role: &models.CompanyRoleResponse{
							ID:       1,
							RoleName: "Developer",
						},
						EffectivePermissions: []models.PermissionResponse{
							{
								PermissionCode: "project.read",
								IsActive:       true,
							},
							{
								PermissionCode: "task.create",
								IsActive:       true,
							},
						},
					}, nil)
			},
			wantGranted:    true,
			wantSource:     "role_permission",
			wantReasonPart: "granted by role: Developer",
		},
		{
			name: "denied - permission not in role",
			permCtx: &UserPermissionContext{
				UserID: 1,
			},
			permissionCode: "system.admin",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissions", mock.Anything, 1).
					Return(&models.UserPermissionSummary{
						Role: &models.CompanyRoleResponse{
							ID:       1,
							RoleName: "Developer",
						},
						EffectivePermissions: []models.PermissionResponse{
							{
								PermissionCode: "project.read",
								IsActive:       true,
							},
						},
					}, nil)
			},
			wantGranted: false,
			wantSource:  "",
		},
		{
			name: "denied - permission inactive",
			permCtx: &UserPermissionContext{
				UserID: 1,
			},
			permissionCode: "project.delete",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissions", mock.Anything, 1).
					Return(&models.UserPermissionSummary{
						Role: &models.CompanyRoleResponse{
							ID:       1,
							RoleName: "Developer",
						},
						EffectivePermissions: []models.PermissionResponse{
							{
								PermissionCode: "project.delete",
								IsActive:       false,
							},
						},
					}, nil)
			},
			wantGranted: false,
			wantSource:  "",
		},
		{
			name: "db error",
			permCtx: &UserPermissionContext{
				UserID: 1,
			},
			permissionCode: "project.read",
			mockSetup: func(m *MockPermissionRepository) {
				m.On("GetUserPermissions", mock.Anything, 1).
					Return(nil, sql.ErrConnDone)
			},
			wantGranted: false,
			wantSource:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			tt.mockSetup(mockRepo)

			service := &PermissionService{
				permRepo: mockRepo,
			}

			granted, source, reason := service.checkRolePermissions(context.Background(), tt.permCtx, tt.permissionCode)

			assert.Equal(t, tt.wantGranted, granted, "granted mismatch")
			assert.Equal(t, tt.wantSource, source, "source mismatch")
			if tt.wantReasonPart != "" {
				assert.Contains(t, reason, tt.wantReasonPart, "reason should contain expected part")
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestPermissionService_isSystemAdmin tests system admin checking
func TestPermissionService_isSystemAdmin(t *testing.T) {
	tests := []struct {
		name      string
		userID    int
		mockSetup func(*MockPermissionRepository)
		want      bool
	}{
		{
			name:   "user is system admin",
			userID: 1,
			mockSetup: func(m *MockPermissionRepository) {
				m.On("CheckUserPermission", mock.Anything, 1, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: true,
						Source:        "role",
					}, nil)
			},
			want: true,
		},
		{
			name:   "user is not system admin",
			userID: 2,
			mockSetup: func(m *MockPermissionRepository) {
				m.On("CheckUserPermission", mock.Anything, 2, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
			},
			want: false,
		},
		{
			name:   "invalid user ID (zero)",
			userID: 0,
			mockSetup: func(m *MockPermissionRepository) {
				// No mock expectations - should return early
			},
			want: false,
		},
		{
			name:   "db error",
			userID: 1,
			mockSetup: func(m *MockPermissionRepository) {
				m.On("CheckUserPermission", mock.Anything, 1, "system.admin", (*int)(nil)).
					Return(nil, sql.ErrConnDone)
			},
			want: false,
		},
		{
			name:   "permission result is nil",
			userID: 1,
			mockSetup: func(m *MockPermissionRepository) {
				m.On("CheckUserPermission", mock.Anything, 1, "system.admin", (*int)(nil)).
					Return((*models.PermissionResult)(nil), nil)
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			tt.mockSetup(mockRepo)

			service := &PermissionService{
				permRepo: mockRepo,
			}

			got := service.isSystemAdmin(context.Background(), tt.userID)

			assert.Equal(t, tt.want, got, "isSystemAdmin result mismatch")

			mockRepo.AssertExpectations(t)
		})
	}
}
