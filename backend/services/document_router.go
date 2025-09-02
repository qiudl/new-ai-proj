package services

import (
	"ai-project-backend/interfaces"
	"context"
	"fmt"
	"sync"
	"time"
)

// ServiceVersion 服务版本枚举
type ServiceVersion string

const (
	// ServiceV1 传统文件系统服务
	ServiceV1 ServiceVersion = "v1"
	// ServiceV2 统一文档服务
	ServiceV2 ServiceVersion = "v2"
	// ServiceDB 数据库文档服务
	ServiceDB ServiceVersion = "db"
)

// RoutingStrategy 路由策略
type RoutingStrategy string

const (
	// StrategyDefault 默认策略（主要使用V2，回退到V1）
	StrategyDefault RoutingStrategy = "default"
	// StrategyV1Only 仅使用V1服务
	StrategyV1Only RoutingStrategy = "v1_only"
	// StrategyV2Only 仅使用V2服务
	StrategyV2Only RoutingStrategy = "v2_only"
	// StrategyDBOnly 仅使用数据库服务
	StrategyDBOnly RoutingStrategy = "db_only"
	// StrategyLoadBalanced 负载均衡
	StrategyLoadBalanced RoutingStrategy = "load_balanced"
	// StrategyMigration 迁移模式（写入V2，读取时尝试V2再回退V1）
	StrategyMigration RoutingStrategy = "migration"
)

// ServiceStatus 服务状态
type ServiceStatus struct {
	Version      ServiceVersion `json:"version"`
	Available    bool           `json:"available"`
	LastCheck    time.Time      `json:"last_check"`
	ErrorCount   int            `json:"error_count"`
	ResponseTime time.Duration  `json:"response_time"`
}

// RoutingConfig 路由配置
type RoutingConfig struct {
	Strategy                RoutingStrategy `json:"strategy"`
	EnableHealthCheck       bool            `json:"enable_health_check"`
	HealthCheckInterval     time.Duration   `json:"health_check_interval"`
	MaxRetries              int             `json:"max_retries"`
	RetryDelay              time.Duration   `json:"retry_delay"`
	EnableCircuitBreaker    bool            `json:"enable_circuit_breaker"`
	CircuitBreakerThreshold int             `json:"circuit_breaker_threshold"`
	FallbackTimeout         time.Duration   `json:"fallback_timeout"`
}

// DocumentRouter 文档路由器
type DocumentRouter struct {
	// 服务实例
	services map[ServiceVersion]interfaces.DocumentServiceInterface

	// 配置和状态
	config   *RoutingConfig
	statuses map[ServiceVersion]*ServiceStatus

	// 并发控制
	mu sync.RWMutex

	// 统计信息
	stats *RouterStats

	// 健康检查
	healthTicker    *time.Ticker
	stopHealthCheck chan struct{}
}

// RouterStats 路由器统计信息
type RouterStats struct {
	TotalRequests   map[ServiceVersion]int64         `json:"total_requests"`
	SuccessRequests map[ServiceVersion]int64         `json:"success_requests"`
	FailedRequests  map[ServiceVersion]int64         `json:"failed_requests"`
	AverageLatency  map[ServiceVersion]time.Duration `json:"average_latency"`
	LastRequestTime map[ServiceVersion]time.Time     `json:"last_request_time"`
	mu              sync.RWMutex
}

// NewDocumentRouter 创建新的文档路由器
func NewDocumentRouter(config *RoutingConfig) *DocumentRouter {
	if config == nil {
		config = DefaultRoutingConfig()
	}

	router := &DocumentRouter{
		services: make(map[ServiceVersion]interfaces.DocumentServiceInterface),
		config:   config,
		statuses: make(map[ServiceVersion]*ServiceStatus),
		stats: &RouterStats{
			TotalRequests:   make(map[ServiceVersion]int64),
			SuccessRequests: make(map[ServiceVersion]int64),
			FailedRequests:  make(map[ServiceVersion]int64),
			AverageLatency:  make(map[ServiceVersion]time.Duration),
			LastRequestTime: make(map[ServiceVersion]time.Time),
		},
		stopHealthCheck: make(chan struct{}),
	}

	// 启动健康检查
	if config.EnableHealthCheck {
		router.startHealthCheck()
	}

	return router
}

