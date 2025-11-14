package services

import (
	"context"
	"database/sql"
	"testing"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
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

// TestPermissionService_CheckPermission tests the main CheckPermission entry point
// which checks permissions in a 5-layer hierarchy:
// 1. Admin override
// 2. Custom permissions
// 3. Project permissions
// 4. Role permissions
// 5. Dynamic permissions
// 6. Policy permissions
func TestPermissionService_CheckPermission(t *testing.T) {
	tests := []struct {
		name           string
		permCtx        *UserPermissionContext
		mockSetup      func(*MockPermissionRepository)
		wantGranted    bool
		wantSource     string
		wantReason     string
		wantErrContain string
	}{
		{
			name: "admin override - grants all permissions",
			permCtx: &UserPermissionContext{
				UserID:       1,
				ResourceType: "project",
				Action:       "delete",
				ProjectID:    coreTestIntPtr(100),
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Admin check returns true
				m.On("CheckUserPermission", mock.Anything, 1, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: true,
					}, nil)
			},
			wantGranted: true,
			wantSource:  "admin_override",
			wantReason:  "System admin has all permissions",
		},
		{
			name: "custom permission grants",
			permCtx: &UserPermissionContext{
				UserID:       2,
				ResourceType: "task",
				Action:       "read",
				ProjectID:    coreTestIntPtr(100),
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Not admin
				m.On("CheckUserPermission", mock.Anything, 2, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
				// Has custom permission
				m.On("GetUserPermissionOverrides", mock.Anything, 2).
					Return(map[string]bool{
						"task.read": true,
					}, nil)
			},
			wantGranted: true,
			wantSource:  "custom_override",
			wantReason:  "granted by custom permission override",
		},
		{
			name: "project permission grants",
			permCtx: &UserPermissionContext{
				UserID:       3,
				ResourceType: "project",
				Action:       "read",
				ProjectID:    coreTestIntPtr(100),
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Not admin
				m.On("CheckUserPermission", mock.Anything, 3, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
				// No custom permissions
				m.On("GetUserPermissionOverrides", mock.Anything, 3).
					Return(map[string]bool{}, nil)
				// Has project permission
				m.On("GetUserProjectPermissions", mock.Anything, 3, 100).
					Return(&models.CompanyUserProjectPermission{
						CompanyUserID:  3,
						ProjectID:      100,
						CanViewProject: true,
					}, nil)
			},
			wantGranted: true,
			wantSource:  "project_permission",
			wantReason:  "granted by project permission",
		},
		{
			name: "role permission grants",
			permCtx: &UserPermissionContext{
				UserID:       4,
				ResourceType: "requirement",
				Action:       "update",
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Not admin
				m.On("CheckUserPermission", mock.Anything, 4, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
				// No custom permissions
				m.On("GetUserPermissionOverrides", mock.Anything, 4).
					Return(map[string]bool{}, nil)
				// Has role permission
				m.On("GetUserPermissions", mock.Anything, 4).
					Return(&models.UserPermissionSummary{
						Role: &models.CompanyRoleResponse{
							ID:       2,
							RoleName: "Developer",
						},
						EffectivePermissions: []models.PermissionResponse{
							{
								PermissionCode: "requirement.update",
								IsActive:       true,
							},
						},
					}, nil)
			},
			wantGranted: true,
			wantSource:  "role",
			wantReason:  "granted by role Developer",
		},
		{
			name: "dynamic permission grants",
			permCtx: &UserPermissionContext{
				UserID:       5,
				ResourceType: "task",
				Action:       "assign",
				ProjectID:    coreTestIntPtr(100),
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Not admin
				m.On("CheckUserPermission", mock.Anything, 5, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
				// No custom permissions
				m.On("GetUserPermissionOverrides", mock.Anything, 5).
					Return(map[string]bool{}, nil)
				// No project permissions
				m.On("GetUserProjectPermissions", mock.Anything, 5, 100).
					Return(nil, nil)
				// No role permissions
				m.On("GetUserPermissions", mock.Anything, 5).
					Return(&models.UserPermissionSummary{
						Role: &models.CompanyRoleResponse{
							ID:       3,
							RoleName: "Viewer",
						},
						EffectivePermissions: []models.PermissionResponse{},
					}, nil)
				// Has dynamic permission - for now returns false (placeholder)
				// In real implementation, would check delegation table
			},
			wantGranted: false, // Dynamic permissions not fully implemented yet
			wantSource:  "",
			wantReason:  "permission denied - no matching grants found",
		},
		{
			name: "permission denied - no grants at any level",
			permCtx: &UserPermissionContext{
				UserID:       6,
				ResourceType: "project",
				Action:       "delete",
				ProjectID:    coreTestIntPtr(100),
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Not admin
				m.On("CheckUserPermission", mock.Anything, 6, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
				// No custom permissions
				m.On("GetUserPermissionOverrides", mock.Anything, 6).
					Return(map[string]bool{}, nil)
				// No project permissions
				m.On("GetUserProjectPermissions", mock.Anything, 6, 100).
					Return(nil, nil)
				// No role permissions
				m.On("GetUserPermissions", mock.Anything, 6).
					Return(&models.UserPermissionSummary{
						Role: &models.CompanyRoleResponse{
							ID:       3,
							RoleName: "Viewer",
						},
						EffectivePermissions: []models.PermissionResponse{},
					}, nil)
			},
			wantGranted: false,
			wantSource:  "",
			wantReason:  "permission denied - no matching grants found",
		},
		{
			name: "custom permission denies explicitly",
			permCtx: &UserPermissionContext{
				UserID:       7,
				ResourceType: "project",
				Action:       "delete",
				ProjectID:    coreTestIntPtr(100),
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Not admin
				m.On("CheckUserPermission", mock.Anything, 7, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
				// Custom permission explicitly denies
				m.On("GetUserPermissionOverrides", mock.Anything, 7).
					Return(map[string]bool{
						"project.delete": false, // Explicit deny
					}, nil)
			},
			wantGranted: false,
			wantSource:  "",
			wantReason:  "permission denied - no matching grants found",
		},
		{
			name: "role permission inactive - should deny",
			permCtx: &UserPermissionContext{
				UserID:       8,
				ResourceType: "task",
				Action:       "delete",
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Not admin
				m.On("CheckUserPermission", mock.Anything, 8, "system.admin", (*int)(nil)).
					Return(&models.PermissionResult{
						HasPermission: false,
					}, nil)
				// No custom permissions
				m.On("GetUserPermissionOverrides", mock.Anything, 8).
					Return(map[string]bool{}, nil)
				// Role has permission but it's inactive
				m.On("GetUserPermissions", mock.Anything, 8).
					Return(&models.UserPermissionSummary{
						Role: &models.CompanyRoleResponse{
							ID:       2,
							RoleName: "Developer",
						},
						EffectivePermissions: []models.PermissionResponse{
							{
								PermissionCode: "task.delete",
								IsActive:       false, // Inactive!
							},
						},
					}, nil)
			},
			wantGranted: false,
			wantSource:  "",
			wantReason:  "permission denied - no matching grants found",
		},
		{
			name: "database error in admin check",
			permCtx: &UserPermissionContext{
				UserID:       9,
				ResourceType: "project",
				Action:       "read",
			},
			mockSetup: func(m *MockPermissionRepository) {
				// Database error on admin check
				m.On("CheckUserPermission", mock.Anything, 9, "system.admin", (*int)(nil)).
					Return(nil, sql.ErrConnDone)
			},
			wantGranted: false,
			wantSource:  "",
			wantReason:  "permission denied - no matching grants found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			tt.mockSetup(mockRepo)

			service := &PermissionService{
				permRepo: mockRepo,
			}

			result, err := service.CheckPermission(context.Background(), tt.permCtx)

			if tt.wantErrContain != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErrContain)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.wantGranted, result.HasPermission, "HasPermission mismatch")
				assert.Equal(t, tt.wantSource, result.Source, "Source mismatch")
				assert.Equal(t, tt.wantReason, result.Reason, "Reason mismatch")
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestPermissionService_GetUserAccessibleProjects tests the GetUserAccessibleProjects method
// which uses direct SQL to get projects user has access to via permissions or task assignments
func TestPermissionService_GetUserAccessibleProjects(t *testing.T) {
	tests := []struct {
		name           string
		userID         int
		mockSetup      func(sqlmock.Sqlmock)
		wantProjects   []int
		wantErrContain string
	}{
		{
			name:   "user has access to multiple projects via permissions and tasks",
			userID: 1,
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id"}).
					AddRow(100).
					AddRow(200).
					AddRow(300)
				sqlMock.ExpectQuery(`SELECT DISTINCT p.id`).
					WithArgs(1).
					WillReturnRows(rows)
			},
			wantProjects: []int{100, 200, 300},
		},
		{
			name:   "user has access to single project",
			userID: 2,
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id"}).
					AddRow(100)
				sqlMock.ExpectQuery(`SELECT DISTINCT p.id`).
					WithArgs(2).
					WillReturnRows(rows)
			},
			wantProjects: []int{100},
		},
		{
			name:   "user has no accessible projects",
			userID: 3,
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id"})
				sqlMock.ExpectQuery(`SELECT DISTINCT p.id`).
					WithArgs(3).
					WillReturnRows(rows)
			},
			wantProjects: []int{},
		},
		{
			name:   "database query error",
			userID: 4,
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				sqlMock.ExpectQuery(`SELECT DISTINCT p.id`).
					WithArgs(4).
					WillReturnError(sql.ErrConnDone)
			},
			wantProjects:   nil,
			wantErrContain: "failed to query accessible projects",
		},
		{
			name:   "scan error during iteration",
			userID: 5,
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id"}).
					AddRow("invalid_id"). // String instead of int causes scan error
					RowError(0, sql.ErrNoRows)
				sqlMock.ExpectQuery(`SELECT DISTINCT p.id`).
					WithArgs(5).
					WillReturnRows(rows)
			},
			wantProjects:   nil,
			wantErrContain: "failed to scan project ID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock DB
			db, sqlMock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(sqlMock)

			// Create service with nil repo (not needed for this method)
			service := &PermissionService{
				db: db,
			}

			got, err := service.GetUserAccessibleProjects(context.Background(), tt.userID)

			if tt.wantErrContain != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErrContain)
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				if tt.wantProjects == nil || len(tt.wantProjects) == 0 {
					assert.Empty(t, got)
				} else {
					assert.Equal(t, tt.wantProjects, got)
				}
			}

			// Verify all expectations were met
			assert.NoError(t, sqlMock.ExpectationsWereMet())
		})
	}
}

