package database

import (
	"ai-project-backend/models"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type PermissionRepositoryTestSuite struct {
	suite.Suite
	db   *gorm.DB
	repo PermissionRepository
}

func (suite *PermissionRepositoryTestSuite) SetupSuite() {
	// Use in-memory SQLite for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	suite.Require().NoError(err)

	// Create tables (excluding PermissionAuditLog due to CustomFields type issues in SQLite)
	err = db.AutoMigrate(
		&models.CompanyRole{},
		&models.Permission{},
		&models.RolePermission{},
		&models.Company{},
		&models.CompanyUser{},
		&models.CompanyUserProjectPermission{},
	)
	suite.Require().NoError(err)

	suite.db = db
	suite.repo = NewGormPermissionRepository(db)

	// Seed test data
	suite.seedTestData()
}

func (suite *PermissionRepositoryTestSuite) TearDownSuite() {
	sqlDB, _ := suite.db.DB()
	sqlDB.Close()
}

func (suite *PermissionRepositoryTestSuite) seedTestData() {
	// Create test permissions
	permissions := []models.Permission{
		{
			ID:                    1,
			PermissionCode:        "company.users.create",
			PermissionName:        "Create Company Users",
			PermissionDescription: stringPtr("Permission to create new company users"),
			Module:                "company",
			Resource:              "users",
			Action:                "create",
			IsActive:              true,
		},
		{
			ID:                    2,
			PermissionCode:        "project.read",
			PermissionName:        "Read Projects",
			PermissionDescription: stringPtr("Permission to read project information"),
			Module:                "project",
			Resource:              "project",
			Action:                "read",
			IsActive:              true,
		},
		{
			ID:                    3,
			PermissionCode:        "task.create",
			PermissionName:        "Create Tasks",
			PermissionDescription: stringPtr("Permission to create new tasks"),
			Module:                "task",
			Resource:              "task",
			Action:                "create",
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
			RoleDescription:   stringPtr("Full system access"),
			IsSystemRole:      true,
			IsActive:          true,
		},
		{
			ID:                2,
			RoleCode:          "manager",
			RoleName:          "Project Manager",
			RoleDescription:   stringPtr("Project management access"),
			IsSystemRole:      true,
			IsActive:          true,
		},
	}

	for _, role := range roles {
		suite.db.Create(&role)
	}

	// Create role permissions
	rolePermissions := []models.RolePermission{
		{RoleID: 1, PermissionID: 1, IsGranted: true},
		{RoleID: 1, PermissionID: 2, IsGranted: true},
		{RoleID: 1, PermissionID: 3, IsGranted: true},
		{RoleID: 2, PermissionID: 2, IsGranted: true},
		{RoleID: 2, PermissionID: 3, IsGranted: true},
	}

	for _, rp := range rolePermissions {
		suite.db.Create(&rp)
	}

	// Create test company and users
	company := models.Company{
		ID:          1,
		CompanyName: "Test Company",
		Status:      "active",
		Priority:    "medium",
		CompanyType: "limited_company",
		CreatedBy:   1,
	}
	suite.db.Create(&company)

	users := []models.CompanyUser{
		{
			ID:         1,
			CustomerID: 1,
			Name:       "Admin User",
			Email:      stringPtr("admin@test.com"),
			Role:       "primary_contact",
			Status:     "active",
			AccessLevel: 5,
		},
		{
			ID:         2,
			CustomerID: 1,
			Name:       "Manager User",
			Email:      stringPtr("manager@test.com"),
			Role:       "technical_contact",
			Status:     "active",
			AccessLevel: 3,
		},
		{
			ID:         3,
			CustomerID: 1,
			Name:       "Regular User",
			Email:      stringPtr("user@test.com"),
			Role:       "normal",
			Status:     "active",
			AccessLevel: 1,
		},
	}

	for _, user := range users {
		suite.db.Create(&user)
	}

	// Create project-specific permissions
	projectPerms := []models.CompanyUserProjectPermission{
		{
			CompanyUserID:       3,
			ProjectID:           1,
			CanViewProject:      true,
			CanEditProject:      false,
			CanDeleteProject:    false,
			CanManageTasks:      true,
			CanViewFinancials:   false,
			CanManageMembers:    false,
			PermissionStartDate: time.Now(),
		},
	}

	for _, perm := range projectPerms {
		suite.db.Create(&perm)
	}
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}

func (suite *PermissionRepositoryTestSuite) TestGetRoles() {
	ctx := context.Background()
	roles, err := suite.repo.GetRoles(ctx, nil)

	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), roles, 2)
	assert.Equal(suite.T(), "admin", roles[0].RoleCode)
	assert.Equal(suite.T(), "manager", roles[1].RoleCode)
}

func (suite *PermissionRepositoryTestSuite) TestCreateRole() {
	ctx := context.Background()
	role := &models.CompanyRole{
		RoleCode:        "developer",
		RoleName:        "Developer",
		RoleDescription: stringPtr("Development access"),
		IsSystemRole:    false,
		IsActive:        true,
	}

	createdRole, err := suite.repo.CreateRole(ctx, role)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "developer", createdRole.RoleCode)
	assert.Equal(suite.T(), "Developer", createdRole.RoleName)
	assert.False(suite.T(), createdRole.IsSystemRole)
	assert.True(suite.T(), createdRole.IsActive)
}

func (suite *PermissionRepositoryTestSuite) TestGetPermissions() {
	ctx := context.Background()
	permissions, err := suite.repo.GetPermissions(ctx)

	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), permissions, 3)
	assert.Equal(suite.T(), "company.users.create", permissions[0].PermissionCode)
}

func (suite *PermissionRepositoryTestSuite) TestCheckUserPermission() {
	ctx := context.Background()

	// Test user with role-based permission (admin role has all permissions)
	result, err := suite.repo.CheckUserPermission(ctx, 1, "company.users.create", nil)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), result.HasPermission)

	// Test user without permission (regular user has no role)
	result, err = suite.repo.CheckUserPermission(ctx, 3, "company.users.create", nil)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), result.HasPermission)
}

func TestPermissionRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(PermissionRepositoryTestSuite))
}