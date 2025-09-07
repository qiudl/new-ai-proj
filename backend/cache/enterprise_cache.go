package cache

import (
	"ai-project-backend/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// EnterpriseCacheManager manages multi-level caching for enterprise data
type EnterpriseCacheManager struct {
	// Redis client for distributed caching
	redis *redis.Client
	
	// In-memory cache for frequently accessed data
	memory *MemoryCache
	
	// Configuration
	config *EnterpriseCacheConfig
	
	// Metrics
	metrics *CacheMetrics
	mutex   sync.RWMutex
}

// EnterpriseCacheConfig configures the enterprise cache system
type EnterpriseCacheConfig struct {
	// Redis configuration
	RedisEnabled bool
	RedisAddr    string
	RedisDB      int
	
	// Cache TTL settings (in minutes)
	EnterpriseTTL        int // 30 minutes
	EnterpriseUsersTTL   int // 15 minutes  
	DepartmentsTTL       int // 20 minutes
	PermissionsTTL       int // 10 minutes
	StatisticsTTL        int // 5 minutes
	
	// Memory cache settings
	MemoryCacheEnabled   bool
	MemoryCacheSize      int // Max items in memory
	MemoryCleanupInterval time.Duration
	
	// Performance settings
	EnableWriteThrough   bool // Write to cache immediately after DB write
	EnableReadThrough    bool // Read from DB if cache miss
	EnableAsyncRefresh   bool // Refresh cache asynchronously
}

// DefaultEnterpriseCacheConfig returns default configuration
func DefaultEnterpriseCacheConfig() *EnterpriseCacheConfig {
	return &EnterpriseCacheConfig{
		RedisEnabled:         true,
		EnterpriseTTL:        30,
		EnterpriseUsersTTL:   15,
		DepartmentsTTL:       20,
		PermissionsTTL:       10,
		StatisticsTTL:        5,
		MemoryCacheEnabled:   true,
		MemoryCacheSize:      1000,
		MemoryCleanupInterval: 5 * time.Minute,
		EnableWriteThrough:   true,
		EnableReadThrough:    true,
		EnableAsyncRefresh:   false,
	}
}

// MemoryCache provides in-memory caching with LRU eviction
type MemoryCache struct {
	items     map[string]*CacheItem
	usage     map[string]time.Time // Track last access time for LRU
	maxSize   int
	mutex     sync.RWMutex
	cleanupTicker *time.Ticker
}

// CacheItem represents a cached item with metadata
type CacheItem struct {
	Data      interface{} `json:"data"`
	ExpiresAt time.Time   `json:"expires_at"`
	CreatedAt time.Time   `json:"created_at"`
	AccessCount int       `json:"access_count"`
}

// CacheMetrics tracks cache performance
type CacheMetrics struct {
	RedisHits       int64 `json:"redis_hits"`
	RedisMisses     int64 `json:"redis_misses"`
	MemoryHits      int64 `json:"memory_hits"`
	MemoryMisses    int64 `json:"memory_misses"`
	WriteOperations int64 `json:"write_operations"`
	Evictions       int64 `json:"evictions"`
	LastUpdated     time.Time `json:"last_updated"`
}

// NewEnterpriseCacheManager creates a new enterprise cache manager
func NewEnterpriseCacheManager(config *EnterpriseCacheConfig) (*EnterpriseCacheManager, error) {
	manager := &EnterpriseCacheManager{
		config:  config,
		metrics: &CacheMetrics{LastUpdated: time.Now()},
	}
	
	// Initialize Redis if enabled
	if config.RedisEnabled {
		manager.redis = redis.NewClient(&redis.Options{
			Addr: config.RedisAddr,
			DB:   config.RedisDB,
		})
		
		// Test Redis connection
		ctx := context.Background()
		if err := manager.redis.Ping(ctx).Err(); err != nil {
			log.Printf("[ENTERPRISE_CACHE] Redis connection failed: %v", err)
			config.RedisEnabled = false
		}
	}
	
	// Initialize memory cache if enabled
	if config.MemoryCacheEnabled {
		manager.memory = &MemoryCache{
			items:   make(map[string]*CacheItem),
			usage:   make(map[string]time.Time),
			maxSize: config.MemoryCacheSize,
		}
		
		// Start cleanup routine
		manager.memory.cleanupTicker = time.NewTicker(config.MemoryCleanupInterval)
		go manager.memoryCleanupRoutine()
	}
	
	return manager, nil
}

// Enterprise Data Caching Methods

// GetEnterprise retrieves enterprise from cache
func (m *EnterpriseCacheManager) GetEnterprise(ctx context.Context, enterpriseID int) (*models.Enterprise, bool) {
	key := m.enterpriseKey(enterpriseID)
	
	// Try memory cache first
	if m.config.MemoryCacheEnabled {
		if data, found := m.getFromMemory(key); found {
			if enterprise, ok := data.(*models.Enterprise); ok {
				m.recordHit("memory")
				return enterprise, true
			}
		}
		m.recordMiss("memory")
	}
	
	// Try Redis cache
	if m.config.RedisEnabled {
		if data, found := m.getFromRedis(ctx, key); found {
			var enterprise models.Enterprise
			if err := json.Unmarshal(data, &enterprise); err == nil {
				// Store in memory cache for next time
				if m.config.MemoryCacheEnabled {
					m.setInMemory(key, &enterprise, time.Duration(m.config.EnterpriseTTL)*time.Minute)
				}
				m.recordHit("redis")
				return &enterprise, true
			}
		}
		m.recordMiss("redis")
	}
	
	return nil, false
}

// SetEnterprise stores enterprise in cache
func (m *EnterpriseCacheManager) SetEnterprise(ctx context.Context, enterprise *models.Enterprise) error {
	key := m.enterpriseKey(enterprise.ID)
	ttl := time.Duration(m.config.EnterpriseTTL) * time.Minute
	
	// Store in memory cache
	if m.config.MemoryCacheEnabled {
		m.setInMemory(key, enterprise, ttl)
	}
	
	// Store in Redis cache
	if m.config.RedisEnabled {
		data, err := json.Marshal(enterprise)
		if err != nil {
			return fmt.Errorf("failed to marshal enterprise: %w", err)
		}
		return m.setInRedis(ctx, key, data, ttl)
	}
	
	return nil
}

// GetEnterpriseUsers retrieves enterprise users from cache
func (m *EnterpriseCacheManager) GetEnterpriseUsers(ctx context.Context, enterpriseID int, limit, offset int) ([]*models.EnterpriseUser, bool) {
	key := m.enterpriseUsersKey(enterpriseID, limit, offset)
	
	// Try memory cache first
	if m.config.MemoryCacheEnabled {
		if data, found := m.getFromMemory(key); found {
			if users, ok := data.([]*models.EnterpriseUser); ok {
				m.recordHit("memory")
				return users, true
			}
		}
		m.recordMiss("memory")
	}
	
	// Try Redis cache
	if m.config.RedisEnabled {
		if data, found := m.getFromRedis(ctx, key); found {
			var users []*models.EnterpriseUser
			if err := json.Unmarshal(data, &users); err == nil {
				// Store in memory cache
				if m.config.MemoryCacheEnabled {
					m.setInMemory(key, users, time.Duration(m.config.EnterpriseUsersTTL)*time.Minute)
				}
				m.recordHit("redis")
				return users, true
			}
		}
		m.recordMiss("redis")
	}
	
	return nil, false
}

// SetEnterpriseUsers stores enterprise users in cache
func (m *EnterpriseCacheManager) SetEnterpriseUsers(ctx context.Context, enterpriseID int, limit, offset int, users []*models.EnterpriseUser) error {
	key := m.enterpriseUsersKey(enterpriseID, limit, offset)
	ttl := time.Duration(m.config.EnterpriseUsersTTL) * time.Minute
	
	// Store in memory cache
	if m.config.MemoryCacheEnabled {
		m.setInMemory(key, users, ttl)
	}
	
	// Store in Redis cache
	if m.config.RedisEnabled {
		data, err := json.Marshal(users)
		if err != nil {
			return fmt.Errorf("failed to marshal enterprise users: %w", err)
		}
		return m.setInRedis(ctx, key, data, ttl)
	}
	
	return nil
}

// GetEnterpriseStatistics retrieves enterprise statistics from cache
func (m *EnterpriseCacheManager) GetEnterpriseStatistics(ctx context.Context, enterpriseID int) (*EnterpriseStatistics, bool) {
	key := m.enterpriseStatsKey(enterpriseID)
	
	// Try memory cache first
	if m.config.MemoryCacheEnabled {
		if data, found := m.getFromMemory(key); found {
			if stats, ok := data.(*EnterpriseStatistics); ok {
				m.recordHit("memory")
				return stats, true
			}
		}
		m.recordMiss("memory")
	}
	
	// Try Redis cache
	if m.config.RedisEnabled {
		if data, found := m.getFromRedis(ctx, key); found {
			var stats EnterpriseStatistics
			if err := json.Unmarshal(data, &stats); err == nil {
				// Store in memory cache
				if m.config.MemoryCacheEnabled {
					m.setInMemory(key, &stats, time.Duration(m.config.StatisticsTTL)*time.Minute)
				}
				m.recordHit("redis")
				return &stats, true
			}
		}
		m.recordMiss("redis")
	}
	
	return nil, false
}

// SetEnterpriseStatistics stores enterprise statistics in cache
func (m *EnterpriseCacheManager) SetEnterpriseStatistics(ctx context.Context, enterpriseID int, stats *EnterpriseStatistics) error {
	key := m.enterpriseStatsKey(enterpriseID)
	ttl := time.Duration(m.config.StatisticsTTL) * time.Minute
	
	// Store in memory cache
	if m.config.MemoryCacheEnabled {
		m.setInMemory(key, stats, ttl)
	}
	
	// Store in Redis cache
	if m.config.RedisEnabled {
		data, err := json.Marshal(stats)
		if err != nil {
			return fmt.Errorf("failed to marshal enterprise statistics: %w", err)
		}
		return m.setInRedis(ctx, key, data, ttl)
	}
	
	return nil
}

// Cache Invalidation Methods

// InvalidateEnterprise removes enterprise from cache
func (m *EnterpriseCacheManager) InvalidateEnterprise(ctx context.Context, enterpriseID int) error {
	// Remove from memory cache
	if m.config.MemoryCacheEnabled {
		key := m.enterpriseKey(enterpriseID)
		m.deleteFromMemory(key)
	}
	
	// Remove from Redis cache
	if m.config.RedisEnabled {
		pattern := fmt.Sprintf("enterprise:%d:*", enterpriseID)
		return m.deleteFromRedis(ctx, pattern)
	}
	
	return nil
}

// InvalidateEnterpriseUsers removes enterprise users from cache
func (m *EnterpriseCacheManager) InvalidateEnterpriseUsers(ctx context.Context, enterpriseID int) error {
	// Remove from memory cache
	if m.config.MemoryCacheEnabled {
		pattern := fmt.Sprintf("enterprise_users:%d:", enterpriseID)
		m.deleteFromMemoryPattern(pattern)
	}
	
	// Remove from Redis cache
	if m.config.RedisEnabled {
		pattern := fmt.Sprintf("enterprise_users:%d:*", enterpriseID)
		return m.deleteFromRedis(ctx, pattern)
	}
	
	return nil
}

// InvalidateAll clears all enterprise cache data
func (m *EnterpriseCacheManager) InvalidateAll(ctx context.Context) error {
	// Clear memory cache
	if m.config.MemoryCacheEnabled {
		m.clearMemoryCache()
	}
	
	// Clear Redis cache
	if m.config.RedisEnabled {
		return m.clearRedisCache(ctx)
	}
	
	return nil
}

// EnterpriseStatistics represents cached statistics for an enterprise
type EnterpriseStatistics struct {
	UserCount       int `json:"user_count"`
	DepartmentCount int `json:"department_count"`
	ActiveUsers     int `json:"active_users"`
	ActiveDepartments int `json:"active_departments"`
	LastUpdated     time.Time `json:"last_updated"`
}

// Helper methods for cache key generation
func (m *EnterpriseCacheManager) enterpriseKey(enterpriseID int) string {
	return fmt.Sprintf("enterprise:%d", enterpriseID)
}

func (m *EnterpriseCacheManager) enterpriseUsersKey(enterpriseID, limit, offset int) string {
	return fmt.Sprintf("enterprise_users:%d:limit=%d:offset=%d", enterpriseID, limit, offset)
}

func (m *EnterpriseCacheManager) enterpriseStatsKey(enterpriseID int) string {
	return fmt.Sprintf("enterprise_stats:%d", enterpriseID)
}

func (m *EnterpriseCacheManager) enterpriseDepartmentsKey(enterpriseID int) string {
	return fmt.Sprintf("enterprise_departments:%d", enterpriseID)
}

// Memory cache operations
func (m *EnterpriseCacheManager) getFromMemory(key string) (interface{}, bool) {
	if m.memory == nil {
		return nil, false
	}
	
	m.memory.mutex.Lock()
	defer m.memory.mutex.Unlock()
	
	item, exists := m.memory.items[key]
	if !exists || item.ExpiresAt.Before(time.Now()) {
		return nil, false
	}
	
	// Update usage tracking for LRU
	m.memory.usage[key] = time.Now()
	item.AccessCount++
	
	return item.Data, true
}

func (m *EnterpriseCacheManager) setInMemory(key string, data interface{}, ttl time.Duration) {
	if m.memory == nil {
		return
	}
	
	m.memory.mutex.Lock()
	defer m.memory.mutex.Unlock()
	
	// Check if we need to evict items
	if len(m.memory.items) >= m.memory.maxSize {
		m.evictLRU()
	}
	
	m.memory.items[key] = &CacheItem{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
		CreatedAt: time.Now(),
		AccessCount: 1,
	}
	m.memory.usage[key] = time.Now()
}

func (m *EnterpriseCacheManager) deleteFromMemory(key string) {
	if m.memory == nil {
		return
	}
	
	m.memory.mutex.Lock()
	defer m.memory.mutex.Unlock()
	
	delete(m.memory.items, key)
	delete(m.memory.usage, key)
}

func (m *EnterpriseCacheManager) deleteFromMemoryPattern(pattern string) {
	if m.memory == nil {
		return
	}
	
	m.memory.mutex.Lock()
	defer m.memory.mutex.Unlock()
	
	for key := range m.memory.items {
		if matchesPattern(key, pattern) {
			delete(m.memory.items, key)
			delete(m.memory.usage, key)
		}
	}
}

func (m *EnterpriseCacheManager) clearMemoryCache() {
	if m.memory == nil {
		return
	}
	
	m.memory.mutex.Lock()
	defer m.memory.mutex.Unlock()
	
	m.memory.items = make(map[string]*CacheItem)
	m.memory.usage = make(map[string]time.Time)
}

// LRU eviction
func (m *EnterpriseCacheManager) evictLRU() {
	// Find least recently used item
	var oldestKey string
	var oldestTime time.Time = time.Now()
	
	for key, lastUsed := range m.memory.usage {
		if lastUsed.Before(oldestTime) {
			oldestTime = lastUsed
			oldestKey = key
		}
	}
	
	if oldestKey != "" {
		delete(m.memory.items, oldestKey)
		delete(m.memory.usage, oldestKey)
		m.metrics.Evictions++
	}
}

// Redis cache operations
func (m *EnterpriseCacheManager) getFromRedis(ctx context.Context, key string) ([]byte, bool) {
	if m.redis == nil {
		return nil, false
	}
	
	data, err := m.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, false
	}
	if err != nil {
		log.Printf("[ENTERPRISE_CACHE] Redis get error for key %s: %v", key, err)
		return nil, false
	}
	
	return []byte(data), true
}

