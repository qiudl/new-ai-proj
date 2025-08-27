package framework

import (
	"ai-project-backend/database"
	"ai-project-backend/security"
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// PermissionFramework 权限验证框架核心
type PermissionFramework struct {
	config      *FrameworkConfig
	factory     *MiddlewareFactory
	strategy    StrategyManager
	monitor     *MonitoringManager
	cache       *PermissionCacheManager
	predictor   *PermissionPredictor
	initialized bool
	mu          sync.RWMutex
}

// FrameworkConfig 框架配置
type FrameworkConfig struct {
	// 基础配置
	EnableCache        bool `json:"enable_cache"`
	EnablePrediction   bool `json:"enable_prediction"`
	EnableAudit        bool `json:"enable_audit"`
	EnableMetrics      bool `json:"enable_metrics"`
	EnableRateLimit    bool `json:"enable_rate_limit"`
	
	// 缓存配置
	CacheConfig        *CacheConfig `json:"cache_config"`
	
	// 性能配置
	PerformanceConfig  *PerformanceConfig `json:"performance_config"`
	
	// 监控配置
	MonitoringConfig   *MonitoringConfig `json:"monitoring_config"`
	
	// 降级配置
	FallbackConfig     *FallbackConfig `json:"fallback_config"`
	
	// 依赖项
	RedisClient        *redis.Client
	PermissionRepo     database.PermissionRepository
	AuditRepo          database.AuditRepository
	RateLimiter        *security.RateLimiter
}

// CacheConfig 缓存配置
type CacheConfig struct {
	TTL               time.Duration `json:"ttl"`
	MaxSize           int          `json:"max_size"`
	L1CacheSize       int          `json:"l1_cache_size"`
	EnableL1Cache     bool         `json:"enable_l1_cache"`
	EnableL2Cache     bool         `json:"enable_l2_cache"`
	PreloadThreshold  float64      `json:"preload_threshold"`
}

// PerformanceConfig 性能配置
type PerformanceConfig struct {
	BatchSize                    int           `json:"batch_size"`
	PredictionAccuracyThreshold  float64       `json:"prediction_accuracy_threshold"`
	RateLimitPerUser             int           `json:"rate_limit_per_user"`
	MaxConcurrentChecks          int           `json:"max_concurrent_checks"`
	CheckTimeout                 time.Duration `json:"check_timeout"`
	EnableAsyncPreload           bool          `json:"enable_async_preload"`
}

// MonitoringConfig 监控配置
type MonitoringConfig struct {
	MetricsInterval     time.Duration `json:"metrics_interval"`
	AuditBufferSize     int          `json:"audit_buffer_size"`
	EnableHealthCheck   bool         `json:"enable_health_check"`
	EnableAlerting      bool         `json:"enable_alerting"`
	AlertThresholds     map[string]float64 `json:"alert_thresholds"`
}

// FallbackConfig 降级配置
type FallbackConfig struct {
	EnableFallback          bool          `json:"enable_fallback"`
	FallbackStrategy        string        `json:"fallback_strategy"`
	CircuitBreakerThreshold int           `json:"circuit_breaker_threshold"`
	CircuitBreakerTimeout   time.Duration `json:"circuit_breaker_timeout"`
	DefaultPermissionResult bool          `json:"default_permission_result"`
}

// NewPermissionFramework 创建权限验证框架
func NewPermissionFramework(config *FrameworkConfig) (*PermissionFramework, error) {
	if config == nil {
		return nil, fmt.Errorf("framework config cannot be nil")
	}
	
	// 设置默认配置
	if err := setDefaultConfig(config); err != nil {
		return nil, fmt.Errorf("failed to set default config: %w", err)
	}
	
	framework := &PermissionFramework{
		config: config,
	}
	
	// 初始化组件
	if err := framework.initialize(); err != nil {
		return nil, fmt.Errorf("failed to initialize framework: %w", err)
	}
	
	return framework, nil
}

// initialize 初始化框架组件
func (f *PermissionFramework) initialize() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	
	if f.initialized {
		return nil
	}
	
	var err error
	
	// 初始化缓存管理器
	if f.config.EnableCache {
		f.cache, err = NewPermissionCacheManager(f.config)
		if err != nil {
			log.Printf("[FRAMEWORK] Warning: failed to initialize cache manager: %v", err)
			f.config.EnableCache = false
		}
	}
	
	// 初始化权限预测器
	if f.config.EnablePrediction {
		f.predictor, err = NewPermissionPredictor(f.config)
		if err != nil {
			log.Printf("[FRAMEWORK] Warning: failed to initialize predictor: %v", err)
			f.config.EnablePrediction = false
		}
	}
	
	// 初始化策略管理器
	f.strategy = NewStrategyManager(f.config, f.cache, f.predictor)
	
	// 初始化监控管理器
	if f.config.EnableMetrics || f.config.EnableAudit {
		f.monitor, err = NewMonitoringManager(f.config)
		if err != nil {
			log.Printf("[FRAMEWORK] Warning: failed to initialize monitoring: %v", err)
		}
	}
	
	// 初始化中间件工厂
	f.factory = NewMiddlewareFactory(f)
	
	f.initialized = true
	log.Printf("[FRAMEWORK] Permission framework initialized successfully")
	
	return nil
}

