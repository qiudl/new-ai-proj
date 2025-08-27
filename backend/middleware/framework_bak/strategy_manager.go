package framework

import (
	"context"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"
)

// StrategyManager 策略管理器接口
type StrategyManager interface {
	RegisterStrategy(name string, strategy PermissionStrategy)
	GetStrategy(name string) PermissionStrategy
	CheckPermission(ctx context.Context, request *PermissionRequest) (*PermissionResponse, error)
	CheckBatchPermissions(ctx context.Context, requests []*PermissionRequest) ([]*PermissionResponse, error)
	GetAvailableStrategies() []string
}

// PermissionStrategy 权限策略接口
type PermissionStrategy interface {
	CheckPermission(ctx context.Context, request *PermissionRequest) (*PermissionResponse, error)
	CheckBatchPermissions(ctx context.Context, requests []*PermissionRequest) ([]*PermissionResponse, error)
	GetPriority() int
	GetName() string
	IsEnabled() bool
}

// strategyManager 策略管理器实现
type strategyManager struct {
	strategies map[string]PermissionStrategy
	config     *FrameworkConfig
	cache      *PermissionCacheManager
	predictor  *PermissionPredictor
	mu         sync.RWMutex
}

// NewStrategyManager 创建策略管理器
func NewStrategyManager(config *FrameworkConfig, cache *PermissionCacheManager, predictor *PermissionPredictor) StrategyManager {
	manager := &strategyManager{
		strategies: make(map[string]PermissionStrategy),
		config:     config,
		cache:      cache,
		predictor:  predictor,
	}
	
	// 注册默认策略
	manager.registerDefaultStrategies()
	
	return manager
}

// RegisterStrategy 注册权限策略
func (m *strategyManager) RegisterStrategy(name string, strategy PermissionStrategy) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.strategies[name] = strategy
	log.Printf("[STRATEGY_MANAGER] Registered strategy: %s", name)
}

// GetStrategy 获取权限策略
func (m *strategyManager) GetStrategy(name string) PermissionStrategy {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	return m.strategies[name]
}

// CheckPermission 执行权限检查
func (m *strategyManager) CheckPermission(ctx context.Context, request *PermissionRequest) (*PermissionResponse, error) {
	strategy := m.selectStrategy(request)
	if strategy == nil {
		return nil, fmt.Errorf("no suitable strategy found for request")
	}
	
	return strategy.CheckPermission(ctx, request)
}

// CheckBatchPermissions 批量权限检查
func (m *strategyManager) CheckBatchPermissions(ctx context.Context, requests []*PermissionRequest) ([]*PermissionResponse, error) {
	if len(requests) == 0 {
		return []*PermissionResponse{}, nil
	}
	
	// 根据第一个请求选择策略
	strategy := m.selectStrategy(requests[0])
	if strategy == nil {
		return nil, fmt.Errorf("no suitable strategy found for batch requests")
	}
	
	return strategy.CheckBatchPermissions(ctx, requests)
}

// GetAvailableStrategies 获取可用策略列表
func (m *strategyManager) GetAvailableStrategies() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	var strategies []string
	for name, strategy := range m.strategies {
		if strategy.IsEnabled() {
			strategies = append(strategies, name)
		}
	}
	
	// 按优先级排序
	sort.Slice(strategies, func(i, j int) bool {
		strategyI := m.strategies[strategies[i]]
		strategyJ := m.strategies[strategies[j]]
		return strategyI.GetPriority() > strategyJ.GetPriority()
	})
	
	return strategies
}

// selectStrategy 选择权限策略
func (m *strategyManager) selectStrategy(request *PermissionRequest) PermissionStrategy {
	// 如果请求指定了策略，尝试使用指定策略
	if request.Strategy != "" {
		if strategy := m.GetStrategy(request.Strategy); strategy != nil && strategy.IsEnabled() {
			return strategy
		}
		log.Printf("[STRATEGY_MANAGER] Requested strategy '%s' not found or disabled, falling back to auto selection", request.Strategy)
	}
	
	// 自动选择策略
	return m.autoSelectStrategy(request)
}

// autoSelectStrategy 自动选择最佳策略
func (m *strategyManager) autoSelectStrategy(request *PermissionRequest) PermissionStrategy {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	var candidates []PermissionStrategy
	
	// 收集可用的策略
	for _, strategy := range m.strategies {
		if strategy.IsEnabled() {
			candidates = append(candidates, strategy)
		}
	}
	
	if len(candidates) == 0 {
		return nil
	}
	
	// 按优先级排序
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].GetPriority() > candidates[j].GetPriority()
	})
	
	// 根据请求特征选择最佳策略
	for _, strategy := range candidates {
		if m.isStrategySuitable(strategy, request) {
			return strategy
		}
	}
	
	// 返回优先级最高的策略
	return candidates[0]
}

// isStrategySuitable 判断策略是否适合请求
func (m *strategyManager) isStrategySuitable(strategy PermissionStrategy, request *PermissionRequest) bool {
	strategyName := strategy.GetName()
	
	switch strategyName {
	case "cached":
		// 缓存策略适合频繁访问的权限
		return request.EnableCache && m.config.EnableCache
	
	case "predictive":
		// 预测策略适合有预测需求的权限
		return request.EnablePrediction && m.config.EnablePrediction
	
	case "composite":
		// 组合策略适合复杂场景
		return m.config.EnableCache || m.config.EnablePrediction
	
	case "basic":
		// 基础策略适合所有场景
		return true
	
	default:
		return true
	}
}

// registerDefaultStrategies 注册默认策略
func (m *strategyManager) registerDefaultStrategies() {
	// 注册基础策略
	basicStrategy := NewBasicStrategy(m.config)
	m.RegisterStrategy("basic", basicStrategy)
	
	// 注册缓存策略
	if m.config.EnableCache && m.cache != nil {
		cachedStrategy := NewCachedStrategy(m.config, m.cache)
		m.RegisterStrategy("cached", cachedStrategy)
	}
	
	// 注册预测策略
	if m.config.EnablePrediction && m.predictor != nil {
		predictiveStrategy := NewPredictiveStrategy(m.config, m.predictor)
		m.RegisterStrategy("predictive", predictiveStrategy)
	}
	
	// 注册组合策略
	if (m.config.EnableCache && m.cache != nil) || (m.config.EnablePrediction && m.predictor != nil) {
		compositeStrategy := NewCompositeStrategy(m.config, m.cache, m.predictor)
		m.RegisterStrategy("composite", compositeStrategy)
	}
	
	log.Printf("[STRATEGY_MANAGER] Registered %d default strategies", len(m.strategies))
}
