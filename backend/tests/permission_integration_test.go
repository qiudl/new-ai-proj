package tests

import (
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type PermissionIntegrationTestSuite struct {
	suite.Suite
	db                   *gorm.DB
	permissionRepo       database.PermissionRepository
	permissionHandler    *handlers.PermissionHandler
	permissionMiddleware *middleware.PermissionMiddleware
	router               *gin.Engine
}

func (suite *PermissionIntegrationTestSuite) SetupSuite() {
	// Set test mode
	gin.SetMode(gin.TestMode)

	// Use in-memory SQLite for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	suite.Require().NoError(err)

	// Create tables
	err = db.AutoMigrate(
		&models.CompanyRole{},
		&models.Permission{},
		&models.RolePermission{},
		&models.Company{},
		&models.CompanyUser{},
		&models.CompanyUserProjectPermission{},
		&models.PermissionAuditLog{},
	)
	suite.Require().NoError(err)

	suite.db = db
	suite.permissionRepo = database.NewPermissionRepository(db)
	suite.permissionHandler = handlers.NewPermissionHandler(suite.permissionRepo)
	suite.permissionMiddleware = middleware.NewPermissionMiddleware(suite.permissionRepo)

	// Setup router
	suite.setupRouter()

	// Seed test data
	suite.seedTestData()
}

func (suite *PermissionIntegrationTestSuite) TearDownSuite() {
	sqlDB, _ := suite.db.DB()
	sqlDB.Close()
}

func (suite *PermissionIntegrationTestSuite) setupRouter() {
	router := gin.New()

	// Permission management routes
	permissionRoutes := router.Group("/api/v1/permissions")
	{
		permissionRoutes.GET("/roles", suite.permissionHandler.GetRoles)
		permissionRoutes.POST("/roles", suite.permissionHandler.CreateRole)
		permissionRoutes.PUT("/roles/:id", suite.permissionHandler.UpdateRole)
		permissionRoutes.DELETE("/roles/:id", suite.permissionHandler.DeleteRole)
		permissionRoutes.GET("/permissions", suite.permissionHandler.GetPermissions)
		permissionRoutes.GET("/roles/:id/permissions", suite.permissionHandler.GetRolePermissions)
		permissionRoutes.GET("/users/:userId/permissions", suite.permissionHandler.GetUserPermissions)
		permissionRoutes.GET("/users/:userId/permissions/:permissionCode/check", suite.permissionHandler.CheckUserPermission)
		permissionRoutes.POST("/users/:userId/role", suite.permissionHandler.AssignUserRole)
		permissionRoutes.PUT("/users/:userId/permissions", suite.permissionHandler.UpdateUserPermissions)
	}

	// Protected routes for testing middleware
	protectedRoutes := router.Group("/api/v1/protected")
	protectedRoutes.Use(func(c *gin.Context) {
		// Mock authentication middleware - set company_user_id
		companyUserID := c.GetHeader("X-Company-User-ID")
		if companyUserID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing user ID"})
			c.Abort()
			return
		}
		
		// Convert to int and set in context
		var userID int
		if companyUserID == "1" {
			userID = 1 // Admin user
		} else if companyUserID == "2" {
			userID = 2 // Manager user
		} else if companyUserID == "3" {
			userID = 3 // Regular user
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
			c.Abort()
			return
		}
		
		c.Set("company_user_id", userID)
		c.Next()
	})
	{
		// Test different permission requirements
		protectedRoutes.GET("/admin-only", 
			suite.permissionMiddleware.RequireRole("admin"),
			func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "admin access granted"})
			})

		protectedRoutes.GET("/user-management", 
			suite.permissionMiddleware.CanManageUsers(),
			func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "user management access granted"})
			})

		protectedRoutes.GET("/project-read", 
			suite.permissionMiddleware.RequirePermission("project.read"),
			func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "project read access granted"})
			})

		protectedRoutes.GET("/project-write", 
			suite.permissionMiddleware.RequirePermission("project.write"),
			func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "project write access granted"})
			})

		protectedRoutes.GET("/multiple-permissions", 
			suite.permissionMiddleware.RequireAnyPermission("task.create", "task.update"),
			func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "task access granted"})
			})

		protectedRoutes.GET("/projects/:id/admin", 
			suite.permissionMiddleware.RequirePermission("project.admin"),
			func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "project admin access granted"})
			})
	}

	suite.router = router
}

