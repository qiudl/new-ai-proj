package constants

import (
	"testing"
)

func TestBasePermissionSet(t *testing.T) {
	// 测试基础权限集合是否正确初始化
	if BasePermissionSet == nil {
		t.Fatal("BasePermissionSet should not be nil")
	}

	// 验证权限数量
	expectedCount := 12
	if len(BasePermissionSet) != expectedCount {
		t.Errorf("Expected %d base permissions, got %d", expectedCount, len(BasePermissionSet))
	}

	// 验证所有BasePermissions都在Set中
	for _, perm := range BasePermissions {
		if !BasePermissionSet[perm] {
			t.Errorf("Permission %s should be in BasePermissionSet", perm)
		}
	}
}

func TestIsBasePermission(t *testing.T) {
	tests := []struct {
		name       string
		permission string
		expected   bool
	}{
		{
			name:       "Dashboard read is base permission",
			permission: "dashboard.read",
			expected:   true,
		},
		{
			name:       "Profile read is base permission",
			permission: "profile.read",
			expected:   true,
		},
		{
			name:       "Work note create is base permission",
			permission: "work_note.create",
			expected:   true,
		},
		{
			name:       "Timer start is base permission",
			permission: "timer.start",
			expected:   true,
		},
		{
			name:       "Stats view own is base permission",
			permission: "stats.view.own",
			expected:   true,
		},
		{
			name:       "Admin permission is NOT base permission",
			permission: "system.admin",
			expected:   false,
		},
		{
			name:       "Project create is NOT base permission",
			permission: "project.create",
			expected:   false,
		},
		{
			name:       "User delete is NOT base permission",
			permission: "user.delete",
			expected:   false,
		},
		{
			name:       "Empty string is NOT base permission",
			permission: "",
			expected:   false,
		},
		{
			name:       "Random string is NOT base permission",
			permission: "random.permission.code",
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsBasePermission(tt.permission)
			if result != tt.expected {
				t.Errorf("IsBasePermission(%s) = %v, want %v", tt.permission, result, tt.expected)
			}
		})
	}
}

func TestGetBasePermissions(t *testing.T) {
	perms := GetBasePermissions()

	// 验证返回的权限数量
	expectedCount := 12
	if len(perms) != expectedCount {
		t.Errorf("Expected %d permissions, got %d", expectedCount, len(perms))
	}

	// 验证返回的是副本（修改不影响原数据）
	originalLen := len(BasePermissions)
	perms = append(perms, "test.permission")
	if len(BasePermissions) != originalLen {
		t.Error("GetBasePermissions should return a copy, not the original slice")
	}

	// 重新获取权限列表来验证包含所有预期的权限
	perms = GetBasePermissions()
	expectedPerms := map[string]bool{
		"dashboard.read":   true,
		"profile.read":     true,
		"profile.update":   true,
		"password.change":  true,
		"work_note.create": true,
		"work_note.read":   true,
		"work_note.update": true,
		"work_note.delete": true,
		"timer.start":      true,
		"timer.stop":       true,
		"timer.view":       true,
		"stats.view.own":   true,
	}

	for _, perm := range perms {
		if !expectedPerms[perm] {
			t.Errorf("Unexpected permission in base permissions: %s", perm)
		}
	}
}

func TestGetBasePermissionDescription(t *testing.T) {
	tests := []struct {
		name        string
		permission  string
		shouldExist bool
	}{
		{
			name:        "Dashboard read has description",
			permission:  "dashboard.read",
			shouldExist: true,
		},
		{
			name:        "Profile read has description",
			permission:  "profile.read",
			shouldExist: true,
		},
		{
			name:        "Timer start has description",
			permission:  "timer.start",
			shouldExist: true,
		},
		{
			name:        "Non-base permission has no description",
			permission:  "system.admin",
			shouldExist: false,
		},
		{
			name:        "Empty string has no description",
			permission:  "",
			shouldExist: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			desc := GetBasePermissionDescription(tt.permission)
			if tt.shouldExist && desc == "" {
				t.Errorf("Expected description for %s, got empty string", tt.permission)
			}
			if !tt.shouldExist && desc != "" {
				t.Errorf("Expected no description for %s, got %s", tt.permission, desc)
			}
		})
	}
}

func TestGetBasePermissionsByCategory(t *testing.T) {
	tests := []struct {
		name          string
		category      string
		expectedCount int
		shouldContain []string
	}{
		{
			name:          "Dashboard category",
			category:      "dashboard",
			expectedCount: 1,
			shouldContain: []string{"dashboard.read"},
		},
		{
			name:          "Profile category",
			category:      "profile",
			expectedCount: 3,
			shouldContain: []string{"profile.read", "profile.update", "password.change"},
		},
		{
			name:          "Work note category",
			category:      "work_note",
			expectedCount: 4,
			shouldContain: []string{"work_note.create", "work_note.read", "work_note.update", "work_note.delete"},
		},
		{
			name:          "Timer category",
			category:      "timer",
			expectedCount: 3,
			shouldContain: []string{"timer.start", "timer.stop", "timer.view"},
		},
		{
			name:          "Statistics category",
			category:      "statistics",
			expectedCount: 1,
			shouldContain: []string{"stats.view.own"},
		},
		{
			name:          "Non-existent category",
			category:      "non_existent",
			expectedCount: 0,
			shouldContain: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			perms := GetBasePermissionsByCategory(tt.category)

			if len(perms) != tt.expectedCount {
				t.Errorf("Expected %d permissions in category %s, got %d", tt.expectedCount, tt.category, len(perms))
			}

			// 验证包含所有预期的权限
			for _, expectedPerm := range tt.shouldContain {
				found := false
				for _, perm := range perms {
					if perm == expectedPerm {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("Expected permission %s in category %s", expectedPerm, tt.category)
				}
			}
		})
	}
}

func TestBasePermissionDescriptionsCompleteness(t *testing.T) {
	// 验证每个基础权限都有描述
	for _, perm := range BasePermissions {
		desc, exists := BasePermissionDescriptions[perm]
		if !exists || desc == "" {
			t.Errorf("Base permission %s is missing description", perm)
		}
	}

	// 验证描述中没有多余的权限
	for perm := range BasePermissionDescriptions {
		if !IsBasePermission(perm) {
			t.Errorf("Description exists for non-base permission: %s", perm)
		}
	}
}

func TestBasePermissionCategoriesCompleteness(t *testing.T) {
	// 收集所有分类中的权限
	allCategoryPerms := make(map[string]bool)
	for _, perms := range BasePermissionCategories {
		for _, perm := range perms {
			allCategoryPerms[perm] = true
		}
	}

	// 验证每个基础权限都在某个分类中
	for _, perm := range BasePermissions {
		if !allCategoryPerms[perm] {
			t.Errorf("Base permission %s is not in any category", perm)
		}
	}

	// 验证分类中没有多余的权限
	for perm := range allCategoryPerms {
		if !IsBasePermission(perm) {
			t.Errorf("Category contains non-base permission: %s", perm)
		}
	}
}

// 基准测试
func BenchmarkIsBasePermission(b *testing.B) {
	for i := 0; i < b.N; i++ {
		IsBasePermission("dashboard.read")
	}
}

func BenchmarkIsBasePermissionNotFound(b *testing.B) {
	for i := 0; i < b.N; i++ {
		IsBasePermission("system.admin")
	}
}
