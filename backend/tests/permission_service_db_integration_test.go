package tests

import (
	"ai-project-backend/database"
	"ai-project-backend/services"
	"context"
	"database/sql"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// PermissionServiceDBIntegrationTestSuite tests PermissionService database integration
type PermissionServiceDBIntegrationTestSuite struct {
	suite.Suite
	testApp      *TestApp
	db           *sql.DB
	permRepo     database.PermissionRepository
	permService  *services.PermissionService
	testUsers    map[string]int // username -> user_id
	testRoles    map[string]int // role_name -> role_id
	testProjects []int          // project_ids
	ctx          context.Context
}

// SetupSuite runs once before all tests
func (s *PermissionServiceDBIntegrationTestSuite) SetupSuite() {
	s.T().Log("🚀 Setting up PermissionService DB Integration Test Suite...")

	// 1. Initialize test application
	s.testApp = SetupTestApp(s.T())
	s.db = s.testApp.DB.GetDB().(*sql.DB)
	s.ctx = context.Background()

	// 2. Create PermissionRepository
	s.permRepo = database.NewPermissionRepository(s.db)

	// 3. Create PermissionService (重构后的版本)
	s.permService = services.NewPermissionService(s.permRepo, s.db)

	// 4. Initialize system permissions
	s.T().Log("   Initializing system permissions...")
	err := s.permService.InitializeSystemPermissions(s.ctx)
	assert.NoError(s.T(), err, "Failed to initialize system permissions")

	// 5. Setup test data
	s.T().Log("   Setting up test data...")
	s.setupTestData()

	s.T().Log("✅ Test suite setup complete")
}

// TearDownSuite runs once after all tests
func (s *PermissionServiceDBIntegrationTestSuite) TearDownSuite() {
	s.T().Log("🧹 Cleaning up test data...")

	// Cleanup test data in reverse order
	if len(s.testProjects) > 0 {
		for _, projectID := range s.testProjects {
			s.db.Exec("DELETE FROM projects WHERE id = $1", projectID)
		}
	}

	if len(s.testRoles) > 0 {
		for _, roleID := range s.testRoles {
			s.db.Exec("DELETE FROM company_roles WHERE id = $1", roleID)
		}
	}

	if len(s.testUsers) > 0 {
		userIDs := make([]int, 0, len(s.testUsers))
		for _, userID := range s.testUsers {
			userIDs = append(userIDs, userID)
		}
		for _, userID := range userIDs {
			s.db.Exec("DELETE FROM users WHERE id = $1", userID)
		}
	}

	TeardownTestApp(s.T(), s.testApp)
	s.T().Log("✅ Test suite teardown complete")
}

// setupTestData creates minimal test data
func (s *PermissionServiceDBIntegrationTestSuite) setupTestData() {
	s.testUsers = make(map[string]int)
	s.testRoles = make(map[string]int)
	s.testProjects = make([]int, 0)

	// Create system admin user
	adminID := s.createTestUser("test_admin", "admin", "system")
	s.testUsers["admin"] = adminID

	// Create regular users
	developerID := s.createTestUser("test_developer", "enterprise_user", "company")
	viewerID := s.createTestUser("test_viewer", "enterprise_user", "company")
	s.testUsers["developer"] = developerID
	s.testUsers["viewer"] = viewerID

	// Create roles with permissions
	developerRoleID := s.createTestRole("Developer", []string{
		"project.read", "project.write", "task.create", "task.update", "task.read",
	})
	viewerRoleID := s.createTestRole("Viewer", []string{
		"project.read", "task.read",
	})
	s.testRoles["developer"] = developerRoleID
	s.testRoles["viewer"] = viewerRoleID

	// Assign roles to users
	s.assignRole(developerID, developerRoleID)
	s.assignRole(viewerID, viewerRoleID)

	// Create test projects
	project1ID := s.createTestProject("Test Project 1")
	project2ID := s.createTestProject("Test Project 2")
	s.testProjects = append(s.testProjects, project1ID, project2ID)

	s.T().Logf("   Created users: admin=%d, developer=%d, viewer=%d", adminID, developerID, viewerID)
	s.T().Logf("   Created roles: developer=%d, viewer=%d", developerRoleID, viewerRoleID)
	s.T().Logf("   Created projects: %v", s.testProjects)
}

// Helper methods

func (s *PermissionServiceDBIntegrationTestSuite) createTestUser(username, role, userType string) int {
	var userID int
	query := `
		INSERT INTO users (username, password_hash, email, role, user_type, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id
	`
	err := s.db.QueryRow(query,
		username,
		"test_hash",
		fmt.Sprintf("%s@test.com", username),
		role,
		userType,
		"active",
	).Scan(&userID)
	assert.NoError(s.T(), err, fmt.Sprintf("Failed to create user %s", username))
	return userID
}

func (s *PermissionServiceDBIntegrationTestSuite) createTestRole(roleName string, permissions []string) int {
	role, err := s.permService.CreateRole(s.ctx, roleName, roleName, fmt.Sprintf("Test role: %s", roleName), permissions)
	assert.NoError(s.T(), err, fmt.Sprintf("Failed to create role %s", roleName))
	return role.ID
}

func (s *PermissionServiceDBIntegrationTestSuite) assignRole(userID, roleID int) {
	err := s.permService.AssignRoleToUser(s.ctx, userID, roleID)
	assert.NoError(s.T(), err, fmt.Sprintf("Failed to assign role %d to user %d", roleID, userID))
}

func (s *PermissionServiceDBIntegrationTestSuite) createTestProject(name string) int {
	var projectID int
	query := `
		INSERT INTO projects (name, description, status, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id
	`
	err := s.db.QueryRow(query, name, fmt.Sprintf("Test project: %s", name), "active").Scan(&projectID)
	assert.NoError(s.T(), err, fmt.Sprintf("Failed to create project %s", name))
	return projectID
}

// ============================================================================
// 1. Core Permission Check Tests (6 tests)
// ============================================================================

// Test 1: System admin bypasses all checks
func (s *PermissionServiceDBIntegrationTestSuite) TestPermissionCheck_SystemAdminBypass() {
	s.T().Log("🧪 Test 1: System Admin Bypasses All Checks")

	adminID := s.testUsers["admin"]
	projectID := s.testProjects[0]

	permCtx := &services.UserPermissionContext{
		UserID:       adminID,
		ResourceType: "project",
		ResourceID:   &projectID,
		Action:       "delete", // Admin doesn't have this in any role
	}

	result, err := s.permService.CheckPermission(s.ctx, permCtx)

	assert.NoError(s.T(), err)
	assert.NotNil(s.T(), result)
	assert.True(s.T(), result.HasPermission, "System admin should have all permissions")
	assert.Equal(s.T(), "admin_override", result.Source)
	assert.Contains(s.T(), result.Reason, "System admin")
}

// Test 2: Custom override grants access
func (s *PermissionServiceDBIntegrationTestSuite) TestPermissionCheck_CustomOverrideGrants() {
	s.T().Log("🧪 Test 2: Custom Override Grants Access")

	viewerID := s.testUsers["viewer"]

	// Grant viewer custom override for project.write (not in their role)
	query := `
		INSERT INTO user_permission_overrides (company_user_id, permission_code, is_granted, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
	`
	_, err := s.db.Exec(query, viewerID, "project.write", true)
	assert.NoError(s.T(), err)

	defer func() {
		s.db.Exec("DELETE FROM user_permission_overrides WHERE company_user_id = $1", viewerID)
	}()

	permCtx := &services.UserPermissionContext{
		UserID:       viewerID,
		ResourceType: "project",
		Action:       "write",
	}

	result, err := s.permService.CheckPermission(s.ctx, permCtx)

	assert.NoError(s.T(), err)
	assert.True(s.T(), result.HasPermission, "Custom override should grant access")
	assert.Equal(s.T(), "custom_override", result.Source)
}

// Test 3: Custom override denies access
func (s *PermissionServiceDBIntegrationTestSuite) TestPermissionCheck_CustomOverrideDenies() {
	s.T().Log("🧪 Test 3: Custom Override Denies Access")

	developerID := s.testUsers["developer"]

	// Deny developer's project.read (which they have from role)
	query := `
		INSERT INTO user_permission_overrides (company_user_id, permission_code, is_granted, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
	`
	_, err := s.db.Exec(query, developerID, "project.read", false)
	assert.NoError(s.T(), err)

	defer func() {
		s.db.Exec("DELETE FROM user_permission_overrides WHERE company_user_id = $1", developerID)
	}()

	permCtx := &services.UserPermissionContext{
		UserID:       developerID,
		ResourceType: "project",
		Action:       "read",
	}

	result, err := s.permService.CheckPermission(s.ctx, permCtx)

	assert.NoError(s.T(), err)
	assert.False(s.T(), result.HasPermission, "Custom override should deny access")
	assert.Equal(s.T(), "custom_override", result.Source)
}

// Test 4: Project-specific permission grants access
func (s *PermissionServiceDBIntegrationTestSuite) TestPermissionCheck_ProjectPermissionGrants() {
	s.T().Log("🧪 Test 4: Project-Specific Permission Grants Access")

	viewerID := s.testUsers["viewer"]
	projectID := s.testProjects[0]

	// Grant viewer write permission on specific project
	permissions := map[string]bool{
		"project.write": true,
	}
	err := s.permService.GrantProjectPermission(s.ctx, viewerID, projectID, permissions)
	assert.NoError(s.T(), err)

	defer func() {
		s.db.Exec("DELETE FROM user_project_permissions WHERE company_user_id = $1 AND project_id = $2",
			viewerID, projectID)
	}()

	permCtx := &services.UserPermissionContext{
		UserID:       viewerID,
		ResourceType: "project",
		ResourceID:   &projectID,
		Action:       "write",
	}

	result, err := s.permService.CheckPermission(s.ctx, permCtx)

	assert.NoError(s.T(), err)
	assert.True(s.T(), result.HasPermission, "Project permission should grant access")
	assert.Equal(s.T(), "project_permission", result.Source)
}

// Test 5: Role permission grants access
func (s *PermissionServiceDBIntegrationTestSuite) TestPermissionCheck_RolePermissionGrants() {
	s.T().Log("🧪 Test 5: Role Permission Grants Access")

	developerID := s.testUsers["developer"]

	permCtx := &services.UserPermissionContext{
		UserID:       developerID,
		ResourceType: "project",
		Action:       "read",
	}

	result, err := s.permService.CheckPermission(s.ctx, permCtx)

	assert.NoError(s.T(), err)
	assert.True(s.T(), result.HasPermission, "Role permission should grant access")
	assert.Equal(s.T(), "role_permission", result.Source)
	assert.Contains(s.T(), result.Reason, "role")
}

// Test 6: Multi-layer check with fallback
func (s *PermissionServiceDBIntegrationTestSuite) TestPermissionCheck_MultiLayerFallback() {
	s.T().Log("🧪 Test 6: Multi-Layer Check with Fallback")

	viewerID := s.testUsers["viewer"]
	projectID := s.testProjects[0]

	// Viewer has project.read from role, not project.write
	// No custom override, no project-specific permission
	// Should fall back to role and grant read, deny write

	// Test read (should succeed from role)
	readCtx := &services.UserPermissionContext{
		UserID:       viewerID,
		ResourceType: "project",
		ResourceID:   &projectID,
		Action:       "read",
	}

	readResult, err := s.permService.CheckPermission(s.ctx, readCtx)
	assert.NoError(s.T(), err)
	assert.True(s.T(), readResult.HasPermission, "Read should be granted from role")
	assert.Equal(s.T(), "role_permission", readResult.Source)

	// Test write (should fail - not in role)
	writeCtx := &services.UserPermissionContext{
		UserID:       viewerID,
		ResourceType: "project",
		ResourceID:   &projectID,
		Action:       "write",
	}

	writeResult, err := s.permService.CheckPermission(s.ctx, writeCtx)
	assert.NoError(s.T(), err)
	assert.False(s.T(), writeResult.HasPermission, "Write should be denied")
}

// ============================================================================
// 2. Permission Management Tests (3 tests)
// ============================================================================

// Test 7: InitializeSystemPermissions creates all permissions
func (s *PermissionServiceDBIntegrationTestSuite) TestManagement_InitializeSystemPermissions() {
	s.T().Log("🧪 Test 7: Initialize System Permissions")

	// Re-run initialization (should be idempotent)
	err := s.permService.InitializeSystemPermissions(s.ctx)
	assert.NoError(s.T(), err, "Re-initialization should not fail")

	// Verify permissions exist
	var count int
	err = s.db.QueryRow("SELECT COUNT(*) FROM permissions").Scan(&count)
	assert.NoError(s.T(), err)
	assert.Greater(s.T(), count, 0, "Should have system permissions")

	// Verify specific critical permissions
	criticalPerms := []string{"system.admin", "project.read", "project.write", "task.create"}
	for _, perm := range criticalPerms {
		var exists bool
		err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM permissions WHERE code = $1)", perm).Scan(&exists)
		assert.NoError(s.T(), err)
		assert.True(s.T(), exists, fmt.Sprintf("Permission %s should exist", perm))
	}
}

