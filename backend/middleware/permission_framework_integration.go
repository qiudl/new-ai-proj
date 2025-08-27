package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/middleware/framework"
	"ai-project-backend/security"
	"log"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// GlobalPermissionFramework 全局权限框架实例
var (
	globalFramework *framework.PermissionFramework
	frameworkOnce   sync.Once
	frameworkMu     sync.RWMutex
)

// InitializePermissionFramework 初始化全局权限框架
func InitializePermissionFramework(
	permissionRepo database.PermissionRepository,
	redisClient *redis.Client,
	auditRepo database.AuditRepository,
	rateLimiter *security.RateLimiter,
) error {
	var err error
	
	frameworkOnce.Do(func() {
		// 使用框架构建器创建权限框架
		globalFramework, err = framework.NewFrameworkBuilder().
			LoadFromEnv().                          // 从环境变量加载配置
			WithPermissionRepo(permissionRepo).     // 设置权限仓库
			WithRedisClient(redisClient).           // 设置Redis客户端
			WithAuditRepo(auditRepo).              // 设置审计仓库
			WithRateLimiter(rateLimiter).          // 设置速率限制器
			Build()                                // 构建框架
		
		if err != nil {
			log.Printf("[PERMISSION_FRAMEWORK] Failed to initialize: %v", err)
			return
		}
		
		log.Printf("[PERMISSION_FRAMEWORK] Successfully initialized")
		
		// 打印配置用于调试（仅在开发环境）
		if gin.Mode() == gin.DebugMode {
			health, healthErr := globalFramework.GetHealth()
			if healthErr == nil {
				log.Printf("[PERMISSION_FRAMEWORK] Health status: %s", health.Status)
				for component, status := range health.Components {
					log.Printf("[PERMISSION_FRAMEWORK] Component %s: %s", component, status.Status)
				}
			}
		}
	})
	
	return err
}

// GetPermissionFramework 获取全局权限框架实例
func GetPermissionFramework() *framework.PermissionFramework {
	frameworkMu.RLock()
	defer frameworkMu.RUnlock()
	return globalFramework
}

// IsFrameworkInitialized 检查框架是否已初始化
func IsFrameworkInitialized() bool {
	frameworkMu.RLock()
	defer frameworkMu.RUnlock()
	return globalFramework != nil
}

// ClosePermissionFramework 关闭全局权限框架
func ClosePermissionFramework() error {
	frameworkMu.Lock()
	defer frameworkMu.Unlock()
	
	if globalFramework != nil {
		err := globalFramework.Close()
		globalFramework = nil
		return err
	}
	
	return nil
}

// === 便捷的中间件创建函数 ===

// RequirePermission 要求特定权限的中间件（便捷函数）
func RequirePermission(permission string) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, falling back to basic middleware")
		// 回退到现有的权限中间件
		permMiddleware := NewPermissionMiddleware(nil) // 需要传入实际的repo
		return permMiddleware.RequirePermission(permission)
	}
	
	return globalFramework.CreatePermissionMiddleware(&framework.MiddlewareOptions{
		Permission:       permission,
		Strategy:         "composite", // 使用组合策略获得最佳性能
		EnableCache:      true,
		EnablePrediction: false, // 默认关闭预测，可通过环境变量启用
		EnableAudit:      true,
	})
}

// RequireAnyPermission 要求任一权限的中间件（便捷函数）
func RequireAnyPermission(permissions ...string) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, falling back to basic middleware")
		permMiddleware := NewPermissionMiddleware(nil)
		return permMiddleware.RequireAnyPermission(permissions...)
	}
	
	return globalFramework.CreateAnyPermissionMiddleware(&framework.AnyPermissionOptions{
		Permissions:      permissions,
		Strategy:         "composite",
		EnableCache:      true,
		EnablePrediction: false,
		EnableAudit:      true,
	})
}

// RequireAllPermissions 要求所有权限的中间件（便捷函数）
func RequireAllPermissions(permissions ...string) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, falling back to basic middleware")
		permMiddleware := NewPermissionMiddleware(nil)
		return permMiddleware.RequireAllPermissions(permissions...)
	}
	
	return globalFramework.CreateAllPermissionMiddleware(&framework.AllPermissionOptions{
		Permissions:      permissions,
		Strategy:         "composite",
		EnableCache:      true,
		EnablePrediction: false,
		EnableAudit:      true,
	})
}

// RequireRole 要求特定角色的中间件（便捷函数）
func RequireRole(role string) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, falling back to basic middleware")
		permMiddleware := NewPermissionMiddleware(nil)
		return permMiddleware.RequireRole(role)
	}
	
	return globalFramework.CreateRoleMiddleware(&framework.RoleOptions{
		Role:        role,
		Strategy:    "cached", // 角色检查适合缓存
		EnableCache: true,
		EnableAudit: true,
	})
}

// RequireAnyRole 要求任一角色的中间件（便捷函数）
func RequireAnyRole(roles ...string) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, falling back to basic middleware")
		permMiddleware := NewPermissionMiddleware(nil)
		return permMiddleware.RequireAnyRole(roles...)
	}
	
	return globalFramework.CreateRoleMiddleware(&framework.RoleOptions{
		AllowedRoles: roles,
		Strategy:     "cached",
		EnableCache:  true,
		EnableAudit:  true,
	})
}

// RequireResourcePermission 要求资源权限的中间件（便捷函数）
func RequireResourcePermission(permission, resourceType string) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, using basic permission check")
		return RequirePermission(permission)
	}
	
	return globalFramework.CreateResourceMiddleware(&framework.ResourceOptions{
		Permission:       permission,
		ResourceType:     resourceType,
		Strategy:         "composite",
		EnableCache:      true,
		EnablePrediction: false,
		EnableAudit:      true,
		// 默认资源提取器会从URL参数中提取ID
		ResourceExtractor: nil, // 使用默认实现
	})
}

