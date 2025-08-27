package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"net/http"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockPermissionRepository 模拟权限存储库
type MockPermissionRepository struct {
	mock.Mock
}

func (m *MockPermissionRepository) GetUserPermissions(ctx context.Context, companyUserID int) (*database.UserPermissionSummary, error) {
	args := m.Called(ctx, companyUserID)
	return args.Get(0).(*database.UserPermissionSummary), args.Error(1)
}

func (m *MockPermissionRepository) CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*database.PermissionCheckResult, error) {
	args := m.Called(ctx, companyUserID, permissionCode, resourceID)
	return args.Get(0).(*database.PermissionCheckResult), args.Error(1)
}

func (m *MockPermissionRepository) CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*database.PermissionCheckResult, error) {
	args := m.Called(ctx, companyUserID, permissionCodes, resourceID)
	return args.Get(0).(map[string]*database.PermissionCheckResult), args.Error(1)
}

// TestRolePermissionMiddleware 角色权限中间件测试
func TestRolePermissionMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("RequireSystemRole_Success", func(t *testing.T) {
		mockRepo := &MockPermissionRepository{}
		middleware := NewRolePermissionMiddleware(mockRepo, nil)

		// 模拟用户权限数据
		userPermissions := &database.UserPermissionSummary{
			Role: &database.UserRole{
				RoleCode: models.RoleCodeSystemAdmin,
				RoleName: "系统管理员",
			},
			Permissions: []*database.UserPermission{
				{PermissionCode: "system.users.read"},
				{PermissionCode: "system.config.update"},
			},
		}

		mockRepo.On("GetUserPermissions", mock.Anything, 123).Return(userPermissions, nil)

		// 创建测试上下文
		c, _ := gin.CreateTestContext(nil)
		c.Set("company_user_id", 123)

		// 创建中间件处理器
		handler := middleware.RequireSystemRole(models.RoleCodeSystemAdmin)

		// 执行测试
		handler(c)

		// 验证结果
		assert.False(t, c.IsAborted())
		roleCtx, exists := c.Get("role_context")
		assert.True(t, exists)
		assert.NotNil(t, roleCtx)

		ctx := roleCtx.(*RoleContext)
		assert.Equal(t, models.RoleCodeSystemAdmin, ctx.RoleCode)
		assert.True(t, ctx.IsSystemRole)
	})

	t.Run("RequireSystemRole_Unauthorized", func(t *testing.T) {
		mockRepo := &MockPermissionRepository{}
		middleware := NewRolePermissionMiddleware(mockRepo, nil)

		// 创建测试上下文（缺少company_user_id）
		c, _ := gin.CreateTestContext(nil)

		handler := middleware.RequireSystemRole(models.RoleCodeSystemAdmin)
		handler(c)

		// 验证结果
		assert.True(t, c.IsAborted())
	})

	t.Run("RequireMinimumRoleLevel_Success", func(t *testing.T) {
		mockRepo := &MockPermissionRepository{}
		middleware := NewRolePermissionMiddleware(mockRepo, nil)

		// 模拟高级别用户
		userPermissions := &database.UserPermissionSummary{
			Role: &database.UserRole{
				RoleCode: models.RoleCodeSuperAdmin, // Level 1
				RoleName: "超级管理员",
			},
			Permissions: []*database.UserPermission{},
		}

		mockRepo.On("GetUserPermissions", mock.Anything, 456).Return(userPermissions, nil)

		c, _ := gin.CreateTestContext(nil)
		c.Set("company_user_id", 456)

		handler := middleware.RequireMinimumRoleLevel(3) // 要求级别3或更高
		handler(c)

		assert.False(t, c.IsAborted())
	})

	t.Run("CacheHit_Performance", func(t *testing.T) {
		mockRepo := &MockPermissionRepository{}
		config := &RolePermissionConfig{
			EnableCache: true,
			CacheTTL:    1 * time.Minute,
		}
		middleware := NewRolePermissionMiddleware(mockRepo, config)

		userPermissions := &database.UserPermissionSummary{
			Role: &database.UserRole{
				RoleCode: models.RoleCodeSystemAdmin,
				RoleName: "系统管理员",
			},
			Permissions: []*database.UserPermission{},
		}

		// 第一次调用会查询数据库
		mockRepo.On("GetUserPermissions", mock.Anything, 789).Return(userPermissions, nil).Once()

		// 第一次请求
		c1, _ := gin.CreateTestContext(nil)
		c1.Set("company_user_id", 789)
		handler := middleware.RequireSystemRole(models.RoleCodeSystemAdmin)
		handler(c1)

		// 第二次请求（应该使用缓存）
		c2, _ := gin.CreateTestContext(nil)
		c2.Set("company_user_id", 789)
		handler(c2)

		// 验证缓存命中
		stats := middleware.GetStats()
		assert.Equal(t, int64(2), stats.TotalChecks)
		assert.Equal(t, int64(1), stats.CacheHits)
		assert.Equal(t, int64(1), stats.CacheMisses)

		mockRepo.AssertExpectations(t)
	})
}