// DefaultRoutingConfig 默认路由配置
func DefaultRoutingConfig() *RoutingConfig {
	return &RoutingConfig{
		Strategy:                StrategyDefault,
		EnableHealthCheck:       true,
		HealthCheckInterval:     30 * time.Second,
		MaxRetries:              3,
		RetryDelay:              100 * time.Millisecond,
		EnableCircuitBreaker:    true,
		CircuitBreakerThreshold: 5,
		FallbackTimeout:         5 * time.Second,
	}
}

// RegisterService 注册服务
func (r *DocumentRouter) RegisterService(version ServiceVersion, service interfaces.DocumentServiceInterface) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.services[version] = service
	r.statuses[version] = &ServiceStatus{
		Version:   version,
		Available: true,
		LastCheck: time.Now(),
	}
}

// UnregisterService 注销服务
func (r *DocumentRouter) UnregisterService(version ServiceVersion) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.services, version)
	delete(r.statuses, version)
}

// selectService 根据策略选择服务
func (r *DocumentRouter) selectService(operation string) (ServiceVersion, interfaces.DocumentServiceInterface, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	switch r.config.Strategy {
	case StrategyDefault:
		return r.selectDefaultService(operation)
	case StrategyV1Only:
		return r.selectSpecificService(ServiceV1)
	case StrategyV2Only:
		return r.selectSpecificService(ServiceV2)
	case StrategyDBOnly:
		return r.selectSpecificService(ServiceDB)
	case StrategyLoadBalanced:
		return r.selectLoadBalancedService(operation)
	case StrategyMigration:
		return r.selectMigrationService(operation)
	default:
		return r.selectDefaultService(operation)
	}
}

// selectDefaultService 默认服务选择策略
func (r *DocumentRouter) selectDefaultService(operation string) (ServiceVersion, interfaces.DocumentServiceInterface, error) {
	// 优先选择V2，如果不可用则回退到V1
	if status, exists := r.statuses[ServiceV2]; exists && status.Available {
		if service, ok := r.services[ServiceV2]; ok {
			return ServiceV2, service, nil
		}
	}

	// 回退到V1
	if status, exists := r.statuses[ServiceV1]; exists && status.Available {
		if service, ok := r.services[ServiceV1]; ok {
			return ServiceV1, service, nil
		}
	}

	// 最后尝试数据库服务
	if status, exists := r.statuses[ServiceDB]; exists && status.Available {
		if service, ok := r.services[ServiceDB]; ok {
			return ServiceDB, service, nil
		}
	}

	return "", nil, fmt.Errorf("no available service for operation: %s", operation)
}

// selectSpecificService 选择特定服务
func (r *DocumentRouter) selectSpecificService(version ServiceVersion) (ServiceVersion, interfaces.DocumentServiceInterface, error) {
	if status, exists := r.statuses[version]; exists && status.Available {
		if service, ok := r.services[version]; ok {
			return version, service, nil
		}
	}

	return "", nil, fmt.Errorf("service %s is not available", version)
}

// selectLoadBalancedService 负载均衡服务选择
func (r *DocumentRouter) selectLoadBalancedService(operation string) (ServiceVersion, interfaces.DocumentServiceInterface, error) {
	// 简单的轮询负载均衡
	availableServices := make([]ServiceVersion, 0)

	for version, status := range r.statuses {
		if status.Available {
			availableServices = append(availableServices, version)
		}
	}

	if len(availableServices) == 0 {
		return "", nil, fmt.Errorf("no available services for load balancing")
	}

	// 选择延迟最低的服务
	var bestVersion ServiceVersion
	var bestLatency time.Duration = time.Hour

	for _, version := range availableServices {
		if latency := r.stats.AverageLatency[version]; latency < bestLatency {
			bestLatency = latency
			bestVersion = version
		}
	}

	if bestVersion == "" {
		// 如果没有延迟数据，选择第一个可用的
		bestVersion = availableServices[0]
	}

	if service, ok := r.services[bestVersion]; ok {
		return bestVersion, service, nil
	}

	return "", nil, fmt.Errorf("selected service %s is not available", bestVersion)
}

