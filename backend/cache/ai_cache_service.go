package cache

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
)

// AICacheService provides Redis-based caching for AI generation results
type AICacheService struct {
	client         *redis.Client
	defaultTTL     time.Duration
	enableCache    bool
	cacheHits      int64
	cacheMisses    int64
}

// AICacheConfig configures the AI cache service
type AICacheConfig struct {
	RedisClient *redis.Client
	DefaultTTL  time.Duration
	EnableCache bool
}

// NewAICacheService creates a new AI cache service
func NewAICacheService(config *AICacheConfig) *AICacheService {
	if config.DefaultTTL == 0 {
		config.DefaultTTL = 1 * time.Hour // Default 1 hour TTL
	}

	return &AICacheService{
		client:      config.RedisClient,
		defaultTTL:  config.DefaultTTL,
		enableCache: config.EnableCache,
	}
}

// DescriptionCacheKey generates a cache key for AI description generation
type DescriptionCacheKey struct {
	TaskID         int
	Model          string
	Style          string
	Length         string
	IncludeContext bool
	CustomPrompt   string
}

// GenerateKey generates a unique cache key with hash
func (k *DescriptionCacheKey) GenerateKey() string {
	// Create hash from options for shorter key
	hash := md5.New()
	data := fmt.Sprintf("%d:%s:%s:%s:%t:%s",
		k.TaskID, k.Model, k.Style, k.Length, k.IncludeContext, k.CustomPrompt)
	hash.Write([]byte(data))
	optionsHash := hex.EncodeToString(hash.Sum(nil))[:12]

	return fmt.Sprintf("ai:desc:%d:%s:%s", k.TaskID, k.Model, optionsHash)
}

// DocumentCacheKey generates a cache key for AI document generation
type DocumentCacheKey struct {
	TaskID       int
	Model        string
	DocumentType string
	CustomPrompt string
}

// GenerateKey generates a unique cache key with hash
func (k *DocumentCacheKey) GenerateKey() string {
	hash := md5.New()
	data := fmt.Sprintf("%d:%s:%s:%s",
		k.TaskID, k.Model, k.DocumentType, k.CustomPrompt)
	hash.Write([]byte(data))
	optionsHash := hex.EncodeToString(hash.Sum(nil))[:12]

	return fmt.Sprintf("ai:doc:%d:%s:%s", k.TaskID, k.Model, optionsHash)
}

// CachedDescriptionResult represents cached description result
type CachedDescriptionResult struct {
	TaskID        int       `json:"task_id"`
	GeneratedDesc string    `json:"generated_desc"`
	Model         string    `json:"model"`
	CachedAt      time.Time `json:"cached_at"`
}

// CachedDocumentResult represents cached document result
type CachedDocumentResult struct {
	TaskID   int       `json:"task_id"`
	Title    string    `json:"title"`
	Content  string    `json:"content"`
	Model    string    `json:"model"`
	CachedAt time.Time `json:"cached_at"`
}

// GetDescription retrieves cached AI description
func (s *AICacheService) GetDescription(ctx context.Context, key *DescriptionCacheKey) (*CachedDescriptionResult, bool) {
	if !s.enableCache {
		return nil, false
	}

	cacheKey := key.GenerateKey()

	// Get from Redis
	data, err := s.client.Get(ctx, cacheKey).Bytes()
	if err == redis.Nil {
		s.cacheMisses++
		log.Printf("[AI_CACHE] Cache miss for description: %s", cacheKey)
		return nil, false
	}
	if err != nil {
		log.Printf("[AI_CACHE] Redis error getting description: %v", err)
		return nil, false
	}

	// Deserialize
	var result CachedDescriptionResult
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[AI_CACHE] Failed to unmarshal description: %v", err)
		return nil, false
	}

	s.cacheHits++
	log.Printf("[AI_CACHE] Cache hit for description: %s (cached %v ago)",
		cacheKey, time.Since(result.CachedAt).Round(time.Second))

	return &result, true
}

// SetDescription stores AI description in cache
func (s *AICacheService) SetDescription(ctx context.Context, key *DescriptionCacheKey, desc string, ttl time.Duration) error {
	if !s.enableCache {
		return nil
	}

	cacheKey := key.GenerateKey()

	result := &CachedDescriptionResult{
		TaskID:        key.TaskID,
		GeneratedDesc: desc,
		Model:         key.Model,
		CachedAt:      time.Now(),
	}

	// Serialize
	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal description: %w", err)
	}

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = s.defaultTTL
	}

	// Store in Redis
	if err := s.client.Set(ctx, cacheKey, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to cache description: %w", err)
	}

	log.Printf("[AI_CACHE] Cached description: %s (TTL: %v)", cacheKey, ttl)
	return nil
}

// GetDocument retrieves cached AI document
func (s *AICacheService) GetDocument(ctx context.Context, key *DocumentCacheKey) (*CachedDocumentResult, bool) {
	if !s.enableCache {
		return nil, false
	}

	cacheKey := key.GenerateKey()

	// Get from Redis
	data, err := s.client.Get(ctx, cacheKey).Bytes()
	if err == redis.Nil {
		s.cacheMisses++
		log.Printf("[AI_CACHE] Cache miss for document: %s", cacheKey)
		return nil, false
	}
	if err != nil {
		log.Printf("[AI_CACHE] Redis error getting document: %v", err)
		return nil, false
	}

	// Deserialize
	var result CachedDocumentResult
	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("[AI_CACHE] Failed to unmarshal document: %v", err)
		return nil, false
	}

	s.cacheHits++
	log.Printf("[AI_CACHE] Cache hit for document: %s (cached %v ago)",
		cacheKey, time.Since(result.CachedAt).Round(time.Second))

	return &result, true
}