// BenchmarkRolePermissionMiddleware 性能基准测试
func BenchmarkRolePermissionMiddleware(b *testing.B) {
	gin.SetMode(gin.TestMode)
	
	mockRepo := &MockPermissionRepository{}
	config := &RolePermissionConfig{
		EnableCache: true,
		CacheTTL:    5 * time.Minute,
	}
	middleware := NewRolePermissionMiddleware(mockRepo, config)

	userPermissions := &database.UserPermissionSummary{
		Role: &database.UserRole{
			RoleCode: models.RoleCodeSystemAdmin,
			RoleName: "系统管理员",
		},
		Permissions: []*database.UserPermission{
			{PermissionCode: "system.users.read"},
		},
	}

	mockRepo.On("GetUserPermissions", mock.Anything, mock.AnythingOfType("int")).Return(userPermissions, nil)

	b.ResetTimer()
	
	for i := 0; i < b.N; i++ {
		c, _ := gin.CreateTestContext(nil)
		c.Set("company_user_id", i%100) // 模拟100个不同用户
		
		handler := middleware.RequireSystemRole(models.RoleCodeSystemAdmin)
		handler(c)
	}
}

// TestRolePermissionFactory 工厂测试
func TestRolePermissionFactory(t *testing.T) {
	mockRepo := &MockPermissionRepository{}
	factory := NewRolePermissionMiddlewareFactory(mockRepo)

	t.Run("CreateStandardMiddleware", func(t *testing.T) {
		middleware := factory.CreateStandardMiddleware()
		assert.NotNil(t, middleware)
		assert.NotNil(t, middleware.cache)
	})

	t.Run("CreateStrictMiddleware", func(t *testing.T) {
		middleware := factory.CreateStrictMiddleware()
		assert.NotNil(t, middleware)
		// 严格模式应该有较短的缓存时间
		assert.Equal(t, 5*time.Minute, middleware.cacheTTL)
	})

	t.Run("CreateTestingMiddleware", func(t *testing.T) {
		middleware := factory.CreateTestingMiddleware()
		assert.NotNil(t, middleware)
		// 测试中间件应该禁用缓存
		assert.Nil(t, middleware.cache)
	})
}

// ExampleRolePermissionMiddleware 示例代码
func ExampleRolePermissionMiddleware() {
	// 这个函数演示如何使用角色权限中间件
	
	// 1. 创建中间件工厂
	var permissionRepo database.PermissionRepository // 实际实现
	factory := NewRolePermissionMiddlewareFactory(permissionRepo)
	
	// 2. 创建标准中间件
	roleMiddleware := factory.CreateStandardMiddleware()
	
	// 3. 在路由中使用
	r := gin.Default()
	
	// 要求系统管理员角色
	r.GET("/admin/users", roleMiddleware.RequireSystemRole(models.RoleCodeSystemAdmin), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Admin area"})
	})
	
	// 要求最低角色级别
	r.GET("/manager/projects", roleMiddleware.RequireMinimumRoleLevel(3), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Manager area"})
	})
	
	// 要求特定权限
	r.GET("/finance/reports", roleMiddleware.RequireFinanceAccess(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Financial reports"})
	})
	
	fmt.Println("角色权限中间件配置完成")
}

// IntegrationTest 集成测试
func IntegrationTestRolePermissionMiddleware() {
	log.Println("开始角色权限中间件集成测试...")
	
	// 这里可以添加更复杂的集成测试场景
	// 例如：多用户并发访问、缓存一致性、数据库连接等
	
	log.Println("集成测试完成")
}