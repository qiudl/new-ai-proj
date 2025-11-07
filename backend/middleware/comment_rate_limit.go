package middleware

import (
	"ai-project-backend/services"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// CommentRateLimitConfig 评论频率限制配置
type CommentRateLimitConfig struct {
	MaxCommentsPerMinute int           // 每分钟最大评论数
	MaxCommentsPerHour   int           // 每小时最大评论数
	MaxCommentsPerDay    int           // 每天最大评论数
	Window               time.Duration // 时间窗口
}

// DefaultCommentRateLimitConfig 默认评论频率限制配置
func DefaultCommentRateLimitConfig() *CommentRateLimitConfig {
	return &CommentRateLimitConfig{
		MaxCommentsPerMinute: 5,    // 每分钟最多5条评论
		MaxCommentsPerHour:   30,   // 每小时最多30条评论
		MaxCommentsPerDay:    100,  // 每天最多100条评论
		Window:               time.Minute * 1,
	}
}

// CommentRateLimitMiddleware 评论频率限制中间件
type CommentRateLimitMiddleware struct {
	config             *CommentRateLimitConfig
	minuteLimiter      *services.RateLimiter
	hourLimiter        *services.RateLimiter
	dayLimiter         *services.RateLimiter
	cleanupTicker      *time.Ticker
	stopCleanup        chan bool
}

// NewCommentRateLimitMiddleware 创建评论频率限制中间件
func NewCommentRateLimitMiddleware(config *CommentRateLimitConfig) *CommentRateLimitMiddleware {
	if config == nil {
		config = DefaultCommentRateLimitConfig()
	}

	middleware := &CommentRateLimitMiddleware{
		config:        config,
		minuteLimiter: services.NewRateLimiter(config.MaxCommentsPerMinute, time.Minute),
		hourLimiter:   services.NewRateLimiter(config.MaxCommentsPerHour, time.Hour),
		dayLimiter:    services.NewRateLimiter(config.MaxCommentsPerDay, 24*time.Hour),
		cleanupTicker: time.NewTicker(10 * time.Minute), // 每10分钟清理一次
		stopCleanup:   make(chan bool),
	}

	// 启动后台清理任务
	go middleware.cleanupRoutine()

	return middleware
}

// Middleware 返回Gin中间件函数
func (m *CommentRateLimitMiddleware) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 只对POST请求（创建评论）进行限制
		if c.Request.Method != http.MethodPost {
			c.Next()
			return
		}

		// 获取用户ID
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		// 构建限制键（基于用户ID）
		key := fmt.Sprintf("comment_user_%v", userID)

		// 检查每分钟限制
		if !m.minuteLimiter.Allow(key + "_minute") {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": fmt.Sprintf("评论过于频繁，请稍后再试（每分钟最多%d条）", m.config.MaxCommentsPerMinute),
				},
			})
			c.Abort()
			return
		}

		// 检查每小时限制
		if !m.hourLimiter.Allow(key + "_hour") {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": fmt.Sprintf("评论过于频繁，请稍后再试（每小时最多%d条）", m.config.MaxCommentsPerHour),
				},
			})
			c.Abort()
			return
		}

		// 检查每天限制
		if !m.dayLimiter.Allow(key + "_day") {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": fmt.Sprintf("今日评论次数已达上限（每天最多%d条）", m.config.MaxCommentsPerDay),
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// cleanupRoutine 定期清理过期数据
func (m *CommentRateLimitMiddleware) cleanupRoutine() {
	for {
		select {
		case <-m.cleanupTicker.C:
			m.minuteLimiter.Cleanup()
			m.hourLimiter.Cleanup()
			m.dayLimiter.Cleanup()
		case <-m.stopCleanup:
			m.cleanupTicker.Stop()
			return
		}
	}
}

// Stop 停止中间件的后台清理任务
func (m *CommentRateLimitMiddleware) Stop() {
	m.stopCleanup <- true
}
