package security

import (
	"fmt"
	"net"
	"sync"
	"time"
)

// RateLimitWindow represents different time windows for rate limiting
type RateLimitWindow string

const (
	WindowPerMinute RateLimitWindow = "per_minute"
	WindowPerHour   RateLimitWindow = "per_hour"  
	WindowPerDay    RateLimitWindow = "per_day"
	WindowPerMonth  RateLimitWindow = "per_month"
)

// RateLimitEntry represents a rate limit entry for a specific key
type RateLimitEntry struct {
	Count      int       `json:"count"`
	WindowStart time.Time `json:"window_start"`
	LastAccess time.Time `json:"last_access"`
}

// RateLimitResult represents the result of a rate limit check
type RateLimitResult struct {
	Allowed        bool          `json:"allowed"`
	CurrentCount   int           `json:"current_count"`
	Limit          int           `json:"limit"`
	Window         RateLimitWindow `json:"window"`
	ResetTime      time.Time     `json:"reset_time"`
	RemainingCount int           `json:"remaining_count"`
	RetryAfter     time.Duration `json:"retry_after"`
}

// RateLimiter implements a sliding window rate limiter
type RateLimiter struct {
	entries    map[string]*RateLimitEntry
	mutex      sync.RWMutex
	cleanupTTL time.Duration
}

// NewRateLimiter creates a new rate limiter instance
func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		entries:    make(map[string]*RateLimitEntry),
		cleanupTTL: 24 * time.Hour, // Clean up entries older than 24 hours
	}
	
	// Start cleanup goroutine
	go rl.startCleanup()
	
	return rl
}

// startCleanup periodically removes expired entries
func (rl *RateLimiter) startCleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	
	for range ticker.C {
		rl.cleanup()
	}
}

// cleanup removes expired entries from the rate limiter
func (rl *RateLimiter) cleanup() {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	
	now := time.Now()
	for key, entry := range rl.entries {
		if now.Sub(entry.LastAccess) > rl.cleanupTTL {
			delete(rl.entries, key)
		}
	}
}

// CheckRateLimit checks if a request is within rate limits
func (rl *RateLimiter) CheckRateLimit(key string, limit int, window RateLimitWindow) RateLimitResult {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	
	now := time.Now()
	windowDuration := rl.getWindowDuration(window)
	
	// Get or create entry
	entry, exists := rl.entries[key]
	if !exists {
		entry = &RateLimitEntry{
			Count:       0,
			WindowStart: now,
			LastAccess:  now,
		}
		rl.entries[key] = entry
	}
	
	// Check if we need to reset the window
	if now.Sub(entry.WindowStart) >= windowDuration {
		// Reset window
		entry.Count = 0
		entry.WindowStart = now
	}
	
	// Update last access
	entry.LastAccess = now
	
	// Calculate reset time
	resetTime := entry.WindowStart.Add(windowDuration)
	
	// Check if request is allowed
	allowed := entry.Count < limit
	if allowed {
		entry.Count++
	}
	
	return RateLimitResult{
		Allowed:        allowed,
		CurrentCount:   entry.Count,
		Limit:          limit,
		Window:         window,
		ResetTime:      resetTime,
		RemainingCount: max(0, limit-entry.Count),
		RetryAfter:     time.Until(resetTime),
	}
}

// CheckRateLimitByIP checks rate limits by IP address
func (rl *RateLimiter) CheckRateLimitByIP(ip net.IP, limit int, window RateLimitWindow) RateLimitResult {
	key := fmt.Sprintf("ip:%s", ip.String())
	return rl.CheckRateLimit(key, limit, window)
}

// CheckRateLimitByAPIKey checks rate limits by API key
func (rl *RateLimiter) CheckRateLimitByAPIKey(apiKeyID int64, limit int, window RateLimitWindow) RateLimitResult {
	key := fmt.Sprintf("api_key:%d", apiKeyID)
	return rl.CheckRateLimit(key, limit, window)
}

// CheckRateLimitByUser checks rate limits by user ID
func (rl *RateLimiter) CheckRateLimitByUser(userID int, limit int, window RateLimitWindow) RateLimitResult {
	key := fmt.Sprintf("user:%d", userID)
	return rl.CheckRateLimit(key, limit, window)
}