// CreatePermissionMiddleware 创建单个权限检查中间件
func (f *PermissionFramework) CreatePermissionMiddleware(options *MiddlewareOptions) gin.HandlerFunc {
	return f.factory.CreatePermissionMiddleware(options)
}

// CreateAnyPermissionMiddleware 创建任一权限检查中间件
func (f *PermissionFramework) CreateAnyPermissionMiddleware(options *AnyPermissionOptions) gin.HandlerFunc {
	return f.factory.CreateAnyPermissionMiddleware(options)
}

// CreateAllPermissionMiddleware 创建所有权限检查中间件
func (f *PermissionFramework) CreateAllPermissionMiddleware(options *AllPermissionOptions) gin.HandlerFunc {
	return f.factory.CreateAllPermissionMiddleware(options)
}

// CreateRoleMiddleware 创建角色检查中间件
func (f *PermissionFramework) CreateRoleMiddleware(options *RoleOptions) gin.HandlerFunc {
	return f.factory.CreateRoleMiddleware(options)
}

// CreateResourceMiddleware 创建资源权限检查中间件
func (f *PermissionFramework) CreateResourceMiddleware(options *ResourceOptions) gin.HandlerFunc {
	return f.factory.CreateResourceMiddleware(options)
}

// CreateCompositeMiddleware 创建组合权限检查中间件
func (f *PermissionFramework) CreateCompositeMiddleware(options *CompositeOptions) gin.HandlerFunc {
	return f.factory.CreateCompositeMiddleware(options)
}

// CheckPermission 执行权限检查
func (f *PermissionFramework) CheckPermission(ctx context.Context, request *PermissionRequest) (*PermissionResponse, error) {
	if !f.initialized {
		return nil, fmt.Errorf("framework not initialized")
	}
	
	startTime := time.Now()
	
	// 监控指标记录
	if f.monitor != nil {
		defer func() {
			f.monitor.RecordPermissionCheck(request, time.Since(startTime))
		}()
	}
	
	// 使用策略管理器检查权限
	response, err := f.strategy.CheckPermission(ctx, request)
	if err != nil {
		// 记录错误指标
		if f.monitor != nil {
			f.monitor.RecordError("permission_check", err)
		}
		return nil, err
	}
	
	response.ResponseTime = time.Since(startTime)
	
	// 审计日志
	if f.config.EnableAudit && f.monitor != nil {
		go f.monitor.LogPermissionCheck(ctx, request, response)
	}
	
	return response, nil
}

