package framework

import (
	"ai-project-backend/database"
	"ai-project-backend/security"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// ExampleUsage 权限框架使用示例
func ExampleUsage() {
	// 假设已有的依赖
	var (
		permissionRepo database.PermissionRepository
		redisClient    *redis.Client
		auditRepo      database.AuditRepository
		rateLimiter    *security.RateLimiter
	)
	
	// === 方式1：使用构建器模式 ===
	framework, err := NewFrameworkBuilder().
		LoadFromEnv().                          // 从环境变量加载配置
		WithPermissionRepo(permissionRepo).     // 设置权限仓库
		WithRedisClient(redisClient).           // 设置Redis客户端
		WithAuditRepo(auditRepo).              // 设置审计仓库
		WithRateLimiter(rateLimiter).          // 设置速率限制器
		EnableCache(true).                     // 启用缓存
		EnableAudit(true).                     // 启用审计
		EnableMetrics(true).                   // 启用指标
		Build()                                // 构建框架
	
	if err != nil {
		log.Fatal("Failed to create permission framework:", err)
	}
	defer framework.Close()
	
	// === 方式2：快速设置 ===
	// framework, err := QuickSetup(permissionRepo, redisClient, auditRepo, rateLimiter)
	
	// 创建Gin路由器
	router := gin.New()
	
	// === 基础权限检查中间件 ===
	
	// 单个权限检查
	projectReadMiddleware := framework.CreatePermissionMiddleware(&MiddlewareOptions{
		Permission:       "project.read",
		Strategy:         "cached",           // 使用缓存策略
		EnableCache:      true,
		EnablePrediction: false,
		EnableAudit:      true,
	})
	
	// 应用到路由
	router.GET("/projects", projectReadMiddleware, func(c *gin.Context) {
		// 权限检查通过，执行业务逻辑
		c.JSON(200, gin.H{"message": "Projects list"})
	})
	
	// === 多权限检查中间件（OR逻辑）===
	
	// 用户需要具备以下任一权限
	anyPermMiddleware := framework.CreateAnyPermissionMiddleware(&AnyPermissionOptions{
		Permissions: []string{
			"project.read",
			"project.admin",
		},
		Strategy:         "composite",        // 使用组合策略
		EnableCache:      true,
		EnablePrediction: true,
		EnableAudit:      true,
	})
	
	router.GET("/projects/:id", anyPermMiddleware, func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Project details"})
	})
	
	// === 多权限检查中间件（AND逻辑）===
	
	// 用户需要具备以下所有权限
	allPermMiddleware := framework.CreateAllPermissionMiddleware(&AllPermissionOptions{
		Permissions: []string{
			"project.read",
			"finance.read",
		},
		Strategy:    "cached",
		EnableAudit: true,
	})
	
	router.GET("/projects/:id/budget", allPermMiddleware, func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Project budget"})
	})
	
	// === 角色权限检查中间件 ===
	
	// 检查用户角色
	roleMiddleware := framework.CreateRoleMiddleware(&RoleOptions{
		Role:        "project_manager",
		Strategy:    "basic",
		EnableAudit: true,
	})
	
	router.POST("/projects", roleMiddleware, func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Project created"})
	})
	
	// 多角色检查
	multiRoleMiddleware := framework.CreateRoleMiddleware(&RoleOptions{
		AllowedRoles: []string{
			"admin",
			"project_manager",
			"team_lead",
		},
		Strategy:    "cached",
		EnableAudit: true,
	})
	
	router.PUT("/projects/:id/settings", multiRoleMiddleware, func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Project settings updated"})
	})
	
	// === 资源权限检查中间件 ===
	
	// 检查特定资源的权限
	resourceMiddleware := framework.CreateResourceMiddleware(&ResourceOptions{
		Permission:   "project.update",
		ResourceType: "project",
		Strategy:     "composite",
		EnableCache:  true,
		EnableAudit:  true,
		// 自定义资源提取器
		ResourceExtractor: func(c *gin.Context) (*int, string) {
			// 从URL参数或请求体中提取资源信息
			if idStr := c.Param("id"); idStr != "" {
				if id, err := strconv.Atoi(idStr); err == nil {
					return &id, "project"
				}
			}
			return nil, "project"
		},
		// 自定义所有权检查器
		OwnershipChecker: func(c *gin.Context, userID int, resourceID *int) bool {
			// 检查用户是否拥有该资源
			// 这里应该调用相应的业务逻辑
			return true
		},
	})
	
	router.PUT("/projects/:id", resourceMiddleware, func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Project updated"})
	})
	
	// === 组合权限检查中间件 ===
	
	// 复杂的权限组合检查
	compositeMiddleware := framework.CreateCompositeMiddleware(&CompositeOptions{
		Rules: []PermissionRule{
			{
				Type:       "permission",
				Permission: "project.read",
				Required:   true,
				Weight:     1.0,
			},
			{
				Type: "role",
				Role: "team_member",
				Required: false,
				Weight:   0.5,
			},
			{
				Type:         "resource",
				Permission:   "project.access",
				ResourceType: "project",
				Required:     true,
				Weight:       1.0,
			},
		},
		Logic:       "AND",                   // AND、OR、CUSTOM
		Strategy:    "composite",
		EnableCache: true,
		EnableAudit: true,
		// 自定义逻辑（当Logic为CUSTOM时使用）
		CustomLogic: func(responses []*PermissionResponse) bool {
			// 自定义权限判断逻辑
			// 例如：至少需要2个权限通过
			grantedCount := 0
			for _, resp := range responses {
				if resp.HasPermission {
					grantedCount++
				}
			}
			return grantedCount >= 2
		},
	})
	
	router.GET("/projects/:id/sensitive-data", compositeMiddleware, func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Sensitive project data"})
	})
	
	// === 自定义错误处理 ===
	
	customErrorMiddleware := framework.CreatePermissionMiddleware(&MiddlewareOptions{
		Permission:  "admin.access",
		Strategy:    "basic",
		EnableAudit: true,
		// 自定义错误处理器
		ErrorHandler: func(c *gin.Context, err error) {
			log.Printf("Permission check error: %v", err)
			c.JSON(500, gin.H{
				"error": "Internal server error",
				"code":  "PERMISSION_CHECK_FAILED",
			})
			c.Abort()
		},
		// 自定义降级处理器
		FallbackHandler: func(c *gin.Context) bool {
			// 在权限检查失败时的降级逻辑
			// 例如：允许只读访问
			log.Printf("Permission check failed, allowing read-only access")
			c.Set("read_only_mode", true)
			c.Next()
			return true // 返回true表示已处理
		},
	})
	
	router.GET("/admin/dashboard", customErrorMiddleware, func(c *gin.Context) {
		readOnly, exists := c.Get("read_only_mode")
		if exists && readOnly.(bool) {
			c.JSON(200, gin.H{
				"message":   "Dashboard (read-only mode)",
				"read_only": true,
			})
		} else {
			c.JSON(200, gin.H{"message": "Full admin dashboard"})
		}
	})
	
	// === 获取框架指标和健康状态 ===
	
	router.GET("/admin/permission-framework/health", func(c *gin.Context) {
		health, err := framework.GetHealth()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, health)
	})
	
	router.GET("/admin/permission-framework/metrics", func(c *gin.Context) {
		metrics, err := framework.GetMetrics()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, metrics)
	})
	
	// 启动服务器
	log.Printf("Starting server with permission framework...")
	router.Run(":8080")
}

