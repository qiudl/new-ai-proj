package tests

import (
	"ai-project-backend/models"
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// RBACv2IntegrationTestSuite is the test suite for RBAC v2
type RBACv2IntegrationTestSuite struct {
	suite.Suite
	testApp          *TestApp
	systemAdmin      *TestUser
	enterpriseUser1  *TestUser
	enterpriseUser2  *TestUser
	enterprise1      *models.Enterprise
	enterprise2      *models.Enterprise
}

// SetupSuite runs once before all tests
func (s *RBACv2IntegrationTestSuite) SetupSuite() {
	s.testApp = SetupTestApp(s.T())

	// Create test enterprises
	s.enterprise1 = CreateTestEnterprise(s.T(), s.testApp, "Test Enterprise 1")
	s.enterprise2 = CreateTestEnterprise(s.T(), s.testApp, "Test Enterprise 2")

	// Create test users
	s.systemAdmin = CreateTestSystemUser(s.T(), s.testApp, "test_system_admin")
	s.enterpriseUser1 = CreateTestEnterpriseUser(s.T(), s.testApp, "test_ent_user1", s.enterprise1.ID)
	s.enterpriseUser2 = CreateTestEnterpriseUser(s.T(), s.testApp, "test_ent_user2", s.enterprise2.ID)

	s.T().Logf("✅ Test suite setup complete")
	s.T().Logf("   System Admin: %s (ID: %d)", s.systemAdmin.Username, s.systemAdmin.ID)
	s.T().Logf("   Enterprise 1: %s (ID: %d)", s.enterprise1.Name, s.enterprise1.ID)
	s.T().Logf("   Enterprise User 1: %s (ID: %d, Enterprise: %d)",
		s.enterpriseUser1.Username, s.enterpriseUser1.ID, *s.enterpriseUser1.EnterpriseID)
	s.T().Logf("   Enterprise 2: %s (ID: %d)", s.enterprise2.Name, s.enterprise2.ID)
	s.T().Logf("   Enterprise User 2: %s (ID: %d, Enterprise: %d)",
		s.enterpriseUser2.Username, s.enterpriseUser2.ID, *s.enterpriseUser2.EnterpriseID)
}

// TearDownSuite runs once after all tests
func (s *RBACv2IntegrationTestSuite) TearDownSuite() {
	// Cleanup test data
	CleanupTestData(s.T(), s.testApp,
		[]int{s.systemAdmin.ID, s.enterpriseUser1.ID, s.enterpriseUser2.ID},
		[]int{s.enterprise1.ID, s.enterprise2.ID},
	)

	TeardownTestApp(s.T(), s.testApp)
	s.T().Logf("✅ Test suite teardown complete")
}

// ============================================================================
// 1. System Domain Routes Tests
// ============================================================================

// TestSystemRoutes_EnterpriseManagement tests system enterprise management routes
func (s *RBACv2IntegrationTestSuite) TestSystemRoutes_EnterpriseManagement() {
	s.T().Log("🧪 Testing System Domain - Enterprise Management")

	// Test: GET /api/v1/system/enterprises (List all enterprises)
	s.T().Run("List Enterprises", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", "/api/v1/system/enterprises", nil, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		enterprises := data["enterprises"].([]interface{})
		assert.GreaterOrEqual(t, len(enterprises), 2, "Should have at least 2 test enterprises")
	})

	// Test: POST /api/v1/system/enterprises (Create enterprise)
	s.T().Run("Create Enterprise", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":        "New Test Enterprise",
			"description": "Created via integration test",
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", "/api/v1/system/enterprises", payload, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "New Test Enterprise", data["name"])
	})

	// Test: GET /api/v1/system/enterprises/:enterprise_id (Get enterprise detail)
	s.T().Run("Get Enterprise Detail", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/system/enterprises/%d", s.enterprise1.ID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, float64(s.enterprise1.ID), data["id"])
		assert.Equal(t, s.enterprise1.Name, data["name"])
	})

	// Test: PUT /api/v1/system/enterprises/:enterprise_id (Update enterprise)
	s.T().Run("Update Enterprise", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/system/enterprises/%d", s.enterprise1.ID)
		payload := map[string]interface{}{
			"description": "Updated description",
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "PUT", path, payload, s.systemAdmin)
		AssertSuccessResponse(t, w)
	})

	// Test: GET /api/v1/system/enterprises/:enterprise_id/users (Get enterprise users)
	s.T().Run("Get Enterprise Users", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/system/enterprises/%d/users", s.enterprise1.ID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		users := data["users"].([]interface{})
		assert.GreaterOrEqual(t, len(users), 1, "Should have at least 1 enterprise user")
	})
}

