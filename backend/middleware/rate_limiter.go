package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiterConfig 频率限制配置
type RateLimiterConfig struct {
	// RequestsPerSecond 每秒允许的请求数
	RequestsPerSecond int
	// BurstSize 突发请求数量
	BurstSize int
	// IPWhitelist IP白名单
	IPWhitelist []string
	// EnableIPWhitelist 是否启用IP白名单
	EnableIPWhitelist bool
}

// RateLimiter 频率限制器
type RateLimiter struct {
	config   *RateLimiterConfig
	limiters sync.Map // map[string]*rate.Limiter
	mu       sync.Mutex
}

// NewRateLimiter 创建频率限制器实例
func NewRateLimiter(config *RateLimiterConfig) *RateLimiter {
	if config.RequestsPerSecond == 0 {
		config.RequestsPerSecond = 100 // 默认每秒100个请求
	}
	if config.BurstSize == 0 {
		config.BurstSize = 200 // 默认突发200个请求
	}

	return &RateLimiter{
		config: config,
	}
}

// getLimiter 获取或创建IP对应的限制器
func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	if limiter, exists := rl.limiters.Load(ip); exists {
		return limiter.(*rate.Limiter)
	}

	rl.mu.Lock()
	defer rl.mu.Unlock()

	// 双重检查
	if limiter, exists := rl.limiters.Load(ip); exists {
		return limiter.(*rate.Limiter)
	}

	// 创建新的限制器
	limiter := rate.NewLimiter(
		rate.Limit(rl.config.RequestsPerSecond),
		rl.config.BurstSize,
	)
	rl.limiters.Store(ip, limiter)

	return limiter
}

// isIPWhitelisted 检查IP是否在白名单中
func (rl *RateLimiter) isIPWhitelisted(ip string) bool {
	if !rl.config.EnableIPWhitelist {
		return false
	}

	for _, whitelistedIP := range rl.config.IPWhitelist {
		if ip == whitelistedIP {
			return true
		}
	}
	return false
}

// Middleware 返回Gin中间件函数
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取客户端IP
		ip := c.ClientIP()

		// 检查IP白名单
		if rl.isIPWhitelisted(ip) {
			c.Next()
			return
		}

		// 获取该IP的限制器
		limiter := rl.getLimiter(ip)

		// 检查是否允许请求
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests. Please try again later.",
					"details": gin.H{
						"limit":      rl.config.RequestsPerSecond,
						"burst":      rl.config.BurstSize,
						"retry_after": "1s",
					},
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Cleanup 定期清理不活跃的限制器
func (rl *RateLimiter) Cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			rl.limiters.Range(func(key, value interface{}) bool {
				limiter := value.(*rate.Limiter)
				// 如果限制器的令牌桶已满，说明该IP长时间没有请求，可以清理
				if limiter.Tokens() >= float64(rl.config.BurstSize) {
					rl.limiters.Delete(key)
				}
				return true
			})
		}
	}()
}

// AIConfigRateLimiter AI配置专用频率限制器（更严格的限制）
func AIConfigRateLimiter() *RateLimiter {
	return NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 10,  // 每秒10个请求
		BurstSize:         20,  // 突发20个请求
		EnableIPWhitelist: true,
		IPWhitelist: []string{
			"127.0.0.1",
			"::1",
			// 可以添加更多受信任的IP
		},
	})
}