func (m *EnterpriseCacheManager) setInRedis(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	if m.redis == nil {
		return nil
	}
	
	err := m.redis.Set(ctx, key, data, ttl).Err()
	if err != nil {
		log.Printf("[ENTERPRISE_CACHE] Redis set error for key %s: %v", key, err)
		return err
	}
	
	m.metrics.WriteOperations++
	return nil
}

func (m *EnterpriseCacheManager) deleteFromRedis(ctx context.Context, pattern string) error {
	if m.redis == nil {
		return nil
	}
	
	keys, err := m.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}
	
	if len(keys) > 0 {
		err = m.redis.Del(ctx, keys...).Err()
		if err != nil {
			return err
		}
		log.Printf("[ENTERPRISE_CACHE] Deleted %d Redis keys matching pattern: %s", len(keys), pattern)
	}
	
	return nil
}

func (m *EnterpriseCacheManager) clearRedisCache(ctx context.Context) error {
	if m.redis == nil {
		return nil
	}
	
	return m.redis.FlushDB(ctx).Err()
}

// Metrics and monitoring
func (m *EnterpriseCacheManager) recordHit(cacheType string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	switch cacheType {
	case "memory":
		m.metrics.MemoryHits++
	case "redis":
		m.metrics.RedisHits++
	}
	m.metrics.LastUpdated = time.Now()
}

