package utils

import (
	"ai-project-backend/models"
	"context"
	"fmt"
	"sync"
	"time"
)

// CacheEntry represents a cached item with expiration
type CacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

// IsExpired checks if the cache entry has expired
func (c *CacheEntry) IsExpired() bool {
	return time.Now().After(c.ExpiresAt)
}

// TaskQueryCache provides in-memory caching for task queries
type TaskQueryCache struct {
	cache map[string]*CacheEntry
	mutex sync.RWMutex
	// Default TTL for cache entries
	DefaultTTL time.Duration
}

// NewTaskQueryCache creates a new task query cache
func NewTaskQueryCache(defaultTTL time.Duration) *TaskQueryCache {
	cache := &TaskQueryCache{
		cache:      make(map[string]*CacheEntry),
		DefaultTTL: defaultTTL,
	}

	// Start cleanup goroutine
	go cache.cleanupExpiredEntries()

	return cache
}

// Get retrieves an item from cache
func (c *TaskQueryCache) Get(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	entry, exists := c.cache[key]
	if !exists {
		return nil, false
	}

	if entry.IsExpired() {
		// Don't delete here to avoid write lock in read operation
		return nil, false
	}

	return entry.Data, true
}

// Set stores an item in cache with default TTL
func (c *TaskQueryCache) Set(key string, data interface{}) {
	c.SetWithTTL(key, data, c.DefaultTTL)
}

// SetWithTTL stores an item in cache with custom TTL
func (c *TaskQueryCache) SetWithTTL(key string, data interface{}, ttl time.Duration) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.cache[key] = &CacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// Delete removes an item from cache
func (c *TaskQueryCache) Delete(key string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	delete(c.cache, key)
}

// InvalidatePattern removes all cache entries matching a pattern
func (c *TaskQueryCache) InvalidatePattern(pattern string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	for key := range c.cache {
		if matchesPattern(key, pattern) {
			delete(c.cache, key)
		}
	}
}

// Clear removes all cache entries
func (c *TaskQueryCache) Clear() {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.cache = make(map[string]*CacheEntry)
}

// GetStats returns cache statistics
func (c *TaskQueryCache) GetStats() map[string]interface{} {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	totalEntries := len(c.cache)
	expiredEntries := 0

	for _, entry := range c.cache {
		if entry.IsExpired() {
			expiredEntries++
		}
	}

	return map[string]interface{}{
		"total_entries":   totalEntries,
		"active_entries":  totalEntries - expiredEntries,
		"expired_entries": expiredEntries,
	}
}

// cleanupExpiredEntries runs periodically to remove expired entries
func (c *TaskQueryCache) cleanupExpiredEntries() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mutex.Lock()
		for key, entry := range c.cache {
			if entry.IsExpired() {
				delete(c.cache, key)
			}
		}
		c.mutex.Unlock()
	}
}

// Helper function to match cache key patterns
func matchesPattern(key, pattern string) bool {
	// Simple pattern matching - starts with pattern
	if len(pattern) == 0 {
		return true
	}
	if len(key) < len(pattern) {
		return false
	}
	return key[:len(pattern)] == pattern
}

// TaskCacheKeys provides standardized cache key generation
type TaskCacheKeys struct{}

// GlobalTasksKey generates cache key for global tasks query
func (k *TaskCacheKeys) GlobalTasksKey(limit, offset int, filters string) string {
	return fmt.Sprintf("global_tasks:limit=%d:offset=%d:filters=%s", limit, offset, filters)
}

// ProjectTasksKey generates cache key for project tasks query
func (k *TaskCacheKeys) ProjectTasksKey(projectID, limit, offset int) string {
	return fmt.Sprintf("project_tasks:project=%d:limit=%d:offset=%d", projectID, limit, offset)
}

// TaskCountKey generates cache key for task count queries
func (k *TaskCacheKeys) TaskCountKey(projectID int, status string) string {
	if projectID == 0 {
		return fmt.Sprintf("task_count:global:status=%s", status)
	}
	return fmt.Sprintf("task_count:project=%d:status=%s", projectID, status)
}

