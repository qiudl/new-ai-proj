package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// PermissionHierarchyTestSuite tests the permission hierarchy functionality
type PermissionHierarchyTestSuite struct {
	suite.Suite
	manager *PermissionHierarchyManager
}

// SetupSuite initializes the test suite
func (suite *PermissionHierarchyTestSuite) SetupSuite() {
	suite.manager = NewPermissionHierarchyManager(nil, nil)
}

// TestNewPermissionHierarchyManager tests manager creation
func (suite *PermissionHierarchyTestSuite) TestNewPermissionHierarchyManager() {
	assert.NotNil(suite.T(), suite.manager)
	assert.Equal(suite.T(), 30*time.Minute, suite.manager.ttl)
}

// TestGetPermissionLevelFromSubjectType tests subject type to level mapping
func (suite *PermissionHierarchyTestSuite) TestGetPermissionLevelFromSubjectType() {
	testCases := []struct {
		subjectType    SubjectType
		expectedLevel  PermissionLevel
	}{
		{SubjectSystemUser, LevelSystem},
		{SubjectEnterpriseUser, LevelEnterprise},
		{SubjectAPIKey, LevelSystem},
		{SubjectServiceAccount, LevelSystem},
	}

	for _, tc := range testCases {
		level := suite.manager.getPermissionLevelFromSubjectType(tc.subjectType)
		assert.Equal(suite.T(), tc.expectedLevel, level, 
			"Subject type %s should map to level %s", tc.subjectType, tc.expectedLevel)
	}
}

// TestGetLevelPriority tests level priority assignment
func (suite *PermissionHierarchyTestSuite) TestGetLevelPriority() {
	testCases := []struct {
		level    PermissionLevel
		priority int
	}{
		{LevelSystem, 1000},
		{LevelEnterprise, 900},
		{LevelDepartment, 800},
		{LevelPosition, 700},
		{LevelProject, 600},
		{LevelUser, 500},
		{LevelDelegated, 400},
		{LevelPolicy, 300},
	}

	for _, tc := range testCases {
		priority := suite.manager.getLevelPriority(tc.level)
		assert.Equal(suite.T(), tc.priority, priority,
			"Level %s should have priority %d", tc.level, tc.priority)
	}

	// Test that system level has highest priority
	systemPriority := suite.manager.getLevelPriority(LevelSystem)
	enterprisePriority := suite.manager.getLevelPriority(LevelEnterprise)
	userPriority := suite.manager.getLevelPriority(LevelUser)

	assert.Greater(suite.T(), systemPriority, enterprisePriority)
	assert.Greater(suite.T(), enterprisePriority, userPriority)
}

// TestPermissionHierarchyNode tests hierarchy node structure
func (suite *PermissionHierarchyTestSuite) TestPermissionHierarchyNode() {
	node := &PermissionHierarchyNode{
		Level:    LevelEnterprise,
		Priority: 900,
		Subject: PermissionSubject{
			Type: SubjectEnterpriseUser,
			ID:   1,
		},
		Permissions: map[string]bool{
			"project.read":   true,
			"project.write":  true,
			"project.delete": false,
		},
		Children: []*PermissionHierarchyNode{},
		Metadata: map[string]interface{}{
			"enterprise_id": 100,
			"department":    "engineering",
		},
	}

	assert.Equal(suite.T(), LevelEnterprise, node.Level)
	assert.Equal(suite.T(), 900, node.Priority)
	assert.Equal(suite.T(), SubjectEnterpriseUser, node.Subject.Type)
	assert.Equal(suite.T(), 3, len(node.Permissions))
	assert.True(suite.T(), node.Permissions["project.read"])
	assert.False(suite.T(), node.Permissions["project.delete"])
	assert.Contains(suite.T(), node.Metadata, "enterprise_id")
}

