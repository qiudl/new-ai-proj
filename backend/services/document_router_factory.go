package services

import (
	"ai-project-backend/database"
	"ai-project-backend/interfaces"
	"time"
)

// DocumentRouterFactory 文档路由器工厂
type DocumentRouterFactory struct {
	db database.DB
}

// NewDocumentRouterFactory 创建文档路由器工厂
func NewDocumentRouterFactory(db database.DB) *DocumentRouterFactory {
	return &DocumentRouterFactory{
		db: db,
	}
}

// CreateDocumentRouter 创建配置好的文档路由器
func (f *DocumentRouterFactory) CreateDocumentRouter(basePath string, strategy RoutingStrategy) *DocumentRouter {
	// 创建路由器配置
	config := &RoutingConfig{
		Strategy:                strategy,
		EnableHealthCheck:       true,
		HealthCheckInterval:     30 * time.Second,
		MaxRetries:             3,
		RetryDelay:             100 * time.Millisecond,
		EnableCircuitBreaker:    true,
		CircuitBreakerThreshold: 5,
		FallbackTimeout:         5 * time.Second,
	}
	
	router := NewDocumentRouter(config)
	
	// 注册V1服务（传统文件系统服务）
	if v1Service := f.createV1Service(basePath); v1Service != nil {
		router.RegisterService(ServiceV1, v1Service)
	}
	
	// 注册V2服务（统一文档服务）
	if v2Service := f.createV2Service(basePath); v2Service != nil {
		router.RegisterService(ServiceV2, v2Service)
	}
	
	// 注册数据库服务（如果需要）
	if dbService := f.createDBService(); dbService != nil {
		router.RegisterService(ServiceDB, dbService)
	}
	
	return router
}

// createV1Service 创建V1服务（传统文件系统服务）
func (f *DocumentRouterFactory) createV1Service(basePath string) interfaces.DocumentServiceInterface {
	// 这里可以创建传统的文件系统文档服务
	// 由于现有的DocumentService不完全实现接口，我们创建一个适配器
	
	// 临时禁用 V1 服务，避免 GORM 转换问题
	// TODO: 实现 PostgresDB 的 GORM 支持或者重构 LegacyDocumentServiceAdapter
	return nil
}

// createV2Service 创建V2服务（统一文档服务）
func (f *DocumentRouterFactory) createV2Service(basePath string) interfaces.DocumentServiceInterface {
	// 创建文档配置
	config := &interfaces.DocumentConfig{
		BasePath:          basePath,
		GitEnabled:        true,
		CacheEnabled:      true,
		MaxFileSize:       10 * 1024 * 1024, // 10MB
		AllowedExtensions: []string{".md", ".txt"},
		BackupEnabled:     true,
		Templates:         make(map[string]string),
		Cache: interfaces.CacheConfig{
			TTL:     30 * time.Minute,
			MaxSize: 1000,
			Enabled: true,
		},
		Git: interfaces.GitConfig{
			Enabled:      true,
			AutoCommit:   true,
			CommitPrefix: "docs: ",
			AuthorName:   "AI Project System",
			AuthorEmail:  "system@aiproject.local",
		},
	}
	
	return NewUnifiedDocumentService(config)
}

// createDBService 创建数据库服务
func (f *DocumentRouterFactory) createDBService() interfaces.DocumentServiceInterface {
	// 这里可以创建基于数据库的文档服务
	// 暂时返回nil，表示未实现
	return nil
}

// GetDefaultDocumentRouter 获取默认配置的文档路由器
func (f *DocumentRouterFactory) GetDefaultDocumentRouter() *DocumentRouter {
	basePath := "./mcp-documents"
	return f.CreateDocumentRouter(basePath, StrategyDefault)
}

// GetMigrationDocumentRouter 获取迁移模式的文档路由器
func (f *DocumentRouterFactory) GetMigrationDocumentRouter() *DocumentRouter {
	basePath := "./mcp-documents"
	return f.CreateDocumentRouter(basePath, StrategyMigration)
}

// ===== 全局工厂实例 =====

var globalRouterFactory *DocumentRouterFactory

// InitDocumentRouterFactory 初始化全局文档路由器工厂
func InitDocumentRouterFactory(db database.DB) {
	globalRouterFactory = NewDocumentRouterFactory(db)
}

// GetDocumentRouterFactory 获取全局文档路由器工厂
func GetDocumentRouterFactory() *DocumentRouterFactory {
	return globalRouterFactory
}

// CreateDefaultDocumentRouter 创建默认文档路由器（便捷方法）
func CreateDefaultDocumentRouter(db database.DB) *DocumentRouter {
	factory := NewDocumentRouterFactory(db)
	return factory.GetDefaultDocumentRouter()
}