// ExampleAdvancedUsage 高级使用示例
func ExampleAdvancedUsage() {
	// 创建自定义配置
	config := &FrameworkConfig{
		EnableCache:      true,
		EnablePrediction: true,
		EnableAudit:      true,
		EnableMetrics:    true,
		EnableRateLimit:  true,
		
		CacheConfig: &CacheConfig{
			TTL:              30 * time.Minute,
			MaxSize:          50000,
			L1CacheSize:      5000,
			EnableL1Cache:    true,
			EnableL2Cache:    true,
			PreloadThreshold: 0.9,
		},
		
		PerformanceConfig: &PerformanceConfig{
			BatchSize:                   200,
			PredictionAccuracyThreshold: 0.85,
			RateLimitPerUser:            2000,
			MaxConcurrentChecks:         200,
			CheckTimeout:                10 * time.Second,
			EnableAsyncPreload:          true,
		},
		
		MonitoringConfig: &MonitoringConfig{
			MetricsInterval:   15 * time.Second,
			AuditBufferSize:   2000,
			EnableHealthCheck: true,
			EnableAlerting:    true,
			AlertThresholds: map[string]float64{
				"error_rate":    0.05,  // 5%错误率告警
				"cache_hit_rate": 0.80, // 80%缓存命中率告警
				"avg_latency":   100,   // 100ms平均延迟告警
			},
		},
		
		FallbackConfig: &FallbackConfig{
			EnableFallback:          true,
			FallbackStrategy:        "allow", // 降级时允许访问
			CircuitBreakerThreshold: 20,
			CircuitBreakerTimeout:   60 * time.Second,
			DefaultPermissionResult: true,
		},
	}
	
	// 设置依赖项
	// config.PermissionRepo = ...
	// config.RedisClient = ...
	// config.AuditRepo = ...
	// config.RateLimiter = ...
	
	framework, err := NewPermissionFramework(config)
	if err != nil {
		log.Fatal("Failed to create advanced permission framework:", err)
	}
	defer framework.Close()
	
	// 打印配置用于调试
	PrintConfig(config)
	
	// 使用框架...
	log.Printf("Advanced permission framework initialized successfully")
}

// strconv import is needed for the examples above
import "strconv"