// TestSystemRoutes_UserManagement tests system user management routes
func (s *RBACv2IntegrationTestSuite) TestSystemRoutes_UserManagement() {
	s.T().Log("🧪 Testing System Domain - User Management")

	// Test: GET /api/v1/system/users (List system users)
	s.T().Run("List System Users", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", "/api/v1/system/users", nil, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		users := data["users"].([]interface{})
		assert.GreaterOrEqual(t, len(users), 1, "Should have at least 1 system user")
	})

	// Test: POST /api/v1/system/users (Create system user)
	s.T().Run("Create System User", func(t *testing.T) {
		payload := map[string]interface{}{
			"username": "new_system_user",
			"email":    "newsysuser@test.com",
			"password": "test_password",
			"role":     "admin",
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", "/api/v1/system/users", payload, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "new_system_user", data["username"])
		assert.Equal(t, "system", data["user_type"])
	})

	// Test: GET /api/v1/system/users/:user_id (Get system user detail)
	s.T().Run("Get System User Detail", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/system/users/%d", s.systemAdmin.ID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, float64(s.systemAdmin.ID), data["id"])
		assert.Equal(t, s.systemAdmin.Username, data["username"])
	})
}

// TestSystemRoutes_RolePermissionManagement tests system role/permission management routes
func (s *RBACv2IntegrationTestSuite) TestSystemRoutes_RolePermissionManagement() {
	s.T().Log("🧪 Testing System Domain - Role & Permission Management")

	// Test: GET /api/v1/system/roles (List system roles)
	s.T().Run("List System Roles", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", "/api/v1/system/roles", nil, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		roles := data["roles"].([]interface{})
		assert.GreaterOrEqual(t, len(roles), 1, "Should have at least 1 system role")
	})

	// Test: POST /api/v1/system/roles (Create system role)
	s.T().Run("Create System Role", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":        "test_system_role",
			"description": "Test system role",
			"permissions": []string{"system.enterprise.read"},
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", "/api/v1/system/roles", payload, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "test_system_role", data["name"])
	})

	// Test: GET /api/v1/system/permissions (List system permissions)
	s.T().Run("List System Permissions", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", "/api/v1/system/permissions", nil, s.systemAdmin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		permissions := data["permissions"].([]interface{})
		assert.GreaterOrEqual(t, len(permissions), 1, "Should have at least 1 system permission")
	})
}

// ============================================================================
// 2. Enterprise Domain Routes Tests
// ============================================================================

// TestEnterpriseRoutes_UserManagement tests enterprise user management routes
func (s *RBACv2IntegrationTestSuite) TestEnterpriseRoutes_UserManagement() {
	s.T().Log("🧪 Testing Enterprise Domain - User Management")

	enterpriseID := *s.enterpriseUser1.EnterpriseID

	// Test: GET /api/v1/enterprises/:enterprise_id/users (List enterprise users)
	s.T().Run("List Enterprise Users", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/users", enterpriseID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		users := data["users"].([]interface{})
		assert.GreaterOrEqual(t, len(users), 1, "Should have at least 1 user")
	})

	// Test: POST /api/v1/enterprises/:enterprise_id/users (Invite user to enterprise)
	s.T().Run("Invite User to Enterprise", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/users", enterpriseID)
		payload := map[string]interface{}{
			"email": "newuser@enterprise.test.com",
			"role":  "member",
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", path, payload, s.enterpriseUser1)
		// May return 201 Created or 200 OK depending on implementation
		assert.Contains(t, []int{200, 201}, w.Code, "Should accept user invitation")
	})

	// Test: GET /api/v1/enterprises/:enterprise_id/users/:user_id (Get user detail)
	s.T().Run("Get Enterprise User Detail", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/users/%d", enterpriseID, s.enterpriseUser1.ID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, float64(s.enterpriseUser1.ID), data["id"])
	})
}

