package middleware

import (
	"ai-project-backend/security"
	"ai-project-backend/utils"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// AIRateLimitConfig 配置AI接口限流参数
type AIRateLimitConfig struct {
	// Description generation limits
	DescriptionLimit  int                      `json:"description_limit"`  // 每分钟描述生成次数
	DescriptionWindow security.RateLimitWindow `json:"description_window"` // 时间窗口

	// Document generation limits (more expensive)
	DocumentLimit  int                      `json:"document_limit"`  // 每分钟文档生成次数
	DocumentWindow security.RateLimitWindow `json:"document_window"` // 时间窗口

	// Batch generation limits
	BatchLimit  int                      `json:"batch_limit"`  // 每10分钟批量操作次数
	BatchWindow security.RateLimitWindow `json:"batch_window"` // 时间窗口

	// Suggestion limits
	SuggestionLimit  int                      `json:"suggestion_limit"`  // 每分钟多建议次数
	SuggestionWindow security.RateLimitWindow `json:"suggestion_window"` // 时间窗口
}

// DefaultAIRateLimitConfig 返回默认的AI限流配置
func DefaultAIRateLimitConfig() *AIRateLimitConfig {
	return &AIRateLimitConfig{
		// 描述生成：每分钟5次（单次生成约7秒）
		DescriptionLimit:  5,
		DescriptionWindow: security.WindowPerMinute,

		// 文档生成：每分钟3次（更昂贵的操作）
		DocumentLimit:  3,
		DocumentWindow: security.WindowPerMinute,

		// 批量操作：每10分钟2次
		BatchLimit:  2,
		BatchWindow: security.WindowPerMinute, // 使用分钟窗口，但limit设为2

		// 多建议：每分钟2次（生成3个建议，耗时长）
		SuggestionLimit:  2,
		SuggestionWindow: security.WindowPerMinute,
	}
}

// AIRateLimitMiddleware AI接口限流中间件
type AIRateLimitMiddleware struct {
	rateLimiter *security.RedisRateLimiter
	config      *AIRateLimitConfig
	jwtManager  *utils.JWTManager
}

// NewAIRateLimitMiddleware 创建AI限流中间件
func NewAIRateLimitMiddleware(
	rateLimiter *security.RedisRateLimiter,
	config *AIRateLimitConfig,
	jwtManager *utils.JWTManager,
) *AIRateLimitMiddleware {
	if config == nil {
		config = DefaultAIRateLimitConfig()
	}

	return &AIRateLimitMiddleware{
		rateLimiter: rateLimiter,
		config:      config,
		jwtManager:  jwtManager,
	}
}

// AIEndpointType AI接口类型
type AIEndpointType string

const (
	EndpointDescription     AIEndpointType = "description"
	EndpointDocument        AIEndpointType = "document"
	EndpointBatch           AIEndpointType = "batch"
	EndpointSuggestion      AIEndpointType = "suggestion"
	EndpointDescriptionBatch AIEndpointType = "description_batch"
)

// LimitAIGeneration 通用AI生成限流中间件
func (m *AIRateLimitMiddleware) LimitAIGeneration(endpointType AIEndpointType) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 获取用户ID
		userID, err := m.getUserID(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "未授权访问",
				"error":   "无效的认证token",
			})
			c.Abort()
			return
		}

		// 2. 根据接口类型选择限流参数
		limit, window := m.getLimitConfig(endpointType)

		// 3. 执行限流检查
		result := m.rateLimiter.CheckRateLimitByUser(userID, limit, window)

		// 4. 添加限流响应头
		m.setRateLimitHeaders(c, result)

		// 5. 如果超限，返回429错误
		if !result.Allowed {
			retryAfterSeconds := int(result.RetryAfter.Seconds())
			if retryAfterSeconds <= 0 {
				retryAfterSeconds = 60 // 默认60秒后重试
			}

			log.Printf("[RATE_LIMIT] User %d exceeded %s rate limit: %d/%d (window: %s)",
				userID, endpointType, result.CurrentCount, result.Limit, window)

			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": fmt.Sprintf("请求过于频繁，请稍后再试（%s接口限制：%d次/%s）",
					m.getEndpointName(endpointType), result.Limit, m.getWindowName(window)),
				"error": "rate_limit_exceeded",
				"rate_limit": gin.H{
					"limit":          result.Limit,
					"current":        result.CurrentCount,
					"remaining":      result.RemainingCount,
					"reset_time":     result.ResetTime.Format(time.RFC3339),
					"retry_after":    retryAfterSeconds,
					"window":         string(window),
					"endpoint_type":  string(endpointType),
				},
			})
			c.Abort()
			return
		}

		// 6. 记录限流信息到日志（用于监控）
		log.Printf("[RATE_LIMIT] User %d - %s: %d/%d remaining (window: %s)",
			userID, endpointType, result.RemainingCount, result.Limit, window)

		// 7. 继续处理请求
		c.Next()
	}
}