// Test 8: CreateRole and assign to user
func (s *PermissionServiceDBIntegrationTestSuite) TestManagement_CreateRoleAndAssign() {
	s.T().Log("🧪 Test 8: Create Role and Assign to User")

	// Create new role
	role, err := s.permService.CreateRole(s.ctx,
		"TestManager",
		"Test Manager",
		"Manager role for testing",
		[]string{"project.read", "project.write", "task.read", "task.write"},
	)
	assert.NoError(s.T(), err)
	assert.NotNil(s.T(), role)
	assert.Equal(s.T(), "Test Manager", role.RoleName)

	defer func() {
		s.db.Exec("DELETE FROM company_roles WHERE id = $1", role.ID)
	}()

	// Create new user
	testUserID := s.createTestUser("test_manager_user", "enterprise_user", "company")
	defer func() {
		s.db.Exec("DELETE FROM users WHERE id = $1", testUserID)
	}()

	// Assign role to user
	err = s.permService.AssignRoleToUser(s.ctx, testUserID, role.ID)
	assert.NoError(s.T(), err)

	// Verify user has role
	var assignedRoleID int
	err = s.db.QueryRow("SELECT role_id FROM company_users WHERE id = $1", testUserID).Scan(&assignedRoleID)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), role.ID, assignedRoleID)

	// Verify user can perform actions from role
	permCtx := &services.UserPermissionContext{
		UserID:       testUserID,
		ResourceType: "task",
		Action:       "write",
	}

	result, err := s.permService.CheckPermission(s.ctx, permCtx)
	assert.NoError(s.T(), err)
	assert.True(s.T(), result.HasPermission, "User should have permission from new role")
}

