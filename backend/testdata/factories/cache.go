package factories

import (
	"crypto/md5"
	"fmt"
	"sync"
	"time"
)

// CacheItem 缓存项
type CacheItem struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	TTL       time.Duration `json:"ttl"`
	CreatedAt time.Time   `json:"created_at"`
	AccessedAt time.Time  `json:"accessed_at"`
	AccessCount uint64     `json:"access_count"`
}

// IsExpired 检查是否过期
func (item *CacheItem) IsExpired() bool {
	if item.TTL <= 0 {
		return false // 永不过期
	}
	return time.Since(item.CreatedAt) > item.TTL
}

// FactoryCache 工厂缓存实现
type FactoryCache struct {
	items       map[string]*CacheItem
	maxSize     int
	defaultTTL  time.Duration
	stats       CacheStats
	mutex       sync.RWMutex
	cleanupStop chan bool
}

// NewFactoryCache 创建工厂缓存
func NewFactoryCache(maxSize int, defaultTTL time.Duration) *FactoryCache {
	cache := &FactoryCache{
		items:       make(map[string]*CacheItem),
		maxSize:     maxSize,
		defaultTTL:  defaultTTL,
		stats:       CacheStats{MaxSize: maxSize, LastCleared: time.Now()},
		cleanupStop: make(chan bool, 1),
	}
	
	// 启动清理协程
	go cache.cleanupRoutine()
	
	return cache
}

// Get 获取缓存值
func (c *FactoryCache) Get(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	item, exists := c.items[key]
	if !exists {
		c.stats.MissCount++
		c.updateHitRate()
		return nil, false
	}
	
	// 检查是否过期
	if item.IsExpired() {
		c.mutex.RUnlock()
		c.mutex.Lock()
		delete(c.items, key)
		c.stats.Size = len(c.items)
		c.mutex.Unlock()
		c.mutex.RLock()
		
		c.stats.MissCount++
		c.updateHitRate()
		return nil, false
	}
	
	// 更新访问信息
	item.AccessedAt = time.Now()
	item.AccessCount++
	
	c.stats.HitCount++
	c.updateHitRate()
	
	return item.Value, true
}

// Set 设置缓存值
func (c *FactoryCache) Set(key string, value interface{}, ttl time.Duration) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	// 使用默认TTL
	if ttl <= 0 {
		ttl = c.defaultTTL
	}
	
	// 检查是否需要清理空间
	if len(c.items) >= c.maxSize {
		c.evictItems(1)
	}
	
	// 创建缓存项
	item := &CacheItem{
		Key:         key,
		Value:       value,
		TTL:         ttl,
		CreatedAt:   time.Now(),
		AccessedAt:  time.Now(),
		AccessCount: 0,
	}
	
	c.items[key] = item
	c.stats.Size = len(c.items)
}

// Delete 删除缓存项
func (c *FactoryCache) Delete(key string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	delete(c.items, key)
	c.stats.Size = len(c.items)
}

// Clear 清空缓存
func (c *FactoryCache) Clear() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.items = make(map[string]*CacheItem)
	c.stats.Size = 0
	c.stats.LastCleared = time.Now()
}

// Size 获取缓存大小
func (c *FactoryCache) Size() int {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	return len(c.items)
}

// Stats 获取缓存统计
func (c *FactoryCache) Stats() CacheStats {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	return c.stats
}

// evictItems 驱逐缓存项 (LRU策略)
func (c *FactoryCache) evictItems(count int) {
	if len(c.items) == 0 {
		return
	}
	
	// 找到最少使用的项
	var oldestItems []*CacheItem
	for _, item := range c.items {
		oldestItems = append(oldestItems, item)
	}
	
	// 按访问时间排序 (最旧的在前)
	for i := 0; i < len(oldestItems)-1; i++ {
		for j := i + 1; j < len(oldestItems); j++ {
			if oldestItems[i].AccessedAt.After(oldestItems[j].AccessedAt) {
				oldestItems[i], oldestItems[j] = oldestItems[j], oldestItems[i]
			}
		}
	}
	
	// 删除最旧的项
	evicted := 0
	for _, item := range oldestItems {
		if evicted >= count {
			break
		}
		delete(c.items, item.Key)
		evicted++
		c.stats.Evictions++
	}
	
	c.stats.Size = len(c.items)
}

// updateHitRate 更新命中率
func (c *FactoryCache) updateHitRate() {
	total := c.stats.HitCount + c.stats.MissCount
	if total > 0 {
		c.stats.HitRate = float64(c.stats.HitCount) / float64(total)
	}
}

// cleanupRoutine 清理协程
func (c *FactoryCache) cleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute) // 每5分钟清理一次
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			c.cleanupExpiredItems()
		case <-c.cleanupStop:
			return
		}
	}
}