// TestEnterpriseRoutes_RolePermissionManagement tests enterprise role/permission management routes
func (s *RBACv2IntegrationTestSuite) TestEnterpriseRoutes_RolePermissionManagement() {
	s.T().Log("🧪 Testing Enterprise Domain - Role & Permission Management")

	enterpriseID := *s.enterpriseUser1.EnterpriseID

	// Test: GET /api/v1/enterprises/:enterprise_id/roles (List enterprise roles)
	s.T().Run("List Enterprise Roles", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/roles", enterpriseID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		roles := data["roles"].([]interface{})
		assert.GreaterOrEqual(t, len(roles), 0, "Should return roles list")
	})

	// Test: POST /api/v1/enterprises/:enterprise_id/roles (Create enterprise role)
	s.T().Run("Create Enterprise Role", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/roles", enterpriseID)
		payload := map[string]interface{}{
			"name":        "test_enterprise_role",
			"description": "Test enterprise role",
			"permissions": []string{"enterprise.project.read"},
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", path, payload, s.enterpriseUser1)
		// May require admin permission
		assert.Contains(t, []int{200, 201, 403}, w.Code)
	})

	// Test: GET /api/v1/enterprises/:enterprise_id/permissions (List enterprise permissions)
	s.T().Run("List Enterprise Permissions", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/permissions", enterpriseID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		permissions := data["permissions"].([]interface{})
		assert.GreaterOrEqual(t, len(permissions), 1, "Should have enterprise permissions")
	})
}

// TestEnterpriseRoutes_BusinessRoutes tests enterprise business routes (projects, tasks, documents)
func (s *RBACv2IntegrationTestSuite) TestEnterpriseRoutes_BusinessRoutes() {
	s.T().Log("🧪 Testing Enterprise Domain - Business Routes")

	enterpriseID := *s.enterpriseUser1.EnterpriseID

	// Test: GET /api/v1/enterprises/:enterprise_id/projects (List projects)
	s.T().Run("List Enterprise Projects", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/projects", enterpriseID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		projects := data["projects"].([]interface{})
		assert.GreaterOrEqual(t, len(projects), 0, "Should return projects list")
	})

	// Test: POST /api/v1/enterprises/:enterprise_id/projects (Create project)
	s.T().Run("Create Enterprise Project", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/projects", enterpriseID)
		payload := map[string]interface{}{
			"name":        "Test Project",
			"description": "Created via integration test",
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", path, payload, s.enterpriseUser1)
		assert.Contains(t, []int{200, 201}, w.Code, "Should create project successfully")
	})

	// Test: GET /api/v1/enterprises/:enterprise_id/documents (List documents)
	s.T().Run("List Enterprise Documents", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/documents", enterpriseID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		documents := data["documents"].([]interface{})
		assert.GreaterOrEqual(t, len(documents), 0, "Should return documents list")
	})
}

// ============================================================================
// 3. Enterprise Isolation Tests
// ============================================================================

// TestEnterpriseIsolation_CrossEnterpriseAccess tests enterprise data isolation
func (s *RBACv2IntegrationTestSuite) TestEnterpriseIsolation_CrossEnterpriseAccess() {
	s.T().Log("🧪 Testing Enterprise Isolation - Cross-Enterprise Access")

	enterprise1ID := *s.enterpriseUser1.EnterpriseID
	enterprise2ID := *s.enterpriseUser2.EnterpriseID

	// Test: Enterprise User 1 CANNOT access Enterprise 2 routes
	s.T().Run("Prevent Cross-Enterprise Access", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/projects", enterprise2ID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)

		// Should return 403 Forbidden
		AssertErrorResponse(t, w, http.StatusForbidden, "ENTERPRISE_ISOLATION_VIOLATION")
	})

	// Test: Enterprise User 2 CANNOT access Enterprise 1 routes
	s.T().Run("Prevent Reverse Cross-Enterprise Access", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/users", enterprise1ID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser2)

		// Should return 403 Forbidden
		AssertErrorResponse(t, w, http.StatusForbidden, "ENTERPRISE_ISOLATION_VIOLATION")
	})

	// Test: System user CAN access both enterprises
	s.T().Run("System User Can Access All Enterprises", func(t *testing.T) {
		path1 := fmt.Sprintf("/api/v1/system/enterprises/%d", enterprise1ID)
		w1 := MakeAuthenticatedRequest(t, s.testApp, "GET", path1, nil, s.systemAdmin)
		AssertSuccessResponse(t, w1)

		path2 := fmt.Sprintf("/api/v1/system/enterprises/%d", enterprise2ID)
		w2 := MakeAuthenticatedRequest(t, s.testApp, "GET", path2, nil, s.systemAdmin)
		AssertSuccessResponse(t, w2)
	})
}

// ============================================================================
// 4. Permission Enforcement Tests
// ============================================================================