// Test 9: GrantProjectPermission isolates by project
func (s *PermissionServiceDBIntegrationTestSuite) TestManagement_ProjectPermissionIsolation() {
	s.T().Log("🧪 Test 9: Project Permission Isolation")

	viewerID := s.testUsers["viewer"]
	project1ID := s.testProjects[0]
	project2ID := s.testProjects[1]

	// Grant write permission ONLY on project1
	permissions := map[string]bool{
		"project.write": true,
		"task.write":    true,
	}
	err := s.permService.GrantProjectPermission(s.ctx, viewerID, project1ID, permissions)
	assert.NoError(s.T(), err)

	defer func() {
		s.db.Exec("DELETE FROM user_project_permissions WHERE company_user_id = $1", viewerID)
	}()

	// Verify access on project1
	ctx1 := &services.UserPermissionContext{
		UserID:       viewerID,
		ResourceType: "project",
		ResourceID:   &project1ID,
		Action:       "write",
	}
	result1, err := s.permService.CheckPermission(s.ctx, ctx1)
	assert.NoError(s.T(), err)
	assert.True(s.T(), result1.HasPermission, "Should have write on project1")

	// Verify NO access on project2
	ctx2 := &services.UserPermissionContext{
		UserID:       viewerID,
		ResourceType: "project",
		ResourceID:   &project2ID,
		Action:       "write",
	}
	result2, err := s.permService.CheckPermission(s.ctx, ctx2)
	assert.NoError(s.T(), err)
	assert.False(s.T(), result2.HasPermission, "Should NOT have write on project2")
}