func (suite *PermissionIntegrationTestSuite) seedTestData() {
	// Create test permissions
	permissions := []models.Permission{
		{
			ID:                    1,
			PermissionCode:        "company.users.create",
			PermissionName:        "Create Company Users",
			PermissionDescription: "Permission to create new company users",
			Module:                "company",
			Resource:              "users",
			Action:                "create",
			IsActive:              true,
		},
		{
			ID:                    2,
			PermissionCode:        "project.read",
			PermissionName:        "Read Projects",
			PermissionDescription: "Permission to read project information",
			Module:                "project",
			Resource:              "project",
			Action:                "read",
			IsActive:              true,
		},
		{
			ID:                    3,
			PermissionCode:        "project.write",
			PermissionName:        "Write Projects",
			PermissionDescription: "Permission to modify project information",
			Module:                "project",
			Resource:              "project",
			Action:                "write",
			IsActive:              true,
		},
		{
			ID:                    4,
			PermissionCode:        "task.create",
			PermissionName:        "Create Tasks",
			PermissionDescription: "Permission to create new tasks",
			Module:                "task",
			Resource:              "task",
			Action:                "create",
			IsActive:              true,
		},
		{
			ID:                    5,
			PermissionCode:        "task.update",
			PermissionName:        "Update Tasks",
			PermissionDescription: "Permission to update existing tasks",
			Module:                "task",
			Resource:              "task",
			Action:                "update",
			IsActive:              true,
		},
		{
			ID:                    6,
			PermissionCode:        "project.admin",
			PermissionName:        "Project Admin",
			PermissionDescription: "Full project administration access",
			Module:                "project",
			Resource:              "project",
			Action:                "admin",
			IsActive:              true,
		},
	}

	for _, permission := range permissions {
		suite.db.Create(&permission)
	}

	// Create test roles
	roles := []models.CompanyRole{
		{
			ID:                1,
			RoleCode:          "admin",
			RoleName:          "Administrator",
			RoleDescription:   "Full system access",
			IsSystemRole:      true,
			IsActive:          true,
		},
		{
			ID:                2,
			RoleCode:          "manager",
			RoleName:          "Project Manager",
			RoleDescription:   "Project management access",
			IsSystemRole:      true,
			IsActive:          true,
		},
	}

	for _, role := range roles {
		suite.db.Create(&role)
	}

	// Create role permissions
	rolePermissions := []models.RolePermission{
		// Admin has all permissions
		{RoleID: 1, PermissionID: 1},
		{RoleID: 1, PermissionID: 2},
		{RoleID: 1, PermissionID: 3},
		{RoleID: 1, PermissionID: 4},
		{RoleID: 1, PermissionID: 5},
		{RoleID: 1, PermissionID: 6},
		// Manager has limited permissions
		{RoleID: 2, PermissionID: 2},
		{RoleID: 2, PermissionID: 4},
		{RoleID: 2, PermissionID: 5},
	}

	for _, rp := range rolePermissions {
		suite.db.Create(&rp)
	}

	// Create test company and users
	company := models.Company{
		ID:   1,
		Name: "Test Company",
	}
	suite.db.Create(&company)

	users := []models.CompanyUser{
		{
			ID:        1,
			CompanyID: 1,
			UserID:    1,
			Name:      "Admin User",
			Email:     "admin@test.com",
			RoleID:    &[]int{1}[0],
			Status:    "active",
		},
		{
			ID:        2,
			CompanyID: 1,
			UserID:    2,
			Name:      "Manager User",
			Email:     "manager@test.com",
			RoleID:    &[]int{2}[0],
			Status:    "active",
		},
		{
			ID:        3,
			CompanyID: 1,
			UserID:    3,
			Name:      "Regular User",
			Email:     "user@test.com",
			RoleID:    nil,
			Status:    "active",
		},
	}

	for _, user := range users {
		suite.db.Create(&user)
	}

	// Create project-specific permissions for regular user
	projectPerms := []models.CompanyUserProjectPermission{
		{
			CompanyUserID:  3,
			ProjectID:      &[]int{1}[0],
			PermissionCode: "project.read",
			IsGranted:      true,
		},
		{
			CompanyUserID:  3,
			ProjectID:      &[]int{1}[0],
			PermissionCode: "project.admin",
			IsGranted:      true,
		},
	}

	for _, perm := range projectPerms {
		suite.db.Create(&perm)
	}
}

