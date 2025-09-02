package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"time"
)

// RolePermissionMiddlewareFactory 角色权限中间件工厂
type RolePermissionMiddlewareFactory struct {
	permissionRepo database.PermissionRepository
	defaultConfig  *RolePermissionConfig
}

// NewRolePermissionMiddlewareFactory 创建工厂实例
func NewRolePermissionMiddlewareFactory(permissionRepo database.PermissionRepository) *RolePermissionMiddlewareFactory {
	return &RolePermissionMiddlewareFactory{
		permissionRepo: permissionRepo,
		defaultConfig: &RolePermissionConfig{
			CacheTTL:           15 * time.Minute,
			EnableCache:        true,
			EnableHierarchy:    true,
			EnableStats:        true,
			StrictMode:         false,
			SuperAdminBypass:   true,
			RoleHierarchyCheck: true,
		},
	}
}

// CreateStandardMiddleware 创建标准配置的中间件
func (f *RolePermissionMiddlewareFactory) CreateStandardMiddleware() *RolePermissionMiddleware {
	return NewRolePermissionMiddleware(f.permissionRepo, f.defaultConfig)
}

// CreateHighPerformanceMiddleware 创建高性能配置的中间件
func (f *RolePermissionMiddlewareFactory) CreateHighPerformanceMiddleware() *RolePermissionMiddleware {
	config := &RolePermissionConfig{
		CacheTTL:           30 * time.Minute, // 更长的缓存时间
		EnableCache:        true,
		EnableHierarchy:    true,
		EnableStats:        true,
		StrictMode:         false,
		SuperAdminBypass:   true,
		RoleHierarchyCheck: true,
	}
	return NewRolePermissionMiddleware(f.permissionRepo, config)
}

// CreateStrictMiddleware 创建严格模式的中间件
func (f *RolePermissionMiddlewareFactory) CreateStrictMiddleware() *RolePermissionMiddleware {
	config := &RolePermissionConfig{
		CacheTTL:           5 * time.Minute, // 更短的缓存时间
		EnableCache:        true,
		EnableHierarchy:    false, // 禁用层级
		EnableStats:        true,
		StrictMode:         true,
		SuperAdminBypass:   false, // 禁用超级管理员绕过
		RoleHierarchyCheck: false,
	}
	return NewRolePermissionMiddleware(f.permissionRepo, config)
}

// CreateTestingMiddleware 创建测试用的中间件
func (f *RolePermissionMiddlewareFactory) CreateTestingMiddleware() *RolePermissionMiddleware {
	config := &RolePermissionConfig{
		CacheTTL:           1 * time.Minute, // 短缓存用于测试
		EnableCache:        false,           // 禁用缓存
		EnableHierarchy:    true,
		EnableStats:        true,
		StrictMode:         false,
		SuperAdminBypass:   true,
		RoleHierarchyCheck: true,
	}
	return NewRolePermissionMiddleware(f.permissionRepo, config)
}

// CreateCustomMiddleware 创建自定义配置的中间件
func (f *RolePermissionMiddlewareFactory) CreateCustomMiddleware(config *RolePermissionConfig) *RolePermissionMiddleware {
	if config == nil {
		config = f.defaultConfig
	}
	return NewRolePermissionMiddleware(f.permissionRepo, config)
}

// PrebuiltRoleCheckers 预构建的角色检查器
type PrebuiltRoleCheckers struct {
	middleware *RolePermissionMiddleware
}

// NewPrebuiltRoleCheckers 创建预构建的角色检查器
func NewPrebuiltRoleCheckers(middleware *RolePermissionMiddleware) *PrebuiltRoleCheckers {
	return &PrebuiltRoleCheckers{
		middleware: middleware,
	}
}

// GetCommonRoleRequirements 获取常用的角色需求配置
func GetCommonRoleRequirements() map[string]RoleRequirement {
	return map[string]RoleRequirement{
		"admin_only": {
			RoleCodes:       []string{"superadmin", "system_admin", "company_admin"},
			MatchAny:        true,
			UseHierarchy:    true,
			AllowHigherRole: true,
			IsSystemRole:    true,
			ErrorMessage:    "Administrator access required",
		},
		"manager_plus": {
			MinimumLevel:    3, // 假设经理级别为3
			UseHierarchy:    true,
			AllowHigherRole: true,
			ErrorMessage:    "Manager level access or above required",
		},
		"financial_access": {
			RequiredPermissions:  []string{"finance.contracts.read"},
			ValidatePermissions:  true,
			StrictPermissionMode: false,
			ErrorMessage:         "Financial data access permission required",
		},
		"project_management": {
			RequiredPermissions: []string{
				"project.create", "project.update", "project.delete",
				"project.members.manage",
			},
			ValidatePermissions:  true,
			StrictPermissionMode: true,
			ErrorMessage:         "Project management permissions required",
		},
		"audit_read_only": {
			RoleCodes:           []string{"system_auditor", "system_admin", "superadmin"},
			MatchAny:            true,
			RequiredPermissions: []string{"system.audit.read"},
			ValidatePermissions: true,
			ErrorMessage:        "Audit access permission required",
		},
	}
}

// RolePermissionValidator 角色权限验证器接口
type RolePermissionValidator interface {
	ValidateRole(roleCode string, context map[string]interface{}) error
	ValidatePermission(permissionCode string, context map[string]interface{}) error
	ValidateRoleHierarchy(userRole, requiredRole string) error
}

// DefaultRolePermissionValidator 默认角色权限验证器
type DefaultRolePermissionValidator struct{}

// ValidateRole 验证角色
func (v *DefaultRolePermissionValidator) ValidateRole(roleCode string, context map[string]interface{}) error {
	if roleCode == "" {
		return fmt.Errorf("role code cannot be empty")
	}

	// 可以在这里添加更多的角色验证逻辑
	return nil
}

// ValidatePermission 验证权限
func (v *DefaultRolePermissionValidator) ValidatePermission(permissionCode string, context map[string]interface{}) error {
	if permissionCode == "" {
		return fmt.Errorf("permission code cannot be empty")
	}

	// 可以在这里添加更多的权限验证逻辑
	return nil
}

// ValidateRoleHierarchy 验证角色层级
func (v *DefaultRolePermissionValidator) ValidateRoleHierarchy(userRole, requiredRole string) error {
	// 使用models包中的角色层级验证
	if !models.CanAccessRole(userRole, requiredRole) {
		return fmt.Errorf("user role %s cannot access required role %s", userRole, requiredRole)
	}
	return nil
}