// TestPermissionInheritance tests inheritance structure
func (suite *PermissionHierarchyTestSuite) TestPermissionInheritance() {
	inheritance := &PermissionInheritance{
		ParentLevel:    LevelEnterprise,
		ParentID:       1,
		ChildLevel:     LevelUser,
		ChildID:        100,
		PermissionCode: "project.read",
		InheritType:    InheritanceAllow,
		IsActive:       true,
		Conditions: map[string]interface{}{
			"department": "engineering",
			"active":     true,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	assert.Equal(suite.T(), LevelEnterprise, inheritance.ParentLevel)
	assert.Equal(suite.T(), LevelUser, inheritance.ChildLevel)
	assert.Equal(suite.T(), InheritanceAllow, inheritance.InheritType)
	assert.True(suite.T(), inheritance.IsActive)
	assert.Contains(suite.T(), inheritance.Conditions, "department")
}

// TestPermissionResolution tests permission resolution
func (suite *PermissionHierarchyTestSuite) TestPermissionResolution() {
	resolution := &PermissionResolution{
		PermissionCode: "project.read",
		Object: &PermissionObject{
			Type: UnifiedResourceProject,
			ID:   testIntPtr(123),
		},
		Steps: []PermissionResolutionStep{
			{
				Level:         LevelEnterprise,
				Subject:       PermissionSubject{Type: SubjectEnterpriseUser, ID: 1},
				HasPermission: true,
				InheritType:   InheritanceAllow,
				Source:        "direct_enterprise_permission",
				Reason:        "Direct permission found at enterprise level",
				IsOverride:    false,
				Metadata:      map[string]interface{}{"depth": 0, "priority": 900},
			},
		},
		FinalResult: true,
		Source:      "direct_enterprise_permission",
		Reason:      "Direct permission found at enterprise level",
	}

	assert.Equal(suite.T(), "project.read", resolution.PermissionCode)
	assert.True(suite.T(), resolution.FinalResult)
	assert.Equal(suite.T(), 1, len(resolution.Steps))
	assert.Equal(suite.T(), LevelEnterprise, resolution.Steps[0].Level)
	assert.True(suite.T(), resolution.Steps[0].HasPermission)
}

// TestHierarchyStats tests hierarchy statistics
func (suite *PermissionHierarchyTestSuite) TestHierarchyStats() {
	// Create a test hierarchy
	hierarchy := &PermissionHierarchyNode{
		Level:       LevelEnterprise,
		Priority:    900,
		Subject:     PermissionSubject{Type: SubjectEnterpriseUser, ID: 1},
		Permissions: map[string]bool{"project.read": true, "project.write": true},
		Children: []*PermissionHierarchyNode{
			{
				Level:       LevelUser,
				Priority:    500,
				Subject:     PermissionSubject{Type: SubjectEnterpriseUser, ID: 100},
				Permissions: map[string]bool{"task.read": true},
				Children:    []*PermissionHierarchyNode{},
				Metadata:    make(map[string]interface{}),
			},
			{
				Level:       LevelUser,
				Priority:    500,
				Subject:     PermissionSubject{Type: SubjectEnterpriseUser, ID: 101},
				Permissions: map[string]bool{"task.write": true, "task.delete": false},
				Children:    []*PermissionHierarchyNode{},
				Metadata:    make(map[string]interface{}),
			},
		},
		Metadata: make(map[string]interface{}),
	}

	stats := suite.manager.GetHierarchyStats(context.Background(), hierarchy)

	assert.NotNil(suite.T(), stats)
	assert.Equal(suite.T(), 3, stats.TotalNodes)        // 1 enterprise + 2 users
	assert.Equal(suite.T(), 1, stats.MaxDepth)          // Enterprise -> Users (depth 1)
	assert.Equal(suite.T(), 5, stats.TotalPermissions)  // 2 + 1 + 2 permissions
	assert.Contains(suite.T(), stats.LevelCounts, LevelEnterprise)
	assert.Contains(suite.T(), stats.LevelCounts, LevelUser)
	assert.Equal(suite.T(), 1, stats.LevelCounts[LevelEnterprise])
	assert.Equal(suite.T(), 2, stats.LevelCounts[LevelUser])
}

// TestInheritanceTypes tests different inheritance types
func (suite *PermissionHierarchyTestSuite) TestInheritanceTypes() {
	testCases := []struct {
		inheritType InheritanceType
		description string
	}{
		{InheritanceAllow, "Allow child to inherit permission"},
		{InheritanceDeny, "Explicitly deny inheritance"},
		{InheritanceOverride, "Override parent permission"},
		{InheritanceDelegate, "Delegate permission to child"},
		{InheritanceAdditive, "Permissions are added"},
		{InheritanceRestrictive, "Only intersection is granted"},
		{InheritanceConditional, "Based on conditions"},
	}

	for _, tc := range testCases {
		assert.NotEmpty(suite.T(), string(tc.inheritType), 
			"Inheritance type should not be empty: %s", tc.description)
	}
}

// TestLoadSubjectPermissions tests loading permissions for a subject
func (suite *PermissionHierarchyTestSuite) TestLoadSubjectPermissions() {
	ctx := context.Background()
	
	// Test different subject types
	subjects := []*PermissionSubject{
		{Type: SubjectSystemUser, ID: 1},
		{Type: SubjectEnterpriseUser, ID: 100},
		{Type: SubjectAPIKey, ID: 2},
		{Type: SubjectServiceAccount, ID: 3},
	}

	for _, subject := range subjects {
		permissions, err := suite.manager.loadSubjectPermissions(ctx, subject)
		
		// Since we don't have real database, this should return empty map without error
		assert.NoError(suite.T(), err)
		assert.NotNil(suite.T(), permissions)
		assert.IsType(suite.T(), map[string]bool{}, permissions)
	}
}

// TestLoadChildSubjects tests loading child subjects
func (suite *PermissionHierarchyTestSuite) TestLoadChildSubjects() {
	ctx := context.Background()
	
	subject := &PermissionSubject{
		Type: SubjectEnterpriseUser,
		ID:   1,
	}

	children, err := suite.manager.loadChildSubjects(ctx, subject)
	
	// Since we don't have real database, this should return empty slice without error
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), children)
	assert.IsType(suite.T(), []*PermissionSubject{}, children)
}