// TestPermissionEnforcement_SystemDomain tests permission checks in system domain
func (s *RBACv2IntegrationTestSuite) TestPermissionEnforcement_SystemDomain() {
	s.T().Log("🧪 Testing Permission Enforcement - System Domain")

	// Test: Enterprise user CANNOT access system routes
	s.T().Run("Enterprise User Cannot Access System Routes", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", "/api/v1/system/enterprises", nil, s.enterpriseUser1)

		// Should return 403 Forbidden
		AssertErrorResponse(t, w, http.StatusForbidden, "INSUFFICIENT_PERMISSIONS")
	})

	// Test: Unauthenticated request fails
	s.T().Run("Unauthenticated Request Fails", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", "/api/v1/system/enterprises", nil, nil)

		// Should return 401 Unauthorized
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

// TestPermissionEnforcement_EnterpriseDomain tests permission checks in enterprise domain
func (s *RBACv2IntegrationTestSuite) TestPermissionEnforcement_EnterpriseDomain() {
	s.T().Log("🧪 Testing Permission Enforcement - Enterprise Domain")

	enterpriseID := *s.enterpriseUser1.EnterpriseID

	// Test: System user CANNOT use enterprise routes without enterprise context
	s.T().Run("System User Needs Enterprise Context", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/projects", enterpriseID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.systemAdmin)

		// May return 403 or handle differently based on implementation
		assert.NotEqual(t, http.StatusOK, w.Code, "System user should not have default enterprise access")
	})
}

// ============================================================================
// 5. Route Adapter Tests
// ============================================================================

// TestRouteAdapters_EnterpriseContext tests enterprise context adapter
func (s *RBACv2IntegrationTestSuite) TestRouteAdapters_EnterpriseContext() {
	s.T().Log("🧪 Testing Route Adapters - Enterprise Context")

	enterpriseID := *s.enterpriseUser1.EnterpriseID

	// Test: Valid enterprise_id parameter
	s.T().Run("Valid Enterprise ID Parameter", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/enterprises/%d/projects", enterpriseID)
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)

		// Should succeed
		AssertSuccessResponse(t, w)
	})

	// Test: Invalid enterprise_id parameter
	s.T().Run("Invalid Enterprise ID Parameter", func(t *testing.T) {
		path := "/api/v1/enterprises/invalid/projects"
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)

		// Should return 400 Bad Request
		AssertErrorResponse(t, w, http.StatusBadRequest, "INVALID_ENTERPRISE_ID")
	})

	// Test: Missing enterprise_id parameter
	s.T().Run("Missing Enterprise ID Parameter", func(t *testing.T) {
		path := "/api/v1/enterprises//projects"
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.enterpriseUser1)

		// Should return 404 Not Found (route not matched) or 400 Bad Request
		assert.Contains(t, []int{400, 404}, w.Code)
	})
}

// ============================================================================
// 6. Error Handling Tests
// ============================================================================

// TestErrorHandling_ValidationErrors tests validation error responses
func (s *RBACv2IntegrationTestSuite) TestErrorHandling_ValidationErrors() {
	s.T().Log("🧪 Testing Error Handling - Validation Errors")

	// Test: Missing required fields in creation
	s.T().Run("Missing Required Fields", func(t *testing.T) {
		payload := map[string]interface{}{
			// Missing "name" field
			"description": "Test enterprise without name",
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", "/api/v1/system/enterprises", payload, s.systemAdmin)

		// Should return 400 Bad Request
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	// Test: Invalid data types
	s.T().Run("Invalid Data Types", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":   12345, // Should be string
			"status": true,  // Should be string
		}

		w := MakeAuthenticatedRequest(t, s.testApp, "POST", "/api/v1/system/enterprises", payload, s.systemAdmin)

		// Should return 400 Bad Request
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestErrorHandling_ResourceNotFound tests 404 error responses
func (s *RBACv2IntegrationTestSuite) TestErrorHandling_ResourceNotFound() {
	s.T().Log("🧪 Testing Error Handling - Resource Not Found")

	// Test: Non-existent enterprise
	s.T().Run("Non-Existent Enterprise", func(t *testing.T) {
		path := "/api/v1/system/enterprises/99999999"
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.systemAdmin)

		// Should return 404 Not Found
		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	// Test: Non-existent user
	s.T().Run("Non-Existent User", func(t *testing.T) {
		path := "/api/v1/system/users/99999999"
		w := MakeAuthenticatedRequest(t, s.testApp, "GET", path, nil, s.systemAdmin)

		// Should return 404 Not Found
		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

// ============================================================================
// Test Suite Entry Point
// ============================================================================

// TestRBACv2IntegrationSuite runs the complete RBAC v2 integration test suite
func TestRBACv2IntegrationSuite(t *testing.T) {
	suite.Run(t, new(RBACv2IntegrationTestSuite))
}