// cleanupExpiredItems 清理过期项
func (c *FactoryCache) cleanupExpiredItems() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	expiredKeys := make([]string, 0)
	for key, item := range c.items {
		if item.IsExpired() {
			expiredKeys = append(expiredKeys, key)
		}
	}
	
	for _, key := range expiredKeys {
		delete(c.items, key)
		c.stats.Evictions++
	}
	
	c.stats.Size = len(c.items)
}

// Stop 停止缓存
func (c *FactoryCache) Stop() {
	select {
	case c.cleanupStop <- true:
	default:
	}
}

// GenerateKey 生成缓存键
func GenerateKey(prefix string, params ...interface{}) string {
	data := fmt.Sprintf("%s:%v", prefix, params)
	hash := md5.Sum([]byte(data))
	return fmt.Sprintf("%x", hash)
}

// CacheKeyBuilder 缓存键构建器
type CacheKeyBuilder struct {
	prefix string
	parts  []string
}

// NewCacheKeyBuilder 创建缓存键构建器
func NewCacheKeyBuilder(prefix string) *CacheKeyBuilder {
	return &CacheKeyBuilder{
		prefix: prefix,
		parts:  make([]string, 0),
	}
}

// Add 添加键部分
func (b *CacheKeyBuilder) Add(part string) *CacheKeyBuilder {
	b.parts = append(b.parts, part)
	return b
}

// AddInt 添加整数部分
func (b *CacheKeyBuilder) AddInt(value int) *CacheKeyBuilder {
	return b.Add(fmt.Sprintf("%d", value))
}

// AddInt64 添加整数部分
func (b *CacheKeyBuilder) AddInt64(value int64) *CacheKeyBuilder {
	return b.Add(fmt.Sprintf("%d", value))
}

// Build 构建键
func (b *CacheKeyBuilder) Build() string {
	if len(b.parts) == 0 {
		return b.prefix
	}
	
	key := b.prefix
	for _, part := range b.parts {
		key += ":" + part
	}
	
	return key
}

// BuildHash 构建哈希键
func (b *CacheKeyBuilder) BuildHash() string {
	key := b.Build()
	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("%x", hash)
}

// MultiLevelCache 多级缓存
type MultiLevelCache struct {
	levels []IFactoryCache
	stats  map[int]CacheStats
	mutex  sync.RWMutex
}

// NewMultiLevelCache 创建多级缓存
func NewMultiLevelCache(levels []IFactoryCache) *MultiLevelCache {
	return &MultiLevelCache{
		levels: levels,
		stats:  make(map[int]CacheStats),
	}
}

// Get 获取值
func (mc *MultiLevelCache) Get(key string) (interface{}, bool) {
	for i, cache := range mc.levels {
		if value, found := cache.Get(key); found {
			// 将值向上传播到更高级别的缓存
			mc.promoteToHigherLevels(key, value, i)
			return value, true
		}
	}
	return nil, false
}

// Set 设置值
func (mc *MultiLevelCache) Set(key string, value interface{}, ttl time.Duration) {
	// 设置到所有级别
	for _, cache := range mc.levels {
		cache.Set(key, value, ttl)
	}
}

// promoteToHigherLevels 向上传播值
func (mc *MultiLevelCache) promoteToHigherLevels(key string, value interface{}, foundLevel int) {
	for i := 0; i < foundLevel; i++ {
		mc.levels[i].Set(key, value, 0) // 使用默认TTL
	}
}

// Delete 删除值
func (mc *MultiLevelCache) Delete(key string) {
	for _, cache := range mc.levels {
		cache.Delete(key)
	}
}

// Clear 清空所有级别
func (mc *MultiLevelCache) Clear() {
	for _, cache := range mc.levels {
		cache.Clear()
	}
}

// Size 获取总大小
func (mc *MultiLevelCache) Size() int {
	totalSize := 0
	for _, cache := range mc.levels {
		totalSize += cache.Size()
	}
	return totalSize
}

// Stats 获取统计信息
func (mc *MultiLevelCache) Stats() CacheStats {
	mc.mutex.RLock()
	defer mc.mutex.RUnlock()
	
	// 合并所有级别的统计
	var totalStats CacheStats
	for _, cache := range mc.levels {
		stats := cache.Stats()
		totalStats.HitCount += stats.HitCount
		totalStats.MissCount += stats.MissCount
		totalStats.Size += stats.Size
		totalStats.MaxSize += stats.MaxSize
		totalStats.Evictions += stats.Evictions
	}
	
	// 计算总命中率
	total := totalStats.HitCount + totalStats.MissCount
	if total > 0 {
		totalStats.HitRate = float64(totalStats.HitCount) / float64(total)
	}
	
	return totalStats
}