// CheckBatchPermissions 批量权限检查
func (f *PermissionFramework) CheckBatchPermissions(ctx context.Context, requests []*PermissionRequest) ([]*PermissionResponse, error) {
	if !f.initialized {
		return nil, fmt.Errorf("framework not initialized")
	}
	
	startTime := time.Now()
	
	// 监控指标记录
	if f.monitor != nil {
		defer func() {
			f.monitor.RecordBatchPermissionCheck(len(requests), time.Since(startTime))
		}()
	}
	
	// 使用策略管理器批量检查权限
	responses, err := f.strategy.CheckBatchPermissions(ctx, requests)
	if err != nil {
		// 记录错误指标
		if f.monitor != nil {
			f.monitor.RecordError("batch_permission_check", err)
		}
		return nil, err
	}
	
	// 设置响应时间
	responseTime := time.Since(startTime)
	for _, response := range responses {
		response.ResponseTime = responseTime
	}
	
	return responses, nil
}

// GetHealth 获取框架健康状态
func (f *PermissionFramework) GetHealth() (*FrameworkHealth, error) {
	health := &FrameworkHealth{
		Status:      "healthy",
		Initialized: f.initialized,
		Components:  make(map[string]ComponentHealth),
		CheckTime:   time.Now(),
	}
	
	// 检查缓存健康状态
	if f.config.EnableCache && f.cache != nil {
		cacheHealth := f.cache.GetHealth()
		health.Components["cache"] = ComponentHealth{
			Status:  cacheHealth.Status,
			Details: cacheHealth.Details,
		}
		if cacheHealth.Status != "healthy" {
			health.Status = "degraded"
		}
	}
	
	// 检查预测器健康状态
	if f.config.EnablePrediction && f.predictor != nil {
		predictorHealth := f.predictor.GetHealth()
		health.Components["predictor"] = ComponentHealth{
			Status:  predictorHealth.Status,
			Details: predictorHealth.Details,
		}
		if predictorHealth.Status != "healthy" && health.Status == "healthy" {
			health.Status = "degraded"
		}
	}
	
	// 检查监控健康状态
	if f.monitor != nil {
		monitorHealth := f.monitor.GetHealth()
		health.Components["monitor"] = ComponentHealth{
			Status:  monitorHealth.Status,
			Details: monitorHealth.Details,
		}
		if monitorHealth.Status != "healthy" && health.Status == "healthy" {
			health.Status = "degraded"
		}
	}
	
	return health, nil
}

// GetMetrics 获取框架指标
func (f *PermissionFramework) GetMetrics() (*FrameworkMetrics, error) {
	if !f.config.EnableMetrics || f.monitor == nil {
		return nil, fmt.Errorf("metrics not enabled")
	}
	
	return f.monitor.GetMetrics(), nil
}

// InvalidateUserCache 清理用户权限缓存
func (f *PermissionFramework) InvalidateUserCache(ctx context.Context, userID int) error {
	if f.config.EnableCache && f.cache != nil {
		return f.cache.InvalidateUserPermissions(ctx, userID)
	}
	return nil
}

// UpdateUserPermissionPattern 更新用户权限使用模式
func (f *PermissionFramework) UpdateUserPermissionPattern(ctx context.Context, userID int, permissions []string) error {
	if f.config.EnablePrediction && f.predictor != nil {
		return f.predictor.UpdateUserPattern(ctx, userID, permissions)
	}
	return nil
}

// Close 关闭框架
func (f *PermissionFramework) Close() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	
	var errors []error
	
	// 关闭缓存管理器
	if f.cache != nil {
		if err := f.cache.Close(); err != nil {
			errors = append(errors, fmt.Errorf("cache manager close error: %w", err))
		}
	}
	
	// 关闭预测器
	if f.predictor != nil {
		if err := f.predictor.Close(); err != nil {
			errors = append(errors, fmt.Errorf("predictor close error: %w", err))
		}
	}
	
	// 关闭监控管理器
	if f.monitor != nil {
		if err := f.monitor.Close(); err != nil {
			errors = append(errors, fmt.Errorf("monitor close error: %w", err))
		}
	}
	
	f.initialized = false
	
	if len(errors) > 0 {
		return fmt.Errorf("framework close errors: %v", errors)
	}
	
	return nil
}