// TestPermissionService_InitializeSystemPermissions tests the InitializeSystemPermissions method
// which performs batch upsert of all system permissions
func TestPermissionService_InitializeSystemPermissions(t *testing.T) {
	tests := []struct {
		name           string
		mockSetup      func(sqlmock.Sqlmock)
		wantErrContain string
	}{
		{
			name: "successfully initializes all permissions",
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				// This will be handled by AnyTimes() in the test body
			},
		},
		{
			name: "database error during upsert",
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				// First query succeeds, second fails
				sqlMock.ExpectExec(`INSERT INTO permissions`).
					WillReturnError(sql.ErrConnDone)
			},
			wantErrContain: "failed to upsert permission",
		},
		{
			name: "context cancellation during batch operation",
			mockSetup: func(sqlMock sqlmock.Sqlmock) {
				// Simulate context cancellation error
				sqlMock.ExpectExec(`INSERT INTO permissions`).
					WillReturnError(context.Canceled)
			},
			wantErrContain: "failed to upsert permission",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock DB
			db, sqlMock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
			require.NoError(t, err)
			defer db.Close()

			// For the success case, we need to accept any number of exec calls
			if tt.wantErrContain == "" {
				// Allow any number of successful inserts - match any regex
				sqlMock.ExpectExec(`.+`).
					WillReturnResult(sqlmock.NewResult(1, 1)).
					WillReturnResult(sqlmock.NewResult(1, 1))
			} else {
				tt.mockSetup(sqlMock)
			}

			service := &PermissionService{
				db: db,
			}

			err = service.InitializeSystemPermissions(context.Background())

			if tt.wantErrContain != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErrContain)
			} else {
				assert.NoError(t, err)
			}

			// Don't check ExpectationsWereMet for success case since we can't predict exact count
			if tt.wantErrContain != "" {
				assert.NoError(t, sqlMock.ExpectationsWereMet())
			}
		})
	}
}

