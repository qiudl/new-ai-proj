package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisPermissionCache Redis权限缓存实现
type RedisPermissionCache struct {
	client *redis.Client
	ttl    time.Duration
}

// PermissionCacheResult 权限缓存结果
type PermissionCacheResult struct {
	HasPermission bool   `json:"has_permission"`
	Source        string `json:"source"`
	Reason        string `json:"reason"`
	CachedAt      int64  `json:"cached_at"`
}

// NewRedisPermissionCache 创建Redis权限缓存
func NewRedisPermissionCache(redisURL string, ttl time.Duration) (*RedisPermissionCache, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis URL: %w", err)
	}

	client := redis.NewClient(opt)
	
	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &RedisPermissionCache{
		client: client,
		ttl:    ttl,
	}, nil
}

// GetPermission 从缓存获取权限结果
func (r *RedisPermissionCache) GetPermission(ctx context.Context, userID int, permissionCode string) (*PermissionCacheResult, error) {
	key := r.buildPermissionKey(userID, permissionCode)
	
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // 缓存未命中
		}
		return nil, fmt.Errorf("failed to get permission from cache: %w", err)
	}

	var result PermissionCacheResult
	if err := json.Unmarshal([]byte(val), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal cached permission: %w", err)
	}

	return &result, nil
}

// SetPermission 设置权限结果到缓存
func (r *RedisPermissionCache) SetPermission(ctx context.Context, userID int, permissionCode string, hasPermission bool, source, reason string) error {
	key := r.buildPermissionKey(userID, permissionCode)
	
	result := PermissionCacheResult{
		HasPermission: hasPermission,
		Source:        source,
		Reason:        reason,
		CachedAt:      time.Now().Unix(),
	}

	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal permission result: %w", err)
	}

	if err := r.client.Set(ctx, key, string(data), r.ttl).Err(); err != nil {
		return fmt.Errorf("failed to set permission cache: %w", err)
	}

	return nil
}

// GetBatchPermissions 批量获取权限缓存
func (r *RedisPermissionCache) GetBatchPermissions(ctx context.Context, userID int, permissionCodes []string) (map[string]*PermissionCacheResult, error) {
	if len(permissionCodes) == 0 {
		return make(map[string]*PermissionCacheResult), nil
	}

	keys := make([]string, len(permissionCodes))
	for i, code := range permissionCodes {
		keys[i] = r.buildPermissionKey(userID, code)
	}

	vals, err := r.client.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to batch get permissions from cache: %w", err)
	}

	results := make(map[string]*PermissionCacheResult)
	for i, val := range vals {
		if val == nil {
			continue // 缓存未命中
		}

		var result PermissionCacheResult
		if err := json.Unmarshal([]byte(val.(string)), &result); err != nil {
			log.Printf("Failed to unmarshal cached permission for %s: %v", permissionCodes[i], err)
			continue
		}

		results[permissionCodes[i]] = &result
	}

	return results, nil
}

// SetBatchPermissions 批量设置权限缓存
func (r *RedisPermissionCache) SetBatchPermissions(ctx context.Context, userID int, permissions map[string]PermissionCacheResult) error {
	if len(permissions) == 0 {
		return nil
	}

	pipe := r.client.Pipeline()

	for permCode, result := range permissions {
		key := r.buildPermissionKey(userID, permCode)
		result.CachedAt = time.Now().Unix()
		
		data, err := json.Marshal(result)
		if err != nil {
			log.Printf("Failed to marshal permission result for %s: %v", permCode, err)
			continue
		}

		pipe.Set(ctx, key, string(data), r.ttl)
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to batch set permission cache: %w", err)
	}

	return nil
}

// InvalidateUserPermissions 清除用户的所有权限缓存
func (r *RedisPermissionCache) InvalidateUserPermissions(ctx context.Context, userID int) error {
	pattern := fmt.Sprintf("perm:%d:*", userID)
	
	keys, err := r.client.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get user permission keys: %w", err)
	}

	if len(keys) == 0 {
		return nil
	}

	if err := r.client.Del(ctx, keys...).Err(); err != nil {
		return fmt.Errorf("failed to delete user permission cache: %w", err)
	}

	return nil
}

// InvalidatePermissionCode 清除特定权限代码的所有缓存
func (r *RedisPermissionCache) InvalidatePermissionCode(ctx context.Context, permissionCode string) error {
	pattern := fmt.Sprintf("perm:*:%s", permissionCode)
	
	keys, err := r.client.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get permission code keys: %w", err)
	}

	if len(keys) == 0 {
		return nil
	}

	if err := r.client.Del(ctx, keys...).Err(); err != nil {
		return fmt.Errorf("failed to delete permission code cache: %w", err)
	}

	return nil
}

// GetCacheStats 获取缓存统计信息
func (r *RedisPermissionCache) GetCacheStats(ctx context.Context) (map[string]interface{}, error) {
	info, err := r.client.Info(ctx, "memory", "keyspace").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get redis info: %w", err)
	}

	// 获取权限缓存键的数量
	permKeyCount, err := r.client.Eval(ctx, `
		local count = 0
		for _, key in ipairs(redis.call('KEYS', 'perm:*')) do
			count = count + 1
		end
		return count
	`, nil).Result()
	if err != nil {
		log.Printf("Failed to get permission key count: %v", err)
		permKeyCount = 0
	}

	stats := map[string]interface{}{
		"redis_info":        info,
		"permission_keys":   permKeyCount,
		"cache_ttl_seconds": int(r.ttl.Seconds()),
	}

	return stats, nil
}

