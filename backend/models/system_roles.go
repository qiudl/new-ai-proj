package models

import "fmt"

// 标准系统角色常量定义
// 文件: system_roles.go
// 作者: Claude AI (任务#622)
// 创建时间: 2025-08-27
// 描述: 定义标准系统角色常量，用于代码中的角色引用和权限检查

const (
	// 系统角色代码常量
	RoleCodeSuperAdmin     = "superadmin"      // 超级管理员
	RoleCodeSystemAdmin    = "system_admin"    // 系统管理员
	RoleCodeSystemOperator = "system_operator" // 系统操作员
	RoleCodeSystemAuditor  = "system_auditor"  // 系统审计员
	RoleCodeSystemSupport  = "system_support"  // 系统支持员
	RoleCodeSystemGuest    = "system_guest"    // 系统访客
)

// SystemRoleInfo 系统角色信息结构
type SystemRoleInfo struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Level       int    `json:"level"`
	IsSystem    bool   `json:"is_system"`
}

// 系统角色定义映射
var SystemRoles = map[string]SystemRoleInfo{
	RoleCodeSuperAdmin: {
		Code:        RoleCodeSuperAdmin,
		Name:        "超级管理员",
		Description: "拥有系统所有权限的最高级别管理员，无权限限制",
		Level:       1,
		IsSystem:    true,
	},
	RoleCodeSystemAdmin: {
		Code:        RoleCodeSystemAdmin,
		Name:        "系统管理员",
		Description: "系统管理员，负责系统配置和用户管理",
		Level:       2,
		IsSystem:    true,
	},
	RoleCodeSystemOperator: {
		Code:        RoleCodeSystemOperator,
		Name:        "系统操作员",
		Description: "系统操作员，负责日常操作和监控",
		Level:       3,
		IsSystem:    true,
	},
	RoleCodeSystemAuditor: {
		Code:        RoleCodeSystemAuditor,
		Name:        "系统审计员",
		Description: "系统审计员，负责安全审计和合规检查",
		Level:       4,
		IsSystem:    true,
	},
	RoleCodeSystemSupport: {
		Code:        RoleCodeSystemSupport,
		Name:        "系统支持员",
		Description: "系统支持员，负责技术支持和故障排除",
		Level:       5,
		IsSystem:    true,
	},
	RoleCodeSystemGuest: {
		Code:        RoleCodeSystemGuest,
		Name:        "系统访客",
		Description: "系统访客，只有基础的查看权限",
		Level:       6,
		IsSystem:    true,
	},
}

// 系统角色层级列表（按权限级别排序）
var SystemRoleHierarchy = []string{
	RoleCodeSuperAdmin,
	RoleCodeSystemAdmin,
	RoleCodeSystemOperator,
	RoleCodeSystemAuditor,
	RoleCodeSystemSupport,
	RoleCodeSystemGuest,
}

// GetSystemRoleInfo 获取系统角色信息
func GetSystemRoleInfo(roleCode string) (SystemRoleInfo, bool) {
	info, exists := SystemRoles[roleCode]
	return info, exists
}

// IsSystemRole 检查是否为系统角色
func IsSystemRole(roleCode string) bool {
	_, exists := SystemRoles[roleCode]
	return exists
}

// GetSystemRoleLevel 获取系统角色级别
func GetSystemRoleLevel(roleCode string) int {
	if info, exists := SystemRoles[roleCode]; exists {
		return info.Level
	}
	return 999 // 未知角色返回最低级别
}

// IsHigherRole 检查角色A是否比角色B级别更高（数字越小级别越高）
func IsHigherRole(roleCodeA, roleCodeB string) bool {
	levelA := GetSystemRoleLevel(roleCodeA)
	levelB := GetSystemRoleLevel(roleCodeB)
	return levelA < levelB
}

// IsSuperAdmin 检查是否为超级管理员
func IsSuperAdmin(roleCode string) bool {
	return roleCode == RoleCodeSuperAdmin
}

// CanAccessRole 检查用户角色是否可以访问目标角色的资源
func CanAccessRole(userRoleCode, targetRoleCode string) bool {
	// 超级管理员可以访问所有角色
	if IsSuperAdmin(userRoleCode) {
		return true
	}

	// 用户只能访问同级或更低级别的角色
	return GetSystemRoleLevel(userRoleCode) <= GetSystemRoleLevel(targetRoleCode)
}

// GetAllSystemRoleCodes 获取所有系统角色代码
func GetAllSystemRoleCodes() []string {
	return SystemRoleHierarchy
}

// ValidateSystemRole 验证角色代码是否为有效的系统角色
func ValidateSystemRole(roleCode string) error {
	if !IsSystemRole(roleCode) {
		return fmt.Errorf("invalid system role code: %s", roleCode)
	}
	return nil
}

// SystemRolePermissionLevels 系统角色权限级别定义
var SystemRolePermissionLevels = map[string][]string{
	RoleCodeSuperAdmin: {
		"ALL_PERMISSIONS", // 特殊标识，表示拥有所有权限
	},
	RoleCodeSystemAdmin: {
		"system.*",
		"company.*",
		"project.*",
		"task.*",
		"document.*",
		"finance.*",
		"profile.*",
	},
	RoleCodeSystemOperator: {
		"system.users.read", "system.audit.read", "system.config.read",
		"company.read", "company.members.read",
		"project.read", "project.detail.read", "project.members.read", "project.update", "project.settings.read",
		"task.*",
		"document.read", "document.create", "document.update", "document.share", "document.version.read", "document.folder.create",
		"finance.read", "finance.contracts.read", "finance.reports.read",
		"profile.*",
	},
	RoleCodeSystemAuditor: {
		"system.users.read", "system.roles.read", "system.audit.read", "system.config.read",
		"company.read", "company.members.read",
		"project.read", "project.detail.read", "project.members.read", "project.settings.read",
		"task.read", "task.comment.read", "task.attachment.download", "task.time.read",
		"document.read", "document.version.read",
		"finance.read", "finance.contracts.read", "finance.reports.read", "finance.reports.export",
		"profile.*",
	},
	RoleCodeSystemSupport: {
		"system.users.read", "system.users.update", "system.audit.read", "system.config.read",
		"company.read", "company.members.read", "company.members.update",
		"project.read", "project.detail.read", "project.members.read", "project.update",
		"task.read", "task.update", "task.status.update", "task.comment.read", "task.comment.create", "task.attachment.upload", "task.attachment.download", "task.time.read",
		"document.read", "document.update", "document.version.read",
		"profile.*",
	},
	RoleCodeSystemGuest: {
		"company.read", "company.members.read",
		"project.read", "project.detail.read", "project.members.read",
		"task.read", "task.comment.read", "task.attachment.download",
		"document.read", "document.version.read",
		"profile.*",
	},
}
