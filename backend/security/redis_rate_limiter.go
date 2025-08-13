package security

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisRateLimiter implements sliding window rate limiting using Redis
type RedisRateLimiter struct {
	client       *redis.Client
	defaultLimit int
	defaultWindow time.Duration
}

// NewRedisRateLimiter creates a new Redis-based rate limiter
func NewRedisRateLimiter(client *redis.Client, defaultLimit int, defaultWindow time.Duration) *RedisRateLimiter {
	return &RedisRateLimiter{
		client:        client,
		defaultLimit:  defaultLimit,
		defaultWindow: defaultWindow,
	}
}

// RateLimitResult contains the result of a rate limit check
type RateLimitResult struct {
	Allowed        bool          `json:"allowed"`
	CurrentCount   int           `json:"current_count"`
	Limit          int           `json:"limit"`
	RemainingCount int           `json:"remaining_count"`
	ResetTime      time.Time     `json:"reset_time"`
	RetryAfter     time.Duration `json:"retry_after"`
	Window         RateLimitWindow `json:"window"`
}

// RateLimitWindow defines different time windows for rate limiting
type RateLimitWindow string

const (
	WindowPerSecond RateLimitWindow = "per_second"
	WindowPerMinute RateLimitWindow = "per_minute"
	WindowPerHour   RateLimitWindow = "per_hour"
	WindowPerDay    RateLimitWindow = "per_day"
)

// CheckRateLimitByAPIKey checks rate limit for a specific API key using sliding window algorithm
func (r *RedisRateLimiter) CheckRateLimitByAPIKey(apiKeyID int64, limit int, window RateLimitWindow) RateLimitResult {
	ctx := context.Background()
	key := fmt.Sprintf("rate_limit:api_key:%d", apiKeyID)
	
	if limit == 0 {
		limit = r.defaultLimit
	}
	
	windowDuration := r.getWindowDuration(window)
	return r.slidingWindowRateLimit(ctx, key, limit, windowDuration, window)
}

// CheckRateLimitByIP checks rate limit for a specific IP address
func (r *RedisRateLimiter) CheckRateLimitByIP(ipAddress string, limit int, window RateLimitWindow) RateLimitResult {
	ctx := context.Background()
	key := fmt.Sprintf("rate_limit:ip:%s", ipAddress)
	
	if limit == 0 {
		limit = r.defaultLimit
	}
	
	windowDuration := r.getWindowDuration(window)
	return r.slidingWindowRateLimit(ctx, key, limit, windowDuration, window)
}

// CheckRateLimitByUser checks rate limit for a specific user
func (r *RedisRateLimiter) CheckRateLimitByUser(userID int, limit int, window RateLimitWindow) RateLimitResult {
	ctx := context.Background()
	key := fmt.Sprintf("rate_limit:user:%d", userID)
	
	if limit == 0 {
		limit = r.defaultLimit
	}
	
	windowDuration := r.getWindowDuration(window)
	return r.slidingWindowRateLimit(ctx, key, limit, windowDuration, window)
}

// slidingWindowRateLimit implements the sliding window rate limiting algorithm using Redis
func (r *RedisRateLimiter) slidingWindowRateLimit(ctx context.Context, key string, limit int, window time.Duration, windowType RateLimitWindow) RateLimitResult {
	now := time.Now()
	windowStart := now.Add(-window)
	
	// Use Redis pipeline for atomic operations
	pipe := r.client.TxPipeline()
	
	// Remove expired entries (older than window)
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart.UnixNano(), 10))
	
	// Count current requests in window
	countCmd := pipe.ZCard(ctx, key)
	
	// Add current request
	pipe.ZAdd(ctx, key, &redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d:%d", now.UnixNano(), r.generateNonce()),
	})
	
	// Set expiry for the key
	pipe.Expire(ctx, key, window+time.Minute) // Extra minute to handle clock skew
	
	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		// On Redis error, allow the request but log the error
		return RateLimitResult{
			Allowed:        true,
			CurrentCount:   0,
			Limit:          limit,
			RemainingCount: limit,
			ResetTime:      now.Add(window),
			RetryAfter:     0,
			Window:         windowType,
		}
	}
	
	currentCount := int(countCmd.Val())
	
	// Calculate result
	allowed := currentCount <= limit
	remainingCount := limit - currentCount
	if remainingCount < 0 {
		remainingCount = 0
	}
	
	resetTime := now.Add(window)
	var retryAfter time.Duration
	if !allowed {
		// Calculate retry after based on oldest request in window
		oldestCmd := r.client.ZRange(ctx, key, 0, 0)
		if len(oldestCmd.Val()) > 0 {
			oldestScore := r.client.ZScore(ctx, key, oldestCmd.Val()[0])
			if oldestScore.Err() == nil {
				oldestTime := time.Unix(0, int64(oldestScore.Val()))
				retryAfter = window - now.Sub(oldestTime)
				if retryAfter < 0 {
					retryAfter = 0
				}
			}
		}
	}
	
	return RateLimitResult{
		Allowed:        allowed,
		CurrentCount:   currentCount,
		Limit:          limit,
		RemainingCount: remainingCount,
		ResetTime:      resetTime,
		RetryAfter:     retryAfter,
		Window:         windowType,
	}
}