func (m *EnterpriseCacheManager) recordMiss(cacheType string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	switch cacheType {
	case "memory":
		m.metrics.MemoryMisses++
	case "redis":
		m.metrics.RedisMisses++
	}
	m.metrics.LastUpdated = time.Now()
}

// GetMetrics returns current cache metrics
func (m *EnterpriseCacheManager) GetMetrics() *CacheMetrics {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	// Create a copy to avoid race conditions
	return &CacheMetrics{
		RedisHits:       m.metrics.RedisHits,
		RedisMisses:     m.metrics.RedisMisses,
		MemoryHits:      m.metrics.MemoryHits,
		MemoryMisses:    m.metrics.MemoryMisses,
		WriteOperations: m.metrics.WriteOperations,
		Evictions:       m.metrics.Evictions,
		LastUpdated:     m.metrics.LastUpdated,
	}
}

// GetHitRatio returns overall cache hit ratio
func (m *EnterpriseCacheManager) GetHitRatio() map[string]float64 {
	metrics := m.GetMetrics()
	
	memoryTotal := metrics.MemoryHits + metrics.MemoryMisses
	redisTotal := metrics.RedisHits + metrics.RedisMisses
	overallTotal := memoryTotal + redisTotal
	
	ratios := make(map[string]float64)
	
	if memoryTotal > 0 {
		ratios["memory"] = float64(metrics.MemoryHits) / float64(memoryTotal)
	}
	if redisTotal > 0 {
		ratios["redis"] = float64(metrics.RedisHits) / float64(redisTotal)
	}
	if overallTotal > 0 {
		ratios["overall"] = float64(metrics.MemoryHits+metrics.RedisHits) / float64(overallTotal)
	}
	
	return ratios
}

// Cleanup routine for memory cache
func (m *EnterpriseCacheManager) memoryCleanupRoutine() {
	for range m.memory.cleanupTicker.C {
		if m.memory == nil {
			return
		}
		
		m.memory.mutex.Lock()
		now := time.Now()
		for key, item := range m.memory.items {
			if item.ExpiresAt.Before(now) {
				delete(m.memory.items, key)
				delete(m.memory.usage, key)
			}
		}
		m.memory.mutex.Unlock()
	}
}

// Close shuts down the cache manager
func (m *EnterpriseCacheManager) Close() error {
	if m.memory != nil && m.memory.cleanupTicker != nil {
		m.memory.cleanupTicker.Stop()
	}
	
	if m.redis != nil {
		return m.redis.Close()
	}
	
	return nil
}

// Helper function for pattern matching (from existing cache.go)
func matchesPattern(key, pattern string) bool {
	if len(pattern) == 0 {
		return true
	}
	if len(key) < len(pattern) {
		return false
	}
	return key[:len(pattern)] == pattern
}