// ============================================================================
// 3. User Accessible Projects Tests (3 tests)
// ============================================================================

// Test 10: Get projects by role permissions
func (s *PermissionServiceDBIntegrationTestSuite) TestUserProjects_ByRolePermissions() {
	s.T().Log("🧪 Test 10: Get User Accessible Projects by Role")

	developerID := s.testUsers["developer"]

	// Developer should see all projects (has project.read from role)
	projectIDs, err := s.permService.GetUserAccessibleProjects(s.ctx, developerID)

	assert.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(projectIDs), 2, "Developer should see at least test projects")

	// Verify test projects are included
	projectIDMap := make(map[int]bool)
	for _, id := range projectIDs {
		projectIDMap[id] = true
	}
	for _, testProjectID := range s.testProjects {
		assert.True(s.T(), projectIDMap[testProjectID],
			fmt.Sprintf("Developer should have access to project %d", testProjectID))
	}
}

// Test 11: Get projects by project-specific permissions
func (s *PermissionServiceDBIntegrationTestSuite) TestUserProjects_ByProjectPermissions() {
	s.T().Log("🧪 Test 11: Get User Accessible Projects by Project-Specific Permissions")

	// Create user with no role permissions
	noRoleUserID := s.createTestUser("test_norole_user", "enterprise_user", "company")
	defer func() {
		s.db.Exec("DELETE FROM users WHERE id = $1", noRoleUserID)
		s.db.Exec("DELETE FROM user_project_permissions WHERE company_user_id = $1", noRoleUserID)
	}()

	// Initially should have no projects
	projectIDs, err := s.permService.GetUserAccessibleProjects(s.ctx, noRoleUserID)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), 0, len(projectIDs), "User with no permissions should see no projects")

	// Grant access to specific project
	project1ID := s.testProjects[0]
	permissions := map[string]bool{"project.read": true}
	err = s.permService.GrantProjectPermission(s.ctx, noRoleUserID, project1ID, permissions)
	assert.NoError(s.T(), err)

	// Now should see the granted project
	projectIDs, err = s.permService.GetUserAccessibleProjects(s.ctx, noRoleUserID)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), 1, len(projectIDs), "User should see exactly one project")
	assert.Equal(s.T(), project1ID, projectIDs[0])
}