// getWindowDuration converts RateLimitWindow to time.Duration
func (r *RedisRateLimiter) getWindowDuration(window RateLimitWindow) time.Duration {
	switch window {
	case WindowPerSecond:
		return time.Second
	case WindowPerMinute:
		return time.Minute
	case WindowPerHour:
		return time.Hour
	case WindowPerDay:
		return 24 * time.Hour
	default:
		return r.defaultWindow
	}
}

// generateNonce generates a simple nonce for request uniqueness
func (r *RedisRateLimiter) generateNonce() int64 {
	return time.Now().UnixNano() % 1000000
}

// GetRateLimitInfo gets current rate limit information without incrementing
func (r *RedisRateLimiter) GetRateLimitInfo(ctx context.Context, key string, limit int, window RateLimitWindow) RateLimitResult {
	windowDuration := r.getWindowDuration(window)
	now := time.Now()
	windowStart := now.Add(-windowDuration)
	
	// Remove expired entries first
	r.client.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart.UnixNano(), 10))
	
	// Count current requests
	currentCount := int(r.client.ZCard(ctx, key).Val())
	
	remainingCount := limit - currentCount
	if remainingCount < 0 {
		remainingCount = 0
	}
	
	return RateLimitResult{
		Allowed:        currentCount < limit,
		CurrentCount:   currentCount,
		Limit:          limit,
		RemainingCount: remainingCount,
		ResetTime:      now.Add(windowDuration),
		RetryAfter:     0,
		Window:         window,
	}
}

// ClearRateLimit clears rate limit data for a specific key
func (r *RedisRateLimiter) ClearRateLimit(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

// GetAllRateLimitKeys returns all rate limit keys (for monitoring/debugging)
func (r *RedisRateLimiter) GetAllRateLimitKeys(ctx context.Context) ([]string, error) {
	return r.client.Keys(ctx, "rate_limit:*").Result()
}

// CleanupExpiredRateLimits removes all expired rate limit entries
func (r *RedisRateLimiter) CleanupExpiredRateLimits(ctx context.Context) error {
	keys, err := r.GetAllRateLimitKeys(ctx)
	if err != nil {
		return err
	}
	
	now := time.Now()
	for _, key := range keys {
		// Determine window type from key pattern and clean accordingly
		// This is a simplified cleanup - in production, you might want more sophisticated logic
		windowStart := now.Add(-time.Hour) // Default to 1 hour cleanup
		r.client.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart.UnixNano(), 10))
	}
	
	return nil
}

// GetRateLimitStats returns statistics about rate limiting
func (r *RedisRateLimiter) GetRateLimitStats(ctx context.Context) (map[string]interface{}, error) {
	keys, err := r.GetAllRateLimitKeys(ctx)
	if err != nil {
		return nil, err
	}
	
	stats := map[string]interface{}{
		"total_keys": len(keys),
		"by_type":    make(map[string]int),
	}
	
	typeCount := make(map[string]int)
	for _, key := range keys {
		if len(key) > 11 { // "rate_limit:" prefix
			keyType := key[11:] // Extract type part
			if idx := len(keyType); idx > 0 {
				switch {
				case keyType[:3] == "api":
					typeCount["api_key"]++
				case keyType[:2] == "ip":
					typeCount["ip"]++
				case keyType[:4] == "user":
					typeCount["user"]++
				default:
					typeCount["unknown"]++
				}
			}
		}
	}
	
	stats["by_type"] = typeCount
	return stats, nil
}