// TestLoadInheritanceRules tests loading inheritance rules
func (suite *PermissionHierarchyTestSuite) TestLoadInheritanceRules() {
	ctx := context.Background()
	
	parent := &PermissionSubject{Type: SubjectEnterpriseUser, ID: 1}
	child := &PermissionSubject{Type: SubjectEnterpriseUser, ID: 100}
	permissionCode := "project.read"

	rules, err := suite.manager.loadInheritanceRules(ctx, parent, child, permissionCode)
	
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), rules)
	assert.Greater(suite.T(), len(rules), 0)
	
	// Check the default rule
	rule := rules[0]
	assert.Equal(suite.T(), LevelEnterprise, rule.ParentLevel)
	assert.Equal(suite.T(), LevelEnterprise, rule.ChildLevel)
	assert.Equal(suite.T(), permissionCode, rule.PermissionCode)
	assert.Equal(suite.T(), InheritanceAllow, rule.InheritType)
	assert.True(suite.T(), rule.IsActive)
}

// Run the permission hierarchy test suite
func TestPermissionHierarchyTestSuite(t *testing.T) {
	suite.Run(t, new(PermissionHierarchyTestSuite))
}

// Benchmark tests for hierarchy operations

func BenchmarkGetPermissionLevelFromSubjectType(b *testing.B) {
	manager := NewPermissionHierarchyManager(nil, nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.getPermissionLevelFromSubjectType(SubjectEnterpriseUser)
	}
}

func BenchmarkGetLevelPriority(b *testing.B) {
	manager := NewPermissionHierarchyManager(nil, nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.getLevelPriority(LevelEnterprise)
	}
}


// Test error conditions and edge cases

func TestHierarchyManager_EdgeCases(t *testing.T) {
	manager := NewPermissionHierarchyManager(nil, nil)
	
	// Test with unknown subject type (should default to user level)
	level := manager.getPermissionLevelFromSubjectType(SubjectType("unknown"))
	assert.Equal(t, LevelUser, level)
	
	// Test priority for unknown level (should return 0 for map default)
	priority := manager.getLevelPriority(PermissionLevel("unknown"))
	assert.Equal(t, 0, priority)
}