// selectMigrationService 迁移模式服务选择
func (r *DocumentRouter) selectMigrationService(operation string) (ServiceVersion, interfaces.DocumentServiceInterface, error) {
	// 迁移模式：写操作使用V2，读操作先尝试V2再回退V1
	isWriteOperation := operation == "create" || operation == "update" || operation == "delete"

	if isWriteOperation {
		// 写操作优先使用V2
		if status, exists := r.statuses[ServiceV2]; exists && status.Available {
			if service, ok := r.services[ServiceV2]; ok {
				return ServiceV2, service, nil
			}
		}
		// 写操作回退到V1
		if status, exists := r.statuses[ServiceV1]; exists && status.Available {
			if service, ok := r.services[ServiceV1]; ok {
				return ServiceV1, service, nil
			}
		}
	} else {
		// 读操作先尝试V2
		if status, exists := r.statuses[ServiceV2]; exists && status.Available {
			if service, ok := r.services[ServiceV2]; ok {
				return ServiceV2, service, nil
			}
		}
		// 读操作回退到V1
		if status, exists := r.statuses[ServiceV1]; exists && status.Available {
			if service, ok := r.services[ServiceV1]; ok {
				return ServiceV1, service, nil
			}
		}
	}

	return "", nil, fmt.Errorf("no available service for migration mode operation: %s", operation)
}

// executeWithRetry 带重试的执行
func (r *DocumentRouter) executeWithRetry(ctx context.Context, operation string, fn func(interfaces.DocumentServiceInterface) error) error {
	var lastError error

	for retry := 0; retry <= r.config.MaxRetries; retry++ {
		version, service, err := r.selectService(operation)
		if err != nil {
			lastError = err
			continue
		}

		// 记录统计信息
		startTime := time.Now()
		r.recordRequest(version)

		// 执行操作
		err = fn(service)
		duration := time.Since(startTime)

		if err != nil {
			// 记录失败
			r.recordFailure(version, duration)
			r.markServiceUnhealthy(version, err)
			lastError = err

			// 如果不是最后一次重试，等待后重试
			if retry < r.config.MaxRetries {
				time.Sleep(r.config.RetryDelay)
				continue
			}
		} else {
			// 记录成功
			r.recordSuccess(version, duration)
			return nil
		}
	}

	return fmt.Errorf("operation failed after %d retries, last error: %w", r.config.MaxRetries, lastError)
}

// executeWithFallback 带回退的执行（用于读操作）
func (r *DocumentRouter) executeWithFallback(ctx context.Context, operation string, fn func(interfaces.DocumentServiceInterface) error) error {
	// 首先尝试主要服务
	if err := r.executeWithRetry(ctx, operation, fn); err == nil {
		return nil
	}

	// 如果是迁移模式且主要服务失败，尝试回退服务
	if r.config.Strategy == StrategyMigration || r.config.Strategy == StrategyDefault {
		// 对于读操作，尝试其他可用的服务
		r.mu.RLock()
		for version, status := range r.statuses {
			if !status.Available {
				continue
			}

			if service, ok := r.services[version]; ok {
				startTime := time.Now()
				r.recordRequest(version)

				if err := fn(service); err == nil {
					r.recordSuccess(version, time.Since(startTime))
					r.mu.RUnlock()
					return nil
				} else {
					r.recordFailure(version, time.Since(startTime))
				}
			}
		}
		r.mu.RUnlock()
	}

	return fmt.Errorf("operation failed on all available services: %s", operation)
} // ===== DocumentServiceInterface 实现 =====

// CreateDocument 创建文档（路由实现）
func (r *DocumentRouter) CreateDocument(ctx context.Context, req *interfaces.CreateDocumentRequest) error {
	return r.executeWithRetry(ctx, "create", func(service interfaces.DocumentServiceInterface) error {
		return service.CreateDocument(ctx, req)
	})
}

