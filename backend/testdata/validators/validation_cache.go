package main

import (
	"sync"
	"time"
)

// ValidationCache 验证缓存实现
type ValidationCache struct {
	cache       sync.Map
	maxSize     int
	defaultTTL  time.Duration
	currentSize int64
	stats       CacheStats
	mutex       sync.RWMutex
}

// CacheEntry 缓存条目
type CacheEntry struct {
	result    IValidationResult
	timestamp time.Time
	ttl       time.Duration
	hits      int64
}

// NewValidationCache 创建验证缓存
func NewValidationCache(maxSize int, defaultTTL time.Duration) *ValidationCache {
	return &ValidationCache{
		maxSize:    maxSize,
		defaultTTL: defaultTTL,
		stats: CacheStats{
			MaxSize: maxSize,
		},
	}
}

// Get 获取缓存值
func (c *ValidationCache) Get(key string) (IValidationResult, bool) {
	value, exists := c.cache.Load(key)
	if !exists {
		c.updateStats(false, false)
		return nil, false
	}

	entry := value.(*CacheEntry)

	// 检查TTL
	if time.Since(entry.timestamp) > entry.ttl {
		c.cache.Delete(key)
		c.decrementSize()
		c.updateStats(false, true)
		return nil, false
	}

	// 更新命中次数
	entry.hits++
	c.updateStats(true, false)

	return entry.result, true
}

// Set 设置缓存值
func (c *ValidationCache) Set(key string, result IValidationResult, ttl time.Duration) {
	if ttl <= 0 {
		ttl = c.defaultTTL
	}

	// 检查缓存大小限制
	if c.getCurrentSize() >= int64(c.maxSize) {
		c.evictOldest()
	}

	entry := &CacheEntry{
		result:    result,
		timestamp: time.Now(),
		ttl:       ttl,
		hits:      0,
	}

	c.cache.Store(key, entry)
	c.incrementSize()
}

// Delete 删除缓存值
func (c *ValidationCache) Delete(key string) {
	if _, exists := c.cache.LoadAndDelete(key); exists {
		c.decrementSize()
	}
}

// Clear 清空缓存
func (c *ValidationCache) Clear() {
	c.cache.Range(func(key, value interface{}) bool {
		c.cache.Delete(key)
		return true
	})
	c.resetSize()
}

// GetHitRate 获取命中率
func (c *ValidationCache) GetHitRate() float64 {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	total := c.stats.HitCount + c.stats.MissCount
	if total == 0 {
		return 0.0
	}

	return float64(c.stats.HitCount) / float64(total)
}

// GetStats 获取缓存统计信息
func (c *ValidationCache) GetStats() CacheStats {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	stats := c.stats
	stats.Size = int(c.currentSize)
	stats.HitRatio = c.GetHitRate()

	return stats
}

// SetMaxSize 设置最大大小
func (c *ValidationCache) SetMaxSize(size int) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.maxSize = size
	c.stats.MaxSize = size

	// 如果当前大小超过新的最大值，进行清理
	for c.getCurrentSize() > int64(size) {
		c.evictOldest()
	}
}

// GetMaxSize 获取最大大小
func (c *ValidationCache) GetMaxSize() int {
	return c.maxSize
}

// SetDefaultTTL 设置默认TTL
func (c *ValidationCache) SetDefaultTTL(ttl time.Duration) {
	c.defaultTTL = ttl
}

// GetDefaultTTL 获取默认TTL
func (c *ValidationCache) GetDefaultTTL() time.Duration {
	return c.defaultTTL
}

// getCurrentSize 获取当前大小
func (c *ValidationCache) getCurrentSize() int64 {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return c.currentSize
}

// incrementSize 增加大小计数
func (c *ValidationCache) incrementSize() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.currentSize++
}

// decrementSize 减少大小计数
func (c *ValidationCache) decrementSize() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	if c.currentSize > 0 {
		c.currentSize--
	}
}

// resetSize 重置大小计数
func (c *ValidationCache) resetSize() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.currentSize = 0
}

// updateStats 更新统计信息
func (c *ValidationCache) updateStats(isHit, isExpired bool) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	now := time.Now()

	if isHit {
		c.stats.HitCount++
		c.stats.LastHit = now
	} else {
		c.stats.MissCount++
		c.stats.LastMiss = now
	}

	if isExpired {
		c.stats.Evictions++
	}
}

// evictOldest 清理最旧的条目
func (c *ValidationCache) evictOldest() {
	var oldestKey interface{}
	var oldestTime time.Time
	var found bool

	// 遍历查找最旧的条目
	c.cache.Range(func(key, value interface{}) bool {
		entry := value.(*CacheEntry)
		if !found || entry.timestamp.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.timestamp
			found = true
		}
		return true
	})

	// 删除最旧的条目
	if found {
		c.cache.Delete(oldestKey)
		c.decrementSize()
		c.mutex.Lock()
		c.stats.Evictions++
		c.mutex.Unlock()
	}
}

// StartCleanupRoutine 启动清理协程
func (c *ValidationCache) StartCleanupRoutine() {
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			c.cleanupExpired()
		}
	}()
}

// cleanupExpired 清理过期条目
func (c *ValidationCache) cleanupExpired() {
	now := time.Now()
	var expiredKeys []interface{}

	// 收集过期的键
	c.cache.Range(func(key, value interface{}) bool {
		entry := value.(*CacheEntry)
		if now.Sub(entry.timestamp) > entry.ttl {
			expiredKeys = append(expiredKeys, key)
		}
		return true
	})

	// 删除过期的条目
	for _, key := range expiredKeys {
		c.cache.Delete(key)
		c.decrementSize()
	}

	// 更新统计信息
	if len(expiredKeys) > 0 {
		c.mutex.Lock()
		c.stats.Evictions += int64(len(expiredKeys))
		c.mutex.Unlock()
	}
}