// LimitDescriptionGeneration 描述生成限流
func (m *AIRateLimitMiddleware) LimitDescriptionGeneration() gin.HandlerFunc {
	return m.LimitAIGeneration(EndpointDescription)
}

// LimitDocumentGeneration 文档生成限流
func (m *AIRateLimitMiddleware) LimitDocumentGeneration() gin.HandlerFunc {
	return m.LimitAIGeneration(EndpointDocument)
}

// LimitBatchGeneration 批量生成限流
func (m *AIRateLimitMiddleware) LimitBatchGeneration() gin.HandlerFunc {
	return m.LimitAIGeneration(EndpointBatch)
}

// LimitSuggestionGeneration 多建议生成限流
func (m *AIRateLimitMiddleware) LimitSuggestionGeneration() gin.HandlerFunc {
	return m.LimitAIGeneration(EndpointSuggestion)
}

// LimitDescriptionBatch 描述批量生成限流
func (m *AIRateLimitMiddleware) LimitDescriptionBatch() gin.HandlerFunc {
	return m.LimitAIGeneration(EndpointDescriptionBatch)
}

// getUserID 从上下文获取用户ID
func (m *AIRateLimitMiddleware) getUserID(c *gin.Context) (int, error) {
	// 尝试从JWT token获取用户ID
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		return 0, fmt.Errorf("user_id not found in context")
	}

	// 类型断言
	switch v := userIDInterface.(type) {
	case int:
		return v, nil
	case int64:
		return int(v), nil
	case float64:
		return int(v), nil
	default:
		return 0, fmt.Errorf("invalid user_id type: %T", v)
	}
}

// getLimitConfig 根据接口类型获取限流配置
func (m *AIRateLimitMiddleware) getLimitConfig(endpointType AIEndpointType) (int, security.RateLimitWindow) {
	switch endpointType {
	case EndpointDescription:
		return m.config.DescriptionLimit, m.config.DescriptionWindow
	case EndpointDocument:
		return m.config.DocumentLimit, m.config.DocumentWindow
	case EndpointBatch, EndpointDescriptionBatch:
		return m.config.BatchLimit, m.config.BatchWindow
	case EndpointSuggestion:
		return m.config.SuggestionLimit, m.config.SuggestionWindow
	default:
		return m.config.DescriptionLimit, m.config.DescriptionWindow
	}
}

// setRateLimitHeaders 设置限流响应头
func (m *AIRateLimitMiddleware) setRateLimitHeaders(c *gin.Context, result security.RateLimitResult) {
	c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", result.Limit))
	c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", result.RemainingCount))
	c.Header("X-RateLimit-Reset", result.ResetTime.Format(time.RFC3339))

	if !result.Allowed && result.RetryAfter > 0 {
		c.Header("Retry-After", fmt.Sprintf("%d", int(result.RetryAfter.Seconds())))
	}
}

// getEndpointName 获取接口类型的可读名称
func (m *AIRateLimitMiddleware) getEndpointName(endpointType AIEndpointType) string {
	switch endpointType {
	case EndpointDescription:
		return "AI描述生成"
	case EndpointDocument:
		return "AI文档生成"
	case EndpointBatch, EndpointDescriptionBatch:
		return "批量生成"
	case EndpointSuggestion:
		return "多建议生成"
	default:
		return "AI生成"
	}
}

// getWindowName 获取时间窗口的可读名称
func (m *AIRateLimitMiddleware) getWindowName(window security.RateLimitWindow) string {
	switch window {
	case security.WindowPerSecond:
		return "秒"
	case security.WindowPerMinute:
		return "分钟"
	case security.WindowPerHour:
		return "小时"
	case security.WindowPerDay:
		return "天"
	default:
		return "时间窗口"
	}
}

// GetConfig 获取当前限流配置（用于监控）
func (m *AIRateLimitMiddleware) GetConfig() *AIRateLimitConfig {
	return m.config
}

// UpdateConfig 更新限流配置（热更新）
func (m *AIRateLimitMiddleware) UpdateConfig(config *AIRateLimitConfig) {
	if config != nil {
		m.config = config
		log.Printf("[RATE_LIMIT] Configuration updated: desc=%d/%s, doc=%d/%s",
			config.DescriptionLimit, config.DescriptionWindow,
			config.DocumentLimit, config.DocumentWindow)
	}
}
