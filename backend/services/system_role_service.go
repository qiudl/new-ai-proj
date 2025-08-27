package services

import (
	"fmt"
	"log"
	"time"

	"ai-project-backend/models"
)

// SystemRoleService 系统角色服务
type SystemRoleService struct {
	// 这里可以添加数据库连接或其他依赖
}

// NewSystemRoleService 创建系统角色服务实例
func NewSystemRoleService() *SystemRoleService {
	return &SystemRoleService{}
}

// InitializeSystemRoles 初始化系统角色
func (s *SystemRoleService) InitializeSystemRoles() error {
	log.Println("开始初始化系统角色...")
	
	for _, roleCode := range models.GetAllSystemRoleCodes() {
		info, _ := models.GetSystemRoleInfo(roleCode)
		log.Printf("初始化角色: %s - %s", info.Code, info.Name)
	}
	
	log.Println("系统角色初始化完成")
	return nil
}

// ValidateUserRole 验证用户角色
func (s *SystemRoleService) ValidateUserRole(userRoleCode string) error {
	if err := models.ValidateSystemRole(userRoleCode); err != nil {
		return fmt.Errorf("角色验证失败: %w", err)
	}
	return nil
}

// CheckRolePermission 检查角色权限
func (s *SystemRoleService) CheckRolePermission(roleCode, permissionCode string) bool {
	// SuperAdmin拥有所有权限
	if models.IsSuperAdmin(roleCode) {
		return true
	}
	
	// 检查角色权限级别
	permissions, exists := models.SystemRolePermissionLevels[roleCode]
	if !exists {
		return false
	}
	
	// 检查具体权限
	for _, perm := range permissions {
		if perm == "ALL_PERMISSIONS" {
			return true
		}
		
		// 支持通配符权限检查
		if matchesPermissionPattern(permissionCode, perm) {
			return true
		}
	}
	
	return false
}

// matchesPermissionPattern 权限模式匹配
func matchesPermissionPattern(permission, pattern string) bool {
	if pattern == permission {
		return true
	}
	
	// 支持通配符 * 
	if len(pattern) > 0 && pattern[len(pattern)-1] == '*' {
		prefix := pattern[:len(pattern)-1]
		return len(permission) >= len(prefix) && permission[:len(prefix)] == prefix
	}
	
	return false
}

// GetRoleHierarchy 获取角色层次结构
func (s *SystemRoleService) GetRoleHierarchy() []models.SystemRoleInfo {
	hierarchy := make([]models.SystemRoleInfo, 0, len(models.SystemRoles))
	
	for _, roleCode := range models.SystemRoleHierarchy {
		if info, exists := models.GetSystemRoleInfo(roleCode); exists {
			hierarchy = append(hierarchy, info)
		}
	}
	
	return hierarchy
}

// CanManageUser 检查是否可以管理目标用户
func (s *SystemRoleService) CanManageUser(managerRoleCode, targetUserRoleCode string) bool {
	return models.CanAccessRole(managerRoleCode, targetUserRoleCode)
}

// GetRolePermissions 获取角色的所有权限
func (s *SystemRoleService) GetRolePermissions(roleCode string) []string {
	if permissions, exists := models.SystemRolePermissionLevels[roleCode]; exists {
		return permissions
	}
	return []string{}
}

// LogRoleActivity 记录角色活动日志
func (s *SystemRoleService) LogRoleActivity(roleCode, activity, details string) {
	log.Printf("[角色活动] 角色: %s, 活动: %s, 详情: %s, 时间: %s", 
		roleCode, activity, details, time.Now().Format("2006-01-02 15:04:05"))
}

// GetSystemRoleStats 获取系统角色统计
func (s *SystemRoleService) GetSystemRoleStats() map[string]interface{} {
	stats := make(map[string]interface{})
	
	stats["total_system_roles"] = len(models.SystemRoles)
	stats["role_hierarchy"] = models.SystemRoleHierarchy
	stats["roles"] = models.SystemRoles
	
	return stats
}