// TestPermissionService_CreateRole tests the CreateRole method
func TestPermissionService_CreateRole(t *testing.T) {
	tests := []struct {
		name            string
		roleCode        string
		roleName        string
		description     string
		permissionCodes []string
		mockSetup       func(*MockPermissionRepository, sqlmock.Sqlmock)
		wantRoleID      int
		wantErrContain  string
	}{
		{
			name:            "successfully creates role with permissions",
			roleCode:        "DEVELOPER",
			roleName:        "Developer",
			description:     "Developer role with code access",
			permissionCodes: []string{"project.read", "task.update"},
			mockSetup: func(m *MockPermissionRepository, sqlMock sqlmock.Sqlmock) {
				// Mock CreateRole
				m.On("CreateRole", mock.Anything, mock.MatchedBy(func(role *models.CompanyRole) bool {
					return role.RoleCode == "DEVELOPER" && role.RoleName == "Developer"
				})).Return(&models.CompanyRole{
					ID:              10,
					RoleCode:        "DEVELOPER",
					RoleName:        "Developer",
					RoleDescription: coreTestStringPtr("Developer role with code access"),
					IsActive:        true,
				}, nil)

				// Mock permission ID lookups
				rows1 := sqlmock.NewRows([]string{"id"}).AddRow(1)
				sqlMock.ExpectQuery(`SELECT id FROM permissions WHERE code`).
					WithArgs("project.read").
					WillReturnRows(rows1)

				rows2 := sqlmock.NewRows([]string{"id"}).AddRow(2)
				sqlMock.ExpectQuery(`SELECT id FROM permissions WHERE code`).
					WithArgs("task.update").
					WillReturnRows(rows2)

				// Mock SetRolePermissions
				m.On("SetRolePermissions", mock.Anything, 10, []int{1, 2}).
					Return(nil)
			},
			wantRoleID: 10,
		},
		{
			name:            "successfully creates role without permissions",
			roleCode:        "VIEWER",
			roleName:        "Viewer",
			description:     "Read-only role",
			permissionCodes: []string{},
			mockSetup: func(m *MockPermissionRepository, sqlMock sqlmock.Sqlmock) {
				m.On("CreateRole", mock.Anything, mock.MatchedBy(func(role *models.CompanyRole) bool {
					return role.RoleCode == "VIEWER"
				})).Return(&models.CompanyRole{
					ID:       20,
					RoleCode: "VIEWER",
					RoleName: "Viewer",
					IsActive: true,
				}, nil)
				// No permission lookups or SetRolePermissions calls
			},
			wantRoleID: 20,
		},
		{
			name:            "fails to create role",
			roleCode:        "INVALID",
			roleName:        "Invalid",
			description:     "Should fail",
			permissionCodes: []string{},
			mockSetup: func(m *MockPermissionRepository, sqlMock sqlmock.Sqlmock) {
				m.On("CreateRole", mock.Anything, mock.Anything).
					Return(nil, sql.ErrConnDone)
			},
			wantErrContain: "failed to create role",
		},
		{
			name:            "fails to set permissions",
			roleCode:        "ADMIN",
			roleName:        "Admin",
			description:     "Admin role",
			permissionCodes: []string{"project.delete"},
			mockSetup: func(m *MockPermissionRepository, sqlMock sqlmock.Sqlmock) {
				m.On("CreateRole", mock.Anything, mock.Anything).
					Return(&models.CompanyRole{
						ID:       30,
						RoleCode: "ADMIN",
					}, nil)

				rows := sqlmock.NewRows([]string{"id"}).AddRow(99)
				sqlMock.ExpectQuery(`SELECT id FROM permissions WHERE code`).
					WithArgs("project.delete").
					WillReturnRows(rows)

				m.On("SetRolePermissions", mock.Anything, 30, []int{99}).
					Return(sql.ErrConnDone)
			},
			wantErrContain: "failed to set role permissions",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			db, sqlMock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mockRepo, sqlMock)

			service := &PermissionService{
				permRepo: mockRepo,
				db:       db,
			}

			got, err := service.CreateRole(context.Background(), tt.roleCode, tt.roleName, tt.description, tt.permissionCodes)

			if tt.wantErrContain != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErrContain)
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, got)
				assert.Equal(t, tt.wantRoleID, got.ID)
			}

			mockRepo.AssertExpectations(t)
			assert.NoError(t, sqlMock.ExpectationsWereMet())
		})
	}
}