// setDefaultConfig 设置默认配置
func setDefaultConfig(config *FrameworkConfig) error {
	if config.CacheConfig == nil {
		config.CacheConfig = &CacheConfig{
			TTL:               15 * time.Minute,
			MaxSize:           10000,
			L1CacheSize:       1000,
			EnableL1Cache:     true,
			EnableL2Cache:     true,
			PreloadThreshold:  0.8,
		}
	}
	
	if config.PerformanceConfig == nil {
		config.PerformanceConfig = &PerformanceConfig{
			BatchSize:                    100,
			PredictionAccuracyThreshold:  0.8,
			RateLimitPerUser:             1000,
			MaxConcurrentChecks:          100,
			CheckTimeout:                 5 * time.Second,
			EnableAsyncPreload:           true,
		}
	}
	
	if config.MonitoringConfig == nil {
		config.MonitoringConfig = &MonitoringConfig{
			MetricsInterval:     30 * time.Second,
			AuditBufferSize:     1000,
			EnableHealthCheck:   true,
			EnableAlerting:      false,
			AlertThresholds:     make(map[string]float64),
		}
	}
	
	if config.FallbackConfig == nil {
		config.FallbackConfig = &FallbackConfig{
			EnableFallback:          true,
			FallbackStrategy:        "deny",
			CircuitBreakerThreshold: 10,
			CircuitBreakerTimeout:   30 * time.Second,
			DefaultPermissionResult: false,
		}
	}
	
	return nil
}
b *FrameworkBuilder) LoadFromEnv() *FrameworkBuilder {
	// 基础功能开关
	b.config.EnableCache = getBoolEnv("PERMISSION_FRAMEWORK_CACHE_ENABLE", true)
	b.config.EnablePrediction = getBoolEnv("PERMISSION_FRAMEWORK_PREDICTION_ENABLE", false)
	b.config.EnableAudit = getBoolEnv("PERMISSION_FRAMEWORK_AUDIT_ENABLE", true)
	b.config.EnableMetrics = getBoolEnv("PERMISSION_FRAMEWORK_METRICS_ENABLE", true)
	b.config.EnableRateLimit = getBoolEnv("PERMISSION_FRAMEWORK_RATE_LIMIT_ENABLE", true)
	
	// 缓存配置
	if b.config.CacheConfig == nil {
		b.config.CacheConfig = &CacheConfig{}
	}
	b.config.CacheConfig.TTL = getDurationEnv("PERMISSION_CACHE_TTL", 15*time.Minute)
	b.config.CacheConfig.MaxSize = getIntEnv("PERMISSION_CACHE_MAX_SIZE", 10000)
	b.config.CacheConfig.L1CacheSize = getIntEnv("PERMISSION_L1_CACHE_SIZE", 1000)
	b.config.CacheConfig.EnableL1Cache = getBoolEnv("PERMISSION_L1_CACHE_ENABLE", true)
	b.config.CacheConfig.EnableL2Cache = getBoolEnv("PERMISSION_L2_CACHE_ENABLE", true)
	b.config.CacheConfig.PreloadThreshold = getFloatEnv("PERMISSION_CACHE_PRELOAD_THRESHOLD", 0.8)
	
	// 性能配置
	if b.config.PerformanceConfig == nil {
		b.config.PerformanceConfig = &PerformanceConfig{}
	}
	b.config.PerformanceConfig.BatchSize = getIntEnv("PERMISSION_BATCH_SIZE", 100)
	b.config.PerformanceConfig.PredictionAccuracyThreshold = getFloatEnv("PERMISSION_PREDICTION_ACCURACY_THRESHOLD", 0.8)
	b.config.PerformanceConfig.RateLimitPerUser = getIntEnv("PERMISSION_RATE_LIMIT_PER_USER", 1000)
	b.config.PerformanceConfig.MaxConcurrentChecks = getIntEnv("PERMISSION_MAX_CONCURRENT_CHECKS", 100)
	b.config.PerformanceConfig.CheckTimeout = getDurationEnv("PERMISSION_CHECK_TIMEOUT", 5*time.Second)
	b.config.PerformanceConfig.EnableAsyncPreload = getBoolEnv("PERMISSION_ASYNC_PRELOAD_ENABLE", true)
	
	// 监控配置
	if b.config.MonitoringConfig == nil {
		b.config.MonitoringConfig = &MonitoringConfig{}
	}
	b.config.MonitoringConfig.MetricsInterval = getDurationEnv("PERMISSION_METRICS_INTERVAL", 30*time.Second)
	b.config.MonitoringConfig.AuditBufferSize = getIntEnv("PERMISSION_AUDIT_BUFFER_SIZE", 1000)
	b.config.MonitoringConfig.EnableHealthCheck = getBoolEnv("PERMISSION_HEALTH_CHECK_ENABLE", true)
	b.config.MonitoringConfig.EnableAlerting = getBoolEnv("PERMISSION_ALERTING_ENABLE", false)
	
	// 降级配置
	if b.config.FallbackConfig == nil {
		b.config.FallbackConfig = &FallbackConfig{}
	}
	b.config.FallbackConfig.EnableFallback = getBoolEnv("PERMISSION_FALLBACK_ENABLE", true)
	b.config.FallbackConfig.FallbackStrategy = getStringEnv("PERMISSION_FALLBACK_STRATEGY", "deny")
	b.config.FallbackConfig.CircuitBreakerThreshold = getIntEnv("PERMISSION_CIRCUIT_BREAKER_THRESHOLD", 10)
	b.config.FallbackConfig.CircuitBreakerTimeout = getDurationEnv("PERMISSION_CIRCUIT_BREAKER_TIMEOUT", 30*time.Second)
	b.config.FallbackConfig.DefaultPermissionResult = getBoolEnv("PERMISSION_DEFAULT_RESULT", false)
	
	return b
}