// CheckMultipleRateLimits checks multiple rate limits and returns the most restrictive result
func (rl *RateLimiter) CheckMultipleRateLimits(checks []RateLimitCheck) RateLimitResult {
	var mostRestrictive RateLimitResult
	mostRestrictive.Allowed = true
	mostRestrictive.RemainingCount = int(^uint(0) >> 1) // Max int
	
	for _, check := range checks {
		result := rl.CheckRateLimit(check.Key, check.Limit, check.Window)
		
		// If any check fails, the overall result fails
		if !result.Allowed {
			return result
		}
		
		// Track the most restrictive limit
		if result.RemainingCount < mostRestrictive.RemainingCount {
			mostRestrictive = result
		}
	}
	
	return mostRestrictive
}

// RateLimitCheck represents a single rate limit check configuration
type RateLimitCheck struct {
	Key    string          `json:"key"`
	Limit  int             `json:"limit"`
	Window RateLimitWindow `json:"window"`
}

// getWindowDuration converts RateLimitWindow to time.Duration
func (rl *RateLimiter) getWindowDuration(window RateLimitWindow) time.Duration {
	switch window {
	case WindowPerMinute:
		return time.Minute
	case WindowPerHour:
		return time.Hour
	case WindowPerDay:
		return 24 * time.Hour
	case WindowPerMonth:
		return 30 * 24 * time.Hour // Approximate month
	default:
		return time.Hour // Default to hour
	}
}

// GetCurrentCount returns the current count for a key without incrementing
func (rl *RateLimiter) GetCurrentCount(key string, window RateLimitWindow) int {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()
	
	entry, exists := rl.entries[key]
	if !exists {
		return 0
	}
	
	now := time.Now()
	windowDuration := rl.getWindowDuration(window)
	
	// Check if window has expired
	if now.Sub(entry.WindowStart) >= windowDuration {
		return 0
	}
	
	return entry.Count
}

// ResetRateLimit resets the rate limit for a specific key
func (rl *RateLimiter) ResetRateLimit(key string) {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	
	delete(rl.entries, key)
}

// ResetRateLimitByIP resets rate limits for an IP address
func (rl *RateLimiter) ResetRateLimitByIP(ip net.IP) {
	key := fmt.Sprintf("ip:%s", ip.String())
	rl.ResetRateLimit(key)
}

// ResetRateLimitByAPIKey resets rate limits for an API key
func (rl *RateLimiter) ResetRateLimitByAPIKey(apiKeyID int64) {
	key := fmt.Sprintf("api_key:%d", apiKeyID)
	rl.ResetRateLimit(key)
}

// GetStats returns statistics about the rate limiter
type RateLimiterStats struct {
	TotalEntries   int                 `json:"total_entries"`
	ActiveEntries  int                 `json:"active_entries"`
	OldestEntry    *time.Time          `json:"oldest_entry,omitempty"`
	NewestEntry    *time.Time          `json:"newest_entry,omitempty"`
	WindowStats    map[string]int      `json:"window_stats"`
}

// GetStats returns current rate limiter statistics
func (rl *RateLimiter) GetStats() RateLimiterStats {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()
	
	now := time.Now()
	stats := RateLimiterStats{
		TotalEntries: len(rl.entries),
		WindowStats:  make(map[string]int),
	}
	
	activeCount := 0
	var oldest, newest *time.Time
	
	for _, entry := range rl.entries {
		// Count active entries (accessed within cleanup TTL)
		if now.Sub(entry.LastAccess) <= rl.cleanupTTL {
			activeCount++
		}
		
		// Track oldest and newest entries
		if oldest == nil || entry.WindowStart.Before(*oldest) {
			oldest = &entry.WindowStart
		}
		if newest == nil || entry.WindowStart.After(*newest) {
			newest = &entry.WindowStart
		}
	}
	
	stats.ActiveEntries = activeCount
	stats.OldestEntry = oldest
	stats.NewestEntry = newest
	
	return stats
}

// CreateAPIKeyRateLimitKey creates a rate limit key for API key requests
func CreateAPIKeyRateLimitKey(apiKeyID int64, category string) string {
	if category == "" {
		return fmt.Sprintf("api_key:%d", apiKeyID)
	}
	return fmt.Sprintf("api_key:%d:%s", apiKeyID, category)
}

// CreateIPRateLimitKey creates a rate limit key for IP-based requests
func CreateIPRateLimitKey(ip net.IP, category string) string {
	if category == "" {
		return fmt.Sprintf("ip:%s", ip.String())
	}
	return fmt.Sprintf("ip:%s:%s", ip.String(), category)
}

// max returns the maximum of two integers
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}