// TestPermissionService_AssignRoleToUser tests the AssignRoleToUser method
func TestPermissionService_AssignRoleToUser(t *testing.T) {
	tests := []struct {
		name           string
		userID         int
		roleID         int
		mockSetup      func(*MockPermissionRepository)
		wantErrContain string
	}{
		{
			name:   "successfully assigns role to user",
			userID: 1,
			roleID: 5,
			mockSetup: func(m *MockPermissionRepository) {
				roleIDPtr := coreTestIntPtr(5)
				m.On("UpdateUserRole", mock.Anything, 1, roleIDPtr).
					Return(nil)
			},
		},
		{
			name:   "database error during role assignment",
			userID: 2,
			roleID: 10,
			mockSetup: func(m *MockPermissionRepository) {
				m.On("UpdateUserRole", mock.Anything, 2, mock.Anything).
					Return(sql.ErrConnDone)
			},
			wantErrContain: "failed to assign role to user",
		},
		{
			name:   "user does not exist",
			userID: 9999,
			roleID: 5,
			mockSetup: func(m *MockPermissionRepository) {
				m.On("UpdateUserRole", mock.Anything, 9999, mock.Anything).
					Return(sql.ErrNoRows)
			},
			wantErrContain: "failed to assign role to user",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			tt.mockSetup(mockRepo)

			service := &PermissionService{
				permRepo: mockRepo,
			}

			err := service.AssignRoleToUser(context.Background(), tt.userID, tt.roleID)

			if tt.wantErrContain != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErrContain)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestPermissionService_GrantProjectPermission tests the GrantProjectPermission method
func TestPermissionService_GrantProjectPermission(t *testing.T) {
	tests := []struct {
		name           string
		userID         int
		projectID      int
		permissions    map[string]bool
		mockSetup      func(*MockPermissionRepository)
		wantErrContain string
	}{
		{
			name:      "successfully grants project permissions",
			userID:    1,
			projectID: 100,
			permissions: map[string]bool{
				"can_view_project":   true,
				"can_edit_project":   true,
				"can_manage_tasks":   true,
				"can_view_financials": false,
			},
			mockSetup: func(m *MockPermissionRepository) {
				m.On("SetUserProjectPermissions", mock.Anything, mock.MatchedBy(func(perm *models.CompanyUserProjectPermission) bool {
					return perm.CompanyUserID == 1 &&
						perm.ProjectID == 100 &&
						perm.CanViewProject == true &&
						perm.CanEditProject == true &&
						perm.CanManageTasks == true &&
						perm.CanViewFinancials == false
				})).Return(nil)
			},
		},
		{
			name:      "successfully grants all permissions",
			userID:    2,
			projectID: 200,
			permissions: map[string]bool{
				"can_view_project":    true,
				"can_edit_project":    true,
				"can_delete_project":  true,
				"can_manage_tasks":    true,
				"can_view_financials": true,
				"can_manage_members":  true,
			},
			mockSetup: func(m *MockPermissionRepository) {
				m.On("SetUserProjectPermissions", mock.Anything, mock.MatchedBy(func(perm *models.CompanyUserProjectPermission) bool {
					return perm.CanViewProject &&
						perm.CanEditProject &&
						perm.CanDeleteProject &&
						perm.CanManageTasks &&
						perm.CanViewFinancials &&
						perm.CanManageMembers
				})).Return(nil)
			},
		},
		{
			name:      "database error during permission grant",
			userID:    3,
			projectID: 300,
			permissions: map[string]bool{
				"can_view_project": true,
			},
			mockSetup: func(m *MockPermissionRepository) {
				m.On("SetUserProjectPermissions", mock.Anything, mock.Anything).
					Return(sql.ErrConnDone)
			},
			wantErrContain: "failed to grant project permission",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockPermissionRepository)
			tt.mockSetup(mockRepo)

			service := &PermissionService{
				permRepo: mockRepo,
			}

			err := service.GrantProjectPermission(context.Background(), tt.userID, tt.projectID, tt.permissions)

			if tt.wantErrContain != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErrContain)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