// Build 构建权限框架
func (b *FrameworkBuilder) Build() (*PermissionFramework, error) {
	if err := b.validateConfig(); err != nil {
		return nil, fmt.Errorf("invalid framework configuration: %w", err)
	}
	
	return NewPermissionFramework(b.config)
}

// validateConfig 验证配置
func (b *FrameworkBuilder) validateConfig() error {
	if b.config.PermissionRepo == nil {
		return fmt.Errorf("permission repository is required")
	}
	
	if b.config.EnableCache && b.config.RedisClient == nil {
		log.Printf("[FRAMEWORK_BUILDER] Warning: Cache enabled but Redis client not provided, disabling cache")
		b.config.EnableCache = false
	}
	
	if b.config.EnableAudit && b.config.AuditRepo == nil {
		log.Printf("[FRAMEWORK_BUILDER] Warning: Audit enabled but audit repository not provided, disabling audit")
		b.config.EnableAudit = false
	}
	
	if b.config.EnableRateLimit && b.config.RateLimiter == nil {
		log.Printf("[FRAMEWORK_BUILDER] Warning: Rate limit enabled but rate limiter not provided, disabling rate limit")
		b.config.EnableRateLimit = false
	}
	
	return nil
}

// 环境变量辅助函数

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
		log.Printf("[FRAMEWORK_BUILDER] Warning: Invalid boolean value for %s: %s, using default: %v", key, value, defaultValue)
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
		log.Printf("[FRAMEWORK_BUILDER] Warning: Invalid integer value for %s: %s, using default: %d", key, value, defaultValue)
	}
	return defaultValue
}

func getFloatEnv(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseFloat(value, 64); err == nil {
			return parsed
		}
		log.Printf("[FRAMEWORK_BUILDER] Warning: Invalid float value for %s: %s, using default: %f", key, value, defaultValue)
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
		log.Printf("[FRAMEWORK_BUILDER] Warning: Invalid duration value for %s: %s, using default: %v", key, value, defaultValue)
	}
	return defaultValue
}