// SetDocument stores AI document in cache
func (s *AICacheService) SetDocument(ctx context.Context, key *DocumentCacheKey, title, content string, ttl time.Duration) error {
	if !s.enableCache {
		return nil
	}

	cacheKey := key.GenerateKey()

	result := &CachedDocumentResult{
		TaskID:   key.TaskID,
		Title:    title,
		Content:  content,
		Model:    key.Model,
		CachedAt: time.Now(),
	}

	// Serialize
	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal document: %w", err)
	}

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = s.defaultTTL
	}

	// Store in Redis
	if err := s.client.Set(ctx, cacheKey, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to cache document: %w", err)
	}

	log.Printf("[AI_CACHE] Cached document: %s (TTL: %v)", cacheKey, ttl)
	return nil
}

// InvalidateTaskDescriptions invalidates all description caches for a task
func (s *AICacheService) InvalidateTaskDescriptions(ctx context.Context, taskID int) error {
	if !s.enableCache {
		return nil
	}

	pattern := fmt.Sprintf("ai:desc:%d:*", taskID)
	return s.invalidateByPattern(ctx, pattern)
}

// InvalidateTaskDocuments invalidates all document caches for a task
func (s *AICacheService) InvalidateTaskDocuments(ctx context.Context, taskID int) error {
	if !s.enableCache {
		return nil
	}

	pattern := fmt.Sprintf("ai:doc:%d:*", taskID)
	return s.invalidateByPattern(ctx, pattern)
}

// InvalidateAllTaskCache invalidates all AI caches for a task
func (s *AICacheService) InvalidateAllTaskCache(ctx context.Context, taskID int) error {
	if !s.enableCache {
		return nil
	}

	if err := s.InvalidateTaskDescriptions(ctx, taskID); err != nil {
		log.Printf("[AI_CACHE] Failed to invalidate task descriptions %d: %v", taskID, err)
	}

	if err := s.InvalidateTaskDocuments(ctx, taskID); err != nil {
		log.Printf("[AI_CACHE] Failed to invalidate task documents %d: %v", taskID, err)
	}

	log.Printf("[AI_CACHE] Invalidated all AI caches for task %d", taskID)
	return nil
}

// invalidateByPattern deletes keys matching a pattern
func (s *AICacheService) invalidateByPattern(ctx context.Context, pattern string) error {
	iter := s.client.Scan(ctx, 0, pattern, 100).Iterator()
	deleted := 0

	for iter.Next(ctx) {
		key := iter.Val()
		if err := s.client.Del(ctx, key).Err(); err != nil {
			log.Printf("[AI_CACHE] Failed to delete key %s: %v", key, err)
		} else {
			deleted++
		}
	}

	if err := iter.Err(); err != nil {
		return fmt.Errorf("scan error: %w", err)
	}

	log.Printf("[AI_CACHE] Invalidated %d keys matching pattern: %s", deleted, pattern)
	return nil
}

// GetStats returns cache statistics
func (s *AICacheService) GetStats() map[string]interface{} {
	total := s.cacheHits + s.cacheMisses
	hitRatio := 0.0
	if total > 0 {
		hitRatio = float64(s.cacheHits) / float64(total)
	}

	return map[string]interface{}{
		"enabled":      s.enableCache,
		"hits":         s.cacheHits,
		"misses":       s.cacheMisses,
		"total":        total,
		"hit_ratio":    hitRatio,
		"default_ttl":  s.defaultTTL.String(),
	}
}

// ResetStats resets cache statistics
func (s *AICacheService) ResetStats() {
	s.cacheHits = 0
	s.cacheMisses = 0
	log.Println("[AI_CACHE] Statistics reset")
}

// WarmUpCache pre-loads frequently accessed AI results
func (s *AICacheService) WarmUpCache(ctx context.Context, taskIDs []int, model string) error {
	if !s.enableCache {
		return nil
	}

	log.Printf("[AI_CACHE] Warming up cache for %d tasks", len(taskIDs))

	// This is a placeholder - actual warm-up would require fetching from DB
	// or regenerating common queries
	// Implementation would depend on specific business requirements

	return nil
}

// FlushAllAICache clears all AI-related caches (use with caution!)
func (s *AICacheService) FlushAllAICache(ctx context.Context) error {
	if !s.enableCache {
		return nil
	}

	// Delete all ai:desc:* and ai:doc:* keys
	descPattern := "ai:desc:*"
	docPattern := "ai:doc:*"

	if err := s.invalidateByPattern(ctx, descPattern); err != nil {
		return fmt.Errorf("failed to flush description cache: %w", err)
	}

	if err := s.invalidateByPattern(ctx, docPattern); err != nil {
		return fmt.Errorf("failed to flush document cache: %w", err)
	}

	log.Println("[AI_CACHE] Flushed all AI caches")
	return nil
}

// HealthCheck verifies Redis connection
func (s *AICacheService) HealthCheck(ctx context.Context) error {
	if !s.enableCache {
		return fmt.Errorf("cache is disabled")
	}

	if err := s.client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis ping failed: %w", err)
	}

	return nil
}