// === 高级中间件创建函数 ===

// CreateAdvancedPermissionMiddleware 创建高级权限中间件
func CreateAdvancedPermissionMiddleware(options *framework.MiddlewareOptions) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, cannot create advanced middleware")
		return func(c *gin.Context) {
			c.JSON(500, gin.H{"error": "Permission framework not initialized"})
			c.Abort()
		}
	}
	
	return globalFramework.CreatePermissionMiddleware(options)
}

// CreateCompositePermissionMiddleware 创建组合权限中间件
func CreateCompositePermissionMiddleware(options *framework.CompositeOptions) gin.HandlerFunc {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Framework not initialized, cannot create composite middleware")
		return func(c *gin.Context) {
			c.JSON(500, gin.H{"error": "Permission framework not initialized"})
			c.Abort()
		}
	}
	
	return globalFramework.CreateCompositeMiddleware(options)
}

// === 框架状态和指标接口 ===

// GetFrameworkHealth 获取权限框架健康状态
func GetFrameworkHealth() (*framework.FrameworkHealth, error) {
	if !IsFrameworkInitialized() {
		return nil, fmt.Errorf("permission framework not initialized")
	}
	
	return globalFramework.GetHealth()
}

// GetFrameworkMetrics 获取权限框架指标
func GetFrameworkMetrics() (*framework.FrameworkMetrics, error) {
	if !IsFrameworkInitialized() {
		return nil, fmt.Errorf("permission framework not initialized")
	}
	
	return globalFramework.GetMetrics()
}

// InvalidateUserPermissionCache 清理用户权限缓存
func InvalidateUserPermissionCache(userID int) error {
	if !IsFrameworkInitialized() {
		return fmt.Errorf("permission framework not initialized")
	}
	
	return globalFramework.InvalidateUserCache(context.Background(), userID)
}

// === 兼容性支持 ===

// 为了保持向后兼容，这些函数保持现有的接口但内部使用新框架

// IsCompanyAdmin 检查是否为公司管理员（兼容性函数）
func (m *PermissionMiddleware) IsCompanyAdmin() gin.HandlerFunc {
	// 尝试使用新框架
	if IsFrameworkInitialized() {
		return RequireRole("company_admin")
	}
	
	// 回退到原有实现
	return m.RequireRole("company_admin")
}

// CanManageUsers 检查用户管理权限（兼容性函数）
func (m *PermissionMiddleware) CanManageUsers() gin.HandlerFunc {
	// 尝试使用新框架
	if IsFrameworkInitialized() {
		return RequireAnyPermission("company.users.create", "company.users.update", "company.users.delete")
	}
	
	// 回退到原有实现
	return m.RequireAnyPermission("company.users.create", "company.users.update", "company.users.delete")
}

// CanManageProjects 检查项目管理权限（兼容性函数）
func (m *PermissionMiddleware) CanManageProjects() gin.HandlerFunc {
	if IsFrameworkInitialized() {
		return RequireAnyPermission("project.create", "project.update", "project.delete")
	}
	
	return m.RequireAnyPermission("project.create", "project.update", "project.delete")
}

// CanViewProjects 检查项目查看权限（兼容性函数）
func (m *PermissionMiddleware) CanViewProjects() gin.HandlerFunc {
	if IsFrameworkInitialized() {
		return RequirePermission("project.list.read")
	}
	
	return m.RequirePermission("project.list.read")
}

// CanManageTasks 检查任务管理权限（兼容性函数）
func (m *PermissionMiddleware) CanManageTasks() gin.HandlerFunc {
	if IsFrameworkInitialized() {
		return RequireAnyPermission("task.create", "task.update", "task.delete", "task.assign")
	}
	
	return m.RequireAnyPermission("task.create", "task.update", "task.delete", "task.assign")
}

// CanViewFinancials 检查财务数据访问权限（兼容性函数）
func (m *PermissionMiddleware) CanViewFinancials() gin.HandlerFunc {
	if IsFrameworkInitialized() {
		return RequirePermission("finance.contracts.read")
	}
	
	return m.RequirePermission("finance.contracts.read")
}

// === 调试和开发辅助函数 ===

// LogPermissionFrameworkStatus 记录权限框架状态（调试用）
func LogPermissionFrameworkStatus() {
	if !IsFrameworkInitialized() {
		log.Printf("[PERMISSION_FRAMEWORK] Status: Not initialized")
		return
	}
	
	health, err := globalFramework.GetHealth()
	if err != nil {
		log.Printf("[PERMISSION_FRAMEWORK] Status: Error getting health - %v", err)
		return
	}
	
	log.Printf("[PERMISSION_FRAMEWORK] Status: %s", health.Status)
	for component, status := range health.Components {
		log.Printf("[PERMISSION_FRAMEWORK] Component %s: %s", component, status.Status)
	}
	
	if gin.Mode() == gin.DebugMode {
		metrics, err := globalFramework.GetMetrics()
		if err == nil {
			log.Printf("[PERMISSION_FRAMEWORK] Total checks: %d", metrics.TotalChecks)
			log.Printf("[PERMISSION_FRAMEWORK] Cache hit rate: %.2f%%", metrics.CacheHitRate*100)
			log.Printf("[PERMISSION_FRAMEWORK] Average latency: %v", metrics.AverageLatency)
		}
	}
}

// Need to import fmt and context
import (
	"context"
	"fmt"
)
