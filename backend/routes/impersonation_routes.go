package routes

import (
	"context"
	"fmt"
	"time"
	"github.com/gin-gonic/gin"
	"ai-project-backend/database"
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// RegisterImpersonationRoutes 注册模拟管理路由
func RegisterImpersonationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 使用真正的企业服务，从应用获取
	enterpriseHandler := app.GetEnterpriseHandler()
	enterpriseService := &RealEnterpriseServiceAdapter{
		handler: enterpriseHandler,
		db:      app.GetDB(),
	}
	
	// 从应用获取JWT配置信息
	config := app.GetConfig()
	jwtSecret := []byte(config.JWT.Secret) // 使用应用的JWT秘钥
	
	// 创建Token服务
	tokenService := services.NewTokenService(
		jwtSecret,             // 使用与主应用相同的JWT秘钥
		config.JWT.Expiration, // 与主应用一致的访问令牌过期时间
		2*time.Hour,           // 2小时模拟过期时间
	)
	
	// 创建审计服务适配器
	auditServiceAdapter := &AuditServiceAdapter{service: nil}
	
	// 创建模拟处理器
	impersonationHandler := handlers.NewImpersonationHandler(
		tokenService,
		enterpriseService,
		auditServiceAdapter,
	)
	
	// 创建管理员路由组
	admin := authorized.Group("/admin")
	
	// 模拟功能路由组
	impersonate := admin.Group("/impersonate")
	{
		// 开始模拟企业 - 需要系统管理员权限，禁止在模拟状态下嵌套模拟
		impersonate.POST("/enterprise/:id",
			middleware.RequireSystemAdmin(),
			middleware.RequireNonImpersonation(),
			impersonationHandler.StartImpersonation,
		)
		
		// 退出模拟 - 不需要系统管理员权限，模拟状态下可以访问
		impersonate.POST("/exit",
			impersonationHandler.ExitImpersonation,
		)
		
		// 查看当前模拟状态 - 不需要系统管理员权限，任何登录用户都可以查看自己的状态
		impersonate.GET("/status",
			impersonationHandler.GetImpersonationStatus,
		)
		
		// 查看模拟历史记录 - 需要系统管理员权限
		impersonate.GET("/history",
			middleware.RequireSystemAdmin(),
			impersonationHandler.GetImpersonationHistory,
		)
	}
}

// RealEnterpriseServiceAdapter 真实企业服务适配器
type RealEnterpriseServiceAdapter struct {
	handler *handlers.EnterpriseHandler
	db      database.DB
}

func (s *RealEnterpriseServiceAdapter) GetEnterpriseByID(ctx context.Context, id int) (*models.Enterprise, error) {
	// 使用真实的数据库查询获取企业信息
	enterprise, err := s.db.Enterprises().GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise: %w", err)
	}
	if enterprise == nil {
		return nil, fmt.Errorf("enterprise not found: ID %d", id)
	}
	return enterprise, nil
}

// SimpleEnterpriseService 简单的企业服务实现（保留用于测试）
type SimpleEnterpriseService struct{}

func (s *SimpleEnterpriseService) GetEnterpriseByID(ctx context.Context, id int) (*models.Enterprise, error) {
	// 这里应该从数据库获取企业信息
	// 暂时返回模拟数据
	enterprise := &models.Enterprise{
		ID:   id,
		Name: "Test Enterprise",
		Code: "TEST001",
		Status: "active",
	}
	return enterprise, nil
}

// AuditServiceAdapter 审计服务适配器
type AuditServiceAdapter struct {
	service interface{}
}

func (a *AuditServiceAdapter) LogEvent(ctx context.Context, data *models.AuditEventData) error {
	// 这里应该调用实际的审计服务
	// 暂时记录到日志
	if data != nil {
		// 简单的日志记录
		println("Audit Event:", data.Action, "by user", data.UserName, "on resource", data.ResourceType)
	}
	return nil
}