// ReadDocument 读取文档（路由实现）
func (r *DocumentRouter) ReadDocument(ctx context.Context, req *interfaces.ReadDocumentRequest) (*interfaces.DocumentResponse, error) {
	var result *interfaces.DocumentResponse
	var resultErr error

	err := r.executeWithFallback(ctx, "read", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.ReadDocument(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, resultErr
}

// UpdateDocument 更新文档（路由实现）
func (r *DocumentRouter) UpdateDocument(ctx context.Context, req *interfaces.UpdateDocumentRequest) error {
	return r.executeWithRetry(ctx, "update", func(service interfaces.DocumentServiceInterface) error {
		return service.UpdateDocument(ctx, req)
	})
}

// DeleteDocument 删除文档（路由实现）
func (r *DocumentRouter) DeleteDocument(ctx context.Context, req *interfaces.DeleteDocumentRequest) error {
	return r.executeWithRetry(ctx, "delete", func(service interfaces.DocumentServiceInterface) error {
		return service.DeleteDocument(ctx, req)
	})
}

// GetDocumentHistory 获取文档历史（路由实现）
func (r *DocumentRouter) GetDocumentHistory(ctx context.Context, req *interfaces.HistoryRequest) ([]interfaces.GitCommit, error) {
	var result []interfaces.GitCommit

	err := r.executeWithFallback(ctx, "history", func(service interfaces.DocumentServiceInterface) error {
		commits, err := service.GetDocumentHistory(ctx, req)
		if err != nil {
			return err
		}
		result = commits
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// ArchiveDocument 归档文档（路由实现）
func (r *DocumentRouter) ArchiveDocument(ctx context.Context, req *interfaces.ArchiveRequest) error {
	return r.executeWithRetry(ctx, "archive", func(service interfaces.DocumentServiceInterface) error {
		return service.ArchiveDocument(ctx, req)
	})
}

// MigrateDocument 迁移文档（路由实现）
func (r *DocumentRouter) MigrateDocument(ctx context.Context, req *interfaces.MigrateRequest) error {
	return r.executeWithRetry(ctx, "migrate", func(service interfaces.DocumentServiceInterface) error {
		return service.MigrateDocument(ctx, req)
	})
}

// CompareVersions 比较版本（路由实现）
func (r *DocumentRouter) CompareVersions(ctx context.Context, req *interfaces.CompareVersionsRequest) (*interfaces.VersionComparisonResponse, error) {
	var result *interfaces.VersionComparisonResponse

	err := r.executeWithFallback(ctx, "compare", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.CompareVersions(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// GetDocumentAtVersion 获取特定版本文档（路由实现）
func (r *DocumentRouter) GetDocumentAtVersion(ctx context.Context, req *interfaces.VersionRequest) (*interfaces.DocumentResponse, error) {
	var result *interfaces.DocumentResponse

	err := r.executeWithFallback(ctx, "version", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.GetDocumentAtVersion(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// ResolveConflict 解决冲突（路由实现）
func (r *DocumentRouter) ResolveConflict(ctx context.Context, req *interfaces.ConflictResolutionRequest) error {
	return r.executeWithRetry(ctx, "resolve", func(service interfaces.DocumentServiceInterface) error {
		return service.ResolveConflict(ctx, req)
	})
}

// SearchDocuments 搜索文档（路由实现）
func (r *DocumentRouter) SearchDocuments(ctx context.Context, req *interfaces.SearchRequest) (*interfaces.SearchResponse, error) {
	var result *interfaces.SearchResponse

	err := r.executeWithFallback(ctx, "search", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.SearchDocuments(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// IndexDocument 索引文档（路由实现）
func (r *DocumentRouter) IndexDocument(ctx context.Context, req *interfaces.IndexRequest) error {
	return r.executeWithRetry(ctx, "index", func(service interfaces.DocumentServiceInterface) error {
		return service.IndexDocument(ctx, req)
	})
}

// BatchCreateDocuments 批量创建文档（路由实现）
func (r *DocumentRouter) BatchCreateDocuments(ctx context.Context, req *interfaces.BatchCreateRequest) (*interfaces.BatchOperationResponse, error) {
	var result *interfaces.BatchOperationResponse

	err := r.executeWithRetry(ctx, "batch_create", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.BatchCreateDocuments(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// BatchUpdateDocuments 批量更新文档（路由实现）
func (r *DocumentRouter) BatchUpdateDocuments(ctx context.Context, req *interfaces.BatchUpdateRequest) (*interfaces.BatchOperationResponse, error) {
	var result *interfaces.BatchOperationResponse

	err := r.executeWithRetry(ctx, "batch_update", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.BatchUpdateDocuments(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// BatchDeleteDocuments 批量删除文档（路由实现）
func (r *DocumentRouter) BatchDeleteDocuments(ctx context.Context, req *interfaces.BatchDeleteRequest) (*interfaces.BatchOperationResponse, error) {
	var result *interfaces.BatchOperationResponse

	err := r.executeWithRetry(ctx, "batch_delete", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.BatchDeleteDocuments(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// ExportDocuments 导出文档（路由实现）
func (r *DocumentRouter) ExportDocuments(ctx context.Context, req *interfaces.ExportRequest) (*interfaces.ExportResponse, error) {
	var result *interfaces.ExportResponse

	err := r.executeWithFallback(ctx, "export", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.ExportDocuments(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// ImportDocuments 导入文档（路由实现）
func (r *DocumentRouter) ImportDocuments(ctx context.Context, req *interfaces.ImportRequest) (*interfaces.ImportResponse, error) {
	var result *interfaces.ImportResponse

	err := r.executeWithRetry(ctx, "import", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.ImportDocuments(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// LockDocument 锁定文档（路由实现）
func (r *DocumentRouter) LockDocument(ctx context.Context, req *interfaces.DocumentLockRequest) error {
	return r.executeWithRetry(ctx, "lock", func(service interfaces.DocumentServiceInterface) error {
		return service.LockDocument(ctx, req)
	})
}

// UnlockDocument 解锁文档（路由实现）
func (r *DocumentRouter) UnlockDocument(ctx context.Context, req *interfaces.DocumentLockRequest) error {
	return r.executeWithRetry(ctx, "unlock", func(service interfaces.DocumentServiceInterface) error {
		return service.UnlockDocument(ctx, req)
	})
}

// GetDocumentLockStatus 获取文档锁定状态（路由实现）
func (r *DocumentRouter) GetDocumentLockStatus(ctx context.Context, req *interfaces.LockStatusRequest) (*interfaces.LockStatusResponse, error) {
	var result *interfaces.LockStatusResponse

	err := r.executeWithFallback(ctx, "lock_status", func(service interfaces.DocumentServiceInterface) error {
		resp, err := service.GetDocumentLockStatus(ctx, req)
		if err != nil {
			return err
		}
		result = resp
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// HealthCheck 健康检查（路由实现）
func (r *DocumentRouter) HealthCheck(ctx context.Context) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	hasHealthyService := false

	for _, status := range r.statuses {
		if status.Available {
			hasHealthyService = true
			break
		}
	}

	if !hasHealthyService {
		return fmt.Errorf("no healthy services available")
	}

	return nil
} // ===== 管理和监控功能 =====

// GetServiceStatuses 获取所有服务状态
func (r *DocumentRouter) GetServiceStatuses() map[ServiceVersion]*ServiceStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	statuses := make(map[ServiceVersion]*ServiceStatus)
	for version, status := range r.statuses {
		// 深拷贝避免数据竞争
		statuses[version] = &ServiceStatus{
			Version:      status.Version,
			Available:    status.Available,
			LastCheck:    status.LastCheck,
			ErrorCount:   status.ErrorCount,
			ResponseTime: status.ResponseTime,
		}
	}

	return statuses
}

// GetRouterStats 获取路由器统计信息
func (r *DocumentRouter) GetRouterStats() *RouterStats {
	r.stats.mu.RLock()
	defer r.stats.mu.RUnlock()

	stats := &RouterStats{
		TotalRequests:   make(map[ServiceVersion]int64),
		SuccessRequests: make(map[ServiceVersion]int64),
		FailedRequests:  make(map[ServiceVersion]int64),
		AverageLatency:  make(map[ServiceVersion]time.Duration),
		LastRequestTime: make(map[ServiceVersion]time.Time),
	}

	// 深拷贝统计数据
	for version, count := range r.stats.TotalRequests {
		stats.TotalRequests[version] = count
	}
	for version, count := range r.stats.SuccessRequests {
		stats.SuccessRequests[version] = count
	}
	for version, count := range r.stats.FailedRequests {
		stats.FailedRequests[version] = count
	}
	for version, latency := range r.stats.AverageLatency {
		stats.AverageLatency[version] = latency
	}
	for version, t := range r.stats.LastRequestTime {
		stats.LastRequestTime[version] = t
	}

	return stats
}

// SetRoutingStrategy 设置路由策略
func (r *DocumentRouter) SetRoutingStrategy(strategy RoutingStrategy) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.config.Strategy = strategy
}

// GetRoutingStrategy 获取当前路由策略
func (r *DocumentRouter) GetRoutingStrategy() RoutingStrategy {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.config.Strategy
}

// EnableService 启用服务
func (r *DocumentRouter) EnableService(version ServiceVersion) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if status, exists := r.statuses[version]; exists {
		status.Available = true
		status.LastCheck = time.Now()
		status.ErrorCount = 0
		return nil
	}

	return fmt.Errorf("service %s not found", version)
}

// DisableService 禁用服务
func (r *DocumentRouter) DisableService(version ServiceVersion) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if status, exists := r.statuses[version]; exists {
		status.Available = false
		status.LastCheck = time.Now()
	}
}

// IsServiceAvailable 检查服务是否可用
func (r *DocumentRouter) IsServiceAvailable(version ServiceVersion) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if status, exists := r.statuses[version]; exists {
		return status.Available
	}

	return false
}

// ===== 内部方法 =====

// recordRequest 记录请求
func (r *DocumentRouter) recordRequest(version ServiceVersion) {
	r.stats.mu.Lock()
	defer r.stats.mu.Unlock()

	r.stats.TotalRequests[version]++
	r.stats.LastRequestTime[version] = time.Now()
}

// recordSuccess 记录成功请求
func (r *DocumentRouter) recordSuccess(version ServiceVersion, duration time.Duration) {
	r.stats.mu.Lock()
	defer r.stats.mu.Unlock()

	r.stats.SuccessRequests[version]++

	// 更新平均延迟（简单移动平均）
	currentLatency := r.stats.AverageLatency[version]
	successCount := r.stats.SuccessRequests[version]

	if successCount == 1 {
		r.stats.AverageLatency[version] = duration
	} else {
		// 加权平均：给最近的请求更高权重
		r.stats.AverageLatency[version] = (currentLatency*time.Duration(successCount-1) + duration) / time.Duration(successCount)
	}
}

// recordFailure 记录失败请求
func (r *DocumentRouter) recordFailure(version ServiceVersion, duration time.Duration) {
	r.stats.mu.Lock()
	defer r.stats.mu.Unlock()

	r.stats.FailedRequests[version]++
}

// markServiceUnhealthy 标记服务不健康
func (r *DocumentRouter) markServiceUnhealthy(version ServiceVersion, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if status, exists := r.statuses[version]; exists {
		status.ErrorCount++
		status.LastCheck = time.Now()

		// 如果错误次数超过阈值且启用了熔断器，则禁用服务
		if r.config.EnableCircuitBreaker && status.ErrorCount >= r.config.CircuitBreakerThreshold {
			status.Available = false
		}
	}
}

// startHealthCheck 启动健康检查
func (r *DocumentRouter) startHealthCheck() {
	r.healthTicker = time.NewTicker(r.config.HealthCheckInterval)

	go func() {
		for {
			select {
			case <-r.healthTicker.C:
				r.performHealthCheck()
			case <-r.stopHealthCheck:
				return
			}
		}
	}()
}

// performHealthCheck 执行健康检查
func (r *DocumentRouter) performHealthCheck() {
	r.mu.RLock()
	services := make(map[ServiceVersion]interfaces.DocumentServiceInterface)
	for version, service := range r.services {
		services[version] = service
	}
	r.mu.RUnlock()

	for version, service := range services {
		go r.checkServiceHealth(version, service)
	}
}

// checkServiceHealth 检查单个服务健康状态
func (r *DocumentRouter) checkServiceHealth(version ServiceVersion, service interfaces.DocumentServiceInterface) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	startTime := time.Now()
	err := service.HealthCheck(ctx)
	duration := time.Since(startTime)

	r.mu.Lock()
	defer r.mu.Unlock()

	if status, exists := r.statuses[version]; exists {
		status.LastCheck = time.Now()
		status.ResponseTime = duration

		if err != nil {
			status.ErrorCount++
			// 如果健康检查失败且启用了熔断器
			if r.config.EnableCircuitBreaker && status.ErrorCount >= r.config.CircuitBreakerThreshold {
				status.Available = false
			}
		} else {
			// 健康检查成功，重置错误计数并启用服务
			status.ErrorCount = 0
			status.Available = true
		}
	}
}

// Stop 停止路由器
func (r *DocumentRouter) Stop() {
	if r.healthTicker != nil {
		r.healthTicker.Stop()
	}

	close(r.stopHealthCheck)
}

// ===== 工厂方法 =====

// NewDocumentRouterWithServices 创建带服务的文档路由器
func NewDocumentRouterWithServices(
	config *RoutingConfig,
	v1Service interfaces.DocumentServiceInterface,
	v2Service interfaces.DocumentServiceInterface,
	dbService interfaces.DocumentServiceInterface,
) *DocumentRouter {
	router := NewDocumentRouter(config)

	if v1Service != nil {
		router.RegisterService(ServiceV1, v1Service)
	}
	if v2Service != nil {
		router.RegisterService(ServiceV2, v2Service)
	}
	if dbService != nil {
		router.RegisterService(ServiceDB, dbService)
	}

	return router
}

// ===== 辅助类型 =====

// RouterInfo 路由器信息
type RouterInfo struct {
	Strategy        RoutingStrategy                   `json:"strategy"`
	ServicesCount   int                               `json:"services_count"`
	HealthyServices int                               `json:"healthy_services"`
	ServiceStatuses map[ServiceVersion]*ServiceStatus `json:"service_statuses"`
	Stats           *RouterStats                      `json:"stats"`
	Configuration   *RoutingConfig                    `json:"configuration"`
}

// GetRouterInfo 获取路由器完整信息
func (r *DocumentRouter) GetRouterInfo() *RouterInfo {
	statuses := r.GetServiceStatuses()
	stats := r.GetRouterStats()

	healthyCount := 0
	for _, status := range statuses {
		if status.Available {
			healthyCount++
		}
	}

	r.mu.RLock()
	config := *r.config // 拷贝配置
	r.mu.RUnlock()

	return &RouterInfo{
		Strategy:        config.Strategy,
		ServicesCount:   len(statuses),
		HealthyServices: healthyCount,
		ServiceStatuses: statuses,
		Stats:           stats,
		Configuration:   &config,
	}
}

// Reset 重置统计信息
func (r *DocumentRouter) ResetStats() {
	r.stats.mu.Lock()
	defer r.stats.mu.Unlock()

	r.stats.TotalRequests = make(map[ServiceVersion]int64)
	r.stats.SuccessRequests = make(map[ServiceVersion]int64)
	r.stats.FailedRequests = make(map[ServiceVersion]int64)
	r.stats.AverageLatency = make(map[ServiceVersion]time.Duration)
	r.stats.LastRequestTime = make(map[ServiceVersion]time.Time)
}

// UpdateConfig 更新配置
func (r *DocumentRouter) UpdateConfig(newConfig *RoutingConfig) {
	r.mu.Lock()
	defer r.mu.Unlock()

	oldHealthCheck := r.config.EnableHealthCheck
	*r.config = *newConfig

	// 如果健康检查设置发生变化，重启健康检查
	if oldHealthCheck != newConfig.EnableHealthCheck {
		if r.healthTicker != nil {
			r.healthTicker.Stop()
		}

		if newConfig.EnableHealthCheck {
			r.startHealthCheck()
		}
	}
}