// Cleanup 清理过期的缓存键
func (r *RedisPermissionCache) Cleanup(ctx context.Context) error {
	// Redis会自动清理过期键，这里主要是统计信息
	expiredCount, err := r.client.Eval(ctx, `
		local expired = 0
		local keys = redis.call('KEYS', 'perm:*')
		for _, key in ipairs(keys) do
			if redis.call('TTL', key) == -1 then
				expired = expired + 1
			end
		end
		return expired
	`, nil).Result()
	
	if err != nil {
		return fmt.Errorf("failed to check expired keys: %w", err)
	}

	log.Printf("Permission cache cleanup check: %v keys without TTL found", expiredCount)
	return nil
}

// Close 关闭Redis连接
func (r *RedisPermissionCache) Close() error {
	return r.client.Close()
}

// buildPermissionKey 构建权限缓存键
func (r *RedisPermissionCache) buildPermissionKey(userID int, permissionCode string) string {
	return fmt.Sprintf("perm:%d:%s", userID, permissionCode)
}

// PermissionCacheMiddleware Redis缓存中间件
type PermissionCacheMiddleware struct {
	cache      *RedisPermissionCache
	enabled    bool
	defaultTTL time.Duration
}

// NewPermissionCacheMiddleware 创建权限缓存中间件
func NewPermissionCacheMiddleware(redisURL string, ttl time.Duration) (*PermissionCacheMiddleware, error) {
	cache, err := NewRedisPermissionCache(redisURL, ttl)
	if err != nil {
		return nil, err
	}

	return &PermissionCacheMiddleware{
		cache:      cache,
		enabled:    true,
		defaultTTL: ttl,
	}, nil
}

// CheckCachedPermission 检查缓存权限，未命中则执行回调函数
func (m *PermissionCacheMiddleware) CheckCachedPermission(
	ctx context.Context,
	userID int,
	permissionCode string,
	fallback func() (bool, string, string, error),
) (bool, string, string, error) {
	if !m.enabled {
		return fallback()
	}

	// 尝试从缓存获取
	cached, err := m.cache.GetPermission(ctx, userID, permissionCode)
	if err != nil {
		log.Printf("Cache get error for user %d permission %s: %v", userID, permissionCode, err)
		// 缓存出错，降级到直接查询
		return fallback()
	}

	if cached != nil {
		// 缓存命中
		return cached.HasPermission, cached.Source, cached.Reason, nil
	}

	// 缓存未命中，执行回调函数
	hasPermission, source, reason, err := fallback()
	if err != nil {
		return false, "", "", err
	}

	// 将结果缓存
	cacheErr := m.cache.SetPermission(ctx, userID, permissionCode, hasPermission, source, reason)
	if cacheErr != nil {
		log.Printf("Cache set error for user %d permission %s: %v", userID, permissionCode, cacheErr)
		// 缓存设置失败不影响结果返回
	}

	return hasPermission, source, reason, nil
}

// BatchCheckCachedPermissions 批量检查缓存权限
func (m *PermissionCacheMiddleware) BatchCheckCachedPermissions(
	ctx context.Context,
	userID int,
	permissionCodes []string,
	fallback func([]string) (map[string]PermissionCacheResult, error),
) (map[string]PermissionCacheResult, error) {
	if !m.enabled {
		return fallback(permissionCodes)
	}

	// 从缓存获取已存在的结果
	cachedResults, err := m.cache.GetBatchPermissions(ctx, userID, permissionCodes)
	if err != nil {
		log.Printf("Batch cache get error for user %d: %v", userID, err)
		// 缓存出错，降级到直接查询
		return fallback(permissionCodes)
	}

	// 找出未缓存的权限代码
	uncachedCodes := make([]string, 0)
	for _, code := range permissionCodes {
		if _, exists := cachedResults[code]; !exists {
			uncachedCodes = append(uncachedCodes, code)
		}
	}

	// 如果有未缓存的，调用回调函数查询
	if len(uncachedCodes) > 0 {
		uncachedResults, err := fallback(uncachedCodes)
		if err != nil {
			return nil, err
		}

		// 将新查询的结果缓存
		cacheErr := m.cache.SetBatchPermissions(ctx, userID, uncachedResults)
		if cacheErr != nil {
			log.Printf("Batch cache set error for user %d: %v", userID, cacheErr)
		}

		// 合并缓存和新查询的结果
		for code, result := range uncachedResults {
			cachedResults[code] = &result
		}
	}

	// 转换返回格式
	finalResults := make(map[string]PermissionCacheResult)
	for code, result := range cachedResults {
		if result != nil {
			finalResults[code] = *result
		}
	}

	return finalResults, nil
}

// InvalidateUser 清除用户权限缓存
func (m *PermissionCacheMiddleware) InvalidateUser(ctx context.Context, userID int) error {
	if !m.enabled {
		return nil
	}
	return m.cache.InvalidateUserPermissions(ctx, userID)
}

// InvalidatePermission 清除权限代码缓存
func (m *PermissionCacheMiddleware) InvalidatePermission(ctx context.Context, permissionCode string) error {
	if !m.enabled {
		return nil
	}
	return m.cache.InvalidatePermissionCode(ctx, permissionCode)
}

// GetStats 获取缓存统计
func (m *PermissionCacheMiddleware) GetStats(ctx context.Context) (map[string]interface{}, error) {
	if !m.enabled {
		return map[string]interface{}{"enabled": false}, nil
	}
	
	stats, err := m.cache.GetCacheStats(ctx)
	if err != nil {
		return nil, err
	}
	
	stats["enabled"] = true
	return stats, nil
}

// SetEnabled 启用或禁用缓存
func (m *PermissionCacheMiddleware) SetEnabled(enabled bool) {
	m.enabled = enabled
}

// Close 关闭缓存连接
func (m *PermissionCacheMiddleware) Close() error {
	if m.cache != nil {
		return m.cache.Close()
	}
	return nil
}