// TaskHierarchyKey generates cache key for task hierarchy
func (k *TaskCacheKeys) TaskHierarchyKey(projectID int) string {
	return fmt.Sprintf("task_hierarchy:project=%d", projectID)
}

// TaskDetailKey generates cache key for individual task
func (k *TaskCacheKeys) TaskDetailKey(taskID int) string {
	return fmt.Sprintf("task_detail:id=%d", taskID)
}

// TaskRepositoryInterface defines the interface for task repository operations
type TaskRepositoryInterface interface {
	GetAll(ctx context.Context, limit, offset int) ([]*models.Task, int, error)
	GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error)
	GetByID(ctx context.Context, id int) (*models.Task, error)
	Create(ctx context.Context, task *models.Task) (*models.Task, error)
	Update(ctx context.Context, task *models.Task) (*models.Task, error)
	Delete(ctx context.Context, id int) error
}

// CacheableTaskRepository wraps TaskRepository with caching
type CacheableTaskRepository struct {
	repo  TaskRepositoryInterface
	cache *TaskQueryCache
	keys  *TaskCacheKeys
}

// NewCacheableTaskRepository creates a new cacheable task repository
func NewCacheableTaskRepository(repo TaskRepositoryInterface, cache *TaskQueryCache) *CacheableTaskRepository {
	return &CacheableTaskRepository{
		repo:  repo,
		cache: cache,
		keys:  &TaskCacheKeys{},
	}
}

// Cached version of GetAll with automatic cache management
func (r *CacheableTaskRepository) GetAllCached(ctx context.Context, limit, offset int, enableCache bool) ([]*models.Task, int, error) {
	if !enableCache {
		return r.repo.GetAll(ctx, limit, offset)
	}

	// Generate cache key
	cacheKey := r.keys.GlobalTasksKey(limit, offset, "")

	// Try to get from cache
	if cachedData, found := r.cache.Get(cacheKey); found {
		if result, ok := cachedData.(CachedTaskResult); ok {
			return result.Tasks, result.Total, nil
		}
	}

	// Fetch from database
	tasks, total, err := r.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	// Store in cache
	r.cache.Set(cacheKey, CachedTaskResult{
		Tasks: tasks,
		Total: total,
	})

	return tasks, total, nil
}

// CachedTaskResult represents cached task query result
type CachedTaskResult struct {
	Tasks []*models.Task `json:"tasks"`
	Total int            `json:"total"`
}

// InvalidateTaskCaches removes task-related cache entries
func (r *CacheableTaskRepository) InvalidateTaskCaches(taskID, projectID int) {
	// Invalidate global task caches
	r.cache.InvalidatePattern("global_tasks:")

	// Invalidate project-specific caches
	if projectID > 0 {
		r.cache.InvalidatePattern(fmt.Sprintf("project_tasks:project=%d:", projectID))
		r.cache.InvalidatePattern(fmt.Sprintf("task_hierarchy:project=%d", projectID))
	}

	// Invalidate specific task cache
	if taskID > 0 {
		r.cache.Delete(r.keys.TaskDetailKey(taskID))
	}

	// Invalidate count caches
	r.cache.InvalidatePattern("task_count:")
}

// Performance monitoring for cache
type CacheMetrics struct {
	Hits   int64 `json:"hits"`
	Misses int64 `json:"misses"`
	Sets   int64 `json:"sets"`
}

// Global cache metrics (in production, use proper metrics system)
var GlobalCacheMetrics = &CacheMetrics{}

// RecordCacheHit increments cache hit counter
func RecordCacheHit() {
	GlobalCacheMetrics.Hits++
}

// RecordCacheMiss increments cache miss counter
func RecordCacheMiss() {
	GlobalCacheMetrics.Misses++
}

// RecordCacheSet increments cache set counter
func RecordCacheSet() {
	GlobalCacheMetrics.Sets++
}

// GetCacheHitRatio returns cache hit ratio
func GetCacheHitRatio() float64 {
	total := GlobalCacheMetrics.Hits + GlobalCacheMetrics.Misses
	if total == 0 {
		return 0.0
	}
	return float64(GlobalCacheMetrics.Hits) / float64(total)
}
