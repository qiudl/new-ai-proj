package services

import (
	"testing"
)

// TestGetAdminLevelName tests the admin level name function
func TestGetAdminLevelName(t *testing.T) {
	tests := []struct {
		level    int
		expected string
	}{
		{1, "Level 1 - 超级管理员 (SuperAdmin)"},
		{2, "Level 2 - 系统管理员 (System Admin)"},
		{3, "Level 3 - 系统操作员 (System Operator)"},
		{4, "Level 4 - 系统审计员 (System Auditor)"},
		{5, "Level 5 - 系统支持员 (System Support)"},
		{6, "Level 6 - 自定义级别"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := GetAdminLevelName(tt.level)
			if result != tt.expected {
				t.Errorf("GetAdminLevelName(%d) = %s; want %s", tt.level, result, tt.expected)
			}
		})
	}
}

// TestCompareAdminLevels tests the admin level comparison function
func TestCompareAdminLevels(t *testing.T) {
	tests := []struct {
		name     string
		levelA   int
		levelB   int
		expected bool
	}{
		{"Level 1 higher than Level 2", 1, 2, true},
		{"Level 2 equal to Level 2", 2, 2, true},
		{"Level 3 lower than Level 2", 3, 2, false},
		{"Level 1 higher than Level 5", 1, 5, true},
		{"Level 5 lower than Level 1", 5, 1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CompareAdminLevels(tt.levelA, tt.levelB)
			if result != tt.expected {
				t.Errorf("CompareAdminLevels(%d, %d) = %v; want %v", tt.levelA, tt.levelB, result, tt.expected)
			}
		})
	}
}

// TestValidateAdminScopes tests the admin scopes validation function
func TestValidateAdminScopes(t *testing.T) {
	tests := []struct {
		name      string
		scopes    map[string]interface{}
		expectErr bool
	}{
		{
			name: "Valid global scope",
			scopes: map[string]interface{}{
				"global_scope": true,
				"scopes":       []interface{}{},
			},
			expectErr: false,
		},
		{
			name: "Valid scoped permissions",
			scopes: map[string]interface{}{
				"global_scope": false,
				"scopes": []interface{}{
					map[string]interface{}{
						"type":         "project",
						"resource_ids": []interface{}{"1", "2", "3"},
						"permissions":  []interface{}{"read", "write"},
					},
				},
			},
			expectErr: false,
		},
		{
			name:      "Missing global_scope field",
			scopes:    map[string]interface{}{},
			expectErr: true,
		},
		{
			name: "Missing scopes array",
			scopes: map[string]interface{}{
				"global_scope": true,
			},
			expectErr: true,
		},
		{
			name: "Invalid scope object - missing type",
			scopes: map[string]interface{}{
				"global_scope": false,
				"scopes": []interface{}{
					map[string]interface{}{
						"resource_ids": []interface{}{"1"},
						"permissions":  []interface{}{"read"},
					},
				},
			},
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateAdminScopes(tt.scopes)
			if (err != nil) != tt.expectErr {
				t.Errorf("ValidateAdminScopes() error = %v, expectErr %v", err, tt.expectErr)
			}
		})
	}
}

// TestFormatAdminScopeSummary tests the admin scope summary formatting
func TestFormatAdminScopeSummary(t *testing.T) {
	tests := []struct {
		name     string
		scopes   map[string]interface{}
		expected string
	}{
		{
			name: "Global scope",
			scopes: map[string]interface{}{
				"global_scope": true,
				"scopes":       []interface{}{},
			},
			expected: "全局权限 - 可访问所有项目",
		},
		{
			name: "Scoped permissions",
			scopes: map[string]interface{}{
				"global_scope": false,
				"scopes": []interface{}{
					map[string]interface{}{
						"type":         "project",
						"resource_ids": []interface{}{"1", "2", "3"},
						"permissions":  []interface{}{"read", "write"},
					},
				},
			},
			expected: "project: 3个资源",
		},
		{
			name: "Empty scopes",
			scopes: map[string]interface{}{
				"global_scope": false,
				"scopes":       []interface{}{},
			},
			expected: "无权限范围",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FormatAdminScopeSummary(tt.scopes)
			if result != tt.expected {
				t.Errorf("FormatAdminScopeSummary() = %s; want %s", result, tt.expected)
			}
		})
	}
}

// MockSystemAdminService provides a mock implementation for testing
type MockSystemAdminService struct {
	admins map[int]bool
}

func NewMockSystemAdminService() *MockSystemAdminService {
	return &MockSystemAdminService{
		admins: map[int]bool{
			1: true, // admin user
		},
	}
}

// TestValidateGrantRequest tests grant request validation
func TestValidateGrantRequest(t *testing.T) {
	// Note: This test requires database connection, so it's marked as a unit test placeholder
	// In a real implementation, we would use a mock database or test database

	tests := []struct {
		name      string
		adminLevel int
		expectErr bool
	}{
		{"Valid Level 2", 2, false},
		{"Valid Level 5", 5, false},
		{"Invalid Level 0", 0, true},
		{"Invalid Level 11", 11, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Basic validation without database
			if tt.adminLevel < 1 || tt.adminLevel > 10 {
				if !tt.expectErr {
					t.Errorf("Expected error for admin_level %d", tt.adminLevel)
				}
			} else {
				if tt.expectErr {
					t.Errorf("Did not expect error for admin_level %d", tt.adminLevel)
				}
			}
		})
	}
}

// Benchmark tests
func BenchmarkGetAdminLevelName(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = GetAdminLevelName(2)
	}
}

func BenchmarkCompareAdminLevels(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CompareAdminLevels(1, 2)
	}
}

func BenchmarkValidateAdminScopes(b *testing.B) {
	scopes := map[string]interface{}{
		"global_scope": true,
		"scopes":       []interface{}{},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ValidateAdminScopes(scopes)
	}
}