// Test 12: Combine role and project permissions (UNION)
func (s *PermissionServiceDBIntegrationTestSuite) TestUserProjects_CombineRoleAndProject() {
	s.T().Log("🧪 Test 12: Combine Role and Project Permissions")

	// Create user with viewer role (has project.read)
	testUserID := s.createTestUser("test_combined_user", "enterprise_user", "company")
	viewerRoleID := s.testRoles["viewer"]
	s.assignRole(testUserID, viewerRoleID)

	defer func() {
		s.db.Exec("DELETE FROM users WHERE id = $1", testUserID)
		s.db.Exec("DELETE FROM user_project_permissions WHERE company_user_id = $1", testUserID)
	}()

	// Create an additional project
	extraProjectID := s.createTestProject("Extra Project")
	defer func() {
		s.db.Exec("DELETE FROM projects WHERE id = $1", extraProjectID)
	}()

	// Grant project-specific permission on extra project
	permissions := map[string]bool{"project.read": true}
	err := s.permService.GrantProjectPermission(s.ctx, testUserID, extraProjectID, permissions)
	assert.NoError(s.T(), err)

	// Should see: test projects (from role) + extra project (from project permission)
	projectIDs, err := s.permService.GetUserAccessibleProjects(s.ctx, testUserID)
	assert.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(projectIDs), 3, "Should see projects from both role and project permissions")

	// Verify all expected projects are included
	projectIDMap := make(map[int]bool)
	for _, id := range projectIDs {
		projectIDMap[id] = true
	}
	assert.True(s.T(), projectIDMap[extraProjectID], "Should include extra project from project permission")
}

// ============================================================================
// Test Suite Entry Point
// ============================================================================

// TestPermissionServiceDBIntegrationSuite runs the DB integration test suite
func TestPermissionServiceDBIntegrationSuite(t *testing.T) {
	suite.Run(t, new(PermissionServiceDBIntegrationTestSuite))
}