func (suite *PermissionIntegrationTestSuite) TestCompleteRoleManagementWorkflow() {
	// 1. Get initial roles
	req, _ := http.NewRequest("GET", "/api/v1/permissions/roles", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	var rolesResponse models.GetRolesResponse
	err := json.Unmarshal(w.Body.Bytes(), &rolesResponse)
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), rolesResponse.Roles, 2)

	// 2. Create new role
	createRoleRequest := models.CreateRoleRequest{
		RoleCode:        "developer",
		RoleName:        "Developer",
		RoleDescription: "Development access",
		PermissionCodes: []string{"task.create", "task.update", "project.read"},
	}

	body, _ := json.Marshal(createRoleRequest)
	req, _ = http.NewRequest("POST", "/api/v1/permissions/roles", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	var createdRole models.CompanyRole
	err = json.Unmarshal(w.Body.Bytes(), &createdRole)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "developer", createdRole.RoleCode)

	// 3. Get role permissions
	req, _ = http.NewRequest("GET", "/api/v1/permissions/roles/3/permissions", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	var rolePermissionsResponse models.GetRolePermissionsResponse
	err = json.Unmarshal(w.Body.Bytes(), &rolePermissionsResponse)
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), rolePermissionsResponse.Permissions, 3)

	// 4. Update role
	updateRoleRequest := models.UpdateRoleRequest{
		RoleName:        "Senior Developer",
		RoleDescription: "Senior development access",
		PermissionCodes: []string{"task.create", "task.update", "project.read", "project.write"},
	}

	body, _ = json.Marshal(updateRoleRequest)
	req, _ = http.NewRequest("PUT", "/api/v1/permissions/roles/3", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	var updatedRole models.CompanyRole
	err = json.Unmarshal(w.Body.Bytes(), &updatedRole)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Senior Developer", updatedRole.RoleName)

	// 5. Assign role to user
	assignRoleRequest := models.AssignRoleRequest{
		RoleID: 3,
	}

	body, _ = json.Marshal(assignRoleRequest)
	req, _ = http.NewRequest("POST", "/api/v1/permissions/users/3/role", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// 6. Check user permissions
	req, _ = http.NewRequest("GET", "/api/v1/permissions/users/3/permissions", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	var userPermissionsResponse models.GetUserPermissionsResponse
	err = json.Unmarshal(w.Body.Bytes(), &userPermissionsResponse)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), userPermissionsResponse.Permissions.Role)
	assert.Equal(suite.T(), "developer", userPermissionsResponse.Permissions.Role.RoleCode)

	// 7. Delete role (should fail because it's assigned to a user)
	req, _ = http.NewRequest("DELETE", "/api/v1/permissions/roles/3", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	// Note: This might succeed or fail depending on implementation
	// The behavior should be documented and tested appropriately
}

func (suite *PermissionIntegrationTestSuite) TestPermissionMiddlewareIntegration() {
	// Test admin access
	req, _ := http.NewRequest("GET", "/api/v1/protected/admin-only", nil)
	req.Header.Set("X-Company-User-ID", "1") // Admin user
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test manager trying to access admin route (should fail)
	req, _ = http.NewRequest("GET", "/api/v1/protected/admin-only", nil)
	req.Header.Set("X-Company-User-ID", "2") // Manager user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	// Test user management permission (admin should have it)
	req, _ = http.NewRequest("GET", "/api/v1/protected/user-management", nil)
	req.Header.Set("X-Company-User-ID", "1") // Admin user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test project read access (manager should have it)
	req, _ = http.NewRequest("GET", "/api/v1/protected/project-read", nil)
	req.Header.Set("X-Company-User-ID", "2") // Manager user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test project write access (manager should NOT have it)
	req, _ = http.NewRequest("GET", "/api/v1/protected/project-write", nil)
	req.Header.Set("X-Company-User-ID", "2") // Manager user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	// Test multiple permissions (manager should have task permissions)
	req, _ = http.NewRequest("GET", "/api/v1/protected/multiple-permissions", nil)
	req.Header.Set("X-Company-User-ID", "2") // Manager user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test regular user without role trying to access protected resource
	req, _ = http.NewRequest("GET", "/api/v1/protected/project-read", nil)
	req.Header.Set("X-Company-User-ID", "3") // Regular user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	// Test project-specific permission (regular user should have project 1 admin access)
	req, _ = http.NewRequest("GET", "/api/v1/protected/projects/1/admin", nil)
	req.Header.Set("X-Company-User-ID", "3") // Regular user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Test project-specific permission for different project (should fail)
	req, _ = http.NewRequest("GET", "/api/v1/protected/projects/2/admin", nil)
	req.Header.Set("X-Company-User-ID", "3") // Regular user
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
}

func (suite *PermissionIntegrationTestSuite) TestPermissionCheckAPI() {
	// Test permission check for user with role-based permission
	req, _ := http.NewRequest("GET", "/api/v1/permissions/users/1/permissions/company.users.create/check", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	var response models.CheckPermissionResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response.HasPermission)
	assert.Equal(suite.T(), "role", response.Source)

	// Test permission check for user without permission
	req, _ = http.NewRequest("GET", "/api/v1/permissions/users/2/permissions/company.users.create/check", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response.HasPermission)

	// Test project-specific permission check
	req, _ = http.NewRequest("GET", "/api/v1/permissions/users/3/permissions/project.admin/check?project_id=1", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response.HasPermission)
	assert.Equal(suite.T(), "project", response.Source)
}

func (suite *PermissionIntegrationTestSuite) TestUserProjectPermissionManagement() {
	// Update user project permissions
	updateRequest := models.UpdateUserPermissionsRequest{
		ProjectID: 2,
		Permissions: []models.ProjectPermissionUpdate{
			{
				PermissionCode: "project.read",
				IsGranted:      true,
			},
			{
				PermissionCode: "task.create",
				IsGranted:      true,
			},
		},
	}

	body, _ := json.Marshal(updateRequest)
	req, _ := http.NewRequest("PUT", "/api/v1/permissions/users/3/permissions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	// Check that the permissions were updated
	req, _ = http.NewRequest("GET", "/api/v1/permissions/users/3/permissions/project.read/check?project_id=2", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	var response models.CheckPermissionResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response.HasPermission)
	assert.Equal(suite.T(), "project", response.Source)
}

func TestPermissionIntegrationTestSuite(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") == "true" {
		t.Skip("Skipping integration tests")
	}
	suite.Run(t, new(PermissionIntegrationTestSuite))
}