func getStringEnv(key string, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// DefaultFrameworkConfig 创建默认框架配置
func DefaultFrameworkConfig() *FrameworkConfig {
	return &FrameworkConfig{
		EnableCache:      true,
		EnablePrediction: false,
		EnableAudit:      true,
		EnableMetrics:    true,
		EnableRateLimit:  true,
		CacheConfig: &CacheConfig{
			TTL:              15 * time.Minute,
			MaxSize:          10000,
			L1CacheSize:      1000,
			EnableL1Cache:    true,
			EnableL2Cache:    true,
			PreloadThreshold: 0.8,
		},
		PerformanceConfig: &PerformanceConfig{
			BatchSize:                   100,
			PredictionAccuracyThreshold: 0.8,
			RateLimitPerUser:            1000,
			MaxConcurrentChecks:         100,
			CheckTimeout:                5 * time.Second,
			EnableAsyncPreload:          true,
		},
		MonitoringConfig: &MonitoringConfig{
			MetricsInterval:   30 * time.Second,
			AuditBufferSize:   1000,
			EnableHealthCheck: true,
			EnableAlerting:    false,
			AlertThresholds:   make(map[string]float64),
		},
		FallbackConfig: &FallbackConfig{
			EnableFallback:          true,
			FallbackStrategy:        "deny",
			CircuitBreakerThreshold: 10,
			CircuitBreakerTimeout:   30 * time.Second,
			DefaultPermissionResult: false,
		},
	}
}

// QuickSetup 快速设置权限框架
func QuickSetup(
	permissionRepo database.PermissionRepository,
	redisClient *redis.Client,
	auditRepo database.AuditRepository,
	rateLimiter *security.RateLimiter,
) (*PermissionFramework, error) {
	
	builder := NewFrameworkBuilder().
		LoadFromEnv().
		WithPermissionRepo(permissionRepo).
		WithRedisClient(redisClient).
		WithAuditRepo(auditRepo).
		WithRateLimiter(rateLimiter)
	
	return builder.Build()
}

// SetupForTesting 为测试设置权限框架
func SetupForTesting(permissionRepo database.PermissionRepository) (*PermissionFramework, error) {
	config := DefaultFrameworkConfig()
	
	// 测试环境配置
	config.EnableCache = false
	config.EnablePrediction = false
	config.EnableAudit = false
	config.EnableMetrics = false
	config.EnableRateLimit = false
	config.PermissionRepo = permissionRepo
	
	return NewPermissionFramework(config)
}

// PrintConfig 打印框架配置（用于调试）
func PrintConfig(config *FrameworkConfig) {
	log.Printf("=== Permission Framework Configuration ===")
	log.Printf("Enable Cache: %v", config.EnableCache)
	log.Printf("Enable Prediction: %v", config.EnablePrediction)
	log.Printf("Enable Audit: %v", config.EnableAudit)
	log.Printf("Enable Metrics: %v", config.EnableMetrics)
	log.Printf("Enable Rate Limit: %v", config.EnableRateLimit)
	
	if config.CacheConfig != nil {
		log.Printf("Cache TTL: %v", config.CacheConfig.TTL)
		log.Printf("Cache Max Size: %d", config.CacheConfig.MaxSize)
		log.Printf("L1 Cache Size: %d", config.CacheConfig.L1CacheSize)
	}
	
	if config.PerformanceConfig != nil {
		log.Printf("Batch Size: %d", config.PerformanceConfig.BatchSize)
		log.Printf("Rate Limit Per User: %d", config.PerformanceConfig.RateLimitPerUser)
		log.Printf("Check Timeout: %v", config.PerformanceConfig.CheckTimeout)
	}
	
	if config.MonitoringConfig != nil {
		log.Printf("Metrics Interval: %v", config.MonitoringConfig.MetricsInterval)
		log.Printf("Audit Buffer Size: %d", config.MonitoringConfig.AuditBufferSize)
		log.Printf("Enable Health Check: %v", config.MonitoringConfig.EnableHealthCheck)
	}
	
	if config.FallbackConfig != nil {
		log.Printf("Enable Fallback: %v", config.FallbackConfig.EnableFallback)
		log.Printf("Fallback Strategy: %s", config.FallbackConfig.FallbackStrategy)
		log.Printf("Default Permission Result: %v", config.FallbackConfig.DefaultPermissionResult)
	}
	
	log.Printf("==========================================")
}
